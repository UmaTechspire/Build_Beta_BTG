import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SHOW TRIGGERS FROM btggasify_finance_live"))
        triggers = res.fetchall()
        for r in triggers:
            trigger_dict = dict(r._mapping)
            print(f"Trigger: {trigger_dict['Trigger']}, Event: {trigger_dict['Event']}, Table: {trigger_dict['Table']}")

if __name__ == "__main__":
    asyncio.run(main())
