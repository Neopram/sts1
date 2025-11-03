# Start backend in background
Set-Location "c:\Users\feder\Desktop\StsHub\sts\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload