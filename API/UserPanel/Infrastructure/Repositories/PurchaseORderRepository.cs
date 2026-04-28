using System.Data;
using System.Dynamic;
using BackEnd.Procurement.PurchaseOrder;
using Core.Abstractions;
using Core.Models;
using Core.Procurement.PurchaseOrder;
using Dapper;
using BackEnd.Shared;
namespace Infrastructure.Repositories
{
    public class PurchaseOrderRepository : IPurchaseOrderRepository
    {

        private readonly IDbConnection _connection;
        string IPAddress = "";
        public PurchaseOrderRepository(IUnitOfWorkDB2 unitOfWork)
        {
            _connection = unitOfWork.Connection;
        }

        public async Task<SharedModelWithResponse> GetSeqNumber(int id, string text, int type, int unit, int orgid)
        {

            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 1);
                param.Add("@id", id);
                param.Add("@text", text);
                param.Add("@type", type);
                param.Add("@branchid", unit);
                param.Add("@orgid", orgid);


                var data = await _connection.QueryFirstOrDefaultAsync<SharedModel>(Shared.SharedProcedure, param: param, commandType: CommandType.StoredProcedure);



                return new SharedModelWithResponse()
                {
                    Data = data,
                    Message = "Success",
                    Status = true
                };


            }
            catch (Exception Ex)
            {

                return new SharedModelWithResponse()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }


        }


        public async Task<object> AddAsync(PurchaseOrder Obj)
        {

            try
            {
                int IsValidated = 0;
                string Message = "";
                Int32 Result = 0;
                SharedRepository SR = new SharedRepository(_connection);

                var response = await GetSeqNumber(0, Obj.Header.pono, 3, Obj.Header.branchid, Obj.Header.orgid);
                if (response.Status == true)
                {
                    if (response.Data.result == 1)
                    {
                        IsValidated = 1;
                        Message = " - The current PO  number " + Obj.Header.pono + " is taken for another PO so the new PO number (" + response.Data.text + ") has been generated for this PO";
                        Obj.Header.pono = response.Data.text;
                    }
                }


                const string headerSql = @"
                        INSERT INTO `tbl_purchaseorder_header`
                        (`pono`, `podate`, `supplierid`, `issaved`, `createddt`, `createdby`, `createdip`,
                        `isactive`, `orgid`, `branchid`, `requestorid`, `departmentid`, `paymenttermid`,
                        `deliverytermid`, `remarks`, `currencyid`, `prid`, `prtypeid`, `deliveryaddress`,`exchangerate`, `subtotal`, `discountvalue`, `taxvalue`, `vatvalue`, `nettotal`, `balance_amount`)
                        VALUES(@pono, @podate, @supplierid, @issaved, NOW(), @userid, '', 1, @orgid, @branchid,
                        @requestorid, @departmentid, @paymenttermid, @deliverytermid, @remarks,
                        @currencyid, @prid, @prtypeid, @deliveryaddress,@exchangerate, @subtotal, @discountvalue, @taxvalue, @vatvalue, @nettotal, @nettotal);";

                await _connection.ExecuteAsync(headerSql, Obj.Header);

                // Get newly inserted POID
                var poid = await _connection.QuerySingleAsync<int>("SELECT LAST_INSERT_ID();");



                var pridToPodidMap = new Dictionary<int, int>();
                var detailSql = "";
                foreach (var detail in Obj.Details)
                {
                    detail.poid = poid;

                    detailSql = @"
                        INSERT INTO `tbl_purchaseorder_detail`
                        (`poid`, `prid`, `IsActive`, `CreatedDt`, `CreatedBy`, `CreatedIP`, `branchid`, `orgid`)
                        VALUES (@poid, @prid, 1, NOW(), @userid, '',@branchid,@orgid);
                        SELECT LAST_INSERT_ID();";

                    var podid = await _connection.QuerySingleAsync<int>(detailSql, new
                    {
                        poid = poid,
                        prid = detail.prid,
                        userid = detail.userid,
                        branchid = Obj.Header.branchid,
                        orgid = Obj.Header.orgid
                    });

                    pridToPodidMap[detail.prid] = podid;
                }
                //Result = await _connection.ExecuteAsync(detailSql);


                // 3.INSERT INTO tbl_purchaseorder_requisition
                foreach (var req in Obj.Requisition)
                {

                    // You must map correct podid for each requisition
                    req.poid = poid;
                    if (!pridToPodidMap.TryGetValue(req.prid, out var podid))
                        throw new Exception($"No matching detail found for PRID {req.prid}");

                    req.podid = podid;


                    var reqSql = @"
                        INSERT INTO `tbl_purchaseorder_requisitions`
                        (`poid`, `podid`, `prmid`, `prdid`, `prid`, `itemid`, `uomid`, `qty`, `unitprice`, `totalvalue`,
                         `taxperc`, `taxvalue`, `subtotal`, `discountperc`, `discountvalue`, `nettotal`, `isactive`,
                         `createddt`, `createdby`, `createdip`, `branchid`, `orgid`,`vatperc`,`vatvalue`,`itemgroupid`)
                        VALUES
                        (@poid, @podid, @prmid, @prdid, @prid, @itemid, @uomid, @qty, @unitprice, @totalvalue,
                         @taxperc, @taxvalue, @subtotal, @discountperc, @discountvalue, @nettotal, 1,
                         NOW(), @userid, '', @branchid, @orgid, @vatperc, @vatvalue, @itemgroupid);";

                    //await _connection.ExecuteAsync(reqSql, req);
                    await _connection.ExecuteAsync(reqSql, new
                    {
                        poid = req.poid,
                        podid = req.podid,
                        prmid = req.prmid,
                        prdid = req.prdid,
                        prid = req.prid,
                        itemid = req.itemid,
                        uomid = req.uomid,
                        qty = req.qty,
                        unitprice = req.unitprice,
                        totalvalue = req.totalvalue,
                        taxperc = req.taxperc,
                        taxvalue = req.taxvalue,
                        subtotal = req.subtotal,
                        discountperc = req.discountperc,
                        discountvalue = req.discountvalue,
                        nettotal = req.nettotal,
                        userid = req.userid,
                        branchid = Obj.Header.branchid, // 👈 Use header value
                        orgid = Obj.Header.orgid,        // 👈 Use header value
                        vatperc = req.vatperc,
                        vatvalue = req.vatvalue,
                        itemgroupid = req.itemgroupid
                    });
                }

                var balanceAmountSql = @" UPDATE tbl_purchaseorder_header SET balance_amount = @NetTotal WHERE poid = @Poid;";

                await _connection.ExecuteAsync(balanceAmountSql, new
                {
                    NetTotal = Obj.Header.NetTotal,
                    Poid = poid
                });


                int BranchId = Obj.Header.branchid;
                var updateSeq = "UPDATE master_documentnumber SET Doc_Number = Doc_Number + 1 WHERE Doc_Type = 3 AND Unit = @branchid; update tbl_PurchaseRequisition_Header  as a inner join tbl_purchaseorder_requisitions as b on a.prid=b.prid and b.isactive=1 set IsPOUtil=1 where b.poid=@POID ;";
                Result = await _connection.ExecuteAsync(updateSeq, new { BranchId,POID= poid });
                Result = 1;

                if (Result == 0)
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = "Save failed",
                        Status = false
                    };
                }
                else
                {
                    if (Obj.Header.issaved == 0)
                    {
                        return new ResponseModel()
                        {
                            Data = null,
                            Message = "Saved Successfully" + Message,
                            Status = true
                        };
                    }
                    else
                    {
                        return new ResponseModel()
                        {
                            Data = null,
                            Message = "Posted Successfully" + Message,
                            Status = true
                        };
                    }
                }
            }
            catch (Exception Ex)
            {

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }


        public async Task<object> GetAllAsync(Int32 requestorid, int BranchId, int SupplierId, int orgid, int poid,int userid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 1);
                param.Add("@poid", poid);
                param.Add("@branchid", BranchId);
                param.Add("@orgid", orgid);
                param.Add("@requestorid", requestorid);
                param.Add("@supplierid", SupplierId);
                param.Add("@requstorname", null, DbType.String);
                param.Add("@suppliername", null, DbType.String);
                param.Add("@prid", 0);
                param.Add("@ponumber", null, DbType.String);
                param.Add("@curid", userid);

                var List = await _connection.QueryAsync(PurchaseOrderBackEnd.PurchaseOrderProcedure, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();


                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };


            }
            catch (Exception Ex)
            {

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }

        public async Task<object> GetByIdAsync(int poid, int branchid, int orgid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 2);
                param.Add("@poid", poid);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                param.Add("@requestorid", 0);
                param.Add("@supplierid", 0);
                param.Add("@requstorname", null, DbType.String);
                param.Add("@suppliername", null, DbType.String);
                param.Add("@prid", 0);
                param.Add("@ponumber", null, DbType.String);
                param.Add("@curid", 0);

                var List = await _connection.QueryMultipleAsync(PurchaseOrderBackEnd.PurchaseOrderProcedure, param: param, commandType: CommandType.StoredProcedure);
                dynamic Modellist = new ExpandoObject();
                int I = 0;
                while (!List.IsConsumed)
                {
                    dynamic nl = List.Read();

                    if (I == 0)
                    {
                        int count = nl.Count;
                        if (count == 0)
                        {
                            Modellist.Header = new object();
                        }
                        else
                        {
                            Modellist.Header = nl[0];
                        }
                    }
                    else if (I == 1)
                    {


                        Modellist.Details = nl;
                    }
                    else if (I == 2)
                    {
                        Modellist.Requisition = nl;
                    }

                    I++;
                }
                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };


            }
            catch (Exception Ex)
            {

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }

        public async Task<object> UpdateAsync(PurchaseOrder Obj)
        {
            try
            {
                int Result = 0;
                const string headerSql = @"
            UPDATE tbl_purchaseorder_header
            SET 
                `supplierid` = @supplierid,
                `modifieddt` = NOW(),
                `modifiedby` = @userid,
                `modifiedip` = '',
                `isactive` = 1,
                `orgid` = @orgid,
                `branchid` = @branchid,
                `requestorid` = @requestorid,
                `departmentid` = @departmentid,
                `paymenttermid` = @paymenttermid,
                `deliverytermid` = @deliverytermid,
                `remarks` = @remarks,
                `currencyid` = @currencyid,
                `prid` = @prid,
                `prtypeid` = @prtypeid,
                `deliveryaddress` = @deliveryaddress,
                `exchangerate` = @exchangerate,
                `subtotal` = @subtotal,
                `discountvalue` = @discountvalue,
                `taxvalue` = @taxvalue,
                `vatvalue` = @vatvalue,
                `nettotal` = @nettotal
                 where poid = @poid";


                await _connection.ExecuteAsync(headerSql, Obj.Header);

                int poid = Obj.Header.poid;
                const string deleteDetailsSql = @"UPDATE tbl_purchaseorder_detail SET IsActive = 0 WHERE poid = @poid;";
                await _connection.ExecuteAsync(deleteDetailsSql, new { poid });

                string updatesql = "";
                var pridToPodidMap = new Dictionary<int, int>();

                var detailSql = "";
                foreach (var detail in Obj.Details)
                {
                    detail.poid = poid;

                    detailSql = @"
                        INSERT INTO `tbl_purchaseorder_detail`
                        (`poid`, `prid`, `IsActive`, `CreatedDt`, `CreatedBy`, `CreatedIP`, `branchid`, `orgid`)
                        VALUES (@poid, @prid, 1, NOW(), @userid, '',@branchid,@orgid);
                        SELECT LAST_INSERT_ID();";

                    var podid = await _connection.QuerySingleAsync<int>(detailSql, new
                    {
                        poid = poid,
                        prid = detail.prid,
                        userid = detail.userid,
                        branchid = Obj.Header.branchid,
                        orgid = Obj.Header.orgid
                    });

                    pridToPodidMap[detail.prid] = podid;
                }
                //Result = await _connection.ExecuteAsync(detailSql);



                 

                const string requistionsql = @"UPDATE tbl_purchaseorder_requisition SET IsActive = 0 WHERE poid = @poid; update tbl_PurchaseRequisition_Header  as a inner join tbl_purchaseorder_requisitions as b on a.prid=b.prid and b.isactive=1 set IsPOUtil=1 where b.poid=@poid ";
                await _connection.ExecuteAsync(deleteDetailsSql, new {  poid });
                // 3.INSERT INTO tbl_purchaseorder_requisition
                foreach (var req in Obj.Requisition)
                {

                    // You must map correct podid for each requisition
                    req.poid = poid;
                    if (!pridToPodidMap.TryGetValue(req.prid, out var podid))
                        throw new Exception($"No matching detail found for PRID {req.prid}");

                    req.podid = podid;


                    var reqSql = @"
                        INSERT INTO `tbl_purchaseorder_requisitions`
                        (`poid`, `podid`, `prmid`, `prdid`, `prid`, `itemid`, `uomid`, `qty`, `unitprice`, `totalvalue`,
                         `taxperc`, `taxvalue`, `subtotal`, `discountperc`, `discountvalue`, `nettotal`, `isactive`,
                         `createddt`, `createdby`, `createdip`, `branchid`, `orgid`,`vatperc`,`vatvalue`,`itemgroupid`)
                        VALUES
                        (@poid, @podid, @prmid, @prdid, @prid, @itemid, @uomid, @qty, @unitprice, @totalvalue,
                         @taxperc, @taxvalue, @subtotal, @discountperc, @discountvalue, @nettotal, 1,
                         NOW(), @userid, '', @branchid, @orgid,@vatperc , @vatvalue, @itemgroupid);";

                    //await _connection.ExecuteAsync(reqSql, req);
                    await _connection.ExecuteAsync(reqSql, new
                    {
                        poid = req.poid,
                        podid = req.podid,
                        prmid = req.prmid,
                        prdid = req.prdid,
                        prid = req.prid,
                        itemid = req.itemid,
                        uomid = req.uomid,
                        qty = req.qty,
                        unitprice = req.unitprice,
                        totalvalue = req.totalvalue,
                        taxperc = req.taxperc,
                        taxvalue = req.taxvalue,
                        subtotal = req.subtotal,
                        discountperc = req.discountperc,
                        discountvalue = req.discountvalue,
                        nettotal = req.nettotal,
                        userid = req.userid,
                        branchid = Obj.Header.branchid,
                        orgid = Obj.Header.orgid,
                        vatperc = req.vatperc,
                        vatvalue = req.vatvalue,
                        itemgroupid = req.itemgroupid
                    });
                }


                 
                var updatePR = "  update tbl_PurchaseRequisition_Header  as a inner join tbl_purchaseorder_requisitions as b on a.prid=b.prid and b.isactive=1 set IsPOUtil=1 where b.poid=@POID ;";
                Result = await _connection.ExecuteAsync(updatePR, new {  POID = poid });

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Purchase order posted successfully",
                    Status = true
                };

            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }

        public async Task<object> GetPurchaseRequositionList(int supplierid, int branchid, int orgid, int currencyid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 3);
                param.Add("@poid", 0);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                param.Add("@requestorid", 0);
                param.Add("@supplierid", supplierid);
                param.Add("@requstorname", null, DbType.String);
                param.Add("@suppliername", null, DbType.String);
                param.Add("@prid", 0);
                param.Add("@ponumber", null, DbType.String);
                param.Add("@curid", currencyid);

                var List = await _connection.QueryAsync(PurchaseOrderBackEnd.PurchaseOrderProcedure, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();


                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };


            }
            catch (Exception Ex)
            {

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }


        public async Task<object> GetPurchaseRequisitionItemsList(int branchid, int orgid, int prid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 4);
                param.Add("@poid", 0);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                param.Add("@requestorid", 0);
                param.Add("@supplierid", 0);
                param.Add("@requstorname", null, DbType.String);
                param.Add("@suppliername", null, DbType.String);
                param.Add("@prid", prid);
                param.Add("@ponumber", null, DbType.String);
                param.Add("@curid", 0);

                //var List = await _connection.QueryAsync(PurchaseOrderBackEnd.PurchaseOrderProcedure, param: param, commandType: CommandType.StoredProcedure);
                //var Modellist = List.ToList();

                var List = await _connection.QueryMultipleAsync(PurchaseOrderBackEnd.PurchaseOrderProcedure, param: param, commandType: CommandType.StoredProcedure);
                dynamic Modellist = new ExpandoObject();
                int I = 0;
                while (!List.IsConsumed)
                {
                    dynamic nl = List.Read();

                    if (I == 0)
                    {
                        int count = nl.Count;
                        if (count == 0)
                        {
                            Modellist.Header = new object();
                        }
                        else
                        {
                            Modellist.Header = nl[0];
                        }
                    }
                    else if (I == 1)
                    {


                        Modellist.Details = nl;
                    }

                    I++;
                }

                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };


            }
            catch (Exception Ex)
            {

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }

        public async Task<object> GetPORequstorAutoComplete(int branchid, int orgid, string requestorname)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 6);
                param.Add("@poid", 0);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                param.Add("@requestorid", 0);
                param.Add("@supplierid", 0);
                param.Add("@requstorname", requestorname);
                param.Add("@suppliername", null, DbType.String);
                param.Add("@prid", 0);
                param.Add("@ponumber", null, DbType.String);
                param.Add("@curid", 0);

                var List = await _connection.QueryAsync(PurchaseOrderBackEnd.PurchaseOrderProcedure, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();


                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };


            }
            catch (Exception Ex)
            {

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }

        public async Task<object> GetPOSupplierAutoComplete(int branchid, int orgid, string suppliername)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 5);
                param.Add("@poid", 0);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                param.Add("@requestorid", 0);
                param.Add("@supplierid", 0);
                param.Add("@requstorname", null, DbType.String);
                param.Add("@suppliername", suppliername);
                param.Add("@prid", 0);
                param.Add("@ponumber", null, DbType.String);
                param.Add("@curid", 0);

                var List = await _connection.QueryAsync(PurchaseOrderBackEnd.PurchaseOrderProcedure, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();


                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };


            }
            catch (Exception Ex)
            {

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }

        public async Task<object> GetByPONoSeqAsync(int branchid, int orgid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 7);
                param.Add("@poid", 0);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                param.Add("@requestorid", 0);
                param.Add("@supplierid", 0);
                param.Add("@requstorname", null, DbType.String);
                param.Add("@suppliername", null, DbType.String);
                param.Add("@prid", 0);
                param.Add("@ponumber", null, DbType.String);
                param.Add("@curid", 0);

                var data = await _connection.QueryFirstOrDefaultAsync(PurchaseOrderBackEnd.PurchaseOrderProcedure, param: param, commandType: CommandType.StoredProcedure);

                return new ResponseModel()
                {
                    Data = data,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception Ex)
            {

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }


        }

        public async Task<object> GetPOnoAutoComplete(int branchid, int orgid, string ponumber)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 9);
                param.Add("@poid", 0);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                param.Add("@requestorid", 0);
                param.Add("@supplierid", 0);
                param.Add("@requstorname", null, DbType.String);
                param.Add("@suppliername", null, DbType.String);
                param.Add("@prid", 0);
                param.Add("@ponumber", ponumber);
                param.Add("@curid", 0);

                var List = await _connection.QueryAsync(PurchaseOrderBackEnd.PurchaseOrderProcedure, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();


                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };


            }
            catch (Exception Ex)
            {

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }

        public async Task<object> GetPurchaseorderPrint(int opt, int poid, int branchid, int orgid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 1);
                param.Add("@poid", poid);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);

                var List = await _connection.QueryMultipleAsync(PurchaseOrderBackEnd.PurchaseORderPrint, param: param, commandType: CommandType.StoredProcedure);
                dynamic Modellist = new ExpandoObject();
                int I = 0;
                while (!List.IsConsumed)
                {
                    dynamic nl = List.Read();

                    if (I == 0)
                    {
                        int count = nl.Count;
                        if (count == 0)
                        {
                            Modellist.supplier = new object();
                        }
                        else
                        {
                            Modellist.supplier = nl[0];
                        }
                    }
                    else if (I == 1)
                    {


                        Modellist.header = nl;
                    }
                    else if (I == 2)
                    {
                        Modellist.items = nl;
                    }

                    I++;
                }
                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };


            }
            catch (Exception Ex)
            {

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }

        public async Task<object> GetSupplierCurrencyList(int supplierid, int branchid, int orgid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 10);
                param.Add("@poid", 0);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                param.Add("@requestorid", 0);
                param.Add("@supplierid", supplierid);
                param.Add("@requstorname", null, DbType.String);
                param.Add("@suppliername", null, DbType.String);
                param.Add("@prid", 0);
                param.Add("@ponumber", null, DbType.String);
                param.Add("@curid", 0);

                var List = await _connection.QueryAsync(PurchaseOrderBackEnd.PurchaseOrderProcedure, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();


                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };


            }
            catch (Exception Ex)
            {

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }


        public async Task<object> CancelPOAsync(int poid, int userId, int branchId, int orgId)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@p_poid", poid);
                param.Add("@p_userid", userId);
                param.Add("@p_branchid", branchId);
                param.Add("@p_orgid", orgId);

                var result = await _connection.QueryFirstOrDefaultAsync(PurchaseOrderBackEnd.CancelPurchaseOrderProcedure, param: param, commandType: CommandType.StoredProcedure);

                return new ResponseModel()
                {
                    Data = result,
                    Message = result?.status == 1 ? "Success" : result?.message ?? "Failed",
                    Status = result?.status == 1
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong: " + Ex.Message,
                    Status = false
                };
            }
        }

    }
}
