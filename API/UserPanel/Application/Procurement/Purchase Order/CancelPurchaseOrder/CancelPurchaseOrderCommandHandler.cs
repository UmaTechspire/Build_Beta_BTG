using Core.Procurement.PurchaseOrder;
using MediatR;

namespace Application.Procurement.Purchase_Order.CancelPurchaseOrder
{
    public class CancelPurchaseOrderCommandHandler : IRequestHandler<CancelPurchaseOrderCommand, object>
    {
        private readonly IPurchaseOrderRepository _repository;

        public CancelPurchaseOrderCommandHandler(IPurchaseOrderRepository repository)
        {
            _repository = repository;
        }

        public async Task<object> Handle(CancelPurchaseOrderCommand command, CancellationToken cancellationToken)
        {
            var result = await _repository.CancelPOAsync(command.poid, command.userId, command.branchId, command.orgId);
            return result;
        }
    }
}
