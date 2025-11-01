"""
Email Service - Production Ready
Handles all email notifications for STS operations and system events
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class EmailTemplates:
    """Email template factory"""

    @staticmethod
    def operation_created(operation_title: str, operation_code: str, recipient_name: str) -> tuple:
        """
        Email template for operation creation
        Returns: (subject, html_body)
        """
        subject = f"🚢 New STS Operation Created: {operation_title}"
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
                    <h2 style="color: #0066cc;">✅ Operation Successfully Created</h2>
                    
                    <p>Hi {recipient_name},</p>
                    
                    <p>A new Ship-to-Ship (STS) operation has been created and is ready for setup.</p>
                    
                    <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0066cc;">
                        <p><strong>Operation Details:</strong></p>
                        <ul style="margin: 10px 0;">
                            <li><strong>Title:</strong> {operation_title}</li>
                            <li><strong>Operation Code:</strong> <code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px;">{operation_code}</code></li>
                            <li><strong>Status:</strong> <span style="background-color: #fff3cd; padding: 2px 6px; border-radius: 3px; font-weight: bold;">DRAFT</span></li>
                            <li><strong>Created:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
                        </ul>
                    </div>
                    
                    <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Next Steps:</strong></p>
                        <ol>
                            <li>Add Trading Company participants</li>
                            <li>Add Broker participants</li>
                            <li>Add Shipowner participants</li>
                            <li>Assign vessels to the operation</li>
                            <li>Finalize and activate the operation</li>
                        </ol>
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """
        return subject, html_body

    @staticmethod
    def participant_invited(
        operation_title: str,
        operation_code: str,
        recipient_name: str,
        participant_type: str,
        role: str,
        invitation_token: str = ""
    ) -> tuple:
        """
        Email template for participant invitation
        Returns: (subject, html_body)
        """
        subject = f"📋 Invitation: {participant_type} Participant Needed for {operation_title}"
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
                    <h2 style="color: #0066cc;">📧 You're Invited to Participate</h2>
                    
                    <p>Hi {recipient_name},</p>
                    
                    <p>You have been invited to participate in a Ship-to-Ship (STS) operation as a <strong>{participant_type}</strong>.</p>
                    
                    <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0066cc;">
                        <p><strong>Operation Details:</strong></p>
                        <ul style="margin: 10px 0;">
                            <li><strong>Operation:</strong> {operation_title}</li>
                            <li><strong>Code:</strong> <code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px;">{operation_code}</code></li>
                            <li><strong>Your Role:</strong> {role}</li>
                            <li><strong>Party Type:</strong> {participant_type}</li>
                            <li><strong>Invited:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
                        </ul>
                    </div>
                    
                    <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <p><strong>What You Need To Do:</strong></p>
                        <ol>
                            <li>Log in to the STS Clearance Hub</li>
                            <li>Review the operation details</li>
                            <li>Submit required documents</li>
                            <li>Accept or decline the invitation</li>
                        </ol>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invitation_token if invitation_token else '#'}" 
                           style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                            View Operation Details
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """
        return subject, html_body

    @staticmethod
    def vessel_assigned(
        operation_title: str,
        vessel_name: str,
        vessel_imo: str,
        recipient_name: str
    ) -> tuple:
        """
        Email template for vessel assignment
        Returns: (subject, html_body)
        """
        subject = f"🚢 Vessel Assigned: {vessel_name} to {operation_title}"
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
                    <h2 style="color: #0066cc;">✅ Vessel Successfully Assigned</h2>
                    
                    <p>Hi {recipient_name},</p>
                    
                    <p>A vessel has been assigned to the operation.</p>
                    
                    <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0066cc;">
                        <p><strong>Vessel Details:</strong></p>
                        <ul style="margin: 10px 0;">
                            <li><strong>Vessel Name:</strong> {vessel_name}</li>
                            <li><strong>IMO:</strong> <code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px;">{vessel_imo}</code></li>
                            <li><strong>Operation:</strong> {operation_title}</li>
                            <li><strong>Assigned:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
                        </ul>
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """
        return subject, html_body

    @staticmethod
    def operation_started(
        operation_title: str,
        operation_code: str,
        recipient_name: str,
        start_time: str = ""
    ) -> tuple:
        """
        Email template for operation start
        Returns: (subject, html_body)
        """
        subject = f"🟢 Operation Started: {operation_title}"
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
                    <h2 style="color: #28a745;">🟢 Operation Started</h2>
                    
                    <p>Hi {recipient_name},</p>
                    
                    <p>The STS operation has started and is now active.</p>
                    
                    <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <p><strong>Operation Details:</strong></p>
                        <ul style="margin: 10px 0;">
                            <li><strong>Operation:</strong> {operation_title}</li>
                            <li><strong>Code:</strong> <code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px;">{operation_code}</code></li>
                            <li><strong>Status:</strong> <span style="background-color: #d4edda; padding: 2px 6px; border-radius: 3px; font-weight: bold;">ACTIVE</span></li>
                            <li><strong>Started:</strong> {start_time or datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
                        </ul>
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """
        return subject, html_body


class EmailService:
    """Main email service for sending notifications"""

    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.sender_email = os.getenv('SENDER_EMAIL', 'noreply@stsclearancehub.com')
        self.sender_password = os.getenv('SENDER_PASSWORD', '')
        self.sender_name = os.getenv('SENDER_NAME', 'STS Clearance Hub')
        self.enabled = os.getenv('EMAIL_ENABLED', 'false').lower() == 'true'

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> bool:
        """
        Send an email
        
        Args:
            to_email: Recipient email
            subject: Email subject
            html_body: Email body (HTML)
            cc: Carbon copy recipients
            bcc: Blind carbon copy recipients
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.enabled:
            logger.info(f"Email service disabled. Would send to {to_email}: {subject}")
            return True

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.sender_name} <{self.sender_email}>"
            msg['To'] = to_email

            if cc:
                msg['Cc'] = ', '.join(cc)

            # Attach HTML content
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)

                recipients = [to_email]
                if cc:
                    recipients.extend(cc)
                if bcc:
                    recipients.extend(bcc)

                server.sendmail(self.sender_email, recipients, msg.as_string())

            logger.info(f"✅ Email sent to {to_email}: {subject}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {str(e)}")
            return False

    def send_operation_created(
        self,
        to_email: str,
        operation_title: str,
        operation_code: str,
        recipient_name: str = "User"
    ) -> bool:
        """Send operation creation email"""
        subject, html_body = EmailTemplates.operation_created(
            operation_title, operation_code, recipient_name
        )
        return self.send_email(to_email, subject, html_body)

    def send_participant_invited(
        self,
        to_email: str,
        operation_title: str,
        operation_code: str,
        recipient_name: str,
        participant_type: str,
        role: str,
        invitation_token: str = ""
    ) -> bool:
        """Send participant invitation email"""
        subject, html_body = EmailTemplates.participant_invited(
            operation_title,
            operation_code,
            recipient_name,
            participant_type,
            role,
            invitation_token
        )
        return self.send_email(to_email, subject, html_body)

    def send_vessel_assigned(
        self,
        to_email: str,
        operation_title: str,
        vessel_name: str,
        vessel_imo: str,
        recipient_name: str = "User"
    ) -> bool:
        """Send vessel assignment email"""
        subject, html_body = EmailTemplates.vessel_assigned(
            operation_title, vessel_name, vessel_imo, recipient_name
        )
        return self.send_email(to_email, subject, html_body)

    def send_operation_started(
        self,
        to_email: str,
        operation_title: str,
        operation_code: str,
        recipient_name: str = "User",
        start_time: str = ""
    ) -> bool:
        """Send operation start email"""
        subject, html_body = EmailTemplates.operation_started(
            operation_title, operation_code, recipient_name, start_time
        )
        return self.send_email(to_email, subject, html_body)

    def send_bulk_emails(
        self,
        recipients: List[Dict[str, str]],
        email_type: str,
        **kwargs
    ) -> Dict[str, bool]:
        """
        Send emails to multiple recipients
        
        Args:
            recipients: List of dicts with 'email' and 'name' keys
            email_type: Type of email ('operation_created', 'participant_invited', etc.)
            **kwargs: Additional parameters for the email template
            
        Returns:
            Dict mapping email addresses to send success
        """
        results = {}

        for recipient in recipients:
            email = recipient.get('email')
            name = recipient.get('name', 'User')

            if email_type == 'operation_created':
                results[email] = self.send_operation_created(
                    email, name=name, **kwargs
                )
            elif email_type == 'participant_invited':
                results[email] = self.send_participant_invited(
                    email, recipient_name=name, **kwargs
                )
            elif email_type == 'vessel_assigned':
                results[email] = self.send_vessel_assigned(
                    email, recipient_name=name, **kwargs
                )
            elif email_type == 'operation_started':
                results[email] = self.send_operation_started(
                    email, recipient_name=name, **kwargs
                )

        return results


# Global instance
email_service = EmailService()