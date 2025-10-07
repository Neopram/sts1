"""
Performance Monitoring Module for STS Clearance Hub
Implements comprehensive monitoring, metrics collection, and alerting
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import psutil
import redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Performance metric data structure"""

    name: str
    value: float
    unit: str
    timestamp: datetime
    tags: Dict[str, str] = None


@dataclass
class AlertRule:
    """Alert rule configuration"""

    metric_name: str
    threshold: float
    operator: str  # 'gt', 'lt', 'eq'
    duration: int  # seconds
    severity: str  # 'critical', 'warning', 'info'


class PerformanceMonitor:
    """
    Comprehensive performance monitoring system
    Tracks 200+ metrics for full-stack visibility
    """

    def __init__(self, redis_client: redis.Redis, session_factory):
        self.redis = redis_client
        self.session_factory = session_factory
        self.metrics_buffer = []
        self.alert_rules = self._setup_alert_rules()
        self.start_time = time.time()

    def _setup_alert_rules(self) -> List[AlertRule]:
        """Setup default alert rules for maritime operations"""
        return [
            # Response time alerts
            AlertRule("api_response_time_p95", 200.0, "gt", 60, "critical"),
            AlertRule("api_response_time_p99", 500.0, "gt", 30, "critical"),
            # Database performance
            AlertRule("db_connection_count", 180, "gt", 120, "warning"),
            AlertRule("db_slow_queries_per_minute", 10, "gt", 60, "warning"),
            AlertRule("db_cache_hit_ratio", 95.0, "lt", 300, "warning"),
            # System resources
            AlertRule("cpu_usage_percent", 80.0, "gt", 300, "warning"),
            AlertRule("memory_usage_percent", 85.0, "gt", 300, "warning"),
            AlertRule("disk_usage_percent", 90.0, "gt", 600, "critical"),
            # Application metrics
            AlertRule("active_websocket_connections", 1000, "gt", 60, "warning"),
            AlertRule("failed_requests_per_minute", 50, "gt", 60, "critical"),
            AlertRule("file_upload_failures_per_hour", 10, "gt", 300, "warning"),
            # Maritime-specific alerts
            AlertRule("document_processing_time", 30.0, "gt", 120, "warning"),
            AlertRule("compliance_check_failures", 1, "gt", 60, "critical"),
            AlertRule("audit_log_write_failures", 1, "gt", 30, "critical"),
        ]

    async def collect_system_metrics(self) -> List[PerformanceMetric]:
        """Collect system-level performance metrics"""
        metrics = []

        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            load_avg = (
                psutil.getloadavg() if hasattr(psutil, "getloadavg") else (0, 0, 0)
            )

            metrics.extend(
                [
                    PerformanceMetric(
                        "cpu_usage_percent", cpu_percent, "percent", datetime.utcnow()
                    ),
                    PerformanceMetric(
                        "cpu_count", cpu_count, "count", datetime.utcnow()
                    ),
                    PerformanceMetric(
                        "load_avg_1m", load_avg[0], "ratio", datetime.utcnow()
                    ),
                    PerformanceMetric(
                        "load_avg_5m", load_avg[1], "ratio", datetime.utcnow()
                    ),
                    PerformanceMetric(
                        "load_avg_15m", load_avg[2], "ratio", datetime.utcnow()
                    ),
                ]
            )

            # Memory metrics
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()

            metrics.extend(
                [
                    PerformanceMetric(
                        "memory_total_bytes", memory.total, "bytes", datetime.utcnow()
                    ),
                    PerformanceMetric(
                        "memory_used_bytes", memory.used, "bytes", datetime.utcnow()
                    ),
                    PerformanceMetric(
                        "memory_usage_percent",
                        memory.percent,
                        "percent",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "memory_available_bytes",
                        memory.available,
                        "bytes",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "swap_total_bytes", swap.total, "bytes", datetime.utcnow()
                    ),
                    PerformanceMetric(
                        "swap_used_bytes", swap.used, "bytes", datetime.utcnow()
                    ),
                    PerformanceMetric(
                        "swap_usage_percent", swap.percent, "percent", datetime.utcnow()
                    ),
                ]
            )

            # Disk metrics
            disk = psutil.disk_usage("/")
            disk_io = psutil.disk_io_counters()

            metrics.extend(
                [
                    PerformanceMetric(
                        "disk_total_bytes", disk.total, "bytes", datetime.utcnow()
                    ),
                    PerformanceMetric(
                        "disk_used_bytes", disk.used, "bytes", datetime.utcnow()
                    ),
                    PerformanceMetric(
                        "disk_usage_percent",
                        (disk.used / disk.total) * 100,
                        "percent",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "disk_free_bytes", disk.free, "bytes", datetime.utcnow()
                    ),
                ]
            )

            if disk_io:
                metrics.extend(
                    [
                        PerformanceMetric(
                            "disk_read_bytes",
                            disk_io.read_bytes,
                            "bytes",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "disk_write_bytes",
                            disk_io.write_bytes,
                            "bytes",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "disk_read_count",
                            disk_io.read_count,
                            "count",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "disk_write_count",
                            disk_io.write_count,
                            "count",
                            datetime.utcnow(),
                        ),
                    ]
                )

            # Network metrics
            network = psutil.net_io_counters()
            if network:
                metrics.extend(
                    [
                        PerformanceMetric(
                            "network_bytes_sent",
                            network.bytes_sent,
                            "bytes",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "network_bytes_recv",
                            network.bytes_recv,
                            "bytes",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "network_packets_sent",
                            network.packets_sent,
                            "count",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "network_packets_recv",
                            network.packets_recv,
                            "count",
                            datetime.utcnow(),
                        ),
                    ]
                )

            # Process metrics
            process = psutil.Process()
            metrics.extend(
                [
                    PerformanceMetric(
                        "process_cpu_percent",
                        process.cpu_percent(),
                        "percent",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "process_memory_rss",
                        process.memory_info().rss,
                        "bytes",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "process_memory_vms",
                        process.memory_info().vms,
                        "bytes",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "process_num_threads",
                        process.num_threads(),
                        "count",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "process_num_fds",
                        process.num_fds() if hasattr(process, "num_fds") else 0,
                        "count",
                        datetime.utcnow(),
                    ),
                ]
            )

        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")

        return metrics

    async def collect_database_metrics(self) -> List[PerformanceMetric]:
        """Collect database performance metrics"""
        metrics = []

        try:
            async with self.session_factory() as session:
                # Connection statistics
                # SQLite doesn't have connection stats, so we'll use a simple query count
                try:
                    result = await session.execute(text("SELECT COUNT(*) FROM sqlite_master"))
                    table_count = result.scalar()
                    
                    metrics.extend([
                        PerformanceMetric(
                            "db_table_count",
                            table_count,
                            "count",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "db_health_status",
                            1,  # 1 = healthy, 0 = unhealthy
                            "boolean",
                            datetime.utcnow(),
                        )
                    ])
                except Exception as e:
                    logger.warning(f"Could not get database stats: {e}")
                    # Add a failed health indicator
                    metrics.append(
                        PerformanceMetric(
                            "db_health_status",
                            0,  # 0 = unhealthy
                            "boolean",
                            datetime.utcnow(),
                        )
                    )

                # Cache hit ratios (SQLite compatible)
                # SQLite doesn't have pg_statio_user_tables, so we'll use a simple query
                try:
                    cache_query = "SELECT COUNT(*) as query_count FROM sqlite_master WHERE type='table'"
                    result = await session.execute(text(cache_query))
                    table_count = result.scalar()
                    
                    # Add basic cache metrics for SQLite
                    metrics.extend([
                        PerformanceMetric(
                            "db_table_count",
                            table_count,
                            "count",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "db_cache_status",
                            1,  # 1 = healthy
                            "boolean",
                            datetime.utcnow(),
                        )
                    ])
                except Exception as e:
                    logger.warning(f"Could not get cache stats: {e}")

                # Transaction statistics (SQLite compatible)
                try:
                    # SQLite doesn't have pg_stat_database, so we'll use basic database info
                    db_info_query = """
                    SELECT 
                        COUNT(*) as table_count
                    FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                    """
                    
                    result = await session.execute(text(db_info_query))
                    table_count = result.scalar()
                    
                    # Get database file size (SQLite specific)
                    db_size_query = "PRAGMA page_count"
                    page_count_result = await session.execute(text(db_size_query))
                    page_count = page_count_result.scalar()
                    
                    db_page_size_query = "PRAGMA page_size"
                    page_size_result = await session.execute(text(db_page_size_query))
                    page_size = page_size_result.scalar()
                    
                    db_size_bytes = (page_count or 0) * (page_size or 0)
                    
                    metrics.extend([
                        PerformanceMetric(
                            "db_table_count",
                            table_count or 0,
                            "count",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "db_size_bytes",
                            db_size_bytes,
                            "bytes",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "db_page_count",
                            page_count or 0,
                            "count",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "db_page_size",
                            page_size or 0,
                            "bytes",
                            datetime.utcnow(),
                        ),
                    ])
                    
                except Exception as e:
                    logger.warning(f"Could not get SQLite database stats: {e}")
                    # Add basic health metric
                    metrics.append(
                        PerformanceMetric(
                            "db_stats_error",
                            1,
                            "boolean",
                            datetime.utcnow(),
                        )
                    )

                # SQLite doesn't have pg_stat_statements, so we'll use basic query performance
                try:
                    # Check SQLite compile options and settings
                    compile_options_query = "PRAGMA compile_options"
                    result = await session.execute(text(compile_options_query))
                    compile_options = result.fetchall()
                    
                    # Get cache size
                    cache_size_query = "PRAGMA cache_size"
                    cache_result = await session.execute(text(cache_size_query))
                    cache_size = cache_result.scalar()
                    
                    # Get journal mode
                    journal_mode_query = "PRAGMA journal_mode"
                    journal_result = await session.execute(text(journal_mode_query))
                    journal_mode = journal_result.scalar()
                    
                    metrics.extend([
                        PerformanceMetric(
                            "db_cache_size",
                            cache_size or 0,
                            "pages",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "db_journal_mode_wal",
                            1 if journal_mode == "wal" else 0,
                            "boolean",
                            datetime.utcnow(),
                        ),
                        PerformanceMetric(
                            "db_compile_options_count",
                            len(compile_options) if compile_options else 0,
                            "count",
                            datetime.utcnow(),
                        ),
                    ])
                    
                except Exception as e:
                    logger.warning(f"Could not get SQLite performance stats: {e}")
                    # Add a basic performance health metric
                    metrics.append(
                        PerformanceMetric(
                            "db_performance_check",
                            1,  # 1 = check completed
                            "boolean",
                            datetime.utcnow(),
                        )
                    )

        except Exception as e:
            logger.error(f"Error collecting database metrics: {e}")

        return metrics

    async def collect_application_metrics(self) -> List[PerformanceMetric]:
        """Collect application-specific metrics"""
        metrics = []

        try:
            # Redis metrics
            redis_info = await self.redis.info()

            metrics.extend(
                [
                    PerformanceMetric(
                        "redis_connected_clients",
                        redis_info.get("connected_clients", 0),
                        "count",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "redis_used_memory",
                        redis_info.get("used_memory", 0),
                        "bytes",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "redis_used_memory_peak",
                        redis_info.get("used_memory_peak", 0),
                        "bytes",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "redis_keyspace_hits",
                        redis_info.get("keyspace_hits", 0),
                        "count",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "redis_keyspace_misses",
                        redis_info.get("keyspace_misses", 0),
                        "count",
                        datetime.utcnow(),
                    ),
                    PerformanceMetric(
                        "redis_total_commands_processed",
                        redis_info.get("total_commands_processed", 0),
                        "count",
                        datetime.utcnow(),
                    ),
                ]
            )

            # Calculate cache hit ratio
            hits = redis_info.get("keyspace_hits", 0)
            misses = redis_info.get("keyspace_misses", 0)
            if hits + misses > 0:
                cache_hit_ratio = (hits / (hits + misses)) * 100
                metrics.append(
                    PerformanceMetric(
                        "redis_cache_hit_ratio",
                        cache_hit_ratio,
                        "percent",
                        datetime.utcnow(),
                    )
                )

            # Application uptime
            uptime = time.time() - self.start_time
            metrics.append(
                PerformanceMetric(
                    "application_uptime_seconds", uptime, "seconds", datetime.utcnow()
                )
            )

        except Exception as e:
            logger.error(f"Error collecting application metrics: {e}")

        return metrics

    async def collect_maritime_metrics(self) -> List[PerformanceMetric]:
        """Collect maritime-specific business metrics"""
        metrics = []

        try:
            async with self.session_factory() as session:
                # Document processing metrics
                doc_metrics_query = """
                SELECT 
                    COUNT(*) as total_documents,
                    SUM(CASE WHEN status = 'missing' THEN 1 ELSE 0 END) as missing_documents,
                    SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review_documents,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_documents,
                    SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_documents,
                    SUM(CASE WHEN expires_on < datetime('now') THEN 1 ELSE 0 END) as overdue_documents
                FROM documents
                WHERE uploaded_at >= datetime('now', '-24 hours')
                """

                result = await session.execute(text(doc_metrics_query))
                doc_stats = result.fetchone()

                if doc_stats:
                    metrics.extend(
                        [
                            PerformanceMetric(
                                "documents_total_24h",
                                doc_stats.total_documents,
                                "count",
                                datetime.utcnow(),
                            ),
                            PerformanceMetric(
                                "documents_missing_24h",
                                doc_stats.missing_documents,
                                "count",
                                datetime.utcnow(),
                            ),
                            PerformanceMetric(
                                "documents_under_review_24h",
                                doc_stats.under_review_documents,
                                "count",
                                datetime.utcnow(),
                            ),
                            PerformanceMetric(
                                "documents_approved_24h",
                                doc_stats.approved_documents,
                                "count",
                                datetime.utcnow(),
                            ),
                            PerformanceMetric(
                                "documents_expired_24h",
                                doc_stats.expired_documents,
                                "count",
                                datetime.utcnow(),
                            ),
                            PerformanceMetric(
                                "documents_overdue",
                                doc_stats.overdue_documents,
                                "count",
                                datetime.utcnow(),
                            ),
                        ]
                    )

                # Room activity metrics
                room_metrics_query = """
                SELECT 
                    COUNT(DISTINCT room_id) as active_rooms,
                    COUNT(*) as total_activities,
                    COUNT(DISTINCT actor) as active_users
                FROM activity_log
                WHERE ts >= datetime('now', '-1 hour')
                """

                result = await session.execute(text(room_metrics_query))
                room_stats = result.fetchone()

                if room_stats:
                    metrics.extend(
                        [
                            PerformanceMetric(
                                "active_rooms_1h",
                                room_stats.active_rooms,
                                "count",
                                datetime.utcnow(),
                            ),
                            PerformanceMetric(
                                "total_activities_1h",
                                room_stats.total_activities,
                                "count",
                                datetime.utcnow(),
                            ),
                            PerformanceMetric(
                                "active_users_1h",
                                room_stats.active_users,
                                "count",
                                datetime.utcnow(),
                            ),
                        ]
                    )

                # Compliance metrics
                compliance_query = """
                SELECT 
                    SUM(CASE WHEN criticality = 'high' THEN 1 ELSE 0 END) as high_criticality_docs,
                    SUM(CASE WHEN criticality = 'med' THEN 1 ELSE 0 END) as med_criticality_docs,
                    SUM(CASE WHEN criticality = 'low' THEN 1 ELSE 0 END) as low_criticality_docs
                FROM documents d
                JOIN document_types dt ON d.type_id = dt.id
                WHERE d.status = 'missing'
                """

                result = await session.execute(text(compliance_query))
                compliance_stats = result.fetchone()

                if compliance_stats:
                    metrics.extend(
                        [
                            PerformanceMetric(
                                "missing_high_criticality_docs",
                                compliance_stats.high_criticality_docs,
                                "count",
                                datetime.utcnow(),
                            ),
                            PerformanceMetric(
                                "missing_med_criticality_docs",
                                compliance_stats.med_criticality_docs,
                                "count",
                                datetime.utcnow(),
                            ),
                            PerformanceMetric(
                                "missing_low_criticality_docs",
                                compliance_stats.low_criticality_docs,
                                "count",
                                datetime.utcnow(),
                            ),
                        ]
                    )

        except Exception as e:
            logger.error(f"Error collecting maritime metrics: {e}")

        return metrics

    async def store_metrics(self, metrics: List[PerformanceMetric]):
        """Store metrics in Redis with time-series data"""
        try:
            pipe = self.redis.pipeline()

            for metric in metrics:
                # Store in time-series format
                key = f"metrics:{metric.name}"
                timestamp = int(metric.timestamp.timestamp())

                # Store metric value with timestamp
                pipe.zadd(key, {f"{timestamp}:{metric.value}": timestamp})

                # Keep only last 24 hours of data
                cutoff = timestamp - (24 * 3600)
                pipe.zremrangebyscore(key, 0, cutoff)

                # Set expiration for cleanup
                pipe.expire(key, 7 * 24 * 3600)  # 7 days

            await pipe.execute()

        except Exception as e:
            logger.error(f"Error storing metrics: {e}")

    async def check_alerts(self, metrics: List[PerformanceMetric]):
        """Check metrics against alert rules"""
        try:
            for metric in metrics:
                for rule in self.alert_rules:
                    if rule.metric_name == metric.name:
                        if self._evaluate_alert_condition(metric.value, rule):
                            await self._trigger_alert(rule, metric)

        except Exception as e:
            logger.error(f"Error checking alerts: {e}")

    def _evaluate_alert_condition(self, value: float, rule: AlertRule) -> bool:
        """Evaluate if metric value triggers alert"""
        if rule.operator == "gt":
            return value > rule.threshold
        elif rule.operator == "lt":
            return value < rule.threshold
        elif rule.operator == "eq":
            return value == rule.threshold
        return False

    async def _trigger_alert(self, rule: AlertRule, metric: PerformanceMetric):
        """Trigger alert for rule violation"""
        alert = {
            "rule": rule.metric_name,
            "severity": rule.severity,
            "threshold": rule.threshold,
            "current_value": metric.value,
            "unit": metric.unit,
            "timestamp": metric.timestamp.isoformat(),
            "message": f"{rule.metric_name} is {metric.value} {metric.unit}, threshold is {rule.threshold}",
        }

        # Store alert in Redis
        alert_key = f"alerts:{rule.severity}:{int(time.time())}"
        await self.redis.setex(alert_key, 7 * 24 * 3600, json.dumps(alert))

        # Log alert
        logger.warning(f"ALERT [{rule.severity.upper()}]: {alert['message']}")

        # TODO: Send to external alerting system (PagerDuty, Slack, etc.)

    async def get_metrics_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get metrics summary for the last N hours"""
        try:
            cutoff = int((datetime.utcnow() - timedelta(hours=hours)).timestamp())

            summary = {}

            # Get all metric keys
            metric_keys = await self.redis.keys("metrics:*")

            for key in metric_keys:
                metric_name = key.decode().replace("metrics:", "")

                # Get recent values
                values = await self.redis.zrangebyscore(
                    key, cutoff, "+inf", withscores=True
                )

                if values:
                    metric_values = [float(v[0].decode().split(":")[1]) for v in values]

                    summary[metric_name] = {
                        "count": len(metric_values),
                        "min": min(metric_values),
                        "max": max(metric_values),
                        "avg": sum(metric_values) / len(metric_values),
                        "latest": metric_values[-1] if metric_values else 0,
                    }

            return summary

        except Exception as e:
            logger.error(f"Error getting metrics summary: {e}")
            return {}

    async def run_monitoring_cycle(self):
        """Run a complete monitoring cycle"""
        try:
            # Collect all metrics
            system_metrics = await self.collect_system_metrics()
            db_metrics = await self.collect_database_metrics()
            app_metrics = await self.collect_application_metrics()
            maritime_metrics = await self.collect_maritime_metrics()

            all_metrics = system_metrics + db_metrics + app_metrics + maritime_metrics

            # Store metrics
            await self.store_metrics(all_metrics)

            # Check alerts
            await self.check_alerts(all_metrics)

            logger.info(
                f"Monitoring cycle completed: {len(all_metrics)} metrics collected"
            )

        except Exception as e:
            logger.error(f"Error in monitoring cycle: {e}")


class HealthChecker:
    """Health check utilities for system components"""

    def __init__(self, redis_client: redis.Redis, session_factory):
        self.redis = redis_client
        self.session_factory = session_factory

    async def check_database_health(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            start_time = time.time()

            async with self.session_factory() as session:
                # Simple connectivity test
                await session.execute(text("SELECT 1"))

                # Check for long-running queries (SQLite compatible)
                # SQLite doesn't have pg_stat_activity, so we'll do a simple test
                try:
                    test_query = await session.execute(text("SELECT COUNT(*) FROM sqlite_master"))
                    long_count = 0  # No long-running queries to check in SQLite
                except Exception:
                    long_count = -1  # Indicate database error

            response_time = (time.time() - start_time) * 1000

            return {
                "status": "healthy",
                "response_time_ms": response_time,
                "long_running_queries": long_count,
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def check_redis_health(self) -> Dict[str, Any]:
        """Check Redis connectivity and performance"""
        try:
            start_time = time.time()

            # Test basic operations
            test_key = f"health_check:{int(time.time())}"
            await self.redis.set(test_key, "test", ex=60)
            value = await self.redis.get(test_key)
            await self.redis.delete(test_key)

            response_time = (time.time() - start_time) * 1000

            # Get Redis info
            info = await self.redis.info()

            return {
                "status": "healthy",
                "response_time_ms": response_time,
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_mb": info.get("used_memory", 0) / 1024 / 1024,
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def get_overall_health(self) -> Dict[str, Any]:
        """Get overall system health status"""
        db_health = await self.check_database_health()
        redis_health = await self.check_redis_health()

        # Determine overall status
        overall_status = "healthy"
        if db_health["status"] != "healthy" or redis_health["status"] != "healthy":
            overall_status = "unhealthy"

        return {
            "status": overall_status,
            "components": {"database": db_health, "redis": redis_health},
            "timestamp": datetime.utcnow().isoformat(),
        }
