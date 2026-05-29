import asyncio
from app.database import async_session_maker
from sqlalchemy import text

async def main():
    async with async_session_maker() as db:
        res = await db.execute(text('DESCRIBE btggasify_finance_live.tbl_ar_receipt'))
        for row in res.fetchall():
            print(row)

asyncio.run(main())
