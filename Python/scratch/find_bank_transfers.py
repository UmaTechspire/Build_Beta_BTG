import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        print("--- Querying tbl_ar_receipt for bank transfers ---")
        res = await conn.execute(text("""
            SELECT receipt_id, transaction_type, receipt_date, bank_amount, 
                   deposit_bank_id, customer_id, reference_no, is_posted, is_active
            FROM btggasify_finance_live.tbl_ar_receipt 
            WHERE LOWER(transaction_type) = 'bank transfer'
            ORDER BY receipt_id DESC LIMIT 50
        """))
        for r in res.fetchall():
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
