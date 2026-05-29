import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT TABLE_SCHEMA, TABLE_NAME FROM information_schema.tables WHERE TABLE_NAME LIKE '%bank_book%'"))
        rows = res.fetchall()
        print("TABLES:", [dict(r._mapping) for r in rows])

if __name__ == "__main__":
    asyncio.run(main())
