# 🎯 Estrategia de Dashboards Adaptados por Roles

## 📊 Matriz de Roles y Responsabilidades

### 1. **ADMIN** 👨‍💼
**Responsabilidad:** Supervisión total del sistema

#### Datos a mostrar:
- **KPIs Globales**
  - Total de operaciones activas/completadas
  - Tasa de cumplimiento regulatorio global
  - Alertas críticas del sistema
  - Usuarios activos y actividad

- **Gestión de Operaciones**
  - Lista de todas las operaciones STS (con filtros avanzados)
  - Estado de cada operación (planificación, ejecución, completada)
  - Buques involucrados y riesgos
  - Documentación faltante por operación

- **Panel de Auditoría**
  - Registro de cambios recientes
  - Acceso de usuarios (quién accedió, cuándo, desde dónde)
  - Modificaciones de datos sensibles
  - Alertas de seguridad

- **Gestión de Usuarios**
  - Lista de usuarios por rol
  - Estado de activación
  - Último acceso
  - Asignación de permisos

- **Análisis Predictivo**
  - Operaciones en riesgo
  - Tendencias de incumplimiento
  - Recomendaciones automáticas

---

### 2. **OWNER** 👑
**Responsabilidad:** Dueño/operador de buques (visión de flota)

#### Datos a mostrar:
- **Estado de Flota**
  - Buques propios y su estado
  - Scores SIRE por buque
  - Inspecciones programadas/próximas
  - Certificaciones vigentes

- **Compliance & Seguros**
  - Resumen de hallazgos críticos
  - Impacto en primas de seguros
  - Recomendaciones de remediación
  - Score de insurance impact

- **Operaciones en Curso**
  - STS operations en las que participa
  - Estados de carga/descarga
  - Documentación requerida por operación
  - Histórico de operaciones (últimas 12 meses)

- **Crew Management**
  - Estado de certificaciones de tripulación
  - Entrenamientos vigentes
  - Personal asignado por buque

- **Alertas Prioritarias**
  - Hallazgos críticos sin resolver
  - Certificaciones próximas a vencer
  - Operaciones retrasadas
  - Problemas de documentación

- **Estadísticas**
  - Eficiencia operacional
  - Downtime por buque
  - Costos operacionales estimados

---

### 3. **BROKER** 💼
**Responsabilidad:** Intermediario entre operadores (matching, negociación)

#### Datos a mostrar:
- **Oportunidades de Operación**
  - Buques disponibles para STS
  - Demanda actual (búsqueda de operaciones)
  - Matching automático (origen → destino)
  - Comisiones potenciales

- **Operaciones Activas**
  - Estado de negociaciones
  - Términos acordados
  - Documentación en progreso
  - Historial de transacciones

- **Análisis de Mercado**
  - Tendencias de precios
  - Disponibilidad de buques
  - Rutas populares
  - Estacionalidad

- **Cartera de Clientes**
  - Owners/Sellers/Buyers registrados
  - Preferencias operacionales
  - Histórico de transacciones
  - Ratings/Reputación

- **Comisiones & Rentabilidad**
  - Comisiones por operación completada
  - ROI por broker
  - Proyección de ingresos

---

### 4. **OWNER/SELLER** 📦
**Responsabilidad:** Propietario de la carga a transferir

#### Datos a mostrar:
- **Mis Operaciones de Venta**
  - Estado de ventas activas
  - Buques receptores disponibles
  - Documentación requerida
  - Timeline de operación

- **Características de Carga**
  - Tipo, cantidad, especificaciones
  - Certificaciones de carga
  - Condiciones especiales
  - Requisitos logísticos

- **Disponibilidad**
  - Fechas de carga disponibles
  - Ubicación actual de la carga
  - Window de operación

- **Transacciones**
  - Historial de ventas completadas
  - Precios obtenidos vs mercado
  - Compradores habituales

- **Documentación**
  - Documentos requeridos vs presentados
  - Bills of lading
  - Certificaciones

---

