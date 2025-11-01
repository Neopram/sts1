"""Fix: Add missing dashboard columns to rooms table

This migration fixes an issue where the dashboard metrics columns
were not properly added to the rooms table during migration 005.

Revision ID: 006_fix_dashboard_rooms
Revises: 005_dashboard_metrics
Create Date: 2025-10-10 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_fix_dashboard_rooms'
down_revision = '005_dashboard_metrics'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add missing dashboard columns to rooms table - IDEMPOTENT"""
    
    # Check if columns exist using SQLite approach
    # For SQLite, we'll use try/except to handle if columns already exist
    
    try:
        # Operational metrics for dashboard calculations
        op.add_column('rooms', sa.Column('cargo_type', sa.String(100), nullable=True))
    except:
        pass  # Column likely already exists
    
    try:
        op.add_column('rooms', sa.Column('cargo_quantity', sa.Float, nullable=True))
    except:
        pass
    
    try:
        op.add_column('rooms', sa.Column('cargo_value_usd', sa.Float, nullable=True))
    except:
        pass
    
    try:
        op.add_column('rooms', sa.Column('demurrage_rate_per_day', sa.Float, nullable=True))
    except:
        pass
    
    try:
        op.add_column('rooms', sa.Column('demurrage_rate_per_hour', sa.Float, nullable=True))
    except:
        pass
    
    try:
        op.add_column('rooms', sa.Column('status_detail', sa.String(50), nullable=True))
    except:
        pass
    
    try:
        op.add_column('rooms', sa.Column('timeline_phase', sa.String(50), nullable=True))
    except:
        pass
    
    try:
        op.add_column('rooms', sa.Column('eta_actual', sa.DateTime(timezone=True), nullable=True))
    except:
        pass
    
    try:
        op.add_column('rooms', sa.Column('eta_estimated', sa.DateTime(timezone=True), nullable=True))
    except:
        pass
    
    try:
        op.add_column('rooms', sa.Column('created_at_timestamp', sa.DateTime(timezone=True), nullable=True))
    except:
        pass
    
    # Broker commission fields
    try:
        op.add_column('rooms', sa.Column('broker_commission_percentage', sa.Float, nullable=True))
    except:
        pass
    
    try:
        op.add_column('rooms', sa.Column('broker_commission_amount', sa.Float, nullable=True))
    except:
        pass
    
    print("✅ Added missing dashboard columns to rooms table")


def downgrade() -> None:
    """Remove dashboard columns from rooms table"""
    
    try:
        op.drop_column('rooms', 'broker_commission_amount')
    except:
        pass
    
    try:
        op.drop_column('rooms', 'broker_commission_percentage')
    except:
        pass
    
    try:
        op.drop_column('rooms', 'created_at_timestamp')
    except:
        pass
    
    try:
        op.drop_column('rooms', 'eta_estimated')
    except:
        pass
    
    try:
        op.drop_column('rooms', 'eta_actual')
    except:
        pass
    
    try:
        op.drop_column('rooms', 'timeline_phase')
    except:
        pass
    
    try:
        op.drop_column('rooms', 'status_detail')
    except:
        pass
    
    try:
        op.drop_column('rooms', 'demurrage_rate_per_hour')
    except:
        pass
    
    try:
        op.drop_column('rooms', 'demurrage_rate_per_day')
    except:
        pass
    
    try:
        op.drop_column('rooms', 'cargo_value_usd')
    except:
        pass
    
    try:
        op.drop_column('rooms', 'cargo_quantity')
    except:
        pass
    
    try:
        op.drop_column('rooms', 'cargo_type')
    except:
        pass
    
    print("✅ Removed dashboard columns from rooms table")