#!/usr/bin/env python3
import re

# Read the original file
with open('cockpit.py', 'r') as f:
    content = f.read()

# Replace the upload function parameter
content = re.sub(
    r'user_email: str = "demo@example.com",  # TODO: Get from auth',
    'current_user: dict = Depends(get_current_user),',
    content
)

# Add user_email assignment inside the upload function
content = re.sub(
    r'(@router\.post\("/rooms/\{room_id\}/documents/upload"\)\s*async def upload_document\(\s*room_id: str,\s*file: UploadFile = File\(\.\.\.\),\s*document_type: str = Form\(\.\.\.\),\s*notes: Optional\[str\] = Form\(None\),\s*expires_on: Optional\[str\] = Form\(None\),\s*current_user: dict = Depends\(get_current_user\),\s*session: AsyncSession = Depends\(get_async_session\),\s*_.*bool = Depends\(cockpit_enabled\),\s*\):\s*"""\s*Upload a new document to a room\s*"""\s*try:\s*)',
    r'\1        user_email = current_user.email\n',
    content,
    flags=re.MULTILINE | re.DOTALL
)

# Write the modified content to a new file
with open('cockpit_fixed_final.py', 'w') as f:
    f.write(content)

print("Fixed cockpit.py created as cockpit_fixed_final.py")
