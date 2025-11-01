# 🌐 Configuración LAN - Backend

## Variables de Entorno Necesarias

Crea un archivo `.env` en `sts/backend/` con:

```bash
# Configuración CORS para LAN
CORS_ORIGINS=http://192.168.1.100:3001,http://192.168.1.101:3001,http://localhost:3001

# Host para escuchar en todas las interfaces
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8001
```

Reemplaza `192.168.1.100` y `192.168.1.101` con las IPs reales de tus clientes frontend.

## Iniciar Servidor en LAN

```bash
cd sts/backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

El servidor estará accesible desde otros dispositivos en: `http://<tu-ip>:8001`

