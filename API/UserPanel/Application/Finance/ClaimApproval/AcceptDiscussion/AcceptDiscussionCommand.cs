using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Core.Finance.Approval;
using Core.Finance.ClaimAndPayment;
using MediatR;

namespace Application.Finance.ClaimApproval.AcceptDiscussion
{
    public class AcceptDiscussionCommand : IRequest<object>
    {
        public int userid { get; set; }
        public Int32 claimid { get; set; }
        public string Comment { get; set; }
        public int Type { get; set; }
      
        public int isclaimant { get; set; }
        public int logid { get; set; }

    }
    
}

