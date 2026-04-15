import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection_sync():
    return mysql.connector.connect( host=os.getenv('DB_HOST'), user=os.getenv('DB_USER'), password=os.getenv('DB_PASSWORD'), database=os.getenv('DB_NAME_FINANCE', 'btggasify_finance_live'), port=int(os.getenv('DB_PORT', 3306)) )

try:
    conn = get_db_connection_sync()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("DESCRIBE tbl_claimAndpayment_Details")
    for row in cursor.fetchall():
        print(f"{row['Field']}")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
