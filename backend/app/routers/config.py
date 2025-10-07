"""
Configuration router for STS Clearance system
Handles system configuration, feature flags, and settings
"""

import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import DocumentType, FeatureFlag

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/config", tags=["configuration"])


# Pydantic models
class FeatureFlagResponse(BaseModel):
    key: str
    enabled: bool


class UpdateFeatureFlagRequest(BaseModel):
    enabled: bool


class DocumentTypeResponse(BaseModel):
    id: str
    code: str
    name: str
    required: bool
    criticality: str


class CreateDocumentTypeRequest(BaseModel):
    code: str
    name: str
    required: bool = True
    criticality: str = "med"


class UpdateDocumentTypeRequest(BaseModel):
    name: Optional[str] = None
    required: Optional[bool] = None
    criticality: Optional[str] = None


@router.get("/feature-flags", response_model=List[FeatureFlagResponse])
async def get_feature_flags(session: AsyncSession = Depends(get_async_session)):
    """
    Get all feature flags (public endpoint)
    """
    try:
        result = await session.execute(select(FeatureFlag))
        flags = result.scalars().all()

        return [
            FeatureFlagResponse(key=flag.key, enabled=flag.enabled) for flag in flags
        ]

    except Exception as e:
        logger.error(f"Error getting feature flags: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/feature-flags/{flag_key}")
async def get_feature_flag(
    flag_key: str, session: AsyncSession = Depends(get_async_session)
):
    """
    Get a specific feature flag (public endpoint)
    """
    try:
        result = await session.execute(
            select(FeatureFlag).where(FeatureFlag.key == flag_key)
        )
        flag = result.scalar_one_or_none()

        if not flag:
            raise HTTPException(status_code=404, detail="Feature flag not found")

        return FeatureFlagResponse(key=flag.key, enabled=flag.enabled)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting feature flag: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/feature-flags/{flag_key}")
