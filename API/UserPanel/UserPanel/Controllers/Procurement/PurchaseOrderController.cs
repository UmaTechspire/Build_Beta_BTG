using Application.Procurement.Purchase_Order.CreatePurchaseOrderItem;
using Application.Procurement.Purchase_Order.GetAllPurchaseOrderItems;
using Application.Procurement.Purchase_Order.GetPONoAutoComplete;
using Application.Procurement.Purchase_Order.GetPORequestorAutoComplte;
using Application.Procurement.Purchase_Order.GetPOSupplierAutoComplete;
using Application.Procurement.Purchase_Order.GetPurchaseOrderItem;
using Application.Procurement.Purchase_Order.GetPurchaseOrderPrint;
using Application.Procurement.Purchase_Order.GetPurchaseOrderSeqNo;
using Application.Procurement.Purchase_Order.GetPurchaseRequisitionItemsList;
using Application.Procurement.Purchase_Order.GetPurchaseRequisitionList;
using Application.Procurement.Purchase_Order.GetSupplierCurrencyList;
using Application.Procurement.Purchase_Order.UpdatePurchaseOrderItem;
using Application.Procurement.Purchase_Order.CancelPurchaseOrder;
using Application.Procurement.Purchase_Order.ShortClosurePurchaseOrder;
using Application.Procurement.Purchase_Order.GetPendingGRNQty;
using Application.Procurement.Purchase_Order.GetPurchaseOrderItemsBulk;
using Application.Procurement.Purchase_Order.GetBlanketPOApprovals;
using Application.Procurement.Purchase_Order.SaveBlanketPOApprove;
using Application.Procurement.Purchase_Requitision.GetAllPurchaseRequitsionitems;
using Application.Procurement.Purchase_Requitision.GetPurchaseMemoItemsList;
using Application.Procurement.Purchase_Requitision.GetPurchaseMemoList;
using Application.Procurement.Purchase_Requitision.GetPurchaseRequitisionItem;
using Application.Procurement.Purchase_Requitision.GetPurchaseRequitisionSeqNo;
using Application.Procurement.Purchase_Requitision.GetRequestorAutoComplete;
using Application.Procurement.Purchase_Requitision.GetSupplierAutoComplete;
using Application.Procurement.Purchase_Requitision.UpdatePurchaseRequitisionItem;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace UserPanel.Controllers.Procurement
{
    [Route("api/[controller]")]
    [ApiController]
    public class PurchaseOrderController : ControllerBase
    {
        private readonly IMediator _mediator;

        public PurchaseOrderController(IMediator mediator)
        {
            _mediator = mediator;
        }



        [HttpPost("Create")]
        public async Task<IActionResult> Create([FromBody] CreatePurchaseOrderCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("GetALL")]
        public async Task<IActionResult> GetAll(int requestorid, Int32 branchid, Int32 supplierid, int orgid, int poid,int userid)
        {
            var result = await _mediator.Send(new GetAllPurchaseOrderItemsQuery() { requestorid = requestorid, branchid = branchid, supplierid = supplierid, orgid = orgid , poid = poid,userid=userid });
            return Ok(result);
        }

        [HttpGet("GetById")]
        public async Task<IActionResult> GetById(int poid, int branchid, int orgid)
        {
            var result = await _mediator.Send(new GetPurchaseOrderByIdQuery { poid = poid, branchid = branchid, orgid = orgid });

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpPost("GetByIdsBulk")]
        public async Task<IActionResult> GetByIdsBulk([FromBody] GetPurchaseOrderItemsBulkQuery command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPut("Update")]
        public async Task<IActionResult> Update([FromBody] UpdatePurchaseOrderItemQuery command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPost("CancelPO")]
        public async Task<IActionResult> CancelPO([FromBody] CancelPurchaseOrderCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("GetPurchaseRequositionList")]
        public async Task<IActionResult> GetPurchaseRequositionList(int supplierid, int branchid, int orgid, int currencyid)
        {
            var result = await _mediator.Send(new GetPurchaseRequisitionListQuery() { supplierid= supplierid, branchid = branchid, orgid = orgid , currencyid = currencyid});
            return Ok(result);
        }
        [HttpGet("GetPurchaseRequisitionItemsList")]
        public async Task<IActionResult> GetPurchaseRequisitionItemsList(int branchid, int orgid, int prid)
        {
            var result = await _mediator.Send(new GetPurchaseRequisitionItemsListQuery() { branchid = branchid, orgid = orgid, prid = prid });
            return Ok(result);
        }

        [HttpGet("GetPORequstorAutoComplete")]
        public async Task<IActionResult> GetPORequstorAutoComplete(int branchid, int orgid, string requestorname)
        {
            var result = await _mediator.Send(new GetPORequestorAutoCompleteQuery() { branchid = branchid, orgid = orgid, requestorname = requestorname });
            return Ok(result);
        }

        [HttpGet("GetPOSupplierAutoComplete")]
        public async Task<IActionResult> GetPOSupplierAutoComplete(int branchid, int orgid, string suppliername)
        {
            var result = await _mediator.Send(new GetPOSupplierAutoCompleteQuery() { branchid = branchid, orgid = orgid, suppliername = suppliername });
            return Ok(result);
        }

        [HttpGet("GetPurchaseOrderSeqNo")]
        public async Task<IActionResult> GetByPONoSeqAsync(Int32 branchid, int orgid)
        {
            var result = await _mediator.Send(new GetPurchaseOrderSeqNoQuery() { branchid = branchid, orgid = orgid });
            return Ok(result);
        }

        [HttpGet("GetPOnoAutoComplete")]
        public async Task<IActionResult> GetPOnoAutoComplete(int branchid, int orgid, string ponumber)
        {
            var result = await _mediator.Send(new GetPONoAutoCompleteQuery() { branchid = branchid, orgid = orgid, ponumber = ponumber });
            return Ok(result);
        }

        [HttpGet("GetPurchaseOrderPrint")]
        public async Task<IActionResult> GetPurchaseorderPrint(int opt, int poid, int branchid, int orgid)
        {
            var result = await _mediator.Send(new GetPurchaseOrderPrintQuery() { opt = opt, poid = poid, branchid = branchid, orgid = orgid });
            return Ok(result);
        }

        [HttpGet("GetSupplierCurrencyList")]
        public async Task<IActionResult> GetSupplierCurrencyList(int supplierid, int branchid, int orgid)
        {
            var result = await _mediator.Send(new GetSupplierCurrencyListCommand() { supplierid = supplierid, branchid = branchid, orgid = orgid });
            return Ok(result);
        }

        [HttpPost("ShortClosurePO")]
        public async Task<IActionResult> ShortClosurePO([FromBody] ShortClosurePurchaseOrderCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("GetPendingGRNQty")]
        public async Task<IActionResult> GetPendingGRNQty(int poid)
        {
            var result = await _mediator.Send(new GetPendingGRNQtyQuery() { poid = poid });
            return Ok(result);
        }

        [HttpGet("GetBlanketPOApprovals")]
        public async Task<IActionResult> GetBlanketPOApprovals(int branchid, int orgid, int userid)
        {
            var result = await _mediator.Send(new GetBlanketPOApprovalsQuery() { branchid = branchid, orgid = orgid, userid = userid });
            return Ok(result);
        }

        [HttpPost("SaveBlanketPOApprove")]
        public async Task<IActionResult> SaveBlanketPOApprove([FromBody] SaveBlanketPOApproveCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }


    }
}
