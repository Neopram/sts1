"""
Test script for new STS ClearHub features
Tests: Sanctions Screening, Vessel Integrations, and Missing Documents Overview
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text, select
from app.database import get_async_session_factory, init_db
from app.models import (
    SanctionsList, SanctionedVessel, ExternalIntegration, 
    MissingDocumentsConfig, User
)
from app.services.sanctions_service import sanctions_service
from app.services.vessel_integration_service import vessel_integration_service
from app.services.missing_documents_service import missing_documents_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def test_database_tables():
    """Test that all new tables were created correctly"""
    logger.info("=" * 80)
    logger.info("TEST 1: Database Tables")
    logger.info("=" * 80)
    
    try:
        await init_db()
        session_factory = get_async_session_factory()
        
        async with session_factory() as session:
            # Check if tables exist
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
            
            if len(tables) == 4:
                logger.info("✓ All 4 tables exist:")
                for table in tables:
                    logger.info(f"  ✓ {table[0]}")
                return True
            else:
                logger.error(f"✗ Expected 4 tables, found {len(tables)}")
                return False
                
    except Exception as e:
        logger.error(f"✗ Database test failed: {e}")
        return False


async def test_sanctions_service():
    """Test the sanctions service"""
    logger.info("\n" + "=" * 80)
    logger.info("TEST 2: Sanctions Service")
    logger.info("=" * 80)
    
    try:
        await init_db()
        session_factory = get_async_session_factory()
        
        async with session_factory() as session:
            # Test getting sanctions lists
            logger.info("Testing get_all_sanctions_lists...")
            lists = await sanctions_service.get_all_sanctions_lists(session)
            logger.info(f"✓ Found {len(lists)} sanctions lists")
            
            for lst in lists:
                logger.info(f"  - {lst['name']} ({lst['source']})")
            
            # Test checking a vessel (should not be sanctioned)
            logger.info("\nTesting check_vessel_sanctions...")
            test_imo = "9123456"
            is_sanctioned, details = await sanctions_service.check_vessel_sanctions(test_imo, session)
            
            if is_sanctioned:
                logger.info(f"✓ Vessel {test_imo} is on sanctions list: {details}")
            else:
                logger.info(f"✓ Vessel {test_imo} is NOT on sanctions list")
            
            # Test bulk check
            logger.info("\nTesting bulk_check_vessels...")
            test_imos = ["9123456", "9234567", "9345678"]
            results = await sanctions_service.bulk_check_vessels(test_imos, session)
            logger.info(f"✓ Bulk checked {len(results)} vessels")
            
            return True
            
    except Exception as e:
        logger.error(f"✗ Sanctions service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_vessel_integration_service():
    """Test the vessel integration service"""
    logger.info("\n" + "=" * 80)
    logger.info("TEST 3: Vessel Integration Service")
    logger.info("=" * 80)
    
    try:
        await init_db()
        session_factory = get_async_session_factory()
        
        async with session_factory() as session:
            # Test getting all integrations
            logger.info("Testing get_all_integrations...")
            integrations = await vessel_integration_service.get_all_integrations(session)
            logger.info(f"✓ Found {len(integrations)} external integrations")
            
            for integration in integrations:
                status = "ENABLED" if integration['enabled'] else "DISABLED"
                logger.info(f"  - {integration['name']} ({integration['provider']}) - {status}")
            
            # Test getting vessel details
            logger.info("\nTesting get_vessel_details...")
            test_imo = "9123456"
            details = await vessel_integration_service.get_vessel_details(test_imo, "q88", session)
            
            if details:
                logger.info(f"✓ Got vessel details for IMO {test_imo}:")
                logger.info(f"  - Name: {details['name']}")
                logger.info(f"  - Type: {details['vessel_type']}")
                logger.info(f"  - Flag: {details['flag']}")
            else:
                logger.warning(f"✗ No details found for vessel {test_imo}")
            
            # Test searching vessels
            logger.info("\nTesting search_vessels...")
            search_query = "DEMO"
            results = await vessel_integration_service.search_vessels(search_query, "q88", session)
            logger.info(f"✓ Found {len(results)} vessels matching '{search_query}'")
            
            for vessel in results[:3]:  # Show first 3
                logger.info(f"  - {vessel['name']} (IMO: {vessel['imo']})")
            
            return True
            
    except Exception as e:
        logger.error(f"✗ Vessel integration service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_missing_documents_service():
    """Test the missing documents service"""
    logger.info("\n" + "=" * 80)
    logger.info("TEST 4: Missing Documents Service")
    logger.info("=" * 80)
    
    try:
        await init_db()
        session_factory = get_async_session_factory()
        
        async with session_factory() as session:
            # Get first user from database
            result = await session.execute(select(User).limit(1))
            user = result.scalar_one_or_none()
            
            if not user:
                logger.warning("✗ No users found in database, skipping user-specific tests")
                return True
            
            user_email = user.email
            logger.info(f"Testing with user: {user_email}")
            
            # Test getting user config
            logger.info("\nTesting _get_user_config...")
            config = await missing_documents_service._get_user_config(user_email, session)
            
            if config:
                logger.info(f"✓ Found user config: {config}")
            else:
                logger.info("✓ No user config found (expected for new users)")
            
            # Test updating user config
            logger.info("\nTesting update_user_config...")
            new_config = {
                "auto_refresh": True,
                "refresh_interval": 60,
                "default_sort": "priority",
                "default_filter": "all",
                "show_notifications": True
            }
            
            updated_config = await missing_documents_service.update_user_config(
                user_email, new_config, session
            )
            
            if updated_config:
                logger.info("✓ User config created/updated successfully:")
                logger.info(f"  - Auto refresh: {updated_config['auto_refresh']}")
                logger.info(f"  - Refresh interval: {updated_config['refresh_interval']}s")
                logger.info(f"  - Default sort: {updated_config['default_sort']}")
            
            # Test getting missing documents overview
            logger.info("\nTesting get_missing_documents_overview...")
            overview = await missing_documents_service.get_missing_documents_overview(
                user_email=user_email,
                session=session
            )
            
            if "error" not in overview:
                stats = overview.get("statistics", {})
                logger.info("✓ Got missing documents overview:")
                logger.info(f"  - Total documents: {stats.get('total_documents', 0)}")
                logger.info(f"  - Total missing: {stats.get('total_missing', 0)}")
                logger.info(f"  - Total expiring: {stats.get('total_expiring', 0)}")
                logger.info(f"  - Completion: {stats.get('completion_percentage', 0)}%")
            else:
                logger.warning(f"✗ Overview returned error: {overview['error']}")
            
            return True
            
    except Exception as e:
        logger.error(f"✗ Missing documents service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_feature_flags():
    """Test that feature flags are enabled"""
    logger.info("\n" + "=" * 80)
    logger.info("TEST 5: Feature Flags")
    logger.info("=" * 80)
    
    try:
        await init_db()
        session_factory = get_async_session_factory()
        
        async with session_factory() as session:
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
            
            all_enabled = True
            for flag in flags:
                status = "✓ ENABLED" if flag[1] else "✗ DISABLED"
                logger.info(f"  {status}: {flag[0]}")
                if not flag[1]:
                    all_enabled = False
            
            if all_enabled and len(flags) == 3:
                logger.info("✓ All feature flags are enabled")
                return True
            else:
                logger.error("✗ Some feature flags are missing or disabled")
                return False
                
    except Exception as e:
        logger.error(f"✗ Feature flags test failed: {e}")
        return False


async def run_all_tests():
    """Run all tests"""
    logger.info("\n" + "╔" + "=" * 78 + "╗")
    logger.info("║" + " " * 15 + "STS CLEARHUB NEW FEATURES TEST SUITE" + " " * 25 + "║")
    logger.info("╚" + "=" * 78 + "╝\n")
    
    results = {
        "Database Tables": await test_database_tables(),
        "Sanctions Service": await test_sanctions_service(),
        "Vessel Integration Service": await test_vessel_integration_service(),
        "Missing Documents Service": await test_missing_documents_service(),
        "Feature Flags": await test_feature_flags()
    }
    
    # Summary
    logger.info("\n" + "╔" + "=" * 78 + "╗")
    logger.info("║" + " " * 30 + "TEST SUMMARY" + " " * 34 + "║")
    logger.info("╠" + "=" * 78 + "╣")
    
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        logger.info(f"║  {status}  │  {test_name:<65}║")
    
    logger.info("╠" + "=" * 78 + "╣")
    logger.info(f"║  Total: {passed_tests}/{total_tests} tests passed" + " " * (57 - len(str(passed_tests)) - len(str(total_tests))) + "║")
    logger.info("╚" + "=" * 78 + "╝\n")
    
    return passed_tests == total_tests


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    
    if success:
        logger.info("✓ ALL TESTS PASSED!")
        sys.exit(0)
    else:
        logger.error("✗ SOME TESTS FAILED!")
        sys.exit(1)