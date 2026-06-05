using Core.Procurement.PurchaseOrder;
using MediatR;
using System.Threading;
using System.Threading.Tasks;

namespace Application.Procurement.Purchase_Order.GetPurchaseOrderItemsBulk
{
    public class GetPurchaseOrderItemsBulkQueryHandler : IRequestHandler<GetPurchaseOrderItemsBulkQuery, object>
    {
        private readonly IPurchaseOrderRepository _repository;

        public GetPurchaseOrderItemsBulkQueryHandler(IPurchaseOrderRepository repository)
        {
            _repository = repository;
        }

        public async Task<object> Handle(GetPurchaseOrderItemsBulkQuery query, CancellationToken cancellationToken)
        {
            var Result = await _repository.GetByIdsBulkAsync(query.poids, query.branchid, query.orgid);
            return Result;
        }
    }
}
