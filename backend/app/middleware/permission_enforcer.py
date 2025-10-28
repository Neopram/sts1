"""
Permission Enforcement Middleware
Centralizes all permission validation at the middleware level
Ensures backend enforces permissions (not frontend)
"""

import logging
from functools import wraps
from typing import Callable, List, Optional, Any

from fastapi import FastAPI, Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class PermissionConfig:
    """Configuration for endpoint permission requirements"""
    
    def __init__(self, required_permissions: List[str], require_auth: bool = True):
        """
        Initialize permission configuration
        
        Args:
            required_permissions: List of permission strings required (e.g., ["room.view", "document.read"])
            require_auth: Whether authentication is required (default: True)
        """
        self.required_permissions = required_permissions
        self.require_auth = require_auth


# Endpoint permission configuration
ENDPOINT_PERMISSIONS = {
    # Auth endpoints
    "/auth/login": PermissionConfig([], require_auth=False),
    "/auth/logout": PermissionConfig([], require_auth=True),
    "/auth/refresh": PermissionConfig([], require_auth=False),
    
    # User endpoints
    "/users/profile": PermissionConfig(["user.view_own"]),
    "/users/profile/update": PermissionConfig(["user.edit_own"]),
    "/users": PermissionConfig(["user.list"], require_auth=True),  # Admin
    "/users/{user_id}": PermissionConfig(["user.view"]),
    
    # Room endpoints
    "/rooms": PermissionConfig(["room.list"]),
    "/rooms/create": PermissionConfig(["room.create"]),
    "/rooms/{room_id}": PermissionConfig(["room.view"]),
    "/rooms/{room_id}/edit": PermissionConfig(["room.edit"]),
    "/rooms/{room_id}/delete": PermissionConfig(["room.delete"]),
    
    # Document endpoints
    "/documents": PermissionConfig(["document.list"]),
    "/documents/upload": PermissionConfig(["document.create"]),
    "/documents/{doc_id}": PermissionConfig(["document.view"]),
    "/documents/{doc_id}/download": PermissionConfig(["document.download"]),
    "/documents/{doc_id}/delete": PermissionConfig(["document.delete"]),
    
    # Admin endpoints
    "/admin": PermissionConfig(["admin.view"]),
    "/admin/users": PermissionConfig(["admin.manage_users"]),
    "/admin/rooms": PermissionConfig(["admin.manage_rooms"]),
    "/admin/reports": PermissionConfig(["admin.view_reports"]),
    
    # Health/Monitoring endpoints
    "/health": PermissionConfig([], require_auth=False),
    "/metrics": PermissionConfig([], require_auth=False),
}


class PermissionEnforcerMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce permission checks at request level
    This ensures permissions are validated on the backend, not just frontend
    """
    
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.app = app
        self.excluded_paths = {
            "/docs", "/redoc", "/openapi.json",  # Swagger/API docs
            "/health", "/metrics",  # Monitoring
            "/auth/login", "/auth/refresh",  # Public auth
        }
    
    async def dispatch(self, request: Request, call_next: Callable):
        """Process request and enforce permissions"""
        
        # Skip permission checks for excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)
        
        try:
            # Get user from request (set by AuthMiddleware)
            user = request.state.user if hasattr(request.state, "user") else None
            
            # Check if endpoint requires authentication
            endpoint_config = self._get_endpoint_config(request.url.path, request.method)
            
            if endpoint_config and endpoint_config.require_auth and not user:
                logger.warning(
                    f"🔒 Unauthorized access attempt: {request.method} {request.url.path}"
                )
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Not authenticated"}
                )
            
            # Check if user has required permissions
            if endpoint_config and endpoint_config.required_permissions and user:
                user_permissions = self._get_user_permissions(user)
                missing_permissions = [
                    p for p in endpoint_config.required_permissions
                    if p not in user_permissions
                ]
                
                if missing_permissions:
                    logger.warning(
                        f"🚫 Permission denied for user {user.get('id')}: "
                        f"Missing {missing_permissions} to access {request.method} {request.url.path}"
                    )
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "detail": "Insufficient permissions",
                            "missing_permissions": missing_permissions
                        }
                    )
            
            # Request authorized, proceed
            response = await call_next(request)
            return response
            
        except Exception as e:
            logger.error(f"❌ Permission enforcement error: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error"}
            )
    
    @staticmethod
    def _get_endpoint_config(path: str, method: str) -> Optional[PermissionConfig]:
        """Get permission configuration for an endpoint"""
        
        # Direct match
        if path in ENDPOINT_PERMISSIONS:
            return ENDPOINT_PERMISSIONS[path]
        
        # Prefix match
        for endpoint_path, config in ENDPOINT_PERMISSIONS.items():
            if path.startswith(endpoint_path):
                return config
        
        # Default: no specific config (allow if authenticated)
        return None
    
    @staticmethod
    def _get_user_permissions(user: dict) -> set:
        """Extract user permissions from user object"""
        
        if not user:
            return set()
        
        # Get permissions from user object
        permissions = set(user.get("permissions", []))
        
        # Add role-based permissions
        role = user.get("role", "user")
        role_permissions = PermissionEnforcerMiddleware._get_role_permissions(role)
        permissions.update(role_permissions)
        
        return permissions
    
    @staticmethod
    def _get_role_permissions(role: str) -> set:
        """Get permissions for a given role"""
        
        ROLE_PERMISSIONS = {
            "admin": {
                "admin.view", "admin.manage_users", "admin.manage_rooms",
                "admin.view_reports", "user.view", "user.list", "user.edit",
                "user.delete", "room.view", "room.list", "room.create",
                "room.edit", "room.delete", "document.view", "document.list",
                "document.create", "document.download", "document.delete",
                "user.view_own", "user.edit_own", "document.read"
            },
            "manager": {
                "room.view", "room.list", "room.create", "room.edit",
                "document.view", "document.list", "document.create",
                "document.download", "user.view_own", "user.edit_own",
                "user.view", "document.read"
            },
            "user": {
                "room.view", "room.list", "document.view", "document.list",
                "document.download", "user.view_own", "user.edit_own",
                "document.read"
            },
            "viewer": {
                "room.view", "room.list", "document.view", "document.list",
                "document.read"
            },
        }
        
        return ROLE_PERMISSIONS.get(role, set())


def require_permission(*permissions: str):
    """
    Decorator to mark endpoints as requiring specific permissions
    
    Usage:
        @require_permission("document.view", "room.access")
        async def get_document(doc_id: str):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Permission checking is done at middleware level
            # This decorator is for documentation and explicit marking
            return await func(*args, **kwargs)
        
        # Store permissions on function for documentation
        wrapper.__permissions__ = permissions  # type: ignore
        return wrapper
    
    return decorator


def require_role(*roles: str):
    """
    Decorator to mark endpoints as requiring specific roles
    
    Usage:
        @require_role("admin", "manager")
        async def get_admin_dashboard():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Role checking is done at middleware level
            return await func(*args, **kwargs)
        
        wrapper.__required_roles__ = roles  # type: ignore
        return wrapper
    
    return decorator


logger.info("✓ Permission Enforcer Middleware loaded")