### 5. **BUYER** 🛒
**Responsabilidad:** Comprador de carga en transferencia

#### Datos a mostrar:
- **Mis Operaciones de Compra**
  - STS operations activas donde participo como comprador
  - Estado de negociaciones
  - Sellers disponibles
  - Documentación pendiente

- **Oportunidades de Compra**
  - Carga disponible en mis rutas
  - Precios vs histórico
  - Sellers confiables
  - Timeline de disponibilidad

- **Necesidades Logísticas**
  - Cantidades requeridas
  - Especificaciones técnicas
  - Destinos y rutas

- **Transacciones Completadas**
  - Historial de compras
  - Proveedores frecuentes
  - Costo promedio por tipo de carga

- **Documentación & Compliance**
  - Requisitos documentales por operación
  - Status de documentos
  - Certificaciones requeridas

---

### 6. **CHARTERER** ⛵
**Responsabilidad:** Operador de buque alquilado/chartered

#### Datos a mostrar:
- **Buques Bajo Contrato**
  - Detalles del charter contract
  - Vigencia del contrato
  - Limitaciones operacionales
  - Owner/Manager del buque

- **Operaciones en Curso**
  - STS operations planificadas/activas
  - Compatibilidad de carga
  - Estado de preparación del buque
  - Documentación naval requerida

- **Conformidad**
  - Requisitos del owner vs capacidades del buque
  - Hallazgos SIRE relevantes
  - Restricciones operacionales

- **Utilización & Eficiencia**
  - Tiempo operacional vs parado
  - Costos de operación
  - Ingresos generados

- **Alertas**
  - Vencimiento de certificados navales
  - Inspecciones pendientes
  - Violaciones de contrato charter

---

### 7. **VIEWER** 👁️
**Responsabilidad:** Solo lectura, sin capacidad de decisión

#### Datos a mostrar:
- **Vista Pública de Operaciones**
  - Estado general de operaciones (sin detalles sensibles)
  - Timeline de operaciones completadas
  - Estadísticas agregadas
  - KPIs públicos

- **Información General**
  - Listado de buques (sin detalles confidenciales)
  - Rutas comunes
  - Estadísticas de mercado públicas

- **Historial & Tendencias**
  - Operaciones completadas (últimos 6 meses)
  - Tendencias de volumen
  - Cumplimiento general

---

## 🎨 Estructura de Componentes Reutilizables

```
components/
├── Dashboard/
│   ├── DashboardBase.tsx (componente padre)
│   ├── RoleBasedLayout.tsx (layout específico por rol)
│   ├── RoleSwitcher.tsx (si es multi-role)
│   └── DashboardShell.tsx (shell común)
│
├── Cards/
│   ├── KPICard.tsx (métricas clave)
│   ├── OperationCard.tsx (estado de operaciones)
│   ├── AlertCard.tsx (alertas prioritarias)
│   ├── MetricsCard.tsx (gráficos y estadísticas)
│   └── DocumentStatusCard.tsx (estado docs)
│
├── Tables/
│   ├── OperationsTable.tsx (listado de operaciones)
│   ├── VesselsTable.tsx (listado de buques)
│   ├── UsersAuditTable.tsx (auditoría)
│   └── DocumentsTable.tsx (documentación)
│
├── Charts/
│   ├── ComplianceChart.tsx (tendencias de compliance)
│   ├── OperationTimeline.tsx (timeline de operaciones)
│   ├── FleetHealthChart.tsx (salud de flota)
│   └── TrendChart.tsx (análisis de tendencias)
│
└── Widgets/
    ├── AlertBanner.tsx (alertas críticas)
    ├── QuickActions.tsx (acciones rápidas por rol)
    └── RoleBasedFilters.tsx (filtros contextuales)
```

---

## 📈 Estructura de Backend (Endpoints Propuestos)

