import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Checking tbl_salesinvoices_header for 11137 ---")
        res3 = await db.execute(text("SELECT id, salesinvoicenbr, TotalAmount, PaidAmount, isactive FROM btggasify_live.tbl_salesinvoices_header WHERE id = 11137"))
        for row in res3:
            print(f"HDR: id={row[0]}, no='{row[1]}', amount={row[2]}, paid={row[3]}, isactive={row[4]}")
        break

if __name__ == "__main__":
    asyncio.run(main())
