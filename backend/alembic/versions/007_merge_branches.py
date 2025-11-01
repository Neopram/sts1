"""Merge divergent migration branches

This migration merges the three branches of the migration history:
- Branch 1: 003 -> dashboard fixes
- Branch 2: 5740eda1b01c (vessel integration)

Revision ID: 007_merge_branches
Revises: 003, 5740eda1b01c, 006_fix_dashboard_rooms
Create Date: 2025-10-10 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007_merge_branches'
down_revision = ('003', '5740eda1b01c', '006_fix_dashboard_rooms')
branch_labels = None
depends_on = None


def upgrade() -> None:
    """This merge migration ensures all branches are converged"""
    pass  # No database changes needed, just merging history


def downgrade() -> None:
    """Downgrade merge"""
    pass  # No database changes to revert