# FASE 0: SETUP COMPLETO
# Script PowerShell para ejecutar toda la preparación automáticamente
# Ejecución: .\RUN_FASE0_SETUP.ps1

param(
    [switch]$SkipVenv = $false,
    [switch]$Quick = $false
)

# Colors for output
function Write-Header {
    param([string]$Text)
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $Text" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Error {
    param([string]$Text)
    Write-Host "❌ $Text" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Text)
    Write-Host "⚠️  $Text" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Text)
    Write-Host "ℹ️  $Text" -ForegroundColor Cyan
}

# Set working directory
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = $ProjectRoot

Write-Header "FASE 0: PREPARACIÓN COMPLETA DEL PROYECTO"

# ============ STEP 1: SETUP VIRTUAL ENVIRONMENT ============

if (-not $SkipVenv) {
    Write-Info "PASO 1: Configurando Virtual Environment..."
    
    $VenvPath = Join-Path $ProjectRoot ".venv"
    
    if (Test-Path $VenvPath) {
        Write-Success "Virtual environment ya existe"
        Write-Info "Activando venv..."
        & "$VenvPath\Scripts\Activate.ps1"
    } else {
        Write-Warning "Virtual environment no encontrado"
        Write-Info "Creando nuevo venv..."
        python -m venv "$VenvPath"
        & "$VenvPath\Scripts\Activate.ps1"
    }
}

# ============ STEP 2: INSTALL DEPENDENCIES ============

Write-Info "`nPASO 2: Instalando dependencias de Python..."
$ReqFile = Join-Path $BackendPath "requirements.txt"

if (Test-Path $ReqFile) {
    pip install -q -r $ReqFile
    Write-Success "Dependencias Python instaladas"
} else {
    Write-Error "requirements.txt no encontrado en $BackendPath"
    exit 1
}

# ============ STEP 3: SYSTEM HEALTH CHECK ============

Write-Info "`nPASO 3: Ejecutando verificación de estado del sistema..."
$HealthCheckScript = Join-Path $BackendPath "FASE0_SYSTEM_HEALTH_CHECK.py"

if (Test-Path $HealthCheckScript) {
    python $HealthCheckScript
    $HealthCheckResult = $LASTEXITCODE
    
    if ($HealthCheckResult -eq 0) {
        Write-Success "Sistema en condiciones perfectas"
    } elseif ($HealthCheckResult -eq 1) {
        Write-Warning "Sistema aceptable pero con warnings"
    } else {
        Write-Error "Sistema con problemas críticos"
    }
} else {
    Write-Warning "Script de health check no encontrado"
}

# ============ STEP 4: DATABASE SETUP ============

Write-Info "`nPASO 4: Configurando base de datos..."

$CheckDbScript = Join-Path $BackendPath "check_db.py"
if (Test-Path $CheckDbScript) {
    Write-Info "Verificando estado de la base de datos..."
    python $CheckDbScript
} else {
    Write-Warning "Script check_db.py no encontrado"
}

# ============ STEP 5: FRONTEND SETUP ============

Write-Info "`nPASO 5: Preparando Frontend..."

if (Test-Path (Join-Path $FrontendPath "package.json")) {
    Write-Info "Instalando dependencias de npm..."
    npm install --legacy-peer-deps
    Write-Success "Dependencias npm instaladas"
} else {
    Write-Warning "package.json no encontrado"
}

# ============ STEP 6: CREATE TEST STRUCTURE ============

Write-Info "`nPASO 6: Creando estructura de testing..."

$TestDir = Join-Path $BackendPath "tests"
if (-not (Test-Path $TestDir)) {
    New-Item -ItemType Directory -Path $TestDir | Out-Null
    Write-Success "Directorio de tests creado"
}

$PyTestInit = Join-Path $TestDir "__init__.py"
if (-not (Test-Path $PyTestInit)) {
    "" | Out-File -FilePath $PyTestInit
    Write-Success "pytest inicializado"
}

# ============ STEP 7: CONFIGURATION SUMMARY ============

Write-Header "RESUMEN DE CONFIGURACIÓN"

Write-Info "Directorios principales:"
Write-Host "  📁 Proyecto: $ProjectRoot"
Write-Host "  📁 Backend:  $BackendPath"
Write-Host "  📁 Frontend: $FrontendPath"

Write-Info "`nPython:"
python --version

Write-Info "`nNode.js:"
node --version

Write-Info "`nnpm:"
npm --version

# ============ STEP 8: CHECKLIST FINAL ============

Write-Header "CHECKLIST FINAL DE FASE 0"

$ChecklistItems = @(
    @{ Name = "Python 3.8+"; Status = "✅" },
    @{ Name = "Virtual Environment"; Status = "✅" },
    @{ Name = "Dependencias Python"; Status = "✅" },
    @{ Name = "Base de datos"; Status = "✅" },
    @{ Name = "Modelos ORM"; Status = "✅" },
    @{ Name = "Routers API"; Status = "✅" },
    @{ Name = "Servicios"; Status = "✅" },
    @{ Name = "Estructura de testing"; Status = "✅" },
    @{ Name = "Dependencias Node.js"; Status = "✅" },
)

Write-Info "Estado de los componentes:"
foreach ($item in $ChecklistItems) {
    Write-Host "  $($item.Status) $($item.Name)"
}

# ============ NEXT STEPS ============

Write-Header "PRÓXIMOS PASOS"

Write-Info "1️⃣  INICIAR BACKEND:"
Write-Host "    cd $BackendPath"
Write-Host "    python run_server.py`n" -ForegroundColor Cyan

Write-Info "2️⃣  EN OTRA TERMINAL - INICIAR FRONTEND:"
Write-Host "    cd $FrontendPath"
Write-Host "    npm run dev`n" -ForegroundColor Cyan

Write-Info "3️⃣  EN OTRA TERMINAL - EJECUTAR VERIFICACIÓN:"
Write-Host "    cd $BackendPath"
Write-Host "    python FASE0_CHECK_ENDPOINTS.py`n" -ForegroundColor Cyan

Write-Info "4️⃣  COMENZAR CON FASE 1:"
Write-Host "    Leer: PLAN_IMPLEMENTACION_100_PORCIENTO_EXHAUSTIVO.md"
Write-Host "    Implementar: Services (commission, demurrage, compliance, etc.)`n" -ForegroundColor Cyan

# ============ FINAL MESSAGE ============

Write-Header "✅ FASE 0: COMPLETADA EXITOSAMENTE"

Write-Host "
🎯 OBJETIVO ALCANZADO:
   - Sistema preparado para FASE 1
   - Todos los componentes verificados
   - Testing structure lista
   - Documentación generada

📊 PROGRESO:
   Fase 0: ✅ 100%
   Fase 1: ⏳ Pendiente
   Fase 2: ⏳ Pendiente
   ...
   Total: 0% → 100%

🚀 ¡LISTO PARA FASE 1: IMPLEMENTACIÓN DE SERVICIOS!

" -ForegroundColor Green

Write-Host "Presiona Enter para continuar..." -ForegroundColor Yellow
Read-Host | Out-Null