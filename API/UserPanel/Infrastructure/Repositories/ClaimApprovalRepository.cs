using BackEnd.Finance.ClaimAndPayment;
using Core.Abstractions;
using Core.Finance.Approval;
using Core.Finance.ClaimAndPayment;
using Core.Finance.PaymentPlan;
using Core.Models;
using Dapper;
using DocumentFormat.OpenXml.Math;
using DocumentFormat.OpenXml.Spreadsheet;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories
{
    public class ClaimApprovalRepository : IClaimApprovalRepository
    {

        private readonly IDbConnection _connection;

        public ClaimApprovalRepository(IUnitOfWorkDB3 financedb)
        {
            _connection = financedb.Connection;
        }
        string insertDiscussionQuery = @"

-- Detect level based on which discussion is 1
SET @level = CASE 
    WHEN @hod = 1 THEN 1
    WHEN @gm = 1 THEN 2
    WHEN @director = 1 THEN 3
    ELSE 0
END;

IF @level > 0
BEGIN
    -- Insert only if not already inserted before
    IF NOT EXISTS (
        SELECT 1 FROM tbl_claimAndpayment_reply 
        WHERE Claim_ID = @claimid AND level = @level
    )
    BEGIN
        
        -- Set previous record to completed
        UPDATE tbl_claimAndpayment_reply
        SET is_cont_discussion = 0
        WHERE Claim_ID = @claimid AND is_cont_discussion = 1;

        -- Get next sequence number
        set @seq = (
            SELECT IFNULL(MAX(reply_seq),0) + 1 
            FROM tbl_claimAndpayment_reply 
            WHERE Claim_ID = @claimid AND level = @level
        );

        INSERT INTO tbl_claimAndpayment_reply
        (
            Claim_ID, level, reply_seq, comment, replied_by, is_cont_discussion
        )
        VALUES
        (
            @claimid, @level, @seq, @remarks, @userid, 1
        );
    END
END;
";

        //public async Task<object> ApproveAsync(ClaimApprovalHdr obj)
        //{
        //    try
        //    {
        //        const string updatedetails = @"
        //        UPDATE tbl_claimAndpayment_header
        //        SET 
        //        claim_gm_isapproved = @isapprovedone,
        //        claim_gm_isdiscussed = @isdiscussedone,
        //        claim_director_isapproved = @isapprovedtwo,
        //        claim_director_isdiscussed = @isdiscussedtwo,
        //        ppp_gm_approvalone = @ppp_gm_approvalone,
        //        ppp_director_approvalone = @ppp_director_approvalone,
        //        ppp_gm_discussed = @ppp_gm_discussed,

        //        ppp_commissioner_approvalone = @ppp_commissioner_approvalone,
        //        ppp_commissioner_approvalone = @ppp_commissioner_approvalone,


        //        GmComment =@GmComment,
        //        ppp_director_discussed = @ppp_director_discussed,
        //        ppp_pv_Commissioner_discussedone = @ppp_pv_Commissioner_discussedone,
        //        PPP_PV_Commissioner_approveone = @PPP_PV_Commissioner_approveone,
        //        claim_comment = @remarks
        //        WHERE Claim_ID = @claimid and ifnull(ppp_IsRejected,0)=0";
        //        foreach (var item in obj.approve)
        //        {
        //            await _connection.ExecuteAsync(updatedetails, item);
        //        }

        //        return new ResponseModel
        //        {
        //            Data = 1,
        //            Message = "Updated successfully.",
        //            Status = true
        //        };
        //    }
        //    catch (Exception ex)
        //    {
        //        return new ResponseModel
        //        {
        //            Data = null,
        //            Message = "Something went wrong while updating: " + ex.Message,
        //            Status = false
        //        };
        //    }
        //}

    //    PPP_Discussed_Count = CASE
    //    WHEN(@ppp_gm_discussed = 1 AND IFNULL(ppp_gm_discussed, 0) = 0)
    //      OR(@ppp_director_discussed = 1 AND IFNULL(ppp_director_discussed, 0) = 0)
    //      OR(@ppp_commissioner_discussed = 1 AND IFNULL(ppp_commissioner_discussedone, 0) = 0   )
    //    THEN IFNULL(PPP_Discussed_Count, 0) + 1 
    //    ELSE IFNULL(PPP_Discussed_Count, 0)
    //END,

        public async Task<object> ApproveAsync(ClaimApprovalHdr obj)
        {
            try
            {
                if (obj.isppp_pv == 0)
                {

                    string updatedetails = @"
            UPDATE tbl_claimAndpayment_header
            SET 
                 LastModifiedBY=@userid ,  

  Claim_Discussed_Count = CASE 
        WHEN (@isdiscussedeight = 1 AND IFNULL(claim_hod_isdiscussed, 0) = 0) or (@isdiscussedone = 1 AND IFNULL(claim_gm_isdiscussed, 0) = 0)
          OR (@isdiscussedtwo = 1 AND IFNULL(claim_director_isdiscussed, 0) = 0)
        THEN IFNULL(Claim_Discussed_Count, 0) + 1 
        ELSE IFNULL(Claim_Discussed_Count, 0)
    END,

 

claim_hod_isapproved = case when ifnull(claim_hod_isapproved,0)=1 and  @isdiscussedone=1 then 0 else @isapprovedeight end ,
claim_hod_isdiscussed= @isdiscussedeight,
               
                
                claim_gm_isapproved = case when ifnull(claim_gm_isapproved,0)=1 and  @isdiscussedtwo=1 then 0 else @isapprovedone end ,

                claim_gm_isdiscussed = @isdiscussedone,

                claim_director_isapproved = @isapprovedtwo,

                claim_director_isdiscussed =@isdiscussedtwo,







  ppp_GM_dis_count = CASE WHEN (@ppp_gm_discussed = 1 AND IFNULL(ppp_gm_discussed, 0) = 0) then   IFNULL(ppp_GM_dis_count, 0) + 1    ELSE 0 end,

  ppp_DIR_dis_count = CASE WHEN (@ppp_director_discussed = 1 AND IFNULL(ppp_director_discussed, 0) = 0) then    IFNULL(ppp_DIR_dis_count, 0) + 1    ELSE 0 end,
  ppp_CEO_dis_count = CASE WHEN (@ppp_commissioner_discussed = 1 AND IFNULL(ppp_commissioner_discussedone, 0) = 0) then   IFNULL(ppp_CEO_dis_count, 0) + 1    ELSE 0 end,

 

                ppp_gm_approvalone = @ppp_gm_approvalone,

                ppp_gm_discussed = @ppp_gm_discussed,
               
                ppp_director_approvalone =@ppp_director_approvalone,
             ppp_commissioner_discussedone = CASE 
        WHEN IFNULL(voucherid,0) > 0 THEN @ppp_commissioner_discussed
        ELSE @ppp_commissioner_discussed
    END,
                

                ppp_director_discussed =@ppp_director_discussed,

                ppp_commissioner_approvalone = @ppp_commissioner_approvalone,
                
                 claim_comment = @remarks,
                 GmComment = @GmComment,
                 PPP_temp_GM_status = CASE WHEN @ppp_gm_approvalone = 1 OR @ppp_gm_discussed = 1 THEN 0 ELSE PPP_temp_GM_status END,
                 PPP_temp_Director_status = CASE WHEN @ppp_director_approvalone = 1 OR @ppp_director_discussed = 1 THEN 0 ELSE PPP_temp_Director_status END,
                 PPP_temp_CEO_status = CASE WHEN @ppp_commissioner_approvalone = 1 OR @ppp_commissioner_discussed = 1 THEN 0 ELSE PPP_temp_CEO_status END
             WHERE Claim_ID = @claimid AND IFNULL(ppp_IsRejected, 0) = 0;";

                    foreach (var item in obj.approve)
                    {
                        item.userid = obj.UserId;
                        await _connection.ExecuteAsync(updatedetails, item);
                    }



                    const string PPPupdatedetails = @"
            UPDATE tbl_claimAndpayment_header
            SET 
                
                PPP_Discussed_Count=ifnull(ppp_GM_dis_count,0) + ifnull(ppp_DIR_dis_count,0) + ifnull(ppp_CEO_dis_count,0)
               
            WHERE Claim_ID = @claimid AND IFNULL(ppp_IsRejected, 0) = 0;";


                    foreach (var item in obj.approve)
                    {
                        await _connection.ExecuteAsync(PPPupdatedetails, item);
                    }


                    const string statusupdatedetails = @"
            UPDATE tbl_claimAndpayment_header
            SET 
                


 IsPaymentgenerated = CASE
        WHEN (
            IFNULL(PPP_Discussed_Count, 0)
            
        ) >2 
        THEN 0
        ELSE IsPaymentgenerated
    END ,
   
 
                claim_gm_isdiscussed = case when ifnull(claim_hod_isapproved,0)=1   then 0 else claim_gm_isdiscussed end  ,

                claim_director_isdiscussed = case when ifnull(claim_gm_isapproved,0)=1   then 0 else claim_director_isdiscussed end  
               
            WHERE Claim_ID = @claimid AND IFNULL(ppp_IsRejected, 0) = 0;";


                    foreach (var item in obj.approve)
                    {
                        await _connection.ExecuteAsync(statusupdatedetails, item);
                    }


                }
                else
                {

                    string updateSql = string.Empty;

                    if (obj.type == 1)
                    {
                        if (obj.operation == 1)
                        {
                            updateSql = @"
                UPDATE tbl_claimAndpayment_header
                SET PPP_PV_Director_approve = 1,pv_dis_count=0,  LastModifiedBY=@userid 
                WHERE SummaryId = @SummaryId
                  AND IFNULL(PPP_PV_Director_approve, 0) = 0 and ifnull(ppp_IsRejected,0)=0 and ifnull(ppp_pv_IsRejected,0)=0;";
                        }
                        else if (obj.operation == 2)
                        {
                            updateSql = @"
                UPDATE tbl_claimAndpayment_header
                SET ppp_pv_Director_discussed = 1  ,claim_comment= @remarks,pv_dis_count=ifnull(pv_dis_count,0)+1,  LastModifiedBY=@userid  
                WHERE SummaryId = @SummaryId
                  AND IFNULL(PPP_PV_Director_approve, 0) = 0 and ifnull(ppp_IsRejected,0)=0 and ifnull(ppp_pv_IsRejected,0)=0;";
                        }
                    }
                    else if (obj.type == 2)
                    {
                        if (obj.operation == 1)
                        {
                            updateSql = @"
                UPDATE tbl_claimAndpayment_header
                SET PPP_PV_Commissioner_approveone = 1,pv_dis_count=0,  LastModifiedBY=@userid 
                WHERE SummaryId = @SummaryId
                  AND IFNULL(PPP_PV_Commissioner_approveone, 0) = 0 and ifnull(ppp_IsRejected,0)=0 and ifnull(ppp_pv_IsRejected,0)=0;";
                        }
                        else if (obj.operation == 2)
                        {
                             updateSql = @"
                UPDATE tbl_claimAndpayment_header
                SET ppp_pv_Commissioner_discussedone = 1 ,claim_comment= @remarks,  LastModifiedBY=@userid 
                WHERE SummaryId = @SummaryId 
                  AND IFNULL(PPP_PV_Commissioner_approveone, 0) = 0 and ifnull(ppp_IsRejected,0)=0 and ifnull(ppp_pv_IsRejected,0)=0;";
                        }

                    }
                    else
                    {
                        return new ResponseModel
                        {
                            Data = null,
                            Message = "Invalid type value.",
                            Status = false
                        };
                    }

                    int affectedRows = await _connection.ExecuteAsync(updateSql, new { SummaryId = obj.summaryid, remarks = obj.remarks,userid=obj.UserId });



        //             string updateissubmittedSql = @"
        //         UPDATE tbl_claimAndpayment_header
        //         SET    IsSubmitted = CASE
        // WHEN ((IFNULL(pv_dis_count, 0) 
        //       ) > 2  
        //       )
        // THEN 0
        // ELSE IsSubmitted 
        //   END
        //         WHERE SummaryId = @SummaryId";
        //             int affectedRows_issubmitted = await _connection.ExecuteAsync(updateissubmittedSql, new { SummaryId = obj.summaryid, remarks = obj.remarks });
                }

                string updatedetailsdis = "";
                //updatedetailsdis += @"update tbl_claimAndpayment_header set  isdiscussionaccepted=" + 1 + "  where  ifnull(claim_gm_isdiscussed,0)=1;";
                //updatedetailsdis += @"update tbl_claimAndpayment_header set  isdiscussionaccepted=" + 1 + "  where   ifnull(claim_director_isdiscussed,0)=1;";
                updatedetailsdis += @"update tbl_claimAndpayment_header set  isdiscussionaccepted=" + 1 + "  where   ifnull(ppp_gm_discussed,0)=1;";
                updatedetailsdis += @"update tbl_claimAndpayment_header set  isdiscussionaccepted=" + 1 + "  where   ifnull(ppp_director_discussed,0)=1;";
                updatedetailsdis += @"update tbl_claimAndpayment_header set  isdiscussionaccepted=" + 1 + "  where   ifnull(ppp_commissioner_discussedone,0)=1;";

                updatedetailsdis += @"update tbl_claimAndpayment_header set  isdiscussionaccepted=" + 1 + "  where    ifnull(ppp_pv_Commissioner_discussedone,0)=1;";
                updatedetailsdis += @"update tbl_claimAndpayment_header set  isdiscussionaccepted=" + 1 + "  where ifnull(ppp_pv_Director_discussed,0)=1;";
                await _connection.ExecuteAsync(updatedetailsdis);

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

        public async Task<object> PPPApproveAsync(PPPApproval obj)
        {
            try
            {
                string updatedetailsdis = "";

                if (obj.level == 1)
                {
                    if (obj.isapproved == true)
                    {
                        updatedetailsdis += @"update tbl_claimAndpayment_header set LastModifiedBY=@userid ,  PPP_temp_GM_status=1  where   ifnull(Claim_ID,0)=@claimid and ifnull(ppp_gm_approvalone,0)=0;";
                    }
                    else if (obj.isdiscussed == true)
                    {
                        updatedetailsdis += @"update tbl_claimAndpayment_header set LastModifiedBY=@userid , PPP_temp_GM_status=2, claim_comment=@GmComment  where   ifnull(Claim_ID,0)=@claimid  and ifnull(ppp_gm_discussed,0)=0;";
                    }
                    else
                    {
                        updatedetailsdis += @"update tbl_claimAndpayment_header set LastModifiedBY=@userid , PPP_temp_GM_status=0  where   ifnull(Claim_ID,0)=@claimid;";
                    }
                }
                else if (obj.level == 2)
                {
                    if (obj.isapproved == true)
                    {
                        updatedetailsdis += @"update tbl_claimAndpayment_header set LastModifiedBY=@userid , PPP_temp_Director_status=1  where   ifnull(Claim_ID,0)=@claimid  and ifnull(ppp_director_approvalone,0)=0;";
                    }
                    else if (obj.isdiscussed == true)
                    {
                        updatedetailsdis += @"update tbl_claimAndpayment_header set  LastModifiedBY=@userid ,PPP_temp_Director_status=2, claim_comment=@GmComment  where   ifnull(Claim_ID,0)=@claimid  and ifnull(ppp_director_discussed,0)=0;";
                    }
                    else
                    {
                        updatedetailsdis += @"update tbl_claimAndpayment_header set  LastModifiedBY=@userid ,PPP_temp_Director_status=0  where   ifnull(Claim_ID,0)=@claimid;";
                    }
                }
                else if (obj.level == 3)
                {
                    if (obj.isapproved == true)
                    {
                        updatedetailsdis += @"update tbl_claimAndpayment_header set LastModifiedBY=@userid , PPP_temp_CEO_status=1  where   ifnull(Claim_ID,0)=@claimid  and ifnull(ppp_commissioner_approvalone,0)=0;";
                    }
                    else if (obj.isdiscussed == true)
                    {
                        updatedetailsdis += @"update tbl_claimAndpayment_header set LastModifiedBY=@userid , PPP_temp_CEO_status=2, claim_comment=@GmComment  where   ifnull(Claim_ID,0)=@claimid  and ifnull(ppp_commissioner_discussedone,0)=0;";
                    }
                    else
                    {
                        updatedetailsdis += @"update tbl_claimAndpayment_header set LastModifiedBY=@userid , PPP_temp_CEO_status=0  where   ifnull(Claim_ID,0)=@claimid;";
                    }
                }




                await _connection.ExecuteAsync(updatedetailsdis, new
                {
                    claimid=obj.claimid,
                    GmComment=obj.GmComment,
                    userid=obj.userid

                });

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



        public async Task<object> GetHistoryAsync(int id, int userid, int branchId, Int32 orgid, string fromdate, string todate)
        {
            try
            {
                var param = new DynamicParameters();

                param.Add("@opt", 1);
                param.Add("@fromdate", fromdate);
                param.Add("@todate", todate);
                param.Add("@orgid", orgid);
                param.Add("@branchid", branchId);
               

                var list = await _connection.QueryAsync(ClaimAndPaymentDB.ClaimAndPaymentApprovalHistory, param, commandType: CommandType.StoredProcedure);

                return new ResponseModel
                {
                    Data = list,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving claim and payment by ID.",
                    Status = false
                };
            }
        }

        public async Task<object> GetAllAsync(int Id, int branchId, Int32 orgid, int userid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 1);
                param.Add("@userid", userid);
                param.Add("@branchid", branchId);
                param.Add("@orgid", orgid);
                param.Add("@id", 0);
                param.Add("@fromdate", "");
                param.Add("@todate", "");

                param.Add("@bankid", 0);
                param.Add("@mopid", 0);
                param.Add("@applicantid", 0);
                param.Add("@SupplierID", 0);

                param.Add("@isDirector", 0);
                param.Add("@PVPaymentId", 0);
                param.Add("@claimidlog", 0);
                var list = await _connection.QueryAsync(ClaimAndPaymentDB.ClaimAndPaymentApproval, param, commandType: CommandType.StoredProcedure);

                return new ResponseModel
                {
                    Data = list,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving claims.",
                    Status = false
                };
            }
        }

        public async Task<object> GetAllAsync(int bankId, Int32 MODId, int SupplierId, int ApplicantId, int userid, int isDirector, int PVPaymentId)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 3);
                param.Add("@userid", userid);
                param.Add("@branchid", 1);
                param.Add("@orgid", 1);
                param.Add("@id", 0);
                param.Add("@fromdate", "");
                param.Add("@todate", "");


                param.Add("@bankid", bankId);
                param.Add("@mopid", MODId);
                param.Add("@applicantid", ApplicantId);
                param.Add("@SupplierID", SupplierId);
                param.Add("@isDirector", isDirector);
                param.Add("@PVPaymentId", PVPaymentId);
                param.Add("@claimidlog", 0);
                var list = await _connection.QueryAsync(ClaimAndPaymentDB.ClaimAndPaymentApproval, param, commandType: CommandType.StoredProcedure);

                return new ResponseModel
                {
                    Data = list,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving claims.",
                    Status = false
                };
            }
        }


        public async Task<object> GetRemarksList(int claimid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 4);
                param.Add("@userid", 0);
                param.Add("@branchid", 1);
                param.Add("@orgid", 1);
                param.Add("@id", 0);
                param.Add("@fromdate", "");
                param.Add("@todate", "");


                param.Add("@bankid", 0);
                param.Add("@mopid", 0);
                param.Add("@applicantid", 0);
                param.Add("@SupplierID", 0);
                param.Add("@isDirector", 0);
                param.Add("@PVPaymentId", 0);
                param.Add("@claimidlog", claimid);
                var list = await _connection.QueryAsync(ClaimAndPaymentDB.ClaimAndPaymentApproval, param, commandType: CommandType.StoredProcedure);

                return new ResponseModel
                {
                    Data = list,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving claims.",
                    Status = false
                };
            }
        }

        public async Task<object> Getcommenthistory(int claimid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 7);
                param.Add("@userid", 0);
                param.Add("@branchid", 1);
                param.Add("@orgid", 1);
                param.Add("@id", 0);
                param.Add("@fromdate", "");
                param.Add("@todate", "");


                param.Add("@bankid", 0);
                param.Add("@mopid", 0);
                param.Add("@applicantid", 0);
                param.Add("@SupplierID", 0);
                param.Add("@isDirector", 0);
                param.Add("@PVPaymentId", 0);
                param.Add("@claimidlog", claimid);
                var list = await _connection.QueryAsync(ClaimAndPaymentDB.ClaimAndPaymentApproval, param, commandType: CommandType.StoredProcedure);

                return new ResponseModel
                {
                    Data = list,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving claims.",
                    Status = false
                };
            }
        }



        public async Task<object> GetAllPaymentPlanAsync(int Id, int branchId, Int32 orgid, int userid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 1);
                param.Add("@userid", userid);
                param.Add("@branchid", branchId);
                param.Add("@orgid", orgid);
                param.Add("@id", 0);
                param.Add("@fromdate", "");
                param.Add("@todate", "");
                var list = await _connection.QueryMultipleAsync(ClaimAndPaymentDB.PaymentPlan, param, commandType: CommandType.StoredProcedure);

                var details = list.Read().ToList();
                var header = list.ReadFirstOrDefault();


                return new ResponseModel
                {
                    Data = new { Header = header, Details = details },
                    Message = "Success",
                    Status = true
                };


            }
            catch (Exception)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving claims.",
                    Status = false
                };
            }
        }
        public async Task<object> SavePaymentPlanAsync(PaymentPlanHdr obj)
        {
            try

            {

                obj.summary.header.InHand_CNY = obj.summary.header.CashInHands.CNY;
                obj.summary.header.InHand_USD = obj.summary.header.CashInHands.USD;
                obj.summary.header.InHand_SGD = obj.summary.header.CashInHands.SGD;
                obj.summary.header.InHand_IDR = obj.summary.header.CashInHands.IDR;
                obj.summary.header.InHand_MYR = obj.summary.header.CashInHands.MYR;

                obj.summary.header.Sales_CNY = obj.summary.header.CashFromSales.CNY;
                obj.summary.header.Sales_USD = obj.summary.header.CashFromSales.USD;
                obj.summary.header.Sales_SGD = obj.summary.header.CashFromSales.SGD;
                obj.summary.header.Sales_IDR = obj.summary.header.CashFromSales.IDR;
                obj.summary.header.Sales_MYR = obj.summary.header.CashFromSales.MYR;
                var insertedHeaderId = 0;
                if (obj.summary.header.PaymentId == 0)
                {
                    string InsertSummaryHeader = @"INSERT INTO `tbl_PaymentSummary_header`(`IsSubmitted`,`PaymentNo`,`Sales_CNY`,`Sales_USD`,`Sales_SGD`,`Sales_IDR`,`Sales_MYR`,`InHand_CNY`,`InHand_USD`,`InHand_SGD`,`InHand_IDR`,`InHand_MYR`,`FromDate`,`TotalInHandCash`,`ToDate`,`CashInHand`,`CashFromSalesAtFactory`,`CashNeeded`,`CreatedBy`,`CreatedDate`,`CreatedIP`,`IsActive`,`OrgId`,`BranchId`)";
                    InsertSummaryHeader += @"values(@IsSubmitted,@seqno,@Sales_CNY,@Sales_USD,@Sales_SGD,@Sales_IDR,@Sales_MYR,@InHand_CNY,@InHand_USD,@InHand_SGD,@InHand_IDR,@InHand_MYR,@FromDate,@TotalInHandCash,@ToDate,@CashInHand,@CashFromSalesAtFactory,@CashNeeded,@UserId,now(),'',1,@orgid,@branchid);";
                    var insertedSummaryHeaderId = await _connection.ExecuteAsync(InsertSummaryHeader, obj.summary.header);
                    const string getLastInsertedIdSql = "SELECT LAST_INSERT_ID();";
                    insertedHeaderId = await _connection.QuerySingleAsync<int>(getLastInsertedIdSql);
                }
                else
                {
                    string InsertSummaryHeader = @"update tbl_PaymentSummary_header set IsSubmitted=@IsSubmitted, Sales_CNY=@Sales_CNY,Sales_USD=@Sales_USD,Sales_SGD=@Sales_SGD,Sales_IDR=@Sales_IDR,Sales_MYR=@Sales_MYR,InHand_CNY=@InHand_CNY,InHand_USD=@InHand_USD,InHand_SGD=@InHand_SGD,InHand_IDR=@InHand_IDR,InHand_MYR=@InHand_MYR,FromDate=@FromDate,TotalInHandCash=@TotalInHandCash,ToDate=@ToDate,CashInHand=@CashInHand,CashFromSalesAtFactory=@CashFromSalesAtFactory,CashNeeded=@CashNeeded where SummaryId=@PaymentId;";
                    var insertedSummaryHeaderId = await _connection.ExecuteAsync(InsertSummaryHeader, obj.summary.header);
                    insertedHeaderId = obj.summary.header.PaymentId;
                }


                string updatedetails = "update tbl_claimAndpayment_header set SummaryId=0,IsPaymentPlanSaved=0,IsPaymentgenerated=0 where SummaryId=" + insertedHeaderId + "; ";
                await _connection.ExecuteAsync(updatedetails, obj.approve);
                updatedetails = "";
                if (obj.summary.header.IsSubmitted == 1)
                {
                    updatedetails = @"update tbl_claimAndpayment_header set SummaryId=" + insertedHeaderId + " ,IsPaymentPlanSaved=0, IsPaymentgenerated=@ispaymentgenerated,ppp_gm_discussed=0,ppp_director_discussed=0,ppp_commissioner_discussedone=0,ppp_IsRejected=0,ppp_gm_approvalone=0,ppp_director_approvalone=0,ppp_commissioner_approvalone=0,ppp_pv_IsRejected=0,BankId=0  where Claim_ID=@claimid; ";
                }
                else
                {
                    updatedetails = @"update tbl_claimAndpayment_header set SummaryId=" + insertedHeaderId + " ,IsPaymentPlanSaved=1, IsPaymentgenerated=0  where Claim_ID=@claimid; ";
                }
                await _connection.ExecuteAsync(updatedetails, obj.approve);

                string InsertSummaryDetails = @"INSERT INTO `tbl_PaymentSummary_detail`(`SummaryId`,`TypeId`,`Category`,`CurrencyId`,`Conversion`,`ConvertedToIDR`,`Currency` ,
                                               `IsActive`,`Amount`)";
                InsertSummaryDetails += @"values(" + insertedHeaderId + ",@TypeId,@Category,@CurrencyId,@Conversion,@ConvertedToIDR,@Currency,1,@Amount);";

                await _connection.ExecuteAsync(InsertSummaryDetails, obj.summary.details);

                if (obj.summary.header.PaymentId == 0)
                {
                    var UpdateSeq = "update master_documentnumber set Doc_Number=Doc_Number+1 where Doc_Type=3 and unit=" + obj.summary.header.branchid + "; ";
                    var Result = await _connection.ExecuteAsync(UpdateSeq, obj.summary.header.branchid);
                }


                return new ResponseModel
                {
                    Data = 1,
                    Message = "updated Successfully",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Something went wrong while updating . : " + Ex.Message,
                    Status = false
                };
            }
        }

        public async Task<object> ApproveClaims(RejectDetails claims)
        {
            try

            {
                if (claims.IsPPP == 1)
                {
                    string updatedetails = @"update tbl_claimAndpayment_header set voucherid=0,voucherno='',ppp_IsRejected=" + 1 + ",ppp_IsRejected_By=" + claims.UserId + "  where Claim_ID=@Id";
                    await _connection.ExecuteAsync(updatedetails, claims.Reject);
                }
                else
                {
                    string updatedetails = @"update tbl_claimAndpayment_header set voucherid=0,voucherno='',PPP_PV_Commissioner_approveone=0,PPP_PV_Director_approve=0,ppp_pv_Commissioner_discussedone=0,ppp_pv_Director_discussed=0,ppp_pv_IsRejected=" + 1 + ",ppp_pv_IsRejected_By=" + claims.UserId + "  where Claim_ID=@Id";
                    await _connection.ExecuteAsync(updatedetails, claims.Reject);
                }
                return new ResponseModel
                {
                    Data = 1,
                    Message = "Rejected Successfully",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Something went wrong while Rejecting . : " + Ex.Message,
                    Status = false
                };
            }
        }


        public async Task<object> RejectClaims(RejectDetails claims)
        {
            try

            {
                if (claims.IsPPP == 1)
                {
                    string updatedetails = @"update tbl_claimAndpayment_header set voucherid=0,voucherno='',ppp_IsRejected=" + 1 + ",ppp_IsRejected_By=" + claims.UserId + "  where Claim_ID=@Id";
                    await _connection.ExecuteAsync(updatedetails, claims.Reject);
                }
                else
                {
                    string updatedetails = @"update tbl_claimAndpayment_header set voucherid=0,voucherno='',PPP_PV_Commissioner_approveone=0,PPP_PV_Director_approve=0,ppp_pv_Commissioner_discussedone=0,ppp_pv_Director_discussed=0,ppp_pv_IsRejected=" + 1 + ",ppp_pv_IsRejected_By=" + claims.UserId + "  where Claim_ID=@Id";
                    await _connection.ExecuteAsync(updatedetails, claims.Reject);
                }
                return new ResponseModel
                {
                    Data = 1,
                    Message = "Rejected Successfully",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Something went wrong while Rejecting . : " + Ex.Message,
                    Status = false
                };
            }
        }


        public async Task<object> GetPaymentSummarySeqNoAsync(int userid, int branchId, Int32 orgid)
        {
            try
            {
                var param = new DynamicParameters();

                param.Add("@opt", 2);
                param.Add("@userid", userid);
                param.Add("@branchid", branchId);
                param.Add("@orgid", orgid);
                param.Add("@id", 0);
                param.Add("@fromdate", "");
                param.Add("@todate", "");

                param.Add("@bankid", 0);
                param.Add("@mopid", 0);
                param.Add("@applicantid", 0);
                param.Add("@SupplierID", 0);
                param.Add("@isDirector", 0);
                param.Add("@PVPaymentId", 0);
                param.Add("@claimidlog", 0);
                var list = await _connection.QueryAsync(ClaimAndPaymentDB.ClaimAndPaymentApproval, param, commandType: CommandType.StoredProcedure);
                var data = list.FirstOrDefault();
                return new ResponseModel
                {
                    Data = data,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving claim and payment by ID.",
                    Status = false
                };
            }

        }


        public async Task<object> GetDiscussionList(int userid, int branchId, Int32 orgid)
        {
            try
            {
                var param = new DynamicParameters();

                param.Add("@opt", 5);
                param.Add("@userid", userid);
                param.Add("@branchid", branchId);
                param.Add("@orgid", orgid);
                param.Add("@id", 0);
                param.Add("@fromdate", "");
                param.Add("@todate", "");

                param.Add("@bankid", 0);
                param.Add("@mopid", 0);
                param.Add("@applicantid", 0);
                param.Add("@SupplierID", 0);
                param.Add("@isDirector", 0);
                param.Add("@PVPaymentId", 0);
                param.Add("@claimidlog", 0);
                var list = await _connection.QueryAsync(ClaimAndPaymentDB.ClaimAndPaymentApproval, param, commandType: CommandType.StoredProcedure);
                var data = list;
                return new ResponseModel
                {
                    Data = data,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving claim and payment by ID.",
                    Status = false
                };
            }

        }

        public async Task<object> AcceptDiscussion(int claimid,string Comment,int Type,int isclaimant,int userid, int logid = 0)
        {
            try
            {
                if (claimid >  0)
                {
                    if (isclaimant == 1)
                    {

                        string updatedetails = @"update tbl_claimAndpayment_header set isclaimant_discussed=0,IsSubmitted=0,claim_comment='" + Comment + "', isdiscussionaccepted=" + 0 + "  where Claim_ID=@claimid and isdiscussionaccepted=1;";
                         
                        await _connection.ExecuteAsync(updatedetails, new { Comment, ClaimId = claimid });
                         
                    }
                    else
                    {
                        if (Type == 1)
                        {
                            string updatedetails = @"update tbl_claimAndpayment_header set claim_comment='" + Comment + "', isdiscussionaccepted=" + 0 + "  where Claim_ID=@claimid;";
                            updatedetails += @"update tbl_claimAndpayment_header set  claim_comment='" + Comment + "', claim_hod_isdiscussed=" + 0 + "  where Claim_ID=@claimid and ifnull(claim_hod_isdiscussed,0)=1;";
                            updatedetails += @"update tbl_claimAndpayment_header set  claim_comment='" + Comment + "', claim_gm_isdiscussed=" + 0 + "  where Claim_ID=@claimid and ifnull(claim_gm_isdiscussed,0)=1;";
                            updatedetails += @"update tbl_claimAndpayment_header set  claim_comment='" + Comment + "', claim_director_isdiscussed=" + 0 + "  where Claim_ID=@claimid and ifnull(claim_director_isdiscussed,0)=1;";

                            await _connection.ExecuteAsync(updatedetails, new { Comment, ClaimId = claimid });
                        }
                        else
                        {
                            if (logid > 0)
                            {
                                // First, resolve the specific comment in log
                                string updateLogSql = "UPDATE tbl_claimAndpayment_header_log SET claim_comment = CONCAT('[Resolved] ', claim_comment) WHERE LogID = @logid;";
                                await _connection.ExecuteAsync(updateLogSql, new { logid });

                                // Check count of remaining unresolved CEO comments
                                string countUnresolvedSql = @"
                                    SELECT COUNT(DISTINCT log.LogID) 
                                    FROM tbl_claimAndpayment_header AS ch 
                                    INNER JOIN tbl_claimAndpayment_header_log AS log ON log.summaryid = ch.SummaryId 
                                    INNER JOIN ApprovalRequests as ar ON ar.branchid = ch.branchid AND ar.screenid = 27 AND ar.level = 7 
                                    WHERE ch.SummaryId = @claimid
                                      AND IFNULL(ch.ppp_pv_Commissioner_discussedone,0) = 1 
                                      AND IFNULL(ch.isdiscussionaccepted,0) = 1 
                                      AND FIND_IN_SET('claim_comment', REPLACE(log.UpdatedColumns, ' ', '')) > 0 
                                      AND log.LastModifiedBY = ar.LevelApprover 
                                      AND IFNULL(log.claim_comment,'') != '' 
                                      AND log.LogID > IFNULL((SELECT MAX(l2.LogID) FROM tbl_claimAndpayment_header_log l2 WHERE l2.summaryid = ch.SummaryId AND FIND_IN_SET('isdiscussionaccepted', REPLACE(l2.UpdatedColumns, ' ', '')) > 0 AND IFNULL(l2.isdiscussionaccepted, 0) = 0), 0) 
                                      AND NOT (log.claim_comment LIKE '[Resolved] %');";

                                int unresolvedCount = await _connection.QueryFirstOrDefaultAsync<int>(countUnresolvedSql, new { claimid });

                                if (unresolvedCount == 0)
                                {
                                    // If no unresolved comments remain, clear all flags (same as original code)
                                    string updatedetails = @"update tbl_claimAndpayment_header set LastModifiedBY=@userid ,claim_comment=@Comment, isdiscussionaccepted=" + 0 + "  where summaryid=@claimid;";

                                    updatedetails += @"update tbl_claimAndpayment_header set  LastModifiedBY=@userid ,claim_comment=@Comment, ppp_commissioner_discussedone=" + 0 + "  where summaryid=@claimid and ifnull(ppp_commissioner_discussedone,0)=1;";

                                    updatedetails += @"update tbl_claimAndpayment_header set  LastModifiedBY=@userid ,claim_comment=@Comment, ppp_gm_discussed=" + 0 + "  where summaryid=@claimid and ifnull(ppp_gm_discussed,0)=1;";
                                    updatedetails += @"update tbl_claimAndpayment_header set  LastModifiedBY=@userid ,claim_comment=@Comment, ppp_director_discussed=" + 0 + "  where summaryid=@claimid and ifnull(ppp_director_discussed,0)=1;";

                                    updatedetails += @"update tbl_claimAndpayment_header set  LastModifiedBY=@userid ,claim_comment=@Comment, ppp_pv_Commissioner_discussedone=" + 0 + "  where summaryid=@claimid and ifnull(ppp_pv_Commissioner_discussedone,0)=1;";
                                    updatedetails += @"update tbl_claimAndpayment_header set  LastModifiedBY=@userid ,claim_comment=@Comment, ppp_pv_Director_discussed=" + 0 + "  where summaryid=@claimid and ifnull(ppp_pv_Director_discussed,0)=1;";
                                    await _connection.ExecuteAsync(updatedetails, new { Comment, ClaimId = claimid, userid });
                                }
                                else
                                {
                                    // If unresolved comments remain, update the comment in the header to log Mery's response,
                                    // but keep isdiscussionaccepted = 1 and ppp_pv_Commissioner_discussedone = 1.
                                    string updatedetails = @"update tbl_claimAndpayment_header set LastModifiedBY=@userid ,claim_comment=@Comment where summaryid=@claimid;";
                                    await _connection.ExecuteAsync(updatedetails, new { Comment, ClaimId = claimid, userid });
                                }
                            }
                            else
                            {
                                // original else logic
                                string updatedetails = @"update tbl_claimAndpayment_header set LastModifiedBY="+ userid + " ,claim_comment='" + Comment + "', isdiscussionaccepted=" + 0 + "  where summaryid=@claimid;";

                                updatedetails += @"update tbl_claimAndpayment_header set  LastModifiedBY="+ userid + " ,claim_comment='" + Comment + "', ppp_commissioner_discussedone=" + 0 + "  where summaryid=@claimid and ifnull(ppp_commissioner_discussedone,0)=1;";

                                updatedetails += @"update tbl_claimAndpayment_header set  LastModifiedBY="+ userid + " ,claim_comment='" + Comment + "', ppp_gm_discussed=" + 0 + "  where summaryid=@claimid and ifnull(ppp_gm_discussed,0)=1;";
                                updatedetails += @"update tbl_claimAndpayment_header set  LastModifiedBY="+ userid + " ,claim_comment='" + Comment + "', ppp_director_discussed=" + 0 + "  where summaryid=@claimid and ifnull(ppp_director_discussed,0)=1;";

                                updatedetails += @"update tbl_claimAndpayment_header set  LastModifiedBY="+ userid + " ,claim_comment='" + Comment + "', ppp_pv_Commissioner_discussedone=" + 0 + "  where summaryid=@claimid and ifnull(ppp_pv_Commissioner_discussedone,0)=1;";
                                updatedetails += @"update tbl_claimAndpayment_header set  LastModifiedBY="+ userid + " ,claim_comment='" + Comment + "', ppp_pv_Director_discussed=" + 0 + "  where summaryid=@claimid and ifnull(ppp_pv_Director_discussed,0)=1;";
                                await _connection.ExecuteAsync(updatedetails, new { Comment, ClaimId = claimid });
                            }
                        }
                    }
                        return new ResponseModel
                        {
                            Data = 1,
                            Message = "Discussion Accepted Successfully",
                            Status = true
                        };
                }
                else
                {
                    return new ResponseModel
                    {
                        Data = 0,
                        Message = "Claim not available",
                        Status = true
                    };
                }  
            }
            catch (Exception Ex)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Something went wrong while Accept claim . : " + Ex.Message,
                    Status = false
                };
            }
        }


    }
}
