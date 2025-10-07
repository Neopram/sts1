#!/usr/bin/env python3
"""
Add a debug endpoint to see exactly what the frontend is sending
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import uvicorn

# Create a simple debug server
debug_app = FastAPI(title="Debug Server")

# Add CORS
debug_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@debug_app.api_route("/api/v1/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
async def debug_all_requests(request: Request, path: str):
    """Capture and log all requests from frontend"""
    
    # Get request details
    method = request.method
    url = str(request.url)
    headers = dict(request.headers)
    
    # Get body if present
    body = None
    try:
        if method in ["POST", "PUT", "PATCH"]:
            body_bytes = await request.body()
            if body_bytes:
                body = body_bytes.decode('utf-8')
                try:
                    body = json.loads(body)
                except:
                    pass  # Keep as string if not JSON
    except:
        body = "Could not read body"
    
    # Log the request
    print("=" * 80)
    print(f"🔍 FRONTEND REQUEST CAPTURED")
    print(f"Method: {method}")
    print(f"Path: /{path}")
    print(f"URL: {url}")
    print(f"Headers:")
    for key, value in headers.items():
        print(f"  {key}: {value}")
    
    if body:
        print(f"Body: {body}")
    
    print("=" * 80)
    
    # Return appropriate response based on endpoint
    if path == "auth/login":
        if method == "OPTIONS":
            return {"message": "CORS preflight OK"}
        elif method == "POST":
            # Check what credentials were sent
            if isinstance(body, dict):
                email = body.get('email', 'NOT_PROVIDED')
                password = body.get('password', 'NOT_PROVIDED')
                print(f"🔑 LOGIN ATTEMPT:")
                print(f"  Email: {email}")
                print(f"  Password: {'*' * len(str(password)) if password != 'NOT_PROVIDED' else 'NOT_PROVIDED'}")
                
                # Return success for known good credentials
                if email in ["admin@sts.com", "owner@sts.com", "test@sts.com"] and password == "admin123":
                    return {
                        "token": "debug_token_12345",
                        "user": {"email": email, "name": "Debug User", "role": "admin"}
                    }
                else:
                    return {"detail": f"Invalid credentials. Got email='{email}', password='{password}'"}, 401
            else:
                return {"detail": f"Invalid request format. Expected JSON object, got: {type(body)}"}, 400
    
    elif path == "rooms":
        if method == "OPTIONS":
            return {"message": "CORS preflight OK"}
        elif method == "GET":
            auth_header = headers.get('authorization', 'NOT_PROVIDED')
            print(f"🏢 ROOMS REQUEST:")
            print(f"  Authorization: {auth_header}")
            
            if auth_header and auth_header.startswith('Bearer '):
                return [
                    {
                        "id": "debug-room-1",
                        "title": "Debug Room",
                        "location": "Debug Location",
                        "sts_eta": "2024-01-15T14:30:00Z"
                    }
                ]
            else:
                return {"detail": "Authentication required"}, 401
    
    # Default response
    return {"message": f"Debug endpoint - captured {method} request to /{path}"}

if __name__ == "__main__":
    print("🚀 Starting Debug Server...")
    print("This will capture and log all requests from the frontend")
    print("Point your frontend to this server temporarily to debug")
    print("Server will run on http://localhost:8000")
    print("Press Ctrl+C to stop")
    print("=" * 80)
    
    uvicorn.run(debug_app, host="0.0.0.0", port=8000)