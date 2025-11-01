# 🌐 LAN Testing Setup Guide

Esta guía te ayudará a configurar el sistema STS Clearance Hub para testing en red local (LAN).

## 📋 Requisitos Previos

1. Servidor backend ejecutándose en un host de la red local
2. Cliente frontend en otro dispositivo de la red
3. Conocer la IP del servidor backend
4. Firewall configurado para permitir conexiones en los puertos necesarios

## 🔧 Configuración Backend

### 1. Configurar CORS Origins

Edita el archivo `.env` en `sts/backend/.env`:

```bash
# Agregar IPs de los clientes frontend
CORS_ORIGINS=http://192.168.1.100:3001,http://192.168.1.101:3001,http://localhost:3001,http://127.0.0.1:3001

# Configurar host para escuchar en todas las interfaces
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8001
```

**Formato de CORS_ORIGINS:**
- Comma-separated: `http://192.168.1.100:3001,http://192.168.1.101:3001`
- JSON array: `["http://192.168.1.100:3001","http://192.168.1.101:3001"]`

### 2. Obtener IP del Servidor

**En Windows:**
```powershell
ipconfig
# Busca "IPv4 Address" bajo tu adaptador de red
```

**En Linux/Mac:**
```bash
ip addr show  # Linux
ifconfig      # Mac/Linux alternativo
```

### 3. Verificar Firewall

**Windows:**
- Abrir puerto 8001 en Windows Firewall
- Permitir conexiones entrantes en el puerto 8001

**Linux:**
```bash
sudo ufw allow 8001/tcp
# o
sudo firewall-cmd --add-port=8001/tcp --permanent
sudo firewall-cmd --reload
```

### 4. Iniciar Backend

```bash
cd sts/backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

El backend ahora escucha en todas las interfaces y es accesible desde otros dispositivos en la red.

## 💻 Configuración Frontend

### 1. Configurar Variable de Entorno

Crea o edita el archivo `.env` en `sts/.env`:

```bash
# URL del backend (usar IP del servidor)
VITE_API_URL=http://192.168.1.50:8001

# Ejemplo para desarrollo local:
# VITE_API_URL=http://localhost:8001
```

### 2. Actualizar Vite Config (Opcional)

Si necesitas configuración avanzada, edita `sts/vite.config.ts`:

```typescript
server: {
  host: '0.0.0.0',  // Escuchar en todas las interfaces
  port: 3001,
  proxy: {
    '/api': {
      target: process.env.VITE_API_URL || 'http://localhost:8001',
      // ... resto de configuración
    }
  }
}
```

### 3. Iniciar Frontend

```bash
cd sts
npm run dev
```

El frontend estará disponible en `http://<tu-ip>:3001`

## 🧪 Verificación

### 1. Verificar Backend

Desde cualquier dispositivo en la red:
```bash
curl http://<backend-ip>:8001/health
```

Deberías recibir: `{"status": "healthy"}`

### 2. Verificar Frontend

Abre en un navegador desde otro dispositivo:
```
http://<frontend-ip>:3001
```

### 3. Verificar CORS

Abre la consola del navegador (F12) y verifica que no hay errores de CORS.

## 📝 Troubleshooting

### Error: CORS Policy

**Síntoma:** `Access to fetch at 'http://...' from origin '...' has been blocked by CORS policy`

**Solución:**
1. Verifica que la IP del frontend esté en `CORS_ORIGINS` del backend
2. Reinicia el servidor backend después de cambiar `.env`
3. Verifica que no hay espacios extra en `CORS_ORIGINS`

### Error: Connection Refused

**Síntoma:** `Failed to fetch` o `Connection refused`

**Solución:**
1. Verifica que el firewall permite conexiones en el puerto 8001
2. Verifica que el backend está escuchando en `0.0.0.0`, no solo `localhost`
3. Verifica que las IPs son correctas
4. Prueba con `curl` o `ping` desde otro dispositivo

### Error: Invalid Host Header

**Síntoma:** Vite dev server rechaza conexiones

**Solución:**
En `vite.config.ts`, agrega:
```typescript
server: {
  host: '0.0.0.0',
  hmr: {
    host: '0.0.0.0'
  }
}
```

## 🔒 Seguridad

⚠️ **Importante para Producción:**

1. **No uses `0.0.0.0` en producción** - limita a IPs específicas
2. **Restringe CORS origins** - solo agrega IPs confiables
3. **Usa HTTPS** - configura certificados SSL para producción
4. **Firewall rules** - restringe acceso por IP cuando sea posible

## 📚 Ejemplos de Configuración

### Configuración Mínima (Desarrollo)
```bash
# Backend .env
CORS_ORIGINS=http://192.168.1.100:3001
BACKEND_HOST=0.0.0.0

# Frontend .env
VITE_API_URL=http://192.168.1.50:8001
```

### Configuración Múltiples Clientes
```bash
# Backend .env
CORS_ORIGINS=http://192.168.1.100:3001,http://192.168.1.101:3001,http://192.168.1.102:3001
BACKEND_HOST=0.0.0.0
```

### Configuración Producción LAN
```bash
# Backend .env
ENVIRONMENT=production
CORS_ORIGINS=http://192.168.1.10:3001,http://192.168.1.11:3001
BACKEND_HOST=192.168.1.50  # IP específica del servidor
```

## 📞 Soporte

Si encuentras problemas:
1. Verifica logs del backend: `tail -f logs/app.log`
2. Verifica consola del navegador para errores
3. Prueba conectividad con `curl` o `ping`
4. Revisa configuración de firewall

---

**Última actualización:** 2025-11-01

