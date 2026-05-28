import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- Finding rows with sales_person_id = 100 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE sales_person_id = 100"))
        rows = res.mappings().all()
        for r in rows:
            print(dict(r))

if __name__ == "__main__":
    asyncio.run(run())
