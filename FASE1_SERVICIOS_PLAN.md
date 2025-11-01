# ⚡ FASE 1: COMPLETAR SERVICIOS CRÍTICOS
**Duración: 12-16 horas | Núcleo del negocio**

---

## 🎯 OBJETIVO FASE 1

Implementar completamente 6 servicios críticos que constituyen el corazón del negocio:

1. ✅ **commission_service.py** (70% → 100%)
2. ✅ **demurrage_service.py** (75% → 100%)
3. ✅ **compliance_service.py** (60% → 100%)
4. ✅ **notification_service.py** (65% → 100%)
5. ✅ **dashboard_projection_service.py** (80% → 100%)
6. ✅ **missing_documents_service.py** (70% → 100%)

Resultado: Lógica de negocio completa y funcional

---

## 📋 PRIORIZACIÓN DE IMPLEMENTACIÓN

### 🔴 CRÍTICOS (Implementar primero - 4-6 horas)

#### 1. **commission_service.py** - COMISIONES DE BROKER
**Por qué primero:** Los brokers necesitan ver comisiones en tiempo real

**Funciones a completar:**
```python
class CommissionService:
    # ✅ Existentes (completar):
    async def calculate_commission(room_id, broker_id) -> float
    async def get_broker_commissions(broker_id) -> List[Commission]
    
    # ❌ NUEVOS:
    async def calculate_commission_on_demurrage(demurrage_total) -> float
    async def get_commission_tracking_by_broker(broker_id, start_date, end_date) -> Dict
    async def get_commission_dashboard_data(broker_id) -> Dict
    async def create_commission_record(room_id, broker_id, amount) -> Commission
    async def get_unpaid_commissions_by_broker(broker_id) -> List[Commission]
    async def mark_commission_paid(commission_id) -> Commission
```

**Testing:**
```python
@pytest.mark.asyncio
async def test_commission_on_demurrage():
    # Given: 100,000 USD demurrage acumulado
    # When: Calcular comisión al 0.5%
    # Then: Resultado = 500 USD
    pass

@pytest.mark.asyncio
async def test_commission_tracking():
    # Verificar que se trackea correctamente por broker
    pass
```

**Schemas a crear:**
```python
# app/schemas.py - AGREGAR:
class CommissionCreate(BaseModel):
    room_id: str
    broker_id: str
    demurrage_amount: float
    commission_percentage: float  # 0.5 = 0.5%
    commission_amount: float

class CommissionResponse(CommissionCreate):
    id: str
    created_at: datetime
    paid_at: Optional[datetime]
    status: str  # pending, paid, overdue
```

---

#### 2. **demurrage_service.py** - CÁLCULO DE DEMURRAGE
**Por qué:** Charterers ven esto constantemente, es crítico para decisiones de negocio

**Funciones a completar:**
```python
class DemurrageService:
    # ✅ Existentes (completar):
    async def calculate_demurrage(room_id) -> float
    
    # ❌ NUEVOS:
    async def calculate_demurrage_accumulated(room_id) -> float
    async def calculate_demurrage_projection(room_id, days_ahead=7) -> float
    async def get_demurrage_timeline(room_id) -> List[Dict]  # Hourly breakdown
    async def get_demurrage_exposure_by_charterer(charterer_id) -> Dict
    async def calculate_demurrage_margin_impact(room_id) -> Dict  # % of total margin
    async def create_demurrage_alert(room_id, exposure_percentage) -> Alert
    async def get_demurrage_history_liquidated(room_id) -> List[Dict]
```

**Lógica de negocio:**
```python
# El demurrage se calcula así:
# 1. ETA = Estimated Time of Arrival (fecha/hora estimada)
# 2. ATA = Actual Time of Arrival (fecha/hora real)
# 3. Si ATA > ETA → Hay demurrage
# 4. Horas de demurrage = ATA - ETA
# 5. Demurrage daily USD = rate_per_day / 24 * hours
# 6. Total demurrage = sum(demurrage_daily)

# Ejemplo:
# Cargo: 3 millones de barriles de crudo
# Demurrage rate: $500,000/día = $20,833/hora
# Operación tarde 48 horas
# Total demurrage = $500,000 * 2 = $1,000,000
```

