import json

def main():
    with open("scratch/corrupted_invoices.json", "r") as f:
        data = json.load(f)
    
    md = "# Corrupted Invoices (Amount Received > 0 but No Receipt Found)\n\n"
    md += "| Invoice No | Customer Name | Invoice Amount | Already Received | Balance Amount | Created IP (Source) |\n"
    md += "|---|---|---|---|---|---|\n"
    
    for row in data:
        md += f"| {row['invoice_no']} | {row['customer_name']} | {row['inv_amount']} | {row['already_received']} | {row['balance_amount']} | {row['created_ip']} |\n"
    
    with open("scratch/corrupted_invoices.md", "w") as f:
        f.write(md)

if __name__ == "__main__":
    main()
