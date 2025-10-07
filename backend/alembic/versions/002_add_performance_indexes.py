"""Add performance indexes for production

Revision ID: 002
Revises: 001
Create Date: 2024-09-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade():
    """Add performance indexes"""
    
    # Activity logs indexes for timeline and summary queries
    op.create_index('idx_activity_log_room_id', 'activity_log', ['room_id'])
    op.create_index('idx_activity_log_ts', 'activity_log', ['ts'])
    op.create_index('idx_activity_log_room_ts', 'activity_log', ['room_id', 'ts'])
    op.create_index('idx_activity_log_actor', 'activity_log', ['actor'])
    op.create_index('idx_activity_log_action', 'activity_log', ['action'])
    
    # Documents indexes for faster lookups
    op.create_index('idx_documents_room_id', 'documents', ['room_id'])
    op.create_index('idx_documents_type_id', 'documents', ['type_id'])
    op.create_index('idx_documents_status', 'documents', ['status'])
    op.create_index('idx_documents_expires_on', 'documents', ['expires_on'])
    op.create_index('idx_documents_room_status', 'documents', ['room_id', 'status'])
    
    # Document versions indexes
    op.create_index('idx_document_versions_document_id', 'document_versions', ['document_id'])
    op.create_index('idx_document_versions_created_at', 'document_versions', ['created_at'])
    
    # Parties indexes for access control
    op.create_index('idx_parties_room_id', 'parties', ['room_id'])
    op.create_index('idx_parties_email', 'parties', ['email'])
    op.create_index('idx_parties_role', 'parties', ['role'])
    op.create_index('idx_parties_room_email', 'parties', ['room_id', 'email'])
    
    # Rooms indexes
    op.create_index('idx_rooms_created_by', 'rooms', ['created_by'])
    op.create_index('idx_rooms_sts_eta', 'rooms', ['sts_eta'])
    op.create_index('idx_rooms_created_at', 'rooms', ['created_at'])
    
    # Messages indexes
    op.create_index('idx_messages_room_id', 'messages', ['room_id'])
    op.create_index('idx_messages_created_at', 'messages', ['created_at'])
    op.create_index('idx_messages_sender_email', 'messages', ['sender_email'])
    
    # Notifications indexes
    op.create_index('idx_notifications_user_email', 'notifications', ['user_email'])
    op.create_index('idx_notifications_room_id', 'notifications', ['room_id'])
    op.create_index('idx_notifications_read', 'notifications', ['read'])
    op.create_index('idx_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('idx_notifications_user_read', 'notifications', ['user_email', 'read'])
    
    # Approvals indexes
    op.create_index('idx_approvals_room_id', 'approvals', ['room_id'])
    op.create_index('idx_approvals_party_id', 'approvals', ['party_id'])
    op.create_index('idx_approvals_status', 'approvals', ['status'])
    
    # Vessels indexes
    op.create_index('idx_vessels_room_id', 'vessels', ['room_id'])
    op.create_index('idx_vessels_imo', 'vessels', ['imo'])
    op.create_index('idx_vessels_flag', 'vessels', ['flag'])
    
    # Users indexes
    op.create_index('idx_users_email', 'users', ['email'], unique=True)
    op.create_index('idx_users_role', 'users', ['role'])

def downgrade():
    """Remove performance indexes"""
    
    # Drop all indexes in reverse order
    op.drop_index('idx_users_role')
    op.drop_index('idx_users_email')
    
    op.drop_index('idx_vessels_flag')
    op.drop_index('idx_vessels_imo')
    op.drop_index('idx_vessels_room_id')
    
    op.drop_index('idx_approvals_status')
    op.drop_index('idx_approvals_party_id')
    op.drop_index('idx_approvals_room_id')
    
    op.drop_index('idx_notifications_user_read')
    op.drop_index('idx_notifications_created_at')
    op.drop_index('idx_notifications_read')
    op.drop_index('idx_notifications_room_id')
    op.drop_index('idx_notifications_user_email')
    
    op.drop_index('idx_messages_sender_email')
    op.drop_index('idx_messages_created_at')
    op.drop_index('idx_messages_room_id')
    
    op.drop_index('idx_rooms_created_at')
    op.drop_index('idx_rooms_sts_eta')
    op.drop_index('idx_rooms_created_by')
    
    op.drop_index('idx_parties_room_email')
    op.drop_index('idx_parties_role')
    op.drop_index('idx_parties_email')
    op.drop_index('idx_parties_room_id')
    
    op.drop_index('idx_document_versions_created_at')
    op.drop_index('idx_document_versions_document_id')
    
    op.drop_index('idx_documents_room_status')
    op.drop_index('idx_documents_expires_on')
    op.drop_index('idx_documents_status')
    op.drop_index('idx_documents_type_id')
    op.drop_index('idx_documents_room_id')
    
    op.drop_index('idx_activity_log_action')
    op.drop_index('idx_activity_log_actor')
    op.drop_index('idx_activity_log_room_ts')
    op.drop_index('idx_activity_log_ts')
    op.drop_index('idx_activity_log_room_id')
