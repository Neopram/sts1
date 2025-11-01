#!/usr/bin/env python3
"""Check and create seller demo data"""

import sqlite3
from datetime import datetime, timedelta
import uuid

def main():
    try:
        conn = sqlite3.connect('sts_clearance.db')
        cursor = conn.cursor()
        
        print("\n📊 Current Database Status:")
        print("=" * 50)
        
        # Check parties
        cursor.execute('SELECT COUNT(*) FROM party')
        party_count = cursor.fetchone()[0]
        print(f'✓ Total Parties: {party_count}')
        
        # Check rooms
        cursor.execute('SELECT COUNT(*) FROM room')
        room_count = cursor.fetchone()[0]
        print(f'✓ Total Rooms: {room_count}')
        
        # Check if seller@sts.com is in any party
        cursor.execute('SELECT COUNT(*) FROM party WHERE email = ?', ('seller@sts.com',))
        seller_in_parties = cursor.fetchone()[0]
        print(f'✓ Seller in parties: {seller_in_parties}')
        
        # Show rooms
        cursor.execute('SELECT id, title, location FROM room LIMIT 3')
        rooms = cursor.fetchall()
        if rooms:
            print(f"\n🏢 Sample Rooms ({len(rooms)} shown):")
            for room_id, title, location in rooms:
                print(f'  - {title} @ {location} (ID: {room_id[:8]}...)')
                
                # Check parties in this room
                cursor.execute('''
                    SELECT role, email FROM party 
                    WHERE room_id = ?
                ''', (room_id,))
                parties = cursor.fetchall()
                for role, email in parties:
                    print(f'    └─ {role}: {email}')
        
        # Create demo room with seller if needed
        if room_count == 0 or seller_in_parties == 0:
            print("\n🔧 Creating demo data for seller...")
            
            # Create a room
            room_id = str(uuid.uuid4())
            room_title = "Crude Oil STS Operation - Singapore"
            room_location = "Singapore"
            room_eta = datetime.utcnow() + timedelta(days=7)
            
            cursor.execute('''
                INSERT INTO room (id, title, location, sts_eta, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (room_id, room_title, room_location, room_eta, 'active', datetime.utcnow(), datetime.utcnow()))
            
            # Add seller as party
            cursor.execute('''
                INSERT INTO party (room_id, email, role, name, joined_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (room_id, 'seller@sts.com', 'seller', 'Demo Seller', datetime.utcnow()))
            
            # Add buyer as party
            cursor.execute('''
                INSERT INTO party (room_id, email, role, name, joined_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (room_id, 'buyer@sts.com', 'buyer', 'Demo Buyer', datetime.utcnow()))
            
            # Add broker as party
            cursor.execute('''
                INSERT INTO party (room_id, email, role, name, joined_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (room_id, 'broker@sts.com', 'broker', 'Demo Broker', datetime.utcnow()))
            
            conn.commit()
            print(f"✅ Created room: {room_title}")
            print(f"   - Room ID: {room_id}")
            print(f"   - Added seller@sts.com as seller")
            print(f"   - Added buyer@sts.com as buyer")
            print(f"   - Added broker@sts.com as broker")
        else:
            print("\n✅ Demo data already exists!")
        
        conn.close()
        print("\n✓ Done!")
        
    except Exception as e:
        print(f'\n✗ Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()