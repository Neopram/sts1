#!/usr/bin/env python
"""
Simple server startup - skips problematic initialization
"""
import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import uvicorn
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    print("""
    ============================================================
                    STS CLEARANCE SYSTEM
                        Backend API
    ============================================================
    """)
    print("🚀 Starting STS Clearance API Server...")
    print("🌐 Server running at http://localhost:8001")
    
    # Run the server directly
    config = uvicorn.Config(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        log_level="info"
    )
    server = uvicorn.Server(config)
    import asyncio
    asyncio.run(server.serve())