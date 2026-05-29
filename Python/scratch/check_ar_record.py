import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Checking tbl_accounts_receivable ---")
        res2 = await db.execute(text("SELECT ar_id, invoice_id, invoice_no, is_active, invoice_date, customer_name, inv_amount FROM btggasify_finance_live.tbl_accounts_receivable WHERE invoice_id = 10793"))
        for row in res2:
            print(f"AR: ar_id={row[0]}, invoice_id={row[1]}, invoice_no={row[2]}, is_active={row[3]}, date={row[4]}, customer={row[5]}, amount={row[6]}")
        break

if __name__ == "__main__":
    asyncio.run(main())
