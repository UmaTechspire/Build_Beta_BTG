import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Fixing Cash Deposit signs ---")
        stmt = text("""
            UPDATE btggasify_finance_live.tbl_ar_receipt 
            SET cash_amount = -ABS(cash_amount) 
            WHERE LOWER(transaction_type) = 'cash deposit' 
              AND cash_amount > 0
        """)
        await db.execute(stmt)
        await db.commit()
        print("Fixed existing Cash Deposit transactions in DB.")
        break

if __name__ == "__main__":
    asyncio.run(main())
