using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Application.Finance.ClaimApproval.GetAll
{
    public class GetCEODiscussionCommand : IRequest<object>
    {
        public int Opt { get; set; }
        public int id { get; set; }
        public int userid { get; set; }
        public int OrgId { get; set; }
        public Int32 BranchId { get; set; }
        public Int32 BankId { get; set; }
        public Int32 SupplierId { get; set; }
        public Int32 ApplicantId { get; set; }
        public Int32 MODId { get; set; }
        public int isDirector { get; set; }
        public int PVPaymentId { get; set; }

    }
}
