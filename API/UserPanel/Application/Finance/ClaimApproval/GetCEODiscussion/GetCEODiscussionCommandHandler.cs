using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Finance.ClaimApproval.GetAll;
using Core.Finance.Approval;
using MediatR;

namespace Application.Finance.ClaimApproval.GetCEODiscussion
{
    public class GetCEODiscussionCommandHandler : IRequestHandler<GetCEODiscussionCommand, object>
    {
        private readonly IClaimApprovalRepository _repository;

        public GetCEODiscussionCommandHandler(IClaimApprovalRepository repository)
        {
            _repository = repository;
        }

        public async Task<object> Handle(GetCEODiscussionCommand command, CancellationToken cancellationToken)
        {
            return await _repository.GetCEODiscussionList(command.userid, command.BranchId, command.OrgId);
        }
    }
}
