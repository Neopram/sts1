"""add_security_and_profile_fields_to_users_table

Revision ID: 004_security_profile
Revises: f7cea8b91888
Create Date: 2025-10-09 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_security_profile'
down_revision = 'f7cea8b91888'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new profile fields to users table
    op.add_column('users', sa.Column('department', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('position', sa.String(255), nullable=True))
    
    # Add security-related fields to users table
    op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('last_password_change', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('password_expiry_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('login_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove the added columns from users table
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'login_attempts')
    op.drop_column('users', 'password_expiry_date')
    op.drop_column('users', 'last_password_change')
    op.drop_column('users', 'two_factor_enabled')
    op.drop_column('users', 'position')
    op.drop_column('users', 'department')