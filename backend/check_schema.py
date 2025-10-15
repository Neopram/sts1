import asyncio
from app.database import get_async_session
from sqlalchemy import text

async def check_schema():
    async for session in get_async_session():
        try:
            # Check all required tables exist
            tables = ['users', 'rooms', 'parties', 'document_types', 'vessels',
                     'documents', 'approvals', 'messages', 'vessel_pairs',
                     'weather_data', 'activity_log', 'notifications',
                     'document_versions', 'feature_flags', 'user_settings', 'snapshots']

            for table in tables:
                result = await session.execute(text(f'SELECT name FROM sqlite_master WHERE type="table" AND name="{table}"'))
                exists = result.fetchone()
                print(f'✅ Table {table}: {"EXISTS" if exists else "MISSING"}')

            # Check vessel_id columns exist
            vessel_tables = ['documents', 'approvals', 'messages']
            for table in vessel_tables:
                result = await session.execute(text(f'PRAGMA table_info({table})'))
                columns = result.fetchall()
                vessel_col = [col for col in columns if col[1] == 'vessel_id']
                print(f'✅ {table}.vessel_id: {"EXISTS" if vessel_col else "MISSING"}')

            break
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(check_schema())
