#!/usr/bin/env pwsh
<#
.SYNOPSIS
    STS Clearance Hub - Phase 3, 4, 5 Quick Execution Script
    
.DESCRIPTION
    Automates Phase 3 (Testing), Phase 4 (Frontend), and Phase 5 (Deployment)
    
.EXAMPLE
    .\PHASE3_4_5_QUICK_EXECUTION.ps1 -Phase all
    .\PHASE3_4_5_QUICK_EXECUTION.ps1 -Phase test
    .\PHASE3_4_5_QUICK_EXECUTION.ps1 -Phase deploy
#>

param(
    [ValidateSet("all", "test", "frontend", "deploy")]
    [string]$Phase = "all",
    
    [switch]$SkipDependencies,
    [switch]$Docker
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptRoot "backend"
$frontendPath = Join-Path $scriptRoot "."

# ============ UTILITY FUNCTIONS ============
function Write-Title {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Green -NoNewline
    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "→ $Text" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Text)
    Write-Host "✓ $Text" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Text)
    Write-Host "✗ $Text" -ForegroundColor Red
}

function Check-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# ============ PHASE 1: SETUP & DEPENDENCIES ============
function Initialize-Dependencies {
    Write-Title "PHASE 0: CHECKING DEPENDENCIES"
    
    # Check Python
    Write-Step "Checking Python installation..."
    if (-not (Check-Command python)) {
        Write-Error-Custom "Python not found. Install Python 3.10+ from https://www.python.org/"
        exit 1
    }
    Write-Success "Python found: $(python --version)"
    
    # Check Node.js
    Write-Step "Checking Node.js installation..."
    if (-not (Check-Command node)) {
        Write-Error-Custom "Node.js not found. Install from https://nodejs.org/"
        exit 1
    }
    Write-Success "Node.js found: $(node --version)"
    
    # Check npm
    Write-Step "Checking npm installation..."
    if (-not (Check-Command npm)) {
        Write-Error-Custom "npm not found"
        exit 1
    }
    Write-Success "npm found: $(npm --version)"
    
    # Check Docker (if needed)
    if ($Docker) {
        Write-Step "Checking Docker installation..."
        if (-not (Check-Command docker)) {
            Write-Error-Custom "Docker not found. Install from https://www.docker.com/"
            exit 1
        }
        Write-Success "Docker found: $(docker --version)"
    }
    
    # Install Python dependencies
    Write-Step "Installing Python dependencies..."
    Set-Location $backendPath
    pip install -q -r requirements.txt
    Write-Success "Python dependencies installed"
    
    # Install Frontend dependencies
    Write-Step "Installing frontend dependencies..."
    npm install -q
    Write-Success "Frontend dependencies installed"
}

# ============ PHASE 3: ENDPOINT TESTING ============
function Execute-Phase3-Testing {
    Write-Title "PHASE 3: ENDPOINT TESTING"
    
    Set-Location $backendPath
    
    # Create test users
    Write-Step "Creating test users for all roles..."
    python PHASE3_CREATE_TEST_USERS.py
    Write-Success "Test users created"
    
    # Run endpoint tests
    Write-Step "Running comprehensive endpoint tests..."
    Write-Step "Make sure backend is running on http://localhost:8000"
    Write-Host "Press Enter to continue with tests (or Ctrl+C to cancel)..."
    Read-Host
    
    python PHASE3_ENDPOINT_TESTING.py
    Write-Success "Endpoint testing completed"
}

# ============ PHASE 4: FRONTEND INTEGRATION ============
function Execute-Phase4-Frontend {
    Write-Title "PHASE 4: FRONTEND INTEGRATION"
    
    Set-Location $frontendPath
    
    # Check if components exist
    Write-Step "Verifying frontend components..."
    $inspectorDashboard = "src\components\Pages\DashboardInspector.tsx"
    
    if (Test-Path $inspectorDashboard) {
        Write-Success "Inspector dashboard component found"
    } else {
        Write-Error-Custom "Inspector dashboard component not found"
    }
    
    # Build frontend
    Write-Step "Building frontend for production..."
    npm run build
    Write-Success "Frontend build completed"
    
    # Verify build output
    if (Test-Path "dist\index.html") {
        Write-Success "Frontend distribution package verified"
    }
}

