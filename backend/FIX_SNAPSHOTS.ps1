#!/usr/bin/env powershell
<#
.SYNOPSIS
    Fix missing Snapshots feature - STS Clearance Application
    
.DESCRIPTION
    This script fixes the issue where snapshots are not working by:
    1. Creating the feature_flags table if it doesn't exist
    2. Enabling the cockpit_missing_expiring_docs flag
    3. Verifying the fix
    
.EXAMPLE
    .\FIX_SNAPSHOTS.ps1
#>

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$VerbosePreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }

# Colors for output
$Colors = @{
    Green  = [Console]::ForegroundColor = "Green"
    Red    = [Console]::ForegroundColor = "Red"
    Yellow = [Console]::ForegroundColor = "Yellow"
    Cyan   = [Console]::ForegroundColor = "Cyan"
    Reset  = [Console]::ResetColor()
}

function Write-Status {
    param($Message, $Color = "Cyan")
    
    $foreground = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Host $Message
    $host.UI.RawUI.ForegroundColor = $foreground
}

function Write-Success {
    param($Message)
    Write-Status "✅ $Message" "Green"
}

function Write-Error-Custom {
    param($Message)
    Write-Status "❌ $Message" "Red"
}

function Write-Warning-Custom {
    param($Message)
    Write-Status "⚠️  $Message" "Yellow"
}

Write-Status "`n🔧 STS Clearance - Snapshots Fix Script`n" "Cyan"

# Check if Python is installed
Write-Status "Checking Python installation..." "Cyan"
try {
    $pythonVersion = python --version 2>&1
    Write-Success "Python found: $pythonVersion"
} catch {
    Write-Error-Custom "Python not found. Please install Python 3.8+"
    exit 1
}

# Change to backend directory
$backendPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path "$backendPath\app")) {
    Write-Error-Custom "Backend directory not found at $backendPath"
    exit 1
}

Write-Status "`nRunning fix script..." "Cyan"

# Run the Python fix script
$pythonScript = @"
import asyncio
import sys
from sqlalchemy import text, select
from app.database import AsyncSessionLocal
from app.models import FeatureFlag

async def fix_snapshots():
    session = AsyncSessionLocal()
    try:
        print("\n1️⃣  Checking feature_flags table...")
        
        # Try to create the table if it doesn't exist
        try:
            await session.execute(text('SELECT 1 FROM feature_flags LIMIT 1'))
            print("   ✅ Table exists")
        except:
            print("   Creating feature_flags table...")
            await session.execute(text('''
                CREATE TABLE IF NOT EXISTS feature_flags (
                    key VARCHAR(100) PRIMARY KEY,
                    enabled BOOLEAN NOT NULL DEFAULT 1
                )
            '''))
            await session.commit()
            print("   ✅ Table created")
        
        print("\n2️⃣  Setting cockpit_missing_expiring_docs flag...")
        
        # Check if flag exists
        flag_result = await session.execute(
            select(FeatureFlag).where(FeatureFlag.key == 'cockpit_missing_expiring_docs')
        )
        flag = flag_result.scalar_one_or_none()
        
        if flag:
            if flag.enabled:
                print("   ✅ Flag already enabled")
            else:
                flag.enabled = True
                session.add(flag)
                await session.commit()
                print("   ✅ Flag enabled")
        else:
            new_flag = FeatureFlag(key='cockpit_missing_expiring_docs', enabled=True)
            session.add(new_flag)
            await session.commit()
            print("   ✅ Flag created and enabled")
        
        print("\n3️⃣  Verifying fix...")
        
        # Verify
        verify_result = await session.execute(
            select(FeatureFlag).where(FeatureFlag.key == 'cockpit_missing_expiring_docs')
        )
        final_flag = verify_result.scalar_one_or_none()
        
        if final_flag and final_flag.enabled:
            print("   ✅ Verification successful!")
            print("\n" + "="*60)
            print("✅ FIX COMPLETE - Snapshots should now work!")
            print("="*60)
            print("\n📸 You can now:")
            print("   • Generate snapshots in the Overview page")
            print("   • View room summaries")
            print("   • Upload and view documents")
            print("\n🚀 Try clicking 'Generate Snapshot' button in the app!")
            return True
        else:
            print("   ❌ Verification failed")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await session.close()

result = asyncio.run(fix_snapshots())
sys.exit(0 if result else 1)
"@

# Execute Python script
Push-Location $backendPath
try {
    python -c $pythonScript
    if ($LASTEXITCODE -eq 0) {
        Write-Status "`n✅ Fix completed successfully!`n" "Green"
    } else {
        Write-Error-Custom "Fix encountered an error"
        exit 1
    }
} catch {
    Write-Error-Custom "Failed to execute fix: $_"
    exit 1
} finally {
    Pop-Location
}

# Provide next steps
Write-Status "`n📋 NEXT STEPS:`n" "Cyan"
Write-Host "1. Refresh your browser (F5 or Ctrl+Shift+R)"
Write-Host "2. Navigate to the Overview page"
Write-Host "3. Click the 'Generate Snapshot' button"
Write-Host "4. A PDF with the room status should download"
Write-Host ""
Write-Status "For more information, see: SNAPSHOT_FIX_DIAGNOSTICO.md" "Cyan"
Write-Host ""