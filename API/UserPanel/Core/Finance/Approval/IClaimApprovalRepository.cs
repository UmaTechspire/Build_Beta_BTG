using Core.Finance.PaymentPlan;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Finance.Approval
{
    public interface IClaimApprovalRepository
    {
        Task<object> ApproveAsync(ClaimApprovalHdr obj);
        Task<object> GetHistoryAsync(int id, int userid, int branchId, Int32 orgid,string fromdate,string todate);
        Task<object> GetAllAsync(int Id, int branchId, Int32 orgid, int userid);
        Task<object> GetAllAsync(int bankId, Int32 MODId, int SupplierId, int ApplicantId, int userid,int isDirector, int PVPaymentId);
        Task<object> GetAllPaymentPlanAsync(int Id, int branchId, Int32 orgid, int userid);
        Task<object> SavePaymentPlanAsync(PaymentPlanHdr obj);
        Task<object> RejectClaims(RejectDetails claims);
        Task<object> GetPaymentSummarySeqNoAsync(int userid, int branchId, Int32 orgid);
        Task<object> GetRemarksList(int claimid);
        Task<object> GetDiscussionList(int userid, int branchId, Int32 orgid);
        Task<object> AcceptDiscussion(int claimid, string Comment, int Type, int isclaimant,int userid, int logid = 0);
        Task<object> PPPApproveAsync(PPPApproval obj);
        Task<object> Getcommenthistory(int claimid);
    }
}
