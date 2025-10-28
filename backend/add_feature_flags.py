"""
Script to add feature flags for new features
"""

import asyncio
import logging
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


async def add_feature_flags():
    """Add feature flags for new features"""
    try:
        logger.info("Adding feature flags...")
        
        # Initialize database
        await init_db()
        
        # Get session factory
        session_factory = get_async_session_factory()
        
        async with session_factory() as session:
            # Check if feature_flags table exists
            result = await session.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='feature_flags'
            """))
            
            table_exists = result.fetchone()
            
            if not table_exists:
                logger.info("Creating feature_flags table...")
                await session.execute(text("""
                    CREATE TABLE feature_flags (
                        key VARCHAR(100) PRIMARY KEY,
                        enabled BOOLEAN DEFAULT FALSE
                    )
                """))
                await session.commit()
            
            # Add feature flags for new features
            feature_flags = [
                ('sanctions_screening', True),
                ('vessel_integration', True),
                ('missing_documents_overview', True)
            ]
            
            for key, enabled in feature_flags:
                # Try to insert, if exists update
                try:
                    await session.execute(
                        text("INSERT INTO feature_flags (key, enabled) VALUES (:key, :enabled)"),
                        {"key": key, "enabled": enabled}
                    )
                    await session.commit()
                    logger.info(f"✓ Added feature flag: {key} = {enabled}")
                except Exception:
                    # If insert fails, update
                    await session.rollback()
                    await session.execute(
                        text("UPDATE feature_flags SET enabled = :enabled WHERE key = :key"),
                        {"key": key, "enabled": enabled}
                    )
                    await session.commit()
                    logger.info(f"✓ Updated feature flag: {key} = {enabled}")
            
            # Verify feature flags
            logger.info("\nVerifying all feature flags...")
            result = await session.execute(text("""
                SELECT key, enabled FROM feature_flags 
                ORDER BY key
            """))
            
            flags = result.fetchall()
            logger.info(f"Found {len(flags)} feature flags:")
            for flag in flags:
                status = "✓ ENABLED" if flag[1] else "✗ DISABLED"
                logger.info(f"  {status}: {flag[0]}")
            
            return True
            
    except Exception as e:
        logger.error(f"Failed to add feature flags: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(add_feature_flags())
    
    if success:
        logger.info("\n✓ Feature flags added successfully!")
        sys.exit(0)
    else:
        logger.error("\n✗ Failed to add feature flags!")
        sys.exit(1)