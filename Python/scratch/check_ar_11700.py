import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT * FROM btggasify_finance_live.tbl_accounts_receivable WHERE ar_id = 11700"))
        rows = res.fetchall()
        print("tbl_accounts_receivable 11700:")
        for r in rows:
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
