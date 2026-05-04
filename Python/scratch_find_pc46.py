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

async def find_pc_46():
    url = f"mysql+aiomysql://{DB_USER}:{DB_PASS_QUOTED}@{DB_HOST}:{DB_PORT}/{DB_NAME_FINANCE}"
    engine = create_async_engine(url)
    
    try:
        async with engine.connect() as conn:
            print("\n--- tbl_ar_receipt entries for PC000046 (CLM0001739) ---")
            res = await conn.execute(text("""
                SELECT receipt_id, reference_no, is_active
                FROM tbl_ar_receipt
                WHERE reference_no LIKE '%CLM0001739%'
            """))
            for row in res.fetchall():
                print(dict(row._mapping))
                
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(find_pc_46())
