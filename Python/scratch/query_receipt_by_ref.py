import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE reference_no LIKE '%88765%' OR custom_voucher_no LIKE '%88765%'"))
        rows = res.fetchall()
        print("AR RECEIPTS by reference:", [dict(r._mapping) for r in rows])

if __name__ == "__main__":
    asyncio.run(main())
