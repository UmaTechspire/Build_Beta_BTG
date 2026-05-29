import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Checking tbl_ar_receipt for CLM0003959 ---")
        res = await db.execute(text("SELECT receipt_id, reference_no, receipt_date, created_date, transaction_type, bank_amount, cash_amount, deposit_bank_id FROM btggasify_finance_live.tbl_ar_receipt WHERE reference_no LIKE '%CLM0003959%'"))
        for row in res:
            print(f"Receipt: {dict(row)}")
            
        print("--- Checking Cash Deposit ---")
        res2 = await db.execute(text("SELECT receipt_id, reference_no, receipt_date, created_date, transaction_type, bank_amount, cash_amount, deposit_bank_id FROM btggasify_finance_live.tbl_ar_receipt WHERE LOWER(transaction_type) LIKE '%deposit%' ORDER BY receipt_id DESC LIMIT 5"))
        for row in res2:
            print(f"Deposit: {dict(row)}")
        break

if __name__ == "__main__":
    asyncio.run(main())
