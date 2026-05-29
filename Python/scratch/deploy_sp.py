import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    sp_sql = """
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_AR_GetOutstandingInvoices;
CREATE PROCEDURE btggasify_finance_live.proc_AR_GetOutstandingInvoices(
    IN p_customer_id INT,
    IN p_receipt_id  INT,
    IN p_from_date   DATE,
    IN p_to_date     DATE
)
BEGIN
    -- Normalize p_receipt_id: treat 0 as NULL
    DECLARE v_receipt_id INT DEFAULT NULL;
    IF p_receipt_id > 0 THEN SET v_receipt_id = p_receipt_id; END IF;

    -- ---- CONSOLIDATED AR LEDGER QUERY ----
    -- We drive from tbl_accounts_receivable to ensure ALL posted items are visible.
    
    -- 1. INVOICES (and general AR records)
    SELECT
        ar.invoice_id                                           AS invoice_id, -- Link to SI Header
        ar.invoice_no                                           AS invoice_no,
        'INV'                                                   AS record_type,
        (SELECT d.PONumber FROM btggasify_live.tbl_salesinvoices_details d
         WHERE d.salesinvoicesheaderid = ar.invoice_id LIMIT 1) AS po_no,
        ar.invoice_date                                         AS raw_date,
        DATE_FORMAT(ar.invoice_date, '%d-%m-%Y')                AS invoice_date,
        ar.inv_amount                                           AS total_amount,
        cur.CurrencyCode                                        AS currencycode,

        -- Allocated Here (Accurate join via internal ar_id, grouping-aware)
        (SELECT COALESCE(SUM(ra.payment_amount), 0)
         FROM btggasify_finance_live.tbl_receipt_ag_ar ra
         WHERE ra.ar_id = ar.ar_id
           AND ra.is_active = 1
           AND (ra.receipt_id = v_receipt_id OR 
                ra.receipt_id IN (
                    SELECT r_sub.receipt_id FROM btggasify_finance_live.tbl_ar_receipt r_sub
                    WHERE r_sub.combine_group_id = (SELECT r_parent.combine_group_id FROM btggasify_finance_live.tbl_ar_receipt r_parent WHERE r_parent.receipt_id = v_receipt_id AND r_parent.combine_group_id IS NOT NULL)
                )
           )
        )                                                       AS allocated_here,

        -- Balance Due (Ledger Balance minus other grouping-aware allocations and Credit Notes)
        (ar.inv_amount 
            - (SELECT COALESCE(SUM(ra3.payment_amount), 0)
               FROM btggasify_finance_live.tbl_receipt_ag_ar ra3
               WHERE ra3.ar_id = ar.ar_id
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
               WHERE TRIM(ci.InvoiceNo) = TRIM(ar.invoice_no) AND cn.IsSubmitted = 1)
        )                                                       AS balance_due

    FROM btggasify_finance_live.tbl_accounts_receivable ar
    LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId
    LEFT JOIN btggasify_live.tbl_salesinvoices_header h ON ar.invoice_id = h.id
    WHERE ar.is_active = 1
      AND (ar.doc_type = 'INV' OR ar.doc_type IS NULL OR ar.doc_type = '')
      AND (
          -- Case 1: Formally linked to this receipt (ALWAYS SHOW, bypasses all filters)
          EXISTS (
              SELECT 1 FROM btggasify_finance_live.tbl_receipt_ag_ar ra_v
              WHERE ra_v.ar_id = ar.ar_id
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
            ar.customer_id = p_customer_id
            AND (p_from_date IS NULL OR ar.invoice_date >= p_from_date)
            AND (p_to_date   IS NULL OR ar.invoice_date <= p_to_date)
            AND (ar.inv_amount - ar.already_received) > 0.01
            -- Standard Business Filter: Filter out DOs that are part of a consolidated invoice
            AND (h.id IS NULL OR (
                h.salesinvoicenbr NOT LIKE 'DO %'
                AND NOT EXISTS (
                    SELECT 1
                    FROM btggasify_live.tbl_salesinvoices_details d
                    WHERE TRIM(d.DOnumber) = TRIM(h.salesinvoicenbr)
                      AND d.salesinvoicesheaderid != h.id
                )
            ))
          )
      )

    UNION ALL

    -- 2. DEBIT NOTES
    SELECT
        ar.invoice_id                                           AS invoice_id, -- Debit Note ID
        ar.invoice_no                                           AS invoice_no,
        'DN'                                                    AS record_type,
        NULL                                                    AS po_no,
        ar.invoice_date                                         AS raw_date,
        DATE_FORMAT(ar.invoice_date, '%d-%m-%Y')                AS invoice_date,
        ar.inv_amount                                           AS total_amount,
        cur.CurrencyCode                                        AS currencycode,

        (SELECT COALESCE(SUM(ra.payment_amount), 0)
         FROM btggasify_finance_live.tbl_receipt_ag_ar ra
         WHERE ra.ar_id = ar.ar_id
           AND ra.is_active = 1
           AND (ra.receipt_id = v_receipt_id OR 
                ra.receipt_id IN (
                    SELECT r_sub5.receipt_id FROM btggasify_finance_live.tbl_ar_receipt r_sub5
                    WHERE r_sub5.combine_group_id = (SELECT r_parent5.combine_group_id FROM btggasify_finance_live.tbl_ar_receipt r_parent5 WHERE r_parent5.receipt_id = v_receipt_id AND r_parent5.combine_group_id IS NOT NULL)
                )
           )
        )                                                       AS allocated_here,

        (ar.inv_amount
            - (SELECT COALESCE(SUM(ra3.payment_amount), 0)
               FROM btggasify_finance_live.tbl_receipt_ag_ar ra3
               WHERE ra3.ar_id = ar.ar_id
                 AND ra3.is_active = 1
                 AND (ra3.receipt_id != v_receipt_id AND 
                      ra3.receipt_id NOT IN (
                          SELECT r_sub6.receipt_id FROM btggasify_finance_live.tbl_ar_receipt r_sub6
                          WHERE r_sub6.combine_group_id = (SELECT r_parent6.combine_group_id FROM btggasify_finance_live.tbl_ar_receipt r_parent6 WHERE r_parent6.receipt_id = v_receipt_id AND r_parent6.combine_group_id IS NOT NULL)
                      ) OR v_receipt_id IS NULL
                 )
              )
        )                                                       AS balance_due

    FROM btggasify_finance_live.tbl_accounts_receivable ar
    LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId
    WHERE ar.is_active = 1
      AND ar.doc_type = 'DN'
      AND (
          EXISTS (
              SELECT 1 FROM btggasify_finance_live.tbl_receipt_ag_ar ra_v2
              WHERE ra_v2.ar_id = ar.ar_id
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
            ar.customer_id = p_customer_id
            AND (p_from_date IS NULL OR ar.invoice_date >= p_from_date)
            AND (p_to_date   IS NULL OR ar.invoice_date <= p_to_date)
            AND (ar.inv_amount - ar.already_received) > 0.01
          )
      )

    ORDER BY raw_date ASC;
END
    """
    async for db in get_db():
        print("--- Updating proc_AR_GetOutstandingInvoices ---")
        for stmt in sp_sql.split(';'):
            stmt = stmt.strip()
            if stmt:
                await db.execute(text(stmt))
        await db.commit()
        print("Procedure updated successfully!")
        break

if __name__ == "__main__":
    asyncio.run(main())
