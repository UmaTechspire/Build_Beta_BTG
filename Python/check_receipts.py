import asyncio
import os
import sys

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from app.database import get_db, DB_NAME_FINANCE
from sqlalchemy import text

async def check_recent_receipts():
    async for db in get_db():
        sql = text(f"""
            SELECT receipt_id, ar_id, reference_no, cash_amount, created_date 
            FROM {DB_NAME_FINANCE}.tbl_ar_receipt 
            WHERE is_active = 1 
            ORDER BY receipt_id DESC 
            LIMIT 10
        """)
        result = await db.execute(sql)
        rows = result.mappings().all()
        for row in rows:
            print(f"ID: {row['receipt_id']}, AR_ID: {row['ar_id']}, Ref: {row['reference_no']}, Amt: {row['cash_amount']}, Date: {row['created_date']}")
        break

if __name__ == "__main__":
    asyncio.run(check_recent_receipts())
