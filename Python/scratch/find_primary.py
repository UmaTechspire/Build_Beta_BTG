import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Finding the Primary Invoice ---")
        # Check if there's any invoice modified around the same time
        res = await db.execute(text("""
            SELECT id, salesinvoicenbr, TotalAmount, isactive, LastModifiedDate 
            FROM btggasify_live.tbl_salesinvoices_header 
            WHERE LastModifiedDate >= '2026-05-11 16:35:00' 
              AND LastModifiedDate <= '2026-05-11 16:37:00'
              AND id != 10793
        """))
        for row in res:
            print(f"id={row[0]}, no={row[1]}, amount={row[2]}, isactive={row[3]}, mod={row[4]}")
        break

if __name__ == "__main__":
    asyncio.run(main())
