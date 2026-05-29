import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("CALL btggasify_finance_live.proc_AR_GetOutstandingInvoices(310, NULL, NULL, NULL)"))
        rows = res.fetchall()
        print("OUTSTANDING INVOICES FOR 310:")
        for r in rows:
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
