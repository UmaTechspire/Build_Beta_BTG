import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        print("--- Querying tbl_ar_receipt for any records matching 9590700000 (even inactive) ---")
        res = await conn.execute(text("""
            SELECT *
            FROM btggasify_finance_live.tbl_ar_receipt 
            WHERE bank_amount BETWEEN 9590000000 AND 9600000000
               OR bank_amount BETWEEN -9600000000 AND -9590000000
               OR total_amount BETWEEN 9590000000 AND 9600000000
               OR total_amount BETWEEN -9600000000 AND -9590000000
               OR cash_amount BETWEEN 9590000000 AND 9600000000
               OR cash_amount BETWEEN -9600000000 AND -9590000000
        """))
        for r in res.fetchall():
            print("Receipt:", dict(r._mapping))
            
        print("--- Querying tbl_posting for any records matching 9590700000 ---")
        res = await conn.execute(text("""
            SELECT *
            FROM btggasify_finance_live.tbl_posting 
            WHERE amount BETWEEN 9590000000 AND 9600000000
               OR amount BETWEEN -9600000000 AND -9590000000
        """))
        for r in res.fetchall():
            print("Posting:", dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
