"""
Migration script to add new features tables to STS ClearHub database
Adds support for: Sanctions Screening, Vessel Integrations, and Missing Documents Overview
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.database import get_async_session_factory, init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def run_migration():
    """Run the database migration"""
    try:
        logger.info("Starting database migration...")
        
        # Initialize database
        await init_db()
        logger.info("Database initialized")
        
        # Get session factory
        session_factory = get_async_session_factory()
        
        async with session_factory() as session:
            logger.info("Running migration script...")
            
            # Read migration SQL file
            migration_file = Path(__file__).parent / "migrations" / "add_new_features_tables.sql"
            
            if not migration_file.exists():
                logger.error(f"Migration file not found: {migration_file}")
                return False
            
            with open(migration_file, 'r') as f:
                migration_sql = f.read()
            
            # Split SQL into individual statements
            statements = [
                stmt.strip() 
                for stmt in migration_sql.split(';') 
                if stmt.strip() and not stmt.strip().startswith('--')
            ]
            
            # Execute each statement
            for i, statement in enumerate(statements, 1):
                # Skip comment-only lines
                if statement.startswith('--') or len(statement.strip()) == 0:
                    continue
                
                try:
                    logger.info(f"Executing statement {i}/{len(statements)}...")
                    await session.execute(text(statement))
                    await session.commit()
                except Exception as e:
                    logger.warning(f"Statement {i} warning: {e}")
                    # Continue with next statement even if one fails
                    await session.rollback()
            
            logger.info("Migration completed successfully!")
            
            # Verify tables were created
            logger.info("Verifying new tables...")
            result = await session.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN (
                    'sanctions_lists', 
                    'sanctioned_vessels', 
                    'external_integrations', 
                    'missing_documents_config'
                ) 
                ORDER BY name
            """))
            
            tables = result.fetchall()
            logger.info(f"Found {len(tables)} new tables:")
            for table in tables:
                logger.info(f"  ✓ {table[0]}")
            
            # Verify feature flags
            logger.info("Verifying feature flags...")
            result = await session.execute(text("""
                SELECT key, enabled FROM feature_flags 
                WHERE key IN (
                    'sanctions_screening', 
                    'vessel_integration', 
                    'missing_documents_overview'
                )
                ORDER BY key
            """))
            
            flags = result.fetchall()
            logger.info(f"Found {len(flags)} feature flags:")
            for flag in flags:
                status = "✓ ENABLED" if flag[1] else "✗ DISABLED"
                logger.info(f"  {status}: {flag[0]}")
            
            return True
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def rollback_migration():
    """Rollback the database migration (drop new tables)"""
    try:
        logger.info("Starting database rollback...")
        
        # Initialize database
        await init_db()
        
        # Get session factory
        session_factory = get_async_session_factory()
        
        async with session_factory() as session:
            logger.info("Dropping new tables...")
            
            # Drop tables in reverse order (respecting foreign keys)
            tables_to_drop = [
                'missing_documents_config',
                'external_integrations',
                'sanctioned_vessels',
                'sanctions_lists'
            ]
            
            for table in tables_to_drop:
                try:
                    logger.info(f"Dropping table: {table}")
                    await session.execute(text(f"DROP TABLE IF EXISTS {table}"))
                    await session.commit()
                except Exception as e:
                    logger.warning(f"Error dropping table {table}: {e}")
                    await session.rollback()
            
            # Remove feature flags
            logger.info("Removing feature flags...")
            await session.execute(text("""
                DELETE FROM feature_flags 
                WHERE key IN (
                    'sanctions_screening', 
                    'vessel_integration', 
                    'missing_documents_overview'
                )
            """))
            await session.commit()
            
            logger.info("Rollback completed successfully!")
            return True
            
    except Exception as e:
        logger.error(f"Rollback failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="STS ClearHub Database Migration")
    parser.add_argument(
        '--rollback', 
        action='store_true', 
        help='Rollback the migration (drop new tables)'
    )
    
    args = parser.parse_args()
    
    if args.rollback:
        logger.info("=" * 80)
        logger.info("ROLLBACK MODE: This will drop all new tables!")
        logger.info("=" * 80)
        input("Press Enter to continue or Ctrl+C to cancel...")
        success = asyncio.run(rollback_migration())
    else:
        logger.info("=" * 80)
        logger.info("MIGRATION MODE: Adding new features tables")
        logger.info("=" * 80)
        success = asyncio.run(run_migration())
    
    if success:
        logger.info("✓ Operation completed successfully!")
        sys.exit(0)
    else:
        logger.error("✗ Operation failed!")
        sys.exit(1)