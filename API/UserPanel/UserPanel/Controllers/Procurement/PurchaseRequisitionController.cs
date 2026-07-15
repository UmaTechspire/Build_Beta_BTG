using Application.Finance.ClaimAndPayment.Update;
using Application.Procurement.Purchase_Memo.CreatePurchaseMemoItem;
using Application.Procurement.Purchase_Memo.GetAllPurchaseMemoItems;
using Application.Procurement.Purchase_Memo.GetPurchaseMemoItem;
using Application.Procurement.Purchase_Memo.GetPurchaseMemoSeqNo;
using Application.Procurement.Purchase_Memo.UpdatePurchaseMemoItem;
using Application.Procurement.Purchase_Memo.UploadDocument;
using Application.Procurement.Purchase_Requitision;
using Application.Procurement.Purchase_Requitision.CreatePurchaseRequitisionItem;
using Application.Procurement.Purchase_Requitision.GetAllPO;
using Application.Procurement.Purchase_Requitision.GetAllPurchaseRequitsionitems;
using Application.Procurement.Purchase_Requitision.GetProjectsAutoComplete;
using Application.Procurement.Purchase_Requitision.GetPRTypeAutoComplete;
using Application.Procurement.Purchase_Requitision.GetPurchaseMemoItemsList;
using Application.Procurement.Purchase_Requitision.GetPurchaseMemoList;
using Application.Procurement.Purchase_Requitision.GetPurchaseRequitisionItem;
using Application.Procurement.Purchase_Requitision.GetPurchaseRequitisionSeqNo;
using Application.Procurement.Purchase_Requitision.GetRequestorAutoComplete;
using Application.Procurement.Purchase_Requitision.GetSupplierAutoComplete;
using Application.Procurement.Purchase_Requitision.GetSupplierCurrency;
using Application.Procurement.Purchase_Requitision.RequisitionUploadDocument;
using Application.Procurement.Purchase_Requitision.UpdatePurchaseRequitisionItem;
using Application.Procurement.Purchase_Requitision.UploadDo;
using Application.Procurement.Purchase_Requitision.Cancel;
using Core.Models;
using Core.Procurement.PurchaseMemo;
using Core.Procurement.PurchaseRequisition;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;

namespace UserPanel.Controllers.Procurement
{
    [Route("api/[controller]")]
    [ApiController]
    public class PurchaseRequisitionController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IWebHostEnvironment _env;

        public PurchaseRequisitionController(IMediator mediator, IWebHostEnvironment env)
        {
            _mediator = mediator;
            _env = env;
        }




        [HttpPost("Create")]
        public async Task<IActionResult> Create([FromBody] CreatePurchaseRequitionCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("GetALL")]
        public async Task<IActionResult> GetAll(int requesterid, Int32 BranchId, Int32 SupplierId, int orgid,int PRTypeid,int userid)
        {
            var result = await _mediator.Send(new GetAllPurchaseRequisitionQuery() { requesterid = requesterid, BranchId = BranchId, SupplierId = SupplierId, orgid = orgid, PRTypeid = PRTypeid, userid= userid });
            return Ok(result);
        }

        [HttpGet("GetById")]
        public async Task<IActionResult> GetById(int prid, int branchid, int orgid)
        {
            var result = await _mediator.Send(new GetPurchaseRequitisionByIdQuery { Id = prid, branchid = branchid, orgid = orgid });

            if (result == null)
                return NotFound();

            return Ok(result);
        }


        [HttpGet("GetPurchaseRequitisionSeqNo")]
        public async Task<IActionResult> GetInvoicesSiNo(Int32 BranchId, int orgid)
        {
            var result = await _mediator.Send(new GetPurchaseRequitisionSeqNoQuery() { BranchId = BranchId, orgid = orgid });
            return Ok(result);
        }

        [HttpPut("Update")]
        public async Task<IActionResult> Update([FromBody] UpdatePurchaseRequitisionItemCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("GetRequstorAutoComplete")]
        public async Task<IActionResult> GetRequstorAutoComplete(int branchid, int orgid, string requestorname)
        {
            var result = await _mediator.Send(new GetRequestorAutoComplteQuery() { branchid = branchid, orgid = orgid, requestorname = requestorname });
            return Ok(result);
        }

        [HttpGet("GetSupplierAutoComplete")]
        public async Task<IActionResult> GetSupplierAutoComplete(int branchid, int orgid, string suppliername)
        {
            var result = await _mediator.Send(new GetSupplierAutoCompleteQuery() { branchid = branchid, orgid = orgid, suppliername = suppliername });
            return Ok(result);
        }

        [HttpGet("GetSupplierCurrency")]
        public async Task<IActionResult> GetSupplierCurrency(int supplierid, int orgid)
        {
            var result = await _mediator.Send(new GetSupplierCurrencyQuery() {supplierid = supplierid , orgid = orgid});
            return Ok(result);
        }

