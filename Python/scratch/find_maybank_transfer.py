import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        print("--- Querying tbl_ar_receipt for any maybank/13701 references or matching amounts ---")
        res = await conn.execute(text("""
            SELECT * FROM btggasify_finance_live.tbl_ar_receipt 
            WHERE reference_no LIKE '%13701%'
               OR reference_no LIKE '%Maybank%'
               OR reference_no LIKE '%SGD%'
               OR reference_no LIKE '%IDR%'
               OR reference_no LIKE '%700%'
               OR bank_amount IN (9590700000, -9590700000, 11259036497.56, -11259036497.56, 700000, -700000)
            ORDER BY receipt_id DESC
        """))
        rows = res.fetchall()
        print(f"Found {len(rows)} matching receipts:")
        for r in rows:
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
