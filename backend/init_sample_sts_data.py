#!/usr/bin/env python3
"""
🚀 STS ClearHub - Sample Data Initialization Script
Initialize database with realistic test data for all user roles

Run this ONCE after starting the application for the first time:
    cd sts/backend
    python init_sample_sts_data.py

This creates:
- 7 test users (1 admin, 1 broker, 1 owner, 1 charterer, 1 seller, 1 buyer, 1 viewer)
- 3 STS operations in various stages
- Document types (ISM, COC, Hull Survey, etc.)
- Sample documents in different approval states
- Activity logs
"""

import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from passlib.hash import bcrypt

from app.models import (
    Base, User, Room, Party, Vessel, Document, DocumentType, 
    Approval, Message, ActivityLog
)
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./sts_clearance.db")

# Create async engine and session factory
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created/verified")


async def create_test_users():
    """Create test users for each role"""
    
    users_data = [
        {
            "email": "admin@stsclearance.com",
            "name": "Admin STS",
            "role": "admin",
            "company": "STS Platform Admin",
            "password": "admin123"
        },
        {
            "email": "jane.broker@shipbrokers.com",
            "name": "Jane Broker",
            "role": "broker",
            "company": "Global Ship Brokers Inc",
            "password": "broker123"
        },
        {
            "email": "john.owner@vesselco.com",
            "name": "John Owner",
            "role": "owner",
            "company": "Vessel Owners International",
            "password": "owner123"
        },
        {
            "email": "bob.charterer@operatorco.com",
            "name": "Bob Charterer",
            "role": "charterer",
            "company": "Maritime Operators Corp",
            "password": "charterer123"
        },
        {
            "email": "alice.seller@cargoco.com",
            "name": "Alice Seller",
            "role": "seller",
            "company": "Global Trading Ltd",
            "password": "seller123"
        },
        {
            "email": "charlie.buyer@refineryco.com",
            "name": "Charlie Buyer",
            "role": "buyer",
            "company": "Refinery & Petrochemical Inc",
            "password": "buyer123"
        },
        {
            "email": "viewer@stsclearance.com",
            "name": "Observer Viewer",
            "role": "viewer",
            "company": "STS Platform",
            "password": "viewer123"
        },
    ]
    
    async with AsyncSessionLocal() as session:
        users = []
        for user_data in users_data:
            # Check if user exists
            result = await session.execute(
                select(User).where(User.email == user_data["email"]).limit(1)
            )
            existing = result.scalar_one_or_none()
            
            if not existing:
                hashed_pwd = bcrypt.hashpw(user_data["password"].encode('utf-8'), bcrypt.gensalt())
                user = User(
                    email=user_data["email"],
                    name=user_data["name"],
                    role=user_data["role"],
                    company=user_data["company"],
                    password_hash=hashed_pwd.decode('utf-8'),
                    is_active=True,
                    timezone="UTC"
                )
                session.add(user)
                users.append(user)
                print(f"  ✓ Created user: {user_data['email']} ({user_data['role']})")
        
        await session.commit()
        return users


async def create_document_types():
    """Create standard STS document types"""
    
    doc_types = [
        {"code": "ISM", "name": "ISM Certificate", "required": True, "criticality": "high"},
        {"code": "COC", "name": "Certificate of Compliance", "required": True, "criticality": "high"},
        {"code": "HULL", "name": "Hull Survey Certificate", "required": True, "criticality": "high"},
        {"code": "CLASS", "name": "Classification Society Certificate", "required": True, "criticality": "medium"},
        {"code": "CREW", "name": "Crew Roster", "required": True, "criticality": "high"},
        {"code": "CARGO_INVOICE", "name": "Cargo Invoice", "required": True, "criticality": "high"},
        {"code": "QUALITY", "name": "Quality Certificate", "required": True, "criticality": "high"},
        {"code": "INSURANCE", "name": "Insurance Certificate", "required": False, "criticality": "medium"},
        {"code": "BALLAST", "name": "Ballast Water Certificate", "required": True, "criticality": "medium"},
        {"code": "FUEL_QUALITY", "name": "Fuel Quality Certificate", "required": False, "criticality": "low"},
        {"code": "MANIFEST", "name": "Cargo Manifest", "required": True, "criticality": "high"},
        {"code": "BILL_LADING", "name": "Bill of Lading", "required": True, "criticality": "high"},
    ]
    
    async with AsyncSessionLocal() as session:
        for dt in doc_types:
            result = await session.execute(
                select(DocumentType).where(DocumentType.code == dt["code"]).limit(1)
            )
            existing = result.scalar_one_or_none()
            
            if not existing:
                doc_type = DocumentType(
                    code=dt["code"],
                    name=dt["name"],
                    required=dt["required"],
                    criticality=dt["criticality"]
                )
                session.add(doc_type)
                print(f"  ✓ Created document type: {dt['code']}")
        
        await session.commit()


