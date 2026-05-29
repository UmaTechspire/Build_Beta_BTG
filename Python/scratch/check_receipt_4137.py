import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT receipt_id, receipt_no, ar_id, payment_amount, is_grouped FROM btggasify_finance_live.tbl_ar_receipt WHERE receipt_id = 4137 OR receipt_no = '4137'"))
        rows = res.fetchall()
        print("tbl_ar_receipt 4137:", [dict(r._mapping) for r in rows])

        if rows:
            r_id = rows[0]._mapping['receipt_id']
            res2 = await conn.execute(text(f"SELECT * FROM btggasify_finance_live.tbl_receipt_ag_ar WHERE receipt_id = {r_id}"))
            ag_rows = res2.fetchall()
            print("tbl_receipt_ag_ar mapping:", [dict(r._mapping) for r in ag_rows])

if __name__ == "__main__":
    asyncio.run(main())
