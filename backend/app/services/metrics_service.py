"""
Metrics Service for STS Clearance system
Tracks performance metrics for PDF generation and caching
Day 3 Enhancement: Performance monitoring and analytics
"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class PerformanceMetric:
    """Represents a single performance metric"""
    
    def __init__(self, name: str, value: float, unit: str = "ms", metadata: Optional[Dict] = None):
        self.name = name
        self.value = value
        self.unit = unit
        self.timestamp = datetime.utcnow()
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "value": self.value,
            "unit": self.unit,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
        }


class MetricsService:
    """Service for tracking and reporting performance metrics"""
    
    def __init__(self):
        self.metrics: List[PerformanceMetric] = []
        self.aggregated_stats: Dict[str, Dict[str, Any]] = {}
        self.metrics_file = Path("uploads/.metrics")
        self.metrics_file.mkdir(parents=True, exist_ok=True)

    def record_metric(
        self,
        name: str,
        value: float,
        unit: str = "ms",
        metadata: Optional[Dict] = None
    ) -> None:
        """Record a performance metric"""
        metric = PerformanceMetric(name, value, unit, metadata)
        self.metrics.append(metric)
        
        # Update aggregated stats
        self._update_aggregated_stats(metric)
        
        logger.debug(f"Recorded metric: {name}={value}{unit}")

    def record_pdf_generation(
        self,
        snapshot_id: str,
        duration_ms: float,
        file_size_bytes: int,
        included_sections: List[str],
        was_cached: bool = False
    ) -> None:
        """Record PDF generation metrics"""
        self.record_metric(
            name="pdf_generation_time",
            value=duration_ms,
            unit="ms",
            metadata={
                "snapshot_id": snapshot_id,
                "file_size_bytes": file_size_bytes,
                "included_sections": included_sections,
                "was_cached": was_cached,
            }
        )

    def record_cache_operation(
        self,
        operation: str,
        duration_ms: float,
        hit: bool,
        content_hash: str
    ) -> None:
        """Record cache operation metrics"""
        self.record_metric(
            name="cache_operation",
            value=duration_ms,
            unit="ms",
            metadata={
                "operation": operation,
                "hit": hit,
                "content_hash": content_hash[:16],
            }
        )

    def record_api_request(
        self,
        endpoint: str,
        method: str,
        duration_ms: float,
        status_code: int,
        user_email: Optional[str] = None
    ) -> None:
        """Record API request metrics"""
        self.record_metric(
            name="api_request",
            value=duration_ms,
            unit="ms",
            metadata={
                "endpoint": endpoint,
                "method": method,
                "status_code": status_code,
                "user_email": user_email,
            }
        )

    def get_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get summary statistics for the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        recent_metrics = [
            m for m in self.metrics
            if m.timestamp >= cutoff_time
        ]
        
        if not recent_metrics:
            return {
                "period_hours": hours,
                "total_metrics": 0,
                "statistics": {}
            }
        
        # Group metrics by name
        metrics_by_name: Dict[str, List[float]] = {}
        for metric in recent_metrics:
            if metric.name not in metrics_by_name:
                metrics_by_name[metric.name] = []
            metrics_by_name[metric.name].append(metric.value)
        
        # Calculate statistics
        stats = {}
        for name, values in metrics_by_name.items():
            stats[name] = self._calculate_stats(values, name)
        
        return {
            "period_hours": hours,
            "total_metrics": len(recent_metrics),
            "statistics": stats,
        }

    def get_pdf_generation_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get PDF generation specific statistics"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        pdf_metrics = [
            m for m in self.metrics
            if m.name == "pdf_generation_time" and m.timestamp >= cutoff_time
        ]
        
        if not pdf_metrics:
            return {
                "period_hours": hours,
                "total_generations": 0,
                "cached_count": 0,
                "generated_count": 0,
                "statistics": {}
            }
        
        durations = [m.value for m in pdf_metrics]
        cached_count = sum(1 for m in pdf_metrics if m.metadata.get("was_cached"))
        generated_count = len(pdf_metrics) - cached_count
        
        return {
            "period_hours": hours,
            "total_generations": len(pdf_metrics),
            "cached_count": cached_count,
            "generated_count": generated_count,
            "statistics": self._calculate_stats(durations, "pdf_generation_time"),
            "cache_hit_rate_percent": round(cached_count / len(pdf_metrics) * 100, 2),
        }

    def get_api_performance(self, endpoint: Optional[str] = None, hours: int = 24) -> Dict[str, Any]:
        """Get API request performance metrics"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        api_metrics = [
            m for m in self.metrics
            if m.name == "api_request" and m.timestamp >= cutoff_time
        ]
        
        if endpoint:
            api_metrics = [
                m for m in api_metrics
                if m.metadata.get("endpoint") == endpoint
            ]
        
        if not api_metrics:
            return {
                "period_hours": hours,
                "total_requests": 0,
                "endpoints": {}
            }
        
        # Group by endpoint
        by_endpoint: Dict[str, List[float]] = {}
        by_status: Dict[int, int] = {}
        
        for metric in api_metrics:
            ep = metric.metadata.get("endpoint", "unknown")
            if ep not in by_endpoint:
                by_endpoint[ep] = []
            by_endpoint[ep].append(metric.value)
            
            status = metric.metadata.get("status_code", 0)
            by_status[status] = by_status.get(status, 0) + 1
        
        endpoint_stats = {
            endpoint: self._calculate_stats(durations, endpoint)
            for endpoint, durations in by_endpoint.items()
        }
        
        return {
            "period_hours": hours,
            "total_requests": len(api_metrics),
            "by_status_code": by_status,
            "endpoints": endpoint_stats,
        }

    def export_metrics(self, filepath: Optional[Path] = None) -> str:
        """Export metrics to JSON file"""
        if filepath is None:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filepath = self.metrics_file / f"metrics_{timestamp}.json"
        
        try:
            data = {
                "export_timestamp": datetime.utcnow().isoformat(),
                "total_metrics": len(self.metrics),
                "metrics": [m.to_dict() for m in self.metrics],
                "summary": self.get_summary(),
                "pdf_stats": self.get_pdf_generation_stats(),
            }
            
            with open(filepath, "w") as f:
                json.dump(data, f, indent=2)
            
            logger.info(f"Exported metrics to {filepath}")
            return str(filepath)
        except Exception as e:
            logger.error(f"Failed to export metrics: {e}")
            raise

    def clear_old_metrics(self, hours: int = 168) -> int:
        """Remove metrics older than specified hours (default 1 week)"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        original_count = len(self.metrics)
        
        self.metrics = [
            m for m in self.metrics
            if m.timestamp >= cutoff_time
        ]
        
        removed = original_count - len(self.metrics)
        logger.info(f"Cleared {removed} metrics older than {hours} hours")
        return removed

    def _calculate_stats(self, values: List[float], name: str = "") -> Dict[str, float]:
        """Calculate statistics for a list of values"""
        if not values:
            return {}
        
        sorted_values = sorted(values)
        n = len(values)
        
        # Mean
        mean = sum(values) / n
        
        # Median
        if n % 2 == 0:
            median = (sorted_values[n // 2 - 1] + sorted_values[n // 2]) / 2
        else:
            median = sorted_values[n // 2]
        
        # Percentiles
        p50 = sorted_values[int(n * 0.50) - 1] if int(n * 0.50) > 0 else sorted_values[0]
        p95 = sorted_values[int(n * 0.95) - 1] if int(n * 0.95) > 0 else sorted_values[-1]
        p99 = sorted_values[int(n * 0.99) - 1] if int(n * 0.99) > 0 else sorted_values[-1]
        
        # Std deviation
        variance = sum((x - mean) ** 2 for x in values) / n
        std_dev = variance ** 0.5
        
        return {
            "min": round(min(values), 2),
            "max": round(max(values), 2),
            "mean": round(mean, 2),
            "median": round(median, 2),
            "std_dev": round(std_dev, 2),
            "p50": round(p50, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "count": n,
        }

    def _update_aggregated_stats(self, metric: PerformanceMetric) -> None:
        """Update aggregated statistics"""
        name = metric.name
        if name not in self.aggregated_stats:
            self.aggregated_stats[name] = {
                "count": 0,
                "sum": 0,
                "min": float('inf'),
                "max": float('-inf'),
            }
        
        stats = self.aggregated_stats[name]
        stats["count"] += 1
        stats["sum"] += metric.value
        stats["min"] = min(stats["min"], metric.value)
        stats["max"] = max(stats["max"], metric.value)


# Global service instance
metrics_service = MetricsService()