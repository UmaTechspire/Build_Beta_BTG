import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- Inspecting tbl_accounts_receivable for invoice 87286 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_accounts_receivable WHERE invoice_no = '87286'"))
        ar_rows = res.mappings().all()
        print(f"Accounts Receivable rows found: {len(ar_rows)}")
        for row in ar_rows:
            print("AR Row:", dict(row))

        print("\n--- Inspecting tbl_salesinvoices_header for invoice 87286 ---")
        res = await db.execute(text("SELECT * FROM btggasify_live.tbl_salesinvoices_header WHERE salesinvoicenbr = '87286'"))
        header_rows = res.mappings().all()
        print(f"Header rows found: {len(header_rows)}")
        for row in header_rows:
            print("Header Row:", dict(row))
            h_id = row['id']
            # Check if this invoice is a DO or is referenced in salesinvoices_details as a DOnumber
            res_det = await db.execute(text(f"SELECT DISTINCT DOnumber FROM btggasify_live.tbl_salesinvoices_details WHERE salesinvoicesheaderid = {h_id}"))
            print("Details (DOnumbers inside details):", res_det.all())

        # Check if the invoice is referenced as a DOnumber anywhere in the details table
        print("\n--- Checking if 87286 is treated as a DO in details ---")
        res_do = await db.execute(text("SELECT DISTINCT salesinvoicesheaderid FROM btggasify_live.tbl_salesinvoices_details WHERE TRIM(DOnumber) = '87286'"))
        do_rows = res_do.all()
        print(f"Referenced as DOnumber count: {len(do_rows)}")
        for row in do_rows:
            print("Referenced in details for header ID:", row[0])
            # Fetch that header
            res_h = await db.execute(text(f"SELECT id, salesinvoicenbr FROM btggasify_live.tbl_salesinvoices_header WHERE id = {row[0]}"))
            print("Consolidated Invoice Header:", res_h.all())

if __name__ == "__main__":
    asyncio.run(run())
