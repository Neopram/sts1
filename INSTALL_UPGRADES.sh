#!/bin/bash

# ============================================================================
# Installation Script for Document Management Upgrades
# ============================================================================
# Installs:
# 1. S3StorageService + OCRService
# 2. Python dependencies (pytesseract, pdf2image, pypdf)
# 3. Node.js dependencies (react-pdf, pdfjs-dist)
# ============================================================================

set -e

echo "🚀 Installing STS Document Management Upgrades..."
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Step 1: Install Python Dependencies
# ============================================================================

echo -e "${BLUE}📦 Step 1: Installing Python dependencies...${NC}"

cd "$(dirname "$0")/backend"

echo "  ▪ Checking Python version..."
python3 --version

echo "  ▪ Installing pip packages..."
pip install pytesseract==0.3.10 pdf2image==1.16.3 pypdf==3.17.1

echo -e "${GREEN}✅ Python dependencies installed${NC}"
echo ""

# ============================================================================
# Step 2: Install Node.js Dependencies
# ============================================================================

echo -e "${BLUE}📦 Step 2: Installing Node.js dependencies...${NC}"

cd "$(dirname "$0")"

if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  package.json not found. Skipping npm install.${NC}"
else
    echo "  ▪ Checking Node.js version..."
    node --version
    
    echo "  ▪ Checking npm version..."
    npm --version
    
    echo "  ▪ Installing npm packages..."
    npm install react-pdf@7.7.0 pdfjs-dist@4.0.379
    
    echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
fi

echo ""

# ============================================================================
# Step 3: Install Tesseract OCR (System Level)
# ============================================================================

echo -e "${BLUE}🔍 Step 3: Tesseract OCR Setup...${NC}"

OS_TYPE=$(uname -s)

if [ "$OS_TYPE" = "Linux" ]; then
    echo "  ▪ Detected Linux"
    echo "  ▪ Installing Tesseract..."
    
    if command -v apt-get &> /dev/null; then
        echo "    Using apt-get..."
        sudo apt-get update
        sudo apt-get install -y tesseract-ocr tesseract-ocr-all
    elif command -v yum &> /dev/null; then
        echo "    Using yum..."
        sudo yum install -y tesseract
    fi
    
    echo -e "${GREEN}✅ Tesseract installed${NC}"
    
elif [ "$OS_TYPE" = "Darwin" ]; then
    echo "  ▪ Detected macOS"
    echo "  ▪ Installing Tesseract with Homebrew..."
    
    if ! command -v brew &> /dev/null; then
        echo -e "${YELLOW}⚠️  Homebrew not found. Please install Tesseract manually:${NC}"
        echo "     brew install tesseract"
    else
        brew install tesseract
        echo -e "${GREEN}✅ Tesseract installed via Homebrew${NC}"
    fi
    
elif [ "$OS_TYPE" = "MINGW64_NT" ] || [ "$OS_TYPE" = "MSYS_NT" ]; then
    echo "  ▪ Detected Windows"
    echo -e "${YELLOW}⚠️  Windows detected. Please install Tesseract manually:${NC}"
    echo "     1. Download: https://github.com/UB-Mannheim/tesseract/wiki"
    echo "     2. Or use Chocolatey: choco install tesseract"
    echo "     3. Python will auto-detect the installation"
else
    echo -e "${YELLOW}⚠️  Unknown OS: $OS_TYPE${NC}"
    echo "     Please install Tesseract manually for your system"
fi

echo ""

# ============================================================================
# Step 4: Verify Installations
# ============================================================================

echo -e "${BLUE}✔️  Step 4: Verifying installations...${NC}"

echo ""
echo -e "${YELLOW}Python Packages:${NC}"

cd backend

python3 -c "import pytesseract; print('  ✅ pytesseract imported')" 2>/dev/null || echo "  ❌ pytesseract NOT found"
python3 -c "from pdf2image import convert_from_bytes; print('  ✅ pdf2image imported')" 2>/dev/null || echo "  ❌ pdf2image NOT found"
python3 -c "from pypdf import PdfReader; print('  ✅ pypdf imported')" 2>/dev/null || echo "  ❌ pypdf NOT found"
python3 -c "import boto3; print('  ✅ boto3 imported')" 2>/dev/null || echo "  ❌ boto3 NOT found"

echo ""
echo -e "${YELLOW}System Tools:${NC}"

if command -v tesseract &> /dev/null; then
    echo "  ✅ tesseract found:"
    tesseract --version | head -n 1 | sed 's/^/     /'
else
    echo "  ⚠️  tesseract NOT found in PATH"
    echo "     Install it manually or check PATH"
fi

echo ""
echo -e "${YELLOW}Node.js Packages:${NC}"

cd ..

if [ -d "node_modules/react-pdf" ]; then
    echo "  ✅ react-pdf installed"
else
    echo "  ⚠️  react-pdf NOT found"
fi

if [ -d "node_modules/pdfjs-dist" ]; then
    echo "  ✅ pdfjs-dist installed"
else
    echo "  ⚠️  pdfjs-dist NOT found"
fi

echo ""

# ============================================================================
# Step 5: Configuration
# ============================================================================

echo -e "${BLUE}⚙️  Step 5: Configuration${NC}"

echo ""
echo "Create or update your .env file:"
echo ""
echo "For LOCAL storage (development):"
echo "  STORAGE_TYPE=local"
echo "  ENABLE_OCR=true"
echo ""
echo "For S3 storage (production):"
echo "  STORAGE_TYPE=s3"
echo "  AWS_S3_BUCKET=sts-clearance-documents"
echo "  AWS_REGION=us-east-1"
echo "  AWS_ACCESS_KEY_ID=your_key"
echo "  AWS_SECRET_ACCESS_KEY=your_secret"
echo "  ENABLE_OCR=true"
echo ""

# ============================================================================
# Step 6: Summary
# ============================================================================

echo -e "${GREEN}=================================================="
echo "✅ Installation Complete!"
echo "==================================================${NC}"
echo ""
echo "📚 Files Added:"
echo "  • backend/app/services/storage_service.py (S3StorageService)"
echo "  • backend/app/services/ocr_service.py (OCRService)"
echo "  • src/components/Modals/PDFViewer.tsx"
echo "  • src/components/Modals/PDFViewer.simple.tsx"
echo ""
echo "🔧 Files Updated:"
echo "  • backend/requirements.txt (+3 packages)"
echo "  • package.json (+2 packages)"
echo "  • backend/app/routers/files.py (+proxy endpoint)"
echo ""
echo "📖 Documentation:"
echo "  • IMPLEMENTACION_TRES_MEJORAS.md (Complete guide)"
echo ""
echo "🚀 Next Steps:"
echo "  1. Review: cat IMPLEMENTACION_TRES_MEJORAS.md"
echo "  2. Configure: Update .env file"
echo "  3. Backend: cd backend && python run_server.py"
echo "  4. Frontend: npm run dev"
echo ""
echo "💡 Need Help?"
echo "  • S3 Setup: https://docs.aws.amazon.com/s3/"
echo "  • Tesseract: https://github.com/UB-Mannheim/tesseract"
echo "  • React PDF: https://react-pdf.org/"
echo ""