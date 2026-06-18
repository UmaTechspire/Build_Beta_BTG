using System.Data;
using System.Security.Claims;
using BackEnd.Shared;
using Core.Abstractions;
using Core.Finance.ClaimAndPayment;
using Core.Models;
using Dapper;

namespace Infrastructure.Repositories
{
    public class ClaimAndPaymentRepository : IClaimAndPaymentRepository
    
    {
        private readonly IDbConnection _connection;

        public ClaimAndPaymentRepository(IUnitOfWorkDB3 financedb)
        {
            _connection = financedb.Connection;
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

        public async Task<object> AddAsync(ClaimAndPaymentModel obj)
        {
            try
            {
                int IsValidated = 0;
                string Message = "";
                 
                var response = await GetSeqNumber(0, obj.Header.ApplicationNo, 1, obj.Header.BranchId, obj.Header.OrgId);
                if (response.Status == true)
                {
                    if (response.Data.result == 1)
                    {
                        IsValidated = 1;
                        Message = " - The current claim number " + obj.Header.ApplicationNo + " is taken for another Claim so the new claim number (" + response.Data.text + ") has been generated for this claim";
                        obj.Header.ApplicationNo = response.Data.text;
                    }
                }

                const string insertHeaderSql = @"
            INSERT INTO tbl_claimAndpayment_header (
                ClaimCategoryId, ApplicationDate, ApplicationNo, DepartmentId, ApplicantId,
                JobTitle, HOD, TransactionCurrencyId,ModeOfPaymentId, AttachmentName, AttachmentPath,
                CostCenterId, ClaimAmountInTC, TotalAmountInIDR, Remarks,CreatedBy,
                IsActive, IsSubmitted, OrgId, BranchId,SupplierId,PONo,docType
            )
            VALUES (
                @ClaimCategoryId, @ApplicationDate, @ApplicationNo, @DepartmentId, @ApplicantId,
                @JobTitle, @HOD, @TransactionCurrencyId,@ModeOfPaymentId, @AttachmentName, @AttachmentPath,
                @CostCenterId, @ClaimAmountInTC, @TotalAmountInIDR, @Remarks,@UserId,
                1, @IsSubmitted, @OrgId, @BranchId,@SupplierId,@PONo,@docType
            );";

                await _connection.ExecuteAsync(insertHeaderSql, obj.Header);

                var claimId = await _connection.QuerySingleAsync<int>("SELECT LAST_INSERT_ID();");

                const string insertDetailSql = @"
            INSERT INTO tbl_claimAndpayment_Details (
                Claim_ID, ClaimTypeId, Amount, TaxRate, TotalAmount,
                ExpenseDate, Purpose, IsActive, PaymentId,IsTaxCalType,TaxPerc,docReference,taxid,vatid,VatRate,VatPerc,poid
            )
            VALUES (
                @ClaimId, @ClaimTypeId, @Amount, @TaxRate, @TotalAmount,
                @ExpenseDate, @Purpose, 1, @PaymentId,@IsTaxCalType,@TaxPerc,@docReference,@taxid,@vatid,@VatRate,@VatPerc,@poid
            );";

                foreach (var detail in obj.Details)
                {
                    detail.ClaimId = claimId;
                }

                await _connection.ExecuteAsync(insertDetailSql, obj.Details);

                 
                var UpdateSeq = "update master_documentnumber set Doc_Number=Doc_Number+1 where Doc_Type=1 and unit=" + obj.Header.BranchId + "; call proc_claimhodapproval("+ claimId + "); ";
                var Result = await _connection.ExecuteAsync(UpdateSeq, obj.Header.BranchId);



                 

                return new ResponseModel
                {
                    Data = claimId,
                    Message = obj.Header.IsSubmitted == 1 ? "Posted Successfully" : "Saved Successfully " + Message,
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Something went wrong while saving claim and payment. : "+Ex.Message,
                    Status = false
                };
            }
        }

        public async Task<object> UpdateAsync(ClaimAndPaymentModel obj)
        {
            try
            {

                var claimcount = await _connection.QuerySingleAsync<int>("SELECT  count(*) from tbl_claimAndpayment_header where Claim_ID=@ClaimId and ifnull(ppp_gm_approvalone,0)=0 ", new { ClaimId = obj.Header.ClaimId });

                if (claimcount == 0)
                {
                    return new ResponseModel
                    {
                        Data = 0,
                        Message = "Cannot edit this claim. please check the approval status.",
                        Status = false
                    };
                }

                // Retain the original claimant (CreatedBy) and department (DepartmentId) from the database
                var existingClaim = await _connection.QueryFirstOrDefaultAsync<dynamic>(
                    "SELECT CreatedBy, DepartmentId FROM tbl_claimAndpayment_header WHERE Claim_ID = @ClaimId",
                    new { ClaimId = obj.Header.ClaimId }
                );

                if (existingClaim != null)
                {
                    obj.Header.ApplicantId = existingClaim.CreatedBy;
                    obj.Header.DepartmentId = existingClaim.DepartmentId;
                }
                
                const string updateHeaderSql = @"
            UPDATE tbl_claimAndpayment_header
            SET 
                ClaimCategoryId = @ClaimCategoryId,
                ApplicationDate = @ApplicationDate,
                ApplicationNo = @ApplicationNo,
                DepartmentId = @DepartmentId,
                ApplicantId = @ApplicantId,
                JobTitle = @JobTitle,
                HOD = @HOD,
                TransactionCurrencyId = @TransactionCurrencyId,
                ModeOfPaymentId = @ModeOfPaymentId,
                ClaimAmountInTC = @ClaimAmountInTC,
                TotalAmountInIDR = @TotalAmountInIDR,
                Remarks = @Remarks,
                 
                LastModifiedBY = @UserId,

                LastModifiedDate = NOW(),
                LastModifiedIP = '',
                IsSubmitted = case when(IsSubmitted=1) then IsSubmitted else @IsSubmitted end,
                SupplierId=@SupplierId,
                PONo=@PONo,
                docType=@docType,claim_gm_isdiscussed= case when (@IsSubmitted=1) then 0 else claim_gm_isdiscussed end,claim_hod_isdiscussed= case when (@IsSubmitted=1) then 0  else claim_hod_isdiscussed end,claim_director_isdiscussed= case when (@IsSubmitted=1) then 0 else claim_director_isdiscussed end 
            WHERE Claim_ID = @ClaimId;";

                await _connection.ExecuteAsync(updateHeaderSql, obj.Header);

                const string deactivateDetailsSql = @"
            UPDATE tbl_claimAndpayment_Details 
            SET IsActive = 0 
            WHERE Claim_ID = @ClaimId;";
                await _connection.ExecuteAsync(deactivateDetailsSql, new { ClaimId = obj.Header.ClaimId });

                foreach (var detail in obj.Details)
                {
                    detail.ClaimId = obj.Header.ClaimId;

                    if (detail.ClaimDtlId == 0)
                    {
                        const string insertDetailSql = @"
                    INSERT INTO tbl_claimAndpayment_Details (
                        Claim_ID, ClaimTypeId, ClaimAndPaymentDesc, Amount, TaxRate, TotalAmount,
                        ExpenseDate, Purpose, IsActive, PaymentId ,IsTaxCalType,TaxPerc,docReference,taxid,vatid,VatRate,VatPerc,poid
                    )
                    VALUES (
                        @ClaimId, @ClaimTypeId, @ClaimAndPaymentDesc, @Amount, @TaxRate, @TotalAmount,
                        @ExpenseDate, @Purpose, 1, @PaymentId ,@IsTaxCalType,@TaxPerc,@docReference,@taxid,@vatid,@VatRate,@VatPerc,@poid
                    );";

                        await _connection.ExecuteAsync(insertDetailSql, detail);
                    }
                    else
                    {
                        const string reactivateDetailSql = @"
                    UPDATE tbl_claimAndpayment_Details 
                    SET poid=@poid,VatRate=@VatRate,VatPerc=@VatPerc,taxid=@taxid,vatid=@vatid, docReference=@docReference,TaxPerc=@TaxPerc , IsTaxCalType=@IsTaxCalType,IsActive = 1 ,ClaimTypeId=@ClaimTypeId,PaymentId=@PaymentId,Amount=@Amount,TaxRate=@TaxRate,TotalAmount=@TotalAmount,ExpenseDate=@ExpenseDate,
                    Purpose=@Purpose
                    WHERE Claim_Dtl_ID = @ClaimDtlId;";

                        await _connection.ExecuteAsync(reactivateDetailSql, detail);
                    }
                }

                var UpdateSeq = "call proc_claimhodapproval(" + obj.Header.ClaimId + "); ";
                var Result = await _connection.ExecuteAsync(UpdateSeq, obj.Header.BranchId);


                return new ResponseModel
                {
                    Data = obj.Header.ClaimId,
                    Message = obj.Header.IsSubmitted == 1 ? "Posted Successfully" : "Updated Successfully",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel
                {
                    Data = 0,
                    Message = "Something went wrong while saving claim and payment. : " + Ex.Message,
                    Status = false
                };
            }
        }


        public async Task<object> DeleteClaim(InActiveClaim obj)
        {
            try
            {
            string updateHeaderSql = @"
            UPDATE tbl_claimAndpayment_header SET isactive=0, InActiveBy = "+obj.InActiveBy+", InActiveDate = now(), InActiveIP = '" + obj.ClaimId + "'   WHERE ifnull(claim_gm_isapproved,0)=0 and Claim_ID = " + obj.ClaimId + ";";

                await _connection.ExecuteAsync(updateHeaderSql);


                var UpdateSeq = "call proc_claimhodapproval(" + obj.ClaimId + "); ";
                var Result = await _connection.ExecuteAsync(UpdateSeq, obj.ClaimId);


                return new ResponseModel
                {
                    Data = 0,
                    Message ="Deleted Successfully",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel
                {
                    Data = 0,
                    Message = "Something went wrong while deleting claim. : " + Ex.Message,
                    Status = false
                };
            }
        }

        public async Task<object> DiscussClaim(DiscussClaim obj)
        {
            try
            {
                //    string updateHeaderSql = @"
                //UPDATE tbl_claimAndpayment_header SET isdiscussionaccepted=1,isclaimant_discussed=1, claim_comment = '" + obj.Comment + "'   WHERE Claim_ID = " + obj.ClaimId + " and ifnull(isclaimant_discussed,0)=0 and ifnull(claim_gm_isdiscussed,0)=0 and ifnull(claim_gm_isapproved,0)=0;";

                string updateHeaderSql = @"
            UPDATE tbl_claimAndpayment_header SET claim_hod_isdiscussed=0,claim_gm_isdiscussed=0,issubmitted=1,claim_comment = '" + obj.Comment + "', LastModifiedBY="+obj.DiscussedBy+"   WHERE Claim_ID = " + obj.ClaimId + " and  ( ifnull(claim_hod_isdiscussed,0)=1 or ifnull(claim_gm_isdiscussed,0)=1) and ifnull(claim_gm_isapproved,0)=0 and isactive=1;";

                await _connection.ExecuteAsync(updateHeaderSql);


                var UpdateSeq = "call proc_claimhodapproval(@claimId); ";
                var Result = await _connection.ExecuteAsync(UpdateSeq, new { claimId = obj.ClaimId });

                var IsHod = "select ifnull(is_Hod_created,0) as is_Hod_created from tbl_claimAndpayment_header where Claim_Id=@claimId; ";
                var IsHod_Result = await _connection.ExecuteScalarAsync<int>(IsHod, new { claimId = obj.ClaimId });

                await _connection.ExecuteAsync(
     "CALL proc_insert_discussion(@claimid, @remarks, @userid,@level,@trans)",
     new
     {
         claimid = obj.ClaimId,
         remarks = obj.Comment,
         userid = obj.DiscussedBy,
         level = IsHod_Result==0 ? 3 : 1,
         trans = "approve"

     }
 );


                return new ResponseModel
                {
                    Data = 0,
                    Message = "Discussed Successfully",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel
                {
                    Data = 0,
                    Message = "Something went wrong while Discussing claim. : " + Ex.Message,
                    Status = false
                };
            }
        }

        public async Task<ResponseModel> UploadDO(int Id, string Path,string FileName)
        {
            int Result = 0;
            try
            {
              
                var Updatepacking = "update tbl_claimAndpayment_header set AttachmentName='"+ FileName + "',AttachmentPath='" + Path + "'  where Claim_ID=" + Id + ";";
               
                Result = await _connection.ExecuteAsync(Updatepacking);
                
                 
                return new ResponseModel()
                {
                    Data = null,
                    Message = "File Uploaded Successfully",
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
        public async Task<object> GetByIdAsync(int id,int orgid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 2);
                param.Add("@claimid", id);
                param.Add("@branchid", 1);
                param.Add("@orgid", orgid);
                param.Add("@departmentid", 0);
                param.Add("@categorytypeid", 0);
                param.Add("@currencyid", 0);
                param.Add("@user_id", 0);
                param.Add("@claimtypeid", 0);

                var result = await _connection.QueryMultipleAsync("proc_claimAndpayment", param, commandType: CommandType.StoredProcedure);

                var header = result.ReadFirstOrDefault();
                var details = result.Read().ToList();

                return new ResponseModel
                {
                    Data = new { Header = header, Details = details },
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving claim and payment by ID.",
                    Status = false
                };
            }
        }

        public async Task<object> GetAllAsync(int requesterId, int branchId,Int32 orgid, Int32 departmentid, Int32 categoryid,Int32 currencyid,Int32 user_id,Int32 claimtypeid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 1);
                param.Add("@claimid", 0);
                param.Add("@branchid", 1);
                param.Add("@orgid", orgid);
                param.Add("@departmentid", departmentid);
                param.Add("@categorytypeid", categoryid);
                 param.Add("@currencyid", currencyid);
                param.Add("@user_id", user_id);
                param.Add("@claimtypeid", claimtypeid);
                
                var list = await _connection.QueryAsync("proc_claimAndpayment", param, commandType: CommandType.StoredProcedure);

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
                    Message = "Error retrieving claims.",
                    Status = false
                };
            }
        }

        public async Task<object> GetSequencesNo(int branchId,int orgid, int userid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 3);
                param.Add("@claimid", 0);
                param.Add("@branchid", branchId);  // use passed value
                param.Add("@orgid", orgid);
                param.Add("@departmentid", 0);
                param.Add("@categorytypeid", 0);
                param.Add("@currencyid", 0);
                param.Add("@user_id", userid);
                param.Add("@claimtypeid", 0);
                var result = await _connection.QueryFirstOrDefaultAsync<object>(
                    "proc_claimAndpayment",
                    param,
                    commandType: CommandType.StoredProcedure);

                return new ResponseModel
                {
                    Data = result,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving sequence number.",
                    Status = false
                };
            }
        }

        public async Task<object> GetClaimHistory(string fromdate, string todate, int branchid, int orgid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 1);
                param.Add("@fromdate", fromdate);
                param.Add("@todate", todate);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                var result = await _connection.QueryAsync<object>("proc_claim_gmanddirector_history", param, commandType: CommandType.StoredProcedure);

                return new ResponseModel
                {
                    Data = result,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel
                {
                    Data = null,
                    Message = "Error retrieving Claim History number.",
                    Status = false
                };
            }
        }

        public async Task<object> ClaimComments(Int32 claimid,int level)
        {
            try
            {
                var UpdateSeq = "call proc_approver_replies(1,@claimid,@level); ";
                var Result = await _connection.QueryMultipleAsync(UpdateSeq, new { claimid= claimid, level= level });

              
                var details = Result.Read().ToList();
                var header = Result.ReadFirstOrDefault();
               

                return new ResponseModel
                {
                    Data = new { Header = header, Details = details },
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel
                {
                    Data = 0,
                    Message = "Something went wrong while fetching claim comments",
                    Status = false
                };
            }
        }

    }
}
