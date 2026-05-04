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

async def check_proc():
    url = f"mysql+aiomysql://{DB_USER}:{DB_PASS_QUOTED}@{DB_HOST}:{DB_PORT}/{DB_NAME_FINANCE}"
    engine = create_async_engine(url)
    
    try:
        async with engine.connect() as conn:
            # Check ALL bank book related procedures
            for proc_name in ['proc_Bank_GetReportTransactions', 'proc_Bank_GetOpeningBalance']:
                print(f"\n--- {proc_name} ---")
                try:
                    res = await conn.execute(text(f"SHOW CREATE PROCEDURE {proc_name}"))
                    row = res.fetchone()
                    if row:
                        print(row[2])
                    else:
                        print("Not found")
                except Exception as e:
                    print(f"Error: {e}")

            # Also check what flags the "missing" entry (receipt_id=540) has
            print("\n--- Receipt 540 ---")
            res = await conn.execute(text("""
                SELECT receipt_id, transaction_type, bank_amount, deposit_bank_id, is_posted, pending_verification, is_submitted, is_active
                FROM tbl_ar_receipt
                WHERE receipt_id = 540
            """))
            for row in res.fetchall():
                print(dict(row._mapping))
                
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_proc())
