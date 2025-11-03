# 🔐 RBAC Implementation Guide - STS Hub

**Sistema de Control de Acceso Basado en Roles (Role-Based Access Control) DEFINITIVO**

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Roles y Permisos](#roles-y-permisos)
4. [Componentes Principales](#componentes-principales)
5. [Cómo Usar](#cómo-usar)
6. [Ejemplos Prácticos](#ejemplos-prácticos)
7. [Extender el Sistema](#extender-el-sistema)
8. [Solución: sts-session-creation.html → /create-operation](#solución-sts-session-creationhtml)

---

## 🎯 Visión General

Este sistema RBAC proporciona:

✅ **Control centralizado de permisos** - Una sola fuente de la verdad  
✅ **Protección de rutas** - Acceso automático basado en rol  
✅ **UI condicional** - Mostrar/ocultar elementos según permisos  
✅ **Extensible** - Fácil de añadir nuevos roles y permisos  
✅ **Auditable** - Logs en desarrollo para debugging  
✅ **Multi-tenant ready** - Preparado para operaciones complejas  

### Principios Fundamentales

1. **Mínimo Privilegio**: Todo denegado por defecto
2. **Fuente Única de la Verdad**: PolicyContext es la autoridad
3. **Frontend + Backend**: El frontend filtra UI, backend valida requests
4. **Auditoría**: Cada negación de permiso genera logs

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────┐
│          PolicyContext (RBAC Engine)        │
│  - Matriz de permisos centralizad           │
│  - Matriz de acceso a rutas                 │
│  - Lógica de autorización                   │
└─────────────┬───────────────────────────────┘
              │
              ├─→ usePolicy() Hook
              │   └─ can(), canAccessRoute(), etc.
              │
              ├─→ RouteGuard Component
              │   └─ Protege rutas con /create-operation
              │
              ├─→ RoleGuard Component
              │   └─ Control de visibilidad en UI
              │
              └─→ CreateOperationButton
                  └─ Botón inteligente con permisos

Flujo:
  App.tsx
    → PolicyProvider (envuelve todo)
      → AppProvider (autenticación)
        → LanguageProvider, etc.
          → Router (usa RouteGuard)
```

---

## 👥 Roles y Permisos

### Matriz de Roles

| Rol | Crear Ops | Ver Docs | Subir Docs | Aprobar | Mensajes | Privados | Analytics | Admin |
|-----|:---------:|:--------:|:----------:|:-------:|:--------:|:--------:|:----------:|:-----:|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Broker** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Charterer** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Viewer** | ❌ | ✅* | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **Seller** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Buyer** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

*Viewer solo lectura

### Acceso a Rutas

```
Admin:      ALL ROUTES
Broker:     /overview, /documents, /missing, /approval, /chat, /create-operation, etc.
Charterer:  /overview, /documents, /missing, /approval, /chat, /create-operation, etc.
Owner:      /overview, /documents, /missing, /approval, /chat, /create-operation, etc.
Viewer:     /overview (R), /documents (R), /activity, /messages, /chat
```

---

## 🧩 Componentes Principales

### 1. **PolicyContext** (`src/contexts/PolicyContext.tsx`)

La fuente central de autorización.

```typescript
interface PolicyContextType {
  // Verificar permiso de acción
  can: (action: ResourceAction) => boolean;
  
  // Verificar acceso a ruta
  canAccessRoute: (route: string) => boolean;
  
  // Helpers específicos
  isAdmin: () => boolean;
  canCreateOperation: () => boolean;
  canViewAllOperations: () => boolean;
  canManageUsers: () => boolean;
  canViewAnalytics: () => boolean;
  
  // Obtener información
  getCurrentRole: () => UserRole | null;
  getPermissions: () => ResourceAction[];
}
```

### 2. **RouteGuard** (`src/components/RouteGuard.tsx`)

Protege rutas en el router.

```typescript
<RouteGuard fallbackRoute="/overview">
  <SessionCreationPage />
</RouteGuard>
```

### 3. **RoleGuard** (`src/components/RoleGuard.tsx`)

Controla visibilidad de UI.

```typescript
<RoleGuard can="create_operation">
  <button>Create Operation</button>
</RoleGuard>

<RoleGuard adminOnly>
  <AdminPanel />
</RoleGuard>

<RoleGuard roles={['broker', 'admin']}>
  <BrokerFeature />
</RoleGuard>
```

### 4. **CreateOperationButton** (`src/components/Buttons/CreateOperationButton.tsx`)

Botón reutilizable.

```typescript
<CreateOperationButton 
  variant="primary"
  label="New STS Operation"
/>
```

---

## 📚 Cómo Usar

### Paso 1: Usar PolicyProvider (✅ Ya hecho en main.tsx)

```typescript
<AppProvider>
  <PolicyProvider>
    {/* Tu app aquí */}
  </PolicyProvider>
</AppProvider>
```

### Paso 2: Proteger Rutas

En `router.tsx`:

```typescript
{
  path: 'create-operation',
  element: <RouteGuard><SessionCreationPage /></RouteGuard>
}
```

### Paso 3: Usar el Hook usePolicy()

```typescript
import { usePolicy } from '../contexts/PolicyContext';

function MyComponent() {
  const { can, canCreateOperation, isAdmin } = usePolicy();
  
  return (
    <>
      {canCreateOperation() && <button>Create Op</button>}
      {can('approve_document') && <button>Approve</button>}
      {isAdmin() && <AdminPanel />}
    </>
  );
}
```

### Paso 4: Usar RoleGuard en UI

```typescript
<RoleGuard can="create_operation">
  <CreateOperationButton />
</RoleGuard>

<RoleGuard adminOnly fallback={<div>No access</div>}>
  <AdminDashboard />
</RoleGuard>
```

---

## 💡 Ejemplos Prácticos

### Ejemplo 1: Proteger un botón

```typescript
import { RoleGuard } from '../components/RoleGuard';

function DocumentsPage() {
  return (
    <div>
      <h1>Documents</h1>
      
      {/* Solo brokers pueden crear templates */}
      <RoleGuard roles={['broker', 'admin']}>
        <button>Create Template</button>
      </RoleGuard>
      
      {/* Todos excepto viewers pueden subir */}
      <RoleGuard canAny={['upload_document']}>
        <button>Upload Document</button>
      </RoleGuard>
    </div>
  );
}
```

### Ejemplo 2: Mostrar panel diferente por rol

```typescript
function OverviewPage() {
  const { getCurrentRole } = usePolicy();
  const role = getCurrentRole();
  
  return (
    <>
      <RoleGuard roles={['admin']}>
        <AdminOverview />
      </RoleGuard>
      
      <RoleGuard roles={['broker']}>
        <BrokerOverview />
      </RoleGuard>
      
      <RoleGuard roles={['owner', 'charterer']}>
        <PartyOverview />
      </RoleGuard>
      
      <RoleGuard roles={['viewer']}>
        <ViewerOverview />
      </RoleGuard>
    </>
  );
}
```

### Ejemplo 3: Ruta protegida

```typescript
// En router.tsx
{
  path: 'admin-dashboard',
  element: <RouteGuard><AdminDashboard /></RouteGuard>
}
```

El usuario `viewer` intenta acceder → automáticamente redirigido a `/overview`

### Ejemplo 4: Usar usePolicy() en componente

```typescript
function MessagePanel() {
  const { can } = usePolicy();
  
  return (
    <div>
      <MessageList />
      
      {can('send_private_message') && (
        <button>Send Private Message</button>
      )}
      
      {can('send_message') && (
        <button>Send Public Message</button>
      )}
    </div>
  );
}
```

---

## 🔧 Extender el Sistema

### Añadir un nuevo permiso

1. **Actualizar tipo `ResourceAction` en `PolicyContext.tsx`**:

```typescript
export type ResourceAction = 
  // ... permisos existentes
  | 'new_permission'  // ← NUEVO
```

2. **Actualizar `ROLE_PERMISSIONS`**:

```typescript
const ROLE_PERMISSIONS: Record<UserRole, Set<ResourceAction>> = {
  admin: new Set([
    // ... permisos existentes
    'new_permission'  // ← NUEVO
  ]),
  broker: new Set([
    'new_permission'  // ← Si aplica
  ]),
  // ...
};
```

3. **Usar en la app**:

```typescript
if (policy.can('new_permission')) {
  // Permitir acción
}
```

### Añadir un nuevo rol

1. **Actualizar tipo `UserRole` en `PolicyContext.tsx`**:

```typescript
export type UserRole = 
  // ... roles existentes
  | 'new_role'  // ← NUEVO
```

2. **Actualizar `ROLE_PERMISSIONS`**:

```typescript
const ROLE_PERMISSIONS: Record<UserRole, Set<ResourceAction>> = {
  // ... roles existentes
  new_role: new Set([
    'view_operation',
    'send_message',
    // ... permisos específicos
  ]),
};
```

3. **Actualizar `ROLE_ROUTE_ACCESS`**:

```typescript
const ROLE_ROUTE_ACCESS: Record<UserRole, string[]> = {
  // ... roles existentes
  new_role: [
    '/', '/overview', '/messages',
    // ... rutas permitidas
  ],
};
```

### Debugging: Ver permisos del usuario

```typescript
function DebugPanel() {
  const { getPermissions, getCurrentRole } = usePolicy();
  
  return (
    <div>
      <h3>Current Role: {getCurrentRole()}</h3>
      <p>Permissions:</p>
      <ul>
        {getPermissions().map(perm => (
          <li key={perm}>{perm}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🎯 Solución: sts-session-creation.html → /create-operation

### Problema Original

- `sts-session-creation.html` era un archivo HTML estático
- No había integración con el sistema de autenticación
- No había validación de roles
- Los usuarios no podían acceder a él desde la app autenticada

### Solución Implementada

✅ **Nueva ruta `/create-operation`** → Componente React integrado  
✅ **Protección con RouteGuard** → Solo roles permitidos  
✅ **Validación de permisos** → Genera errores si no tiene acceso  
✅ **Formulario mejorado** → Validación + feedback  
✅ **Experiencia UX** → Mensajes claros de error  

### Cómo Acceder

1. **Usuario con permiso (Admin, Broker, Charterer, Owner)**:
   - Click en botón "Create Operation" → `/create-operation`
   - O navega directamente a `/create-operation`

2. **Usuario sin permiso (Viewer, Seller, Buyer)**:
   - RouteGuard detecta falta de permiso
   - Automáticamente redirige a `/overview`
   - Muestra mensaje de acceso denegado

### Integración: Colocar botón en UI

```typescript
// En Header, Dashboard, o donde sea
import { CreateOperationButton } from '../Buttons/CreateOperationButton';

export function MyComponent() {
  return (
    <div>
      <h1>STS Operations</h1>
      <CreateOperationButton />  {/* ← Solo aparece si tiene permiso */}
    </div>
  );
}
```

---

## 📊 Diagrama de Flujo

```
Usuario accede a /create-operation
          ↓
    ProtectedRoute valida autenticación
          ↓
    RouteGuard valida permisos (usePolicy)
          ↓
    ¿Tiene "create_operation"?
          ↓
    SÍ → Renderiza SessionCreationPage
          ↓
    Form valida datos
          ↓
    Submit → Backend valida nuevamente
          ↓
    Operación creada ✅
    
---

    NO → Redirige a /overview con error
          ↓
    Usuario ve: "You don't have permission"
```

---

## 🔒 Validación Backend (CRÍTICO)

**⚠️ El frontend filtra UI, pero BACKEND siempre debe validar**

En tu API (`backend/app/routers/...`):

```python
from fastapi import Depends, HTTPException
from app.models import User
from app.utils.auth import get_current_user

@router.post("/operations")
async def create_operation(
    data: OperationCreate,
    current_user: User = Depends(get_current_user)
):
    # 1. Validar que el usuario tiene permiso
    ALLOWED_ROLES = {'admin', 'broker', 'charterer', 'owner'}
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # 2. Validar datos
    if not data.vessel_name:
        raise HTTPException(status_code=400, detail="Vessel name required")
    
    # 3. Crear operación
    operation = Operation(
        vessel_name=data.vessel_name,
        created_by_user_id=current_user.id,
        # ...
    )
    db.add(operation)
    db.commit()
    
    return operation
```

---

## ✅ Checklist: Lo que se ha implementado

- [x] **PolicyContext** - Sistema RBAC centralizado
- [x] **Matriz de permisos** - 7 roles × 14 acciones
- [x] **Matriz de rutas** - Control de acceso a vistas
- [x] **RouteGuard** - Protección automática de rutas
- [x] **RoleGuard** - Control de visibilidad en UI
- [x] **usePolicy() hook** - API para componentes
- [x] **SessionCreationPage** - Nueva página integrada
- [x] **CreateOperationButton** - Botón reutilizable
- [x] **PolicyProvider** - Envuelve la app
- [x] **Documentación completa** - Este archivo

---

## 🚀 Próximos Pasos

1. **Integrar backend validation** - Asegurarse que el servidor también valide
2. **Extender operaciones** - Implementar lógica de creación de operaciones
3. **Auditoría** - Loguear quién crea qué operación
4. **Templates por rol** - Templates específicos según rol
5. **Multi-tenant** - Validar `tenant_id` en permisos

---

## 📝 Notas Importantes

### Lo que NO cambia
- ✅ `AppContext` mantiene compatibilidad total
- ✅ Todas las rutas existentes funcionan igual
- ✅ No se desactiva nada
- ✅ Sistema es aditivo (solo agrega permisos)

### Lo que SÍ cambia
- ✅ `/create-operation` es nueva ruta
- ✅ Nuevo `PolicyProvider` envuelve la app
- ✅ `sts-session-creation.html` ya no se usa (reemplazado por SessionCreationPage)

### Performance
- PolicyContext es optimizado con `useMemo`
- No hay re-renders innecesarios
- Permisos se calculan una sola vez al autenticar

---

## 💬 Contacto & Support

Si encuentras problemas:

1. **Verificar logs de desarrollo** - usePolicy() logs en console
2. **Debuggear con DebugPanel** - Ver permisos actuales
3. **Validar backend** - Asegurarse que el servidor también valida
4. **Revisar PolicyContext** - Punto central de lógica

---

**Sistema RBAC Definitivo Implementado ✅**