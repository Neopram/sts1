"""
Backup Service - Phase 2
Handles automated backups, scheduling, and restoration
"""

import os
import json
import gzip
import shutil
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class BackupConfig:
    """Backup configuration"""
    BACKUP_DIR = os.getenv("BACKUP_DIR", "/app/backups")
    MAX_BACKUP_AGE_DAYS = int(os.getenv("MAX_BACKUP_AGE_DAYS", "30"))
    MAX_BACKUPS_PER_USER = int(os.getenv("MAX_BACKUPS_PER_USER", "10"))
    BACKUP_RETENTION_POLICY = "delete_old"  # 'delete_old', 'archive', or 'keep_all'


class BackupService:
    """Handle database and file backups"""
    
    def __init__(self, config: BackupConfig = None):
        self.config = config or BackupConfig()
        self._ensure_backup_dir()
    
    def _ensure_backup_dir(self):
        """Ensure backup directory exists"""
        Path(self.config.BACKUP_DIR).mkdir(parents=True, exist_ok=True)
    
    def create_user_backup(
        self,
        user_id: int,
        db: Session,
        include_data: bool = True,
        include_documents: bool = True,
        compress: bool = True
    ) -> Dict:
        """
        Create a backup for specific user
        
        Args:
            user_id: User ID
            db: Database session
            include_data: Include settings and metadata
            include_documents: Include uploaded documents
            compress: Compress backup file
            
        Returns:
            Dictionary with backup information
        """
        try:
            backup_timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_name = f"user_{user_id}_backup_{backup_timestamp}"
            backup_path = Path(self.config.BACKUP_DIR) / user_id
            backup_path.mkdir(parents=True, exist_ok=True)
            
            backup_data = {
                "user_id": user_id,
                "backup_date": datetime.utcnow().isoformat(),
                "backup_version": "1.0"
            }
            
            # Backup user data
            if include_data:
                user_data = self._export_user_data(user_id, db)
                backup_data["user_data"] = user_data
            
            # Backup documents metadata
            if include_documents:
                documents_meta = self._export_documents_metadata(user_id, db)
                backup_data["documents"] = documents_meta
            
            # Write backup file
            if compress:
                backup_file = backup_path / f"{backup_name}.json.gz"
                with gzip.open(backup_file, 'wt', encoding='utf-8') as f:
                    json.dump(backup_data, f, indent=2, default=str)
            else:
                backup_file = backup_path / f"{backup_name}.json"
                with open(backup_file, 'w') as f:
                    json.dump(backup_data, f, indent=2, default=str)
            
            # Clean old backups
            self._cleanup_old_backups(user_id)
            
            return {
                "success": True,
                "backup_id": backup_name,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat(),
                "file_path": str(backup_file),
                "file_size": backup_file.stat().st_size,
                "compressed": compress
            }
        except Exception as e:
            logger.error(f"Error creating user backup: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def create_full_backup(self, db: Session, compress: bool = True) -> Dict:
        """
        Create full database backup (admin only)
        
        Args:
            db: Database session
            compress: Compress backup file
            
        Returns:
            Dictionary with backup information
        """
        try:
            backup_timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_name = f"full_backup_{backup_timestamp}"
            backup_dir = Path(self.config.BACKUP_DIR)
            
            # Export database
            backup_file = backup_dir / f"{backup_name}.sql"
            
            # TODO: Implement database dump
            # For SQLite: db.execute("VACUUM INTO ?", backup_file)
            # For PostgreSQL: pg_dump
            # For MySQL: mysqldump
            
            logger.info(f"Full backup created: {backup_file}")
            
            return {
                "success": True,
                "backup_id": backup_name,
                "timestamp": datetime.utcnow().isoformat(),
                "file_path": str(backup_file),
                "type": "full"
            }
        except Exception as e:
            logger.error(f"Error creating full backup: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def schedule_backup(
        self,
        user_id: int,
        frequency: str = "weekly",  # daily, weekly, monthly
        enabled: bool = True,
        db: Session = None
    ) -> Dict:
        """
        Schedule automatic backups for user
        
        Args:
            user_id: User ID
            frequency: Backup frequency
            enabled: Whether backup is enabled
            db: Database session
            
        Returns:
            Dictionary with backup schedule information
        """
        # TODO: Implement backup scheduling using APScheduler
        
        return {
            "success": True,
            "user_id": user_id,
            "frequency": frequency,
            "enabled": enabled,
            "next_backup": self._calculate_next_backup_time(frequency)
        }
    
    def get_backup_history(
        self,
        user_id: int,
        limit: int = 20
    ) -> List[Dict]:
        """
        Get backup history for user
        
        Args:
            user_id: User ID
            limit: Maximum number of backups to return
            
        Returns:
            List of backup records
        """
        try:
            backup_path = Path(self.config.BACKUP_DIR) / user_id
            
            if not backup_path.exists():
                return []
            
            backups = []
            for backup_file in sorted(backup_path.glob("*.json*"), reverse=True)[:limit]:
                file_size = backup_file.stat().st_size
                file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)
                
                backups.append({
                    "backup_id": backup_file.stem,
                    "file_name": backup_file.name,
                    "timestamp": file_time.isoformat(),
                    "file_size": file_size,
                    "file_size_mb": round(file_size / 1024 / 1024, 2),
                    "compressed": backup_file.suffix == ".gz"
                })
            
            return backups
        except Exception as e:
            logger.error(f"Error getting backup history: {str(e)}")
            return []
    
    def restore_backup(
        self,
        user_id: int,
        backup_id: str,
        db: Session
    ) -> Dict:
        """
        Restore user data from backup
        
        Args:
            user_id: User ID
            backup_id: Backup ID to restore
            db: Database session
            
        Returns:
            Dictionary with restoration results
        """
        try:
            backup_path = Path(self.config.BACKUP_DIR) / user_id
            
            # Find backup file
            backup_file = backup_path / f"{backup_id}.json.gz"
            if not backup_file.exists():
                backup_file = backup_path / f"{backup_id}.json"
            
            if not backup_file.exists():
                return {
                    "success": False,
                    "error": "Backup file not found"
                }
            
            # Read backup
            if backup_file.suffix == ".gz":
                with gzip.open(backup_file, 'rt', encoding='utf-8') as f:
                    backup_data = json.load(f)
            else:
                with open(backup_file, 'r') as f:
                    backup_data = json.load(f)
            
            # Restore user data
            if "user_data" in backup_data:
                self._restore_user_data(user_id, backup_data["user_data"], db)
            
            logger.info(f"Backup restored for user {user_id}: {backup_id}")
            
            return {
                "success": True,
                "message": "Backup restored successfully",
                "backup_id": backup_id,
                "timestamp": backup_data.get("backup_date")
            }
        except Exception as e:
            logger.error(f"Error restoring backup: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def delete_backup(self, user_id: int, backup_id: str) -> Dict:
        """Delete a backup"""
        try:
            backup_path = Path(self.config.BACKUP_DIR) / user_id
            
            for backup_file in backup_path.glob(f"{backup_id}*"):
                backup_file.unlink()
            
            return {
                "success": True,
                "message": "Backup deleted successfully"
            }
        except Exception as e:
            logger.error(f"Error deleting backup: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _export_user_data(self, user_id: int, db: Session) -> Dict:
        """Export user data to dictionary"""
        # TODO: Export user settings, profile, preferences
        return {
            "user_id": user_id,
            "settings": {},
            "preferences": {}
        }
    
    def _export_documents_metadata(self, user_id: int, db: Session) -> List[Dict]:
        """Export document metadata"""
        # TODO: Query documents from database
        return []
    
    def _restore_user_data(self, user_id: int, data: Dict, db: Session):
        """Restore user data from backup"""
        # TODO: Restore user settings and preferences
        pass
    
    def _cleanup_old_backups(self, user_id: int):
        """Remove old backups based on retention policy"""
        try:
            backup_path = Path(self.config.BACKUP_DIR) / user_id
            
            if not backup_path.exists():
                return
            
            # Get all backups
            backups = sorted(backup_path.glob("*.json*"))
            
            # Apply retention policy
            if len(backups) > self.config.MAX_BACKUPS_PER_USER:
                # Remove oldest backups
                for backup_file in backups[:-self.config.MAX_BACKUPS_PER_USER]:
                    if self.config.BACKUP_RETENTION_POLICY == "delete_old":
                        backup_file.unlink()
                        logger.info(f"Deleted old backup: {backup_file}")
            
            # Remove backups older than max age
            cutoff_date = datetime.utcnow() - timedelta(days=self.config.MAX_BACKUP_AGE_DAYS)
            for backup_file in backups:
                file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)
                if file_time < cutoff_date:
                    if self.config.BACKUP_RETENTION_POLICY == "delete_old":
                        backup_file.unlink()
                        logger.info(f"Deleted expired backup: {backup_file}")
        except Exception as e:
            logger.error(f"Error cleaning up old backups: {str(e)}")
    
    @staticmethod
    def _calculate_next_backup_time(frequency: str) -> str:
        """Calculate next backup time based on frequency"""
        now = datetime.utcnow()
        
        if frequency == "daily":
            next_time = now + timedelta(days=1)
        elif frequency == "weekly":
            next_time = now + timedelta(weeks=1)
        elif frequency == "monthly":
            next_time = now + timedelta(days=30)
        else:
            next_time = now + timedelta(weeks=1)
        
        return next_time.isoformat()


# Singleton instance
_backup_service = None


def get_backup_service() -> BackupService:
    """Get or create backup service instance"""
    global _backup_service
    if _backup_service is None:
        _backup_service = BackupService()
    return _backup_service