import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- Searching for amount 464,000,000.00 ---")
        res = await db.execute(text("""
            SELECT * FROM btggasify_finance_live.tbl_ar_receipt 
            WHERE ABS(cash_amount) = 464000000 OR ABS(bank_amount) = 464000000
        """))
        rows = res.mappings().all()
        print(f"Found receipts: {len(rows)}")
        for r in rows:
            print("Receipt Row:", dict(r))
            # Also get allocations
            rid = r['receipt_id']
            res_alloc = await db.execute(text(f"SELECT * FROM btggasify_finance_live.tbl_receipt_ag_ar WHERE receipt_id = {rid}"))
            allocs = res_alloc.mappings().all()
            print(f"  Allocations for receipt {rid}: {len(allocs)}")
            for a in allocs:
                print("    Allocation Row:", dict(a))

if __name__ == "__main__":
    asyncio.run(run())
