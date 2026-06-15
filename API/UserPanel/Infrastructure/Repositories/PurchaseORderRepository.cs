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

        private static bool _isProcedureUpdated = false;

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
                // Check if PO is short closed or has short closure request submitted
                string poQuery = "SELECT IsShortClosure, IsShortClosureSubmitted FROM tbl_purchaseorder_header WHERE poid = @poid AND branchid = @branchId AND orgid = @orgId LIMIT 1;";
                var poHeader = await _connection.QueryFirstOrDefaultAsync<dynamic>(poQuery, new { poid, branchId, orgId });
                if (poHeader != null)
                {
                    var poHeaderDict = poHeader as IDictionary<string, object>;
                    int isShortClosure = 0;
                    int isShortClosureSubmitted = 0;
                    if (poHeaderDict != null)
                    {
                        if (poHeaderDict.TryGetValue("IsShortClosure", out var scVal) && scVal != null)
                        {
                            isShortClosure = Convert.ToInt32(scVal);
                        }
                        if (poHeaderDict.TryGetValue("IsShortClosureSubmitted", out var scsVal) && scsVal != null)
                        {
                            isShortClosureSubmitted = Convert.ToInt32(scsVal);
                        }
                    }

                    if (isShortClosure == 1 || isShortClosureSubmitted == 1)
                    {
                        return new ResponseModel()
                        {
                            Data = null,
                            Message = "Cannot cancel PO because it is a Blanket PO / Short Closed PO.",
                            Status = false
                        };
                    }
                }

                // Check for GRN
                string grnQuery = "SELECT COUNT(1) FROM tbl_grn_detail WHERE poid = @poid AND isactive = 1;";
                int grnCount = await _connection.ExecuteScalarAsync<int>(grnQuery, new { poid });
                if (grnCount > 0)
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = "Cannot cancel PO because GRN exists for this PO.",
                        Status = false
                    };
                }

                // Check for IRN
                string irnQuery = "SELECT COUNT(1) FROM tbl_IRNReceipt_detail WHERE poid = @poid AND isactive = 1;";
                int irnCount = await _connection.ExecuteScalarAsync<int>(irnQuery, new { poid });
                if (irnCount > 0)
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = "Cannot cancel PO because IRN exists for this PO.",
                        Status = false
                    };
                }

                // Check for Claim
                string claimQuery = "SELECT COUNT(1) FROM btggasify_finance_live.tbl_claimAndpayment_Details WHERE poid = @poid AND isactive = 1;";
                int claimCount = await _connection.ExecuteScalarAsync<int>(claimQuery, new { poid });
                if (claimCount > 0)
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = "Cannot cancel PO because Claim exists for this PO.",
                        Status = false
                    };
                }

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

        public async Task<object> ShortClosureAsync(int poid, int userId, int branchId, int orgId)
        {
            try
            {
                // Validate that there is remaining pending quantity before allowing short close
                // var sqlPending = @"
                //     SELECT (
                //         (SELECT IFNULL(SUM(qty), 0) FROM tbl_purchaseorder_requisitions WHERE poid = @poid AND isactive = 1)
                //         -
                //         (SELECT IFNULL(SUM(gd.grnQty), 0) FROM tbl_grn_detail gd 
                //          JOIN tbl_grn_header gh ON gd.grnid = gh.grnid 
                //          WHERE gd.poid = @poid AND gd.isactive = 1 AND gh.IsSubmitted = 1)
                //     ) as PendingQty";

                // var pendingQty = await _connection.QueryFirstOrDefaultAsync<decimal>(sqlPending, new { poid });
                // if (pendingQty <= 0)
                // {
                //     return new ResponseModel()
                //     {
                //         Data = null,
                //         Message = "Cannot short close PO because there is no pending quantity remaining.",
                //         Status = false
                //     };
                // }

                // When "Blanket PO" is clicked, we set IsShortClosureSubmitted = 1
                // and immediately create the short closure/blanket PO (-1 amendment PO)
                var sql = "UPDATE tbl_purchaseorder_header SET IsShortClosureSubmitted = 1, IsGrnRaised = 1, modifieddt = NOW(), modifiedby = @userId WHERE poid = @poid AND branchid = @branchId AND orgid = @orgId";
                var result = await _connection.ExecuteAsync(sql, new { poid, userId, branchId, orgId });

                if (result > 0)
                {
                    // Immediately create the BlanketPO / ClosurePO record (PO ending with -1)
                    await CreateShortClosureAmendmentAsync(poid, userId, branchId, orgId);
                }

                return new ResponseModel()
                {
                    Data = result,
                    Message = result > 0 ? "Purchase Order submitted for closure approval" : "Failed to submit Purchase Order for closure",
                    Status = result > 0
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

        public async Task<object> SubmitShortClosureAsync(int poid, int userId, int branchId, int orgId)
        {
            return await ShortClosureAsync(poid, userId, branchId, orgId);
        }

        public async Task<object> GetBlanketPOApprovalsAsync(int branchId, int orgId, int userId)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 1);
                param.Add("@userid", userId);
                param.Add("@branchid", branchId);
                param.Add("@orgid", orgId);
                param.Add("@poid", 0);
                param.Add("@isapprovedone", 0);
                param.Add("@isapprovedtwo", 0);

                var rawList = await _connection.QueryAsync("proc_purchaseorderapproval", param, commandType: CommandType.StoredProcedure);
                var list = rawList.ToList();

                if (list != null && list.Count > 0)
                {
                    foreach (var row in list)
                    {
                        var dict = row as IDictionary<string, object>;
                        if (dict != null && dict.TryGetValue("id", out var poIdObj) && poIdObj != null)
                        {
                            int poid = Convert.ToInt32(poIdObj);
                            var qtySql = "SELECT IFNULL(SUM(qty), 0) FROM tbl_purchaseorder_requisitions WHERE poid = @poid AND isactive = 1;";
                            decimal totalQty = await _connection.QueryFirstOrDefaultAsync<decimal>(qtySql, new { poid = poid });
                            dict["totalqty"] = totalQty;
                        }
                    }
                }

                return new ResponseModel
                {
                    Data = list,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving Blanket PO Approvals: " + ex.Message,
                    Status = false
                };
            }
        }

        public async Task<object> SaveBlanketPOApproveAsync(BlanketPOApprovalHdr obj)
        {
            try
            {
                string updatedetails = @"UPDATE tbl_purchaseorder_header
                    SET 
                         modifiedby = @userid,
                         modifieddt = NOW(),
                         po_gm_isapproved = @isapprovedone,                
                         po_director_isapproved = @isapprovedtwo,
                         IsShortClosure = CASE WHEN @isapprovedtwo = 1 THEN 1 ELSE IsShortClosure END
                    WHERE poid = @poid;";

                string updateamendment = @"UPDATE tbl_purchaseorder_header
                    SET 
                         modifiedby = @userid,
                         modifieddt = NOW(),
                         po_gm_isapproved = @isapprovedone,                
                         po_director_isapproved = @isapprovedtwo
                    WHERE pono = (SELECT CONCAT(pono, '-1') FROM (SELECT pono FROM tbl_purchaseorder_header WHERE poid = @poid) AS tmp)
                      AND branchid = @branchid AND orgid = @orgid;";

                foreach (var item in obj.approve)
                {
                    item.userid = obj.UserId;
                    await _connection.ExecuteAsync(updatedetails, item);

                    // Update approval flags on the amendment PO as well
                    await _connection.ExecuteAsync(updateamendment, new
                    {
                        userid = obj.UserId,
                        isapprovedone = item.isapprovedone,
                        isapprovedtwo = item.isapprovedtwo,
                        poid = item.poid,
                        branchid = obj.branchid,
                        orgid = obj.orgid
                    });
                }


                return new ResponseModel
                {
                    Data = 1,
                    Message = "Updated successfully.",
                    Status = true
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Something went wrong while updating: " + ex.Message,
                    Status = false
                };
            }
        }

        public async Task<object> GetPendingGRNQtyAsync(int poid)
        {
            try
            {
                var sql = @"
                    SELECT (
                        (SELECT IFNULL(SUM(qty), 0) FROM tbl_purchaseorder_requisitions WHERE poid = @poid AND isactive = 1)
                        -
                        (SELECT IFNULL(SUM(gd.grnQty), 0) FROM tbl_grn_detail gd 
                         JOIN tbl_grn_header gh ON gd.grnid = gh.grnid 
                         WHERE gd.poid = @poid AND gd.isactive = 1 AND gh.IsSubmitted = 1)
                    ) as PendingQty";

                var pendingQty = await _connection.QueryFirstOrDefaultAsync<decimal>(sql, new { poid });

                return new ResponseModel()
                {
                    Data = pendingQty,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = 0,
                    Message = "Something went wrong: " + Ex.Message,
                    Status = false
                };
            }
        }

        private async Task CreateShortClosureAmendmentAsync(int poid, int userid, int branchid, int orgid)
        {
            try
            {
                // Fetch original PO header info (pono AND original createdby)
                var headerSql = "SELECT pono, createdby FROM tbl_purchaseorder_header WHERE poid = @poid;";
                var headerInfo = await _connection.QueryFirstOrDefaultAsync(headerSql, new { poid });
                if (headerInfo == null || string.IsNullOrEmpty((string)headerInfo.pono)) return;

                var pono = (string)headerInfo.pono;
                var originalCreatedBy = (int)headerInfo.createdby;

                var newPono = pono + "-1";

                // Check if already exists to avoid duplication
                var checkSql = "SELECT COUNT(1) FROM tbl_purchaseorder_header WHERE pono = @newPono AND branchid = @branchid AND orgid = @orgid";
                var exists = await _connection.ExecuteScalarAsync<int>(checkSql, new { newPono, branchid, orgid });
                if (exists > 0) return;

                // 1. Insert Header — preserve original createdby, NOT the approver's userid
                var insertHeaderSql = @"
                    INSERT INTO `tbl_purchaseorder_header`
                    (`pono`, `podate`, `supplierid`, `issaved`, `createddt`, `createdby`, `createdip`,
                    `isactive`, `orgid`, `branchid`, `requestorid`, `departmentid`, `paymenttermid`,
                    `deliverytermid`, `remarks`, `currencyid`, `prid`, `prtypeid`, `deliveryaddress`,`exchangerate`, 
                    `subtotal`, `discountvalue`, `taxvalue`, `vatvalue`, `nettotal`, `balance_amount`, `IsShortClosure`, `IsShortClosureSubmitted`, `po_gm_isapproved`, `po_director_isapproved`)
                    SELECT 
                    @newPono, podate, supplierid, issaved, NOW(), @originalCreatedBy, '',
                    1, orgid, branchid, requestorid, departmentid, paymenttermid,
                    deliverytermid, remarks, currencyid, prid, prtypeid, deliveryaddress, exchangerate,
                    0, 0, 0, 0, 0, 0, 1, 1, po_gm_isapproved, po_director_isapproved
                    FROM tbl_purchaseorder_header WHERE poid = @poid;
                    SELECT LAST_INSERT_ID();";

                var newPoid = await _connection.QuerySingleAsync<int>(insertHeaderSql, new { newPono, poid, originalCreatedBy });

                // 2. Insert Details
                var insertDetailSql = @"
                    INSERT INTO `tbl_purchaseorder_detail`
                    (`poid`, `prid`, `IsActive`, `CreatedDt`, `CreatedBy`, `branchid`, `orgid`)
                    SELECT @newPoid, prid, 1, NOW(), @originalCreatedBy, @branchid, @orgid
                    FROM tbl_purchaseorder_detail WHERE poid = @poid AND IsActive = 1;";

                await _connection.ExecuteAsync(insertDetailSql, new { newPoid, poid, originalCreatedBy, branchid, orgid });

                // 3. Insert Requisitions - scale all amounts proportionally to the GRN received qty
                //    Blanket PO qty = GRN received qty
                //    Scale factor = grn_rec_Qty / original_qty  (avoids recalculating tax formula)
                //    This preserves EXACTLY the same formula used when the original PO was saved.
                var insertReqSql = @"
                    INSERT INTO `tbl_purchaseorder_requisitions`
                    (`poid`, `podid`, `prmid`, `prdid`, `prid`, `itemid`, `uomid`, `qty`, `unitprice`, `totalvalue`,
                     `taxperc`, `taxvalue`, `subtotal`, `discountperc`, `discountvalue`, `nettotal`, `isactive`,
                     `createddt`, `createdby`, `branchid`, `orgid`,`vatperc`,`vatvalue`,`itemgroupid`, `grn_rec_Qty`)
                    SELECT 
                    @newPoid, 
                    (SELECT podid FROM tbl_purchaseorder_detail WHERE poid = @newPoid AND prid = por.prid LIMIT 1),
                    prmid, prdid, prid, itemid, uomid, 
                    -- GRN received qty
                    IFNULL(por.grn_rec_Qty, 0),
                    unitprice,
                    -- Scale all stored financial values proportionally to GRN received qty / original qty
                    CASE WHEN por.qty > 0 THEN ROUND(por.totalvalue    * IFNULL(por.grn_rec_Qty, 0) / por.qty, 2) ELSE 0 END,
                    taxperc,
                    CASE WHEN por.qty > 0 THEN ROUND(por.taxvalue      * IFNULL(por.grn_rec_Qty, 0) / por.qty, 2) ELSE 0 END,
                    CASE WHEN por.qty > 0 THEN ROUND(por.subtotal      * IFNULL(por.grn_rec_Qty, 0) / por.qty, 2) ELSE 0 END,
                    discountperc,
                    CASE WHEN por.qty > 0 THEN ROUND(por.discountvalue * IFNULL(por.grn_rec_Qty, 0) / por.qty, 2) ELSE 0 END,
                    CASE WHEN por.qty > 0 THEN ROUND(por.nettotal      * IFNULL(por.grn_rec_Qty, 0) / por.qty, 2) ELSE 0 END,
                    1, NOW(), @originalCreatedBy, @branchid, @orgid, vatperc,
                    CASE WHEN por.qty > 0 THEN ROUND(por.vatvalue      * IFNULL(por.grn_rec_Qty, 0) / por.qty, 2) ELSE 0 END,
                    itemgroupid, IFNULL(por.grn_rec_Qty, 0)
                    FROM tbl_purchaseorder_requisitions por WHERE poid = @poid AND isactive = 1;";

                await _connection.ExecuteAsync(insertReqSql, new { newPoid, poid, originalCreatedBy, branchid, orgid });

                // 4. Update Header Totals
                var updateTotalsSql = @"
                    UPDATE tbl_purchaseorder_header h
                    INNER JOIN (
                        SELECT poid, SUM(subtotal) as st, SUM(discountvalue) as dv, SUM(taxvalue) as tv, SUM(vatvalue) as vv, SUM(nettotal) as nt
                        FROM tbl_purchaseorder_requisitions
                        WHERE poid = @newPoid AND isactive = 1
                        GROUP BY poid
                    ) t ON h.poid = t.poid
                    SET h.subtotal = t.st, h.discountvalue = t.dv, h.taxvalue = t.tv, h.vatvalue = t.vv, h.nettotal = t.nt, h.balance_amount = 0
                    WHERE h.poid = @newPoid;";

                await _connection.ExecuteAsync(updateTotalsSql, new { newPoid });
            }
            catch (Exception)
            {
                // Silently fail or log for now
            }
        }

        public async Task<object> GetByIdsBulkAsync(List<int> poids, int branchid, int orgid)
        {
            try
            {
                if (poids == null || poids.Count == 0)
                {
                    dynamic emptyResult = new ExpandoObject();
                    emptyResult.Headers = new List<dynamic>();
                    emptyResult.Requisitions = new List<dynamic>();

                    return new ResponseModel()
                    {
                        Data = emptyResult,
                        Message = "Success",
                        Status = true
                    };
                }

                string sqlHeaders = @"
                    SELECT h.poid, p.termname AS paymentterm 
                    FROM tbl_purchaseorder_header h 
                    LEFT JOIN btggasify_live.master_terms p ON h.paymenttermid = p.id 
                    WHERE h.poid IN @poids";

                string sqlRequisitions = @"
                    SELECT rhdr.PR_Number AS prnumber, r.porid, r.poid, r.podid, r.prmid, r.prdid, r.prid, r.itemid, r.uomid, r.qty, r.unitprice, 
                    ROUND(CAST(r.totalvalue AS DECIMAL(20,4)), 2) AS totalvalue, r.taxperc, 
                    ROUND(CAST(r.taxvalue AS DECIMAL(20,4)), 2) AS taxvalue, ROUND(CAST(r.subtotal AS DECIMAL(20,4)), 2) AS subtotal, r.discountperc, 
                    ROUND(CAST(r.discountvalue AS DECIMAL(20,4)), 2) AS discountvalue, ROUND(CAST(r.nettotal AS DECIMAL(20,4)), 2) AS nettotal, r.isactive, r.createdby, r.branchid, r.orgid, 
                    u.uom, i.itemname, r.vatperc, ROUND(CAST(r.vatvalue AS DECIMAL(20,4)), 2) AS vatvalue, r.itemgroupid, g.groupname 
                    FROM tbl_purchaseorder_requisitions r 
                    INNER JOIN btggasify_live.master_uom u ON r.uomid = u.id 
                    INNER JOIN btggasify_masterpanel_live.master_item i ON r.itemid = i.itemid 
                    INNER JOIN btggasify_masterpanel_live.master_itemgroup g ON i.groupid = g.groupid 
                    LEFT JOIN tbl_PurchaseRequisition_Header rhdr ON r.prid = rhdr.prid 
                    WHERE r.poid IN @poids AND r.isactive = 1";

                var headers = await _connection.QueryAsync<dynamic>(sqlHeaders, new { poids });
                var requisitions = await _connection.QueryAsync<dynamic>(sqlRequisitions, new { poids });

                dynamic result = new ExpandoObject();
                result.Headers = headers;
                result.Requisitions = requisitions;

                return new ResponseModel()
                {
                    Data = result,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = ex.Message,
                    Status = false
                };
            }
        }

    }
}
