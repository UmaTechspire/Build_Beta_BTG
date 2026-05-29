import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- tbl_accounts_receivable by invoice_id ---")
        res = await db.execute(text("SELECT * FROM btggasify_finance_live.tbl_accounts_receivable WHERE invoice_id = 10793"))
        keys = res.keys()
        for row in res:
            for k, v in zip(keys, row):
                print(f"{k}: {v}")
        break

if __name__ == "__main__":
    asyncio.run(main())
