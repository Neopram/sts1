"""
PDF Cache Service for STS Clearance system
Implements dual-layer caching: in-memory + disk cache
Day 3 Enhancement: Content-addressed storage by SHA256 hash to avoid duplicate PDFs
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Tuple, Any

logger = logging.getLogger(__name__)


class CacheEntry:
    """Represents a cached PDF entry"""
    
    def __init__(
        self,
        content_hash: str,
        pdf_content: bytes,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.content_hash = content_hash
        self.pdf_content = pdf_content
        self.metadata = metadata or {}
        self.created_at = datetime.utcnow()
        self.last_accessed = datetime.utcnow()
        self.access_count = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "content_hash": self.content_hash,
            "size_bytes": len(self.pdf_content),
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "last_accessed": self.last_accessed.isoformat(),
            "access_count": self.access_count,
        }

    @staticmethod
    def from_dict(data: Dict[str, Any], pdf_content: bytes) -> "CacheEntry":
        """Create cache entry from dictionary"""
        entry = CacheEntry(data["content_hash"], pdf_content, data.get("metadata", {}))
        entry.created_at = datetime.fromisoformat(data["created_at"])
        entry.last_accessed = datetime.fromisoformat(data["last_accessed"])
        entry.access_count = data.get("access_count", 0)
        return entry


class PDFCacheService:
    """
    Dual-layer PDF cache service: in-memory + disk
    Content-addressed storage using SHA256 hashes
    """
    
    def __init__(self, max_memory_cache_size_mb: int = 100):
        self.memory_cache: Dict[str, CacheEntry] = {}
        self.max_memory_size = max_memory_cache_size_mb * 1024 * 1024
        self.cache_dir = Path("uploads/.pdf_cache")
        self.metadata_file = self.cache_dir / "cache_metadata.json"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Metrics
        self.memory_hits = 0
        self.disk_hits = 0
        self.cache_misses = 0
        self.cache_evictions = 0
        
        self._load_cache_metadata()

    async def get_or_generate(
        self,
        content_hash: str,
        generator_func,
        metadata: Optional[Dict[str, Any]] = None,
        **generator_kwargs
    ) -> Tuple[bytes, bool]:
        """
        Get cached PDF or generate new one
        
        Args:
            content_hash: SHA256 hash of content
            generator_func: Async function to generate PDF
            metadata: Optional metadata to store with cache
            **generator_kwargs: Arguments to pass to generator function
            
        Returns:
            Tuple of (pdf_content, was_cached)
        """
        # Try memory cache first
        if content_hash in self.memory_cache:
            self.memory_hits += 1
            entry = self.memory_cache[content_hash]
            entry.last_accessed = datetime.utcnow()
            entry.access_count += 1
            logger.debug(f"Memory cache hit for {content_hash[:16]}... (access #{entry.access_count})")
            return entry.pdf_content, True
        
        # Try disk cache second
        disk_content = await self._load_from_disk(content_hash)
        if disk_content is not None:
            self.disk_hits += 1
            logger.debug(f"Disk cache hit for {content_hash[:16]}...")
            
            # Optionally add back to memory cache if space available
            entry = CacheEntry(content_hash, disk_content, metadata)
            await self._add_to_memory_cache(entry)
            
            return disk_content, True
        
        # Cache miss - generate new PDF
        self.cache_misses += 1
        logger.debug(f"Cache miss for {content_hash[:16]}... - generating PDF")
        
        pdf_content = await generator_func(**generator_kwargs)
        
        # Verify hash matches (security check)
        actual_hash = hashlib.sha256(pdf_content).hexdigest()
        if actual_hash != content_hash:
            logger.warning(
                f"Generated PDF hash mismatch. Expected {content_hash}, "
                f"got {actual_hash}. Using actual hash."
            )
        
        # Store in both caches
        entry = CacheEntry(actual_hash, pdf_content, metadata)
        await self._add_to_memory_cache(entry)
        await self._add_to_disk_cache(entry)
        
        return pdf_content, False

    async def invalidate_cache(self, content_hash: str) -> bool:
        """Invalidate a cache entry"""
        success = False
        
        # Remove from memory
        if content_hash in self.memory_cache:
            del self.memory_cache[content_hash]
            success = True
        
        # Remove from disk
        removed = await self._remove_from_disk(content_hash)
        success = success or removed
        
        if success:
            logger.info(f"Invalidated cache for {content_hash[:16]}...")
        
        return success

    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_memory_used = sum(len(e.pdf_content) for e in self.memory_cache.values())
        total_disk_used = await self._calculate_disk_usage()
        
        total_requests = self.memory_hits + self.disk_hits + self.cache_misses
        hit_rate = (
            ((self.memory_hits + self.disk_hits) / total_requests * 100)
            if total_requests > 0
            else 0
        )
        
        return {
            "memory_entries": len(self.memory_cache),
            "memory_used_mb": round(total_memory_used / (1024 * 1024), 2),
            "memory_limit_mb": self.max_memory_size / (1024 * 1024),
            "memory_hits": self.memory_hits,
            "disk_hits": self.disk_hits,
            "cache_misses": self.cache_misses,
            "total_requests": total_requests,
            "hit_rate_percent": round(hit_rate, 2),
            "disk_used_mb": round(total_disk_used / (1024 * 1024), 2),
            "cache_evictions": self.cache_evictions,
        }

    async def clear_old_entries(self, hours: int = 24) -> int:
        """Remove cache entries older than specified hours"""
        count = 0
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Clear from memory
        entries_to_remove = [
            hash_key for hash_key, entry in self.memory_cache.items()
            if entry.last_accessed < cutoff_time
        ]
        for hash_key in entries_to_remove:
            del self.memory_cache[hash_key]
            count += 1
        
        # Clear from disk
        disk_removed = await self._clear_old_disk_entries(cutoff_time)
        count += disk_removed
        
        logger.info(f"Cleared {count} old cache entries")
        return count

    @staticmethod
    def calculate_content_hash(
        room_data: Dict[str, Any],
        include_documents: bool,
        include_approvals: bool,
        include_activity: bool
    ) -> str:
        """
        Calculate SHA256 hash of PDF content parameters
        Used to detect duplicate snapshots
        """
        # Create a deterministic string from content parameters
        content_key = json.dumps({
            "room_id": room_data.get("id"),
            "room_title": room_data.get("title"),
            "room_location": room_data.get("location"),
            "room_sts_eta": str(room_data.get("sts_eta")),
            "parties": sorted([
                f"{p.get('name')}:{p.get('email')}" 
                for p in room_data.get("parties", [])
            ]),
            "vessels": sorted([
                f"{v.get('name')}:{v.get('imo_number')}"
                for v in room_data.get("vessels", [])
            ]),
            "include_documents": include_documents,
            "include_approvals": include_approvals,
            "include_activity": include_activity,
        }, sort_keys=True)
        
        return hashlib.sha256(content_key.encode()).hexdigest()

    async def _add_to_memory_cache(self, entry: CacheEntry) -> None:
        """Add entry to memory cache with eviction if needed"""
        current_size = sum(len(e.pdf_content) for e in self.memory_cache.values())
        entry_size = len(entry.pdf_content)
        
        # Check if we need to evict
        if current_size + entry_size > self.max_memory_size:
            await self._evict_from_memory_cache(entry_size)
        
        self.memory_cache[entry.content_hash] = entry

    async def _evict_from_memory_cache(self, needed_space: int) -> None:
        """Evict least recently used entries to make space"""
        if not self.memory_cache:
            return
        
        # Sort by last_accessed time (LRU)
        sorted_entries = sorted(
            self.memory_cache.items(),
            key=lambda x: x[1].last_accessed
        )
        
        freed_space = 0
        for hash_key, entry in sorted_entries:
            if freed_space >= needed_space:
                break
            
            freed_space += len(entry.pdf_content)
            del self.memory_cache[hash_key]
            self.cache_evictions += 1
        
        logger.info(f"Evicted {self.cache_evictions} entries from memory cache")

    async def _add_to_disk_cache(self, entry: CacheEntry) -> None:
        """Add entry to disk cache"""
        try:
            # Store PDF content
            pdf_file = self.cache_dir / f"{entry.content_hash}.pdf"
            if not pdf_file.exists():
                with open(pdf_file, "wb") as f:
                    f.write(entry.pdf_content)
            
            # Store metadata
            metadata = entry.to_dict()
            self._save_cache_metadata(entry.content_hash, metadata)
            
            logger.debug(f"Stored PDF in disk cache: {entry.content_hash[:16]}...")
        except Exception as e:
            logger.error(f"Failed to store in disk cache: {e}")

    async def _load_from_disk(self, content_hash: str) -> Optional[bytes]:
        """Load PDF from disk cache"""
        try:
            pdf_file = self.cache_dir / f"{content_hash}.pdf"
            if pdf_file.exists():
                with open(pdf_file, "rb") as f:
                    return f.read()
        except Exception as e:
            logger.error(f"Failed to load from disk cache: {e}")
        
        return None

    async def _remove_from_disk(self, content_hash: str) -> bool:
        """Remove PDF from disk cache"""
        try:
            pdf_file = self.cache_dir / f"{content_hash}.pdf"
            if pdf_file.exists():
                pdf_file.unlink()
                
                # Remove metadata
                self._remove_cache_metadata(content_hash)
                return True
        except Exception as e:
            logger.error(f"Failed to remove from disk cache: {e}")
        
        return False

    async def _calculate_disk_usage(self) -> int:
        """Calculate total disk space used by cache"""
        total = 0
        try:
            if self.cache_dir.exists():
                for pdf_file in self.cache_dir.glob("*.pdf"):
                    total += pdf_file.stat().st_size
        except Exception as e:
            logger.error(f"Failed to calculate disk usage: {e}")
        
        return total

    async def _clear_old_disk_entries(self, cutoff_time: datetime) -> int:
        """Clear old entries from disk cache"""
        count = 0
        try:
            if self.cache_dir.exists():
                for pdf_file in self.cache_dir.glob("*.pdf"):
                    if datetime.fromtimestamp(pdf_file.stat().st_mtime) < cutoff_time:
                        pdf_file.unlink()
                        count += 1
        except Exception as e:
            logger.error(f"Failed to clear old disk entries: {e}")
        
        return count

    def _save_cache_metadata(self, content_hash: str, metadata: Dict[str, Any]) -> None:
        """Save cache metadata to file"""
        try:
            all_metadata = {}
            if self.metadata_file.exists():
                with open(self.metadata_file, "r") as f:
                    all_metadata = json.load(f)
            
            all_metadata[content_hash] = metadata
            
            with open(self.metadata_file, "w") as f:
                json.dump(all_metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save cache metadata: {e}")

    def _remove_cache_metadata(self, content_hash: str) -> None:
        """Remove cache metadata entry"""
        try:
            if self.metadata_file.exists():
                with open(self.metadata_file, "r") as f:
                    all_metadata = json.load(f)
                
                all_metadata.pop(content_hash, None)
                
                with open(self.metadata_file, "w") as f:
                    json.dump(all_metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to remove cache metadata: {e}")

    def _load_cache_metadata(self) -> None:
        """Load cache metadata on startup"""
        try:
            if self.metadata_file.exists():
                with open(self.metadata_file, "r") as f:
                    # Metadata is loaded on-demand, not cached in memory
                    pass
        except Exception as e:
            logger.warning(f"Failed to load cache metadata: {e}")


# Global service instance
pdf_cache_service = PDFCacheService()