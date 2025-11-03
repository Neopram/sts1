#!/usr/bin/env python3
"""
PHASE 4 Migration: Add is_public column to messages table
Enables public/private message distinction in chat
"""

import os
import sys
import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate_phase4():
    """Add is_public column to messages table"""
    async with engine.begin() as connection:
        try:
            # Check if column already exists
            result = await connection.execute(
                text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name='messages' AND column_name='is_public'
                """)
            )
            
            if result.fetchone():
                print("✅ Column 'is_public' already exists in messages table")
                return
            
            # Add the column
            await connection.execute(
                text("""
                ALTER TABLE messages 
                ADD COLUMN is_public BOOLEAN DEFAULT TRUE NOT NULL
                """)
            )
            
            print("✅ Successfully added 'is_public' column to messages table")
            print("   - Column type: BOOLEAN")
            print("   - Default value: TRUE (public messages by default)")
            
            # Verify
            result = await connection.execute(
                text("SELECT COUNT(*) FROM messages")
            )
            count = result.scalar()
            print(f"   - Total messages in database: {count}")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            raise

if __name__ == '__main__':
    print("🔄 PHASE 4 Message Visibility Migration")
    print("=" * 50)
    
    try:
        asyncio.run(migrate_phase4())
        print("\n✅ Migration completed successfully!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)