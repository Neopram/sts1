"""
Pydantic schemas for FASE 2 API endpoints
Provides request and response models for all new endpoints
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ============ DEMURRAGE SCHEMAS ============

class DemurrageHourlyResponse(BaseModel):
    """Response for hourly demurrage calculation"""
    room_id: str
    hours_elapsed: float
    total_exposure: float
    escalation_factor: float
    threshold_warning: Optional[str] = None
    last_calculated: datetime
    
    class Config:
        from_attributes = True


class DemurrageProjectionScenario(BaseModel):
    """Single scenario in demurrage projection"""
    scenario: str  # "normal", "high", "critical"
    hours_at_threshold: float
    escalation_factor: float
    total_exposure: float
    timestamp: datetime


class DemurrageProjectionResponse(BaseModel):
    """Response for demurrage escalation projection"""
    room_id: str
    current_exposure: float
    scenarios: List[DemurrageProjectionScenario]
    recommendation: str
    next_review: datetime
    
    class Config:
        from_attributes = True


# ============ COMMISSION SCHEMAS ============

class CommissionAccrualEntry(BaseModel):
    """Single commission accrual entry"""
    operation_id: str
    operation_status: str  # "pending", "partial", "completed", "paid"
    base_commission: float
    accrual_rate: float
    accrued_amount: float
    last_updated: datetime


class CommissionAccrualTrackingResponse(BaseModel):
    """Response for commission accrual tracking"""
    broker_id: str
    total_potential: float
    total_accrued: float
    accrual_entries: List[CommissionAccrualEntry]
    accrual_percentage: float
    last_calculated: datetime
    
    class Config:
        from_attributes = True


class CounterpartyTrend(BaseModel):
    """Counterparty trend analysis"""
    counterparty_id: str
    counterparty_name: str
    deal_count_90d: int
    average_commission: float
    total_90d_commission: float
    trend: str  # "up", "down", "stable"
    next_deal_estimate: float
    confidence: float


class CommissionCounterpartyResponse(BaseModel):
    """Response for commission by counterparty"""
    broker_id: str
    analysis_period: str
    total_potential: float
    counterparties: List[CounterpartyTrend]
    top_performer: Optional[str] = None
    recommendation: str
    
    class Config:
        from_attributes = True


# ============ COMPLIANCE SCHEMAS ============

class CrewCertification(BaseModel):
    """Crew member certification"""
    crew_id: str
    name: str
    certification_type: str
    expiry_date: datetime
    is_valid: bool
    days_until_expiry: int


class CrewCertificationsResponse(BaseModel):
    """Response for crew certifications validation"""
    vessel_id: str
    total_crew: int
    valid_certifications: int
    expiring_soon: int
    expired: int
    certifications: List[CrewCertification]
    compliance_percentage: float
    
    class Config:
        from_attributes = True


class RemediationStatus(BaseModel):
    """Remediation status for a finding"""
    finding_id: str
    finding_type: str
    severity: str  # "critical", "major", "minor"
    status: str  # "open", "in_progress", "resolved", "closed"
    completion_percentage: float
    due_date: Optional[datetime] = None
    last_updated: datetime
    assigned_to: Optional[str] = None


class RemediationStatusResponse(BaseModel):
    """Response for finding remediation status"""
    finding_id: str
    vessel_id: str
    current_status: RemediationStatus
    history: List[Dict[str, Any]]
    next_action: Optional[str] = None
    days_open: int
    
    class Config:
        from_attributes = True


class SireSyncRequest(BaseModel):
    """Request to sync SIRE external API"""
    vessel_id: str
    force_refresh: bool = False


class SireScore(BaseModel):
    """SIRE score data"""
    vessel_id: str
    score: float
    rating: str  # "A", "B", "C", "D"
    inspection_count: int
    last_inspection: datetime
    next_inspection_due: Optional[datetime] = None


class SireSyncResponse(BaseModel):
    """Response from SIRE sync"""
    vessel_id: str
    success: bool
    sire_data: Optional[SireScore] = None
    message: str
    synced_at: datetime
    
    class Config:
        from_attributes = True


# ============ NOTIFICATION SCHEMAS ============

class NotificationQueueRequest(BaseModel):
    """Request to queue notification with retry"""
    recipient_id: str
    notification_type: str
    message: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    priority: str = "normal"  # "low", "normal", "high", "critical"


class NotificationQueueResponse(BaseModel):
    """Response from notification queue"""
    queue_id: str
    recipient_id: str
    status: str  # "queued", "sending", "sent", "failed"
    retry_count: int
    next_retry: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ExpiryAlertRequest(BaseModel):
    """Request to send expiry alerts"""
    room_id: Optional[str] = None
    vessel_id: Optional[str] = None
    send_to_all: bool = False


class ExpiryAlertResponse(BaseModel):
    """Response from expiry alert send"""
    alerts_sent: int
    critical_count: int
    urgent_count: int
    warning_count: int
    status: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


class ApprovalReminderRequest(BaseModel):
    """Request to send approval reminders"""
    approval_type: Optional[str] = None
    hours_overdue: int = 48


class ApprovalReminderResponse(BaseModel):
    """Response from approval reminder send"""
    reminders_sent: int
    escalations_sent: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


# ============ DOCUMENTS SCHEMAS ============

class CriticalDocument(BaseModel):
    """Critical missing/expired document"""
    document_id: str
    document_type: str
    room_id: str
    vessel_id: Optional[str] = None
    status: str  # "missing", "expired", "expiring_soon"
    urgency_score: int  # 1-100
    days_critical: int
    assigned_to: Optional[str] = None


class CriticalDocumentsResponse(BaseModel):
    """Response for critical missing documents"""
    total_critical: int
    by_status: Dict[str, int]
    by_urgency: Dict[str, int]
    documents: List[CriticalDocument]
    top_priority: Optional[CriticalDocument] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True


class DocumentCompletion(BaseModel):
    """Document completion info"""
    total_required: int
    received: int
    pending: int
    completion_percentage: float
    eta_completion: Optional[datetime] = None


class MissingDocumentsReport(BaseModel):
    """Comprehensive missing documents report"""
    room_id: str
    vessel_id: Optional[str] = None
    completion: DocumentCompletion
    bottlenecks: List[str]
    risk_score: int  # 1-100
    critical_items: List[CriticalDocument]
    generated_at: datetime
    
    class Config:
        from_attributes = True


# ============ DASHBOARD SCHEMAS ============

class DashboardValidationRequest(BaseModel):
    """Request to validate dashboard access"""
    dashboard_type: str
    room_id: Optional[str] = None
    vessel_id: Optional[str] = None


class DashboardAccessResponse(BaseModel):
    """Response for dashboard access validation"""
    has_access: bool
    access_level: str  # "none", "view", "edit", "admin"
    reason: Optional[str] = None
    permissions: List[str]
    
    class Config:
        from_attributes = True


class DashboardMetadata(BaseModel):
    """Metadata for dashboard"""
    role: str
    last_updated: datetime
    cache_age_seconds: int
    refresh_in_seconds: int


class DashboardDataResponse(BaseModel):
    """Response for dashboard data by role"""
    metadata: DashboardMetadata
    data: Dict[str, Any]
    
    class Config:
        from_attributes = True


# ============ ERROR SCHEMAS ============

class ErrorResponse(BaseModel):
    """Standard error response"""
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True