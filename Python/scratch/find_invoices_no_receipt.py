import asyncio
import json
from sqlalchemy import text
from app.database import engine

async def main():
    query = """
    SELECT 
        ar.ar_id, 
        ar.invoice_no, 
        ar.customer_name, 
        ar.inv_amount, 
        ar.already_received, 
        ar.balance_amount, 
        ar.created_ip,
        ar.created_date
    FROM btggasify_finance_live.tbl_accounts_receivable ar
    WHERE ar.already_received > 0
      AND ar.is_active = 1
      AND NOT EXISTS (
          SELECT 1 FROM btggasify_finance_live.tbl_ar_receipt r WHERE r.ar_id = ar.ar_id AND r.is_active = 1
      )
      AND NOT EXISTS (
          SELECT 1 FROM btggasify_finance_live.tbl_receipt_ag_ar ra WHERE ra.ar_id = ar.ar_id AND ra.is_active = 1
      )
      AND NOT EXISTS (
          SELECT 1 FROM btggasify_finance_live.credit_invoice ci WHERE ci.InvoiceNo = ar.invoice_no
      )
      AND NOT EXISTS (
          SELECT 1 FROM btggasify_finance_live.debit_invoice di WHERE di.InvoiceNo = ar.invoice_no
      )
    ORDER BY ar.created_date DESC;
    """
    
    async with engine.connect() as conn:
        res = await conn.execute(text(query))
        rows = res.fetchall()
        
        results = []
        for r in rows:
            results.append({
                "ar_id": r._mapping["ar_id"],
                "invoice_no": r._mapping["invoice_no"],
                "customer_name": r._mapping["customer_name"],
                "inv_amount": float(r._mapping["inv_amount"] or 0),
                "already_received": float(r._mapping["already_received"] or 0),
                "balance_amount": float(r._mapping["balance_amount"] or 0),
                "created_ip": r._mapping["created_ip"],
                "created_date": str(r._mapping["created_date"])
            })
            
        with open("scratch/corrupted_invoices.json", "w") as f:
            json.dump(results, f, indent=4)
        
        print(f"Found {len(results)} invoices without receipts.")

if __name__ == "__main__":
    asyncio.run(main())
