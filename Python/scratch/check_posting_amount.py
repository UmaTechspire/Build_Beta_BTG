import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT * FROM btggasify_finance_live.tbl_posting WHERE amount = 9590700000"))
        rows = res.fetchall()
        for r in rows:
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
