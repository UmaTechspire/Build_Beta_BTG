import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT * FROM btggasify_finance_live.tbl_accounts_receivable WHERE invoice_no = '88765'"))
        row = res.fetchone()
        print("AR ROW:", dict(row._mapping))
        
        ar_id = row._mapping['ar_id']
        
        res2 = await conn.execute(text(f"SELECT * FROM btggasify_finance_live.tbl_ar_receipt WHERE ar_id = {ar_id}"))
        rows = res2.fetchall()
        print("AR RECEIPTS:", [dict(r._mapping) for r in rows])
        
        res3 = await conn.execute(text(f"SELECT * FROM btggasify_finance_live.tbl_receipt_ag_ar WHERE ar_id = {ar_id}"))
        rows3 = res3.fetchall()
        print("AG AR RECEIPTS:", [dict(r._mapping) for r in rows3])

if __name__ == "__main__":
    asyncio.run(main())
