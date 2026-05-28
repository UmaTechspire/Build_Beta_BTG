import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- Finding customer for invoice 90588 ---")
        res = await db.execute(text("SELECT customerid FROM btggasify_live.tbl_salesinvoices_header WHERE salesinvoicenbr = '90588'"))
        print(res.mappings().all())

        print("--- Finding customer for invoice 89880 ---")
        res = await db.execute(text("SELECT customerid FROM btggasify_live.tbl_salesinvoices_header WHERE salesinvoicenbr = '89880'"))
        print(res.mappings().all())

        print("--- Let's query tbl_accounts_receivable for invoice 90588 ---")
        res = await db.execute(text("SELECT customer_id, invoice_no FROM btggasify_finance_live.tbl_accounts_receivable WHERE invoice_no = '90588'"))
        print(res.mappings().all())

if __name__ == "__main__":
    asyncio.run(run())