**Schemas:**
```python
class DemurrageExposure(BaseModel):
    room_id: str
    current_demurrage_usd: float
    accumulated_demurrage_usd: float
    projected_demurrage_usd: float
    demurrage_rate_per_day: float
    hours_late: float
    eta_actual: datetime
    eta_estimated: datetime
    margin_impact_percentage: float  # % of operation margin
    urgency_level: str  # low, medium, high, critical
```

---

#### 3. **compliance_service.py** - CUMPLIMIENTO SIRE
**Por qué:** Owners necesitan verificar compliance SIRE de sus buques

**Funciones a completar:**
```python
class ComplianceService:
    # ✅ Existentes:
    async def check_sire_compliance(vessel_id) -> Dict
    
    # ❌ NUEVOS:
    async def validate_vessel_certification(vessel_id) -> Dict
    async def check_crew_certifications(vessel_id) -> List[Dict]
    async def validate_insurance_policies(vessel_id) -> List[Dict]
    async def get_compliance_scorecard(vessel_id) -> Dict
    async def create_compliance_alert(vessel_id, issue_type, severity) -> Alert
    async def get_compliance_violations(vessel_id) -> List[Dict]
    async def track_compliance_history(vessel_id, days=90) -> List[Dict]
```

**Validaciones:**
```python
# SIRE Compliance checks:
- Certificado ISM válido (Class Society)
- Certificado ISPS válido (Security level 1/2/3)
- Póliza de seguros vigente
- Inspecciones de flag state al día
- Defects no cerrados de inspecciones anteriores
- Crew certifications vigentes
```

---

### 🟡 IMPORTANTES (4-6 horas)

#### 4. **notification_service.py** - NOTIFICACIONES
**Funciones a completar:**
```python
class NotificationService:
    # ✅ Existentes (básico):
    async def create_notification(user_id, message) -> Notification
    
    # ❌ NUEVOS:
    async def send_notification_to_users(user_ids: List[str], message: str, priority: str)
    async def send_email_notification(email: str, subject: str, body: str)
    async def send_in_app_notification(user_id: str, notification: Dict)
    async def get_user_notification_preferences(user_id: str) -> Dict
    async def update_notification_preferences(user_id: str, preferences: Dict)
    async def mark_notifications_as_read(user_id: str, notification_ids: List[str])
    async def create_critical_alert(room_id: str, alert_type: str, severity: str)
    async def get_unread_notifications_count(user_id: str) -> int
```

---

#### 5. **dashboard_projection_service.py** - PROYECCIONES PARA DASHBOARDS
**Funciones a completar:**
```python
class DashboardProjectionService:
    # ✅ Existentes (parcial):
    async def get_admin_overview() -> Dict
    async def get_charterer_overview() -> Dict
    async def get_broker_overview() -> Dict
    
    # ❌ NUEVOS:
    async def get_shipowner_overview() -> Dict
    async def get_inspector_overview() -> Dict
    async def get_real_time_metrics() -> Dict
    async def get_critical_alerts() -> List[Dict]
    async def project_dashboard_for_role(role: str) -> Dict
```

**Estructura de dashboards por rol:**

