"""
Database optimization utilities for STS Clearance Hub
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)


class DatabaseOptimizer:
    """Database optimization and performance monitoring"""

    def __init__(self, session_factory: sessionmaker):
        self.session_factory = session_factory

    async def create_strategic_indexes(self):
        """Create strategic indexes for better query performance"""
        async with self.session_factory() as session:
            try:
                # Create indexes for frequently queried columns
                indexes = [
                    "CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by)",
                    "CREATE INDEX IF NOT EXISTS idx_rooms_sts_eta ON rooms(sts_eta)",
                    "CREATE INDEX IF NOT EXISTS idx_parties_email ON parties(email)",
                    "CREATE INDEX IF NOT EXISTS idx_parties_room_id ON parties(room_id)",
                    "CREATE INDEX IF NOT EXISTS idx_documents_room_id ON documents(room_id)",
                    "CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)",
                    "CREATE INDEX IF NOT EXISTS idx_documents_expires_on ON documents(expires_on)",
                    "CREATE INDEX IF NOT EXISTS idx_activity_log_room_id ON activity_log(room_id)",
                    "CREATE INDEX IF NOT EXISTS idx_activity_log_ts ON activity_log(ts)",
                    "CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id)",
                    "CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)",
                    "CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email)",
                    "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)",
                    "CREATE INDEX IF NOT EXISTS idx_vessels_room_id ON vessels(room_id)",
                    "CREATE INDEX IF NOT EXISTS idx_vessels_imo ON vessels(imo)",
                ]

                for index_sql in indexes:
                    try:
                        await session.execute(text(index_sql))
                        logger.info(f"Created index: {index_sql}")
                    except Exception as e:
                        logger.warning(f"Failed to create index {index_sql}: {e}")

                await session.commit()
                logger.info("Database optimization completed")

            except Exception as e:
                logger.error(f"Error during database optimization: {e}")
                await session.rollback()
                raise

    async def analyze_query_performance(self) -> Dict[str, Any]:
        """Analyze database query performance"""
        async with self.session_factory() as session:
            try:
                # Get table sizes
                table_sizes = {}
                tables = ["rooms", "parties", "documents", "activity_log", "messages", "notifications", "vessels"]
                
                for table in tables:
                    result = await session.execute(
                        text(f"SELECT COUNT(*) as count FROM {table}")
                    )
                    count = result.scalar()
                    table_sizes[table] = count

                # Get slow queries (if available)
                slow_queries = []
                try:
                    result = await session.execute(
                        text("""
                            SELECT query, calls, mean_exec_time 
                            FROM pg_stat_statements 
                            WHERE mean_exec_time > 100 
                            ORDER BY mean_exec_time DESC 
                            LIMIT 5
                        """)
                    )
                    slow_queries = [dict(row) for row in result]
                except Exception:
                    # pg_stat_statements not available (SQLite)
                    pass

                return {
                    "table_sizes": table_sizes,
                    "slow_queries": slow_queries,
                    "optimization_status": "completed"
                }

            except Exception as e:
                logger.error(f"Error analyzing query performance: {e}")
                return {
                    "error": str(e),
                    "table_sizes": {},
                    "slow_queries": [],
                    "optimization_status": "failed"
                }

    async def cleanup_old_data(self, days_to_keep: int = 90):
        """Clean up old data to maintain performance"""
        async with self.session_factory() as session:
            try:
                # Clean up old activity logs
                await session.execute(
                    text("""
                        DELETE FROM activity_log 
                        WHERE ts < datetime('now', '-{} days')
                    """.format(days_to_keep))
                )

                # Clean up old notifications
                await session.execute(
                    text("""
                        DELETE FROM notifications 
                        WHERE read = 1 AND created_at < datetime('now', '-{} days')
                    """.format(days_to_keep))
                )

                await session.commit()
                logger.info(f"Cleaned up data older than {days_to_keep} days")

            except Exception as e:
                logger.error(f"Error during data cleanup: {e}")
                await session.rollback()
                raise

    async def get_database_stats(self) -> Dict[str, Any]:
        """Get comprehensive database statistics"""
        async with self.session_factory() as session:
            try:
                stats = {}
                
                # Get table statistics
                tables = ["rooms", "parties", "documents", "activity_log", "messages", "notifications", "vessels"]
                
                for table in tables:
                    result = await session.execute(
                        text(f"SELECT COUNT(*) as count FROM {table}")
                    )
                    stats[f"{table}_count"] = result.scalar()

                # Get recent activity
                result = await session.execute(
                    text("""
                        SELECT COUNT(*) as recent_activities
                        FROM activity_log 
                        WHERE ts > datetime('now', '-24 hours')
                    """)
                )
                stats["recent_activities_24h"] = result.scalar()

                return stats

            except Exception as e:
                logger.error(f"Error getting database stats: {e}")
                return {"error": str(e)}
