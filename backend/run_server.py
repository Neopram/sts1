import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
Run the STS Clearance API server with automatic database initialization
"""

import asyncio
import uvicorn
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.database import init_db
from app.init_data import main as init_data

async def setup_and_run():
    """Setup database and run server"""
    print("🚀 Starting STS Clearance API Server...")
    
    try:
        # Initialize database
        print("📊 Initializing database...")
        await init_db()
        
        # Initialize sample data
        print("📝 Initializing sample data...")
        await init_data()
        
        print("✅ Database setup completed!")
        print("🌐 Starting web server...")
        
        # Run the server
        config = uvicorn.Config(
            "app.main:app",
            host="0.0.0.0",
            port=8001,
            reload=True,
            log_level="info"
        )
        server = uvicorn.Server(config)
        await server.serve()
        
    except Exception as e:
        print(f"❌ Error during startup: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("""
    ============================================================
                    STS CLEARANCE SYSTEM
                        Backend API
    ============================================================
      Ship-to-Ship Transfer Operations Management
      Document Management & Approval Workflow
      Real-time Chat & Notifications
      Vessel Management & Tracking
      Activity Logs & Audit Trail
      Status Snapshots & Reports
    ============================================================
    """)
    
    asyncio.run(setup_and_run())