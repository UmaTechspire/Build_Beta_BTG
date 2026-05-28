import asyncio
import os
import sys
from fastapi.encoders import jsonable_encoder

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.routers.journal import get_party_list

async def run():
    async with SessionLocal() as db:
        try:
            print("Calling get_party_list('customer', db)...")
            res = await get_party_list('customer', db)
            print("Attempting to serialize using jsonable_encoder...")
            serialized = jsonable_encoder(res)
            print("Successfully serialized!")
            print(f"Sample data row: {serialized['data'][0]}")
        except Exception as e:
            import traceback
            print("Exception occurred:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run())
