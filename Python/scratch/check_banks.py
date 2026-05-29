import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT BankId, COA, AccountNumber FROM btg_masterpanel_uat.master_bank WHERE BankId IN (27, 34)"))
        for r in res.fetchall():
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
