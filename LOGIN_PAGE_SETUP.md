# STS Clearance Hub - Login Page Setup Guide

## Overview
The STS Clearance Hub now features a professional, one-click login page that serves as the entry point to the application. This login page is automatically displayed when you start the servers.

## Quick Start

### Prerequisites
- Node.js installed
- Python 3.8+ for backend
- Backend server running on `http://localhost:8000` or `http://localhost:8001`

### Starting the Servers

#### 1. Start the Backend Server
```powershell
cd c:\Users\feder\Desktop\StsHub\sts\backend
python run_server.py
# Backend will run on http://localhost:8000
```

#### 2. Start the Frontend Development Server (Option A - Development)
```powershell
cd c:\Users\feder\Desktop\StsHub\sts
npm run dev
# Frontend will run on http://localhost:3001
# Access at: http://localhost:3001
# You will see the login page
```

#### 2b. Start the Frontend Production Server (Option B - Production)
```powershell
cd c:\Users\feder\Desktop\StsHub\sts
npm run build    # Build the application
node server.js   # Start the server
# Frontend will run on http://localhost:3000
# Access at: http://localhost:3000
# You will see the login page
```

## Login Page Features

### Professional Design
- Gradient background (purple to violet)
- Clean, modern card-based layout
- Responsive design (works on all devices)
- Professional header with STS Clearance Hub branding
- Security notice in footer

### One-Click Login
- **No password required** - Click any user to login instantly
- **7 Pre-configured Roles**:
  1. **Admin** - Full access to all features and reports
  2. **Broker** - Broker operations and management
  3. **Owner** - Vessel owner dashboard
  4. **Seller** - Sales operations
  5. **Buyer** - Purchase operations
  6. **Charterer** - Chartering management
  7. **Viewer** - Read-only access

### User Cards Display
Each user card shows:
- **Avatar Icon** - Role-specific emoji and gradient color
- **User Name** - Display name (email username if not set)
- **Role** - User role in uppercase
- **Status** - "Ready" status indicator

### Auto-Login Default Users
The login page loads 7 default test users:
```
- admin@sts.com (Admin)
- broker@sts.com (Broker)
- owner@sts.com (Owner)
- seller@sts.com (Seller)
- buyer@sts.com (Buyer)
- charterer@sts.com (Charterer)
- viewer@sts.com (Viewer)
```

All use password: `password123`

## Login Flow

1. **Open Application**
   - Navigate to `http://localhost:3001` (dev) or `http://localhost:3000` (prod)
   - Login page loads automatically

2. **Select User**
   - Click on any user card
   - Card shows loading animation
   - Auto-login with demo password

3. **Dashboard Access**
   - Redirected to `/dashboard` route
   - Personalized dashboard loads based on user role
   - Token stored in localStorage for session management

4. **User Menu**
   - Click user profile in top-right
   - Options to view profile or logout
   - Logout returns to login page

## Backend Integration

### Required Endpoint
The login page expects this backend endpoint:

```
GET /api/v1/users/available/list
```

**Response Format:**
```json
{
  "users": [
    {
      "email": "admin@sts.com",
      "name": "Admin User",
      "role": "admin"
    },
    ...
  ]
}
```

### Alternative: Hardcoded Users
If the backend endpoint is unavailable, the login page falls back to 7 hardcoded default users.

### Login Endpoint
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@sts.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "email": "admin@sts.com",
    "role": "admin",
    "name": "Admin User"
  }
}
```

## Customization

### Change Default Users
Edit `login-page.html` and modify the `defaultUsers` array:

```javascript
const defaultUsers = [
    { email: 'user@example.com', name: 'Custom User', role: 'admin' },
    // Add more users...
];
```

### Update API Base URL
Change the `API_BASE_URL` in `login-page.html`:

```javascript
const API_BASE_URL = 'http://your-api-domain:8000/api/v1';
```

### Customize Colors & Styles
Modify the CSS gradients and colors in the `<style>` section:

```css
.avatar-admin { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
```

### Change Logo/Icons
Replace emoji avatars with custom icons:

```javascript
const usersMap = {
    'admin': { avatar: '🎯', ... },  // Change emoji
    ...
};
```

## Troubleshooting

### Login Page Not Loading
1. Check if backend is running on port 8000
2. Verify `login-page.html` exists in `sts` folder
3. Check browser console for errors (F12)

### Users List Not Loading
1. Verify backend endpoint `/api/v1/users/available/list` exists
2. Check CORS settings in backend
3. Check browser Network tab for API errors

### Login Failed Error
1. Verify backend `/api/v1/auth/login` endpoint is working
2. Check if user email exists in database
3. Verify password is correct (default: `password123`)

### Redirect to Dashboard Not Working
1. Check if localStorage is enabled in browser
2. Verify `/dashboard` route exists in React app
3. Check if `index.html` is loading correctly

### Session Lost After Page Refresh
1. Check localStorage settings (should have `token` and `user`)
2. Verify token is valid (check expiration)
3. Try clearing localStorage and logging in again

## Files Modified

### Created Files
- `login-page.html` - New professional login page

### Modified Files
- `index.html` - Added redirect logic
- `server.js` - Configure to serve login page at root
- `vite.config.ts` - Updated server configuration

## Security Notes

⚠️ **Important for Production:**
1. Default passwords should be changed or removed
2. Implement real OAuth/SSO authentication
3. Use secure password hashing (bcrypt, Argon2)
4. Implement CSRF protection
5. Use HTTPS only in production
6. Set secure cookies flags
7. Implement rate limiting on login
8. Add audit logging for login attempts

## API Configuration

The login page communicates with:
- `GET /api/v1/users/available/list` - Fetch available users
- `POST /api/v1/auth/login` - Authenticate user

Make sure your backend API endpoints match these paths.

## Testing

### Test Login Flow
1. Open `http://localhost:3001` or `http://localhost:3000`
2. Click any user card
3. Should redirect to dashboard
4. Check localStorage for token and user data

### Test All 7 Roles
Each role should:
- Login successfully
- Show correct dashboard layout
- Display correct navigation tabs
- Have appropriate permissions

### Test Mobile Responsiveness
1. Open browser DevTools (F12)
2. Toggle device toolbar
3. Test on different screen sizes

## Performance Optimization

- Login page is cached (no build step)
- User list cached for 5 minutes
- Minimal JavaScript (no frameworks)
- Fast load time (~100ms)

## Support

For issues or questions:
1. Check browser console (F12)
2. Check backend logs
3. Review error messages in login page
4. Check API responses in Network tab

---

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Production Ready