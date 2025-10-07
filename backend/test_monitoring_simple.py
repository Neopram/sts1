#!/usr/bin/env python3
"""
Simple test to verify the monitoring system works after SQLite fixes
"""

import asyncio
import sys
import os

from app.monitoring.performance import PerformanceMonitor
from app.database import get_async_session
import redis.asyncio as redis

async def test_database_metrics():
    """Test just the database metrics collection that was failing"""
    print("🔍 Testing Database Metrics Collection (SQLite compatibility)...")
    
    try:
        # Setup Redis connection
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        redis_client = redis.from_url(redis_url)
        
        # Setup database session factory
        session_factory = get_async_session
        
        # Create performance monitor
        monitor = PerformanceMonitor(redis_client, session_factory)
        
        print("✅ Performance monitor created successfully")
        
        # Test database metrics collection (this was failing before)
        print("\n🗄️ Testing database metrics collection...")
        db_metrics = await monitor.collect_database_metrics()
        print(f"✅ SUCCESS: Collected {len(db_metrics)} database metrics")
        
        # Show the metrics collected
        print("\n📊 Database metrics collected:")
        for i, metric in enumerate(db_metrics):
            print(f"  {i+1}. {metric.name}: {metric.value} {metric.unit}")
        
        await redis_client.close()
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_database_metrics())
    print(f"\n{'🎉 TEST PASSED' if success else '❌ TEST FAILED'}")
    sys.exit(0 if success else 1)