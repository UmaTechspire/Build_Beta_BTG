import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Finding the 80,640,000.00 invoice ---")
        res3 = await db.execute(text("SELECT id, salesinvoicenbr, TotalAmount, isactive FROM btggasify_live.tbl_salesinvoices_header WHERE TotalAmount = 80640000.00 AND Salesinvoicesdate = '2026-04-28'"))
        for row in res3:
            print(f"HDR: id={row[0]}, no='{row[1]}', amount={row[2]}, isactive={row[3]}")
        break

if __name__ == "__main__":
    asyncio.run(main())
