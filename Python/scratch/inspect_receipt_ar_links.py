import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- Searching tbl_ar_receipt for ar_id = 5621 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE ar_id = 5621"))
        rows = res.mappings().all()
        print(f"Receipts found: {len(rows)}")
        for r in rows:
            print("Receipt:", dict(r))

if __name__ == "__main__":
    asyncio.run(run())
