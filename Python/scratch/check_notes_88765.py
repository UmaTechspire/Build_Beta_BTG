import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT * FROM btggasify_finance_live.credit_invoice WHERE InvoiceNo = '88765'"))
        rows = res.fetchall()
        print("CREDIT INVOICE:", [dict(r._mapping) for r in rows])
        
        res = await conn.execute(text("SELECT * FROM btggasify_finance_live.debit_invoice WHERE InvoiceNo = '88765'"))
        rows = res.fetchall()
        print("DEBIT INVOICE:", [dict(r._mapping) for r in rows])

if __name__ == "__main__":
    asyncio.run(main())