```
/api/v1/dashboard/

# Admin
GET /dashboard/admin/overview          → KPIs globales
GET /dashboard/admin/operations        → Todas las operaciones
GET /dashboard/admin/audit             → Auditoría de cambios
GET /dashboard/admin/users             → Gestión de usuarios
GET /dashboard/admin/alerts            → Alertas del sistema

# Owner
GET /dashboard/owner/overview          → Estado de flota
GET /dashboard/owner/compliance        → SIRE scores, seguros
GET /dashboard/owner/operations        → Sus operaciones STS
GET /dashboard/owner/crew              → Gestión de tripulación

# Broker
GET /dashboard/broker/opportunities    → Matching de buques
GET /dashboard/broker/transactions     → Historial y comisiones
GET /dashboard/broker/market-analysis  → Análisis de mercado
GET /dashboard/broker/clients          → Cartera de clientes

# Seller
GET /dashboard/seller/operations       → Mis ventas activas
GET /dashboard/seller/cargo-info       → Detalles de carga
GET /dashboard/seller/transactions     → Historial

# Buyer
GET /dashboard/buyer/operations        → Mis compras activas
GET /dashboard/buyer/opportunities     → Carga disponible
GET /dashboard/buyer/transactions      → Historial

# Charterer
GET /dashboard/charterer/contracts     → Contratos activos
GET /dashboard/charterer/operations    → Operaciones planificadas
GET /dashboard/charterer/compliance    → Requisitos vs realidad

# Viewer
GET /dashboard/viewer/public-overview  → Vista pública
GET /dashboard/viewer/statistics       → Estadísticas públicas
```

---

## 🎯 Plan de Implementación

### Fase 1: Preparación (1-2 horas)
- [ ] Crear estructura de componentes base
- [ ] Definir interfaces TypeScript para cada dashboard
- [ ] Crear hooks reutilizables

### Fase 2: Componentes Comunes (2-3 horas)
- [ ] KPICard, OperationCard, AlertCard
- [ ] Tablas y filtros
- [ ] Charts y visualizaciones

### Fase 3: Dashboards por Rol (4-6 horas)
- [ ] DashboardAdmin
- [ ] DashboardOwner (mejorar el existente)
- [ ] DashboardBroker
- [ ] DashboardSeller
- [ ] DashboardBuyer
- [ ] DashboardCharterer
- [ ] DashboardViewer

### Fase 4: Backend & Integración (3-4 horas)
- [ ] Implementar endpoints por rol
- [ ] Lógica de autorización
- [ ] Caché de datos

### Fase 5: Testing (2-3 horas)
- [ ] Pruebas unitarias
- [ ] Pruebas de integración
- [ ] Validación de permisos

---

## 🔐 Seguridad y Autorización

### Principios:
1. **Role-Based Access Control (RBAC)**
   - Cada usuario solo ve datos de su rol
   - Backend valida permisos antes de enviar datos

2. **Field-Level Security**
   - No enviar datos sensibles a usuarios sin permiso
   - Ejemplo: Broker no ve costos internos

3. **Auditoría**
   - Log de acceso a dashboards
   - Log de exportaciones de datos
   - Alertas de acceso anómalo

### Implementación:
```typescript
// En AppContext o middleware
const canAccessDashboard = (userRole: string, requestedDashboard: string): boolean => {
  const rolePermissions = {
    admin: ['admin', 'owner', 'broker', 'seller', 'buyer', 'charterer', 'viewer'],
    owner: ['owner'],
    broker: ['broker'],
    // ... etc
  };
  return rolePermissions[userRole]?.includes(requestedDashboard) ?? false;
};
```

---

## 💡 Recomendaciones Clave

1. **Personalización**: Permitir que usuarios (especialmente Admin) personalicen widgets
2. **Exportación**: Funcionalidad para exportar reportes en PDF/Excel por rol
3. **Notificaciones**: Sistema de alertas en tiempo real según rol
4. **Mobile**: Dashboards responsive para móvil
5. **Dark Mode**: Soporte para tema oscuro
6. **Performance**: Lazy loading de datos, caching, paginación
7. **Real-time**: WebSocket para actualizaciones en vivo de operaciones
8. **Analytics**: Tracking de uso de dashboards para optimización

