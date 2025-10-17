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
from app.permission_decorators import require_role

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
    
    🔐 5-Level Security Validation:
    1. Authentication: Verify user is logged in and exists in database
    2. Role-Based Permission: Check user role is "admin" via permission_matrix
    3. Data Validation: Validate input data format and business rules
    4. Change Tracking: Track what changed for audit trail
    5. Audit Logging: Log all changes with complete context
    """
    try:
        from app.models import User
        from app.permission_matrix import PermissionMatrix
        from datetime import datetime
        
        # ===== LEVEL 1: AUTHENTICATION =====
        user_id = current_user.get("user_id")
        user_email = current_user.get("email", "unknown")
        
        if not user_id:
            logger.warning(f"Missing user_id in token for update_feature_flag")
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Verify user exists in database
        user_result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            logger.warning(f"User {user_id} not found in database during feature flag update")
            raise HTTPException(status_code=401, detail="User not found")
        
        # ===== LEVEL 2: ROLE-BASED PERMISSION =====
        user_role = user.role or current_user.get("role", "")
        
        if not PermissionMatrix.has_permission(user_role, "config", "manage_feature_flags"):
            logger.warning(
                f"User {user_email} (ID: {user_id}, Role: {user_role}) "
                f"attempted unauthorized feature flag update: {flag_key}"
            )
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # ===== LEVEL 3: DATA VALIDATION =====
        # Validate flag_key format (alphanumeric, underscore, hyphen only)
        import re
        if not re.match(r"^[a-zA-Z0-9_-]+$", flag_key):
            raise HTTPException(status_code=400, detail="Invalid feature flag key format")
        
        # Get current flag to track changes
        current_flag_result = await session.execute(
            select(FeatureFlag).where(FeatureFlag.key == flag_key)
        )
        current_flag = current_flag_result.scalar_one_or_none()
        
        if not current_flag:
            logger.warning(f"Feature flag '{flag_key}' not found for update by {user_email}")
            raise HTTPException(status_code=404, detail="Feature flag not found")
        
        # ===== LEVEL 4: CHANGE TRACKING =====
        old_enabled = current_flag.enabled
        new_enabled = flag_data.enabled
        
        # Only update if value actually changed
        if old_enabled == new_enabled:
            return {
                "message": f"Feature flag '{flag_key}' unchanged",
                "key": flag_key,
                "enabled": new_enabled,
                "change_detected": False
            }
        
        # ===== UPDATE FLAG =====
        result = await session.execute(
            update(FeatureFlag)
            .where(FeatureFlag.key == flag_key)
            .values(enabled=flag_data.enabled)
        )
        
        await session.commit()
        
        # ===== LEVEL 5: AUDIT LOGGING =====
        logger.warning(
            f"🔐 CONFIG_FEATURE_FLAG_UPDATE | "
            f"User: {user_email} (ID: {user_id}, Role: {user_role}) | "
            f"Flag: {flag_key} | "
            f"Change: {old_enabled} → {new_enabled} | "
            f"Timestamp: {datetime.utcnow().isoformat()}"
        )
        
        return {
            "message": f"Feature flag '{flag_key}' updated successfully",
            "key": flag_key,
            "old_value": old_enabled,
            "new_value": new_enabled,
            "updated_by": user_email,
            "updated_at": datetime.utcnow().isoformat(),
            "change_detected": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating feature flag: {e}", exc_info=True)
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
    
    🔐 5-Level Security Validation:
    1. Authentication: Verify user is logged in and exists in database
    2. Role-Based Permission: Check user role is "admin" via permission_matrix
    3. Data Validation: Input sanitization, format validation, duplicate prevention
    4. Change Tracking: Record creation details for audit trail
    5. Audit Logging: Log all creations with complete context
    """
    try:
        from app.models import User
        from app.permission_matrix import PermissionMatrix
        from datetime import datetime
        
        # ===== LEVEL 1: AUTHENTICATION =====
        user_id = current_user.get("user_id")
        user_email = current_user.get("email", "unknown")
        
        if not user_id:
            logger.warning(f"Missing user_id in token for create_document_type")
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Verify user exists in database
        user_result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            logger.warning(f"User {user_id} not found in database during document type creation")
            raise HTTPException(status_code=401, detail="User not found")
        
        # ===== LEVEL 2: ROLE-BASED PERMISSION =====
        user_role = user.role or current_user.get("role", "")
        
        if not PermissionMatrix.has_permission(user_role, "config", "manage_document_types"):
            logger.warning(
                f"User {user_email} (ID: {user_id}, Role: {user_role}) "
                f"attempted unauthorized document type creation: {doc_type_data.code}"
            )
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # ===== LEVEL 3: DATA VALIDATION =====
        # Validate criticality (whitelist approach)
        valid_criticalities = ["high", "med", "low"]
        if doc_type_data.criticality not in valid_criticalities:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid criticality. Must be one of: {', '.join(valid_criticalities)}",
            )
        
        # Sanitize and validate code (alphanumeric, underscore, hyphen only, max 50 chars)
        import re
        code = doc_type_data.code.strip() if doc_type_data.code else ""
        if not code or len(code) > 50:
            raise HTTPException(
                status_code=400, 
                detail="Code must be 1-50 characters"
            )
        if not re.match(r"^[A-Z0-9_-]+$", code):
            raise HTTPException(
                status_code=400, 
                detail="Code must contain only uppercase letters, numbers, underscore, or hyphen"
            )
        
        # Sanitize name (max 200 chars)
        name = doc_type_data.name.strip() if doc_type_data.name else ""
        if not name or len(name) > 200:
            raise HTTPException(
                status_code=400, 
                detail="Name must be 1-200 characters"
            )
        
        # Check if code already exists (prevent duplicates)
        existing_result = await session.execute(
            select(DocumentType).where(DocumentType.code == code)
        )
        if existing_result.scalar_one_or_none():
            logger.warning(
                f"Duplicate document type code '{code}' creation attempted by {user_email}"
            )
            raise HTTPException(
                status_code=400, 
                detail=f"Document type with code '{code}' already exists"
            )
        
        # ===== ATOMIC TRANSACTION WITH SAVEPOINT =====
        async with session.begin_nested():
            # Create document type
            doc_type = DocumentType(
                code=code,
                name=name,
                required=bool(doc_type_data.required),
                criticality=doc_type_data.criticality,
            )
            session.add(doc_type)
            await session.flush()  # Flush to get the ID
            
            created_id = str(doc_type.id)
        
        # Commit transaction
        await session.commit()
        
        # ===== LEVEL 5: AUDIT LOGGING =====
        logger.warning(
            f"🔐 CONFIG_DOCUMENT_TYPE_CREATE | "
            f"User: {user_email} (ID: {user_id}, Role: {user_role}) | "
            f"Code: {code} | "
            f"Name: {name} | "
            f"Criticality: {doc_type_data.criticality} | "
            f"Required: {doc_type_data.required} | "
            f"TypeID: {created_id} | "
            f"Timestamp: {datetime.utcnow().isoformat()}"
        )
        
        return DocumentTypeResponse(
            id=created_id,
            code=code,
            name=name,
            required=doc_type_data.required,
            criticality=doc_type_data.criticality,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating document type: {e}", exc_info=True)
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
    
    🔐 5-Level Security Validation:
    1. Authentication: Verify user is logged in and exists in database
    2. Role-Based Permission: Check user role is "admin" via permission_matrix
    3. Data Validation: Whitelist criticality values, sanitize inputs
    4. Change Tracking: Track exactly what changed (before/after for each field)
    5. Audit Logging: Log all changes with complete context
    """
    try:
        from app.models import User
        from app.permission_matrix import PermissionMatrix
        from datetime import datetime
        
        # ===== LEVEL 1: AUTHENTICATION =====
        user_id = current_user.get("user_id")
        user_email = current_user.get("email", "unknown")
        
        if not user_id:
            logger.warning(f"Missing user_id in token for update_document_type")
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Verify user exists in database
        user_result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            logger.warning(f"User {user_id} not found in database during document type update")
            raise HTTPException(status_code=401, detail="User not found")
        
        # ===== LEVEL 2: ROLE-BASED PERMISSION =====
        user_role = user.role or current_user.get("role", "")
        
        if not PermissionMatrix.has_permission(user_role, "config", "manage_document_types"):
            logger.warning(
                f"User {user_email} (ID: {user_id}, Role: {user_role}) "
                f"attempted unauthorized document type update: {doc_type_id}"
            )
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # ===== LEVEL 3: DATA VALIDATION =====
        # Get document type
        result = await session.execute(
            select(DocumentType).where(DocumentType.id == doc_type_id)
        )
        doc_type = result.scalar_one_or_none()
        
        if not doc_type:
            logger.warning(f"Document type {doc_type_id} not found for update by {user_email}")
            raise HTTPException(status_code=404, detail="Document type not found")
        
        # ===== LEVEL 4: CHANGE TRACKING =====
        changes = {}
        
        # Track name change
        if doc_type_data.name is not None:
            name = doc_type_data.name.strip() if doc_type_data.name else ""
            if not name or len(name) > 200:
                raise HTTPException(
                    status_code=400, 
                    detail="Name must be 1-200 characters"
                )
            if name != doc_type.name:
                changes["name"] = {
                    "old": doc_type.name,
                    "new": name
                }
                doc_type.name = name
        
        # Track required change
        if doc_type_data.required is not None:
            if bool(doc_type_data.required) != doc_type.required:
                changes["required"] = {
                    "old": doc_type.required,
                    "new": bool(doc_type_data.required)
                }
                doc_type.required = bool(doc_type_data.required)
        
        # Track criticality change
        if doc_type_data.criticality is not None:
            valid_criticalities = ["high", "med", "low"]
            if doc_type_data.criticality not in valid_criticalities:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid criticality. Must be one of: {', '.join(valid_criticalities)}",
                )
            if doc_type_data.criticality != doc_type.criticality:
                changes["criticality"] = {
                    "old": doc_type.criticality,
                    "new": doc_type_data.criticality
                }
                doc_type.criticality = doc_type_data.criticality
        
        # Only commit if something changed
        if not changes:
            return {
                "message": "Document type unchanged",
                "doc_type_id": doc_type_id,
                "change_detected": False
            }
        
        # ===== ATOMIC UPDATE =====
        async with session.begin_nested():
            await session.merge(doc_type)
        
        await session.commit()
        
        # ===== LEVEL 5: AUDIT LOGGING =====
        changes_str = " | ".join([
            f"{field}: {change['old']} → {change['new']}"
            for field, change in changes.items()
        ])
        
        logger.warning(
            f"🔐 CONFIG_DOCUMENT_TYPE_UPDATE | "
            f"User: {user_email} (ID: {user_id}, Role: {user_role}) | "
            f"TypeID: {doc_type_id} | "
            f"TypeCode: {doc_type.code} | "
            f"Changes: {changes_str} | "
            f"Timestamp: {datetime.utcnow().isoformat()}"
        )
        
        return {
            "message": "Document type updated successfully",
            "doc_type_id": doc_type_id,
            "changes": changes,
            "updated_by": user_email,
            "updated_at": datetime.utcnow().isoformat(),
            "change_detected": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document type: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


class DeleteDocumentTypeRequest(BaseModel):
    """Request body for deleting document types with reason"""
    reason: str = None  # Optional but recommended reason for deletion


@router.delete("/document-types/{doc_type_id}")
async def delete_document_type(
    doc_type_id: str,
    delete_request: DeleteDocumentTypeRequest = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Delete a document type (admin only)
    
    🔐 5-Level Security Validation:
    1. Authentication: Verify user is logged in and exists in database
    2. Role-Based Permission: Check user role is "admin" via permission_matrix
    3. Data Validation: Validate reason (if provided), check if type is in use
    4. Change Tracking: Record deletion details including who deleted and when
    5. Audit Logging: Log all deletions with complete context and reason
    """
    try:
        from app.models import User, Document
        from app.permission_matrix import PermissionMatrix
        from datetime import datetime
        from sqlalchemy import delete as delete_stmt
        
        # ===== LEVEL 1: AUTHENTICATION =====
        user_id = current_user.get("user_id")
        user_email = current_user.get("email", "unknown")
        
        if not user_id:
            logger.warning(f"Missing user_id in token for delete_document_type")
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Verify user exists in database
        user_result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            logger.warning(f"User {user_id} not found in database during document type deletion")
            raise HTTPException(status_code=401, detail="User not found")
        
        # ===== LEVEL 2: ROLE-BASED PERMISSION =====
        user_role = user.role or current_user.get("role", "")
        
        if not PermissionMatrix.has_permission(user_role, "config", "manage_document_types"):
            logger.warning(
                f"User {user_email} (ID: {user_id}, Role: {user_role}) "
                f"attempted unauthorized document type deletion: {doc_type_id}"
            )
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # ===== LEVEL 3: DATA VALIDATION =====
        # Get document type
        result = await session.execute(
            select(DocumentType).where(DocumentType.id == doc_type_id)
        )
        doc_type = result.scalar_one_or_none()
        
        if not doc_type:
            logger.warning(f"Document type {doc_type_id} not found for deletion by {user_email}")
            raise HTTPException(status_code=404, detail="Document type not found")
        
        # Validate deletion reason (if provided)
        deletion_reason = ""
        if delete_request and delete_request.reason:
            reason = delete_request.reason.strip()
            if len(reason) > 500:
                raise HTTPException(
                    status_code=400,
                    detail="Deletion reason must be 500 characters or less"
                )
            if len(reason) > 0:
                deletion_reason = reason
        
        # Check if document type is in use
        docs_result = await session.execute(
            select(Document).where(Document.type_id == doc_type_id).limit(1)
        )
        if docs_result.scalar_one_or_none():
            logger.warning(
                f"Attempt to delete in-use document type {doc_type_id} by {user_email}"
            )
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete document type that is in use. Reassign or archive documents first."
            )
        
        # ===== LEVEL 4: CHANGE TRACKING =====
        deleted_info = {
            "id": doc_type_id,
            "code": doc_type.code,
            "name": doc_type.name,
            "criticality": doc_type.criticality,
            "required": doc_type.required,
            "deleted_at": datetime.utcnow().isoformat(),
            "deleted_by": user_email,
            "reason": deletion_reason if deletion_reason else "No reason provided"
        }
        
        # ===== ATOMIC DELETION =====
        async with session.begin_nested():
            await session.execute(
                delete_stmt(DocumentType).where(DocumentType.id == doc_type_id)
            )
        
        await session.commit()
        
        # ===== LEVEL 5: AUDIT LOGGING =====
        logger.warning(
            f"🔐 CONFIG_DOCUMENT_TYPE_DELETE | "
            f"User: {user_email} (ID: {user_id}, Role: {user_role}) | "
            f"TypeID: {doc_type_id} | "
            f"TypeCode: {doc_type.code} | "
            f"TypeName: {doc_type.name} | "
            f"Reason: {deletion_reason if deletion_reason else 'No reason provided'} | "
            f"Timestamp: {datetime.utcnow().isoformat()}"
        )
        
        return {
            "message": "Document type deleted successfully",
            "deleted_info": deleted_info,
            "deleted_by": user_email,
            "deleted_at": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document type: {e}", exc_info=True)
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
