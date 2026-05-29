import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, salesinvoicesheaderid, DOnumber FROM btggasify_live.tbl_salesinvoices_details WHERE TRIM(DOnumber) = '88765'"))
        rows = res.fetchall()
        print("DETAILS WITH DOnumber 88765:", [dict(r._mapping) for r in rows])

if __name__ == "__main__":
    asyncio.run(main())
