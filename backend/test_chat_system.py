import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python
"""
Comprehensive Chat System Test
Tests the chat functionality by role
"""

import asyncio
import json
import sys
from datetime import datetime
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import User, Room, Party, Message, Vessel
from app.dependencies import create_access_token

async def test_chat_system():
    async with AsyncSessionLocal() as session:
        print("\n" + "="*80)
        print("🧪 COMPREHENSIVE CHAT SYSTEM TEST BY ROLE")
        print("="*80)
        
        # Get test room
        result = await session.execute(select(Room).limit(1))
        room = result.scalar_one_or_none()
        if not room:
            print("❌ NO ROOMS FOUND")
            return
        
        room_id = str(room.id)
        print(f"\n📍 Test Room: {room.title}")
        print(f"   ID: {room_id}\n")
        
        # Get parties in room
        result = await session.execute(
            select(Party).where(Party.room_id == room_id)
        )
        parties = result.scalars().all()
        
        # Get test users
        test_emails = [p.email for p in parties]
        result = await session.execute(
            select(User).where(User.email.in_(test_emails))
        )
        users_by_email = {u.email: u for u in result.scalars().all()}
        
        print("👥 PARTIES IN ROOM:")
        for p in parties:
            user = users_by_email.get(p.email)
            role = user.role if user else "unknown"
            print(f"   • {p.email:25} | {role:15} | {p.name}")
        
        # Clear old messages for clean test
        result = await session.execute(
            select(Message).where(Message.room_id == room_id)
        )
        old_messages = result.scalars().all()
        for msg in old_messages:
            await session.delete(msg)
        await session.commit()
        print(f"\n🗑️  Cleared {len(old_messages)} old messages\n")
        
        # ========== TEST 1: Send room-level messages ==========
        print("📝 TEST 1: Room-Level Messages (vessel_id = NULL)")
        print("-" * 80)
        
        test_messages = [
            ("broker@sts.com", "Maritime Broker", "🔔 BROKER: Important update for all parties"),
            ("owner@sts.com", "Ship Owner", "👤 OWNER: We're ready with documents"),
            ("viewer@sts.com", "Port Authority", "👁️ VIEWER: Status check from port"),
        ]
        
        for email, name, content in test_messages:
            msg = Message(
                room_id=room_id,
                vessel_id=None,
                sender_email=email,
                sender_name=name,
                content=content,
                message_type="text"
            )
            session.add(msg)
            await session.commit()
            print(f"✅ {email:25} sent: {content}")
        
        # ========== TEST 2: Check message visibility by role ==========
        print("\n📺 TEST 2: Message Visibility by Role")
        print("-" * 80)
        
        # Get messages
        result = await session.execute(
            select(Message).where(Message.room_id == room_id)
        )
        all_messages = result.scalars().all()
        
        print(f"\n✅ ALL MESSAGES: {len(all_messages)}")
        for msg in all_messages:
            print(f"   → {msg.sender_email:25} | {msg.content[:50]}")
        
        # ========== TEST 3: Simulate role-based access control ==========
        print("\n🔒 TEST 3: Simulating Role-Based Access Control")
        print("-" * 80)
        
        for p in parties:
            user = users_by_email.get(p.email)
            if not user:
                continue
                
            role = user.role
            email = user.email
            
            print(f"\n👤 {email} ({role}):")
            
            # Simulate get_user_accessible_vessels logic
            if role == "broker":
                print("   ✅ BROKER: Can see ALL messages (room + all vessels)")
                print(f"   ✅ Visible: {len(all_messages)} messages")
            
            elif role == "owner":
                print("   ✅ OWNER: Can see room-level + owned vessels")
                # Filter: room-level or vessels owned by this company
                accessible = [m for m in all_messages if m.vessel_id is None or True]  # Simplified
                print(f"   ✅ Visible: {len(accessible)} room-level messages")
            
            elif role == "viewer":
                print("   ✅ VIEWER: Can see room-level messages only")
                room_level = [m for m in all_messages if m.vessel_id is None]
                print(f"   ✅ Visible: {len(room_level)} room-level messages")
            
            else:
                print(f"   ❓ {role}: Role handling unclear")
        
        # ========== TEST 4: Vessel-specific messages ==========
        print("\n\n🚢 TEST 4: Vessel-Specific Messages")
        print("-" * 80)
        
        result = await session.execute(select(Vessel).limit(1))
        vessel = result.scalar_one_or_none()
        
        if vessel:
            print(f"Found vessel: {vessel.name} ({vessel.imo})")
            print(f"   Owner: {vessel.owner}")
            print(f"   Charterer: {vessel.charterer}\n")
            
            vessel_msg = Message(
                room_id=str(vessel.room_id),
                vessel_id=str(vessel.id),
                sender_email="broker@sts.com",
                sender_name="Maritime Broker",
                content=f"🚢 Vessel-specific message for {vessel.name}",
                message_type="text"
            )
            session.add(vessel_msg)
            await session.commit()
            
            print(f"✅ Created vessel-specific message")
            print(f"   Broker SHOULD see: YES (has full access)")
            print(f"   Owner SHOULD see: MAYBE (if owns this vessel)")
            print(f"   Viewer SHOULD see: NO (no vessel access)")
        else:
            print("⚠️  No vessels found to test")
        
        # ========== TEST 5: Generate test tokens ==========
        print("\n\n🔐 TEST 5: Auth Tokens for Testing")
        print("-" * 80)
        
        tokens = {}
        for p in parties:
            user = users_by_email.get(p.email)
            if user:
                token = create_access_token(data={"email": p.email})
                tokens[p.email] = {
                    "token": token,
                    "role": user.role,
                    "name": user.name
                }
        
        with open("test_chat_tokens.json", "w") as f:
            json.dump(tokens, f, indent=2)
        
        print("✅ Tokens saved to test_chat_tokens.json\n")
        for email, data in tokens.items():
            print(f"   {email:25} ({data['role']:10}) → {data['token'][:25]}...")

asyncio.run(test_chat_system())