        [HttpGet("GetMemoList")]
        public async Task<IActionResult> GetMemoList(int branchid, int orgid,int id)
        {
            var result = await _mediator.Send(new GetPurchaseMemoListQuery() { branchid = branchid, orgid = orgid, id = id });
            return Ok(result);
        }
        [HttpGet("GetMemoItemsList")]
        public async Task<IActionResult> GetMemoItemsList(int branchid, int orgid, int memoid)
        {
            var result = await _mediator.Send(new GetPurchaseMemoItemsListQuery() { branchid = branchid, orgid = orgid , memoid = memoid });
            return Ok(result);
        }

        /// <summary>
        /// Upload a document for claim and payment.
        /// </summary>
        [HttpPost("upload-doc")]
        public async Task<IActionResult> UploadDocument(IFormFile file, [FromForm] int PRId, [FromForm] int BranchId, [FromForm] int UserId)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");
            if (PRId <= 0) return BadRequest("Invalid purchase requistion Id.");

            try
            {
                var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "UploadedFiles", "PurchaseRequisition", PRId.ToString());
                if (!Directory.Exists(uploadDir))
                {
                    Directory.CreateDirectory(uploadDir);
                }

                var filePath = Path.Combine(uploadDir, file.FileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var result = await _mediator.Send(new UploadPurchaeRequistionCommand
                {
                    Id = PRId,
                    Path = filePath,
                    UserId = UserId,
                    BranchId = BranchId,
                    filename = file.FileName
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ResponseModel
                {
                    Status = false,
                    Message = "Upload failed due to server error."
                });
            }
        }



        [HttpPost("upload-attachment")]
        public async Task<IActionResult> UploadDocument(List<IFormFile> file, [FromForm] int prid, [FromForm] int BranchId, [FromForm] int UserId)
        {
            try
            {
                if (file == null || file.Count == 0)
                    return BadRequest("No file uploaded.");

                if (prid <= 0)
                    return BadRequest("Invalid Purchase Requisition ID.");

                var attachmentList = new List<RequisitionAttachment>();

                foreach (IFormFile row in file)
                {
                    if (row == null || row.Length == 0) return BadRequest("No file uploaded.");
                    if (prid <= 0) return BadRequest("Invalid Purchase Requition.");

                    var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "UploadedFiles", "PurchaseRequisition", prid.ToString());
                    if (!Directory.Exists(uploadDir))
                    {
                        Directory.CreateDirectory(uploadDir);
                    }

                    var filePath = Path.Combine(uploadDir, row.FileName);
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await row.CopyToAsync(stream);
                    }
                    attachmentList.Add(new RequisitionAttachment { prattachId = 0, prId = prid, BranchId = BranchId, FileName = row.FileName, FilePath = uploadDir, UserId = UserId });


                }
                var result = await _mediator.Send(new RequisitionUploadDocumentCommand { attachmentList = attachmentList });


                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ResponseModel
                {
                    Status = false,
                    Message = "Upload failed due to server error."
                });
            }
        }

        [HttpPost("save-copied-attachments")]
        public async Task<IActionResult> SaveCopiedAttachments([FromBody] List<RequisitionAttachment> attachmentList)
        {
            if (attachmentList == null || attachmentList.Count == 0)
                return Ok(new ResponseModel { Status = true, Message = "No attachments to copy." });

            var result = await _mediator.Send(new RequisitionUploadDocumentCommand { attachmentList = attachmentList });
            return Ok(result);
        }


        [HttpGet("download-file")]
        public IActionResult DownloadFile([FromQuery] string file_path, Int32 file_id)
        {
            var rootPath = _env.ContentRootPath;

            file_path = file_path.TrimStart('\\', '/');


            var fullPath = Path.Combine(rootPath, file_path);

            if (!System.IO.File.Exists(fullPath))
                return NotFound("File not found.");

            var mimeType = "application/octet-stream"; // Or detect using extension
            var fileName = Path.GetFileName(fullPath);

            var fileBytes = System.IO.File.ReadAllBytes(fullPath);
            return File(fileBytes, mimeType, fileName);
        }


        [HttpGet("GetPRTypeAutoComplete")]
        public async Task<IActionResult> GetPRTypeAutoComplete(int branchid, int orgid, string prtype)
        {
            var result = await _mediator.Send(new GetPRTypeAutoCompleteQuery() { branchid = branchid, orgid = orgid, prtype = prtype });
            return Ok(result);
        }
        [HttpGet("GetProjectsAutoComplete")]
        public async Task<IActionResult> GetProjectsAutoComplete(int branchid, int orgid, string projects)
        {
            var result = await _mediator.Send(new GetProjectsAutocompleteQuery() { branchid = branchid, orgid = orgid, projects = projects });
            return Ok(result);
        }

        [HttpGet("GetSupplierSearchFilter")]
        public async Task<IActionResult> GetSupplierSearchFilter(int branchid, int orgid, string suppliername)
        {
            var result = await _mediator.Send(new GetSupplierSearchFilterQuery() { branchid = branchid, orgid = orgid, suppliername = suppliername });
            return Ok(result);
        }

        [HttpGet("GetAllPO")]
        public async Task<IActionResult> GetAllPO( int branchid, int orgid, int PRId)
        {
            var result = await _mediator.Send(new GetAllPOQuery { branchid = branchid, orgid = orgid, PRId = PRId });

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpPost("CancelPR")]
        public async Task<IActionResult> CancelPR([FromBody] CancelPurchaseRequisitionCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

    }
}
