import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SHOW CREATE PROCEDURE btggasify_finance_live.proc_AR_GetARBook"))
        row = res.fetchone()
        print(row._mapping["Create Procedure"])

if __name__ == "__main__":
    asyncio.run(main())
