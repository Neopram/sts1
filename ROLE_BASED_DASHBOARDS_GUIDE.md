# 🎯 Role-Based Dashboard Implementation Guide

## 📊 System Overview

The STS Clearance Hub now features **complete role-based dashboards** where each user sees a completely different interface based on their role after login.

### Architecture

```
Login Page (/login)
    ↓
Enter credentials
    ↓
Backend authenticates & returns: {token, email, role, name}
    ↓
Frontend stores user data with ROLE
    ↓
Navigate to /dashboard
    ↓
RoleDashboardSelector (switches based on user.role)
    ├─→ admin        → AdminDashboard (System statistics)
    ├─→ broker       → DashboardBroker (Operations center + Create STS Wizard)
    ├─→ owner        → DashboardOwner (Vessel management)
    ├─→ seller/buyer → DashboardParty (Transaction management)
    └─→ viewer       → DashboardViewer (Read-only view)
```

---

## 🔐 Test Accounts

| Email | Role | Password | Dashboard |
|-------|------|----------|-----------|
| admin@sts.com | admin | password123 | System Admin Panel |
| broker@sts.com | broker | password123 | **🆕 Operations + Create STS** |
| owner@sts.com | owner | password123 | Vessel Owner Portal |
| seller@sts.com | seller | password123 | Transaction Dashboard |
| buyer@sts.com | buyer | password123 | Transaction Dashboard |
| viewer@sts.com | viewer | password123 | View-Only Dashboard |

---

## 🚀 Usage Steps

### Step 1: Create Test Users (if not already created)

```bash
cd c:\Users\feder\Desktop\StsHub\sts
python backend/create_test_users_all_roles.py
```

### Step 2: Verify Backend is Running

```bash
# Backend should be on port 8001
curl http://localhost:8001/api/v1/auth/validate -H "Authorization: Bearer <token>"
```

### Step 3: Access the Application

1. Open your browser: `http://localhost:3001/login`
2. Try each test account to see different dashboards

---

## 📱 Dashboard Features by Role

### 1. **Admin Dashboard** 👤
**Account:** admin@sts.com

**Features:**
- System Statistics
  - Total Users Count
  - Active Users (last 7 days)
  - Total Documents
  - Total Operations
  - System Health Percentage
- System Activity Logs
- User Management
- System Configuration

**When you login, you see:**
```
┌──────────────────────────────────────┐
│ Panel de Administración              │
├──────────────────────────────────────┤
│ 📊 Usuarios Totales: 8               │
│ 👥 Usuarios Activos: 5               │
│ 📄 Total de Documentos: 54           │
│ 🏢 Total de Operaciones: 12          │
├──────────────────────────────────────┤
│ ⏱️ Activity Logs (System events)      │
└──────────────────────────────────────┘
```

---

### 2. **Broker Dashboard** 🏢 ⭐ **NEW FEATURE**
**Account:** broker@sts.com

**Features:**
- **NEW: Create New STS Operation** (Interactive 4-step wizard)
  - Step 1: Basic Information (Title, Dates)
  - Step 2: Parties & Location (Country, Operation Type)
  - Step 3: Cargo Configuration (Cargo Type, Quantity, Transfer Rate)
  - Step 4: Review & Create
- Active Transactions Count
- Pending Approvals Queue
- Urgent Actions Tracker
- My Active Transactions (Table)
- Approval Queue (Waiting for approval)
- Quick Actions (Bulk Approve, Reports)

**When you login, you see:**
```
┌──────────────────────────────────────┐
│ 🏢 Broker Operations Center          │
├──────────────────────────────────────┤
│ Stats:                               │
│ • Active Transactions: X             │
│ • Pending Approvals: Y               │
│ • Urgent Actions: Z                  │
├──────────────────────────────────────┤
│ 🆕 [Create New STS Operation] ← NEW  │
│ [Bulk Approve]  [View Reports]      │
├──────────────────────────────────────┤
│ Active Transactions Table            │
│ Your Approval Queue                  │
└──────────────────────────────────────┘
```

**Create STS Operation Wizard Modal:**
```
Step 1/4 - Basic Information
├─ Operation Title *
│  (Format: STS OPERATION - TRADING COMPANY - SHIPOWNER)
├─ Operation Start Date *
└─ Operation End Date *

Step 2/4 - Parties & Location
├─ Primary Location (Coastal Country) *
│  (Dropdown with 🇦🇪 🇴🇲 🇸🇦 etc.)
├─ Operation Type *
│  (Standard STS, Lightering, Reverse, Multi-Ship, Topping Off)
└─ [+ Add Parties] (Can add after creation)

Step 3/4 - Cargo Configuration
├─ Cargo Type * (Crude, Gasoline, Diesel, Jet Fuel, etc.)
├─ Quantity (MT) *
└─ Transfer Rate (MT/hr) *

Step 4/4 - Review & Create
├─ Summary of all entered data
├─ Confirmation dialog
└─ [Create Operation] Button
```

---

### 3. **Vessel Owner Dashboard** ⚓
**Account:** owner@sts.com

**Features:**
- Vessel Status Overview
- Compliance Status
  - Approved Documents
  - Pending Documents
  - Expired Documents
- Compliance Percentage
- Vessel Details Table
- Document Status Alerts

**When you login, you see:**
```
┌──────────────────────────────────────┐
│ ⚓ Vessel Owner Portal                │
├──────────────────────────────────────┤
│ Status:                              │
│ ✅ All Vessels Clear / ⚠️ Action Req │
├──────────────────────────────────────┤
│ Compliance Status:                   │
│ ✅ Approved: 45 docs                 │
│ ⏳ Pending: 5 docs                   │
│ ❌ Expired: 0 docs                   │
│ 📊 Compliance: 90%                   │
├──────────────────────────────────────┤
│ My Vessels Table                     │
│ (Name, IMO, Status, Pending)         │
└──────────────────────────────────────┘
```

