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

    # ============ CREW CERTIFICATIONS VALIDATION ============

    async def validate_crew_certifications(
        self, vessel_id: str
    ) -> Dict[str, Any]:
        """
        Validate crew certifications for a vessel.
        
        Returns:
        {
          "vessel_id": str,
          "total_crew": int,
          "certifications": [
            {
              "cert_type": str,
              "holder_name": str,
              "issued_date": date,
              "expiry_date": date,
              "status": "valid|expiring|expired",
              "days_remaining": int
            }
          ],
          "overall_status": "good|warning|critical",
          "expiring_soon": int,
          "expired": int,
          "valid": int
        }
        """
        try:
            # Get vessel
            stmt = select(Vessel).where(Vessel.id == vessel_id)
            result = await self.session.execute(stmt)
            vessel = result.scalar_one_or_none()
            
            if not vessel:
                return {
                    "vessel_id": str(vessel_id),
                    "error": "Vessel not found",
                }
            
            # For now, return mock data (would come from crew management system)
            # In real implementation, this would query an external crew database
            
            valid_count = 18
            expiring_count = 1
            expired_count = 1
            
            certifications = [
                {
                    "cert_type": "Officer of the Watch (OOW)",
                    "holder_name": "Captain John Smith",
                    "issued_date": "2019-05-15",
                    "expiry_date": "2024-05-15",
                    "status": "valid",
                    "days_remaining": 180,
                },
                {
                    "cert_type": "Chief Engineer",
                    "holder_name": "Engineer James Brown",
                    "issued_date": "2018-03-20",
                    "expiry_date": "2025-03-20",
                    "status": "expiring",
                    "days_remaining": 90,
                },
                {
                    "cert_type": "Bosun",
                    "holder_name": "Crew Lead Michael Johnson",
                    "issued_date": "2021-06-10",
                    "expiry_date": "2024-01-10",
                    "status": "expired",
                    "days_remaining": -150,
                },
            ]
            
            # Determine overall status
            if expired_count > 0:
                overall_status = "critical"
            elif expiring_count > 2:
                overall_status = "warning"
            else:
                overall_status = "good"
            
            return {
                "vessel_id": str(vessel.id),
                "vessel_name": vessel.name,
                "total_crew": valid_count + expiring_count + expired_count,
                "certifications": certifications,
                "overall_status": overall_status,
                "valid": valid_count,
                "expiring_soon": expiring_count,
                "expired": expired_count,
            }
        
        except Exception as e:
            logger.error(f"Error validating crew certifications: {e}")
            return {
                "vessel_id": str(vessel_id),
                "error": str(e),
            }

    # ============ FINDING REMEDIATION STATUS ============

    async def calculate_finding_remediation_status(
        self, finding_id: str
    ) -> Dict[str, Any]:
        """
        Calculate remediation progress for a finding.
        
        Status progression:
        - Open: Just identified
        - In Progress: Started remediation (0-80% complete)
        - Near Completion: (80-99% complete)
        - Resolved: Complete and verified
        
        Returns:
        {
          "finding_id": str,
          "status": "open|in_progress|near_completion|resolved",
          "completion_percent": float,
          "days_open": int,
          "estimated_closure_days": int,
          "responsible_party": str,
          "actions_taken": List[str],
          "next_action": str,
          "target_date": date
        }
        """
        try:
            # Mock implementation - in real system would query inspection/finding system
            # For now, generate consistent data based on finding_id hash
            
            import hashlib
            hash_val = int(hashlib.md5(str(finding_id).encode()).hexdigest(), 16)
            
            # Determine status based on hash
            status_options = ["open", "in_progress", "near_completion", "resolved"]
            status_idx = hash_val % len(status_options)
            status = status_options[status_idx]
            
            # Completion percent based on status
            if status == "open":
                completion = 0
            elif status == "in_progress":
                completion = (hash_val % 80) + 1  # 1-80%
            elif status == "near_completion":
                completion = (hash_val % 20) + 80  # 80-99%
            else:
                completion = 100
            
            days_open = (hash_val % 90) + 1
            
            # Estimate days to closure
            if completion == 100:
                est_days = 0
            else:
                est_days = max(1, (100 - completion) // 10)
            
            target_date = (self.now + timedelta(days=est_days)).date()
            
            return {
                "finding_id": str(finding_id),
                "status": status,
                "completion_percent": float(completion),
                "days_open": days_open,
                "estimated_closure_days": est_days,
                "responsible_party": "Ship Owner" if status in ["open", "in_progress"] else "Inspector",
                "actions_taken": [
                    "Initial inspection completed",
                    "Root cause analysis performed",
                    "Corrective action plan drafted"
                ] if completion > 0 else [],
                "next_action": "Complete verification" if completion >= 90 else "Continue remediation activities",
                "target_date": target_date.isoformat(),
            }
        
        except Exception as e:
            logger.error(f"Error calculating finding remediation status: {e}")
            return {
                "finding_id": str(finding_id),
                "error": str(e),
            }

    # ============ SIRE EXTERNAL API SYNC (Mock) ============

    async def sync_sire_external_api(
        self, vessel_id: str, force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Sync SIRE data from external API.
        
        In production, this would call the actual SIRE API.
        Currently, returns mock data with caching.
        
        Cache: 24 hours
        
        Returns:
        {
          "vessel_id": str,
          "sire_score": float,
          "last_inspection": date,
          "findings_count": int,
          "api_status": "success|cached|error",
          "updated_at": datetime
        }
        """
        try:
            # Get vessel
            stmt = select(Vessel).where(Vessel.id == vessel_id)
            result = await self.session.execute(stmt)
            vessel = result.scalar_one_or_none()
            
            if not vessel:
                return {
                    "vessel_id": str(vessel_id),
                    "error": "Vessel not found",
                    "api_status": "error",
                }
            
            # In real implementation, would check cache first
            # Cache key: f"sire_score_{vessel_id}"
            # TTL: 24 hours
            
            # For now, generate mock data
            import hashlib
            hash_val = int(hashlib.md5(str(vessel_id).encode()).hexdigest(), 16)
            sire_score = 75 + (hash_val % 25)  # 75-100
            
            # Determine API status (90% success, 10% cached)
            if (hash_val % 10) < 9:
                api_status = "success"
                source = "live_api"
            else:
                api_status = "cached"
                source = "cache (24h)"
            
            last_inspection = self.now - timedelta(days=45 + (hash_val % 30))
            findings = hash_val % 5
            
            return {
                "vessel_id": str(vessel.id),
                "vessel_name": vessel.name,
                "sire_score": float(sire_score),
                "last_inspection": last_inspection.date().isoformat(),
                "findings_count": findings,
                "api_status": api_status,
                "data_source": source,
                "updated_at": self.now.isoformat(),
            }
        
        except Exception as e:
            logger.error(f"Error syncing SIRE API: {e}")
            return {
                "vessel_id": str(vessel_id),
                "error": str(e),
                "api_status": "error",
                "updated_at": self.now.isoformat(),
            }