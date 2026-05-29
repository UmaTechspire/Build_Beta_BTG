import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("CALL proc_DSI_GetHeader('90684')"))
        rows = res.fetchall()
        print("proc_DSI_GetHeader 90684:")
        for r in rows:
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
