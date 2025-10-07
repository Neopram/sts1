"""
File service for STS Clearance system
Handles file uploads, storage, and management
"""

import logging
import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import UploadFile

logger = logging.getLogger(__name__)


class FileService:
    """
    Service for handling file operations
    """

    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(exist_ok=True)

    async def save_file(
        self, file: UploadFile, room_id: str, subfolder: str = "documents"
    ) -> str:
        """
        Save uploaded file and return the file path
        """
        try:
            # Create room directory
            room_dir = self.upload_dir / room_id / subfolder
            room_dir.mkdir(parents=True, exist_ok=True)

            # Generate unique filename
            file_extension = Path(file.filename).suffix if file.filename else ""
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = room_dir / unique_filename

            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Return relative path
            return str(file_path.relative_to(self.upload_dir))

        except Exception as e:
            logger.error(f"Error saving file: {e}")
            raise

    async def save_multiple_files(
        self, files: List[UploadFile], room_id: str, subfolder: str = "documents"
    ) -> List[str]:
        """
        Save multiple files and return list of file paths
        """
        file_paths = []
        for file in files:
            if file.filename:
                file_path = await self.save_file(file, room_id, subfolder)
                file_paths.append(file_path)
        return file_paths

    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file
        """
        try:
            full_path = self.upload_dir / file_path
            if full_path.exists():
                full_path.unlink()
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False

    def get_file_path(self, file_path: str) -> Optional[Path]:
        """
        Get full file path if file exists
        """
        try:
            full_path = self.upload_dir / file_path
            if full_path.exists():
                return full_path
            return None
        except Exception as e:
            logger.error(f"Error getting file path: {e}")
            return None

    def get_file_size(self, file_path: str) -> int:
        """
        Get file size in bytes
        """
        try:
            full_path = self.upload_dir / file_path
            if full_path.exists():
                return full_path.stat().st_size
            return 0
        except Exception as e:
            logger.error(f"Error getting file size: {e}")
            return 0

    def list_room_files(self, room_id: str, subfolder: str = "documents") -> List[str]:
        """
        List all files in a room directory
        """
        try:
            room_dir = self.upload_dir / room_id / subfolder
            if room_dir.exists():
                return [
                    str(f.relative_to(self.upload_dir))
                    for f in room_dir.iterdir()
                    if f.is_file()
                ]
            return []
        except Exception as e:
            logger.error(f"Error listing room files: {e}")
            return []


# Global file service instance
file_service = FileService()
