# STS Clearance System - Backend API

## 🌊 Ship-to-Ship Transfer Operations Management System

A comprehensive backend API for managing Ship-to-Ship (STS) transfer operations, including document management, real-time chat, approval workflows, and vessel tracking.

## ✨ Features

### 🏠 **Room Management**
- Create, edit, and delete STS operation rooms
- Role-based access control (Owner, Broker, Seller, Buyer, Charterer)
- Party management with permissions

### 📋 **Document Management**
- Upload and manage operation documents
- Document approval workflow
- Status tracking (Missing, Under Review, Approved, Rejected, Expired)
- File storage and retrieval
- Document type management with criticality levels

### 💬 **Real-time Communication**
- WebSocket-based chat system
- Real-time message broadcasting
- File attachments in messages
- Message read status tracking

### ✅ **Approval System**
- Party-based approval workflow
- Room-level approval status
- Approval history and tracking
- Required document validation

### 🔔 **Notifications**
- Real-time notifications
- Document upload/approval alerts
- Expiration warnings
- Activity-based notifications

### 🚢 **Vessel Management**
- Vessel information tracking
- Technical specifications
- Flag state and classification society
- Vessel-specific approvals

### 📊 **Activity Logging**
- Comprehensive audit trail
- Activity timeline and summaries
- User action tracking
- Room-specific activity logs

### 📸 **Status Snapshots**
- PDF report generation
- Room status snapshots
- Historical record keeping
- Downloadable reports

### 🎛️ **Cockpit Dashboard**
- Missing and expiring documents overview
- Cross-room visibility
- Priority-based document tracking
- Feature flag management

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- PostgreSQL 12+

### Installation

1. **Clone and navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**
Create a `.env` file:
```env
DATABASE_URL=postgresql+asyncpg://username:password@localhost/sts_clearance
SECRET_KEY=your-secret-key-here
DEBUG=true
```

5. **Run the server with automatic setup**
```bash
python run_server.py
```

This will:
- Initialize the database schema
- Create sample data
- Start the API server on http://localhost:8000

## 📚 API Documentation

Once the server is running, visit:
- **Interactive API Docs**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc

## 🏗️ Architecture

### Database Models
- **Room**: STS operation rooms
- **Party**: Participants in operations
- **Document**: Operation documents
- **DocumentType**: Document categories
- **Approval**: Approval records
- **Message**: Chat messages
- **Notification**: User notifications
- **Vessel**: Ship information
- **ActivityLog**: Audit trail
- **Snapshot**: Status reports

### API Endpoints

#### 🏠 Rooms (`/api/v1/rooms`)
- `GET /rooms` - List user's rooms
- `POST /rooms` - Create new room
- `GET /rooms/{id}` - Get room details
- `PATCH /rooms/{id}` - Update room
- `DELETE /rooms/{id}` - Delete room
- `GET /rooms/{id}/parties` - List room parties
- `POST /rooms/{id}/parties` - Add party
- `DELETE /rooms/{id}/parties/{party_id}` - Remove party

#### 📋 Documents (`/api/v1/rooms/{room_id}/documents`)
- `GET /documents` - List room documents
- `GET /documents/{id}` - Get document details
- `POST /documents/{id}/upload` - Upload document file
- `PATCH /documents/{id}` - Update document
- `POST /documents/{id}/approve` - Approve document
- `POST /documents/{id}/reject` - Reject document
- `GET /documents/{id}/download` - Download document
- `GET /documents/status-summary` - Get status summary

#### 💬 Messages (`/api/v1/rooms/{room_id}`)
- `WebSocket /ws` - Real-time chat connection
- `GET /messages` - Get message history
- `POST /messages` - Send message
- `PATCH /messages/{id}/read` - Mark as read
- `GET /messages/unread-count` - Get unread count

#### ✅ Approvals (`/api/v1/rooms/{room_id}/approvals`)
- `GET /approvals` - List room approvals
- `POST /approvals` - Create/update approval
- `GET /approvals/status` - Get approval status
- `GET /approvals/my-status` - Get user's approval
- `DELETE /approvals` - Revoke approval

#### 🔔 Notifications (`/api/v1/notifications`)
- `GET /notifications` - List user notifications
- `GET /notifications/unread-count` - Get unread count
- `PATCH /notifications/mark-read` - Mark as read
- `PATCH /notifications/mark-all-read` - Mark all as read
- `DELETE /notifications/{id}` - Delete notification

#### 🚢 Vessels (`/api/v1/rooms/{room_id}/vessels`)
- `GET /vessels` - List room vessels
- `POST /vessels` - Create vessel
- `GET /vessels/{id}` - Get vessel details
- `PATCH /vessels/{id}` - Update vessel
- `DELETE /vessels/{id}` - Delete vessel

#### 📊 Activities (`/api/v1/rooms/{room_id}/activities`)
- `GET /activities` - List room activities
- `GET /activities/summary` - Get activity summary
- `GET /activities/timeline` - Get activity timeline

#### 📸 Snapshots (`/api/v1/rooms/{room_id}/snapshots`)
- `GET /snapshots` - List room snapshots
- `POST /snapshots` - Create snapshot
- `GET /snapshots/{id}` - Get snapshot details
- `GET /snapshots/{id}/download` - Download snapshot
- `DELETE /snapshots/{id}` - Delete snapshot

#### 🎛️ Cockpit (`/api/v1/cockpit`)
- `GET /missing-docs` - Missing documents overview
- `GET /expiring-docs` - Expiring documents overview

#### 🔐 Authentication (`/api/v1/auth`)
- `POST /login` - User login
- `POST /register` - User registration
- `GET /me` - Get current user

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing key
- `DEBUG`: Enable debug mode
- `CORS_ORIGINS`: Allowed CORS origins

### Feature Flags
The system uses feature flags for enabling/disabling functionality:
- `cockpit_missing_expiring_docs`: Enable cockpit dashboard
- `real_time_chat`: Enable WebSocket chat
- `document_approval_workflow`: Enable approval system
- `vessel_management`: Enable vessel tracking
- `snapshot_generation`: Enable PDF snapshots
- `advanced_notifications`: Enable notification system

## 🔒 Security

### Authentication
- JWT-based authentication
- Role-based access control
- Room-level permissions

### Authorization Roles
- **Owner**: Full room management rights
- **Broker**: Room creation and management (except deletion)
- **Seller/Buyer/Charterer**: Document upload and approval rights

### File Security
- Secure file upload handling
- Path traversal protection
- File type validation

## 🧪 Development

### Running Tests
```bash
pytest
```

### Database Migrations
```bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Code Formatting
```bash
black .
isort .
```

## 📦 Deployment

### Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "run_server.py"]
```

### Production Environment
- Use PostgreSQL for production database
- Set up proper SSL certificates
- Configure reverse proxy (nginx)
- Set up monitoring and logging
- Use environment-specific configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/docs`
- Review the activity logs for debugging

---

**Built with ❤️ for the maritime industry**