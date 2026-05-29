import asyncio
from sqlalchemy import text
from app.database import get_db

async def main():
    async for db in get_db():
        print("--- Fetching proc_Bank_GetReportTransactions ---")
        try:
            res = await db.execute(text("SHOW CREATE PROCEDURE btggasify_finance_live.proc_Bank_GetReportTransactions"))
            for row in res:
                print(row[2])
        except Exception as e:
            print("Error:", e)
        break

if __name__ == "__main__":
    asyncio.run(main())
