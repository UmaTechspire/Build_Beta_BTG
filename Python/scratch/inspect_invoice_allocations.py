import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- Inspecting tbl_receipt_ag_ar for ar_id = 5621 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_receipt_ag_ar WHERE ar_id = 5621"))
        allocations = res.mappings().all()
        print(f"Allocations count: {len(allocations)}")
        for a in allocations:
            print("Allocation:", dict(a))
            # Fetch receipt details
            r_res = await db.execute(text(f"SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE receipt_id = {a['receipt_id']}"))
            print("  Receipt:", r_res.mappings().all())

if __name__ == "__main__":
    asyncio.run(run())
