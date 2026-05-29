import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SHOW CREATE PROCEDURE btggasify_finance_live.proc_finance_BankBook"))
        rows = res.fetchall()
        for r in rows:
            print(r[2])

if __name__ == "__main__":
    asyncio.run(main())
