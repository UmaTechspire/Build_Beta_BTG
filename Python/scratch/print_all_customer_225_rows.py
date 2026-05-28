import asyncio
import os
import sys
import json
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal

async def run():
    async with SessionLocal() as db:
        res = await db.execute(text("CALL btggasify_finance_live.proc_AR_GetARBook(1, 1, 225, NULL, NULL)"))
        rows = res.mappings().all()
        
        # Serialize with simple types
        output_rows = []
        for r in rows:
            dict_r = {}
            for k, v in r.items():
                if hasattr(v, 'isoformat'):
                    dict_r[k] = v.isoformat()
                elif hasattr(v, 'to_eng_string'):
                    dict_r[k] = float(v)
                else:
                    dict_r[k] = v
            output_rows.append(dict_r)
            
        with open("scratch/arbook_rows_225.json", "w") as f:
            json.dump(output_rows, f, indent=2)
        print(f"Wrote {len(output_rows)} rows to scratch/arbook_rows_225.json")

if __name__ == "__main__":
    asyncio.run(run())
