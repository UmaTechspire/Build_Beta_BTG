import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Fetching TotalAmount ---")
        res = await db.execute(text("SELECT TotalAmount FROM btggasify_live.tbl_salesinvoices_header WHERE id = 10793"))
        total = res.scalar()
        
        print(f"Total Amount is {total}")
        
        if total is not None:
            print("--- Calling proc_CRUD_InsertARFromInvoice ---")
            await db.execute(text("CALL btggasify_finance_live.proc_CRUD_InsertARFromInvoice(1, 1, '1', 10793, 10793, :total, :total)"), {"total": total})
            await db.commit()
            print("Successfully inserted into AR")
        break

if __name__ == "__main__":
    asyncio.run(main())
