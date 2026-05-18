import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as session:
        sql = """
        SELECT receipt_date, cash_amount, reference_no, transaction_type 
        FROM btggasify_finance_live.tbl_ar_receipt 
        WHERE DATE(COALESCE(receipt_date, created_date)) < '2026-01-01'
        AND is_active = 1
        AND (is_posted = 1 OR IFNULL(is_submitted, 0) = 1)
        AND cash_amount != 0
        AND (deposit_bank_id IS NULL OR deposit_bank_id = '' OR deposit_bank_id = '0')
        ORDER BY receipt_date ASC
        """
        result = await session.execute(text(sql))
        rows = result.mappings().all()
        total = 0
        for row in rows:
            print(dict(row))
            total += row['cash_amount']
        
        print(f"Total from ar_receipt before Jan 1st: {total}")
        
        sql_ppp = """
        SELECT DATE(CreatedDate) as created, NetCashWithdraw
        FROM btggasify_finance_live.tbl_PaymentSummary_header
        WHERE DATE(CreatedDate) < '2026-01-01'
        AND NetCashWithdraw > 0
        """
        result_ppp = await session.execute(text(sql_ppp))
        rows_ppp = result_ppp.mappings().all()
        total_ppp = 0
        for row in rows_ppp:
            print(f"PPP row: {dict(row)}")
            total_ppp += row['NetCashWithdraw']
            
        print(f"Total from PPP before Jan 1st: {total_ppp}")
        print(f"Grand Total: {total + total_ppp}")

if __name__ == "__main__":
    asyncio.run(run())
