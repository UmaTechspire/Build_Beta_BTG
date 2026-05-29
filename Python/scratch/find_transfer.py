import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        print("--- Querying tbl_posting for amounts near 9,590,700,000 ---")
        res = await conn.execute(text("""
            SELECT * FROM btggasify_finance_live.tbl_posting 
            WHERE amount = 9590700000 
               OR amount = 9590700000.00 
               OR currency_amount = 9590700000 
               OR amount = 700000 
               OR currency_amount = 700000
        """))
        for r in res.fetchall():
            print("Posting:", dict(r._mapping))
            
        print("--- Querying tbl_ar_receipt for amounts near 9,590,700,000 ---")
        res = await conn.execute(text("""
            SELECT * FROM btggasify_finance_live.tbl_ar_receipt 
            WHERE bank_amount = 9590700000 
               OR bank_amount = 9590700000.00 
               OR cash_amount = 9590700000 
               OR bank_amount = 700000 
               OR cash_amount = 700000
        """))
        for r in res.fetchall():
            print("Receipt:", dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