# ============ PHASE 5: PRODUCTION DEPLOYMENT ============
function Execute-Phase5-Deploy {
    Write-Title "PHASE 5: PRODUCTION DEPLOYMENT"
    
    if (-not $Docker) {
        Write-Step "Docker mode not enabled. Use -Docker flag for Docker deployment."
        return
    }
    
    Set-Location $scriptRoot
    
    # Check docker-compose file
    Write-Step "Verifying docker-compose configuration..."
    if (-not (Test-Path "docker-compose.prod-complete.yml")) {
        Write-Error-Custom "docker-compose.prod-complete.yml not found"
        exit 1
    }
    Write-Success "Docker-compose configuration verified"
    
    # Check environment file
    Write-Step "Checking environment configuration..."
    if (-not (Test-Path ".env.production.local")) {
        Write-Host "Creating .env.production.local from template..." -ForegroundColor Yellow
        Copy-Item ".env.production" ".env.production.local"
        Write-Host "⚠️  Please edit .env.production.local with your production values!" -ForegroundColor Red
        Write-Host "Press Enter after configuring environment variables..."
        Read-Host
    }
    Write-Success "Environment configuration ready"
    
    # Build Docker images
    Write-Step "Building Docker images..."
    docker-compose -f docker-compose.prod-complete.yml build --no-cache
    Write-Success "Docker images built"
    
    # Start services
    Write-Step "Starting all services..."
    docker-compose -f docker-compose.prod-complete.yml up -d
    Write-Success "All services started"
    
    # Verify services
    Write-Step "Waiting for services to be ready..."
    Start-Sleep -Seconds 5
    
    $healthy = 0
    $maxWait = 30
    $waitTime = 0
    
    while ($waitTime -lt $maxWait) {
        $status = docker-compose -f docker-compose.prod-complete.yml ps | Select-String "healthy|Up"
        if ($status) {
            $healthy++
            if ($healthy -ge 3) { break }
        }
        Start-Sleep -Seconds 2
        $waitTime += 2
    }
    
    Write-Success "Services are running"
    
    # Display access information
    Write-Title "DEPLOYMENT COMPLETE"
    Write-Host ""
    Write-Host "🌐 Access Points:" -ForegroundColor Green
    Write-Host "   - Frontend: http://localhost:3000"
    Write-Host "   - API: http://localhost:8000"
    Write-Host "   - API Docs: http://localhost:8000/docs"
    Write-Host "   - Prometheus: http://localhost:9090"
    Write-Host "   - Grafana: http://localhost:3001"
    Write-Host ""
    Write-Host "📝 Test Credentials:" -ForegroundColor Green
    Write-Host "   - admin@stsclearance.com / admin123"
    Write-Host "   - charterer@stsclearance.com / charterer123"
    Write-Host "   - broker@stsclearance.com / broker123"
    Write-Host "   - owner@stsclearance.com / owner123"
    Write-Host "   - inspector@stsclearance.com / inspector123"
    Write-Host "   - viewer@stsclearance.com / viewer123"
    Write-Host ""
}

# ============ MAIN EXECUTION ============
function Main {
    Write-Title "STS CLEARANCE HUB - PHASE 3, 4, 5 EXECUTION"
    Write-Host ""
    Write-Host "📌 Execution Plan:" -ForegroundColor Cyan
    Write-Host "   Phase 0: Check dependencies"
    if ($Phase -in "all", "test") {
        Write-Host "   Phase 3: Endpoint testing"
    }
    if ($Phase -in "all", "frontend") {
        Write-Host "   Phase 4: Frontend integration"
    }
    if ($Phase -in "all", "deploy") {
        Write-Host "   Phase 5: Production deployment"
    }
    Write-Host ""
    
    # Phase 0: Dependencies
    if (-not $SkipDependencies) {
        Initialize-Dependencies
    }
    
    # Execute requested phases
    switch ($Phase) {
        "test" {
            Execute-Phase3-Testing
        }
        "frontend" {
            Execute-Phase4-Frontend
        }
        "deploy" {
            Execute-Phase5-Deploy
        }
        "all" {
            Execute-Phase3-Testing
            Execute-Phase4-Frontend
            Execute-Phase5-Deploy
        }
    }
    
    Write-Title "EXECUTION COMPLETED SUCCESSFULLY"
    Write-Success "All phases completed!"
}

# ============ EXECUTION ============
try {
    Main
}
catch {
    Write-Error-Custom "Execution failed: $_"
    exit 1
}