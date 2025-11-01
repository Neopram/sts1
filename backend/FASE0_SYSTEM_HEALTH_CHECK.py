#!/usr/bin/env python3
"""
FASE 0: SYSTEM HEALTH CHECK
Verifica el estado completo del sistema y todas las dependencias
Ejecución: python FASE0_SYSTEM_HEALTH_CHECK.py
"""

import sys
import os
import subprocess
from pathlib import Path
from datetime import datetime
import json

# Color codes for terminal
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'

class SystemHealthCheck:
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "status": "UNKNOWN",
            "checks": {},
            "issues": [],
            "warnings": [],
        }
        self.backend_path = Path(__file__).parent
        self.project_root = self.backend_path.parent
        
    def print_header(self, title):
        """Print section header"""
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}")
        print(f"  {title}")
        print(f"{'='*60}{Colors.END}\n")
    
    def print_check(self, name, status, message=""):
        """Print individual check result"""
        symbol = f"{Colors.GREEN}✅{Colors.END}" if status else f"{Colors.RED}❌{Colors.END}"
        print(f"{symbol} {name}")
        if message:
            print(f"   {Colors.YELLOW}{message}{Colors.END}")
        return status
    
    def print_warning(self, message):
        """Print warning"""
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")
        self.results["warnings"].append(message)
    
    def print_error(self, message):
        """Print error"""
        print(f"{Colors.RED}❌ {message}{Colors.END}")
        self.results["issues"].append(message)
    
    def print_success(self, message):
        """Print success"""
        print(f"{Colors.GREEN}✅ {message}{Colors.END}")
    
    # ========== CHECKS ==========
    
    def check_python_version(self):
        """Check Python version"""
        self.print_header("1. PYTHON CONFIGURATION")
        
        version_info = sys.version_info
        print(f"Python version: {version_info.major}.{version_info.minor}.{version_info.micro}")
        
        if version_info.major >= 3 and version_info.minor >= 8:
            result = self.print_check("Python version", True, "3.8+")
        else:
            result = self.print_check("Python version", False, f"Required: 3.8+, Found: {version_info.major}.{version_info.minor}")
            self.print_error("Python version too old")
        
        self.results["checks"]["python_version"] = result
        return result
    
    def check_virtual_env(self):
        """Check if running in virtual environment"""
        self.print_header("2. VIRTUAL ENVIRONMENT")
        
        venv_path = self.project_root / ".venv"
        in_venv = hasattr(sys, 'real_prefix') or (
            hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix
        )
        
        print(f"Virtual env path: {venv_path}")
        print(f"Current Python: {sys.executable}")
        
        result = self.print_check("Virtual environment", in_venv)
        self.results["checks"]["virtual_env"] = result
        
        if not in_venv:
            self.print_warning("Not running in virtual environment")
            self.print_warning("Activate it: .venv\\Scripts\\Activate.ps1")
        
        return result
    
    def check_dependencies(self):
        """Check required Python packages"""
        self.print_header("3. PYTHON DEPENDENCIES")
        
        required_packages = {
            "fastapi": "0.104.1",
            "uvicorn": "0.24.0",
            "sqlalchemy": "2.0.23",
            "pydantic": "2.12.3",
            "python-jose": "3.3.0",
            "passlib": "1.7.4",
            "websockets": "12.0",
            "redis": "5.0.1",
        }
        
        all_good = True
        for package, version in required_packages.items():
            try:
                __import__(package.replace("-", "_"))
                status = True
                msg = f"{version}"
            except ImportError:
                status = False
                msg = "NOT INSTALLED"
                all_good = False
                self.print_error(f"Missing: {package}")
            
            self.print_check(f"  {package}", status, msg)
        
        self.results["checks"]["dependencies"] = all_good
        return all_good
    
    def check_database(self):
        """Check database connectivity"""
        self.print_header("4. DATABASE CONFIGURATION")
        
        try:
            # Import database module
            sys.path.insert(0, str(self.backend_path))
            from app.config.settings import Settings
            
            settings = Settings()
            db_url = settings.database_url
            
            print(f"Database URL: {db_url}")
            
            # Check if SQLite file exists
            if "sqlite" in db_url:
                db_file = db_url.split("///")[-1]
                db_path = Path(db_file)
                
                if db_path.exists():
                    size = db_path.stat().st_size / 1024 / 1024  # MB
                    print(f"SQLite file: {db_path} ({size:.2f} MB)")
                    result = self.print_check("Database file", True)
                else:
                    print(f"SQLite file not found: {db_path}")
                    result = self.print_check("Database file", False, "Will be created on first run")
            else:
                print(f"Using PostgreSQL")
                result = True
                self.print_check("Database type", True, "PostgreSQL")
            
            self.results["checks"]["database"] = result
            return result
            
        except Exception as e:
            self.print_error(f"Database check failed: {str(e)}")
            self.results["checks"]["database"] = False
            return False
    
    def check_models(self):
        """Check if all models are defined"""
        self.print_header("5. DATABASE MODELS")
        
        try:
            sys.path.insert(0, str(self.backend_path))
            from app.models import (
                User, Room, Document, Party, Approval,
                Message, Notification, Vessel, ActivityLog,
                DocumentType, Metric, PartyMetric
            )
            
            models = {
                "User": User,
                "Room": Room,
                "Document": Document,
                "Party": Party,
                "Approval": Approval,
                "Message": Message,
                "Notification": Notification,
                "Vessel": Vessel,
                "ActivityLog": ActivityLog,
                "DocumentType": DocumentType,
                "Metric": Metric,
                "PartyMetric": PartyMetric,
            }
            
            for model_name, model_class in models.items():
                print(f"  {model_name}: {model_class.__tablename__}")
            
            result = self.print_check("All models loaded", True, f"{len(models)} models")
            self.results["checks"]["models"] = result
            return result
            
        except Exception as e:
            self.print_error(f"Model check failed: {str(e)}")
            self.results["checks"]["models"] = False
            return False
    
    def check_routers(self):
        """Check if all routers are available"""
        self.print_header("6. API ROUTERS")
        
        try:
            sys.path.insert(0, str(self.backend_path))
            from app.routers import (
                auth, dashboard, rooms, documents, approvals,
                notifications, messages, users, vessels
            )
            
            routers = {
                "auth": auth.router,
                "dashboard": dashboard.router,
                "rooms": rooms.router,
                "documents": documents.router,
                "approvals": approvals.router,
                "notifications": notifications.router,
                "messages": messages.router,
                "users": users.router,
                "vessels": vessels.router,
            }
            
            for router_name, router in routers.items():
                route_count = len(router.routes)
                print(f"  {router_name}: {route_count} routes")
            
            result = self.print_check("All routers loaded", True, f"{len(routers)} routers")
            self.results["checks"]["routers"] = result
            return result
            
        except Exception as e:
            self.print_error(f"Router check failed: {str(e)}")
            self.results["checks"]["routers"] = False
            return False
    
    def check_services(self):
        """Check if all services are available"""
        self.print_header("7. BUSINESS SERVICES")
        
        try:
            sys.path.insert(0, str(self.backend_path))
            from app.services import (
                commission_service,
                demurrage_service,
                compliance_service,
                notification_service,
                dashboard_projection_service,
                missing_documents_service,
            )
            
            services = {
                "CommissionService": commission_service,
                "DemurrageService": demurrage_service,
                "ComplianceService": compliance_service,
                "NotificationService": notification_service,
                "DashboardProjectionService": dashboard_projection_service,
                "MissingDocumentsService": missing_documents_service,
            }
            
            for service_name in services:
                print(f"  {service_name}")
            
            result = self.print_check("Core services available", True, f"{len(services)} services")
            self.results["checks"]["services"] = result
            return result
            
        except Exception as e:
            self.print_error(f"Service check failed: {str(e)}")
            self.results["checks"]["services"] = False
            return False
    
    def check_file_structure(self):
        """Check if all required files exist"""
        self.print_header("8. FILE STRUCTURE")
        
        required_files = {
            "main.py": self.backend_path / "app" / "main.py",
            "models.py": self.backend_path / "app" / "models.py",
            "database.py": self.backend_path / "app" / "database.py",
            "requirements.txt": self.backend_path / "requirements.txt",
            "alembic.ini": self.backend_path / "alembic.ini",
        }
        
        all_exist = True
        for name, path in required_files.items():
            exists = path.exists()
            if not exists:
                all_exist = False
                self.print_error(f"Missing: {path}")
            else:
                print(f"  ✅ {name}")
        
        self.results["checks"]["file_structure"] = all_exist
        return all_exist
    
    def check_environment_variables(self):
        """Check environment variables"""
        self.print_header("9. ENVIRONMENT VARIABLES")
        
        required_vars = [
            "DATABASE_URL",
            "JWT_SECRET_KEY",
        ]
        
        optional_vars = [
            "REDIS_URL",
            "AWS_S3_BUCKET",
            "SMTP_HOST",
        ]
        
        all_good = True
        for var in required_vars:
            if var in os.environ:
                print(f"  ✅ {var} = {os.environ[var][:20]}...")
            else:
                print(f"  ❌ {var} (MISSING)")
                all_good = False
        
        print(f"\nOptional variables:")
        for var in optional_vars:
            if var in os.environ:
                print(f"  ✅ {var}")
            else:
                print(f"  ⚠️  {var}")
        
        self.results["checks"]["environment"] = all_good
        return all_good
    
    def check_frontend(self):
        """Check frontend setup"""
        self.print_header("10. FRONTEND SETUP")
        
        frontend_path = self.project_root / "src"
        package_json = self.project_root / "package.json"
        node_modules = self.project_root / "node_modules"
        
        checks = {
            "Source directory": frontend_path.exists(),
            "package.json": package_json.exists(),
            "node_modules": node_modules.exists(),
        }
        
        all_good = True
        for check_name, status in checks.items():
            self.print_check(f"  {check_name}", status)
            all_good = all_good and status
        
        self.results["checks"]["frontend"] = all_good
        return all_good
    
    def generate_summary(self):
        """Generate final summary"""
        self.print_header("SUMMARY")
        
        checks = self.results["checks"]
        total = len(checks)
        passed = sum(1 for v in checks.values() if v)
        
        print(f"Checks passed: {passed}/{total}")
        
        if self.results["warnings"]:
            print(f"\n{Colors.YELLOW}Warnings ({len(self.results['warnings'])}):{Colors.END}")
            for warning in self.results["warnings"]:
                print(f"  ⚠️  {warning}")
        
        if self.results["issues"]:
            print(f"\n{Colors.RED}Issues ({len(self.results['issues'])}):{Colors.END}")
            for issue in self.results["issues"]:
                print(f"  ❌ {issue}")
        
        if passed == total:
            self.results["status"] = "HEALTHY"
            print(f"\n{Colors.GREEN}{Colors.BOLD}✅ SISTEMA EN CONDICIONES PERFECTAS PARA FASE 0{Colors.END}")
        elif passed >= total * 0.8:
            self.results["status"] = "ACCEPTABLE"
            print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️  SISTEMA ACEPTABLE (resuelve warnings){Colors.END}")
        else:
            self.results["status"] = "CRITICAL"
            print(f"\n{Colors.RED}{Colors.BOLD}❌ SISTEMA CON PROBLEMAS CRÍTICOS{Colors.END}")
        
        print(f"\nTiempo: {self.results['timestamp']}")
    
    def save_results(self):
        """Save results to JSON file"""
        results_file = self.backend_path / "FASE0_HEALTH_CHECK_RESULTS.json"
        with open(results_file, "w") as f:
            json.dump(self.results, f, indent=2)
        print(f"\n📊 Resultados guardados en: {results_file}")
    
    def run_all_checks(self):
        """Run all system checks"""
        print(f"{Colors.BOLD}{Colors.CYAN}")
        print("╔════════════════════════════════════════════════════════════╗")
        print("║  FASE 0: SYSTEM HEALTH CHECK - STS CLEARANCE HUB          ║")
        print("║  Verification: All systems before Phase 0                 ║")
        print("╚════════════════════════════════════════════════════════════╝")
        print(f"{Colors.END}")
        
        try:
            # Run all checks
            self.check_python_version()
            self.check_virtual_env()
            self.check_dependencies()
            self.check_file_structure()
            self.check_environment_variables()
            self.check_database()
            self.check_models()
            self.check_routers()
            self.check_services()
            self.check_frontend()
            
            # Generate summary
            self.generate_summary()
            self.save_results()
            
            # Return exit code
            if self.results["status"] == "HEALTHY":
                return 0
            elif self.results["status"] == "ACCEPTABLE":
                return 1
            else:
                return 2
                
        except Exception as e:
            print(f"\n{Colors.RED}FATAL ERROR: {str(e)}{Colors.END}")
            return 3

def main():
    """Main entry point"""
    checker = SystemHealthCheck()
    exit_code = checker.run_all_checks()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()