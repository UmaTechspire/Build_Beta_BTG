import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, salesinvoicesheaderid, DOnumber FROM btggasify_live.tbl_salesinvoices_details WHERE DOnumber = '90209'"))
        rows = res.fetchall()
        print("Details for DO 90209:", [dict(r._mapping) for r in rows])

if __name__ == "__main__":
    asyncio.run(main())
