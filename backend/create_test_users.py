import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python3
"""
Create test users for multi-user testing
"""

import asyncio
import uuid
from datetime import datetime, timedelta
import bcrypt
from app.database import get_async_session
from app.models import User, Room, Party, DocumentType
from sqlalchemy import select

async def create_test_users():
    """Create test users and rooms for testing"""
    
    async for session in get_async_session():
        try:
            # Create test users
            test_users = [
                {
                    'id': str(uuid.uuid4()),
                    'email': 'admin@sts.com',
                    'name': 'Admin User',
                    'role': 'admin',
                    'password': 'admin123'
                },
                {
                    'id': str(uuid.uuid4()),
                    'email': 'owner@sts.com',
                    'name': 'Ship Owner',
                    'role': 'owner',
                    'password': 'owner123'
                },
                {
                    'id': str(uuid.uuid4()),
                    'email': 'charterer@sts.com',
                    'name': 'Charterer Company',
                    'role': 'charterer',
                    'password': 'charterer123'
                },
                {
                    'id': str(uuid.uuid4()),
                    'email': 'broker@sts.com',
                    'name': 'Maritime Broker',
                    'role': 'broker',
                    'password': 'broker123'
                },
                {
                    'id': str(uuid.uuid4()),
                    'email': 'viewer@sts.com',
                    'name': 'Port Authority',
                    'role': 'viewer',
                    'password': 'viewer123'
                },
                {
                    'id': str(uuid.uuid4()),
                    'email': 'test@sts.com',
                    'name': 'Test User',
                    'role': 'buyer',
                    'password': 'test123'
                }
            ]
            
            # Check if users already exist
            for user_data in test_users:
                result = await session.execute(
                    select(User).where(User.email == user_data['email'])
                )
                existing_user = result.scalar_one_or_none()
                
                if not existing_user:
                    # Hash password
                    hashed_password = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt())
                    user = User(
                        id=user_data['id'],
                        email=user_data['email'],
                        name=user_data['name'],
                        role=user_data['role'],
                        password_hash=hashed_password.decode('utf-8')
                    )
                    session.add(user)
                    print(f"Created user: {user_data['email']}")
                else:
                    print(f"User already exists: {user_data['email']}")
            
            # Create test room
            room_id = str(uuid.uuid4())
            result = await session.execute(
                select(Room).where(Room.title == 'Test STS Operation - Multi-User')
            )
            existing_room = result.scalar_one_or_none()
            
            if not existing_room:
                room = Room(
                    id=room_id,
                    title='Test STS Operation - Multi-User',
                    location='Fujairah, UAE',
                    sts_eta=datetime.now() + timedelta(days=7),
                    created_by='owner@sts.com',
                    description='Test room for multi-user functionality testing'
                )
                session.add(room)
                
                # Add parties to the room
                parties_data = [
                    {'role': 'owner', 'name': 'Ship Owner', 'email': 'owner@sts.com'},
                    {'role': 'charterer', 'name': 'Charterer Company', 'email': 'charterer@sts.com'},
                    {'role': 'broker', 'name': 'Maritime Broker', 'email': 'broker@sts.com'},
                    {'role': 'viewer', 'name': 'Port Authority', 'email': 'viewer@sts.com'}
                ]
                
                for party_data in parties_data:
                    party = Party(
                        id=str(uuid.uuid4()),
                        room_id=room_id,
                        role=party_data['role'],
                        name=party_data['name'],
                        email=party_data['email']
                    )
                    session.add(party)
                
                print(f"Created test room: {room.title}")
            else:
                print("Test room already exists")
            
            # Create document types if they don't exist
            doc_types = [
                {'code': 'INS', 'name': 'Insurance Certificate', 'required': True, 'criticality': 'high'},
                {'code': 'SAFETY', 'name': 'Safety Certificate', 'required': True, 'criticality': 'high'},
                {'code': 'COMP', 'name': 'Compatibility Study', 'required': True, 'criticality': 'med'},
                {'code': 'RISK', 'name': 'Risk Assessment', 'required': True, 'criticality': 'med'},
                {'code': 'NOTICE', 'name': '48hr Notice', 'required': True, 'criticality': 'high'},
                {'code': 'FENDER', 'name': 'Fender Certificates', 'required': False, 'criticality': 'low'}
            ]
            
            for doc_type_data in doc_types:
                result = await session.execute(
                    select(DocumentType).where(DocumentType.code == doc_type_data['code'])
                )
                existing_doc_type = result.scalar_one_or_none()
                
                if not existing_doc_type:
                    doc_type = DocumentType(
                        id=str(uuid.uuid4()),
                        code=doc_type_data['code'],
                        name=doc_type_data['name'],
                        required=doc_type_data['required'],
                        criticality=doc_type_data['criticality']
                    )
                    session.add(doc_type)
                    print(f"Created document type: {doc_type_data['name']}")
            
            await session.commit()
            print("\n✅ Test users and data created successfully!")
            print("\n🔑 LOGIN CREDENTIALS:")
            print("Admin: admin@sts.com / admin123")
            print("Owner: owner@sts.com / owner123")
            print("Charterer: charterer@sts.com / charterer123")
            print("Broker: broker@sts.com / broker123")
            print("Viewer: viewer@sts.com / viewer123")
            print("Test: test@sts.com / test123")
            print("\n🏢 Test Room: 'Test STS Operation - Multi-User'")
            
        except Exception as e:
            print(f"Error creating test data: {e}")
            await session.rollback()
        finally:
            await session.close()
        break

if __name__ == "__main__":
    asyncio.run(create_test_users())
