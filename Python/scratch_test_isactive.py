import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv
import urllib.parse

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASSWORD")
DB_PORT = os.getenv("DB_PORT")
DB_NAME_FINANCE = os.getenv("DB_NAME_FINANCE", "btggasify_finance_live")
DB_PASS_QUOTED = urllib.parse.quote_plus(DB_PASS)

async def test_query():
    url = f"mysql+aiomysql://{DB_USER}:{DB_PASS_QUOTED}@{DB_HOST}:{DB_PORT}/{DB_NAME_FINANCE}"
    engine = create_async_engine(url)
    
    try:
        async with engine.connect() as conn:
            try:
                res = await conn.execute(text("SELECT COUNT(*) FROM tbl_petty_cash WHERE isactive = 1"))
                print(f"Count with isactive=1: {res.scalar()}")
            except Exception as e:
                print(f"Query failed: {e}")
                
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_query())
