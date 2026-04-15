import asyncio
from sqlalchemy import text
from app.database import get_db, SessionLocal, DB_NAME_FINANCE

async def check_receipt_columns():
    async with SessionLocal() as db:
        try:
            sql = text(f"DESCRIBE {DB_NAME_FINANCE}.tbl_ar_receipt")
            result = await db.execute(sql)
            rows = result.mappings().all()
            for row in rows:
                print(f"{row['Field']}: {row['Type']}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_receipt_columns())
