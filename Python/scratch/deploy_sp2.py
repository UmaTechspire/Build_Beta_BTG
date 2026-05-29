import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    sp_drop = "DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_AR_GetOutstandingInvoices"
    sp_create = """
CREATE PROCEDURE btggasify_finance_live.proc_AR_GetOutstandingInvoices(
    IN p_customer_id INT,
    IN p_receipt_id  INT,
    IN p_from_date   DATE,
    IN p_to_date     DATE
)
BEGIN
    -- Normalize p_receipt_id: treat 0 as NULL to avoid incorrect exclusions
    DECLARE v_receipt_id INT DEFAULT NULL;
    IF p_receipt_id > 0 THEN SET v_receipt_id = p_receipt_id; END IF;

    -- ---- INVOICES ----
    SELECT
        h.id                                                    AS invoice_id,
        h.salesinvoicenbr                                       AS invoice_no,
        'INV'                                                   AS record_type,
        (SELECT d.PONumber FROM btggasify_live.tbl_salesinvoices_details d
         WHERE d.salesinvoicesheaderid = h.id LIMIT 1)          AS po_no,
        h.Salesinvoicesdate                                     AS raw_date,
        DATE_FORMAT(h.Salesinvoicesdate, '%d-%m-%Y')            AS invoice_date,
        h.TotalAmount                                           AS total_amount,
        cur.CurrencyCode                                        AS currencycode,

        -- Amount allocated from THIS receipt OR any receipt in its group (for pre-filling UI)
        (SELECT COALESCE(SUM(ra.payment_amount), 0)
         FROM btggasify_finance_live.tbl_receipt_ag_ar ra
         JOIN btggasify_finance_live.tbl_accounts_receivable ar_link ON ra.ar_id = ar_link.ar_id
         WHERE (ar_link.invoice_id = h.id OR (IFNULL(ar_link.invoice_id, 0) = 0 AND TRIM(ar_link.invoice_no) = TRIM(h.salesinvoicenbr)))
           AND (ar_link.doc_type = 'INV' OR ar_link.doc_type IS NULL OR ar_link.doc_type = '')
           AND ra.is_active = 1
           AND (ra.receipt_id = v_receipt_id OR 
                ra.receipt_id IN (
                    SELECT r_sub.receipt_id FROM btggasify_finance_live.tbl_ar_receipt r_sub
                    WHERE r_sub.combine_group_id = (SELECT r_parent.combine_group_id FROM btggasify_finance_live.tbl_ar_receipt r_parent WHERE r_parent.receipt_id = v_receipt_id AND r_parent.combine_group_id IS NOT NULL)
                )
           )
        )                                                       AS allocated_here,

        -- Balance Due = Total - all other active allocations - credit notes
        (h.TotalAmount
            - (SELECT COALESCE(SUM(ra3.payment_amount), 0)
               FROM btggasify_finance_live.tbl_receipt_ag_ar ra3
               JOIN btggasify_finance_live.tbl_accounts_receivable ar_link3 ON ra3.ar_id = ar_link3.ar_id
               WHERE (ar_link3.invoice_id = h.id OR (IFNULL(ar_link3.invoice_id, 0) = 0 AND TRIM(ar_link3.invoice_no) = TRIM(h.salesinvoicenbr)))
                 AND (ar_link3.doc_type = 'INV' OR ar_link3.doc_type IS NULL OR ar_link3.doc_type = '')
                 AND ra3.is_active = 1
                 AND (ra3.receipt_id != v_receipt_id AND 
                      ra3.receipt_id NOT IN (
                          SELECT r_sub2.receipt_id FROM btggasify_finance_live.tbl_ar_receipt r_sub2
                          WHERE r_sub2.combine_group_id = (SELECT r_parent2.combine_group_id FROM btggasify_finance_live.tbl_ar_receipt r_parent2 WHERE r_parent2.receipt_id = v_receipt_id AND r_parent2.combine_group_id IS NOT NULL)
                      ) OR v_receipt_id IS NULL
                 )
              )
            - (SELECT COALESCE(SUM(cn.Amount), 0)
               FROM btggasify_finance_live.credit_invoice ci
               JOIN btggasify_finance_live.Credit_Notes cn ON ci.CreditNoteId = cn.CreditNoteId
               WHERE TRIM(ci.InvoiceNo) = TRIM(h.salesinvoicenbr) AND cn.IsSubmitted = 1)
        )                                                       AS balance_due

    FROM btggasify_live.tbl_salesinvoices_header h
    LEFT JOIN btggasify_finance_live.tbl_accounts_receivable ar
           ON TRIM(h.salesinvoicenbr) = TRIM(ar.invoice_no) AND (ar.doc_type = 'INV' OR ar.doc_type IS NULL OR ar.doc_type = '')
    LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId
    WHERE (
        -- Case 1: Formally linked to this receipt (Always show, regardless of status/DO prefix)
        EXISTS (
              SELECT 1 FROM btggasify_finance_live.tbl_receipt_ag_ar ra_v
              JOIN btggasify_finance_live.tbl_accounts_receivable ar_v ON ra_v.ar_id = ar_v.ar_id
              WHERE (ar_v.invoice_id = h.id OR (IFNULL(ar_v.invoice_id, 0) = 0 AND TRIM(ar_v.invoice_no) = TRIM(h.salesinvoicenbr)))
                AND ra_v.is_active = 1
                AND (ra_v.receipt_id = v_receipt_id OR 
                     ra_v.receipt_id IN (
                         SELECT r_sub_v.receipt_id FROM btggasify_finance_live.tbl_ar_receipt r_sub_v
                         WHERE r_sub_v.combine_group_id = (SELECT r_parent_v.combine_group_id FROM btggasify_finance_live.tbl_ar_receipt r_parent_v WHERE r_parent_v.receipt_id = v_receipt_id AND r_parent_v.combine_group_id IS NOT NULL)
                     )
                )
        )
        OR
        -- Case 2: Normal Outstanding Invoices for this customer
        (
          h.customerid = p_customer_id
          AND h.IsSubmitted = 1
          AND h.IsAR = 1
          AND h.salesinvoicenbr NOT LIKE 'DO %'
          AND NOT EXISTS (
              SELECT 1
              FROM btggasify_live.tbl_salesinvoices_details d
              WHERE TRIM(d.DOnumber) = TRIM(h.salesinvoicenbr)
                AND d.salesinvoicesheaderid != h.id
          )
          AND (p_from_date IS NULL OR h.Salesinvoicesdate >= p_from_date)
          AND (p_to_date   IS NULL OR h.Salesinvoicesdate <= p_to_date)
          AND (h.TotalAmount
              - (SELECT COALESCE(SUM(ra4.payment_amount), 0)
                 FROM btggasify_finance_live.tbl_receipt_ag_ar ra4
                 JOIN btggasify_finance_live.tbl_accounts_receivable ar_link4 ON ra4.ar_id = ar_link4.ar_id
                 WHERE (ar_link4.invoice_id = h.id OR (IFNULL(ar_link4.invoice_id, 0) = 0 AND TRIM(ar_link4.invoice_no) = TRIM(h.salesinvoicenbr)))
                   AND ra4.is_active = 1
                )
              - (SELECT COALESCE(SUM(cn2.Amount), 0)
                 FROM btggasify_finance_live.credit_invoice ci2
                 JOIN btggasify_finance_live.Credit_Notes cn2 ON ci2.CreditNoteId = cn2.CreditNoteId
                 WHERE TRIM(ci2.InvoiceNo) = TRIM(h.salesinvoicenbr) AND cn2.IsSubmitted = 1)
          ) > 0.01
        )
    )

    UNION ALL

    -- ---- DEBIT NOTES ----
    SELECT
        dn.DebitNoteId                                          AS invoice_id,
        dn.DebitNoteNumber                                      AS invoice_no,
        'DN'                                                    AS record_type,
        NULL                                                    AS po_no,
        dn.TransactionDate                                      AS raw_date,
        DATE_FORMAT(dn.TransactionDate, '%d-%m-%Y')             AS invoice_date,
        dn.Amount                                               AS total_amount,
        cur.CurrencyCode                                        AS currencycode,

        (SELECT COALESCE(SUM(ra.payment_amount), 0)
         FROM btggasify_finance_live.tbl_receipt_ag_ar ra
         JOIN btggasify_finance_live.tbl_accounts_receivable ar_link ON ra.ar_id = ar_link.ar_id
         WHERE ar_link.invoice_id = dn.DebitNoteId AND ar_link.doc_type = 'DN'
           AND ra.is_active = 1
           AND (ra.receipt_id = v_receipt_id OR 
                ra.receipt_id IN (
                    SELECT r_sub5.receipt_id FROM btggasify_finance_live.tbl_ar_receipt r_sub5
                    WHERE r_sub5.combine_group_id = (SELECT r_parent5.combine_group_id FROM btggasify_finance_live.tbl_ar_receipt r_parent5 WHERE r_parent5.receipt_id = v_receipt_id AND r_parent5.combine_group_id IS NOT NULL)
                )
           )
        )                                                       AS allocated_here,

        (dn.Amount
            - (SELECT COALESCE(SUM(ra3.payment_amount), 0)
               FROM btggasify_finance_live.tbl_receipt_ag_ar ra3
               JOIN btggasify_finance_live.tbl_accounts_receivable ar_link3 ON ra3.ar_id = ar_link3.ar_id
               WHERE ar_link3.invoice_id = dn.DebitNoteId AND ar_link3.doc_type = 'DN'
                 AND ra3.is_active = 1
                 AND (ra3.receipt_id != v_receipt_id AND 
                      ra3.receipt_id NOT IN (
                          SELECT r_sub6.receipt_id FROM btggasify_finance_live.tbl_ar_receipt r_sub6
                          WHERE r_sub6.combine_group_id = (SELECT r_parent6.combine_group_id FROM btggasify_finance_live.tbl_ar_receipt r_parent6 WHERE r_parent6.receipt_id = v_receipt_id AND r_parent6.combine_group_id IS NOT NULL)
                      ) OR v_receipt_id IS NULL
                 )
              )
        )                                                       AS balance_due

    FROM btggasify_finance_live.Debit_Notes dn
    LEFT JOIN btggasify_live.master_currency cur ON dn.CurrencyId = cur.CurrencyId
    INNER JOIN btggasify_finance_live.tbl_accounts_receivable ar_dn
           ON ar_dn.invoice_id = dn.DebitNoteId AND ar_dn.doc_type = 'DN'
    WHERE (
        EXISTS (
              SELECT 1 FROM btggasify_finance_live.tbl_receipt_ag_ar ra_v2
              JOIN btggasify_finance_live.tbl_accounts_receivable ar_v2 ON ra_v2.ar_id = ar_v2.ar_id
              WHERE ar_v2.invoice_id = dn.DebitNoteId AND ar_v2.doc_type = 'DN'
                AND ra_v2.is_active = 1
                AND (ra_v2.receipt_id = v_receipt_id OR 
                     ra_v2.receipt_id IN (
                         SELECT r_sub7.receipt_id FROM btggasify_finance_live.tbl_ar_receipt r_sub7
                         WHERE r_sub7.combine_group_id = (SELECT r_parent7.combine_group_id FROM btggasify_finance_live.tbl_ar_receipt r_parent7 WHERE r_parent7.receipt_id = v_receipt_id AND r_parent7.combine_group_id IS NOT NULL)
                     )
                )
        )
        OR
        (
          dn.CustomerId = p_customer_id
          AND dn.IsSubmitted = 1
          AND (p_from_date IS NULL OR dn.TransactionDate >= p_from_date)
          AND (p_to_date   IS NULL OR dn.TransactionDate <= p_to_date)
          AND (dn.Amount
              - (SELECT COALESCE(SUM(ra4.payment_amount), 0)
                 FROM btggasify_finance_live.tbl_receipt_ag_ar ra4
                 JOIN btggasify_finance_live.tbl_accounts_receivable ar_link4 ON ra4.ar_id = ar_link4.ar_id
                 WHERE ar_link4.invoice_id = dn.DebitNoteId AND ar_link4.doc_type = 'DN'
                   AND ra4.is_active = 1
                )
          ) > 0.01
        )
    )

    ORDER BY raw_date ASC;
END
"""
    async for db in get_db():
        print("--- Updating proc_AR_GetOutstandingInvoices ---")
        await db.execute(text(sp_drop))
        await db.execute(text(sp_create))
        await db.commit()
        print("Procedure updated successfully!")
        break

if __name__ == "__main__":
    asyncio.run(main())
