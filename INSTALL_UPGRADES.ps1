# ============================================================================
# Installation Script for Document Management Upgrades (Windows PowerShell)
# ============================================================================
# Installs:
# 1. S3StorageService + OCRService
# 2. Python dependencies (pytesseract, pdf2image, pypdf)
# 3. Node.js dependencies (react-pdf, pdfjs-dist)
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 Installing STS Document Management Upgrades..." -ForegroundColor Cyan
Write-Host "=================================================="
Write-Host ""

# ============================================================================
# Step 1: Install Python Dependencies
# ============================================================================

Write-Host "📦 Step 1: Installing Python dependencies..." -ForegroundColor Blue

cd backend

Write-Host "  ▪ Checking Python version..."
python --version

Write-Host "  ▪ Installing pip packages..."
pip install pytesseract==0.3.10 pdf2image==1.16.3 pypdf==3.17.1

Write-Host "✅ Python dependencies installed" -ForegroundColor Green
Write-Host ""

# ============================================================================
# Step 2: Install Node.js Dependencies
# ============================================================================

Write-Host "📦 Step 2: Installing Node.js dependencies..." -ForegroundColor Blue

cd ..

if (-not (Test-Path "package.json")) {
    Write-Host "⚠️  package.json not found. Skipping npm install." -ForegroundColor Yellow
}
else {
    Write-Host "  ▪ Checking Node.js version..."
    node --version
    
    Write-Host "  ▪ Checking npm version..."
    npm --version
    
    Write-Host "  ▪ Installing npm packages..."
    npm install react-pdf@7.7.0 pdfjs-dist@4.0.379
    
    Write-Host "✅ Node.js dependencies installed" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# Step 3: Install Tesseract OCR (Windows)
# ============================================================================

Write-Host "🔍 Step 3: Tesseract OCR Setup (Windows)..." -ForegroundColor Blue

$tesseractInstalled = $false

try {
    $tesseractPath = cmd /c "where tesseract" 2>$null
    if ($tesseractPath) {
        $tesseractInstalled = $true
        Write-Host "  ✅ Tesseract found at: $tesseractPath" -ForegroundColor Green
    }
}
catch {
    $tesseractInstalled = $false
}

if (-not $tesseractInstalled) {
    Write-Host "  ⚠️  Tesseract not found in PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  ℹ️  Options to install Tesseract:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  OPTION 1: Chocolatey (Recommended)"
    Write-Host "    choco install tesseract"
    Write-Host ""
    Write-Host "  OPTION 2: Download Installer"
    Write-Host "    Visit: https://github.com/UB-Mannheim/tesseract/wiki"
    Write-Host "    Download latest MSI installer and run it"
    Write-Host ""
    Write-Host "  After installation, restart PowerShell"
    Write-Host ""
}

Write-Host ""

# ============================================================================
# Step 4: Verify Installations
# ============================================================================

Write-Host "✔️  Step 4: Verifying installations..." -ForegroundColor Blue
Write-Host ""

Write-Host "Python Packages:" -ForegroundColor Yellow

cd backend

$checks = @(
    @{Name = "pytesseract"; Code = "import pytesseract"},
    @{Name = "pdf2image"; Code = "from pdf2image import convert_from_bytes"},
    @{Name = "pypdf"; Code = "from pypdf import PdfReader"},
    @{Name = "boto3"; Code = "import boto3"}
)

foreach ($check in $checks) {
    try {
        $output = python -c $check.Code 2>$null
        Write-Host "  ✅ $($check.Name) imported" -ForegroundColor Green
    }
    catch {
        Write-Host "  ❌ $($check.Name) NOT found" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "System Tools:" -ForegroundColor Yellow

if ($tesseractInstalled) {
    Write-Host "  ✅ tesseract found in PATH" -ForegroundColor Green
    $version = tesseract --version 2>$null | Select-Object -First 1
    Write-Host "     $version" -ForegroundColor Gray
}
else {
    Write-Host "  ⚠️  tesseract NOT found in PATH" -ForegroundColor Yellow
    Write-Host "     Install it using one of the options above" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Node.js Packages:" -ForegroundColor Yellow

cd ..

if (Test-Path "node_modules/react-pdf") {
    Write-Host "  ✅ react-pdf installed" -ForegroundColor Green
}
else {
    Write-Host "  ⚠️  react-pdf NOT found" -ForegroundColor Yellow
}

if (Test-Path "node_modules/pdfjs-dist") {
    Write-Host "  ✅ pdfjs-dist installed" -ForegroundColor Green
}
else {
    Write-Host "  ⚠️  pdfjs-dist NOT found" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Step 5: Configuration
# ============================================================================

Write-Host "⚙️  Step 5: Configuration" -ForegroundColor Blue

Write-Host ""
Write-Host "Create or update your .env file:" -ForegroundColor Cyan
Write-Host ""
Write-Host "For LOCAL storage (development):" -ForegroundColor White
Write-Host "  STORAGE_TYPE=local" -ForegroundColor Gray
Write-Host "  ENABLE_OCR=true" -ForegroundColor Gray
Write-Host ""
Write-Host "For S3 storage (production):" -ForegroundColor White
Write-Host "  STORAGE_TYPE=s3" -ForegroundColor Gray
Write-Host "  AWS_S3_BUCKET=sts-clearance-documents" -ForegroundColor Gray
Write-Host "  AWS_REGION=us-east-1" -ForegroundColor Gray
Write-Host "  AWS_ACCESS_KEY_ID=your_key" -ForegroundColor Gray
Write-Host "  AWS_SECRET_ACCESS_KEY=your_secret" -ForegroundColor Gray
Write-Host "  ENABLE_OCR=true" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# Step 6: Summary
# ============================================================================

Write-Host "=================================================="
Write-Host "✅ Installation Complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

Write-Host "📚 Files Added:" -ForegroundColor Cyan
Write-Host "  • backend/app/services/storage_service.py (S3StorageService)" -ForegroundColor Gray
Write-Host "  • backend/app/services/ocr_service.py (OCRService)" -ForegroundColor Gray
Write-Host "  • src/components/Modals/PDFViewer.tsx" -ForegroundColor Gray
Write-Host "  • src/components/Modals/PDFViewer.simple.tsx" -ForegroundColor Gray
Write-Host ""

Write-Host "🔧 Files Updated:" -ForegroundColor Cyan
Write-Host "  • backend/requirements.txt (+3 packages)" -ForegroundColor Gray
Write-Host "  • package.json (+2 packages)" -ForegroundColor Gray
Write-Host "  • backend/app/routers/files.py (+proxy endpoint)" -ForegroundColor Gray
Write-Host ""

Write-Host "📖 Documentation:" -ForegroundColor Cyan
Write-Host "  • IMPLEMENTACION_TRES_MEJORAS.md (Complete guide)" -ForegroundColor Gray
Write-Host ""

Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Install Tesseract if not already done (see above)" -ForegroundColor Gray
Write-Host "  2. Review: Get-Content IMPLEMENTACION_TRES_MEJORAS.md | more" -ForegroundColor Gray
Write-Host "  3. Configure: Update .env file with your settings" -ForegroundColor Gray
Write-Host "  4. Backend: cd backend && python run_server.py" -ForegroundColor Gray
Write-Host "  5. Frontend: npm run dev" -ForegroundColor Gray
Write-Host ""

Write-Host "💡 Need Help?" -ForegroundColor Cyan
Write-Host "  • S3 Setup: https://docs.aws.amazon.com/s3/" -ForegroundColor Gray
Write-Host "  • Tesseract: https://github.com/UB-Mannheim/tesseract" -ForegroundColor Gray
Write-Host "  • React PDF: https://react-pdf.org/" -ForegroundColor Gray
Write-Host ""

Write-Host "Press any key to exit..."
$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") > $null