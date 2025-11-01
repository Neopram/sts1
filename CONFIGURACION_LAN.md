# 🌐 Configuración LAN - Frontend

## Variables de Entorno Necesarias

Crea un archivo `.env` en `sts/` con:

```bash
# URL del backend (usar IP del servidor)
VITE_API_URL=http://192.168.1.50:8001
```

Reemplaza `192.168.1.50` con la IP real de tu servidor backend.

## Iniciar Frontend en LAN

```bash
cd sts
npm run dev
```

El frontend estará accesible desde otros dispositivos en: `http://<tu-ip>:3001`

