using Application.Finance.ClaimApproval.AcceptDiscussion;
using Application.Finance.ClaimApproval.Approval;
using Application.Finance.ClaimApproval.Reject;
using Core.Abstractions;
using Core.Finance.Approval;
using Core.Finance.ClaimAndPayment;
using MediatR;

namespace Application.Finance.ClaimAndPayment.AcceptDiscussion
{
    public class AcceptDiscussionCommandHandler : IRequestHandler<AcceptDiscussionCommand, object>
    {
        private readonly IClaimApprovalRepository _repository;
        private readonly IUnitOfWorkDB3 financedb;


        public AcceptDiscussionCommandHandler(IClaimApprovalRepository repository, IUnitOfWorkDB3 _financedb)
        {
            _repository = repository;
            financedb = _financedb;
        }

        public async Task<object> Handle(AcceptDiscussionCommand command, CancellationToken cancellationToken)
        {
 
            var data = await _repository.AcceptDiscussion(command.claimid,command.Comment,command.Type,command.isclaimant,command.userid,command.logid);
            financedb.Commit();
            return data;
        }
    }
}