async def create_sample_operations():
    """Create realistic sample STS operations"""
    
    async with AsyncSessionLocal() as session:
        # Get test users
        users = await session.execute(select(User))
        users_map = {u.email: u for u in users.scalars().all()}
        
        broker = users_map.get("jane.broker@shipbrokers.com")
        owner = users_map.get("john.owner@vesselco.com")
        charterer = users_map.get("bob.charterer@operatorco.com")
        seller = users_map.get("alice.seller@cargoco.com")
        buyer = users_map.get("charlie.buyer@refineryco.com")
        
        if not all([broker, owner, charterer, seller, buyer]):
            print("❌ Error: Not all users found. Make sure to run create_test_users first")
            return
        
        # Operation 1: Active STS Transfer (60% complete)
        operation1 = Room(
            title="STS Operation: MT GLOBAL → MT HORIZON",
            location="Gulf of Mexico, Offshore 25°N 90°W",
            sts_eta=datetime.now() + timedelta(days=22),
            created_by=broker.email,
            description="Ship-to-Ship transfer of Light Crude Oil between two tankers. Operation Status: Ongoing",
            status="active"
        )
        session.add(operation1)
        await session.flush()
        
        # Add parties to operation 1
        parties1 = [
            Party(room_id=operation1.id, role="owner", name="John Owner", email=owner.email),
            Party(room_id=operation1.id, role="broker", name="Jane Broker", email=broker.email),
            Party(room_id=operation1.id, role="charterer", name="Bob Charterer", email=charterer.email),
            Party(room_id=operation1.id, role="seller", name="Alice Seller", email=seller.email),
            Party(room_id=operation1.id, role="buyer", name="Charlie Buyer", email=buyer.email),
        ]
        for party in parties1:
            session.add(party)
        await session.flush()
        
        # Add vessels to operation 1
        vessel1_1 = Vessel(
            room_id=operation1.id,
            imo="9234567",
            name="MT GLOBAL",
            type="Tanker",
            flag="Panama",
            classification_society="ABS",
            length=190.5,
            beam=32.2,
            dwt=50000,
            status="active"
        )
        
        vessel1_2 = Vessel(
            room_id=operation1.id,
            imo="9345678",
            name="MT HORIZON",
            type="Tanker",
            flag="Liberia",
            classification_society="Lloyd's",
            length=189.9,
            beam=32.0,
            dwt=49500,
            status="active"
        )
        
        session.add(vessel1_1)
        session.add(vessel1_2)
        await session.flush()
        
        # Get document types
        doc_types = await session.execute(select(DocumentType))
        doc_types_map = {dt.code: dt for dt in doc_types.scalars().all()}
        
        # Add documents to operation 1 in various states
        docs1_data = [
            {"type": "ISM", "status": "approved", "uploaded_by": owner.email},
            {"type": "COC", "status": "approved", "uploaded_by": owner.email},
            {"type": "HULL", "status": "under_review", "uploaded_by": charterer.email},
            {"type": "CLASS", "status": "approved", "uploaded_by": owner.email},
            {"type": "CREW", "status": "under_review", "uploaded_by": charterer.email},
            {"type": "CARGO_INVOICE", "status": "missing", "uploaded_by": None},
            {"type": "QUALITY", "status": "missing", "uploaded_by": None},
            {"type": "INSURANCE", "status": "approved", "uploaded_by": seller.email},
            {"type": "BALLAST", "status": "under_review", "uploaded_by": charterer.email},
        ]
        
        for doc_data in docs1_data:
            doc_type = doc_types_map.get(doc_data["type"])
            if doc_type:
                doc = Document(
                    room_id=operation1.id,
                    document_type_id=doc_type.id,
                    title=f"{doc_type.name} - MT GLOBAL",
                    status=doc_data["status"],
                    criticality=doc_type.criticality,
                    uploaded_by=doc_data["uploaded_by"],
                    created_at=datetime.now() - timedelta(days=1 if doc_data["status"] != "missing" else 0)
                )
                session.add(doc)
        
        # Operation 2: Ready to Start (10% complete)
        operation2 = Room(
            title="STS Operation: MT SWIFT ↔ MT EFFICIENT",
            location="Singapore Strait, 1°15'N 103°50'E",
            sts_eta=datetime.now() + timedelta(days=5),
            created_by=broker.email,
            description="Ship-to-Ship transfer of Marine Fuel Oil. Status: Pre-operation documentation phase",
            status="active"
        )
        session.add(operation2)
        await session.flush()
        
        parties2 = [
            Party(room_id=operation2.id, role="owner", name="John Owner", email=owner.email),
            Party(room_id=operation2.id, role="broker", name="Jane Broker", email=broker.email),
            Party(room_id=operation2.id, role="charterer", name="Bob Charterer", email=charterer.email),
            Party(room_id=operation2.id, role="seller", name="Alice Seller", email=seller.email),
            Party(room_id=operation2.id, role="buyer", name="Charlie Buyer", email=buyer.email),
        ]
        for party in parties2:
            session.add(party)
        await session.flush()
        
        vessel2_1 = Vessel(
            room_id=operation2.id,
            imo="9456789",
            name="MT SWIFT",
            type="Tanker",
            flag="Singapore",
            classification_society="DNV",
            length=180.0,
            beam=30.0,
            dwt=40000,
            status="scheduled"
        )
        
        vessel2_2 = Vessel(
            room_id=operation2.id,
            imo="9567890",
            name="MT EFFICIENT",
            type="Tanker",
            flag="Hong Kong",
            classification_society="ClassNK",
            length=175.5,
            beam=28.8,
            dwt=35000,
            status="scheduled"
        )
        
        session.add(vessel2_1)
        session.add(vessel2_2)
        await session.flush()
        
        # Operation 3: Completed (100%)
        operation3 = Room(
            title="STS Operation: MT PARTNER ↔ MT RECEIVER",
            location="Rotterdam, North Sea",
            sts_eta=datetime.now() - timedelta(days=10),
            created_by=broker.email,
            description="Ship-to-Ship transfer of Heavy Fuel Oil. Status: COMPLETED",
            status="completed"
        )
        session.add(operation3)
        await session.flush()
        
        parties3 = [
            Party(room_id=operation3.id, role="owner", name="John Owner", email=owner.email),
            Party(room_id=operation3.id, role="broker", name="Jane Broker", email=broker.email),
            Party(room_id=operation3.id, role="charterer", name="Bob Charterer", email=charterer.email),
        ]
        for party in parties3:
            session.add(party)
        
        # Add all documents as approved for completed operation
        doc_codes = ["ISM", "COC", "HULL", "CLASS", "CREW", "CARGO_INVOICE", "QUALITY", "INSURANCE", "BALLAST", "MANIFEST"]
        for doc_code in doc_codes:
            doc_type = doc_types_map.get(doc_code)
            if doc_type:
                doc = Document(
                    room_id=operation3.id,
                    document_type_id=doc_type.id,
                    title=f"{doc_type.name} - Completed",
                    status="approved",
                    criticality=doc_type.criticality,
                    uploaded_by=owner.email,
                    created_at=datetime.now() - timedelta(days=15)
                )
                session.add(doc)
        
        # Add activity logs
        activities = [
            ActivityLog(
                room_id=operation1.id,
                user_email=broker.email,
                action="created",
                entity_type="room",
                description="Created STS Operation",
                timestamp=datetime.now() - timedelta(days=1)
            ),
            ActivityLog(
                room_id=operation1.id,
                user_email=owner.email,
                action="approved",
                entity_type="document",
                description="Approved ISM Certificate",
                timestamp=datetime.now() - timedelta(hours=12)
            ),
            ActivityLog(
                room_id=operation1.id,
                user_email=charterer.email,
                action="uploaded",
                entity_type="document",
                description="Uploaded Crew Roster",
                timestamp=datetime.now() - timedelta(hours=6)
            ),
        ]
        
        for activity in activities:
            session.add(activity)
        
        await session.commit()
        print("✅ Sample STS operations created (3 operations)")
        print(f"  ✓ Operation 1: {operation1.title} (Active - 60% complete)")
        print(f"  ✓ Operation 2: {operation2.title} (Active - 10% complete)")
        print(f"  ✓ Operation 3: {operation3.title} (Completed)")


