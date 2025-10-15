"""Add vessel-specific relationships for multi-vessel architecture

Revision ID: 5740eda1b01c
Revises: f7cea8b91888
Create Date: 2025-10-15 13:25:15.491541

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5740eda1b01c'
down_revision = 'f7cea8b91888'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add vessel_id columns to existing tables
    op.add_column('documents', sa.Column('vessel_id', sa.String(36), nullable=True))
    op.add_column('approvals', sa.Column('vessel_id', sa.String(36), nullable=True))
    op.add_column('messages', sa.Column('vessel_id', sa.String(36), nullable=True))

    # Add owner and charterer columns to vessels table
    op.add_column('vessels', sa.Column('owner', sa.String(255), nullable=True))
    op.add_column('vessels', sa.Column('charterer', sa.String(255), nullable=True))

    # Create vessel_pairs table
    op.create_table('vessel_pairs',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('room_id', sa.String(36), nullable=False),
        sa.Column('mother_vessel_id', sa.String(36), nullable=False),
        sa.Column('receiving_vessel_id', sa.String(36), nullable=False),
        sa.Column('status', sa.String(50), nullable=True, default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.ForeignKeyConstraint(['mother_vessel_id'], ['vessels.id'], ),
        sa.ForeignKeyConstraint(['receiving_vessel_id'], ['vessels.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create weather_data table
    op.create_table('weather_data',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('room_id', sa.String(36), nullable=False),
        sa.Column('vessel_id', sa.String(36), nullable=True),
        sa.Column('location', sa.String(255), nullable=False),
        sa.Column('weather_data', sa.JSON(), nullable=False),
        sa.Column('fetched_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.ForeignKeyConstraint(['vessel_id'], ['vessels.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for performance
    op.create_index('ix_documents_vessel_id', 'documents', ['vessel_id'])
    op.create_index('ix_approvals_vessel_id', 'approvals', ['vessel_id'])
    op.create_index('ix_messages_vessel_id', 'messages', ['vessel_id'])
    op.create_index('ix_vessel_pairs_room_id', 'vessel_pairs', ['room_id'])
    op.create_index('ix_weather_data_room_id', 'weather_data', ['room_id'])
    op.create_index('ix_weather_data_vessel_id', 'weather_data', ['vessel_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_weather_data_vessel_id', table_name='weather_data')
    op.drop_index('ix_weather_data_room_id', table_name='weather_data')
    op.drop_index('ix_vessel_pairs_room_id', table_name='vessel_pairs')
    op.drop_index('ix_messages_vessel_id', table_name='messages')
    op.drop_index('ix_approvals_vessel_id', table_name='approvals')
    op.drop_index('ix_documents_vessel_id', table_name='documents')

    # Drop tables
    op.drop_table('weather_data')
    op.drop_table('vessel_pairs')

    # Drop columns
    op.drop_column('messages', 'vessel_id')
    op.drop_column('approvals', 'vessel_id')
    op.drop_column('documents', 'vessel_id')
    op.drop_column('vessels', 'charterer')
    op.drop_column('vessels', 'owner')
