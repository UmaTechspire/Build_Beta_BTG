import mysql.connector

c = mysql.connector.connect(
    host='76.13.18.34',
    user='btgsogdbu53r',
    password='FM0ipR$Zrt9eM',
    database='btggasify_purchase_live'
)
cursor = c.cursor(dictionary=True)

# Find poid for PO0002685 and PO0002685-1
cursor.execute("SELECT poid, pono FROM tbl_purchaseorder_header WHERE pono IN ('PO0002685', 'PO0002685-1')")
pos = cursor.fetchall()
print("POs:", pos)

# Check if there are GRNs for these poid
for po in pos:
    cursor.execute("SELECT grnid, poid FROM tbl_grn_detail WHERE poid = %s", (po['poid'],))
    grns = cursor.fetchall()
    print(f"GRNs for {po['pono']} (poid: {po['poid']}):", grns)
