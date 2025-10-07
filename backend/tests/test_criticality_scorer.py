"""
Unit tests for criticality scoring service
"""

from datetime import datetime, timedelta

import pytest

from app.schemas import Criticality, DocumentResponse
from app.services.criticality_scorer import CriticalityScorer


@pytest.fixture
def scorer():
    return CriticalityScorer()


@pytest.fixture
def sample_documents():
    """Create sample documents for testing"""
    now = datetime.now()

    return [
        DocumentResponse(
            id="1",
            type_code="Q88",
            type_name="Tanker Questionnaire",
            status="missing",
            expires_on=None,
            uploaded_by=None,
            uploaded_at=None,
            notes=None,
            required=True,
            criticality=Criticality.HIGH,
            criticality_score=0,
        ),
        DocumentResponse(
            id="2",
            type_code="FENDER_CERT",
            type_name="Fender Certification",
            status="approved",
            expires_on=now + timedelta(hours=12),
            uploaded_by="Test User",
            uploaded_at=now,
            notes=None,
            required=True,
            criticality=Criticality.MED,
            criticality_score=0,
        ),
        DocumentResponse(
            id="3",
            type_code="STS_HISTORY",
            type_name="Last 3 STS Ops",
            status="missing",
            expires_on=None,
            uploaded_by=None,
            uploaded_at=None,
            notes=None,
            required=False,
            criticality=Criticality.LOW,
            criticality_score=0,
        ),
        DocumentResponse(
            id="4",
            type_code="CLASS_STATUS",
            type_name="Class & Statutory",
            status="expired",
            expires_on=now - timedelta(days=1),
            uploaded_by="Test User",
            uploaded_at=now - timedelta(days=30),
            notes="Expired document",
            required=True,
            criticality=Criticality.HIGH,
            criticality_score=0,
        ),
    ]


def test_calculate_document_score_missing_high_criticality(scorer, sample_documents):
    """Test scoring for missing high criticality document"""
    doc = sample_documents[0]  # Q88 - missing, required, high
    score = scorer.calculate_document_score(doc)

    # Base score: (3 if required) * (3 for high) * (1 for no expiry) = 9
    assert score == 9


def test_calculate_document_score_expiring_medium_criticality(scorer, sample_documents):
    """Test scoring for expiring medium criticality document"""
    doc = sample_documents[1]  # FENDER_CERT - approved, required, med, expiring in 12h
    score = scorer.calculate_document_score(doc)

    # Base score: (3 if required) * (2 for med) * (6 for within 3 days) = 36
    assert score == 36


def test_calculate_document_score_optional_low_criticality(scorer, sample_documents):
    """Test scoring for optional low criticality document"""
    doc = sample_documents[2]  # STS_HISTORY - missing, not required, low
    score = scorer.calculate_document_score(doc)

    # Base score: (1 if not required) * (1 for low) * (1 for no expiry) = 1
    assert score == 1


def test_calculate_document_score_expired_high_criticality(scorer, sample_documents):
    """Test scoring for expired high criticality document"""
    doc = sample_documents[3]  # CLASS_STATUS - expired, required, high
    score = scorer.calculate_document_score(doc)

    # Base score: (3 if required) * (3 for high) * (9 for expired) = 81
    assert score == 81


def test_rank_documents_by_urgency(scorer, sample_documents):
    """Test document ranking by urgency"""
    ranked_docs = scorer.rank_documents_by_urgency(sample_documents)

    # Should be sorted by score descending
    assert ranked_docs[0].id == "4"  # CLASS_STATUS - expired, score 81
    assert ranked_docs[1].id == "2"  # FENDER_CERT - expiring, score 36
    assert ranked_docs[2].id == "0"  # Q88 - missing, score 9
    assert ranked_docs[3].id == "2"  # STS_HISTORY - optional, score 1


def test_get_blockers(scorer, sample_documents):
    """Test getting blocking documents"""
    blockers = scorer.get_blockers(sample_documents)

    # Should only include missing, expired, under_review
    assert len(blockers) == 3
    assert blockers[0].id == "4"  # CLASS_STATUS - expired
    assert blockers[1].id == "0"  # Q88 - missing
    assert blockers[2].id == "2"  # STS_HISTORY - missing


def test_get_expiring_soon(scorer, sample_documents):
    """Test getting documents expiring soon"""
    expiring = scorer.get_expiring_soon(sample_documents, days_threshold=7)

    # Should only include approved documents with expiry dates
    assert len(expiring) == 1
    assert expiring[0].id == "2"  # FENDER_CERT


def test_calculate_progress(scorer, sample_documents):
    """Test progress calculation"""
    progress = scorer.calculate_progress(sample_documents)

    # 2 required documents, 1 resolved (FENDER_CERT)
    assert progress["total_required_docs"] == 2
    assert progress["resolved_required_docs"] == 1
    assert progress["progress_percentage"] == 50.0


def test_calculate_progress_no_required_docs(scorer):
    """Test progress calculation with no required documents"""
    docs = [
        DocumentResponse(
            id="1",
            type_code="OPTIONAL",
            type_name="Optional Doc",
            status="missing",
            expires_on=None,
            uploaded_by=None,
            uploaded_at=None,
            notes=None,
            required=False,
            criticality=Criticality.LOW,
            criticality_score=0,
        )
    ]

    progress = scorer.calculate_progress(docs)
    assert progress["total_required_docs"] == 0
    assert progress["resolved_required_docs"] == 0
    assert progress["progress_percentage"] == 100.0


def test_calculate_progress_all_resolved(scorer):
    """Test progress calculation with all required documents resolved"""
    now = datetime.now()
    docs = [
        DocumentResponse(
            id="1",
            type_code="REQUIRED",
            type_name="Required Doc",
            status="approved",
            expires_on=now + timedelta(days=30),
            uploaded_by="Test User",
            uploaded_at=now,
            notes=None,
            required=True,
            criticality=Criticality.HIGH,
            criticality_score=0,
        )
    ]

    progress = scorer.calculate_progress(docs)
    assert progress["total_required_docs"] == 1
    assert progress["resolved_required_docs"] == 1
    assert progress["progress_percentage"] == 100.0
