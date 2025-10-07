"""
Storage service for STS clearance documents
Handles file uploads, storage, and retrieval
"""

import hashlib
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)


class StorageService:
    """Abstract storage service interface"""

    def __init__(self, base_path: str = "uploads"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def store_file(
        self, file: UploadFile, room_id: str, document_type: str
    ) -> Tuple[str, str, int]:
        """
        Store uploaded file

        Args:
            file: Uploaded file
            room_id: Room identifier
            document_type: Document type code

        Returns:
            Tuple of (file_url, sha256_hash, size_bytes)
        """
        raise NotImplementedError

    async def get_file(self, file_url: str) -> Optional[Path]:
        """
        Retrieve file from storage

        Args:
            file_url: File URL/path

        Returns:
            File path or None if not found
        """
        raise NotImplementedError

    async def delete_file(self, file_url: str) -> bool:
        """
        Delete file from storage

        Args:
            file_url: File URL/path

        Returns:
            True if deleted, False otherwise
        """
        raise NotImplementedError


class LocalStorageService(StorageService):
    """Local filesystem storage implementation"""

    def __init__(self, base_path: str = "uploads"):
        super().__init__(base_path)
        self.max_file_size = 50 * 1024 * 1024  # 50MB
        self.allowed_mime_types = {
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/tiff",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }

    async def store_file(
        self, file: UploadFile, room_id: str, document_type: str = None
    ) -> Tuple[str, str, int]:
        """
        Store uploaded file in local filesystem

        Args:
            file: Uploaded file
            room_id: Room identifier
            document_type: Document type code (optional)

        Returns:
            Tuple of (file_url, sha256_hash, size_bytes)
        """
        # Validate file size
        if file.size and file.size > self.max_file_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {self.max_file_size // (1024*1024)}MB",
            )

        # Validate MIME type
        if file.content_type not in self.allowed_mime_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {', '.join(self.allowed_mime_types)}",
            )

        # Create directory structure: uploads/room_id/document_type/
        if document_type:
            file_dir = self.base_path / room_id / document_type
        else:
            file_dir = self.base_path / room_id
        file_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename
        file_extension = Path(file.filename).suffix if file.filename else ".pdf"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = file_dir / unique_filename

        # Read file content and calculate hash
        content = await file.read()
        sha256_hash = hashlib.sha256(content).hexdigest()
        size_bytes = len(content)

        # Write file to disk
        try:
            with open(file_path, "wb") as f:
                f.write(content)
        except Exception as e:
            logger.error(f"Failed to write file {file_path}: {e}")
            raise HTTPException(status_code=500, detail="Failed to store file")

        # Return relative path as file_url
        file_url = str(file_path.relative_to(self.base_path))

        logger.info(
            f"Stored file: {file_url} (size: {size_bytes}, hash: {sha256_hash})"
        )

        return file_url, sha256_hash, size_bytes

    async def get_file(self, file_url: str) -> Optional[Path]:
        """
        Retrieve file from local storage

        Args:
            file_url: Relative file path

        Returns:
            File path or None if not found
        """
        file_path = self.base_path / file_url

        if file_path.exists() and file_path.is_file():
            return file_path

        return None

    async def delete_file(self, file_url: str) -> bool:
        """
        Delete file from local storage

        Args:
            file_url: Relative file path

        Returns:
            True if deleted, False otherwise
        """
        file_path = self.base_path / file_url

        try:
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted file: {file_url}")
                return True
        except Exception as e:
            logger.error(f"Failed to delete file {file_url}: {e}")

        return False

    def get_absolute_path(self, file_url: str) -> Path:
        """
        Get absolute file path

        Args:
            file_url: Relative file path

        Returns:
            Absolute file path
        """
        return self.base_path / file_url

    def cleanup_old_files(self, max_age_days: int = 30) -> int:
        """
        Clean up old files (for maintenance)

        Args:
            max_age_days: Maximum age in days

        Returns:
            Number of files cleaned up
        """
        cutoff_time = datetime.now().timestamp() - (max_age_days * 24 * 3600)
        cleaned_count = 0

        for file_path in self.base_path.rglob("*"):
            if file_path.is_file():
                try:
                    if file_path.stat().st_mtime < cutoff_time:
                        file_path.unlink()
                        cleaned_count += 1
                except Exception as e:
                    logger.warning(f"Failed to clean up old file {file_path}: {e}")

        if cleaned_count > 0:
            logger.info(f"Cleaned up {cleaned_count} old files")

        return cleaned_count


# Global instance
storage_service = LocalStorageService()