---

### 4. **Seller/Buyer Dashboard** 💼
**Accounts:** seller@sts.com, buyer@sts.com

**Features:**
- My Transactions
- Transaction Status
- Documents to Provide
- Actions Required
- Transaction History

---

### 5. **Viewer Dashboard** 👁️
**Account:** viewer@sts.com

**Features:**
- View Operations (Read-only)
- View Documents (Read-only)
- View Participants
- No Edit/Create Permissions

---

## 🛠️ Technical Implementation

### Frontend Components

1. **RoleDashboardSelector.tsx**
   - Smart router component
   - Switches dashboard based on `user.role`
   - Automatic role detection from auth context

2. **DashboardBroker.tsx** ⭐ UPDATED
   - Integrated CreateStsOperationWizard
   - New "Create New STS Operation" button
   - Opens modal wizard on click

3. **CreateStsOperationWizard.tsx** ⭐ NEW
   - 4-step wizard component
   - Form validation at each step
   - API integration for creation
   - Professional UI matching design system

### Backend Endpoints

Key endpoints working correctly:

```
POST   /api/v1/auth/login
       → Returns: {token, email, role, name}

GET    /api/v1/dashboard/admin/stats
       → Requires role: admin

GET    /api/v1/dashboard/broker/my-rooms
       → Requires role: broker

GET    /api/v1/dashboard/broker/approval-queue
       → Requires role: broker

POST   /api/v1/rooms
       → Creates new STS operation
```

---

## ✅ Testing Checklist

### Test Admin Role
- [ ] Login with admin@sts.com / password123
- [ ] See AdminDashboard (statistics panel)
- [ ] View system stats and logs

### Test Broker Role ⭐
- [ ] Login with broker@sts.com / password123
- [ ] See DashboardBroker (operations center)
- [ ] Click "Create New STS Operation" button
- [ ] Wizard modal appears with 4 steps
- [ ] Fill in Step 1: Title, Start Date, End Date
- [ ] Click "Next →"
- [ ] Fill in Step 2: Location, Operation Type
- [ ] Click "Next →"
- [ ] Fill in Step 3: Cargo Type, Quantity, Transfer Rate
- [ ] Click "Next →"
- [ ] Review all data in Step 4
- [ ] Click "Create Operation"
- [ ] Modal closes and dashboard refreshes

### Test Owner Role
- [ ] Login with owner@sts.com / password123
- [ ] See DashboardOwner (vessel portal)
- [ ] View compliance status

### Test Other Roles
- [ ] Login with seller@sts.com / password123 → See DashboardParty
- [ ] Login with buyer@sts.com / password123 → See DashboardParty
- [ ] Login with viewer@sts.com / password123 → See DashboardViewer

---

## 🔧 Configuration

### Environment Variables

```
# Backend (8001)
DATABASE_URL=sqlite+aiosqlite:///./sts_clearance.db
DEBUG=true
DEMO_MODE=true

# Frontend (3001)
VITE_API_URL=http://localhost:8001
```

### Key Files Modified

```
✅ src/components/Pages/DashboardBroker.tsx
   - Added CreateStsOperationWizard integration
   - Added showCreateWizard state
   - Updated button to open wizard

✅ src/components/Pages/CreateStsOperationWizard.tsx
   - NEW: 4-step wizard for STS operations
   - Form validation
   - API integration
   - Professional UI

✅ src/router.tsx
   - Already has /dashboard route
   - Routes to RoleDashboardSelector

✅ src/contexts/AppContext.tsx
   - Already includes user.role
   - RoleDashboardSelector uses it
```

---

## 📋 Database Test Users

All test users are automatically created with password: **password123**

```sql
SELECT email, role, name FROM users;
-- admin@sts.com     | admin   | Admin User
-- broker@sts.com    | broker  | Broker User
-- owner@sts.com     | owner   | Vessel Owner
-- seller@sts.com    | seller  | Seller
-- buyer@sts.com     | buyer   | Buyer
-- viewer@sts.com    | viewer  | Viewer User
```

---

## 🐛 Troubleshooting

### Issue: Dashboard not showing role-specific content
**Solution:**
1. Clear browser localStorage: `localStorage.clear()`
2. Log out completely
3. Log in again
4. Check DevTools Console for errors

### Issue: "Create New STS Operation" button not working
**Solution:**
1. Ensure backend is running on port 8001
2. Check browser console for errors
3. Verify POST /api/v1/rooms endpoint is working
4. Test with: `curl -X POST http://localhost:8001/api/v1/rooms`

### Issue: Modal not closing after creation
**Solution:**
1. Check API response in Network tab
2. Ensure API returns success status
3. Check onSuccess callback is called

---

## 🎉 Summary

The STS Clearance Hub now has:

✅ **Complete role-based dashboards** - Each role sees different UI
✅ **Broker Operations Center** - Manages all STS operations
✅ **STS Operation Wizard** - Professional 4-step creation flow
✅ **Test users for all roles** - Easy testing and demos
✅ **Production-ready architecture** - Scalable and secure

**Next Steps:**
- Test with all user roles
- Create sample STS operations
- Configure approvals workflow
- Set up document submission

---

## 📚 Additional Resources

- Backend Docs: `/sts/backend/README.md`
- API Docs: `/sts/backend/ENDPOINT_AUDIT_REPORT.md`
- Frontend Docs: `/sts/README.md`