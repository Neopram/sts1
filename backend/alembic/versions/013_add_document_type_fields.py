"""Add description and category fields to document_types table

This migration adds missing fields to the document_types table:
- description: Optional text field to describe the document type
- category: String field to categorize document types (general, technical, regulatory, commercial, etc.)

Revision ID: 013_add_document_type_fields
Revises: 012_add_missing_indexes
Create Date: 2025-01-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '013_add_document_type_fields'
down_revision = '003_add_snapshots_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add description and category columns to document_types table - IDEMPOTENT"""
    
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Check if document_types table exists
    if 'document_types' not in inspector.get_table_names():
        print("⚠️  document_types table does not exist, skipping migration")
        return
    
    # Get existing columns
    columns = [col['name'] for col in inspector.get_columns('document_types')]
    
    # Add description column if it doesn't exist
    if 'description' not in columns:
        try:
            op.add_column('document_types', 
                         sa.Column('description', sa.Text(), nullable=True))
            print("✅ Added description column to document_types")
        except Exception as e:
            print(f"⚠️  Error adding description column: {e}")
    
    # Add category column if it doesn't exist
    if 'category' not in columns:
        try:
            op.add_column('document_types',
                         sa.Column('category', sa.String(100), nullable=False, server_default='general'))
            print("✅ Added category column to document_types")
        except Exception as e:
            print(f"⚠️  Error adding category column: {e}")


def downgrade() -> None:
    """Remove added columns"""
    
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Check if document_types table exists
    if 'document_types' not in inspector.get_table_names():
        return
    
    # Get existing columns
    columns = [col['name'] for col in inspector.get_columns('document_types')]
    
    # Remove category column
    if 'category' in columns:
        try:
            op.drop_column('document_types', 'category')
            print("✅ Removed category column from document_types")
        except Exception:
            pass
    
    # Remove description column
    if 'description' in columns:
        try:
            op.drop_column('document_types', 'description')
            print("✅ Removed description column from document_types")
        except Exception:
            pass