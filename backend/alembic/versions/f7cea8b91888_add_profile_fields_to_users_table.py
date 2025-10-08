"""add_profile_fields_to_users_table

Revision ID: f7cea8b91888
Revises: 7b50c4b23312
Create Date: 2025-10-08 11:47:09.395411

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f7cea8b91888'
down_revision = '7b50c4b23312'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to users table
    op.add_column('users', sa.Column('company', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('location', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('timezone', sa.String(100), nullable=False, server_default='UTC'))
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(500), nullable=True))
    op.add_column('users', sa.Column('preferences', sa.JSON(), nullable=False, server_default='{}'))


def downgrade() -> None:
    # Remove the added columns from users table
    op.drop_column('users', 'preferences')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'timezone')
    op.drop_column('users', 'location')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'company')