---

## 📱 Ejemplo Visual (DashboardAdmin)

```
┌─────────────────────────────────────────────────────────┐
│ 🔧 ADMIN DASHBOARD                     👨‍💼 admin@sts.com │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┬──────────┬──────────┬──────────┐           │
│  │ Total    │ Active   │ Alert    │ Users    │           │
│  │ Ops: 247 │ Ops: 18  │ Count: 5 │ Online:12│           │
│  └──────────┴──────────┴──────────┴──────────┘           │
│                                                           │
│  RECENT ALERTS                   SYSTEM HEALTH           │
│  ├─ ⚠️  Critical: Vessel MMSI...  ├─ ✅ Database: OK     │
│  ├─ ⚠️  Missing Docs: Op-45...    ├─ ✅ API: OK         │
│  └─ ⚠️  Crew Cert. Exp...         └─ ⚠️  Cache: 85%     │
│                                                           │
│  OPERATIONS OVERVIEW                                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ID    │ Vessel    │ Status   │ Progress │ Action  │  │
│  ├───────┼───────────┼──────────┼──────────┼─────────┤  │
│  │ OP001 │ StarMaris │ ✓ Done   │ 100%     │ Archive │  │
│  │ OP002 │ Torm      │ ⏳ Active│ 65%      │ Monitor │  │
│  │ OP003 │ BW Prince │ ⚠️ Error │ 45%      │ Review  │  │
│  └───────┴───────────┴──────────┴──────────┴─────────┘  │
│                                                           │
│  AUDIT LOG (Recent Changes)                              │
│  ├─ [10:45] User 'owner@sts.com' updated Op-45         │
│  ├─ [10:32] User 'broker@sts.com' created new Op       │
│  └─ [10:15] Operation OP002 status changed             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Ejemplo Visual (DashboardOwner)

```
┌─────────────────────────────────────────────────────────┐
│ 👑 FLEET DASHBOARD                  👑 owner@sts.com    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  FLEET SUMMARY                                            │
│  ┌──────────┬──────────┬──────────┬──────────┐           │
│  │ Vessels  │ Avg SIRE │ Critical │ Upcoming │           │
│  │ Count: 5 │ Score:82 │ Issues:2 │ Inspect:1│           │
│  └──────────┴──────────┴──────────┴──────────┘           │
│                                                           │
│  COMPLIANCE STATUS                  INSURANCE IMPACT      │
│  ├─ 🟢 StarMaris: 92/100           ├─ 📊 Premium: +0%   │
│  ├─ 🟡 Torm: 78/100 ⚠️             ├─ Impact: Minimal   │
│  ├─ 🟠 BW Prince: 65/100           └─ Rec: Maintain     │
│  └─ 🟢 Happy Sea: 88/100                                 │
│                                                           │
│  ACTIVE OPERATIONS                                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ID    │ Vessel       │ Status      │ Docs      │    │
│  ├───────┼──────────────┼─────────────┼───────────┤   │
│  │ OP-001│ StarMaris    │ ✓ Completed │ ✅ 8/8  │    │
│  │ OP-002│ Torm         │ ⏳ Loading  │ ⚠️ 6/8  │    │
│  │ OP-003│ Happy Sea    │ 📋 Planned  │ ❌ 2/8  │    │
│  └───────┴──────────────┴─────────────┴───────────┘   │
│                                                           │
│  CREW CERTIFICATIONS                 OPEN FINDINGS       │
│  ├─ ✅ All current                   ├─ 🔴 Major: 2    │
│  └─ ⏰ Next review: 45 days          └─ 🟡 Minor: 5    │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Próximos Pasos

1. ¿Cuál es el rol prioritario para empezar? → Recomiendo: **Admin + Owner**
2. ¿Necesitas datos reales del backend o simulados?
3. ¿Quieres que implemente la estructura completa o solo ciertos dashboards?
4. ¿Prefieres que los datos sean en tiempo real o con caché?
