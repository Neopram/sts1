"""
TOTP (Time-based One-Time Password) Service - Phase 2
Implements 2FA using TOTP algorithm (RFC 6238)
"""

import pyotp
import qrcode
from io import BytesIO
import base64
from typing import Tuple, Optional, List
import secrets
import logging

logger = logging.getLogger(__name__)


class TOTPService:
    """Time-based One-Time Password service for 2FA"""
    
    # Configuration
    TOTP_ISSUER = "STS Clearance Hub"
    TOTP_NAME = "STS Clearance"
    BACKUP_CODES_COUNT = 10
    BACKUP_CODE_LENGTH = 8
    
    @staticmethod
    def generate_secret() -> str:
        """
        Generate a new TOTP secret
        
        Returns:
            Base32 encoded secret key
        """
        return pyotp.random_base32()
    
    @staticmethod
    def get_provisioning_uri(secret: str, email: str, issuer: str = None) -> str:
        """
        Get provisioning URI for QR code generation
        
        Args:
            secret: TOTP secret
            email: User email
            issuer: Organization name
            
        Returns:
            Provisioning URI string
        """
        issuer = issuer or TOTPService.TOTP_ISSUER
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(
            name=email,
            issuer_name=issuer
        )
    
    @staticmethod
    def generate_qr_code(provisioning_uri: str) -> str:
        """
        Generate QR code from provisioning URI
        
        Args:
            provisioning_uri: TOTP provisioning URI
            
        Returns:
            Base64 encoded QR code PNG image
        """
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(provisioning_uri)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{img_str}"
        except Exception as e:
            logger.error(f"Error generating QR code: {str(e)}")
            return ""
    
    @staticmethod
    def verify_token(secret: str, token: str, window: int = 1) -> bool:
        """
        Verify TOTP token
        
        Args:
            secret: TOTP secret
            token: 6-digit code from authenticator app
            window: Time window tolerance (in 30-second intervals)
            
        Returns:
            True if token is valid, False otherwise
        """
        try:
            totp = pyotp.TOTP(secret)
            # window=1 allows checking current and adjacent time windows
            return totp.verify(token, valid_window=window)
        except Exception as e:
            logger.error(f"Error verifying TOTP token: {str(e)}")
            return False
    
    @staticmethod
    def get_current_token(secret: str) -> str:
        """
        Get current TOTP token (for testing)
        
        Args:
            secret: TOTP secret
            
        Returns:
            Current 6-digit code
        """
        totp = pyotp.TOTP(secret)
        return totp.now()
    
    @staticmethod
    def generate_backup_codes(count: int = None) -> List[str]:
        """
        Generate backup codes for account recovery
        
        Args:
            count: Number of codes to generate
            
        Returns:
            List of backup codes
        """
        count = count or TOTPService.BACKUP_CODES_COUNT
        codes = []
        
        for _ in range(count):
            # Generate random hex string
            code = secrets.token_hex(TOTPService.BACKUP_CODE_LENGTH // 2)
            # Format as XXXX-XXXX
            formatted_code = f"{code[:4]}-{code[4:]}"
            codes.append(formatted_code)
        
        return codes
    
    @staticmethod
    def verify_backup_code(stored_code: str, provided_code: str) -> bool:
        """
        Verify backup code (case insensitive, spaces allowed)
        
        Args:
            stored_code: Code from database
            provided_code: Code from user
            
        Returns:
            True if codes match, False otherwise
        """
        return stored_code.strip().upper() == provided_code.strip().upper()
    
    @staticmethod
    def create_2fa_setup_response(
        secret: str,
        email: str,
        backup_codes: List[str]
    ) -> dict:
        """
        Create complete 2FA setup response
        
        Args:
            secret: TOTP secret
            email: User email
            backup_codes: List of backup codes
            
        Returns:
            Dictionary with setup information
        """
        provisioning_uri = TOTPService.get_provisioning_uri(secret, email)
        qr_code = TOTPService.generate_qr_code(provisioning_uri)
        
        return {
            "secret": secret,
            "qr_code": qr_code,
            "provisioning_uri": provisioning_uri,
            "backup_codes": backup_codes,
            "instructions": [
                "1. Scan the QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)",
                "2. Enter the 6-digit code from your app to confirm setup",
                "3. Save your backup codes in a secure location",
                "4. Use backup codes if you lose access to your authenticator app"
            ]
        }


class BackupCodeManager:
    """Manage backup codes for 2FA"""
    
    @staticmethod
    def hash_code(code: str) -> str:
        """
        Hash a backup code for storage
        
        Args:
            code: Backup code
            
        Returns:
            Hashed code
        """
        import hashlib
        return hashlib.sha256(code.strip().upper().encode()).hexdigest()
    
    @staticmethod
    def verify_code(stored_hash: str, provided_code: str) -> bool:
        """
        Verify backup code against hash
        
        Args:
            stored_hash: Hash from database
            provided_code: Code from user
            
        Returns:
            True if code is valid, False otherwise
        """
        return stored_hash == BackupCodeManager.hash_code(provided_code)


# Singleton instance
_totp_service = None


def get_totp_service() -> TOTPService:
    """Get or create TOTP service instance"""
    global _totp_service
    if _totp_service is None:
        _totp_service = TOTPService()
    return _totp_service