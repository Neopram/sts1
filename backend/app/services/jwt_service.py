"""
JWT Token Management Service
Handles token generation, validation, refresh, and revocation
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from app.config.settings import Settings

logger = logging.getLogger(__name__)

settings = Settings()

# Token blacklist (in production, use Redis)
_token_blacklist: set = set()


class JWTService:
    """Service for JWT token management"""
    
    @staticmethod
    def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a new access token
        
        Args:
            data: Token payload data
            expires_delta: Custom expiration time
            
        Returns:
            Encoded JWT token
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)
        
        to_encode.update({"exp": expire})
        to_encode.update({"type": "access"})
        to_encode.update({"iat": datetime.now(timezone.utc)})
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm
        )
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a new refresh token (longer expiration)
        
        Args:
            data: Token payload data
            expires_delta: Custom expiration time
            
        Returns:
            Encoded refresh token
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            # Refresh tokens last 7 days
            expire = datetime.now(timezone.utc) + timedelta(days=7)
        
        to_encode.update({"exp": expire})
        to_encode.update({"type": "refresh"})
        to_encode.update({"iat": datetime.now(timezone.utc)})
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.jwt_refresh_secret_key,
            algorithm=settings.jwt_algorithm
        )
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """
        Verify and decode a token
        
        Args:
            token: Token to verify
            token_type: Expected token type (access or refresh)
            
        Returns:
            Token payload if valid, None otherwise
        """
        try:
            if token in _token_blacklist:
                logger.warning(f"Token is blacklisted: {token[:20]}...")
                return None
            
            secret_key = (
                settings.jwt_secret_key if token_type == "access"
                else settings.jwt_refresh_secret_key
            )
            
            payload = jwt.decode(
                token,
                secret_key,
                algorithms=[settings.jwt_algorithm]
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                logger.warning(f"Token type mismatch: expected {token_type}, got {payload.get('type')}")
                return None
            
            return payload
        except JWTError as e:
            logger.error(f"JWT verification failed: {str(e)}")
            return None
    
    @staticmethod
    def revoke_token(token: str) -> bool:
        """
        Revoke (blacklist) a token
        
        Args:
            token: Token to revoke
            
        Returns:
            True if successfully revoked
        """
        try:
            _token_blacklist.add(token)
            logger.info(f"Token revoked: {token[:20]}...")
            return True
        except Exception as e:
            logger.error(f"Error revoking token: {str(e)}")
            return False
    
    @staticmethod
    def is_token_revoked(token: str) -> bool:
        """
        Check if a token is revoked
        
        Args:
            token: Token to check
            
        Returns:
            True if token is revoked
        """
        return token in _token_blacklist
    
    @staticmethod
    def clear_blacklist() -> None:
        """Clear the token blacklist (for testing only)"""
        global _token_blacklist
        _token_blacklist.clear()
        logger.info("Token blacklist cleared")


# Initialize token service
jwt_service = JWTService()