import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        print("--- Querying tbl_ar_receipt for amounts near 11,259,036,497.56 ---")
        res = await conn.execute(text("""
            SELECT *
            FROM btggasify_finance_live.tbl_ar_receipt 
            WHERE bank_amount BETWEEN 11250000000 AND 11260000000
               OR total_amount BETWEEN 11250000000 AND 11260000000
        """))
        for r in res.fetchall():
            print("Receipt:", dict(r._mapping))
            
        print("--- Querying tbl_posting for amounts near 11,259,036,497.56 ---")
        res = await conn.execute(text("""
            SELECT *
            FROM btggasify_finance_live.tbl_posting 
            WHERE amount BETWEEN 11250000000 AND 11260000000
        """))
        for r in res.fetchall():
            print("Posting:", dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