async def main():
    """Run all initialization steps"""
    print("\n" + "="*60)
    print("🚀 STS ClearHub - Database Initialization")
    print("="*60 + "\n")
    
    try:
        print("📝 Step 1: Initializing database...")
        await init_db()
        
        print("\n📝 Step 2: Creating test users...")
        await create_test_users()
        
        print("\n📝 Step 3: Creating document types...")
        await create_document_types()
        
        print("\n📝 Step 4: Creating sample STS operations...")
        await create_sample_operations()
        
        print("\n" + "="*60)
        print("✨ DATABASE INITIALIZATION COMPLETE!")
        print("="*60)
        print("\n📝 Test User Credentials:")
        print("-" * 60)
        test_users = [
            ("admin@stsclearance.com", "admin123", "ADMIN"),
            ("jane.broker@shipbrokers.com", "broker123", "BROKER"),
            ("john.owner@vesselco.com", "owner123", "OWNER"),
            ("bob.charterer@operatorco.com", "charterer123", "CHARTERER"),
            ("alice.seller@cargoco.com", "seller123", "SELLER"),
            ("charlie.buyer@refineryco.com", "buyer123", "BUYER"),
            ("viewer@stsclearance.com", "viewer123", "VIEWER"),
        ]
        
        for email, password, role in test_users:
            print(f"  {role:12} | Email: {email:35} | Password: {password}")
        
        print("-" * 60)
        print("\n🎯 Next Steps:")
        print("  1. Start the application: npm run dev")
        print("  2. Open http://localhost:5173")
        print("  3. Login with any of the test credentials above")
        print("  4. Explore the app and test features")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error during initialization: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())