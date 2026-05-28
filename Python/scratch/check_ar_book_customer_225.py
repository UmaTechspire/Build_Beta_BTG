import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        print("--- Calling proc_AR_GetARBook for customer 225 ---")
        res = await db.execute(text("CALL btggasify_finance_live.proc_AR_GetARBook(1, 1, 225, NULL, NULL)"))
        rows = res.mappings().all()
        print(f"Total rows returned: {len(rows)}")
        for r in rows:
            dict_r = dict(r)
            ledger_date_str = str(dict_r.get('ledger_date'))
            receipt_amount = float(dict_r.get('receipt_amount') or 0)
            invoice_amount = float(dict_r.get('invoice_amount') or 0)
            
            if '2026-01-01' in ledger_date_str or 464000000 in (receipt_amount, invoice_amount) or dict_r.get('invoice_no') == '90206':
                print("MATCHING ROW IN SP OUTPUT:")
                print(dict_r)

if __name__ == "__main__":
    asyncio.run(run())
