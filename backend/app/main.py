"""
Main FastAPI application for STS Clearance system
Enhanced with enterprise-grade security and monitoring
Production-ready with centralized configuration
"""

import asyncio
import logging
import os
import time
from pathlib import Path

import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.database import close_db, get_async_session_factory, init_db
from app.database_optimization import DatabaseOptimizer
from app.init_data import main as init_data
from app.middleware.auth import AuthMiddleware
from app.middleware.rate_limiter import RateLimiter, RateLimitMiddleware
from app.middleware.caching import get_cache_stats, clear_cache
from app.config.settings import Settings, Environment
from app.security_initialization import initialize_security_middleware, initialize_security_headers, get_security_configuration
from app.monitoring.performance import HealthChecker, PerformanceMonitor
from app.routers import (activities, approval_matrix, approvals, auth, cache_management, cockpit, config,
                         documents, files, historical_access, messages, notifications, profile, regional_operations, rooms,
                         search, settings, snapshots, stats, users, vessels, weather, vessel_sessions, websocket,
                         sanctions, vessel_integrations, missing_documents, email_settings, totp_settings, 
                         login_tracking, backup_settings, advanced_export)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize Settings
app_settings = Settings()

# Create FastAPI app
app = FastAPI(
    title="STS Clearance API",
    description="Missing & Expiring Documents Cockpit for STS operations - Production Ready",
    version="3.0.0",
    debug=app_settings.debug,
)

# Global variables for monitoring and security
redis_client = None
performance_monitor = None
health_checker = None
db_optimizer = None

# ============ SECURITY INITIALIZATION ============
# Initialize all security middleware using centralized configuration
initialize_security_middleware(app, app_settings)
initialize_security_headers(app, app_settings)

logger.info(f"🚀 STS Clearance API v3.0.0 starting in {app_settings.environment.value} mode")
logger.info(f"🔒 Security Configuration: {get_security_configuration(app_settings)}")


# Caching middleware removed - using endpoint-level caching instead

# Add request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Include routers
app.include_router(cockpit.router)
app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(documents.router)
app.include_router(messages.router)
app.include_router(approvals.router)
app.include_router(approval_matrix.router)
app.include_router(notifications.router)
app.include_router(vessels.router)
app.include_router(weather.router)
app.include_router(vessel_sessions.router)
app.include_router(historical_access.router)
app.include_router(regional_operations.router)
app.include_router(snapshots.router)
app.include_router(activities.router)
app.include_router(files.router)
app.include_router(stats.router)
app.include_router(search.router)
app.include_router(config.router)
app.include_router(cache_management.router)
app.include_router(websocket.router)
app.include_router(users.router)
app.include_router(settings.router)
app.include_router(profile.router)
app.include_router(sanctions.router)
app.include_router(vessel_integrations.router)
app.include_router(missing_documents.router)

# Phase 2 Routers
app.include_router(email_settings.router)
app.include_router(totp_settings.router)
app.include_router(login_tracking.router)
app.include_router(backup_settings.router)
app.include_router(advanced_export.router)


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint - API information
    """
    return {
        "name": "STS Clearance API",
        "version": "1.0.0",
        "description": "Ship-to-Ship Transfer Operations Management System",
        "status": "operational",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/api/v1/stats/system/health",
            "auth": "/api/v1/auth",
            "rooms": "/api/v1/rooms",
            "websocket": "/ws",
        },
    }


# Create uploads directory if it doesn't exist
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# File serving endpoint
@app.get("/api/v1/files/{file_path:path}")
async def serve_file(file_path: str):
    """
    Serve uploaded files
    """
    full_path = uploads_dir / file_path

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(full_path),
        filename=full_path.name,
        media_type="application/octet-stream",
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    global redis_client, performance_monitor, health_checker, db_optimizer

    logging.info("Starting STS Clearance API v2.0 - Production Ready...")

    try:
        # Initialize database
        await init_db()
        logging.info("Database initialized successfully")

        # Initialize sample data
        try:
            await init_data()
            logging.info("Sample data initialized successfully")
        except Exception as e:
            logging.warning(f"Could not initialize sample data: {e}")

        # Initialize Redis connection
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        redis_client = redis.from_url(redis_url, decode_responses=True)
        await redis_client.ping()
        logging.info("Redis connection established")

        # Initialize session factory
        session_factory = get_async_session_factory()

        # Initialize database optimizer
        db_optimizer = DatabaseOptimizer(session_factory)
        await db_optimizer.create_strategic_indexes()
        logging.info("Database optimization completed")

        # Initialize performance monitoring
        performance_monitor = PerformanceMonitor(redis_client, session_factory)
        health_checker = HealthChecker(redis_client, session_factory)
        logging.info("Performance monitoring initialized")

        # Add security middleware for production
        # if os.getenv("ENVIRONMENT", "development") == "production":
        #     security_middleware = SecurityMiddleware(redis_client)
        #     app.add_middleware(SecurityMiddleware, redis_client=redis_client)
        #     logging.info("Production security middleware enabled")

        # Start background monitoring task
        asyncio.create_task(monitoring_background_task())
        logging.info("Background monitoring task started")

        logging.info("STS Clearance API startup completed successfully")

    except Exception as e:
        logging.error(f"Failed to initialize application: {e}")
        raise


async def monitoring_background_task():
    """Background task for continuous performance monitoring"""
    while True:
        try:
            if performance_monitor:
                await performance_monitor.run_monitoring_cycle()
            await asyncio.sleep(60)  # Run every minute
        except Exception as e:
            logging.error(f"Error in monitoring background task: {e}")
            await asyncio.sleep(60)


# Optimized health check endpoint (single, fast version)
@app.get("/health")
async def health_check():
    """Ultra-fast health check endpoint - optimized for minimal response time"""
    return {"status": "healthy"}


# Enhanced health check endpoint
@app.get("/api/v1/health/detailed")
async def detailed_health_check():
    """Comprehensive health check with component status"""
    if health_checker:
        return await health_checker.get_overall_health()
    else:
        return {"status": "initializing", "message": "Health checker not ready"}


# Performance metrics endpoint
@app.get("/api/v1/metrics/summary")
async def get_metrics_summary(hours: int = 1):
    """Get performance metrics summary"""
    if performance_monitor:
        return await performance_monitor.get_metrics_summary(hours)
    else:
        return {"error": "Performance monitor not initialized"}


# Database performance endpoint
@app.get("/api/v1/database/performance")
async def get_database_performance():
    """Get database performance analysis"""
    if db_optimizer:
        return await db_optimizer.analyze_query_performance()
    else:
        return {"error": "Database optimizer not initialized"}

# Cache endpoints moved to cache_management router


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    global redis_client

    logging.info("Shutting down STS Clearance API...")

    try:
        # Close database connections
        await close_db()
        logging.info("Database connections closed")

        # Close Redis connection
        if redis_client:
            await redis_client.close()
            logging.info("Redis connection closed")

    except Exception as e:
        logging.error(f"Error during shutdown: {e}")

    logging.info("STS Clearance API shutdown completed")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
