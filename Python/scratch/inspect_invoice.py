import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_PORT = os.getenv("DB_PORT", "3306")

def apply():
    conn = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        port=int(DB_PORT),
        database='btggasify_finance_live'
    )
    cursor = conn.cursor()
    cursor.execute("DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_AR_GetARBook")
    
    proc = """
    CREATE DEFINER='btgsogdbu53r'@'%' PROCEDURE btggasify_finance_live.proc_AR_GetARBook(
        IN p_org_id INT,
        IN p_branch_id INT,
        IN p_customer_id INT,
        IN p_from_date DATE,
        IN p_to_date DATE
    )
    BEGIN
        -- Invoices / AR Ledger Records
        SELECT 
            ar.ar_id as transaction_id, 
            ar.customer_id as customer_id, 
            ar.invoice_amt_idr as invoice_amount_idr, 
            cur.CurrencyCode as currencycode, 
            ar.invoice_date as ledger_date, 
            c.CustomerName as customer_name, 
            ar.ar_no, 
            ar.invoice_no, 
            (SELECT d.PONumber FROM btggasify_live.tbl_salesinvoices_details d 
             WHERE d.salesinvoicesheaderid = ar.invoice_id AND ar.doc_type = 'INV' LIMIT 1) as po_no,
            CASE WHEN ar.doc_type = 'INV' THEN ar.inv_amount ELSE 0 END as invoice_amount, 
            NULL as receipt_no, 
            0 as receipt_amount, 
            CASE 
                WHEN ar.doc_type = 'DN' THEN ar.inv_amount
                ELSE (SELECT COALESCE(SUM(dn.Amount), 0) 
                      FROM btggasify_finance_live.debit_invoice di 
                      JOIN btggasify_finance_live.Debit_Notes dn ON di.DebitNoteId = dn.DebitNoteId 
                      WHERE TRIM(di.InvoiceNo) = TRIM(ar.invoice_no) AND dn.IsSubmitted = 1)
            END as debit_note_amount,
            CASE 
                WHEN ar.doc_type = 'CN' THEN ar.inv_amount
                ELSE (SELECT COALESCE(SUM(cn.Amount), 0) 
                      FROM btggasify_finance_live.credit_invoice ci 
                      JOIN btggasify_finance_live.Credit_Notes cn ON ci.CreditNoteId = cn.CreditNoteId 
                      WHERE TRIM(ci.InvoiceNo) = TRIM(ar.invoice_no) AND cn.IsSubmitted = 1)
            END as credit_note_amount,
            (CASE 
                WHEN ar.doc_type = 'INV' THEN
                    (ar.inv_amount - ar.already_received + 
                        (SELECT COALESCE(SUM(dn2.Amount), 0) FROM btggasify_finance_live.debit_invoice di2 JOIN btggasify_finance_live.Debit_Notes dn2 ON di2.DebitNoteId = dn2.DebitNoteId WHERE TRIM(di2.InvoiceNo) = TRIM(ar.invoice_no) AND dn2.IsSubmitted = 1) - 
                        (SELECT COALESCE(SUM(cn2.Amount), 0) FROM btggasify_finance_live.credit_invoice ci2 JOIN btggasify_finance_live.Credit_Notes cn2 ON ci2.CreditNoteId = cn2.CreditNoteId WHERE TRIM(ci2.InvoiceNo) = TRIM(ar.invoice_no) AND cn2.IsSubmitted = 1)
                    )
                ELSE (ar.inv_amount - ar.already_received)
             END) as balance, 
            CASE 
                WHEN ar.doc_type = 'DN' THEN 'Debit Note'
                WHEN ar.doc_type = 'CN' THEN 'Credit Note'
                ELSE 'Invoice'
            END as payment_mode, 
            CASE 
                WHEN ar.doc_type = 'DN' THEN 'Debit Note'
                WHEN ar.doc_type = 'CN' THEN 'Credit Note'
                ELSE 'Invoice'
            END as payment_type, 
            '-' as remarks,
            0 as receipt_id, 
            0 as deposit_bank_id, 
            ar.invoice_id as real_invoice_id,
            0 as total_receipt_amount,
            NULL as combine_group_id,
            NULL as custom_voucher_no,
            0 as is_combined
        FROM btggasify_finance_live.tbl_accounts_receivable ar 
        JOIN btggasify_live.master_customer c ON ar.customer_id = c.Id 
        LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId 
        WHERE ar.is_active = 1 AND ar.orgid = p_org_id AND ar.branchid = p_branch_id
          AND (p_customer_id = 0 OR ar.customer_id = p_customer_id)
          AND (p_from_date IS NULL OR ar.invoice_date >= p_from_date)
          AND (p_to_date IS NULL OR ar.invoice_date <= p_to_date)

        UNION ALL

        -- Receipts (Allocated via Link Table)
        SELECT 
            r.receipt_id as transaction_id, 
            ar.customer_id as customer_id, 
            ar.invoice_amt_idr as invoice_amount_idr, 
            cur.CurrencyCode as currencycode, 
            r.receipt_date as ledger_date, 
            c.CustomerName as customer_name, 
            ar.ar_no, 
            ar.invoice_no, 
            (SELECT d.PONumber FROM btggasify_live.tbl_salesinvoices_details d 
             WHERE d.salesinvoicesheaderid = ar.invoice_id LIMIT 1) as po_no,
            ar.inv_amount as invoice_amount, 
            r.reference_no as receipt_no, 
            ra.payment_amount as receipt_amount, 
            0 as debit_note_amount, 
            0 as credit_note_amount, 
            ar.balance_amount as balance, 
            CASE WHEN(IFNULL(r.bank_amount,0) > 0) THEN 'Bank' ELSE 'Cash' END as payment_mode, 
            r.transaction_type as payment_type, 
            '-' as remarks,
            r.receipt_id, 
            IFNULL(r.deposit_bank_id, 0) as deposit_bank_id, 
            ar.invoice_id as real_invoice_id,
            (r.cash_amount + r.bank_amount) as total_receipt_amount,
            r.combine_group_id,
            r.custom_voucher_no,
            r.is_combined
        FROM btggasify_finance_live.tbl_receipt_ag_ar ra 
        JOIN btggasify_finance_live.tbl_ar_receipt r ON ra.receipt_id = r.receipt_id 
        JOIN btggasify_finance_live.tbl_accounts_receivable ar ON ra.ar_id = ar.ar_id 
        LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId 
        JOIN btggasify_live.master_customer c ON ar.customer_id = c.Id 
        WHERE ar.is_active = 1 AND ra.is_active = 1 AND ar.orgid = p_org_id AND ar.branchid = p_branch_id
          AND (p_customer_id = 0 OR ar.customer_id = p_customer_id)
          AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
          AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
          AND IFNULL(r.is_submitted, 0) = 1
          AND IFNULL(r.transaction_type, '') != 'Bank transfer'

        UNION ALL

        -- Receipts (Allocated via direct ar_id, fallback for single-invoice legacy data)
        SELECT 
            r.receipt_id as transaction_id, 
            ar.customer_id as customer_id, 
            ar.invoice_amt_idr as invoice_amount_idr, 
            cur.CurrencyCode as currencycode, 
            r.receipt_date as ledger_date, 
            c.CustomerName as customer_name, 
            ar.ar_no, 
            ar.invoice_no, 
            (SELECT d.PONumber FROM btggasify_live.tbl_salesinvoices_details d 
             WHERE d.salesinvoicesheaderid = ar.invoice_id LIMIT 1) as po_no,
            ar.inv_amount as invoice_amount, 
            r.reference_no as receipt_no, 
            (r.cash_amount + r.bank_amount) as receipt_amount, 
            0 as debit_note_amount, 
            0 as credit_note_amount, 
            ar.balance_amount as balance, 
            CASE WHEN(IFNULL(r.bank_amount,0) > 0) THEN 'Bank' ELSE 'Cash' END as payment_mode, 
            r.transaction_type as payment_type, 
            'Direct AR Mapping' as remarks,
            r.receipt_id, 
            IFNULL(r.deposit_bank_id, 0) as deposit_bank_id, 
            ar.invoice_id as real_invoice_id,
            (r.cash_amount + r.bank_amount) as total_receipt_amount,
            r.combine_group_id,
            r.custom_voucher_no,
            r.is_combined
        FROM btggasify_finance_live.tbl_ar_receipt r
        JOIN btggasify_finance_live.tbl_accounts_receivable ar ON r.ar_id = ar.ar_id 
        LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId 
        JOIN btggasify_live.master_customer c ON ar.customer_id = c.Id 
        WHERE r.is_active = 1 AND r.orgid = p_org_id AND r.branchid = p_branch_id
          AND NOT EXISTS (SELECT 1 FROM btggasify_finance_live.tbl_receipt_ag_ar ra3 WHERE ra3.receipt_id = r.receipt_id AND ra3.is_active = 1)
          AND (p_customer_id = 0 OR r.customer_id = p_customer_id)
          AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
          AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
          AND IFNULL(r.is_submitted, 0) = 1
          AND IFNULL(r.transaction_type, '') != 'Bank transfer'

        UNION ALL

        -- Debit Notes (standalone)
        SELECT 
            dn.DebitNoteId as transaction_id, 
            dn.CustomerId as customer_id, 
            0 as invoice_amount_idr, 
            cur.CurrencyCode as currencycode, 
            dn.TransactionDate as ledger_date, 
            c.CustomerName as customer_name, 
            dn.DebitNoteNumber as ar_no, 
            dn.DebitNoteNumber as invoice_no, 
            '' as po_no,
            0 as invoice_amount, 
            NULL as receipt_no, 
            0 as receipt_amount, 
            dn.Amount as debit_note_amount, 
            0 as credit_note_amount, 
            0 as balance, 
            'Debit Note' as payment_mode, 
            'Debit Note' as payment_type, 
            dn.Description as remarks,
            0 as receipt_id, 0 as deposit_bank_id, 
            dn.DebitNoteId as real_invoice_id,
            0 as total_receipt_amount,
            NULL as combine_group_id,
            NULL as custom_voucher_no,
            0 as is_combined
        FROM btggasify_finance_live.Debit_Notes dn 
        JOIN btggasify_live.master_customer c ON dn.CustomerId = c.Id 
        LEFT JOIN btggasify_live.master_currency cur ON dn.CurrencyId = cur.CurrencyId 
        WHERE 1=1
          AND (p_customer_id = 0 OR dn.CustomerId = p_customer_id)
          AND (p_from_date IS NULL OR dn.TransactionDate >= p_from_date)
          AND (p_to_date IS NULL OR dn.TransactionDate <= p_to_date)
          AND NOT EXISTS (SELECT 1 FROM btggasify_finance_live.debit_invoice di WHERE di.DebitNoteId = dn.DebitNoteId)
          AND NOT EXISTS (SELECT 1 FROM btggasify_finance_live.tbl_accounts_receivable ar WHERE ar.invoice_id = dn.DebitNoteId AND ar.doc_type = 'DN')

        UNION ALL

        -- Credit Notes (standalone)
        SELECT 
            cn.CreditNoteId as transaction_id, 
            cn.CustomerId as customer_id, 
            0 as invoice_amount_idr, 
            cur.CurrencyCode as currencycode, 
            cn.TransactionDate as ledger_date, 
            c.CustomerName as customer_name, 
            cn.CreditNoteNumber as ar_no, 
            cn.CreditNoteNumber as invoice_no, 
            '' as po_no,
            0 as invoice_amount, 
            NULL as receipt_no, 
            0 as receipt_amount, 
            0 as debit_note_amount, 
            cn.Amount as credit_note_amount, 
            0 as balance, 
            'Credit Note' as payment_mode, 
            'Credit Note' as payment_type, 
            cn.Description as remarks,
            0 as receipt_id, 0 as deposit_bank_id, 
            cn.CreditNoteId as real_invoice_id,
            0 as total_receipt_amount,
            NULL as combine_group_id,
            NULL as custom_voucher_no,
            0 as is_combined
        FROM btggasify_finance_live.Credit_Notes cn 
        JOIN btggasify_live.master_customer c ON cn.CustomerId = c.Id 
        LEFT JOIN btggasify_live.master_currency cur ON cn.CurrencyId = cur.CurrencyId 
        WHERE 1=1
          AND (p_customer_id = 0 OR cn.CustomerId = p_customer_id)
          AND (p_from_date IS NULL OR cn.TransactionDate >= p_from_date)
          AND (p_to_date IS NULL OR cn.TransactionDate <= p_to_date)
          AND NOT EXISTS (SELECT 1 FROM btggasify_finance_live.credit_invoice ci WHERE ci.CreditNoteId = cn.CreditNoteId)

        UNION ALL

        -- Unallocated Receipts (Portion not linked to any Invoice)
        SELECT 
            r.receipt_id as transaction_id, 
            r.customer_id as customer_id, 
            0 as invoice_amount_idr, 
            IFNULL(cur.CurrencyCode, 'IDR') as currencycode, 
            r.receipt_date as ledger_date, 
            c.CustomerName as customer_name, 
            IFNULL(r.reference_no, 'Unallocated') as ar_no, 
            IFNULL(r.reference_no, 'Unallocated') as invoice_no, 
            '' as po_no,
            0 as invoice_amount, 
            r.receipt_no as receipt_no, 
            ((r.cash_amount + r.bank_amount) - IFNULL((SELECT SUM(ra2.payment_amount) FROM btggasify_finance_live.tbl_receipt_ag_ar ra2 WHERE ra2.receipt_id = r.receipt_id AND ra2.is_active = 1), 0)) as receipt_amount, 
            0 as debit_note_amount, 
            0 as credit_note_amount, 
            -((r.cash_amount + r.bank_amount) - IFNULL((SELECT SUM(ra2.payment_amount) FROM btggasify_finance_live.tbl_receipt_ag_ar ra2 WHERE ra2.receipt_id = r.receipt_id AND ra2.is_active = 1), 0)) as balance, 
            CASE WHEN(IFNULL(r.bank_amount,0) > 0) THEN 'Bank' ELSE 'Cash' END as payment_mode, 
            r.transaction_type as payment_type, 
            'Standalone/Partial Receipt' as remarks, 
            r.receipt_id, 
            IFNULL(r.deposit_bank_id, 0) as deposit_bank_id, 
            '0' as real_invoice_id,
            (r.cash_amount + r.bank_amount) as total_receipt_amount,
            r.combine_group_id,
            r.custom_voucher_no,
            r.is_combined
        FROM btggasify_finance_live.tbl_ar_receipt r 
        JOIN btggasify_live.master_customer c ON r.customer_id = c.Id 
        LEFT JOIN btggasify_live.master_currency cur ON r.currencyid = cur.CurrencyId 
        WHERE r.is_active = 1 AND r.orgid = p_org_id AND r.branchid = p_branch_id
          AND r.ar_id IS NULL
          AND (p_customer_id = 0 OR r.customer_id = p_customer_id)
          AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
          AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
          AND IFNULL(r.is_submitted, 0) = 1
          AND IFNULL(r.transaction_type, '') != 'Bank transfer'
          AND ((r.cash_amount + r.bank_amount) - IFNULL((SELECT SUM(ra2.payment_amount) FROM btggasify_finance_live.tbl_receipt_ag_ar ra2 WHERE ra2.receipt_id = r.receipt_id AND ra2.is_active = 1), 0)) > 0.01

        ORDER BY customer_name, ledger_date, ar_no;
    END
    """
    cursor.execute(proc)
    conn.commit()
    cursor.close()
    conn.close()

if __name__ == "__main__":
    apply()