async def update_feature_flag(
    flag_key: str,
    flag_data: UpdateFeatureFlagRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update a feature flag (admin only)
    """
    try:
        user_role = current_user.get("role", "")

        # Check if user is admin
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can modify feature flags",
            )

        # Update feature flag
        result = await session.execute(
            update(FeatureFlag)
            .where(FeatureFlag.key == flag_key)
            .values(enabled=flag_data.enabled)
        )

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Feature flag not found")

        await session.commit()

        return {"message": f"Feature flag '{flag_key}' updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating feature flag: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/document-types", response_model=List[DocumentTypeResponse])
async def get_document_types(session: AsyncSession = Depends(get_async_session)):
    """
    Get all document types
    """
    try:
        result = await session.execute(select(DocumentType))
        doc_types = result.scalars().all()

        return [
            DocumentTypeResponse(
                id=str(doc_type.id),
                code=doc_type.code,
                name=doc_type.name,
                required=doc_type.required,
                criticality=doc_type.criticality,
            )
            for doc_type in doc_types
        ]

    except Exception as e:
        logger.error(f"Error getting document types: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/document-types", response_model=DocumentTypeResponse)
async def create_document_type(
    doc_type_data: CreateDocumentTypeRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Create a new document type (admin only)
    """
    try:
        user_role = current_user.get("role", "")

        # Check if user is admin
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can create document types",
            )

        # Validate criticality
        valid_criticalities = ["high", "med", "low"]
        if doc_type_data.criticality not in valid_criticalities:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid criticality. Must be one of: {', '.join(valid_criticalities)}",
            )

        # Check if code already exists
        existing_result = await session.execute(
            select(DocumentType).where(DocumentType.code == doc_type_data.code)
        )
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=400, detail="Document type with this code already exists"
            )

        # Create document type
        doc_type = DocumentType(
            code=doc_type_data.code,
            name=doc_type_data.name,
            required=doc_type_data.required,
            criticality=doc_type_data.criticality,
        )
        session.add(doc_type)
        await session.commit()

        return DocumentTypeResponse(
            id=str(doc_type.id),
            code=doc_type.code,
            name=doc_type.name,
            required=doc_type.required,
            criticality=doc_type.criticality,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating document type: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/document-types/{doc_type_id}")
async def update_document_type(
    doc_type_id: str,
    doc_type_data: UpdateDocumentTypeRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update a document type (admin only)
    """
    try:
        user_role = current_user.get("role", "")

        # Check if user is admin
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can modify document types",
            )

        # Get document type
        result = await session.execute(
            select(DocumentType).where(DocumentType.id == doc_type_id)
        )
        doc_type = result.scalar_one_or_none()

        if not doc_type:
            raise HTTPException(status_code=404, detail="Document type not found")

        # Update fields
        if doc_type_data.name is not None:
            doc_type.name = doc_type_data.name

        if doc_type_data.required is not None:
            doc_type.required = doc_type_data.required

        if doc_type_data.criticality is not None:
            valid_criticalities = ["high", "med", "low"]
            if doc_type_data.criticality not in valid_criticalities:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid criticality. Must be one of: {', '.join(valid_criticalities)}",
                )
            doc_type.criticality = doc_type_data.criticality

        await session.commit()

        return {"message": "Document type updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document type: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/document-types/{doc_type_id}")
async def delete_document_type(
    doc_type_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Delete a document type (admin only)
    """
    try:
        user_role = current_user.get("role", "")

        # Check if user is admin
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can delete document types",
            )

        # Get document type
        result = await session.execute(
            select(DocumentType).where(DocumentType.id == doc_type_id)
        )
        doc_type = result.scalar_one_or_none()

        if not doc_type:
            raise HTTPException(status_code=404, detail="Document type not found")

        # Check if document type is in use
        from app.models import Document

        docs_result = await session.execute(
            select(Document).where(Document.type_id == doc_type_id).limit(1)
        )
        if docs_result.scalar_one_or_none():
            raise HTTPException(
                status_code=400, detail="Cannot delete document type that is in use"
            )

        # Delete document type
        await session.delete(doc_type)
        await session.commit()

        return {"message": "Document type deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document type: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/criticality-rules")
async def get_criticality_rules(session: AsyncSession = Depends(get_async_session)):
    """
    Get document criticality rules and statistics (public endpoint)
    """
    try:
        # Get document types with criticality information
        result = await session.execute(select(DocumentType))
        doc_types = result.scalars().all()
        
        # Group by criticality
        criticality_stats = {"high": 0, "med": 0, "low": 0}
        rules = []
        
        for doc_type in doc_types:
            criticality_stats[doc_type.criticality] += 1
            rules.append({
                "code": doc_type.code,
                "name": doc_type.name,
                "criticality": doc_type.criticality,
                "required": doc_type.required,
                "description": f"Maritime document: {doc_type.name}"
            })
        
        return {
            "rules": rules,
            "statistics": criticality_stats,
            "total_document_types": len(doc_types),
            "criticality_levels": {
                "high": "Critical documents required for STS operations",
                "med": "Important documents for compliance",
                "low": "Optional or supplementary documents"
            }
        }

    except Exception as e:
        logger.error(f"Error getting criticality rules: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/system-info")
async def get_system_info():
    """
    Get system information (public endpoint)
    """
    try:
        import platform
        import sys
        from datetime import datetime

        return {
            "system": {
                "platform": platform.system(),
                "python_version": sys.version,
                "timestamp": datetime.utcnow(),
            },
            "api": {
                "name": "STS Clearance API",
                "version": "1.0.0",
                "description": "Ship-to-Ship Transfer Operations Management System",
            },
            "features": {
                "real_time_chat": True,
                "document_management": True,
                "approval_workflow": True,
                "vessel_tracking": True,
                "activity_logging": True,
                "pdf_snapshots": True,
                "global_search": True,
                "statistics": True,
            },
        }

    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
