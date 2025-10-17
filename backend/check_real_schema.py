#!/usr/bin/env python3
"""
Check real database schema for multi-vessel architecture
"""
import asyncio
from app.database import get_async_session
from sqlalchemy import text

async def check_real_schema():
    async for session in get_async_session():
        try:
            print('🔍 CHECKING REAL DATABASE SCHEMA...')

            # Check documents table
            try:
                result = await session.execute(text('PRAGMA table_info(documents)'))
                columns = result.fetchall()
                vessel_col = [col for col in columns if col[1] == 'vessel_id']
                print('📋 documents.vessel_id: EXISTS' if vessel_col else 'MISSING')
                if vessel_col:
                    print('   Column details:', vessel_col[0])
            except Exception as e:
                print('❌ Error checking documents:', e)

            # Check approvals table
            try:
                result = await session.execute(text('PRAGMA table_info(approvals)'))
                columns = result.fetchall()
                vessel_col = [col for col in columns if col[1] == 'vessel_id']
                print('📋 approvals.vessel_id: EXISTS' if vessel_col else 'MISSING')
                if vessel_col:
                    print('   Column details:', vessel_col[0])
            except Exception as e:
                print('❌ Error checking approvals:', e)

            # Check messages table
            try:
                result = await session.execute(text('PRAGMA table_info(messages)'))
                columns = result.fetchall()
                vessel_col = [col for col in columns if col[1] == 'vessel_id']
                print('📋 messages.vessel_id: EXISTS' if vessel_col else 'MISSING')
                if vessel_col:
                    print('   Column details:', vessel_col[0])
            except Exception as e:
                print('❌ Error checking messages:', e)

            # Check if vessel_pairs table exists
            try:
                result = await session.execute(text('SELECT name FROM sqlite_master WHERE type="table" AND name="vessel_pairs"'))
                exists = result.fetchone()
                print('📋 vessel_pairs table: EXISTS' if exists else 'MISSING')
            except Exception as e:
                print('❌ Error checking vessel_pairs:', e)

            # Check if weather_data table exists
            try:
                result = await session.execute(text('SELECT name FROM sqlite_master WHERE type="table" AND name="weather_data"'))
                exists = result.fetchone()
                print('📋 weather_data table: EXISTS' if exists else 'MISSING')
            except Exception as e:
                print('❌ Error checking weather_data:', e)

        except Exception as e:
            print('❌ Database connection error:', e)
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(check_real_schema())
