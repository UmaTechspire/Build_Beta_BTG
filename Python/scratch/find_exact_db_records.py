import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- 1. Search tbl_ar_receipt for date 2026-01-01 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE receipt_date = '2026-01-01'"))
        print(res.mappings().all())

        print("--- 2. Search tbl_accounts_receivable for date 2026-01-01 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_accounts_receivable WHERE invoice_date = '2026-01-01'"))
        print(res.mappings().all())

        print("--- 3. Search tbl_receipt_ag_ar for date 2026-01-01 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_receipt_ag_ar WHERE receipt_date = '2026-01-01'"))
        print(res.mappings().all())

        print("--- 4. Search tbl_ar_receipt for amount 464,000,000.00 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE total_amount = 464000000 OR bank_amount = 464000000 OR cash_amount = 464000000"))
        print(res.mappings().all())

        print("--- 5. Search tbl_accounts_receivable for amount 464,000,000.00 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_accounts_receivable WHERE inv_amount = 464000000"))
        print(res.mappings().all())

        print("--- 6. Search tbl_receipt_ag_ar for payment_amount = 464,000,000.00 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_receipt_ag_ar WHERE payment_amount = 464000000"))
        print(res.mappings().all())

if __name__ == "__main__":
    asyncio.run(run())
