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


class S3StorageService(StorageService):
    """AWS S3 storage implementation for production"""

    def __init__(self, bucket_name: str = None, aws_region: str = "us-east-1"):
        super().__init__()
        import boto3
        
        self.bucket_name = bucket_name or os.getenv("AWS_S3_BUCKET", "sts-clearance-documents")
        self.aws_region = aws_region
        self.s3_client = boto3.client("s3", region_name=aws_region)
        self.max_file_size = 100 * 1024 * 1024  # 100MB
        self.allowed_mime_types = {
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/tiff",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }

    async def store_file(
        self, file: UploadFile, room_id: str, document_type: str = None
    ) -> Tuple[str, str, int]:
        """
        Store uploaded file in AWS S3

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

        # Read file content and calculate hash
        content = await file.read()
        sha256_hash = hashlib.sha256(content).hexdigest()
        size_bytes = len(content)

        # Create S3 key: s3://bucket/room_id/document_type/uuid_filename
        file_extension = Path(file.filename).suffix if file.filename else ".pdf"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        if document_type:
            s3_key = f"{room_id}/{document_type}/{unique_filename}"
        else:
            s3_key = f"{room_id}/{unique_filename}"

        try:
            # Upload to S3 with metadata
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=content,
                ContentType=file.content_type,
                Metadata={
                    "sha256": sha256_hash,
                    "original_filename": file.filename or "document",
                    "uploaded_at": datetime.utcnow().isoformat(),
                }
            )
            
            # Return S3 URL as file_url
            file_url = f"s3://{self.bucket_name}/{s3_key}"
            
            logger.info(
                f"Stored file in S3: {s3_key} (size: {size_bytes}, hash: {sha256_hash})"
            )
            
            return file_url, sha256_hash, size_bytes
            
        except Exception as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise HTTPException(status_code=500, detail="Failed to store file in cloud")

    async def get_file(self, file_url: str) -> Optional[bytes]:
        """
        Retrieve file from S3

        Args:
            file_url: S3 file URL (s3://bucket/key)

        Returns:
            File bytes or None if not found
        """
        try:
            # Parse S3 URL
            if not file_url.startswith("s3://"):
                return None
                
            parts = file_url.replace("s3://", "").split("/", 1)
            if len(parts) != 2:
                return None
                
            bucket, key = parts
            
            # Download from S3
            response = self.s3_client.get_object(Bucket=bucket, Key=key)
            return response["Body"].read()
            
        except Exception as e:
            logger.error(f"Failed to download from S3: {e}")
            return None

    async def delete_file(self, file_url: str) -> bool:
        """
        Delete file from S3

        Args:
            file_url: S3 file URL

        Returns:
            True if deleted, False otherwise
        """
        try:
            # Parse S3 URL
            if not file_url.startswith("s3://"):
                return False
                
            parts = file_url.replace("s3://", "").split("/", 1)
            if len(parts) != 2:
                return False
                
            bucket, key = parts
            
            # Delete from S3
            self.s3_client.delete_object(Bucket=bucket, Key=key)
            logger.info(f"Deleted file from S3: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete from S3: {e}")
            return False

    def get_presigned_url(self, file_url: str, expiration: int = 3600) -> str:
        """
        Generate presigned URL for direct S3 access

        Args:
            file_url: S3 file URL
            expiration: URL expiration time in seconds

        Returns:
            Presigned URL
        """
        try:
            parts = file_url.replace("s3://", "").split("/", 1)
            if len(parts) != 2:
                return ""
                
            bucket, key = parts
            
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=expiration
            )
            return url
            
        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return ""


# Global instance - choose based on environment
_storage_type = os.getenv("STORAGE_TYPE", "local").lower()

if _storage_type == "s3":
    storage_service = S3StorageService()
else:
    storage_service = LocalStorageService()
