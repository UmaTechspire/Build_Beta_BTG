import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("CALL proc_DSI_GetDetails(8591)"))
        rows = res.fetchall()
        print("Details for InvoiceId 8591 (90684):")
        for r in rows:
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
