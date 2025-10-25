"""
Background Task Service for STS Clearance system
Handles asynchronous PDF generation and other long-running operations
Day 3 Enhancement: Async PDF generation for non-blocking snapshot creation
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Callable, Dict, Optional, Any

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Task execution status states"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BackgroundTask:
    """Represents a background task for async execution"""
    
    def __init__(self, task_id: str, task_type: str, data: Dict[str, Any]):
        self.task_id = task_id
        self.task_type = task_type
        self.data = data
        self.status = TaskStatus.PENDING
        self.created_at = datetime.utcnow()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None
        self.progress: float = 0.0  # 0-100%

    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary"""
        return {
            "task_id": self.task_id,
            "task_type": self.task_type,
            "status": self.status.value,
            "progress": self.progress,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "result": self.result,
            "error": self.error,
        }


class BackgroundTaskService:
    """
    Service for managing background tasks
    Supports async PDF generation and other long-running operations
    """
    
    def __init__(self):
        self.tasks: Dict[str, BackgroundTask] = {}
        self.handlers: Dict[str, Callable] = {}
        self.task_file = Path("uploads/.tasks")
        self.task_file.mkdir(parents=True, exist_ok=True)
        self._load_persisted_tasks()

    async def register_handler(self, task_type: str, handler: Callable) -> None:
        """Register a handler for a specific task type"""
        self.handlers[task_type] = handler
        logger.info(f"Registered handler for task type: {task_type}")

    async def create_task(
        self,
        task_type: str,
        data: Dict[str, Any],
        task_id: Optional[str] = None
    ) -> str:
        """
        Create and enqueue a background task
        
        Args:
            task_type: Type of task (e.g., "generate_pdf")
            data: Task data/parameters
            task_id: Optional custom task ID (auto-generated if not provided)
            
        Returns:
            Task ID
        """
        if task_id is None:
            task_id = str(uuid.uuid4())
        
        task = BackgroundTask(task_id, task_type, data)
        self.tasks[task_id] = task
        
        # Persist task to disk
        await self._persist_task(task)
        
        logger.info(f"Created background task: {task_id} (type: {task_type})")
        
        # Start task execution (fire and forget)
        asyncio.create_task(self._execute_task(task))
        
        return task_id

    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a task"""
        task = self.tasks.get(task_id)
        if task:
            return task.to_dict()
        
        # Try to load from disk if not in memory
        return await self._load_persisted_task(task_id)

    async def wait_for_task(
        self,
        task_id: str,
        timeout: int = 300
    ) -> Optional[Dict[str, Any]]:
        """
        Wait for a task to complete
        
        Args:
            task_id: ID of task to wait for
            timeout: Maximum seconds to wait
            
        Returns:
            Task result or None if timeout
        """
        start_time = datetime.utcnow()
        
        while True:
            task = self.tasks.get(task_id)
            if not task:
                return None
            
            if task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
                return task.to_dict()
            
            # Check timeout
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            if elapsed > timeout:
                logger.warning(f"Task {task_id} timed out after {timeout}s")
                return None
            
            # Wait a bit before checking again
            await asyncio.sleep(0.5)

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a task if it hasn't started yet"""
        task = self.tasks.get(task_id)
        if not task:
            return False
        
        if task.status == TaskStatus.PENDING:
            task.status = TaskStatus.CANCELLED
            await self._persist_task(task)
            logger.info(f"Cancelled task: {task_id}")
            return True
        
        return False

    async def _execute_task(self, task: BackgroundTask) -> None:
        """Execute a background task"""
        try:
            # Update status
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.utcnow()
            await self._persist_task(task)
            
            # Get handler for this task type
            handler = self.handlers.get(task.task_type)
            if not handler:
                raise ValueError(f"No handler registered for task type: {task.task_type}")
            
            logger.info(f"Executing task {task.task_id}: {task.task_type}")
            
            # Execute the task
            result = await handler(task)
            
            # Task completed successfully
            task.status = TaskStatus.COMPLETED
            task.result = result
            task.progress = 100.0
            task.completed_at = datetime.utcnow()
            
            logger.info(
                f"Task {task.task_id} completed in "
                f"{(task.completed_at - task.started_at).total_seconds():.2f}s"
            )
            
        except Exception as e:
            # Task failed
            task.status = TaskStatus.FAILED
            task.error = str(e)
            task.completed_at = datetime.utcnow()
            logger.error(f"Task {task.task_id} failed: {e}", exc_info=True)
        
        finally:
            await self._persist_task(task)

    async def _persist_task(self, task: BackgroundTask) -> None:
        """Save task state to disk"""
        try:
            task_file = self.task_file / f"{task.task_id}.json"
            task_data = task.to_dict()
            with open(task_file, "w") as f:
                json.dump(task_data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to persist task {task.task_id}: {e}")

    async def _load_persisted_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Load task state from disk"""
        try:
            task_file = self.task_file / f"{task_id}.json"
            if task_file.exists():
                with open(task_file, "r") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load task {task_id}: {e}")
        
        return None

    def _load_persisted_tasks(self) -> None:
        """Load all persisted tasks from disk on startup"""
        try:
            if self.task_file.exists():
                for task_file in self.task_file.glob("*.json"):
                    try:
                        with open(task_file, "r") as f:
                            task_data = json.load(f)
                            task_id = task_data.get("task_id")
                            
                            # Only load recent tasks (not older than 24 hours)
                            if task_id and self._is_recent(task_data.get("created_at")):
                                task = BackgroundTask(
                                    task_id,
                                    task_data.get("task_type"),
                                    {}
                                )
                                task.status = TaskStatus(task_data.get("status"))
                                task.created_at = datetime.fromisoformat(
                                    task_data.get("created_at")
                                )
                                if task_data.get("started_at"):
                                    task.started_at = datetime.fromisoformat(
                                        task_data.get("started_at")
                                    )
                                if task_data.get("completed_at"):
                                    task.completed_at = datetime.fromisoformat(
                                        task_data.get("completed_at")
                                    )
                                task.result = task_data.get("result")
                                task.error = task_data.get("error")
                                task.progress = task_data.get("progress", 0)
                                
                                self.tasks[task_id] = task
                    except Exception as e:
                        logger.warning(f"Failed to load task from {task_file}: {e}")
        except Exception as e:
            logger.error(f"Failed to load persisted tasks: {e}")

    @staticmethod
    def _is_recent(timestamp_str: str, hours: int = 24) -> bool:
        """Check if timestamp is recent (within specified hours)"""
        try:
            timestamp = datetime.fromisoformat(timestamp_str)
            delta = (datetime.utcnow() - timestamp).total_seconds()
            return delta < (hours * 3600)
        except Exception:
            return False

    async def cleanup_old_tasks(self, hours: int = 24) -> int:
        """Remove old task records to save disk space"""
        count = 0
        try:
            if self.task_file.exists():
                for task_file in self.task_file.glob("*.json"):
                    try:
                        with open(task_file, "r") as f:
                            task_data = json.load(f)
                            if not self._is_recent(task_data.get("created_at"), hours):
                                task_file.unlink()
                                count += 1
                    except Exception as e:
                        logger.warning(f"Failed to cleanup task file {task_file}: {e}")
            
            logger.info(f"Cleaned up {count} old task records")
        except Exception as e:
            logger.error(f"Failed to cleanup old tasks: {e}")
        
        return count


# Global service instance
background_task_service = BackgroundTaskService()