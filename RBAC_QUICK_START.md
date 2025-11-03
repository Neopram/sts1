# 🚀 RBAC Quick Start Guide

**Guía rápida para empezar con el sistema RBAC implementado**

---

## 📦 Archivos Nuevos Creados

```
src/contexts/
  └─ PolicyContext.tsx          # 🔐 Motor RBAC centralizado

src/components/
  ├─ RouteGuard.tsx             # 🛡️ Protección de rutas
  ├─ RoleGuard.tsx              # 🛡️ Control de visibilidad UI
  ├─ Pages/
  │   ├─ SessionCreationPage.tsx # 📝 Nueva página integrada
  │   └─ SessionCreationPage.css # 🎨 Estilos
  ├─ Buttons/
  │   └─ CreateOperationButton.tsx # ➕ Botón inteligente
  └─ Debug/
      ├─ RBACDebugPanel.tsx      # 🐛 Panel de debugging
      └─ RBACDebugPanel.css      # 🎨 Estilos

sts/
  ├─ RBAC_IMPLEMENTATION_GUIDE.md # 📚 Guía completa
  └─ RBAC_QUICK_START.md          # 🚀 Este archivo
```

---

## 🎯 Cambios en Archivos Existentes

### 1. `src/main.tsx`
- ✅ Importado `PolicyProvider`
- ✅ Envuelto bajo `AppProvider`

### 2. `src/router.tsx`
- ✅ Importado `RouteGuard` y `SessionCreationPage`
- ✅ Añadida ruta `/create-operation` protegida

---

## 💡 3 Formas de Usar el Sistema

### Opción 1: Hook usePolicy() (Más control)

```typescript
import { usePolicy } from '../contexts/PolicyContext';

function MyComponent() {
  const { can, canCreateOperation, isAdmin } = usePolicy();
  
  if (!canCreateOperation()) {
    return <div>No permission</div>;
  }
  
  return <button>Create Operation</button>;
}
```

### Opción 2: Componente RoleGuard (Más declarativo)

```typescript
import { RoleGuard } from '../components/RoleGuard';

function MyComponent() {
  return (
    <RoleGuard can="create_operation">
      <button>Create Operation</button>
    </RoleGuard>
  );
}
```

### Opción 3: Botón preconfigurado (Más simple)

```typescript
import { CreateOperationButton } from '../components/Buttons/CreateOperationButton';

function MyComponent() {
  return <CreateOperationButton />;
}
```

---

## ✅ Verificación Rápida

### Paso 1: Verificar que PolicyProvider está en main.tsx

```typescript
// ✓ Debe estar aquí:
<AppProvider>
  <PolicyProvider>
    {/* ... */}
  </PolicyProvider>
</AppProvider>
```

### Paso 2: Verificar que /create-operation existe en router.tsx

```typescript
// ✓ Debe estar aquí:
{
  path: 'create-operation',
  element: <RouteGuard><SessionCreationPage /></RouteGuard>
}
```

### Paso 3: Acceder a /create-operation

- **Rol: Admin, Broker, Charterer, Owner** → ✅ Acceso permitido
- **Rol: Viewer, Seller, Buyer** → ❌ Redirigido a /overview

---

## 🧪 Testing Manual

### Test 1: Verificar acceso a /create-operation

1. Login como **Broker**
2. Navega a `http://localhost:5173/create-operation`
3. ✅ Deberías ver el formulario

### Test 2: Verificar acceso denegado

1. Login como **Viewer**
2. Navega a `http://localhost:5173/create-operation`
3. ❌ Deberías ser redirigido a `/overview` con error

### Test 3: Verificar RoleGuard

1. En cualquier componente, añade:
```typescript
<RoleGuard adminOnly>
  <p>ADMIN ONLY</p>
</RoleGuard>
```
2. Login como **Admin** → ✅ Visible
3. Login como **Broker** → ❌ Oculto

---

## 🐛 Debugging

### Opción 1: Debug Panel (Visual)

- Botón flotante 🔐 en esquina inferior derecha (solo en desarrollo)
- Click → Ver permisos, roles, rutas permitidas
- Test manual de permisos

```typescript
// En main.tsx o App.tsx:
import { RBACDebugPanel } from './components/Debug/RBACDebugPanel';

export function App() {
  return (
    <>
      <RBACDebugPanel />  {/* ← Aparece solo en desarrollo */}
      {/* Tu app */}
    </>
  );
}
```

### Opción 2: Console.warn (Dev)

```typescript
// En PolicyContext, cuando niega acceso:
console.warn(`[POLICY] Acceso denegado: ${role} no puede ${action}`);
```

---

## 📋 Matriz de Roles Rápida

