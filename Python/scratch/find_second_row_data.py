import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        print("--- 1. List all banks to identify BCA ---")
        res = await conn.execute(text("SELECT BankId, BankName, Description FROM btggasify_masterpanel_live.master_bank"))
        for b in res.fetchall():
            print(dict(b._mapping))
            
        print("\n--- 2. Find exact customer by name 'KARYA TEKNIK UTAMA LOK TANJUNG RIAU PT' ---")
        res = await conn.execute(text("""
            SELECT Id, CustomerName FROM btggasify_live.master_customer 
            WHERE CustomerName LIKE '%KARYA TEKNIK%' OR CustomerName LIKE '%TANJUNG RIAU%'
        """))
        for c in res.fetchall():
            print(dict(c._mapping))
            
        print("\n--- 3. Query tbl_ar_receipt for any transaction with bank_amount containing '700' and '640' ---")
        res = await conn.execute(text("""
            SELECT receipt_id, transaction_type, receipt_date, created_date, bank_amount, 
                   deposit_bank_id, customer_id, reference_no, is_posted, is_active
            FROM btggasify_finance_live.tbl_ar_receipt 
            WHERE bank_amount LIKE '%700640%' OR bank_amount LIKE '%70064%'
        """))
        for r in res.fetchall():
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
