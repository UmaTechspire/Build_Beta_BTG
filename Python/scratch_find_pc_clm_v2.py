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

async def find_pc():
    url = f"mysql+aiomysql://{DB_USER}:{DB_PASS_QUOTED}@{DB_HOST}:{DB_PORT}/{DB_NAME_FINANCE}"
    engine = create_async_engine(url)
    
    try:
        async with engine.connect() as conn:
            print("\n--- tbl_petty_cash entries referencing CLM0002122 ---")
            res = await conn.execute(text("""
                SELECT PettyCashId, pc_number, VoucherNo, ExpenseDescription, Amount, IsSubmitted, CreatedAt
                FROM tbl_petty_cash
                WHERE (VoucherNo LIKE '%CLM0002122%' OR ExpenseDescription LIKE '%CLM0002122%')
                ORDER BY PettyCashId DESC
            """))
            rows = res.fetchall()
            if not rows:
                print("No petty cash records found for CLM0002122")
            for row in rows:
                print(dict(row._mapping))
                
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(find_pc())
