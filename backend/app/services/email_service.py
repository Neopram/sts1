"""
Email Service - Phase 2 Implementation
Handles SMTP configuration, email templates, and queue management
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
from typing import Optional, Dict, List
import logging
from jinja2 import Template

logger = logging.getLogger(__name__)


class EmailConfig:
    """SMTP Configuration"""
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SENDER_EMAIL = os.getenv("SENDER_EMAIL", "noreply@stsclearance.com")
    SENDER_NAME = os.getenv("SENDER_NAME", "STS Clearance Hub")
    
    # Rate limiting
    MAX_EMAILS_PER_HOUR = 100
    MAX_EMAILS_PER_DAY = 1000


class EmailTemplate:
    """Email templates for different scenarios"""
    
    WELCOME = """
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <h2>Welcome to STS Clearance Hub, {{name}}!</h2>
            <p>Your account has been created successfully.</p>
            <p><strong>Username:</strong> {{email}}</p>
            <p><strong>Company:</strong> {{company}}</p>
            <p>You can now log in and start managing your STS clearances.</p>
            <a href="{{login_url}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Log In</a>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
                If you didn't create this account, please contact our support team.
            </p>
        </body>
    </html>
    """
    
    PASSWORD_RESET = """
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <h2>Password Reset Request</h2>
            <p>Hi {{name}},</p>
            <p>We received a password reset request for your account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="{{reset_url}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
                This link expires in 1 hour. If you didn't request this, please ignore this email.
            </p>
        </body>
    </html>
    """
    
    DOCUMENT_APPROVAL = """
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <h2>Document Approval Request</h2>
            <p>Hi {{name}},</p>
            <p>A new document requires your approval:</p>
            <p><strong>Document:</strong> {{document_name}}</p>
            <p><strong>From:</strong> {{from_user}}</p>
            <p><strong>Date:</strong> {{date}}</p>
            <a href="{{document_url}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Document</a>
        </body>
    </html>
    """
    
    SECURITY_ALERT = """
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <h2>Security Alert</h2>
            <p>Hi {{name}},</p>
            <p><strong>Alert:</strong> {{alert_message}}</p>
            <p><strong>Time:</strong> {{timestamp}}</p>
            <p><strong>Location:</strong> {{location}}</p>
            <p>If this wasn't you, please secure your account immediately.</p>
            <a href="{{security_url}}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Secure Account</a>
        </body>
    </html>
    """
    
    TOTP_CODE = """
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <h2>Two-Factor Authentication</h2>
            <p>Hi {{name}},</p>
            <p>Your verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; color: #007bff;">{{code}}</h1>
            <p>This code expires in 10 minutes.</p>
            <p style="font-size: 12px; color: #666;">
                If you didn't request this, please ignore this email.
            </p>
        </body>
    </html>
    """
    
    WEEKLY_DIGEST = """
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <h2>Weekly Digest</h2>
            <p>Hi {{name}},</p>
            <p>Here's your weekly summary:</p>
            <ul>
                <li><strong>New Documents:</strong> {{new_documents}}</li>
                <li><strong>Pending Approvals:</strong> {{pending_approvals}}</li>
                <li><strong>Completed Tasks:</strong> {{completed_tasks}}</li>
                <li><strong>Messages:</strong> {{unread_messages}}</li>
            </ul>
            <a href="{{dashboard_url}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
        </body>
    </html>
    """


class EmailService:
    """Main email service class"""
    
    def __init__(self, config: EmailConfig = None):
        self.config = config or EmailConfig()
        self.email_queue: List[Dict] = []
        
    def send_email(
        self,
        to_email: str,
        subject: str,
        template_name: str,
        context: Dict,
        to_name: Optional[str] = None,
        is_html: bool = True,
        priority: str = "normal"
    ) -> Dict:
        """
        Send email using template
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            template_name: Template name (e.g., 'WELCOME', 'PASSWORD_RESET')
            context: Template variables
            to_name: Recipient name
            is_html: Whether email is HTML
            priority: 'high', 'normal', or 'low'
            
        Returns:
            Dict with status and message
        """
        try:
            # Get template
            template = self._get_template(template_name)
            if not template:
                return {"success": False, "error": f"Template {template_name} not found"}
            
            # Render template
            body = self._render_template(template, context)
            
            # Add to queue
            self.email_queue.append({
                "to_email": to_email,
                "to_name": to_name or to_email,
                "subject": subject,
                "body": body,
                "is_html": is_html,
                "priority": priority,
                "timestamp": datetime.utcnow(),
                "retries": 0,
                "max_retries": 3
            })
            
            logger.info(f"Email queued for {to_email}: {subject}")
            return {"success": True, "message": "Email queued successfully"}
            
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def send_welcome_email(self, user_email: str, user_name: str, company: str) -> Dict:
        """Send welcome email"""
        return self.send_email(
            to_email=user_email,
            subject="Welcome to STS Clearance Hub",
            template_name="WELCOME",
            context={
                "name": user_name,
                "email": user_email,
                "company": company,
                "login_url": "https://stsclearance.com/login"
            },
            to_name=user_name
        )
    
    def send_password_reset_email(self, user_email: str, user_name: str, reset_token: str) -> Dict:
        """Send password reset email"""
        return self.send_email(
            to_email=user_email,
            subject="Password Reset Request",
            template_name="PASSWORD_RESET",
            context={
                "name": user_name,
                "reset_url": f"https://stsclearance.com/reset-password?token={reset_token}"
            },
            to_name=user_name
        )
    
    def send_approval_request_email(
        self,
        user_email: str,
        user_name: str,
        document_name: str,
        from_user: str,
        document_id: str
    ) -> Dict:
        """Send document approval request email"""
        return self.send_email(
            to_email=user_email,
            subject=f"Approval Request: {document_name}",
            template_name="DOCUMENT_APPROVAL",
            context={
                "name": user_name,
                "document_name": document_name,
                "from_user": from_user,
                "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "document_url": f"https://stsclearance.com/documents/{document_id}"
            },
            to_name=user_name
        )
    
    def send_security_alert(
        self,
        user_email: str,
        user_name: str,
        alert_message: str,
        location: str = "Unknown"
    ) -> Dict:
        """Send security alert email"""
        return self.send_email(
            to_email=user_email,
            subject="Security Alert - Action Required",
            template_name="SECURITY_ALERT",
            context={
                "name": user_name,
                "alert_message": alert_message,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "location": location,
                "security_url": "https://stsclearance.com/settings/security"
            },
            to_name=user_name,
            priority="high"
        )
    
    def send_2fa_code(self, user_email: str, user_name: str, code: str) -> Dict:
        """Send 2FA verification code"""
        return self.send_email(
            to_email=user_email,
            subject="Your 2FA Verification Code",
            template_name="TOTP_CODE",
            context={
                "name": user_name,
                "code": code
            },
            to_name=user_name,
            priority="high"
        )
    
    def send_weekly_digest(
        self,
        user_email: str,
        user_name: str,
        stats: Dict
    ) -> Dict:
        """Send weekly digest email"""
        return self.send_email(
            to_email=user_email,
            subject="Your Weekly Digest",
            template_name="WEEKLY_DIGEST",
            context={
                "name": user_name,
                "new_documents": stats.get("new_documents", 0),
                "pending_approvals": stats.get("pending_approvals", 0),
                "completed_tasks": stats.get("completed_tasks", 0),
                "unread_messages": stats.get("unread_messages", 0),
                "dashboard_url": "https://stsclearance.com/dashboard"
            },
            to_name=user_name
        )
    
    def process_queue(self) -> Dict:
        """Process email queue and send all pending emails"""
        sent = 0
        failed = 0
        
        for email in self.email_queue[:]:  # Iterate over copy
            try:
                if self._send_smtp(email):
                    sent += 1
                    self.email_queue.remove(email)
                else:
                    email["retries"] += 1
                    if email["retries"] >= email["max_retries"]:
                        failed += 1
                        self.email_queue.remove(email)
            except Exception as e:
                logger.error(f"Error processing email queue: {str(e)}")
                email["retries"] += 1
                if email["retries"] >= email["max_retries"]:
                    failed += 1
                    self.email_queue.remove(email)
        
        return {
            "sent": sent,
            "failed": failed,
            "pending": len(self.email_queue)
        }
    
    def _send_smtp(self, email_data: Dict) -> bool:
        """Send email via SMTP"""
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = email_data["subject"]
            message["From"] = f"{self.config.SENDER_NAME} <{self.config.SENDER_EMAIL}>"
            message["To"] = f"{email_data['to_name']} <{email_data['to_email']}>"
            
            # Add body
            if email_data["is_html"]:
                message.attach(MIMEText(email_data["body"], "html"))
            else:
                message.attach(MIMEText(email_data["body"], "plain"))
            
            # Connect to SMTP server
            with smtplib.SMTP(self.config.SMTP_SERVER, self.config.SMTP_PORT) as server:
                server.starttls()
                server.login(self.config.SMTP_USER, self.config.SMTP_PASSWORD)
                server.send_message(message)
            
            logger.info(f"Email sent to {email_data['to_email']}")
            return True
            
        except Exception as e:
            logger.error(f"SMTP error: {str(e)}")
            return False
    
    def _get_template(self, template_name: str) -> Optional[str]:
        """Get email template by name"""
        templates = {
            "WELCOME": EmailTemplate.WELCOME,
            "PASSWORD_RESET": EmailTemplate.PASSWORD_RESET,
            "DOCUMENT_APPROVAL": EmailTemplate.DOCUMENT_APPROVAL,
            "SECURITY_ALERT": EmailTemplate.SECURITY_ALERT,
            "TOTP_CODE": EmailTemplate.TOTP_CODE,
            "WEEKLY_DIGEST": EmailTemplate.WEEKLY_DIGEST,
        }
        return templates.get(template_name)
    
    def _render_template(self, template: str, context: Dict) -> str:
        """Render Jinja2 template"""
        try:
            tmpl = Template(template)
            return tmpl.render(**context)
        except Exception as e:
            logger.error(f"Template rendering error: {str(e)}")
            return template


# Singleton instance
_email_service = None


def get_email_service() -> EmailService:
    """Get or create email service instance"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service