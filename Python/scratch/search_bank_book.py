import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        for table in ["tbl_posting", "tbl_journal_details", "tbl_ledger", "tbl_ledgerbook"]:
            print(f"--- Querying {table} ---")
            try:
                res = await conn.execute(text(f"""
                    SELECT * FROM btggasify_finance_live.{table} 
                    WHERE amount = 9590700000 
                       OR amount = 9590700000.00 
                       OR amount = 700000
                       OR amount = 700000.00
                """))
                rows = res.fetchall()
                print(f"Found {len(rows)} rows in {table}")
                for r in rows:
                    print(dict(r._mapping))
            except Exception as e:
                # Try with debit/credit or debit_amount/credit_amount if amount doesn't exist
                try:
                    res = await conn.execute(text(f"""
                        SELECT * FROM btggasify_finance_live.{table} 
                        WHERE debit = 9590700000 
                           OR credit = 9590700000
                           OR debit = 700000
                           OR credit = 700000
                    """))
                    rows = res.fetchall()
                    print(f"Found {len(rows)} rows in {table} (debit/credit)")
                    for r in rows:
                        print(dict(r._mapping))
                except Exception as e2:
                    print(f"Error querying {table}: {e2}")

if __name__ == "__main__":
    asyncio.run(main())
