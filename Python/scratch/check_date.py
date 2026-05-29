import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Checking tbl_ar_receipt for 2026-05-26 ---")
        res = await db.execute(text("SELECT receipt_id, transaction_type, bank_amount, cash_amount, deposit_bank_id FROM btggasify_finance_live.tbl_ar_receipt WHERE DATE(COALESCE(receipt_date, created_date)) = '2026-05-26'"))
        for row in res:
            print(f"Receipt: {dict(row)}")
        break

if __name__ == "__main__":
    asyncio.run(main())
