import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/..")
from app.database import SessionLocal, DB_NAME_FINANCE

async def run():
    async with SessionLocal() as session:
        # Check tbl_ar_receipt for any PPP entries
        sql = f"""
            SELECT receipt_id, reference_no, transaction_type, cash_amount
            FROM {DB_NAME_FINANCE}.tbl_ar_receipt
            WHERE reference_no LIKE 'PPP%'
               OR reference_no LIKE '%0000053%'
        """
        res = await session.execute(text(sql))
        rows = res.mappings().all()
        print("Matching rows in tbl_ar_receipt:")
        for r in rows:
            print(dict(r))

        # Check what proc_Cash_GetReport returns for 2026-05-23
        print("\n--- Running proc_Cash_GetReport ---")
        sql_proc = f"CALL {DB_NAME_FINANCE}.proc_Cash_GetReport('2026-05-01', '2026-05-23', 0, 0)"
        res_proc = await session.execute(text(sql_proc))
        rows_proc = res_proc.mappings().all()
        print("Rows from proc_Cash_GetReport:")
        for r in rows_proc:
            if 'PPP' in str(r.get('VoucherNo')) or '0000053' in str(r.get('VoucherNo')):
                print(dict(r))

if __name__ == "__main__":
    asyncio.run(run())
