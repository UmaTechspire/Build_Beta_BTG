import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Updating DOnumber to unhide invoice ---")
        await db.execute(text("UPDATE btggasify_live.tbl_salesinvoices_details SET DOnumber = 'M-92901' WHERE TRIM(DOnumber) = '92901'"))
        await db.commit()
        print("Updated DOnumber successfully!")
        break

if __name__ == "__main__":
    asyncio.run(main())
