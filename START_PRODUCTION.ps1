#!/usr/bin/env pwsh
<#
.DESCRIPTION
    STS Clearance Hub - Production Startup Script
    Inicia el backend y frontend de la aplicación
.NOTES
    Autor: STS Development Team
    Version: 1.0.0
    Fecha: 2025-10-29
#>

Write-Host "`n" -ForegroundColor Green
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      STS CLEARANCE HUB - PRODUCTION STARTUP v3.0.0      ║" -ForegroundColor Cyan
Write-Host "║              Ship-to-Ship Transfer Operations              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n"

# Configuration
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommandPath
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPort = 5173
$BackendPort = 8001

# Colors
$SuccessColor = "Green"
$ErrorColor = "Red"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

# Functions
function Show-Menu {
    Write-Host "Selecciona una opción:" -ForegroundColor $InfoColor
    Write-Host "1. Iniciar Backend y Frontend juntos"
    Write-Host "2. Iniciar solo Backend"
    Write-Host "3. Iniciar solo Frontend"
    Write-Host "4. Compilar Frontend para producción"
    Write-Host "5. Ejecutar pruebas de integración"
    Write-Host "6. Ver estado del sistema"
    Write-Host "7. Salir"
    Write-Host ""
    $choice = Read-Host "Opción (1-7)"
    return $choice
}

function Start-Backend {
    Write-Host "🚀 Iniciando Backend..." -ForegroundColor $InfoColor
    Set-Location $BackendPath
    
    # Check if Python is available
    $pythonCheck = python --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Python no encontrado. Instala Python primero." -ForegroundColor $ErrorColor
        return $false
    }
    
    Write-Host "✓ Python encontrado: $pythonCheck" -ForegroundColor $SuccessColor
    Write-Host "📊 Iniciando servidor... (esto puede tomar unos segundos)" -ForegroundColor $InfoColor
    
    # Start backend in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BackendPath'; python run_server.py" -WindowStyle Normal
    
    Write-Host "✓ Backend iniciado en nueva ventana" -ForegroundColor $SuccessColor
    Write-Host "   URL: http://localhost:$BackendPort" -ForegroundColor $SuccessColor
    Write-Host "   Docs: http://localhost:$BackendPort/docs" -ForegroundColor $SuccessColor
    
    Start-Sleep -Seconds 3
    return $true
}

function Start-Frontend {
    Write-Host "🎨 Iniciando Frontend..." -ForegroundColor $InfoColor
    Set-Location $ProjectRoot
    
    # Check if npm is available
    $npmCheck = npm --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm no encontrado. Instala Node.js primero." -ForegroundColor $ErrorColor
        return $false
    }
    
    Write-Host "✓ npm encontrado" -ForegroundColor $SuccessColor
    Write-Host "📦 Iniciando servidor de desarrollo..." -ForegroundColor $InfoColor
    
    # Start frontend in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectRoot'; npm run dev" -WindowStyle Normal
    
    Write-Host "✓ Frontend iniciado en nueva ventana" -ForegroundColor $SuccessColor
    Write-Host "   URL: http://localhost:$FrontendPort" -ForegroundColor $SuccessColor
    
    Start-Sleep -Seconds 3
    return $true
}

function Build-Frontend {
    Write-Host "🏗️  Compilando Frontend para producción..." -ForegroundColor $InfoColor
    Set-Location $ProjectRoot
    
    Write-Host "📦 Instalando dependencias..." -ForegroundColor $InfoColor
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar dependencias" -ForegroundColor $ErrorColor
        return $false
    }
    
    Write-Host "🔨 Compilando..." -ForegroundColor $InfoColor
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Compilación completada exitosamente" -ForegroundColor $SuccessColor
        Write-Host "   Output en: $ProjectRoot\dist\" -ForegroundColor $SuccessColor
        return $true
    } else {
        Write-Host "❌ Error en la compilación" -ForegroundColor $ErrorColor
        return $false
    }
}

function Run-Tests {
    Write-Host "🧪 Ejecutando pruebas de integración..." -ForegroundColor $InfoColor
    Set-Location $ProjectRoot
    
    if (Test-Path "PHASE3_FULL_TEST.py") {
        python PHASE3_FULL_TEST.py
    } else {
        Write-Host "❌ Script de pruebas no encontrado" -ForegroundColor $ErrorColor
    }
}

function Show-Status {
    Write-Host "`n📊 ESTADO DEL SISTEMA" -ForegroundColor $InfoColor
    Write-Host "─" * 60
    
    # Check Backend
    Write-Host "Backend:" -ForegroundColor $WarningColor
    try {
        $backendResponse = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/v1/stats/system/health" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  ✓ Activo (HTTP 200)" -ForegroundColor $SuccessColor
        Write-Host "  URL: http://localhost:$BackendPort" -ForegroundColor $SuccessColor
    } catch {
        Write-Host "  ✗ No responde en puerto $BackendPort" -ForegroundColor $ErrorColor
        Write-Host "    Asegúrate de ejecutar: cd sts\backend && python run_server.py" -ForegroundColor $WarningColor
    }
    
    # Check Frontend
    Write-Host "`nFrontend:" -ForegroundColor $WarningColor
    try {
        $frontendResponse = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  ✓ Activo (HTTP 200)" -ForegroundColor $SuccessColor
        Write-Host "  URL: http://localhost:$FrontendPort" -ForegroundColor $SuccessColor
    } catch {
        Write-Host "  ✗ No responde en puerto $FrontendPort" -ForegroundColor $ErrorColor
        Write-Host "    Asegúrate de ejecutar: cd sts && npm run dev" -ForegroundColor $WarningColor
    }
    
    # Test Users
    Write-Host "`nUsuarios de Prueba:" -ForegroundColor $WarningColor
    Write-Host "  Email: admin@sts.com" -ForegroundColor $SuccessColor
    Write-Host "  Password: password123" -ForegroundColor $SuccessColor
    
    Write-Host "`n" -ForegroundColor $InfoColor
}

# Main Loop
$running = $true
while ($running) {
    $choice = Show-Menu
    
    switch ($choice) {
        "1" {
            $success = $true
            $success = (Start-Backend) -and $success
            $success = (Start-Frontend) -and $success
            
            if ($success) {
                Write-Host "`n✅ Backend y Frontend iniciados" -ForegroundColor $SuccessColor
                Write-Host "   Accede a la aplicación: http://localhost:$FrontendPort" -ForegroundColor $SuccessColor
                Show-Status
            }
        }
        "2" {
            if (Start-Backend) {
                Write-Host "`n✅ Backend iniciado" -ForegroundColor $SuccessColor
                Show-Status
            }
        }
        "3" {
            if (Start-Frontend) {
                Write-Host "`n✅ Frontend iniciado" -ForegroundColor $SuccessColor
                Show-Status
            }
        }
        "4" {
            if (Build-Frontend) {
                Write-Host "`n✅ Compilación completada" -ForegroundColor $SuccessColor
            }
        }
        "5" {
            Run-Tests
        }
        "6" {
            Show-Status
        }
        "7" {
            Write-Host "👋 ¡Hasta luego!" -ForegroundColor $SuccessColor
            $running = $false
        }
        default {
            Write-Host "❌ Opción no válida" -ForegroundColor $ErrorColor
        }
    }
    
    if ($running) {
        Write-Host "`nPresiona Enter para continuar..." -ForegroundColor $InfoColor
        Read-Host | Out-Null
        Clear-Host
    }
}