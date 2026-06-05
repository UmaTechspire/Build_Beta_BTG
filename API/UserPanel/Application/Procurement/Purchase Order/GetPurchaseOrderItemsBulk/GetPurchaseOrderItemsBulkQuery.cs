using MediatR;
using System.Collections.Generic;

namespace Application.Procurement.Purchase_Order.GetPurchaseOrderItemsBulk
{
    public class GetPurchaseOrderItemsBulkQuery : IRequest<object>
    {
        public List<int> poids { get; set; }
        public int branchid { get; set; }
        public int orgid { get; set; }
    }
}
