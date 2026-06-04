using BackEnd.Procurement.DNCN;
using Core.Abstractions;
using Core.Models;
using Core.Procurement.DNCN;
using Dapper;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace Infrastructure.Repositories
{
    public class ProcurementDNCNRepository : IProcurementDNCNRepository
    {
        private readonly IDbConnection _connection;

        public ProcurementDNCNRepository(IUnitOfWorkDB3 unitOfWork)
        {
            _connection = unitOfWork.Connection;
        }

        public async Task<object> GetAllCreditNotes()
        {
            try
            {
                var list = await _connection.QueryAsync(ProcurementDNCNBackEnd.proc_SupplierDNCN_GetAllCN, commandType: CommandType.StoredProcedure);
                var listObjects = list.Select(x => (IDictionary<string, object>)x).ToList();
                if (listObjects.Any())
                {
                    var invoiceMappings = await _connection.QueryAsync<(int CreditNoteId, string InvoiceNo)>(
                        "SELECT CreditNoteId, InvoiceNo FROM btggasify_finance_live.credit_invoice;");
                    var mappingDict = invoiceMappings.ToDictionary(m => m.CreditNoteId, m => m.InvoiceNo);
                    foreach (var row in listObjects)
                    {
                        if (row.TryGetValue("CreditNoteId", out var idObj) && idObj != null && int.TryParse(idObj.ToString(), out int cnId))
                        {
                            row["InvoiceNo"] = mappingDict.TryGetValue(cnId, out var invNo) ? invNo : null;
                        }
                    }
                }
                return new ResponseModel()
                {
                    Data = listObjects,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception)
            {
                try
                {
                    var fallbackQuery = @"
                        SELECT cn.*, mc.CurrencyCode, s.SupplierName, ci.InvoiceNo, i.itemname AS GasName, uom.UOM AS UOM
                        FROM btggasify_finance_live.Credit_Notes cn
                        LEFT JOIN btggasify_live.master_currency mc ON cn.CurrencyId = mc.CurrencyId
                        LEFT JOIN btggasify_masterpanel_live.master_supplier s ON cn.SupplierId = s.SupplierId
                        LEFT JOIN btggasify_finance_live.credit_invoice ci ON cn.CreditNoteId = ci.CreditNoteId
                        LEFT JOIN btggasify_masterpanel_live.master_item i ON cn.GasCodeId = i.itemid
                        LEFT JOIN btggasify_live.master_uom uom ON cn.UomId = uom.Id
                        WHERE cn.SupplierId IS NOT NULL AND cn.SupplierId > 0
                        ORDER BY cn.CreditNoteId DESC;";
                    
                    var list = await _connection.QueryAsync(fallbackQuery);
                    return new ResponseModel()
                    {
                        Data = list.ToList(),
                        Message = "Success (Direct SQL)",
                        Status = true
                    };
                }
                catch (Exception fallbackEx)
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = fallbackEx.Message,
                        Status = false
                    };
                }
            }
        }

        public async Task<object> GetAllDebitNotes()
        {
            try
            {
                var list = await _connection.QueryAsync(ProcurementDNCNBackEnd.proc_SupplierDNCN_GetAllDN, commandType: CommandType.StoredProcedure);
                var listObjects = list.Select(x => (IDictionary<string, object>)x).ToList();
                if (listObjects.Any())
                {
                    var invoiceMappings = await _connection.QueryAsync<(int DebitNoteId, string InvoiceNo)>(
                        "SELECT DebitNoteId, InvoiceNo FROM btggasify_finance_live.debit_invoice;");
                    var mappingDict = invoiceMappings.ToDictionary(m => m.DebitNoteId, m => m.InvoiceNo);
                    foreach (var row in listObjects)
                    {
                        if (row.TryGetValue("DebitNoteId", out var idObj) && idObj != null && int.TryParse(idObj.ToString(), out int dnId))
                        {
                            row["InvoiceNo"] = mappingDict.TryGetValue(dnId, out var invNo) ? invNo : null;
                        }
                    }
                }
                return new ResponseModel()
                {
                    Data = listObjects,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception)
            {
                try
                {
                    var fallbackQuery = @"
                        SELECT dn.*, mc.CurrencyCode, s.SupplierName, di.InvoiceNo, i.itemname AS GasName, uom.UOM AS UOM
                        FROM btggasify_finance_live.Debit_Notes dn
                        LEFT JOIN btggasify_live.master_currency mc ON dn.CurrencyId = mc.CurrencyId
                        LEFT JOIN btggasify_masterpanel_live.master_supplier s ON dn.SupplierId = s.SupplierId
                        LEFT JOIN btggasify_finance_live.debit_invoice di ON dn.DebitNoteId = di.DebitNoteId
                        LEFT JOIN btggasify_masterpanel_live.master_item i ON dn.GasCodeId = i.itemid
                        LEFT JOIN btggasify_live.master_uom uom ON dn.UomId = uom.Id
                        WHERE dn.SupplierId IS NOT NULL AND dn.SupplierId > 0
                        ORDER BY dn.DebitNoteId DESC;";
                    
                    var list = await _connection.QueryAsync(fallbackQuery);
                    return new ResponseModel()
                    {
                        Data = list.ToList(),
                        Message = "Success (Direct SQL)",
                        Status = true
                    };
                }
                catch (Exception fallbackEx)
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = fallbackEx.Message,
                        Status = false
                    };
                }
            }
        }

        public async Task<object> GetCreditNoteById(int id)
        {
            try
            {
                var row = await _connection.QueryFirstOrDefaultAsync(ProcurementDNCNBackEnd.proc_SupplierDNCN_GetCNById, new { p_id = id }, commandType: CommandType.StoredProcedure);
                if (row != null)
                {
                    var invoiceNo = await _connection.QueryFirstOrDefaultAsync<string>(
                        "SELECT InvoiceNo FROM btggasify_finance_live.credit_invoice WHERE CreditNoteId = @Id LIMIT 1;", new { Id = id });
                    
                    int? invoiceHdrId = null;
                    if (!string.IsNullOrEmpty(invoiceNo))
                    {
                        invoiceHdrId = await _connection.QueryFirstOrDefaultAsync<int?>(
                            "SELECT receiptnote_hdr_id FROM btggasify_purchase_live.tbl_IRNReceipt_detail WHERE (receiptno = @InvoiceNo OR docno = @InvoiceNo) AND isactive = 1 LIMIT 1;",
                            new { InvoiceNo = invoiceNo });
                    }

                    var dict = (IDictionary<string, object>)row;
                    dict["InvoiceNo"] = invoiceNo;
                    dict["InvoiceHdrId"] = invoiceHdrId;

                    if (!dict.ContainsKey("GasName") || dict["GasName"] == null)
                    {
                        if (dict.TryGetValue("GasCodeId", out var gasId) && gasId != null)
                        {
                            var gasName = await _connection.QueryFirstOrDefaultAsync<string>(
                                "SELECT itemname FROM btggasify_masterpanel_live.master_item WHERE itemid = @Id LIMIT 1;", new { Id = gasId });
                            dict["GasName"] = gasName;
                        }
                    }
                    if (!dict.ContainsKey("UOM") || dict["UOM"] == null)
                    {
                        if (dict.TryGetValue("UomId", out var uomId) && uomId != null)
                        {
                            var uomName = await _connection.QueryFirstOrDefaultAsync<string>(
                                "SELECT UOM FROM btggasify_live.master_uom WHERE Id = @Id LIMIT 1;", new { Id = uomId });
                            dict["UOM"] = uomName;
                        }
                    }

                    return new ResponseModel()
                    {
                        Data = row,
                        Message = "Success",
                        Status = true
                    };
                }
                throw new Exception("Credit Note not found");
            }
            catch (Exception)
            {
                try
                {
                    var fallbackQuery = @"
                        SELECT cn.*, mc.CurrencyCode, s.SupplierName, i.itemname AS GasName, uom.UOM AS UOM, irn.receiptnote_hdr_id AS InvoiceHdrId
                        FROM btggasify_finance_live.Credit_Notes cn
                        LEFT JOIN btggasify_live.master_currency mc ON cn.CurrencyId = mc.CurrencyId
                        LEFT JOIN btggasify_masterpanel_live.master_supplier s ON cn.SupplierId = s.SupplierId
                        LEFT JOIN btggasify_finance_live.credit_invoice ci ON cn.CreditNoteId = ci.CreditNoteId
                        LEFT JOIN btggasify_purchase_live.tbl_IRNReceipt_detail irn ON (ci.InvoiceNo = irn.receiptno OR ci.InvoiceNo = irn.docno) AND irn.isactive = 1
                        LEFT JOIN btggasify_masterpanel_live.master_item i ON cn.GasCodeId = i.itemid
                        LEFT JOIN btggasify_live.master_uom uom ON cn.UomId = uom.Id
                        WHERE cn.CreditNoteId = @Id LIMIT 1;";
                    
                    var row = await _connection.QueryFirstOrDefaultAsync(fallbackQuery, new { Id = id });
                    if (row != null)
                    {
                        var invoiceNo = await _connection.QueryFirstOrDefaultAsync<string>(
                            "SELECT InvoiceNo FROM btggasify_finance_live.credit_invoice WHERE CreditNoteId = @Id LIMIT 1;", new { Id = id });
                        
                        var dict = (IDictionary<string, object>)row;
                        dict["InvoiceNo"] = invoiceNo;

                        return new ResponseModel()
                        {
                            Data = row,
                            Message = "Success (Direct SQL)",
                            Status = true
                        };
                    }
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = "Credit Note not found",
                        Status = false
                    };
                }
                catch (Exception fallbackEx)
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = fallbackEx.Message,
                        Status = false
                    };
                }
            }
        }

        public async Task<object> GetDebitNoteById(int id)
        {
            try
            {
                var row = await _connection.QueryFirstOrDefaultAsync(ProcurementDNCNBackEnd.proc_SupplierDNCN_GetDNById, new { p_id = id }, commandType: CommandType.StoredProcedure);
                if (row != null)
                {
                    var invoiceNo = await _connection.QueryFirstOrDefaultAsync<string>(
                        "SELECT InvoiceNo FROM btggasify_finance_live.debit_invoice WHERE DebitNoteId = @Id LIMIT 1;", new { Id = id });
                    
                    int? invoiceHdrId = null;
                    if (!string.IsNullOrEmpty(invoiceNo))
                    {
                        invoiceHdrId = await _connection.QueryFirstOrDefaultAsync<int?>(
                            "SELECT receiptnote_hdr_id FROM btggasify_purchase_live.tbl_IRNReceipt_detail WHERE (receiptno = @InvoiceNo OR docno = @InvoiceNo) AND isactive = 1 LIMIT 1;",
                            new { InvoiceNo = invoiceNo });
                    }

                    var dict = (IDictionary<string, object>)row;
                    dict["InvoiceNo"] = invoiceNo;
                    dict["InvoiceHdrId"] = invoiceHdrId;

                    if (!dict.ContainsKey("GasName") || dict["GasName"] == null)
                    {
                        if (dict.TryGetValue("GasCodeId", out var gasId) && gasId != null)
                        {
                            var gasName = await _connection.QueryFirstOrDefaultAsync<string>(
                                "SELECT itemname FROM btggasify_masterpanel_live.master_item WHERE itemid = @Id LIMIT 1;", new { Id = gasId });
                            dict["GasName"] = gasName;
                        }
                    }
                    if (!dict.ContainsKey("UOM") || dict["UOM"] == null)
                    {
                        if (dict.TryGetValue("UomId", out var uomId) && uomId != null)
                        {
                            var uomName = await _connection.QueryFirstOrDefaultAsync<string>(
                                "SELECT UOM FROM btggasify_live.master_uom WHERE Id = @Id LIMIT 1;", new { Id = uomId });
                            dict["UOM"] = uomName;
                        }
                    }

                    return new ResponseModel()
                    {
                        Data = row,
                        Message = "Success",
                        Status = true
                    };
                }
                throw new Exception("Debit Note not found");
            }
            catch (Exception)
            {
                try
                {
                    var fallbackQuery = @"
                        SELECT dn.*, mc.CurrencyCode, s.SupplierName, i.itemname AS GasName, uom.UOM AS UOM, irn.receiptnote_hdr_id AS InvoiceHdrId
                        FROM btggasify_finance_live.Debit_Notes dn
                        LEFT JOIN btggasify_live.master_currency mc ON dn.CurrencyId = mc.CurrencyId
                        LEFT JOIN btggasify_masterpanel_live.master_supplier s ON dn.SupplierId = s.SupplierId
                        LEFT JOIN btggasify_finance_live.debit_invoice di ON dn.DebitNoteId = di.DebitNoteId
                        LEFT JOIN btggasify_purchase_live.tbl_IRNReceipt_detail irn ON (di.InvoiceNo = irn.receiptno OR di.InvoiceNo = irn.docno) AND irn.isactive = 1
                        LEFT JOIN btggasify_masterpanel_live.master_item i ON dn.GasCodeId = i.itemid
                        LEFT JOIN btggasify_live.master_uom uom ON dn.UomId = uom.Id
                        WHERE dn.DebitNoteId = @Id LIMIT 1;";
                    
                    var row = await _connection.QueryFirstOrDefaultAsync(fallbackQuery, new { Id = id });
                    if (row != null)
                    {
                        var invoiceNo = await _connection.QueryFirstOrDefaultAsync<string>(
                            "SELECT InvoiceNo FROM btggasify_finance_live.debit_invoice WHERE DebitNoteId = @Id LIMIT 1;", new { Id = id });
                        
                        var dict = (IDictionary<string, object>)row;
                        dict["InvoiceNo"] = invoiceNo;

                        return new ResponseModel()
                        {
                            Data = row,
                            Message = "Success (Direct SQL)",
                            Status = true
                        };
                    }
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = "Debit Note not found",
                        Status = false
                    };
                }
                catch (Exception fallbackEx)
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = fallbackEx.Message,
                        Status = false
                    };
                }
            }
        }

        public async Task<object> CreateCreditNote(SupplierCreditNote note)
        {
            try
            {
                var queryInsertNote = @"
                    INSERT INTO btggasify_finance_live.Credit_Notes (
                        CreditNoteNumber, TransactionDate, Amount, Description, SupplierId, CurrencyId, IsSubmitted, CreatedDate, GasCodeId, Qty, UomId
                    ) VALUES (
                        @CreditNoteNo, @Date, @CreditAmount, @Description, @SupplierId, @CurrencyId, @IsSubmitted, NOW(), @GasCodeId, @Qty, @UomId
                    );
                    SELECT LAST_INSERT_ID();";

                var noteId = await _connection.ExecuteScalarAsync<int>(queryInsertNote, note);
                note.CreditNoteId = noteId;

                if (!string.IsNullOrEmpty(note.InvoiceNo))
                {
                    var queryInsertInv = @"
                        INSERT INTO btggasify_finance_live.credit_invoice (
                            CreditNoteId, InvoiceNo
                        ) VALUES (
                            @CreditNoteId, @InvoiceNo
                        );";
                    await _connection.ExecuteAsync(queryInsertInv, new { CreditNoteId = noteId, InvoiceNo = note.InvoiceNo });

                    if (note.IsSubmitted == true)
                    {
                        var updateApQuery = @"
                            UPDATE btggasify_finance_live.tbl_accounts_payable 
                            SET balance_amount = balance_amount - @Amount
                            WHERE vendor_invoice_no = @InvoiceNo AND vendor_id = @SupplierId;";
                        await _connection.ExecuteAsync(updateApQuery, new { Amount = note.CreditAmount, InvoiceNo = note.InvoiceNo, SupplierId = note.SupplierId });

                        var updateIrnQuery = @"
                            UPDATE btggasify_purchase_live.tbl_IRNReceipt_detail 
                            SET balancepaymentamount = balancepaymentamount - @Amount
                            WHERE (receiptno = @InvoiceNo OR docno = @InvoiceNo) AND supplier_id = @SupplierId;";
                        await _connection.ExecuteAsync(updateIrnQuery, new { Amount = note.CreditAmount, InvoiceNo = note.InvoiceNo, SupplierId = note.SupplierId });
                    }
                }

                return new ResponseModel()
                {
                    Data = note,
                    Message = "Credit Note created successfully",
                    Status = true
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = ex.Message,
                    Status = false
                };
            }
        }

        public async Task<object> CreateDebitNote(SupplierDebitNote note)
        {
            try
            {
                var queryInsertNote = @"
                    INSERT INTO btggasify_finance_live.Debit_Notes (
                        DebitNoteNumber, TransactionDate, Amount, Description, SupplierId, CurrencyId, IsSubmitted, CreatedDate, PaidAmount, GasCodeId, Qty, UomId
                    ) VALUES (
                        @DebitNoteNo, @Date, @DebitAmount, @Description, @SupplierId, @CurrencyId, @IsSubmitted, NOW(), 0.00, @GasCodeId, @Qty, @UomId
                    );
                    SELECT LAST_INSERT_ID();";

                var noteId = await _connection.ExecuteScalarAsync<int>(queryInsertNote, note);
                note.DebitNoteId = noteId;

                if (!string.IsNullOrEmpty(note.InvoiceNo))
                {
                    var queryInsertInv = @"
                        INSERT INTO btggasify_finance_live.debit_invoice (
                            DebitNoteId, InvoiceNo
                        ) VALUES (
                            @DebitNoteId, @InvoiceNo
                        );";
                    await _connection.ExecuteAsync(queryInsertInv, new { DebitNoteId = noteId, InvoiceNo = note.InvoiceNo });

                    if (note.IsSubmitted == true)
                    {
                        var updateApQuery = @"
                            UPDATE btggasify_finance_live.tbl_accounts_payable 
                            SET balance_amount = balance_amount - @Amount
                            WHERE vendor_invoice_no = @InvoiceNo AND vendor_id = @SupplierId;";
                        await _connection.ExecuteAsync(updateApQuery, new { Amount = note.DebitAmount, InvoiceNo = note.InvoiceNo, SupplierId = note.SupplierId });

                        var updateIrnQuery = @"
                            UPDATE btggasify_purchase_live.tbl_IRNReceipt_detail 
                            SET balancepaymentamount = balancepaymentamount - @Amount
                            WHERE (receiptno = @InvoiceNo OR docno = @InvoiceNo) AND supplier_id = @SupplierId;";
                        await _connection.ExecuteAsync(updateIrnQuery, new { Amount = note.DebitAmount, InvoiceNo = note.InvoiceNo, SupplierId = note.SupplierId });
                    }
                }

                return new ResponseModel()
                {
                    Data = note,
                    Message = "Debit Note created successfully",
                    Status = true
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = ex.Message,
                    Status = false
                };
            }
        }

        public async Task<object> UpdateCreditNote(SupplierCreditNote note)
        {
            try
            {
                // Fetch old note details to reverse previous balance impact
                var oldNote = await _connection.QueryFirstOrDefaultAsync<dynamic>(
                    "SELECT IsSubmitted, Amount, SupplierId FROM btggasify_finance_live.Credit_Notes WHERE CreditNoteId = @Id;", 
                    new { Id = note.CreditNoteId });
                var oldInvoice = await _connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT InvoiceNo FROM btggasify_finance_live.credit_invoice WHERE CreditNoteId = @Id LIMIT 1;", 
                    new { Id = note.CreditNoteId });

                if (oldNote != null && oldNote.IsSubmitted == true && !string.IsNullOrEmpty(oldInvoice))
                {
                    decimal oldAmt = oldNote.Amount;
                    int oldSupplierId = oldNote.SupplierId;

                    var reverseApQuery = @"
                        UPDATE btggasify_finance_live.tbl_accounts_payable 
                        SET balance_amount = balance_amount + @Amount
                        WHERE vendor_invoice_no = @InvoiceNo AND vendor_id = @SupplierId;";
                    await _connection.ExecuteAsync(reverseApQuery, new { Amount = oldAmt, InvoiceNo = oldInvoice, SupplierId = oldSupplierId });

                    var reverseIrnQuery = @"
                        UPDATE btggasify_purchase_live.tbl_IRNReceipt_detail 
                        SET balancepaymentamount = balancepaymentamount + @Amount
                        WHERE (receiptno = @InvoiceNo OR docno = @InvoiceNo) AND supplier_id = @SupplierId;";
                    await _connection.ExecuteAsync(reverseIrnQuery, new { Amount = oldAmt, InvoiceNo = oldInvoice, SupplierId = oldSupplierId });
                }

                var queryUpdateNote = @"
                    UPDATE btggasify_finance_live.Credit_Notes SET 
                        CreditNoteNumber = @CreditNoteNo,
                        TransactionDate = @Date,
                        Amount = @CreditAmount,
                        Description = @Description,
                        SupplierId = @SupplierId,
                        CurrencyId = @CurrencyId,
                        IsSubmitted = @IsSubmitted,
                        GasCodeId = @GasCodeId,
                        Qty = @Qty,
                        UomId = @UomId
                    WHERE CreditNoteId = @CreditNoteId;";

                await _connection.ExecuteAsync(queryUpdateNote, note);

                var queryDeleteInv = "DELETE FROM btggasify_finance_live.credit_invoice WHERE CreditNoteId = @CreditNoteId;";
                await _connection.ExecuteAsync(queryDeleteInv, new { CreditNoteId = note.CreditNoteId });

                if (!string.IsNullOrEmpty(note.InvoiceNo))
                {
                    var queryInsertInv = @"
                        INSERT INTO btggasify_finance_live.credit_invoice (
                            CreditNoteId, InvoiceNo
                        ) VALUES (
                            @CreditNoteId, @InvoiceNo
                        );";
                    await _connection.ExecuteAsync(queryInsertInv, new { CreditNoteId = note.CreditNoteId, InvoiceNo = note.InvoiceNo });

                    if (note.IsSubmitted == true)
                    {
                        var updateApQuery = @"
                            UPDATE btggasify_finance_live.tbl_accounts_payable 
                            SET balance_amount = balance_amount - @Amount
                            WHERE vendor_invoice_no = @InvoiceNo AND vendor_id = @SupplierId;";
                        await _connection.ExecuteAsync(updateApQuery, new { Amount = note.CreditAmount, InvoiceNo = note.InvoiceNo, SupplierId = note.SupplierId });

                        var updateIrnQuery = @"
                            UPDATE btggasify_purchase_live.tbl_IRNReceipt_detail 
                            SET balancepaymentamount = balancepaymentamount - @Amount
                            WHERE (receiptno = @InvoiceNo OR docno = @InvoiceNo) AND supplier_id = @SupplierId;";
                        await _connection.ExecuteAsync(updateIrnQuery, new { Amount = note.CreditAmount, InvoiceNo = note.InvoiceNo, SupplierId = note.SupplierId });
                    }
                }

                return new ResponseModel()
                {
                    Data = note,
                    Message = "Credit Note updated successfully",
                    Status = true
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = ex.Message,
                    Status = false
                };
            }
        }

        public async Task<object> UpdateDebitNote(SupplierDebitNote note)
        {
            try
            {
                // Fetch old note details to reverse previous balance impact
                var oldNote = await _connection.QueryFirstOrDefaultAsync<dynamic>(
                    "SELECT IsSubmitted, Amount, SupplierId FROM btggasify_finance_live.Debit_Notes WHERE DebitNoteId = @Id;", 
                    new { Id = note.DebitNoteId });
                var oldInvoice = await _connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT InvoiceNo FROM btggasify_finance_live.debit_invoice WHERE DebitNoteId = @Id LIMIT 1;", 
                    new { Id = note.DebitNoteId });

                if (oldNote != null && oldNote.IsSubmitted == true && !string.IsNullOrEmpty(oldInvoice))
                {
                    decimal oldAmt = oldNote.Amount;
                    int oldSupplierId = oldNote.SupplierId;

                    var reverseApQuery = @"
                        UPDATE btggasify_finance_live.tbl_accounts_payable 
                        SET balance_amount = balance_amount + @Amount
                        WHERE vendor_invoice_no = @InvoiceNo AND vendor_id = @SupplierId;";
                    await _connection.ExecuteAsync(reverseApQuery, new { Amount = oldAmt, InvoiceNo = oldInvoice, SupplierId = oldSupplierId });

                    var reverseIrnQuery = @"
                        UPDATE btggasify_purchase_live.tbl_IRNReceipt_detail 
                        SET balancepaymentamount = balancepaymentamount + @Amount
                        WHERE (receiptno = @InvoiceNo OR docno = @InvoiceNo) AND supplier_id = @SupplierId;";
                    await _connection.ExecuteAsync(reverseIrnQuery, new { Amount = oldAmt, InvoiceNo = oldInvoice, SupplierId = oldSupplierId });
                }

                var queryUpdateNote = @"
                    UPDATE btggasify_finance_live.Debit_Notes SET 
                        DebitNoteNumber = @DebitNoteNo,
                        TransactionDate = @Date,
                        Amount = @DebitAmount,
                        Description = @Description,
                        SupplierId = @SupplierId,
                        CurrencyId = @CurrencyId,
                        IsSubmitted = @IsSubmitted,
                        GasCodeId = @GasCodeId,
                        Qty = @Qty,
                        UomId = @UomId
                    WHERE DebitNoteId = @DebitNoteId;";

                await _connection.ExecuteAsync(queryUpdateNote, note);

                var queryDeleteInv = "DELETE FROM btggasify_finance_live.debit_invoice WHERE DebitNoteId = @DebitNoteId;";
                await _connection.ExecuteAsync(queryDeleteInv, new { DebitNoteId = note.DebitNoteId });

                if (!string.IsNullOrEmpty(note.InvoiceNo))
                {
                    var queryInsertInv = @"
                        INSERT INTO btggasify_finance_live.debit_invoice (
                            DebitNoteId, InvoiceNo
                        ) VALUES (
                            @DebitNoteId, @InvoiceNo
                        );";
                    await _connection.ExecuteAsync(queryInsertInv, new { DebitNoteId = note.DebitNoteId, InvoiceNo = note.InvoiceNo });

                    if (note.IsSubmitted == true)
                    {
                        var updateApQuery = @"
                            UPDATE btggasify_finance_live.tbl_accounts_payable 
                            SET balance_amount = balance_amount - @Amount
                            WHERE vendor_invoice_no = @InvoiceNo AND vendor_id = @SupplierId;";
                        await _connection.ExecuteAsync(updateApQuery, new { Amount = note.DebitAmount, InvoiceNo = note.InvoiceNo, SupplierId = note.SupplierId });

                        var updateIrnQuery = @"
                            UPDATE btggasify_purchase_live.tbl_IRNReceipt_detail 
                            SET balancepaymentamount = balancepaymentamount - @Amount
                            WHERE (receiptno = @InvoiceNo OR docno = @InvoiceNo) AND supplier_id = @SupplierId;";
                        await _connection.ExecuteAsync(updateIrnQuery, new { Amount = note.DebitAmount, InvoiceNo = note.InvoiceNo, SupplierId = note.SupplierId });
                    }
                }

                return new ResponseModel()
                {
                    Data = note,
                    Message = "Debit Note updated successfully",
                    Status = true
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = ex.Message,
                    Status = false
                };
            }
        }

        public async Task<object> DeleteCreditNote(int id)
        {
            try
            {
                var oldNote = await _connection.QueryFirstOrDefaultAsync<dynamic>(
                    "SELECT IsSubmitted, Amount, SupplierId FROM btggasify_finance_live.Credit_Notes WHERE CreditNoteId = @Id;", 
                    new { Id = id });
                var oldInvoice = await _connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT InvoiceNo FROM btggasify_finance_live.credit_invoice WHERE CreditNoteId = @Id LIMIT 1;", 
                    new { Id = id });

                if (oldNote != null && oldNote.IsSubmitted == true && !string.IsNullOrEmpty(oldInvoice))
                {
                    decimal oldAmt = oldNote.Amount;
                    int oldSupplierId = oldNote.SupplierId;

                    var reverseApQuery = @"
                        UPDATE btggasify_finance_live.tbl_accounts_payable 
                        SET balance_amount = balance_amount + @Amount
                        WHERE vendor_invoice_no = @InvoiceNo AND vendor_id = @SupplierId;";
                    await _connection.ExecuteAsync(reverseApQuery, new { Amount = oldAmt, InvoiceNo = oldInvoice, SupplierId = oldSupplierId });

                    var reverseIrnQuery = @"
                        UPDATE btggasify_purchase_live.tbl_IRNReceipt_detail 
                        SET balancepaymentamount = balancepaymentamount + @Amount
                        WHERE (receiptno = @InvoiceNo OR docno = @InvoiceNo) AND supplier_id = @SupplierId;";
                    await _connection.ExecuteAsync(reverseIrnQuery, new { Amount = oldAmt, InvoiceNo = oldInvoice, SupplierId = oldSupplierId });
                }

                var queryDeleteInv = "DELETE FROM btggasify_finance_live.credit_invoice WHERE CreditNoteId = @Id;";
                await _connection.ExecuteAsync(queryDeleteInv, new { Id = id });

                var queryDeleteNote = "DELETE FROM btggasify_finance_live.Credit_Notes WHERE CreditNoteId = @Id;";
                await _connection.ExecuteAsync(queryDeleteNote, new { Id = id });

                return new ResponseModel()
                {
                    Message = "Credit Note deleted successfully",
                    Status = true
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Message = ex.Message,
                    Status = false
                };
            }
        }

        public async Task<object> DeleteDebitNote(int id)
        {
            try
            {
                var oldNote = await _connection.QueryFirstOrDefaultAsync<dynamic>(
                    "SELECT IsSubmitted, Amount, SupplierId FROM btggasify_finance_live.Debit_Notes WHERE DebitNoteId = @Id;", 
                    new { Id = id });
                var oldInvoice = await _connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT InvoiceNo FROM btggasify_finance_live.debit_invoice WHERE DebitNoteId = @Id LIMIT 1;", 
                    new { Id = id });

                if (oldNote != null && oldNote.IsSubmitted == true && !string.IsNullOrEmpty(oldInvoice))
                {
                    decimal oldAmt = oldNote.Amount;
                    int oldSupplierId = oldNote.SupplierId;

                    var reverseApQuery = @"
                        UPDATE btggasify_finance_live.tbl_accounts_payable 
                        SET balance_amount = balance_amount + @Amount
                        WHERE vendor_invoice_no = @InvoiceNo AND vendor_id = @SupplierId;";
                    await _connection.ExecuteAsync(reverseApQuery, new { Amount = oldAmt, InvoiceNo = oldInvoice, SupplierId = oldSupplierId });

                    var reverseIrnQuery = @"
                        UPDATE btggasify_purchase_live.tbl_IRNReceipt_detail 
                        SET balancepaymentamount = balancepaymentamount + @Amount
                        WHERE (receiptno = @InvoiceNo OR docno = @InvoiceNo) AND supplier_id = @SupplierId;";
                    await _connection.ExecuteAsync(reverseIrnQuery, new { Amount = oldAmt, InvoiceNo = oldInvoice, SupplierId = oldSupplierId });
                }

                var queryDeleteInv = "DELETE FROM btggasify_finance_live.debit_invoice WHERE DebitNoteId = @Id;";
                await _connection.ExecuteAsync(queryDeleteInv, new { Id = id });

                var queryDeleteNote = "DELETE FROM btggasify_finance_live.Debit_Notes WHERE DebitNoteId = @Id;";
                await _connection.ExecuteAsync(queryDeleteNote, new { Id = id });

                return new ResponseModel()
                {
                    Message = "Debit Note deleted successfully",
                    Status = true
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Message = ex.Message,
                    Status = false
                };
            }
        }

        public async Task<object> GetItemsByInvoiceId(int invoiceId)
        {
            try
            {
                var query = @"
                    SELECT DISTINCT
                        i.itemid AS ItemId,
                        i.itemname AS ItemName,
                        i.itemcode AS ItemCode,
                        por.uomid AS UomId,
                        uom.UOM AS UomName,
                        por.unitprice AS UnitPrice
                    FROM btggasify_purchase_live.tbl_IRNReceipt_detail irn
                    JOIN btggasify_purchase_live.tbl_purchaseorder_requisitions por ON irn.poid = por.poid
                    JOIN btggasify_masterpanel_live.master_item i ON por.itemid = i.itemid
                    LEFT JOIN btggasify_live.master_uom uom ON por.uomid = uom.Id
                    WHERE irn.receiptnote_hdr_id = @InvoiceId AND irn.isactive = 1;";

                var items = await _connection.QueryAsync<dynamic>(query, new { InvoiceId = invoiceId });
                return new ResponseModel()
                {
                    Data = items.ToList(),
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = ex.Message,
                    Status = false
                };
            }
        }
    }
}
