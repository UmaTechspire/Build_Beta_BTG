import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- Customer 147 details ---")
        res = await db.execute(text("SELECT Id, CustomerName FROM btggasify_live.master_customer WHERE Id = 147"))
        print(res.mappings().all())

        print("--- Customer 226 details ---")
        res = await db.execute(text("SELECT Id, CustomerName FROM btggasify_live.master_customer WHERE Id = 226"))
        print(res.mappings().all())

        print("--- Search for KARYA TEKNIK UTAMA ---")
        res = await db.execute(text("SELECT Id, CustomerName FROM btggasify_live.master_customer WHERE CustomerName LIKE '%KARYA TEKNIK UTAMA%'"))
        print(res.mappings().all())

        print("--- Search for receipt with ID 5622 ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE receipt_id = 5622"))
        print(res.mappings().all())

if __name__ == "__main__":
    asyncio.run(run())
