# 🔧 PHASE 1 - INTEGRATION CHECKLIST

## ✅ Cambios Requeridos en main.py

### 1. IMPORTAR NUEVOS MÓDULOS (Línea después de imports)

```python
# Add after existing imports
from app.config.settings import settings
from app.middleware.permission_enforcer import PermissionEnforcerMiddleware
```

### 2. USAR SETTINGS CENTRALIZADO (Reemplazar configuración hard-coded)

**ANTES:**
```python
cors_origins_str = os.getenv(
    "CORS_ORIGINS", '["http://localhost:3000", ...]'
)
try:
    cors_origins = json.loads(cors_origins_str)
except:
    cors_origins = ["http://localhost:3000", ...]
```

**DESPUÉS:**
```python
# Usar settings centralizado (más limpio y validado)
cors_origins = settings.cors_origins
```

### 3. AGREGAR PERMISSION ENFORCER MIDDLEWARE

**UBICAR:** Después del CORS middleware, agregar:

```python
# Add Permission Enforcer Middleware
app.add_middleware(PermissionEnforcerMiddleware)
```

**ORDEN CORRECTO DE MIDDLEWARE (de abajo a arriba):**
```
1. PermissionEnforcerMiddleware (más cercano a la aplicación)
2. AuthMiddleware
3. RateLimitMiddleware
4. CORSMiddleware (más cercano al cliente)
```

### 4. USAR SETTINGS PARA VALORES HARD-CODED

**Reemplazar todas estas líneas:**
```python
# OLD - Todas estas líneas
server_port = 8000  # → settings.server_port
db_url = "sqlite://..."  # → settings.database_url
redis_url = "redis://..."  # → settings.redis_url
```

---

## 📋 ENDPOINTS AUDIT CHECKLIST

Para cada router, verificar que TODO endpoint tenga:

### ✓ auth.py
- [ ] Login endpoint: público (sin auth requerida)
- [ ] Logout endpoint: auth requerida
- [ ] Refresh endpoint: público
- [ ] Register (si existe): público

### ✓ users.py
- [ ] GET /users/{id}: auth requerida, permission: "user.view"
- [ ] GET /users: auth requerida, permission: "user.list"
- [ ] PUT /users/{id}: auth requerida, permission: "user.edit"
- [ ] DELETE /users/{id}: auth requerida, permission: "user.delete"

### ✓ rooms.py
- [ ] GET /rooms: auth requerida, permission: "room.list"
- [ ] POST /rooms: auth requerida, permission: "room.create"
- [ ] GET /rooms/{id}: auth requerida, permission: "room.view"
- [ ] PUT /rooms/{id}: auth requerida, permission: "room.edit"
- [ ] DELETE /rooms/{id}: auth requerida, permission: "room.delete"

### ✓ documents.py
- [ ] GET /documents: auth requerida, permission: "document.list"
- [ ] POST /documents: auth requerida, permission: "document.create"
- [ ] GET /documents/{id}: auth requerida, permission: "document.view"
- [ ] DELETE /documents/{id}: auth requerida, permission: "document.delete"

### ✓ cockpit.py
- [ ] ALL endpoints: auth requerida, permission: "room.access"

---

## 🔒 SECURITY HARDENING CHECKLIST

### JWT Security
- [ ] Implementar refresh tokens
- [ ] Implementar token blacklisting
- [ ] Agregar JTI (JWT ID) a tokens
- [ ] Logout endpoint actualizado

### Input Validation
- [ ] Todas las Pydantic schemas tienen validators
- [ ] String fields tienen max_length
- [ ] Date fields validan dates futuras
- [ ] File uploads validan size + extension

### Rate Limiting
- [ ] RateLimitMiddleware enabled en production
- [ ] Login endpoint: rate limited (5 requests/min)
- [ ] Upload endpoint: rate limited (10 requests/min)
- [ ] General: rate limited (60 requests/min)

### CORS
- [ ] Origins from settings (no hard-coded)
- [ ] Methods: GET, POST, PUT, PATCH, DELETE only
- [ ] Headers: no "*" (explicit list)

---

## 📊 DESPUÉS DE CAMBIOS - VALIDACIÓN

```bash
# 1. Verificar que el app inicia sin errores
python -m uvicorn app.main:app --reload

# 2. Verificar que settings se cargan
# Debería ver en logs:
# "✓ Settings loaded - Environment: development, ..."

# 3. Verificar que middleware está activo
# Visitar: http://localhost:8000/docs
# Debería funcionar (sin auth requerida)

# 4. Verificar que endpoints sin auth fallan
# GET http://localhost:8000/users
# Debería retornar 401 Unauthorized
```

---

## ✅ ENTREGABLES TRAS INTEGRACIÓN

- ✓ Settings centralizado y validado
- ✓ Permission enforcement en middleware
- ✓ Todos los endpoints auditados
- ✓ JWT security mejorada
- ✓ Input validation hardened
- ✓ Rate limiting enforced

**Resultado: +15% en puntuación (48% → 63%)**
