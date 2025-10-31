"""
Compliance Service - Specialized for Shipowner & Inspector Dashboards

Handles SIRE score tracking, crew status, findings management,
and insurance impact analysis.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Vessel, Document, Room, Party
from app.schemas.dashboard_schemas import (
    SireCompliance,
    OpenFinding,
    CrewStatus,
    InsuranceMetrics,
)

logger = logging.getLogger(__name__)


class ComplianceService:
    """
    Handles compliance tracking specific to Shipowner and Inspector roles.
    Shipowners care about: SIRE compliance, crew status, insurance impact.
    Inspectors care about: findings documentation, compliance assessment.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.now = datetime.utcnow()

    # ============ SIRE COMPLIANCE BY VESSEL ============

    async def get_sire_compliance(
        self, owner_id: str
    ) -> List[SireCompliance]:
        """
        Get SIRE 2.0 compliance data for all vessels owned by shipowner.
        Returns array sorted by SIRE score (lowest/risky first).
        
        This is the BY_VESSEL array for Shipowner dashboard.
        """
        # Find all vessels for this owner
        # Note: Vessel.owner field stores owner company name
        stmt = select(Vessel).where(
            Vessel.owner == owner_id  # or could use owner_id from user company
        )

        result = await self.session.execute(stmt)
        vessels = result.scalars().all()

        compliances = []
        for vessel in vessels:
            # Get SIRE score (would come from external API typically)
            # For now, using mock/historical data
            sire_score = await self._get_vessel_sire_score(vessel.id)
            
            # Determine status
            if sire_score < 80:
                status = "critical"
            elif sire_score < 85:
                status = "warning"
            else:
                status = "good"

            # Get findings counts
            critical_findings = await self._count_findings_by_severity(vessel.id, "critical")
            major_findings = await self._count_findings_by_severity(vessel.id, "major")
            minor_findings = await self._count_findings_by_severity(vessel.id, "minor")

            # Get last inspection date
            # This would come from external inspection system
            last_inspection = await self._get_last_inspection_date(vessel.id)
            days_since_inspection = None
            if last_inspection:
                days_since_inspection = (self.now - last_inspection).days

            compliance_item = SireCompliance(
                vessel_id=str(vessel.id),
                vessel_name=vessel.name,
                score=sire_score,
                status=status,
                last_inspection=last_inspection.isoformat() if last_inspection else None,
                critical_findings=critical_findings,
                major_findings=major_findings,
                minor_findings=minor_findings,
                days_since_inspection=days_since_inspection,
            )
            compliances.append(compliance_item)

        # Sort by score (lowest first - most risky)
        compliances.sort(key=lambda x: x.score)
        return compliances

    # ============ OPEN FINDINGS ============

    async def get_open_findings(
        self, owner_id: str = None, vessel_id: str = None, days_range: int = 180
    ) -> List[OpenFinding]:
        """
        Get all open findings for vessels.
        Can filter by owner_id (all vessels) or specific vessel_id.
        """
        # In real implementation, findings come from external inspection system
        # For now, returning structure based on documents with critical issues

        findings = []

        # Get vessels to check
        if vessel_id:
            vessels_stmt = select(Vessel).where(Vessel.id == vessel_id)
        elif owner_id:
            vessels_stmt = select(Vessel).where(Vessel.owner == owner_id)
        else:
            return findings

        vessels_result = await self.session.execute(vessels_stmt)
        vessels = vessels_result.scalars().all()

        for vessel in vessels:
            # Find critical/urgent documents as proxy for findings
            critical_docs_stmt = select(Document).where(
                and_(
                    Document.vessel_id == vessel.id,
                    Document.status.in_(["missing", "under_review", "expired"]),
                    Document.priority == "urgent"
                )
            )

            docs_result = await self.session.execute(critical_docs_stmt)
            docs = docs_result.scalars().all()

            for doc in docs:
                # Map document to finding
                severity = "critical" if doc.priority == "urgent" else "major"
                category = self._map_doc_type_to_category(doc.type_id)

                days_to_due = None
                if doc.expires_on:
                    time_diff = doc.expires_on - self.now
                    days_to_due = time_diff.days

                finding = OpenFinding(
                    finding_id=str(doc.id),
                    vessel_name=vessel.name,
                    severity=severity,
                    category=category,
                    description=f"Missing or expired: {doc.notes or 'Document'}",
                    remediation_due=doc.expires_on.isoformat() if doc.expires_on else None,
                    days_to_due=days_to_due,
                )
                findings.append(finding)

        return findings

    # ============ CREW STATUS ============

    async def get_crew_status(
        self, owner_id: str
    ) -> List[CrewStatus]:
        """
        Get crew status for all vessels.
        In real implementation, this comes from crew management system.
        """
        # Find vessels
        stmt = select(Vessel).where(Vessel.owner == owner_id)
        result = await self.session.execute(stmt)
        vessels = result.scalars().all()

        crew_statuses = []
        for vessel in vessels:
            # Mock crew status (would come from real system)
            status = CrewStatus(
                vessel_id=str(vessel.id),
                vessel_name=vessel.name,
                crew_count=20,  # Mock data
                crew_status="on_watch",
                certifications_valid=True,
                training_current=True,
                rest_hours_compliant=True,
            )
            crew_statuses.append(status)

        return crew_statuses

    # ============ INSURANCE IMPACT ============

    async def calculate_insurance_metrics(
        self, owner_id: str
    ) -> InsuranceMetrics:
        """
        Calculate insurance impact based on fleet SIRE compliance.
        """
        # Get all vessels
        stmt = select(Vessel).where(Vessel.owner == owner_id)
        result = await self.session.execute(stmt)
        vessels = result.scalars().all()

        if not vessels:
            return InsuranceMetrics(
                average_sire_score=0,
                insurance_impact="yellow",
                estimated_premium_multiplier=1.0,
                recommendation="No vessels found",
            )

        # Calculate average SIRE score
        sire_scores = []
        for vessel in vessels:
            score = await self._get_vessel_sire_score(vessel.id)
            sire_scores.append(score)

        avg_score = sum(sire_scores) / len(sire_scores) if sire_scores else 0

        # Determine insurance impact
        if avg_score >= 90:
            impact = "green"
            multiplier = 1.0
            recommendation = "Fleet in excellent compliance. No premium adjustments expected."
        elif avg_score >= 85:
            impact = "green"
            multiplier = 1.05
            recommendation = "Fleet compliant. Monitor for any declining trends."
        elif avg_score >= 80:
            impact = "yellow"
            multiplier = 1.15
            recommendation = "Fleet at minimum standards. Remediate findings promptly."
        else:
            impact = "red"
            multiplier = 1.3
            recommendation = "Fleet below standards. Immediate remediation required."

        return InsuranceMetrics(
            average_sire_score=avg_score,
            insurance_impact=impact,
            estimated_premium_multiplier=multiplier,
            recommendation=recommendation,
        )

    # ============ HELPER METHODS ============

    async def _get_vessel_sire_score(self, vessel_id: str) -> float:
        """
        Get SIRE score for vessel.
        In real implementation, this would query external inspection API.
        Currently returns mock data.
        """
        # Mock: return score based on vessel ID hash for consistent results
        import hashlib
        hash_val = int(hashlib.md5(str(vessel_id).encode()).hexdigest(), 16)
        score = 75 + (hash_val % 25)  # Score between 75-100
        return float(score)

    async def _count_findings_by_severity(
        self, vessel_id: str, severity: str
    ) -> int:
        """Count findings by severity level"""
        # Mock implementation
        severity_counts = {
            "critical": 0,
            "major": 1,
            "minor": 2,
        }
        return severity_counts.get(severity, 0)

    async def _get_last_inspection_date(
        self, vessel_id: str
    ) -> Optional[datetime]:
        """Get last inspection date for vessel"""
        # Mock: return 30 days ago
        return self.now - timedelta(days=30)

    def _map_doc_type_to_category(self, doc_type_id: str) -> str:
        """Map document type to finding category"""
        # Mock mapping
        category_map = {
            "safety": "Safety Management",
            "operations": "Operational Practice",
            "equipment": "Equipment",
            "environmental": "Environmental",
            "crew": "Crew Management",
        }
        return category_map.get("safety", "General")

    # ============ ALERT PRIORITY ============

    def calculate_alert_priority(
        self, avg_sire_score: float, critical_findings_count: int
    ) -> str:
        """
        Determine alert priority for Owner.
        
        Thresholds:
        - CRITICAL: SIRE < 80 OR critical findings > 2
        - HIGH: SIRE < 85 OR major findings > 5
        - MEDIUM: SIRE < 90
        - LOW: otherwise
        """
        if avg_sire_score < 80 or critical_findings_count > 2:
            return "critical"
        elif avg_sire_score < 85:
            return "high"
        elif avg_sire_score < 90:
            return "medium"
        return "low"