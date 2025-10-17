# RECTORSTS - Plan de Refactorización Completa

## Estado Actual
- ✅ `dependencies.py`: `get_current_user` retorna objeto User
- ✅ `profile.py`: Actualizado para usar objetos User
- ✅ `auth.py`: Actualizado para usar objetos User
- ❌ **21 routers restantes** necesitan actualización para usar `current_user: User` en lugar de `current_user: dict`

## Fase 1: Routers Críticos (4 archivos - 31 funciones)
- [ ] `activities.py` - 6 funciones
- [ ] `approvals.py` - 7 funciones
- [ ] `documents.py` - 9 funciones
- [ ] `rooms.py` - 9 funciones

## Fase 2: Routers Secundarios (4 archivos - 21 funciones)
- [ ] `cockpit.py` - 9 funciones
- [ ] `messages.py` - 5 funciones
- [ ] `notifications.py` - 6 funciones
- [ ] `vessels.py` - 5 funciones

## Fase 3: Routers Especializados (7 archivos - 27 funciones)
- [ ] `approval_matrix.py` - 3 funciones
- [ ] `search.py` - 5 funciones
- [ ] `snapshots.py` - 6 funciones
- [ ] `historical_access.py` - 4 funciones
- [ ] `regional_operations.py` - 4 funciones
- [ ] `vessel_sessions.py` - 3 funciones
- [ ] `weather.py` - 2 funciones

## Fase 4: Routers Menores (6 archivos - 14 funciones)
- [ ] `files.py` - 3 funciones
- [ ] `settings.py` - 3 funciones
- [ ] `stats.py` - 2 funciones
- [ ] `users.py` - 1 función
- [ ] `cockpit_fixed.py` - 1 función
- [ ] `cockpit_fixed_final.py` - 4 funciones

## Patrón de Cambios por Función
Para cada función en cada router:
- Cambiar: `current_user: dict = Depends(get_current_user)`
- Por: `current_user: User = Depends(get_current_user)`
- Cambiar: `current_user["email"]` → `current_user.email`
- Cambiar: `current_user["role"]` → `current_user.role`
- Cambiar: `current_user["name"]` → `current_user.name`
- Cambiar: `current_user.get("role")` → `current_user.role`

## Testing por Fase
Después de cada fase ejecutar: `python test_refactor_verification.py`

## Timeline Estimado
- Fase 1: 4-6 horas
- Fase 2: 3-4 horas
- Fase 3: 2-3 horas
- Fase 4: 1-2 horas
- Total: 10-15 horas
