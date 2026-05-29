import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Checking tbl_accounts_receivable for 92901 ---")
        res2 = await db.execute(text("SELECT ar_id, invoice_id, invoice_no, is_active, inv_amount, already_received, balance_amount FROM btggasify_finance_live.tbl_accounts_receivable WHERE invoice_no = '92901'"))
        for row in res2:
            print(f"AR: ar_id={row[0]}, invoice_id={row[1]}, invoice_no={row[2]}, is_active={row[3]}, amount={row[4]}, paid={row[5]}, bal={row[6]}")

        print("--- Checking tbl_salesinvoices_header balance ---")
        res3 = await db.execute(text("SELECT id, salesinvoicenbr, TotalAmount, PaidAmount, isactive FROM btggasify_live.tbl_salesinvoices_header WHERE salesinvoicenbr = '92901'"))
        for row in res3:
            print(f"HDR: id={row[0]}, no={row[1]}, amount={row[2]}, paid={row[3]}, isactive={row[4]}")
            
            # Check allocations in receipt_ag_ar
            res4 = await db.execute(text("""
                SELECT ra.receipt_id, ra.payment_amount, ra.is_active
                FROM btggasify_finance_live.tbl_receipt_ag_ar ra
                JOIN btggasify_finance_live.tbl_accounts_receivable ar ON ra.ar_id = ar.ar_id
                WHERE ar.invoice_id = :id OR TRIM(ar.invoice_no) = '92901'
            """), {"id": row[0]})
            allocations = res4.fetchall()
            print(f"  Allocations for {row[0]}: {allocations}")
            
            # Check credit notes
            res5 = await db.execute(text("""
                SELECT cn.CreditNoteId, cn.Amount
                FROM btggasify_finance_live.credit_invoice ci
                JOIN btggasify_finance_live.Credit_Notes cn ON ci.CreditNoteId = cn.CreditNoteId
                WHERE TRIM(ci.InvoiceNo) = '92901' AND cn.IsSubmitted = 1
            """))
            cns = res5.fetchall()
            print(f"  Credit Notes for {row[0]}: {cns}")

        break

if __name__ == "__main__":
    asyncio.run(main())
