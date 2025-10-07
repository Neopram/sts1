"""Initial schema and document types seed

Revision ID: 001
Revises: 
Create Date: 2025-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create rooms table
    op.create_table('rooms',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('location', sa.String(length=255), nullable=False),
        sa.Column('sts_eta', sa.DateTime(), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create parties table
    op.create_table('parties',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('room_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create document_types table
    op.create_table('document_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('required', sa.Boolean(), default=True),
        sa.Column('criticality', sa.String(length=20), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    
    # Create documents table
    op.create_table('documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('room_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(length=50), default='missing'),
        sa.Column('expires_on', sa.DateTime(), nullable=True),
        sa.Column('uploaded_by', sa.String(length=255), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.ForeignKeyConstraint(['type_id'], ['document_types.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create document_versions table
    op.create_table('document_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=False),
        sa.Column('sha256', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('mime', sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create approvals table
    op.create_table('approvals',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('room_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('party_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(length=50), default='pending'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.ForeignKeyConstraint(['party_id'], ['parties.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create activity_log table
    op.create_table('activity_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('room_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('actor', sa.String(length=255), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('meta_json', sa.Text(), nullable=True),
        sa.Column('ts', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create feature_flags table
    op.create_table('feature_flags',
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('enabled', sa.Boolean(), default=False),
        sa.PrimaryKeyConstraint('key')
    )
    
    # Seed document types
    document_types = [
        {'id': str(uuid.uuid4()), 'code': 'Q88', 'name': 'Tanker Questionnaire', 'required': True, 'criticality': 'high'},
        {'id': str(uuid.uuid4()), 'code': 'CLASS_STATUS', 'name': 'Class & Statutory', 'required': True, 'criticality': 'high'},
        {'id': str(uuid.uuid4()), 'code': 'IOPP_FORM_B', 'name': 'IOPP Form B', 'required': True, 'criticality': 'high'},
        {'id': str(uuid.uuid4()), 'code': 'STS_PLAN', 'name': 'Approved STS Plan', 'required': True, 'criticality': 'high'},
        {'id': str(uuid.uuid4()), 'code': 'PI_COE', 'name': 'P&I Certificate of Entry', 'required': True, 'criticality': 'high'},
        {'id': str(uuid.uuid4()), 'code': 'MEG4_NOTE', 'name': 'MEG4 Conformance Note', 'required': True, 'criticality': 'med'},
        {'id': str(uuid.uuid4()), 'code': 'CREW_MATRIX', 'name': 'Crew Matrix', 'required': True, 'criticality': 'med'},
        {'id': str(uuid.uuid4()), 'code': 'STS_EXPERIENCE', 'name': 'STS Experience Matrix', 'required': True, 'criticality': 'med'},
        {'id': str(uuid.uuid4()), 'code': 'SANCTIONS_Q', 'name': 'Sanctions Questionnaire', 'required': True, 'criticality': 'high'},
        {'id': str(uuid.uuid4()), 'code': 'STS_HISTORY', 'name': 'Last 3 STS Ops', 'required': False, 'criticality': 'low'},
        {'id': str(uuid.uuid4()), 'code': 'CARGO_ORIGIN', 'name': 'Cargo Origin Declaration', 'required': True, 'criticality': 'med'},
        {'id': str(uuid.uuid4()), 'code': 'FENDER_CERT', 'name': 'Fender Certification', 'required': True, 'criticality': 'med'},
    ]
    
    for doc_type in document_types:
        op.execute(f"""
            INSERT INTO document_types (id, code, name, required, criticality)
            VALUES ('{doc_type['id']}', '{doc_type['code']}', '{doc_type['name']}', {doc_type['required']}, '{doc_type['criticality']}')
        """)
    
    # Enable the cockpit feature flag
    op.execute("INSERT INTO feature_flags (key, enabled) VALUES ('cockpit_missing_expiring_docs', true)")

def downgrade():
    op.drop_table('activity_log')
    op.drop_table('approvals')
    op.drop_table('document_versions')
    op.drop_table('documents')
    op.drop_table('document_types')
    op.drop_table('parties')
    op.drop_table('rooms')
    op.drop_table('feature_flags')