```python
# ADMIN DASHBOARD
{
    "system_health": {
        "uptime": "99.9%",
        "active_users": 145,
        "pending_operations": 23,
        "critical_issues": 2
    },
    "compliance": {
        "total_vessels": 50,
        "compliant": 48,
        "non_compliant": 2,
        "violations_critical": 1
    },
    "user_management": {
        "total_users": 250,
        "active_today": 145,
        "new_this_week": 12,
        "locked_accounts": 3
    }
}

# CHARTERER DASHBOARD
{
    "demurrage_exposure": {
        "active_operations": 15,
        "total_demurrage_accumulated": 2500000,  # USD
        "total_demurrage_projected": 3200000,    # USD
        "margin_impact": 12.5  # % of total margin
    },
    "urgency_matrix": [
        {
            "operation_id": "...",
            "urgency": "critical",
            "hours_late": 48,
            "demurrage_per_hour": 20833,
            "action_required": "Approve vessel immediately"
        }
    ],
    "approvals_pending": 5
}

# BROKER DASHBOARD
{
    "commissions": {
        "active_commissions": 12,
        "total_this_month": 145000,  # USD
        "total_this_year": 1850000,  # USD
        "pending_payment": 3,
        "paid_this_month": 9
    },
    "deal_health": [
        {
            "room_id": "...",
            "status": "active",
            "parties_count": 4,
            "documents_approved": 8,
            "documents_pending": 2,
            "risk_level": "low"
        }
    ]
}
```

---

#### 6. **missing_documents_service.py** - DOCUMENTOS FALTANTES
**Funciones a completar:**
```python
class MissingDocumentsService:
    # ✅ Existentes (70%):
    async def get_missing_documents(room_id) -> List[Document]
    
    # ❌ NUEVOS:
    async def detect_missing_documents_auto(room_id) -> List[Dict]
    async def get_sla_tracking(room_id) -> Dict
    async def create_critical_missing_alert(room_id, doc_type) -> Alert
    async def get_missing_documents_statistics() -> Dict
    async def get_documents_expiring_soon(days=7) -> List[Dict]
    async def generate_missing_documents_report(room_id) -> Dict
```

---

## 📝 CHECKLIST FASE 1

### Implementación

- [ ] **commission_service.py completado** (100%)
  - [ ] Cálculo de comisión base funciona
  - [ ] Cálculo sobre demurrage funciona
  - [ ] Dashboard de comisiones funciona
  - [ ] Tests pasando
  - [ ] Documentación completada

- [ ] **demurrage_service.py completado** (100%)
  - [ ] Cálculo acumulado funciona
  - [ ] Proyección funciona
  - [ ] Timeline funciona
  - [ ] Alertas funciona
  - [ ] Tests pasando

- [ ] **compliance_service.py completado** (100%)
  - [ ] Validaciones SIRE funciona
  - [ ] Crew certifications funciona
  - [ ] Insurance validation funciona
  - [ ] Scorecard funciona
  - [ ] Tests pasando

- [ ] **notification_service.py completado** (100%)
  - [ ] Creación de notificaciones funciona
  - [ ] Email notifications funciona
  - [ ] Preferences funciona
  - [ ] Tests pasando

- [ ] **dashboard_projection_service.py completado** (100%)
  - [ ] Admin dashboard funciona
  - [ ] Charterer dashboard funciona
  - [ ] Broker dashboard funciona
  - [ ] Owner dashboard funciona
  - [ ] Tests pasando

- [ ] **missing_documents_service.py completado** (100%)
  - [ ] Auto-detection funciona
  - [ ] SLA tracking funciona
  - [ ] Alerts funciona
  - [ ] Reports funciona
  - [ ] Tests pasando

### Testing

- [ ] Todos los servicios tienen tests unitarios
- [ ] Cobertura >80%
- [ ] Integration tests funcionan
- [ ] Datos de prueba cargados

### Documentación

- [ ] Docstrings en todas las funciones
- [ ] README.md de cada servicio
- [ ] Examples en documentación

---

## 🚀 ORDEN DE EJECUCIÓN

```
1. commission_service.py       (2-3 horas)
   ↓
2. demurrage_service.py        (2-3 horas)
   ↓
3. compliance_service.py       (2-3 horas)
   ↓
4. notification_service.py     (1-2 horas)
   ↓
5. dashboard_projection_service.py (2-3 horas)
   ↓
6. missing_documents_service.py (1-2 horas)
   ↓
✅ FASE 1 COMPLETADA
```

