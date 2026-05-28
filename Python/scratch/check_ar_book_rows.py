import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- Calling proc_AR_GetARBook for customer 147 ---")
        # CALL proc_AR_GetARBook(org_id, branch_id, customer_id, from_date, to_date)
        res = await db.execute(text("CALL btggasify_finance_live.proc_AR_GetARBook(1, 1, 147, NULL, NULL)"))
        rows = res.mappings().all()
        print(f"Total rows: {len(rows)}")
        for r in rows:
            print(dict(r))

if __name__ == "__main__":
    asyncio.run(run())
