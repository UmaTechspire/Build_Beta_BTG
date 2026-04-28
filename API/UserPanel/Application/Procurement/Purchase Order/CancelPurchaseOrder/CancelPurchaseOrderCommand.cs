using MediatR;

namespace Application.Procurement.Purchase_Order.CancelPurchaseOrder
{
    public class CancelPurchaseOrderCommand : IRequest<object>
    {
        public int poid { get; set; }
        public int userId { get; set; }
        public int branchId { get; set; }
        public int orgId { get; set; }
    }
}