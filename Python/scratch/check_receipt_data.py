import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- Checking tbl_ar_receipt for receipt_id = 6747 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE receipt_id = 6747"))
        receipts = res.mappings().all()
        print(f"Receipts with ID 6747 count: {len(receipts)}")
        for r in receipts:
            print("Receipt 6747:", dict(r))
            
        print("\n--- Checking all receipts for customer_id = 147 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE customer_id = 147"))
        cust_receipts = res.mappings().all()
        print(f"Total receipts for customer 147: {len(cust_receipts)}")
        for r in cust_receipts[:10]:
            print("Receipt Row:", dict(r))
            
        print("\n--- Checking tbl_receipt_ag_ar for ar_id = 11205 (invoice 6747) ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_receipt_ag_ar WHERE ar_id = 11205"))
        allocations = res.mappings().all()
        print(f"Allocations count for ar_id 11205: {len(allocations)}")
        for a in allocations:
            print("Allocation Row:", dict(a))
            
        print("\n--- Checking tbl_receipt_ag_ar for receipt_id = 6747 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_receipt_ag_ar WHERE receipt_id = 6747"))
        allocations_6747 = res.mappings().all()
        print(f"Allocations count for receipt_id 6747: {len(allocations_6747)}")
        for a in allocations_6747:
            print("Allocation 6747 Row:", dict(a))

if __name__ == "__main__":
    asyncio.run(run())
