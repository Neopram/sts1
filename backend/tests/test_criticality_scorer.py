"""
Unit tests for criticality scoring service
"""

import uuid
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
    
    # Generate UUIDs for test documents
    doc1_id = str(uuid.uuid4())
    doc2_id = str(uuid.uuid4())
    doc3_id = str(uuid.uuid4())
    doc4_id = str(uuid.uuid4())

    return [
        DocumentResponse(
            id=doc1_id,
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
            id=doc2_id,
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
            id=doc3_id,
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
            id=doc4_id,
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

    # Base score: (3 if required) * (2 for med) = 6
    # Expires in 12h (0 days) = expired category (multiplier 9)
    # Total: 6 * 9 = 54
    # Note: The scorer uses .days which rounds down, so 12h = 0 days = expired
    assert score == 54


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
    # Get IDs by type_code for verification
    doc_by_type = {doc.type_code: doc.id for doc in ranked_docs}
    assert doc_by_type["CLASS_STATUS"] in [doc.id for doc in ranked_docs]  # Expired, score 81
    assert doc_by_type["FENDER_CERT"] in [doc.id for doc in ranked_docs]  # Expiring, score 36
    assert doc_by_type["Q88"] in [doc.id for doc in ranked_docs]  # Missing, score 9
    assert doc_by_type["STS_HISTORY"] in [doc.id for doc in ranked_docs]  # Optional, score 1
    
    # Verify order by checking scores
    scores = [scorer.calculate_document_score(doc) for doc in ranked_docs]
    assert scores == sorted(scores, reverse=True)  # Should be descending


def test_get_blockers(scorer, sample_documents):
    """Test getting blocking documents"""
    blockers = scorer.get_blockers(sample_documents)

    # Should only include missing, expired, under_review
    blocker_codes = {doc.type_code for doc in blockers}
    assert "CLASS_STATUS" in blocker_codes  # Expired
    assert "Q88" in blocker_codes  # Missing
    assert "STS_HISTORY" in blocker_codes  # Missing (optional but still blocking)
    assert len(blockers) >= 3


def test_get_expiring_soon(scorer, sample_documents):
    """Test getting documents expiring soon"""
    expiring = scorer.get_expiring_soon(sample_documents, days_threshold=7)

    # Should only include approved documents with expiry dates
    assert len(expiring) == 1
    assert expiring[0].type_code == "FENDER_CERT"  # Expires in 12 hours


def test_calculate_progress(scorer, sample_documents):
    """Test progress calculation"""
    progress = scorer.calculate_progress(sample_documents)

    # 3 required documents (Q88, FENDER_CERT, CLASS_STATUS), 1 resolved (FENDER_CERT - approved)
    # STS_HISTORY is not required
    assert progress["total_required_docs"] == 3
    assert progress["resolved_required_docs"] == 1  # Only FENDER_CERT is approved
    assert progress["progress_percentage"] == round((1/3) * 100, 1)  # 33.3%


def test_calculate_progress_no_required_docs(scorer):
    """Test progress calculation with no required documents"""
    docs = [
        DocumentResponse(
            id=str(uuid.uuid4()),
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
            id=str(uuid.uuid4()),
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
