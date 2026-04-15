import asyncio
from sqlalchemy import text
from app.database import get_db, SessionLocal

async def check_columns():
    async with SessionLocal() as db:
        try:
            # Test call with dummy dates and bank_id
            sql = text("CALL proc_Bank_GetReportTransactions('2026-04-01', '2026-04-30', 1)")
            result = await db.execute(sql)
            row = result.mappings().first()
            if row:
                print("Columns in proc_Bank_GetReportTransactions:")
                print(list(row.keys()))
            else:
                print("No rows returned from proc_Bank_GetReportTransactions.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_columns())
