"""
Input validation framework for settings and user data
Pydantic validators for all settings input
"""

import re
from typing import Optional
from datetime import datetime
import pytz
from pydantic import BaseModel, field_validator, ValidationError


class SettingsValidator(BaseModel):
    """Main validator for user settings"""
    
    display_name: Optional[str] = None
    email: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    session_timeout: Optional[int] = None
    old_password: Optional[str] = None
    new_password: Optional[str] = None
    confirm_password: Optional[str] = None
    
    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v):
        """
        Validate display name:
        - 1-100 characters
        - No leading/trailing whitespace
        - Alphanumeric and basic punctuation only
        """
        if v is None:
            return v
            
        v = v.strip()
        if not v:
            raise ValueError('Display name cannot be empty')
        if len(v) > 100:
            raise ValueError('Display name must be 100 characters or less')
        
        # Allow letters, numbers, spaces, hyphens, apostrophes, periods
        if not re.match(r"^[a-zA-Z0-9\s\-'.]+$", v):
            raise ValueError('Display name contains invalid characters')
        
        return v
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """
        Validate email format
        """
        if v is None:
            return v
            
        v = v.strip().lower()
        # Simple email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Invalid email format')
        
        if len(v) > 255:
            raise ValueError('Email must be 255 characters or less')
        
        return v
    
    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v):
        """
        Validate timezone against IANA timezone database
        """
        if v is None:
            return v
        
        v = v.strip()
        try:
            pytz.timezone(v)
        except pytz.exceptions.UnknownTimeZoneError:
            # Provide list of common timezones
            common_zones = [
                'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
                'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Amsterdam',
                'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Australia/Sydney',
                'Pacific/Auckland'
            ]
            raise ValueError(f'Invalid timezone. Try one of: {", ".join(common_zones[:5])}...')
        
        return v
    
    @field_validator('language')
    @classmethod
    def validate_language(cls, v):
        """
        Validate language code against supported languages
        """
        if v is None:
            return v
        
        supported_languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']
        v = v.lower().strip()
        
        if v not in supported_languages:
            raise ValueError(f'Unsupported language. Supported: {", ".join(supported_languages)}')
        
        return v
    
    @field_validator('session_timeout')
    @classmethod
    def validate_session_timeout(cls, v):
        """
        Validate session timeout:
        - Integer between 5 and 480 minutes
        - Defaults to 30 if not provided
        """
        if v is None:
            return 30
        
        if not isinstance(v, int):
            raise ValueError('Session timeout must be a number')
        if v < 5:
            raise ValueError('Session timeout must be at least 5 minutes')
        if v > 480:
            raise ValueError('Session timeout must be at most 480 minutes (8 hours)')
        
        return v
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        """
        Validate password strength:
        - Minimum 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        - At least one special character
        """
        if v is None:
            return v
        
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v) > 128:
            raise ValueError('Password must be at most 128 characters long')
        
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*()_+=\[\]{};:\'",.<>?/\\|-]', v):
            raise ValueError('Password must contain at least one special character')
        
        return v


class ThemeSettingsValidator(BaseModel):
    """Validator for theme/appearance settings"""
    
    theme: Optional[str] = None
    primary_color: Optional[str] = None
    font_size: Optional[str] = None
    compact_mode: Optional[bool] = None
    show_animations: Optional[bool] = None
    
    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v):
        """Validate theme selection"""
        if v is None:
            return v
        
        valid_themes = ['light', 'dark', 'auto']
        v = v.lower().strip()
        
        if v not in valid_themes:
            raise ValueError(f'Invalid theme. Must be one of: {", ".join(valid_themes)}')
        
        return v
    
    @field_validator('primary_color')
    @classmethod
    def validate_primary_color(cls, v):
        """Validate color selection"""
        if v is None:
            return v
        
        valid_colors = ['blue', 'green', 'purple', 'red', 'orange']
        v = v.lower().strip()
        
        if v not in valid_colors:
            raise ValueError(f'Invalid color. Must be one of: {", ".join(valid_colors)}')
        
        return v
    
    @field_validator('font_size')
    @classmethod
    def validate_font_size(cls, v):
        """Validate font size"""
        if v is None:
            return v
        
        valid_sizes = ['small', 'medium', 'large']
        v = v.lower().strip()
        
        if v not in valid_sizes:
            raise ValueError(f'Invalid font size. Must be one of: {", ".join(valid_sizes)}')
        
        return v
    
    @field_validator('compact_mode', 'show_animations')
    @classmethod
    def validate_boolean(cls, v):
        """Validate boolean values"""
        if v is None:
            return v
        
        if not isinstance(v, bool):
            raise ValueError('Value must be true or false')
        
        return v


class NotificationSettingsValidator(BaseModel):
    """Validator for notification settings"""
    
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    document_updates: Optional[bool] = None
    approval_requests: Optional[bool] = None
    system_alerts: Optional[bool] = None
    weekly_digest: Optional[bool] = None
    
    @field_validator(
        'email_notifications',
        'push_notifications',
        'sms_notifications',
        'document_updates',
        'approval_requests',
        'system_alerts',
        'weekly_digest'
    )
    @classmethod
    def validate_boolean(cls, v):
        """Ensure notification settings are boolean"""
        if v is None:
            return v
        
        if not isinstance(v, bool):
            raise ValueError('Notification setting must be true or false')
        
        return v


def validate_settings_input(data: dict) -> tuple[bool, Optional[str]]:
    """
    Validate settings input
    Returns: (is_valid, error_message)
    """
    try:
        SettingsValidator(**data)
        return True, None
    except ValidationError as e:
        error_message = '; '.join([f"{err['loc'][0]}: {err['msg']}" for err in e.errors()])
        return False, error_message


def validate_theme_settings(data: dict) -> tuple[bool, Optional[str]]:
    """
    Validate theme settings
    Returns: (is_valid, error_message)
    """
    try:
        ThemeSettingsValidator(**data)
        return True, None
    except ValidationError as e:
        error_message = '; '.join([f"{err['loc'][0]}: {err['msg']}" for err in e.errors()])
        return False, error_message


def validate_notifications(data: dict) -> tuple[bool, Optional[str]]:
    """
    Validate notification settings
    Returns: (is_valid, error_message)
    """
    try:
        NotificationSettingsValidator(**data)
        return True, None
    except ValidationError as e:
        error_message = '; '.join([f"{err['loc'][0]}: {err['msg']}" for err in e.errors()])
        return False, error_message