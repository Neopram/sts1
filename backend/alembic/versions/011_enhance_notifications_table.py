"""Enhance notifications table with missing fields

This migration adds missing fields to the notifications table:
- priority (VARCHAR(20))
- action_url (VARCHAR(500))
- expires_at (TIMESTAMP)
- read_at (TIMESTAMP)

Revision ID: 011_enhance_notifications
Revises: 010_approval_workflow
Create Date: 2025-01-20 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '011_enhance_notifications'
down_revision = '010_approval_workflow'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add missing fields to notifications table - IDEMPOTENT"""
    
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Check if notifications table exists
    if 'notifications' not in inspector.get_table_names():
        print("⚠️  notifications table does not exist, skipping")
        return
    
    columns = {col['name']: col for col in inspector.get_columns('notifications')}
    
    # Add priority field if it doesn't exist
    if 'priority' not in columns:
        try:
            op.add_column('notifications', sa.Column('priority', sa.String(20), nullable=True))
            print("✅ Added priority column to notifications table")
        except Exception as e:
            print(f"⚠️  Error adding priority column: {e}")
    
    # Add action_url field if it doesn't exist
    if 'action_url' not in columns:
        try:
            op.add_column('notifications', sa.Column('action_url', sa.String(500), nullable=True))
            print("✅ Added action_url column to notifications table")
        except Exception as e:
            print(f"⚠️  Error adding action_url column: {e}")
    
    # Add expires_at field if it doesn't exist
    if 'expires_at' not in columns:
        try:
            op.add_column('notifications', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
            print("✅ Added expires_at column to notifications table")
        except Exception as e:
            print(f"⚠️  Error adding expires_at column: {e}")
    
    # Add read_at field if it doesn't exist
    if 'read_at' not in columns:
        try:
            op.add_column('notifications', sa.Column('read_at', sa.DateTime(timezone=True), nullable=True))
            print("✅ Added read_at column to notifications table")
        except Exception as e:
            print(f"⚠️  Error adding read_at column: {e}")


def downgrade() -> None:
    """Remove added fields from notifications table"""
    
    try:
        op.drop_column('notifications', 'read_at')
        print("✅ Removed read_at column from notifications table")
    except Exception:
        pass
    
    try:
        op.drop_column('notifications', 'expires_at')
        print("✅ Removed expires_at column from notifications table")
    except Exception:
        pass
    
    try:
        op.drop_column('notifications', 'action_url')
        print("✅ Removed action_url column from notifications table")
    except Exception:
        pass
    
    try:
        op.drop_column('notifications', 'priority')
        print("✅ Removed priority column from notifications table")
    except Exception:
        pass

