"""
Initialize sample data for new STS ClearHub features
Adds sample sanctions lists, sanctioned vessels, and external integrations
"""

import asyncio
import logging
import sys
import uuid
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.database import get_async_session_factory, init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def initialize_sanctions_data():
    """Initialize sample sanctions lists and vessels"""
    logger.info("Initializing sanctions data...")
    
    session_factory = get_async_session_factory()
    
    async with session_factory() as session:
        # Check if data already exists
        result = await session.execute(text("SELECT COUNT(*) FROM sanctions_lists"))
        count = result.scalar()
        
        if count > 0:
            logger.info(f"Sanctions data already exists ({count} lists found)")
            return
        
        # Insert sanctions lists
        sanctions_lists = [
            {
                'id': str(uuid.uuid4()),
                'name': 'OFAC SDN List',
                'source': 'OFAC',
                'description': 'Office of Foreign Assets Control Specially Designated Nationals and Blocked Persons List',
                'api_url': 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV',
                'active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'UN Security Council Consolidated List',
                'source': 'UN',
                'description': 'United Nations Security Council Consolidated List',
                'api_url': 'https://scsanctions.un.org/resources/xml/en/consolidated.xml',
                'active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'EU Consolidated Financial Sanctions List',
                'source': 'EU',
                'description': 'European Union Consolidated List of Persons, Groups and Entities',
                'api_url': 'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content',
                'active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'UK Consolidated List',
                'source': 'UK-OFSI',
                'description': 'UK Office of Financial Sanctions Implementation Consolidated List',
                'api_url': 'https://ofsistorage.blob.core.windows.net/publishlive/ConList.csv',
                'active': True
            }
        ]
        
        for sanctions_list in sanctions_lists:
            await session.execute(text("""
                INSERT INTO sanctions_lists (id, name, source, description, api_url, active, created_at, last_updated)
                VALUES (:id, :name, :source, :description, :api_url, :active, :created_at, :last_updated)
            """), {
                **sanctions_list,
                'created_at': datetime.now(),
                'last_updated': datetime.now()
            })
        
        await session.commit()
        logger.info(f"✓ Added {len(sanctions_lists)} sanctions lists")
        
        # Add a few sample sanctioned vessels
        ofac_list_id = sanctions_lists[0]['id']
        
        sample_vessels = [
            {
                'id': str(uuid.uuid4()),
                'list_id': ofac_list_id,
                'imo': '8888888',
                'vessel_name': 'SANCTIONED VESSEL 1',
                'flag': 'Unknown',
                'owner': 'Sanctioned Entity Corp',
                'reason': 'Associated with sanctioned activities',
                'active': True
            },
            {
                'id': str(uuid.uuid4()),
                'list_id': ofac_list_id,
                'imo': '7777777',
                'vessel_name': 'BLOCKED TANKER',
                'flag': 'Unknown',
                'owner': 'Blocked Shipping LLC',
                'reason': 'Violation of international sanctions',
                'active': True
            }
        ]
        
        for vessel in sample_vessels:
            await session.execute(text("""
                INSERT INTO sanctioned_vessels 
                (id, list_id, imo, vessel_name, flag, owner, reason, active, date_added, last_verified)
                VALUES (:id, :list_id, :imo, :vessel_name, :flag, :owner, :reason, :active, :date_added, :last_verified)
            """), {
                **vessel,
                'date_added': datetime.now(),
                'last_verified': datetime.now()
            })
        
        await session.commit()
        logger.info(f"✓ Added {len(sample_vessels)} sample sanctioned vessels")


