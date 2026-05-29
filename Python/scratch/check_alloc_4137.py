import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("CALL btggasify_finance_live.proc_AR_GetOutstandingInvoices(379, 4137, NULL, NULL)"))
        rows = res.fetchall()
        print("Outstanding invoices with allocation:")
        for r in rows:
            mapped = dict(r._mapping)
            if mapped.get('allocated_here', 0) > 0:
                print(mapped)

if __name__ == "__main__":
    asyncio.run(main())
