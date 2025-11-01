"""
Criticality scoring service for STS clearance documents
Calculates urgency scores to rank blockers and prioritize actions
"""

from datetime import datetime, timedelta
from typing import List, Optional

from app.schemas import Criticality, DocumentResponse


class CriticalityScorer:
    """Calculates criticality scores for documents to determine urgency"""

    def __init__(self):
        # Criticality multipliers
        self.criticality_multipliers = {
            Criticality.HIGH: 3,
            Criticality.MED: 2,
            Criticality.LOW: 1,
        }

        # Expiry urgency multipliers
        self.expiry_multipliers = {
            "expired": 9,  # Already expired - highest urgency
            "within_3_days": 6,  # Expiring within 3 days
            "within_7_days": 3,  # Expiring within 7 days
            "beyond_7_days": 1,  # Expiring beyond 7 days
        }

    def calculate_document_score(self, document: DocumentResponse) -> int:
        """
        Calculate criticality score for a single document

        Args:
            document: Document to score

        Returns:
            Integer score (higher = more urgent)
        """
        # Base score from requirement and criticality
        base_score = (3 if document.required else 1) * self.criticality_multipliers[
            document.criticality
        ]

        # Apply expiry urgency multiplier
        expiry_multiplier = self._get_expiry_multiplier(document.expires_on)

        return base_score * expiry_multiplier

    def _get_expiry_multiplier(self, expires_on: Optional[datetime]) -> int:
        """Get expiry urgency multiplier based on days to expiry"""
        if not expires_on:
            return 1  # No expiry = lowest urgency

        now = datetime.now()
        days_to_expiry = (expires_on - now).days

        if days_to_expiry <= 0:
            return self.expiry_multipliers["expired"]
        elif days_to_expiry <= 3:
            return self.expiry_multipliers["within_3_days"]
        elif days_to_expiry <= 7:
            return self.expiry_multipliers["within_7_days"]
        else:
            return self.expiry_multipliers["beyond_7_days"]

    def rank_documents_by_urgency(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Rank documents by urgency (criticality score)

        Args:
            documents: List of documents to rank

        Returns:
            Sorted list with most urgent documents first
        """
        # Calculate scores for all documents
        scored_documents = []
        for doc in documents:
            score = self.calculate_document_score(doc)
            # Add score as a temporary attribute for sorting
            doc.criticality_score = score
            scored_documents.append(doc)

        # Sort by score (descending), then by earliest expiry for same scores
        scored_documents.sort(
            key=lambda x: (
                -x.criticality_score,  # Higher score first (negative for descending)
                x.expires_on or datetime.max,  # None expiry dates last
            )
        )

        return scored_documents

    def get_blockers(self, documents: List[DocumentResponse]) -> List[DocumentResponse]:
        """
        Get list of documents that are blocking clearance (missing, expired, under review)

        Args:
            documents: List of all documents

        Returns:
            List of blocking documents ranked by urgency
        """
        blockers = []
        for doc in documents:
            if doc.status in ["missing", "expired", "under_review"]:
                blockers.append(doc)

        # Rank by urgency
        return self.rank_documents_by_urgency(blockers)

    def get_expiring_soon(
        self, documents: List[DocumentResponse], days_threshold: int = 7
    ) -> List[DocumentResponse]:
        """
        Get list of documents expiring within specified days

        Args:
            documents: List of all documents
            days_threshold: Number of days to consider "soon" (default: 7)

        Returns:
            List of expiring documents ranked by urgency
        """
        now = datetime.now()
        expiring_soon = []

        for doc in documents:
            if doc.expires_on:
                days_to_expiry = (doc.expires_on - now).days
                if 0 <= days_to_expiry <= days_threshold:
                    expiring_soon.append(doc)

        # Rank by urgency
        return self.rank_documents_by_urgency(expiring_soon)

    def calculate_progress(self, documents: List[DocumentResponse]) -> dict:
        """
        Calculate overall progress percentage for required documents

        Args:
            documents: List of all documents

        Returns:
            Dictionary with progress information:
            {
                "total_required_docs": int,
                "resolved_required_docs": int,
                "progress_percentage": float
            }
        """
        required_docs = [doc for doc in documents if doc.required]
        total_required = len(required_docs)

        if not required_docs:
            return {
                "total_required_docs": 0,
                "resolved_required_docs": 0,
                "progress_percentage": 100.0
            }

        # Resolved = approved or under_review (not missing/expired)
        resolved_docs = [doc for doc in required_docs if doc.status in ["approved", "under_review"]]
        resolved_count = len(resolved_docs)

        progress = (resolved_count / total_required) * 100
        return {
            "total_required_docs": total_required,
            "resolved_required_docs": resolved_count,
            "progress_percentage": round(progress, 1)
        }

    def get_high_priority_documents(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Get documents with high priority (high criticality + missing/expired)

        Args:
            documents: List of all documents

        Returns:
            List of high priority documents
        """
        high_priority = []

        for doc in documents:
            if doc.criticality == Criticality.HIGH and doc.status in [
                "missing",
                "expired",
            ]:
                high_priority.append(doc)

        return self.rank_documents_by_urgency(high_priority)

    def get_medium_priority_documents(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Get documents with medium priority (medium criticality + missing/expired)

        Args:
            documents: List of all documents

        Returns:
            List of medium priority documents
        """
        medium_priority = []

        for doc in documents:
            if doc.criticality == Criticality.MED and doc.status in [
                "missing",
                "expired",
            ]:
                medium_priority.append(doc)

        return self.rank_documents_by_urgency(medium_priority)

    def get_low_priority_documents(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Get documents with low priority (low criticality + missing/expired)

        Args:
            documents: List of all documents

        Returns:
            List of low priority documents
        """
        low_priority = []

        for doc in documents:
            if doc.criticality == Criticality.LOW and doc.status in [
                "missing",
                "expired",
            ]:
                low_priority.append(doc)

        return self.rank_documents_by_urgency(low_priority)

    def get_documents_by_status(
        self, documents: List[DocumentResponse], status: str
    ) -> List[DocumentResponse]:
        """
        Get documents filtered by status

        Args:
            documents: List of all documents
            status: Status to filter by

        Returns:
            List of documents with specified status
        """
        filtered_docs = [doc for doc in documents if doc.status == status]
        return self.rank_documents_by_urgency(filtered_docs)

    def get_documents_by_criticality(
        self, documents: List[DocumentResponse], criticality: Criticality
    ) -> List[DocumentResponse]:
        """
        Get documents filtered by criticality level

        Args:
            documents: List of all documents
            criticality: Criticality level to filter by

        Returns:
            List of documents with specified criticality
        """
        filtered_docs = [doc for doc in documents if doc.criticality == criticality]
        return self.rank_documents_by_urgency(filtered_docs)

    def get_expired_documents(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Get all expired documents

        Args:
            documents: List of all documents

        Returns:
            List of expired documents ranked by urgency
        """
        expired_docs = [doc for doc in documents if doc.status == "expired"]
        return self.rank_documents_by_urgency(expired_docs)

    def get_missing_documents(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Get all missing documents

        Args:
            documents: List of all documents

        Returns:
            List of missing documents ranked by urgency
        """
        missing_docs = [doc for doc in documents if doc.status == "missing"]
        return self.rank_documents_by_urgency(missing_docs)

    def get_under_review_documents(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Get all documents under review

        Args:
            documents: List of all documents

        Returns:
            List of documents under review ranked by urgency
        """
        under_review_docs = [doc for doc in documents if doc.status == "under_review"]
        return self.rank_documents_by_urgency(under_review_docs)

    def get_approved_documents(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Get all approved documents

        Args:
            documents: List of all documents

        Returns:
            List of approved documents ranked by urgency
        """
        approved_docs = [doc for doc in documents if doc.status == "approved"]
        return self.rank_documents_by_urgency(approved_docs)

    def get_documents_expiring_today(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Get documents expiring today

        Args:
            documents: List of all documents

        Returns:
            List of documents expiring today
        """
        today = datetime.now().date()
        expiring_today = []

        for doc in documents:
            if doc.expires_on and doc.expires_on.date() == today:
                expiring_today.append(doc)

        return self.rank_documents_by_urgency(expiring_today)

    def get_documents_expiring_tomorrow(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Get documents expiring tomorrow

        Args:
            documents: List of all documents

        Returns:
            List of documents expiring tomorrow
        """
        tomorrow = datetime.now().date() + timedelta(days=1)
        expiring_tomorrow = []

        for doc in documents:
            if doc.expires_on and doc.expires_on.date() == tomorrow:
                expiring_tomorrow.append(doc)

        return self.rank_documents_by_urgency(expiring_tomorrow)

    def get_documents_expiring_this_week(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Get documents expiring this week (next 7 days)

        Args:
            documents: List of all documents

        Returns:
            List of documents expiring this week
        """
        now = datetime.now()
        week_from_now = now + timedelta(days=7)
        expiring_this_week = []

        for doc in documents:
            if doc.expires_on and now <= doc.expires_on <= week_from_now:
                expiring_this_week.append(doc)

        return self.rank_documents_by_urgency(expiring_this_week)

    def get_documents_expiring_this_month(
        self, documents: List[DocumentResponse]
    ) -> List[DocumentResponse]:
        """
        Get documents expiring this month

        Args:
            documents: List of all documents

        Returns:
            List of documents expiring this month
        """
        now = datetime.now()
        current_month = now.month
        current_year = now.year

        expiring_this_month = []

        for doc in documents:
            if doc.expires_on:
                expiry_month = doc.expires_on.month
                expiry_year = doc.expires_on.year

                if expiry_month == current_month and expiry_year == current_year:
                    expiring_this_month.append(doc)

        return self.rank_documents_by_urgency(expiring_this_month)


# Create global instance
criticality_scorer = CriticalityScorer()
