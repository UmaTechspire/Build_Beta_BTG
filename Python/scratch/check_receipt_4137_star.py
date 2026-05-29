import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE receipt_id = 4137 OR receipt_no = '4137'"))
        rows = res.fetchall()
        print("tbl_ar_receipt 4137:")
        for r in rows:
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
