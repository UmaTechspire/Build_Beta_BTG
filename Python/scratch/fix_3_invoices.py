import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        query = """
        UPDATE btggasify_finance_live.tbl_accounts_receivable ar
        SET ar.already_received = 0.00, ar.balance_amount = ar.inv_amount
        WHERE ar.invoice_no IN ('88765', '89351', '87286');
        """
        res = await conn.execute(text(query))
        print(f"Successfully updated {res.rowcount} invoices.")
        
        # Verify changes
        check_query = """
        SELECT invoice_no, inv_amount, already_received, balance_amount
        FROM btggasify_finance_live.tbl_accounts_receivable
        WHERE invoice_no IN ('88765', '89351', '87286');
        """
        check_res = await conn.execute(text(check_query))
        rows = check_res.fetchall()
        print("Updated records:", [dict(r._mapping) for r in rows])

if __name__ == "__main__":
    asyncio.run(main())
