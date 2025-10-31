"""Add dashboard metrics tables and columns for role-based data projection

Revision ID: 005_dashboard_metrics
Revises: 004_security_profile
Create Date: 2025-10-09 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '005_dashboard_metrics'
down_revision = '004_security_profile'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade database schema for dashboard metrics"""
    
    # ============ EXTEND ROOMS TABLE ============
    # Add operational metrics columns
    op.add_column('rooms', sa.Column('cargo_type', sa.String(100), nullable=True))
    op.add_column('rooms', sa.Column('cargo_quantity', sa.Numeric(15, 2), nullable=True))
    op.add_column('rooms', sa.Column('cargo_value_usd', sa.Numeric(15, 2), nullable=True))
    op.add_column('rooms', sa.Column('demurrage_rate_per_day', sa.Numeric(15, 2), nullable=True))
    op.add_column('rooms', sa.Column('demurrage_rate_per_hour', sa.Numeric(15, 2), nullable=True))
    op.add_column('rooms', sa.Column('status_detail', sa.String(50), nullable=True))
    op.add_column('rooms', sa.Column('timeline_phase', sa.String(50), nullable=True))
    op.add_column('rooms', sa.Column('eta_actual', sa.DateTime(timezone=True), nullable=True))
    op.add_column('rooms', sa.Column('eta_estimated', sa.DateTime(timezone=True), nullable=True))
    op.add_column('rooms', sa.Column('created_at_timestamp', sa.DateTime(timezone=True), nullable=True))
    
    # Add broker commission fields
    op.add_column('rooms', sa.Column('broker_commission_percentage', sa.Numeric(5, 2), nullable=True))
    op.add_column('rooms', sa.Column('broker_commission_amount', sa.Numeric(15, 2), nullable=True))
    
    # ============ EXTEND DOCUMENTS TABLE ============
    op.add_column('documents', sa.Column('uploaded_by_user_id', sa.String(36), nullable=True))
    op.add_column('documents', sa.Column('critical_path', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('documents', sa.Column('estimated_days_to_expire', sa.Integer(), nullable=True))
    
    # Create foreign key for uploaded_by_user_id
    op.create_foreign_key(
        'fk_documents_user_uploaded_by',
        'documents',
        'users',
        ['uploaded_by_user_id'],
        ['id']
    )
    op.create_index('idx_documents_uploaded_by', 'documents', ['uploaded_by_user_id'])
    op.create_index('idx_documents_status', 'documents', ['status'])
    
    # ============ CREATE METRICS TABLE ============
    op.create_table(
        'metrics',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('room_id', sa.String(36), nullable=False),
        sa.Column('metric_type', sa.String(50), nullable=False),  # demurrage, commission, compliance, etc
        sa.Column('metric_date', sa.Date(), nullable=False),
        sa.Column('value', sa.Numeric(15, 2), nullable=False),
        sa.Column('computed_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.UniqueConstraint('room_id', 'metric_type', 'metric_date', name='uq_metrics_room_type_date')
    )
    op.create_index('idx_metrics_room_type', 'metrics', ['room_id', 'metric_type'])
    op.create_index('idx_metrics_date', 'metrics', ['metric_date'])
    
    # ============ CREATE PARTY_METRICS TABLE ============
    op.create_table(
        'party_metrics',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('party_id', sa.String(36), nullable=False),
        sa.Column('room_id', sa.String(36), nullable=False),
        sa.Column('response_time_hours', sa.Numeric(5, 2), nullable=True),
        sa.Column('quality_score', sa.Numeric(3, 1), nullable=True),  # 1-10
        sa.Column('reliability_index', sa.Numeric(3, 1), nullable=True),  # 1-10
        sa.Column('last_interaction', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['party_id'], ['parties.id'], ),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.UniqueConstraint('party_id', 'room_id', name='uq_party_metrics_party_room')
    )
    op.create_index('idx_party_metrics_party', 'party_metrics', ['party_id'])
    op.create_index('idx_party_metrics_room', 'party_metrics', ['room_id'])
    
    # ============ CREATE INDEXES FOR OPTIMIZATION ============
    
    # by_room optimization
    op.create_index('idx_rooms_created_by_status', 'rooms', ['created_by', 'status_detail'])
    op.create_index('idx_rooms_eta', 'rooms', ['sts_eta'])
    op.create_index('idx_parties_room_email', 'parties', ['room_id', 'email'])
    
    # Existing tables optimization (if not already present)
    try:
        op.create_index('idx_users_role_dept', 'users', ['role', 'department'])
    except:
        pass  # Index might already exist
    
    print("✅ Database schema upgraded for dashboard metrics")


def downgrade() -> None:
    """Downgrade database schema"""
    
    # Drop indexes
    op.drop_index('idx_users_role_dept', 'users')
    op.drop_index('idx_parties_room_email', 'parties')
    op.drop_index('idx_rooms_eta', 'rooms')
    op.drop_index('idx_rooms_created_by_status', 'rooms')
    op.drop_index('idx_party_metrics_room', 'party_metrics')
    op.drop_index('idx_party_metrics_party', 'party_metrics')
    op.drop_index('idx_metrics_date', 'metrics')
    op.drop_index('idx_metrics_room_type', 'metrics')
    op.drop_index('idx_documents_status', 'documents')
    op.drop_index('idx_documents_uploaded_by', 'documents')
    
    # Drop new tables
    op.drop_table('party_metrics')
    op.drop_table('metrics')
    
    # Drop foreign key and columns from documents
    op.drop_constraint('fk_documents_user_uploaded_by', 'documents', type_='foreignkey')
    op.drop_column('documents', 'estimated_days_to_expire')
    op.drop_column('documents', 'critical_path')
    op.drop_column('documents', 'uploaded_by_user_id')
    
    # Drop columns from rooms
    op.drop_column('rooms', 'broker_commission_amount')
    op.drop_column('rooms', 'broker_commission_percentage')
    op.drop_column('rooms', 'created_at_timestamp')
    op.drop_column('rooms', 'eta_estimated')
    op.drop_column('rooms', 'eta_actual')
    op.drop_column('rooms', 'timeline_phase')
    op.drop_column('rooms', 'status_detail')
    op.drop_column('rooms', 'demurrage_rate_per_hour')
    op.drop_column('rooms', 'demurrage_rate_per_day')
    op.drop_column('rooms', 'cargo_value_usd')
    op.drop_column('rooms', 'cargo_quantity')
    op.drop_column('rooms', 'cargo_type')
    
    print("✅ Database schema downgraded")