**Total: 12-16 horas**

---

## 📊 PROGRESO

```
FASE 0: ✅ 100% (COMPLETADA)
FASE 1: ⏳ 0% → 100% (COMIENZA AHORA)
        ├─ commission_service.py        [          ] 0%
        ├─ demurrage_service.py         [          ] 0%
        ├─ compliance_service.py        [          ] 0%
        ├─ notification_service.py      [          ] 0%
        ├─ dashboard_projection_service [          ] 0%
        └─ missing_documents_service.py [          ] 0%

FASE 2: ⏳ Pendiente (Routers)
FASE 3: ⏳ Pendiente (WebSocket)
FASE 4: ⏳ Pendiente (Frontend)
FASE 5: ⏳ Pendiente (Integración)
FASE 6: ⏳ Pendiente (Testing LAN)
FASE 7: ⏳ Pendiente (Optimización)

TOTAL: 0% → 100%
```

---

## 🔧 CÓMO EJECUTAR FASE 1

### Paso 1: Activar entorno
```powershell
cd c:\Users\feder\Desktop\StsHub\sts
.\.venv\Scripts\Activate.ps1
```

### Paso 2: Iniciar backend
```powershell
python backend\run_server.py
```

### Paso 3: En otra terminal, comenzar implementación
```powershell
# Cambiar al directorio de backend
cd backend\app\services

# Editar commission_service.py y agregar funciones nuevas
code commission_service.py

# Escribir tests
cd ../
python -m pytest tests/ -v
```

### Paso 4: Verificar cada cambio
```powershell
# Antes de pasar a siguiente servicio
python -m pytest tests/test_commission_service.py -v

# Si todo está bien, pasar al siguiente:
# demurrage_service.py
```

---

## 💾 ARCHIVOS A MODIFICAR

```
backend/
├── app/
│   ├── services/
│   │   ├── commission_service.py        ⚡ MODIFICAR
│   │   ├── demurrage_service.py         ⚡ MODIFICAR
│   │   ├── compliance_service.py        ⚡ MODIFICAR
│   │   ├── notification_service.py      ⚡ MODIFICAR
│   │   ├── dashboard_projection_service.py ⚡ MODIFICAR
│   │   └── missing_documents_service.py ⚡ MODIFICAR
│   ├── schemas.py                       ⚡ AGREGAR NUEVOS SCHEMAS
│   └── models.py                        ✅ OK (sin cambios necesarios)
│
├── tests/
│   ├── test_commission_service.py       ✨ CREAR
│   ├── test_demurrage_service.py        ✨ CREAR
│   ├── test_compliance_service.py       ✨ CREAR
│   ├── test_notification_service.py     ✨ CREAR
│   ├── test_dashboard_projection.py     ✨ CREAR
│   └── test_missing_documents.py        ✨ CREAR
│
└── requirements.txt                     ✅ OK (todas las dependencias están)
```

---

## 🎓 PUNTOS CLAVE

1. **Mantener cohesión:** Los servicios trabajan juntos
   - demurrage_service calcula el demurrage
   - commission_service lo usa para calcular comisiones
   - dashboard_projection_service los usa para dashboards

2. **Testing es crítico:** Cada función nueva tiene test
   - Unit tests primero
   - Integration tests segundo
   - Manual testing tercero

3. **No romper existente:** Los cambios son aditivos
   - No eliminar funciones existentes
   - No cambiar signatures existentes
   - Agregar nuevas funciones

4. **Documentación en vivo:** Documentar mientras se implementa
   - Docstrings claros
   - Ejemplos en código
   - README actualizado

---

**FASE 1: COMIENZA AHORA**  
*Duración: 12-16 horas*  
*Criticidad: MÁXIMA*  
*Siguiente: Ejecutar PASO 1 - commission_service.py*
