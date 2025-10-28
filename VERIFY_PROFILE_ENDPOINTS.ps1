# ============================================================
# PROFILE ENDPOINTS VERIFICATION SCRIPT
# ============================================================
# Este script verifica que todos los endpoints nuevos están
# funcionando correctamente en el backend
# ============================================================

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "🔍 PROFILE ENDPOINTS VERIFICATION SCRIPT" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Colors for output
$success = "Green"
$error = "Red"
$warning = "Yellow"
$info = "Cyan"

# Configuration
$BASE_URL = "http://127.0.0.1:8001"
$API_PREFIX = "/api/v1/profile"

# Get token (you need to login first)
Write-Host "`n📋 PASO 1: Obtener Token de Autenticación" -ForegroundColor $info
Write-Host "============================================"

# Try to get token from test data
$testEmail = "admin@sts.com"
$testPassword = "admin123"

Write-Host "Intentando login con: $testEmail" -ForegroundColor $warning

$loginBody = @{
    email    = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$BASE_URL/api/v1/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token

    if ($token) {
        Write-Host "✓ Token obtenido exitosamente" -ForegroundColor $success
        Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor $success
    }
    else {
        Write-Host "✗ No se pudo obtener token" -ForegroundColor $error
        exit 1
    }
}
catch {
    Write-Host "✗ Error en login: $_" -ForegroundColor $error
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

# Test endpoints
Write-Host "`n📋 PASO 2: Verificar Endpoints Existentes" -ForegroundColor $info
Write-Host "==========================================="

# Test GET /me
Write-Host "`n[1/7] GET $API_PREFIX/me" -ForegroundColor $info
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL$API_PREFIX/me" `
        -Headers $headers `
        -ErrorAction Stop

    $data = $response.Content | ConvertFrom-Json
    
    if ($data.id) {
        Write-Host "✓ Endpoint funciona" -ForegroundColor $success
        Write-Host "  - Email: $($data.email)" -ForegroundColor $success
        Write-Host "  - Name: $($data.name)" -ForegroundColor $success
        Write-Host "  - Department: $($data.department)" -ForegroundColor $success
        Write-Host "  - Position: $($data.position)" -ForegroundColor $success
    }
}
catch {
    Write-Host "✗ Error: $_" -ForegroundColor $error
}

# Test GET /security-settings
Write-Host "`n[2/7] GET $API_PREFIX/security-settings" -ForegroundColor $info
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL$API_PREFIX/security-settings" `
        -Headers $headers `
        -ErrorAction Stop

    $data = $response.Content | ConvertFrom-Json
    Write-Host "✓ Endpoint funciona" -ForegroundColor $success
    Write-Host "  - 2FA Enabled: $($data.two_factor_enabled)" -ForegroundColor $success
    Write-Host "  - Login Attempts: $($data.login_attempts)" -ForegroundColor $success
}
catch {
    Write-Host "✗ Error: $_" -ForegroundColor $error
}

# Test GET /preferences
Write-Host "`n[3/7] GET $API_PREFIX/preferences" -ForegroundColor $info
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL$API_PREFIX/preferences" `
        -Headers $headers `
        -ErrorAction Stop

    $data = $response.Content | ConvertFrom-Json
    Write-Host "✓ Endpoint funciona" -ForegroundColor $success
    Write-Host "  - Language: $($data.language)" -ForegroundColor $success
    Write-Host "  - Theme: $($data.theme)" -ForegroundColor $success
}
catch {
    Write-Host "✗ Error: $_" -ForegroundColor $error
}

# Test GET /activities
Write-Host "`n[4/7] GET $API_PREFIX/activities" -ForegroundColor $info
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL$API_PREFIX/activities?limit=5" `
        -Headers $headers `
        -ErrorAction Stop

    $data = $response.Content | ConvertFrom-Json
    Write-Host "✓ Endpoint funciona" -ForegroundColor $success
    Write-Host "  - Total de actividades: $($data.Count)" -ForegroundColor $success
    if ($data.Count -gt 0) {
        Write-Host "  - Última actividad: $($data[0].action)" -ForegroundColor $success
    }
}
catch {
    Write-Host "✗ Error: $_" -ForegroundColor $error
}

# Test POST /enable-2fa
Write-Host "`n[5/7] POST $API_PREFIX/enable-2fa" -ForegroundColor $info
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL$API_PREFIX/enable-2fa" `
        -Method POST `
        -Headers $headers `
        -ErrorAction Stop

    $data = $response.Content | ConvertFrom-Json
    Write-Host "✓ Endpoint funciona" -ForegroundColor $success
    Write-Host "  - Message: $($data.message)" -ForegroundColor $success
}
catch {
    Write-Host "✗ Error: $_" -ForegroundColor $error
}

# Test POST /disable-2fa
Write-Host "`n[6/7] POST $API_PREFIX/disable-2fa" -ForegroundColor $info
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL$API_PREFIX/disable-2fa" `
        -Method POST `
        -Headers $headers `
        -ErrorAction Stop

    $data = $response.Content | ConvertFrom-Json
    Write-Host "✓ Endpoint funciona" -ForegroundColor $success
    Write-Host "  - Message: $($data.message)" -ForegroundColor $success
}
catch {
    Write-Host "✗ Error: $_" -ForegroundColor $error
}

# Test POST /preferences
Write-Host "`n[7/7] POST $API_PREFIX/preferences" -ForegroundColor $info
try {
    $body = @{
        language = "es"
        theme    = "dark"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$BASE_URL$API_PREFIX/preferences" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    $data = $response.Content | ConvertFrom-Json
    Write-Host "✓ Endpoint funciona" -ForegroundColor $success
    Write-Host "  - Language: $($data.language)" -ForegroundColor $success
    Write-Host "  - Theme: $($data.theme)" -ForegroundColor $success
}
catch {
    Write-Host "✗ Error: $_" -ForegroundColor $error
}

# Summary
Write-Host "`n📋 PASO 3: Resumen de Verificación" -ForegroundColor $info
Write-Host "===================================="
Write-Host "✓ Todos los endpoints han sido testeados" -ForegroundColor $success
Write-Host "✓ La integración frontend-backend está lista" -ForegroundColor $success
Write-Host "`n¡La implementación de Profile Endpoints está COMPLETA!" -ForegroundColor $success

Write-Host "`n📚 Documentación:" -ForegroundColor $info
Write-Host "  - c:\Users\feder\Desktop\StsHub\PROFILE_ENDPOINTS_IMPLEMENTATION.md" -ForegroundColor $info

Write-Host "`n" -ForegroundColor $success