async def initialize_integrations_data():
    """Initialize sample external integrations"""
    logger.info("Initializing external integrations data...")
    
    session_factory = get_async_session_factory()
    
    async with session_factory() as session:
        # Check if data already exists
        result = await session.execute(text("SELECT COUNT(*) FROM external_integrations"))
        count = result.scalar()
        
        if count > 0:
            logger.info(f"Integration data already exists ({count} integrations found)")
            return
        
        # Insert external integrations
        integrations = [
            {
                'id': str(uuid.uuid4()),
                'name': 'Q88 Vessel Database',
                'provider': 'q88',
                'base_url': 'https://api.q88.com/v2',
                'enabled': False,
                'rate_limit': 100,
                'config': '{}'
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Equasis Vessel Information',
                'provider': 'equasis',
                'base_url': 'https://api.equasis.org/v1',
                'enabled': False,
                'rate_limit': 50,
                'config': '{}'
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'MarineTraffic API',
                'provider': 'marinetraffic',
                'base_url': 'https://api.marinetraffic.com/v1',
                'enabled': False,
                'rate_limit': 100,
                'config': '{}'
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'VesselFinder API',
                'provider': 'vesselfinder',
                'base_url': 'https://api.vesselfinder.com/v1',
                'enabled': False,
                'rate_limit': 100,
                'config': '{}'
            }
        ]
        
        for integration in integrations:
            await session.execute(text("""
                INSERT INTO external_integrations 
                (id, name, provider, base_url, enabled, rate_limit, config, created_at, updated_at)
                VALUES (:id, :name, :provider, :base_url, :enabled, :rate_limit, :config, :created_at, :updated_at)
            """), {
                **integration,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            })
        
        await session.commit()
        logger.info(f"✓ Added {len(integrations)} external integrations")


async def verify_sample_data():
    """Verify that sample data was added correctly"""
    logger.info("\nVerifying sample data...")
    
    session_factory = get_async_session_factory()
    
    async with session_factory() as session:
        # Check sanctions lists
        result = await session.execute(text("""
            SELECT name, source, active FROM sanctions_lists ORDER BY name
        """))
        lists = result.fetchall()
        
        logger.info(f"\nSanctions Lists ({len(lists)}):")
        for lst in lists:
            status = "✓" if lst[2] else "✗"
            logger.info(f"  {status} {lst[0]} ({lst[1]})")
        
        # Check sanctioned vessels
        result = await session.execute(text("""
            SELECT vessel_name, imo, flag FROM sanctioned_vessels ORDER BY vessel_name
        """))
        vessels = result.fetchall()
        
        logger.info(f"\nSanctioned Vessels ({len(vessels)}):")
        for vessel in vessels:
            logger.info(f"  - {vessel[0]} (IMO: {vessel[1]}, Flag: {vessel[2]})")
        
        # Check external integrations
        result = await session.execute(text("""
            SELECT name, provider, enabled FROM external_integrations ORDER BY name
        """))
        integrations = result.fetchall()
        
        logger.info(f"\nExternal Integrations ({len(integrations)}):")
        for integration in integrations:
            status = "✓ ENABLED" if integration[2] else "○ DISABLED"
            logger.info(f"  {status} {integration[0]} ({integration[1]})")


async def main():
    """Main initialization function"""
    logger.info("=" * 80)
    logger.info("INITIALIZING SAMPLE DATA FOR NEW FEATURES")
    logger.info("=" * 80)
    
    try:
        # Initialize database
        await init_db()
        logger.info("✓ Database initialized\n")
        
        # Initialize sample data
        await initialize_sanctions_data()
        await initialize_integrations_data()
        
        # Verify data
        await verify_sample_data()
        
        logger.info("\n" + "=" * 80)
        logger.info("✓ SAMPLE DATA INITIALIZATION COMPLETED SUCCESSFULLY")
        logger.info("=" * 80)
        
        return True
        
    except Exception as e:
        logger.error(f"\n✗ Sample data initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    
    if success:
        logger.info("\n✓ All sample data added successfully!")
        logger.info("\nYou can now:")
        logger.info("  1. Test sanctions screening with IMO: 8888888 or 7777777")
        logger.info("  2. Configure external integrations in the admin panel")
        logger.info("  3. Use the missing documents overview for all rooms")
        sys.exit(0)
    else:
        logger.error("\n✗ Failed to add sample data!")
        sys.exit(1)