"""
Pydantic schemas for dashboard API responses.
Each role has specific data structures.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ============ BASE SCHEMAS ============

class ByRoomMetricBase(BaseModel):
    """Base schema for metrics aggregated by room"""
    room_id: str
    room_title: str
    
    class Config:
        from_attributes = True


class ByVesselMetricBase(BaseModel):
    """Base schema for metrics aggregated by vessel"""
    vessel_id: str
    vessel_name: str
    
    class Config:
        from_attributes = True


# ============ CHARTERER DASHBOARD SCHEMAS ============

class DemurrageByRoom(ByRoomMetricBase):
    """Demurrage metrics broken down by room"""
    daily_rate: float = Field(..., description="Demurrage rate per day (USD)")
    days_pending: float = Field(..., description="Number of days pending")
    exposure: float = Field(..., description="Total demurrage exposure (USD)")
    pending_documents: int = Field(..., description="Count of pending documents")


class MarginImpact(BaseModel):
    """Margin impact metrics for Charterer"""
    margin_safe: float = Field(..., description="Margin that's safe")
    margin_at_risk: float = Field(..., description="Margin at risk due to delays")
    operations_delayed: int = Field(..., description="Count of delayed operations")
    operations_on_track: int = Field(..., description="Count of on-track operations")


class UrgentApproval(BaseModel):
    """Approval item requiring urgent attention"""
    approval_id: str
    document_name: str
    room_title: str
    days_pending: float = Field(..., description="Days waiting for approval")
    status: str
    urgency: str = Field(..., description="critical, high, medium, low")


class OperationsSummary(BaseModel):
    """Summary of operations for Charterer"""
    total: int
    active: int
    pending_approvals: int
    completion_rate: float = Field(..., description="0-100%")


class ChartererDashboard(BaseModel):
    """Complete Charterer Dashboard response"""
    demurrage: Dict[str, Any] = Field(..., description="Demurrage exposure data")
    margin_impact: MarginImpact
    urgent_approvals: List[UrgentApproval]
    operations: OperationsSummary
    alert_priority: str = Field(..., description="critical, high, medium, low")


# ============ BROKER DASHBOARD SCHEMAS ============

class CommissionByRoom(ByRoomMetricBase):
    """Commission metrics broken down by room"""
    deal_value: float = Field(..., description="Deal value (USD)")
    commission: float = Field(..., description="Commission amount (USD)")
    accrual_status: str = Field(..., description="accrued, pending, invoiced, paid")


class DealHealthByRoom(ByRoomMetricBase):
    """Deal health metrics by room"""
    health_score: float = Field(..., description="0-100 score")
    doc_completion: float = Field(..., description="0-100% documents complete")
    approval_progress: float = Field(..., description="0-100% approvals complete")
    timeline_days_remaining: Optional[float] = Field(None, description="Days until deadline")


class StuckDeal(BaseModel):
    """Deal stuck for more than threshold (typically 48h)"""
    room_id: str
    room_title: str
    stuck_approvals: int = Field(..., description="Count of pending approvals")
    hours_stuck: float = Field(..., description="Hours since last update")
    commission_at_risk: float = Field(..., description="Commission potentially lost (USD)")


class PartyPerformance(BaseModel):
    """Performance metrics for a party"""
    party_name: str
    party_role: str = Field(..., description="charterer, owner, etc")
    deals_count: int = Field(..., description="Total deals (last 6 months)")
    avg_closure_time_hours: float = Field(..., description="Average hours to close deal")
    on_time_delivery_rate: float = Field(..., description="0-100%")
    quality_score: float = Field(..., description="1-10 scale")
    reliability_index: float = Field(..., description="1-10 scale")


class BrokerDashboard(BaseModel):
    """Complete Broker Dashboard response"""
    commission: Dict[str, Any] = Field(..., description="Commission tracking data")
    deal_health: Dict[str, Any] = Field(..., description="Deal health by room")
    stuck_deals: List[StuckDeal]
    party_performance: List[PartyPerformance]
    alert_priority: str


# ============ SHIPOWNER DASHBOARD SCHEMAS ============

class SireCompliance(ByVesselMetricBase):
    """SIRE 2.0 compliance metrics per vessel"""
    score: float = Field(..., description="SIRE score 0-100")
    status: str = Field(..., description="critical, warning, good")
    last_inspection: Optional[str] = Field(None, description="ISO format datetime")
    critical_findings: int
    major_findings: int
    minor_findings: int = Field(default=0)
    days_since_inspection: Optional[int] = None


class OpenFinding(BaseModel):
    """Open finding from inspection"""
    finding_id: str
    vessel_name: str
    severity: str = Field(..., description="critical, major, minor")
    category: str = Field(..., description="safety, operations, equipment, etc")
    description: str
    remediation_due: Optional[str] = Field(None, description="ISO format datetime")
    days_to_due: Optional[int] = None


class CrewStatus(ByVesselMetricBase):
    """Crew status per vessel"""
    crew_count: int
    crew_status: str = Field(..., description="on_watch, rest, training")
    certifications_valid: bool
    training_current: bool
    rest_hours_compliant: bool


class InsuranceMetrics(BaseModel):
    """Insurance impact metrics"""
    average_sire_score: float = Field(..., description="Fleet average SIRE score")
    insurance_impact: str = Field(..., description="green, yellow, red")
    estimated_premium_multiplier: float = Field(..., description="e.g., 1.2 for 20% increase")
    recommendation: str = Field(..., description="Action recommendation")


class OwnerDashboard(BaseModel):
    """Complete Shipowner Dashboard response"""
    sire_compliance: List[SireCompliance]
    open_findings: List[OpenFinding]
    crew_status: List[CrewStatus]
    insurance: InsuranceMetrics
    alert_priority: str


# ============ ADMIN DASHBOARD SCHEMAS ============

class SystemHealth(BaseModel):
    """System health metrics"""
    system_health_score: float = Field(..., description="0-100")
    uptime_percent: float = Field(..., description="0-100%")
    alert_count: int
    critical_alerts: int


class ComplianceOverview(BaseModel):
    """Compliance overview"""
    total_operations: int
    compliant: int
    violations: int
    expiring_soon: int


class AdminDashboard(BaseModel):
    """Complete Admin Dashboard response"""
    overview: Dict[str, Any]
    compliance: ComplianceOverview
    health: SystemHealth
    recent_activities: List[Dict[str, Any]]
    alert_priority: str = "medium"


# ============ GENERIC RESPONSE WRAPPER ============

class DashboardResponse(BaseModel):
    """Wrapped response for all dashboard endpoints"""
    role: str = Field(..., description="admin, charterer, broker, owner, etc")
    timestamp: str = Field(..., description="ISO format datetime")
    data: Dict[str, Any] = Field(..., description="Role-specific data")
    cache_ttl: Optional[int] = Field(300, description="Cache TTL in seconds")


class MetricsAggregation(BaseModel):
    """Aggregated metrics response"""
    by_room: Optional[List[Dict[str, Any]]] = None
    by_vessel: Optional[List[Dict[str, Any]]] = None
    total: float
    average: float
    trend: str = Field(..., description="up, down, stable")
    period: str = Field(..., description="today, week, month")