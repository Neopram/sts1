"""Add snapshots table for persistent snapshot storage

Revision ID: 003
Revises: 002
Create Date: 2025-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade():
    """Add snapshots table"""
    
    # Create snapshots table
    op.create_table(
        'snapshots',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('room_id', sa.String(36), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('created_by', sa.String(255), nullable=False),
        sa.Column('status', sa.String(50), default='generating', nullable=False),
        sa.Column('file_url', sa.String(500), nullable=True),
        sa.Column('file_size', sa.Integer(), default=0),
        sa.Column('snapshot_type', sa.String(50), default='pdf', nullable=False),
        sa.Column('data', sa.Text(), nullable=True),  # JSON data with generation options
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for snapshots
    op.create_index('idx_snapshots_room_id', 'snapshots', ['room_id'])
    op.create_index('idx_snapshots_created_by', 'snapshots', ['created_by'])
    op.create_index('idx_snapshots_status', 'snapshots', ['status'])
    op.create_index('idx_snapshots_room_created', 'snapshots', ['room_id', 'created_at'])


def downgrade():
    """Remove snapshots table"""
    
    op.drop_index('idx_snapshots_room_created')
    op.drop_index('idx_snapshots_status')
    op.drop_index('idx_snapshots_created_by')
    op.drop_index('idx_snapshots_room_id')
    
    op.drop_table('snapshots')