using Application.Finance.ClaimAndPayment.Create;
using Application.Finance.ClaimAndPayment.GetSequencesNumber;
using Application.Finance.ClaimAndPayment.Remarks;
using Application.Finance.ClaimApproval.AcceptDiscussion;
using Application.Finance.ClaimApproval.Approval;
using Application.Finance.ClaimApproval.AutoApproval;
using Application.Finance.ClaimApproval.GetAll;
using Application.Finance.ClaimApproval.GetHistory;
using Application.Finance.ClaimApproval.GetPVHistory;
using Application.Finance.ClaimApproval.Reject;
using Application.Finance.ClaimApproval.Remarks;
using Application.Finance.ClaimApproval.SeqNo;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace UserPanel.Controllers.Finance
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClaimApprovalController : ControllerBase
    {
        private readonly IMediator _mediator;

        public ClaimApprovalController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Approve claim and payment.
        /// </summary>
        [HttpPost("Approve")]
        public async Task<IActionResult> Approve([FromBody] ApproveClaimCommand command)
        {
            if (command == null) return BadRequest("Invalid payload.");
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        /// <summary>
        /// Approve claim and payment.
        /// </summary>
        [HttpPost("AutoApprove")]
        public async Task<IActionResult> AutoApprove([FromBody] AutoApprovalClaimCommand command)
        {
            if (command == null) return BadRequest("Invalid payload.");
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        [HttpGet("GetRemarksHistory")]
        public async Task<IActionResult> GetRemarksHistory(Int32 claimid)
        {
            var result = await _mediator.Send(new RemarksClaimCommand() { claimid = claimid  });
            return Ok(result);
        }

        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAll(Int32 Id,Int32 UserId, Int32 BranchId, Int32 orgid)
        {
            var result = await _mediator.Send(new GetAllApproveCommand() {Opt=1, BranchId = BranchId, OrgId = orgid,id=Id,userid=UserId });
            return Ok(result);
        }
        [HttpGet("GetSorAByIdClaim")]
        public async Task<IActionResult> GetBySupplierOrApplicant(Int32 SupId, Int32 BankId, Int32 MODId, Int32 ApplId, Int32 UserId,int isDirector,int PVPaymentId)
        {
            var result = await _mediator.Send(new GetAllApproveCommand() { Opt = 2, BankId = BankId, SupplierId = SupId, MODId = MODId, userid = UserId ,ApplicantId=ApplId, isDirector = isDirector, PVPaymentId= PVPaymentId });
            return Ok(result);
        }

        [HttpGet("GetHistory")]
        public async Task<IActionResult> GetHistory(Int32 Id, Int32 UserId, Int32 BranchId, Int32 orgid,string fromdate,string todate)
        {
            var result = await _mediator.Send(new GetHistoryApproveCommand() { BranchId = BranchId, OrgId = orgid, id = Id, userid = UserId,fromdate=fromdate,todate=todate  });
            return Ok(result);
        }

        /// <summary>
        /// Approve claim and payment.
        /// </summary>
        [HttpPost("Reject")]
        public async Task<IActionResult> Reject([FromBody] RejectClaimCommand command)
        {
            if (command == null) return BadRequest("Invalid payload.");
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("GetSeqNo")]
        public async Task<IActionResult> GetSeqNo( Int32 UserId, Int32 BranchId, Int32 orgid)
        {
            var result = await _mediator.Send(new PaymentSummarySeqCommand() { branchId = BranchId, orgid = orgid, userid = UserId});
            return Ok(result);
        }
        [HttpGet("GetDiscussion")]
        public async Task<IActionResult> GetDiscussion(Int32 UserId, Int32 BranchId, Int32 orgid)
        {
            var result = await _mediator.Send(new GetDiscussionCommand() { BranchId = BranchId, OrgId = orgid, userid = UserId });
            return Ok(result);
        }
        [HttpPut("AcceptDiscussion")]
        public async Task<IActionResult> AcceptDiscussion(Int32 ClaimId,string Comment, int Type, int isclaimant,int userid, int logid = 0)
        {
            var result = await _mediator.Send(new AcceptDiscussionCommand() { userid= userid, claimid = ClaimId,Comment= Comment, Type=Type, isclaimant= isclaimant, logid = logid });
            return Ok(result);
        }

        [HttpGet("GetPVHistory")]
        public async Task<IActionResult> GetPVHistory(Int32 SummaryId,   Int32 BranchId, Int32 orgid)
        {
            var result = await _mediator.Send(new GetPVHistoryApproveCommand() { BranchId = BranchId, OrgId = orgid, id = SummaryId });
            return Ok(result);
        }
    }
}