| Rol | Crear Op | Ver Docs | Subir | Aprobar | Admin |
|-----|:--------:|:--------:|:-----:|:-------:|:-----:|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| broker | ✅ | ✅ | ✅ | ✅ | ❌ |
| charterer | ✅ | ✅ | ✅ | ✅ | ❌ |
| owner | ✅ | ✅ | ✅ | ✅ | ❌ |
| viewer | ❌ | ✅ | ❌ | ❌ | ❌ |
| seller | ❌ | ❌ | ❌ | ❌ | ❌ |
| buyer | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🔧 Personalización Común

### Cambiar qué roles pueden crear operaciones

En `src/contexts/PolicyContext.tsx`:

```typescript
// Antes: admin, broker, charterer, owner
const ROLE_PERMISSIONS = {
  admin: new Set([..., 'create_operation', ...]),
  broker: new Set([..., 'create_operation', ...]),
  // ...
};

// Después: solo admin
const ROLE_PERMISSIONS = {
  admin: new Set([..., 'create_operation', ...]),
  broker: new Set([...]), // ← Quitar 'create_operation'
  // ...
};
```

### Añadir un permiso nuevo

1. En `PolicyContext.tsx`, actualizar `ResourceAction`:
```typescript
export type ResourceAction = 
  // ... existentes
  | 'new_permission'  // ← NUEVO
```

2. Actualizar `ROLE_PERMISSIONS`:
```typescript
admin: new Set([..., 'new_permission']),
```

3. Usar en código:
```typescript
const { can } = usePolicy();
if (can('new_permission')) { /* ... */ }
```

---

## 🎯 Ejemplo Práctico Completo

### Escenario: Mostrar botón "Crear Operación" solo en Header

```typescript
// src/components/Layout/Header.tsx

import { CreateOperationButton } from '../Buttons/CreateOperationButton';

export function Header() {
  return (
    <header>
      <h1>STS Hub</h1>
      <nav>
        <a href="/overview">Overview</a>
        <a href="/documents">Documents</a>
      </nav>
      
      {/* ← Este botón solo aparece para usuarios autorizados */}
      <CreateOperationButton 
        variant="primary"
        label="New Operation"
      />
    </header>
  );
}
```

**Comportamiento:**
- Admin, Broker, Charterer, Owner → ✅ Botón visible
- Viewer, Seller, Buyer → ❌ Botón oculto

---

## ⚠️ Importante: Backend Validation

**El frontend filtra UI, pero el backend DEBE validar también:**

```python
# En backend/app/routers/operations.py (FastAPI)

from fastapi import Depends, HTTPException
from app.utils.auth import get_current_user

@router.post("/operations")
async def create_operation(
    data: OperationCreate,
    current_user = Depends(get_current_user)
):
    # 1. Validar rol en backend
    allowed_roles = {'admin', 'broker', 'charterer', 'owner'}
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # 2. Crear operación...
```

---

## 🚀 Próximos Pasos

1. ✅ **Ya hecho**: Implementación base de RBAC
2. ✅ **Ya hecho**: Protección de rutas
3. ✅ **Ya hecho**: Nueva página /create-operation
4. 🔲 **Pendiente**: Integración backend (crear operaciones real)
5. 🔲 **Pendiente**: Formulario SessionCreationPage funcional
6. 🔲 **Pendiente**: Templates por rol
7. 🔲 **Pendiente**: Multi-tenant (tenant_id)

---

## 📞 Solución de Problemas

### "No veo el botón Create Operation"
- ✅ Verifica que el usuario tiene rol `create_operation` en PolicyContext
- ✅ Usa Debug Panel para ver permisos actuales
- ✅ Revisa console.warn en navegador

### "Error: usePolicy must be used within PolicyProvider"
- ✅ Verifica que PolicyProvider está en main.tsx
- ✅ Debe envolver al componente que usa usePolicy

### "/create-operation redirige a /overview"
- ✅ Tu rol no está en la matriz de acceso
- ✅ Usa Debug Panel para verificar rol actual
- ✅ Revisa ROLE_ROUTE_ACCESS en PolicyContext

---

## 📚 Recursos

- **Guía Completa**: `RBAC_IMPLEMENTATION_GUIDE.md`
- **Código Fuente**: `src/contexts/PolicyContext.tsx`
- **Componentes**: `src/components/RoleGuard.tsx`, `RouteGuard.tsx`
- **Debug**: `src/components/Debug/RBACDebugPanel.tsx`

---

## ✨ Resumen

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Sistema de permisos | Básico | Robusto con RBAC |
| Control de rutas | Manual | Automático |
| sts-session-creation.html | HTML estático | SessionCreationPage React |
| Acceso a /create-operation | ❌ No existe | ✅ Protegido por rol |
| Debugging | Manual console.log | Visual Debug Panel |
| Extensibilidad | Difícil | Muy fácil |

---

**🎉 Sistema RBAC Definitivo Listo para Usar**