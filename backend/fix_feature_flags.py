#!/usr/bin/env python
"""
Fix missing feature flags in the database
This script ensures all required feature flags exist and are enabled
"""

import asyncio
import logging
from sqlalchemy import text, select

from app.database import AsyncSessionLocal
from app.models import FeatureFlag

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# List of required feature flags
REQUIRED_FLAGS = {
    "cockpit_missing_expiring_docs": "Enable Missing & Expiring Documents Cockpit (Snapshots)",
    "approvals_workflow": "Enable approval workflow functionality",
    "document_expiry_alerts": "Enable document expiry alert notifications",
    "vessel_isolation": "Enable vessel data isolation per user role",
    "pdf_generation": "Enable PDF generation and snapshot functionality",
    "analytics_dashboard": "Enable analytics and reporting dashboard",
}


async def ensure_feature_flags_table():
    """Ensure the feature_flags table exists"""
    session = AsyncSessionLocal()
    try:
        # Try to query the table - if it fails, create it
        await session.execute(text('SELECT 1 FROM feature_flags LIMIT 1'))
        logger.info("✅ feature_flags table already exists")
    except Exception as e:
        logger.info(f"⚠️  feature_flags table doesn't exist, creating... Error was: {e}")
        try:
            await session.execute(text('''
                CREATE TABLE feature_flags (
                    key VARCHAR(100) PRIMARY KEY,
                    enabled BOOLEAN NOT NULL DEFAULT 1
                )
            '''))
            await session.commit()
            logger.info("✅ feature_flags table created successfully")
        except Exception as create_error:
            logger.error(f"❌ Failed to create feature_flags table: {create_error}")
            await session.rollback()
            raise
    finally:
        await session.close()


async def ensure_feature_flags_exist():
    """Ensure all required feature flags exist and are enabled"""
    session = AsyncSessionLocal()
    try:
        for key, description in REQUIRED_FLAGS.items():
            # Check if flag exists
            result = await session.execute(
                select(FeatureFlag).where(FeatureFlag.key == key)
            )
            flag = result.scalar_one_or_none()
            
            if flag:
                if flag.enabled:
                    logger.info(f"✅ {key}: already enabled")
                else:
                    logger.info(f"⚠️  {key}: disabled, enabling...")
                    flag.enabled = True
                    session.add(flag)
            else:
                logger.info(f"🆕 {key}: creating...")
                new_flag = FeatureFlag(key=key, enabled=True)
                session.add(new_flag)
        
        await session.commit()
        logger.info("✅ All feature flags verified and synchronized")
        
    except Exception as e:
        logger.error(f"❌ Error managing feature flags: {e}")
        await session.rollback()
        raise
    finally:
        await session.close()


async def print_feature_flags_status():
    """Print the current status of all feature flags"""
    session = AsyncSessionLocal()
    try:
        result = await session.execute(select(FeatureFlag))
        flags = result.scalars().all()
        
        if not flags:
            logger.info("⚠️  No feature flags found in database")
            return
        
        logger.info("\n" + "="*70)
        logger.info("FEATURE FLAGS STATUS")
        logger.info("="*70)
        
        for flag in flags:
            status = "✅ ENABLED" if flag.enabled else "⚠️  DISABLED"
            logger.info(f"{status}: {flag.key}")
        
        logger.info("="*70 + "\n")
        
    except Exception as e:
        logger.error(f"❌ Error reading feature flags: {e}")
    finally:
        await session.close()


async def main():
    """Main function to fix all feature flags"""
    logger.info("🔧 Starting feature flag synchronization...\n")
    
    # Step 1: Ensure table exists
    await ensure_feature_flags_table()
    logger.info("")
    
    # Step 2: Ensure all required flags exist and are enabled
    await ensure_feature_flags_exist()
    logger.info("")
    
    # Step 3: Print status
    await print_feature_flags_status()
    
    logger.info("🎉 Feature flag synchronization complete!")


if __name__ == "__main__":
    asyncio.run(main())