import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT * FROM btggasify_finance_live.tbl_receipt_ag_ar WHERE invoice_id = '88765'"))
        rows = res.fetchall()
        print("AG AR RECEIPTS by invoice_id:", [dict(r._mapping) for r in rows])
        
        res = await conn.execute(text("SELECT * FROM btggasify_finance_live.tbl_receipt_ag_ar WHERE ar_no = '88765' OR invoice_no = '88765'"))
        rows = res.fetchall()
        print("AG AR RECEIPTS by ar_no/invoice_no:", [dict(r._mapping) for r in rows])

if __name__ == "__main__":
    asyncio.run(main())
