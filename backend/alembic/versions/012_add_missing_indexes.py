"""Add missing performance indexes

This migration adds missing indexes according to the plan:
- idx_rooms_timeline_phase
- idx_rooms_status_detail
- idx_rooms_created_by_status
- idx_documents_critical_path
- idx_documents_expires_on
- idx_documents_priority

Revision ID: 012_add_missing_indexes
Revises: 011_enhance_notifications
Create Date: 2025-01-20 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '012_add_missing_indexes'
down_revision = '011_enhance_notifications'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add missing indexes - IDEMPOTENT"""
    
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Get existing indexes
    def get_indexes(table_name):
        try:
            return [idx['name'] for idx in inspector.get_indexes(table_name)]
        except Exception:
            return []
    
    # Add indexes for rooms table
    if 'rooms' in inspector.get_table_names():
        indexes = get_indexes('rooms')
        
        if 'idx_rooms_timeline_phase' not in indexes:
            try:
                op.create_index('idx_rooms_timeline_phase', 'rooms', ['timeline_phase'])
                print("✅ Created idx_rooms_timeline_phase")
            except Exception as e:
                print(f"⚠️  Error creating idx_rooms_timeline_phase: {e}")
        
        if 'idx_rooms_status_detail' not in indexes:
            try:
                op.create_index('idx_rooms_status_detail', 'rooms', ['status_detail'])
                print("✅ Created idx_rooms_status_detail")
            except Exception as e:
                print(f"⚠️  Error creating idx_rooms_status_detail: {e}")
        
        if 'idx_rooms_created_by_status' not in indexes:
            try:
                op.create_index('idx_rooms_created_by_status', 'rooms', ['created_by', 'status'])
                print("✅ Created idx_rooms_created_by_status")
            except Exception as e:
                print(f"⚠️  Error creating idx_rooms_created_by_status: {e}")
    
    # Add indexes for documents table
    if 'documents' in inspector.get_table_names():
        indexes = get_indexes('documents')
        
        if 'idx_documents_critical_path' not in indexes:
            try:
                op.create_index('idx_documents_critical_path', 'documents', ['critical_path'])
                print("✅ Created idx_documents_critical_path")
            except Exception as e:
                print(f"⚠️  Error creating idx_documents_critical_path: {e}")
        
        if 'idx_documents_expires_on' not in indexes:
            try:
                op.create_index('idx_documents_expires_on', 'documents', ['expires_at'])
                print("✅ Created idx_documents_expires_on")
            except Exception as e:
                print(f"⚠️  Error creating idx_documents_expires_on: {e}")
        
        if 'idx_documents_priority' not in indexes:
            try:
                op.create_index('idx_documents_priority', 'documents', ['priority'])
                print("✅ Created idx_documents_priority")
            except Exception as e:
                print(f"⚠️  Error creating idx_documents_priority: {e}")


def downgrade() -> None:
    """Remove added indexes"""
    
    try:
        op.drop_index('idx_documents_priority', table_name='documents')
        print("✅ Removed idx_documents_priority")
    except Exception:
        pass
    
    try:
        op.drop_index('idx_documents_expires_on', table_name='documents')
        print("✅ Removed idx_documents_expires_on")
    except Exception:
        pass
    
    try:
        op.drop_index('idx_documents_critical_path', table_name='documents')
        print("✅ Removed idx_documents_critical_path")
    except Exception:
        pass
    
    try:
        op.drop_index('idx_rooms_created_by_status', table_name='rooms')
        print("✅ Removed idx_rooms_created_by_status")
    except Exception:
        pass
    
    try:
        op.drop_index('idx_rooms_status_detail', table_name='rooms')
        print("✅ Removed idx_rooms_status_detail")
    except Exception:
        pass
    
    try:
        op.drop_index('idx_rooms_timeline_phase', table_name='rooms')
        print("✅ Removed idx_rooms_timeline_phase")
    except Exception:
        pass

