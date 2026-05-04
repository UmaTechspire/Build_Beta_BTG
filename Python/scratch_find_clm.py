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

async def find_clm():
    url = f"mysql+aiomysql://{DB_USER}:{DB_PASS_QUOTED}@{DB_HOST}:{DB_PORT}/{DB_NAME_FINANCE}"
    engine = create_async_engine(url)
    
    try:
        async with engine.connect() as conn:
            print("\n--- tbl_ar_receipt entries referencing CLM0002122 ---")
            res = await conn.execute(text("""
                SELECT receipt_id, transaction_type, reference_no, ar_id, cash_amount, bank_amount, 
                       is_posted, is_submitted, is_active, created_date
                FROM tbl_ar_receipt
                WHERE (ar_id IN (
                    SELECT Claim_ID FROM tbl_claimAndpayment_header WHERE ApplicationNo = 'CLM0002122'
                ) OR LOWER(reference_no) LIKE '%clm0002122%')
                ORDER BY receipt_id DESC
            """))
            rows = res.fetchall()
            if not rows:
                print("No receipt found for CLM0002122")
            for row in rows:
                print(dict(row._mapping))
                
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(find_clm())
