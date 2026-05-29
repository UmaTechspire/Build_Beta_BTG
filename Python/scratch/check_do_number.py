import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Checking tbl_salesinvoices_details for DOnumber = 92901 ---")
        res = await db.execute(text("SELECT id, salesinvoicesheaderid, DOnumber FROM btggasify_live.tbl_salesinvoices_details WHERE TRIM(DOnumber) = '92901' LIMIT 5"))
        for row in res:
            print(f"Details: id={row[0]}, headerid={row[1]}, DOnumber='{row[2]}'")
        break

if __name__ == "__main__":
    asyncio.run(main())
