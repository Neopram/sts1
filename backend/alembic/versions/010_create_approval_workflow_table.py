"""Create approval_workflows table

This migration creates the approval_workflows table for managing
multi-step approval workflows for operations, documents, and mutual signoffs.

Revision ID: 010_approval_workflow
Revises: 007_merge_branches
Create Date: 2025-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '010_approval_workflow'
down_revision = '007_merge_branches'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create approval_workflows table - IDEMPOTENT"""
    
    # Check if table already exists
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    
    if 'approval_workflows' not in tables:
        # Create approval_workflows table
        op.create_table(
            'approval_workflows',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('room_id', sa.String(36), nullable=False),
            sa.Column('document_id', sa.String(36), nullable=True),
            sa.Column('workflow_type', sa.String(50), nullable=True),  # document/operation/mutual_signoff
            sa.Column('status', sa.String(50), nullable=False, server_default='pending'),  # pending/approved/rejected
            sa.Column('current_step', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('total_steps', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='SET NULL'),
        )
        
        # Create indexes
        op.create_index('idx_approval_workflow_room', 'approval_workflows', ['room_id'])
        op.create_index('idx_approval_workflow_status', 'approval_workflows', ['status'])
        op.create_index('idx_approval_workflow_type', 'approval_workflows', ['workflow_type'])
        
        print("✅ Created approval_workflows table")
    else:
        print("⚠️  approval_workflows table already exists, skipping")


def downgrade() -> None:
    """Remove approval_workflows table"""
    
    try:
        op.drop_index('idx_approval_workflow_type', table_name='approval_workflows')
        op.drop_index('idx_approval_workflow_status', table_name='approval_workflows')
        op.drop_index('idx_approval_workflow_room', table_name='approval_workflows')
        op.drop_table('approval_workflows')
        print("✅ Removed approval_workflows table")
    except Exception as e:
        print(f"⚠️  Error removing approval_workflows table: {e}")

