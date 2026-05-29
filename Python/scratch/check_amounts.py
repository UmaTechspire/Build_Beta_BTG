import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT * FROM btggasify_finance_live.tbl_posting WHERE amount IN (9590700000.00, 11259036497.56) OR balance = 11259036497.56 OR currency_amount = 11259036497.56 OR amount > 11250000000 AND amount < 11260000000 LIMIT 10"))
        rows = res.fetchall()
        for r in rows:
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
