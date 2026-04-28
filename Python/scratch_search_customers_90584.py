import os
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv
import urllib.parse

load_dotenv(dotenv_path='Python/.env')

DB_USER = os.getenv('DB_USER')
DB_PASS = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

DB_PASS_QUOTED = urllib.parse.quote_plus(DB_PASS)

async def search_customers():
    url_live = f"mysql+aiomysql://{DB_USER}:{DB_PASS_QUOTED}@{DB_HOST}:{DB_PORT}/btggasify_live"
    engine_live = create_async_engine(url_live)
    
    try:
        async with engine_live.connect() as conn:
            print("--- Searching for Customers ---")
            res = await conn.execute(text("SELECT Id, CustomerName FROM master_customer WHERE CustomerName LIKE '%KARYA%TEKNIK%UTAMA%' OR CustomerName LIKE '%ROBINSON%SILALAHI%'"))
            for row in res.fetchall():
                print(row)
                
    finally:
        await engine_live.dispose()

if __name__ == "__main__":
    asyncio.run(search_customers())
