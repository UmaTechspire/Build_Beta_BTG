import asyncio
import os
import sys

# Add parent dir to path to import app module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        print("Checking tbl_ar_receipt for May 19th & 20th 2026...")
        
        # Query 1: All records on 2026-05-19 and 2026-05-20
        query1 = text("""
            SELECT receipt_id, receipt_date, created_date, deposit_bank_id, is_active, is_posted, bank_amount, reference_no, transaction_type
            FROM tbl_ar_receipt
            WHERE DATE(COALESCE(receipt_date, created_date)) BETWEEN '2026-05-19' AND '2026-05-20'
        """)
        
        result1 = await conn.execute(query1)
        rows1 = result1.fetchall()
        print(f"Total raw rows in date range: {len(rows1)}")
        for r in rows1:
            print(dict(r._mapping))

        # Query 2: Call the stored procedure for May 1st to May 20th for a given bank_id
        query_banks = text("SELECT * FROM btggasify_masterpanel_live.master_bank LIMIT 5")
        res_banks = await conn.execute(query_banks)
        banks = res_banks.fetchall()
        print("\nBanks (first 5):")
        for b in banks:
            print(dict(b._mapping))
            
        # Let's run proc_Bank_GetReportTransactions for each bank that might be OCBC
        ocbc_ids = [b.BankId for b in banks if "OCBC" in b.BankName]
        for bid in ocbc_ids:
            print(f"\nCalling proc_Bank_GetReportTransactions for bank_id={bid} with range 2026-05-01 to 2026-05-20:")
            try:
                proc_query = text("CALL proc_Bank_GetReportTransactions('2026-05-01', '2026-05-20', :bid)")
                res_proc = await conn.execute(proc_query)
                proc_rows = res_proc.fetchall()
                print(f"Returned {len(proc_rows)} rows:")
                for r in proc_rows:
                    print(dict(r._mapping))
            except Exception as e:
                print(f"Proc error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
