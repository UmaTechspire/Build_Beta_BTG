import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- Finding rows in tbl_ar_receipt containing 6747 ---")
        # Get column names first
        columns_res = await db.execute(text("DESCRIBE btggasify_finance_live.tbl_ar_receipt"))
        columns = [col[0] for col in columns_res.all()]
        
        # Build query searching all columns
        conditions = []
        for col in columns:
            conditions.append(f"CAST({col} AS CHAR) LIKE '%6747%'")
        query_str = f"SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE {' OR '.join(conditions)}"
        
        res = await db.execute(text(query_str))
        rows = res.mappings().all()
        print(f"Found {len(rows)} matching rows:")
        for r in rows:
            print(dict(r))

if __name__ == "__main__":
    asyncio.run(run())
