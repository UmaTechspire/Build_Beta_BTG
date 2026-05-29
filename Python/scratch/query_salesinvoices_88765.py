import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, salesinvoicenbr, Salesinvoicesdate, TotalAmount, CustomerId, IsActive FROM btggasify_live.tbl_salesinvoices_header WHERE salesinvoicenbr = '88765' OR id = '88765'"))
        rows = res.fetchall()
        print("INVOICES:", [dict(r._mapping) for r in rows])

if __name__ == "__main__":
    asyncio.run(main())
