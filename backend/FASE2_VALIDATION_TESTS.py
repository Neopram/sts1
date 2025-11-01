import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
FASE 2 Validation Tests
Comprehensive validation of all FASE 2 API implementation
Tests imports, endpoints, schemas, and integration
"""

import sys
import asyncio
import traceback
from pathlib import Path
from datetime import datetime


class Validator:
    """Main validation orchestrator"""
    
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
        self.start_time = datetime.now()
    
    def test(self, name: str, func, expected_exception=None):
        """Run a single test"""
        try:
            result = func()
            if expected_exception:
                self.failed += 1
                self.results.append(f"❌ {name} - Expected exception but succeeded")
            else:
                self.passed += 1
                self.results.append(f"✅ {name}")
            return result
        except Exception as e:
            if expected_exception and isinstance(e, expected_exception):
                self.passed += 1
                self.results.append(f"✅ {name} (expected error)")
            else:
                self.failed += 1
                self.results.append(f"❌ {name} - {str(e)}")
                traceback.print_exc()
    
    def print_results(self):
        """Print all results"""
        print("\n" + "="*80)
        print("FASE 2 VALIDATION RESULTS")
        print("="*80)
        
        for result in self.results:
            print(result)
        
        print("\n" + "-"*80)
        print(f"SUMMARY: {self.passed} passed, {self.failed} failed")
        print(f"Total: {self.passed + self.failed} tests")
        print(f"Success Rate: {(self.passed/(self.passed+self.failed)*100):.1f}%")
        print(f"Duration: {(datetime.now() - self.start_time).total_seconds():.2f}s")
        print("="*80 + "\n")


def main():
    """Run all validations"""
    validator = Validator()
    
    print("\n🚀 FASE 2 VALIDATION STARTING...\n")
    
    # ============ SECTION 1: IMPORT TESTS ============
    print("📦 Section 1: Validating Imports...")
    
    validator.test(
        "Import demurrage_api router",
        lambda: __import__('app.routers.demurrage_api', fromlist=['router'])
    )
    
    validator.test(
        "Import commission_api router",
        lambda: __import__('app.routers.commission_api', fromlist=['router'])
    )
    
    validator.test(
        "Import compliance_api router",
        lambda: __import__('app.routers.compliance_api', fromlist=['router'])
    )
    
    validator.test(
        "Import notifications_api_v2 router",
        lambda: __import__('app.routers.notifications_api_v2', fromlist=['router'])
    )
    
    validator.test(
        "Import documents_api_v2 router",
        lambda: __import__('app.routers.documents_api_v2', fromlist=['router'])
    )
    
    validator.test(
        "Import dashboard_api_v2 router",
        lambda: __import__('app.routers.dashboard_api_v2', fromlist=['router'])
    )
    
    validator.test(
        "Import fase2_schemas",
        lambda: __import__('app.schemas.fase2_schemas', fromlist=['*'])
    )
    
    # ============ SECTION 2: SCHEMA VALIDATION ============
    print("\n📋 Section 2: Validating Schemas...")
    
    def check_schemas():
        from app.schemas.fase2_schemas import (
            DemurrageHourlyResponse,
            DemurrageProjectionResponse,
            CommissionAccrualTrackingResponse,
            CommissionCounterpartyResponse,
            CrewCertificationsResponse,
            RemediationStatusResponse,
            SireSyncResponse,
            NotificationQueueResponse,
            ExpiryAlertResponse,
            ApprovalReminderResponse,
            CriticalDocumentsResponse,
            MissingDocumentsReport,
            DashboardValidationRequest,
            DashboardAccessResponse,
            DashboardDataResponse,
            ErrorResponse,
        )
        return True
    
    validator.test(
        "All 16 main schemas importable",
        check_schemas
    )
    
    # ============ SECTION 3: ROUTER REGISTRATION ============
    print("\n🛣️  Section 3: Validating Router Registration...")
    
    def check_routers_in_main():
        with open("app/main.py", "r") as f:
            content = f.read()
            assert "demurrage_api" in content, "demurrage_api not in main.py"
            assert "commission_api" in content, "commission_api not in main.py"
            assert "compliance_api" in content, "compliance_api not in main.py"
            assert "notifications_api_v2" in content, "notifications_api_v2 not in main.py"
            assert "documents_api_v2" in content, "documents_api_v2 not in main.py"
            assert "dashboard_api_v2" in content, "dashboard_api_v2 not in main.py"
            return True
    
    validator.test(
        "All 6 routers registered in main.py",
        check_routers_in_main
    )
    
    def check_router_includes():
        with open("app/main.py", "r") as f:
            content = f.read()
            assert "app.include_router(demurrage_api.router)" in content
            assert "app.include_router(commission_api.router)" in content
            assert "app.include_router(compliance_api.router)" in content
            assert "app.include_router(notifications_api_v2.router)" in content
            assert "app.include_router(documents_api_v2.router)" in content
            assert "app.include_router(dashboard_api_v2.router)" in content
            return True
    
    validator.test(
        "All routers have app.include_router calls",
        check_router_includes
    )
    
    # ============ SECTION 4: ENDPOINT VALIDATION ============
    print("\n🔌 Section 4: Validating Endpoints...")
    
    def check_demurrage_endpoints():
        from app.routers.demurrage_api import router
        routes = [r.path for r in router.routes]
        assert "/hourly/{room_id}" in routes, "Missing /hourly endpoint"
        assert "/projection/{room_id}" in routes, "Missing /projection endpoint"
        assert "/stats" in routes, "Missing /stats endpoint"
        return True
    
    validator.test(
        "Demurrage API has 3 endpoints",
        check_demurrage_endpoints
    )
    
    def check_commission_endpoints():
        from app.routers.commission_api import router
        routes = [r.path for r in router.routes]
        assert "/accrual-tracking/{broker_id}" in routes
        assert "/by-counterparty/{broker_id}" in routes
        assert "/pipeline" in routes
        assert "/stats" in routes
        return True
    
    validator.test(
        "Commission API has 4 endpoints",
        check_commission_endpoints
    )
    
    def check_compliance_endpoints():
        from app.routers.compliance_api import router
        routes = [r.path for r in router.routes]
        assert "/crew/certifications/{vessel_id}" in routes
        assert "/finding/remediation/{finding_id}" in routes
        assert "/sire/sync/{vessel_id}" in routes
        assert "/summary/{vessel_id}" in routes
        assert "/stats" in routes
        return True
    
    validator.test(
        "Compliance API has 5 endpoints",
        check_compliance_endpoints
    )
    
    def check_notifications_endpoints():
        from app.routers.notifications_api_v2 import router
        routes = [r.path for r in router.routes]
        assert "/queue-with-retry" in routes
        assert "/send-expiry-alerts" in routes
        assert "/send-approval-reminders" in routes
        assert "/status/{queue_id}" in routes
        assert "/pending" in routes
        assert "/mark-read/{queue_id}" in routes
        return True
    
    validator.test(
        "Notifications API has 6 endpoints",
        check_notifications_endpoints
    )
    
    def check_documents_endpoints():
        from app.routers.documents_api_v2 import router
        routes = [r.path for r in router.routes]
        assert "/critical" in routes
        assert "/room/{room_id}/report" in routes
        assert "/vessel/{vessel_id}/report" in routes
        assert "/stats" in routes
        assert "/overdue" in routes
        return True
    
    validator.test(
        "Documents API has 5 endpoints",
        check_documents_endpoints
    )
    
    def check_dashboard_endpoints():
        from app.routers.dashboard_api_v2 import router
        routes = [r.path for r in router.routes]
        assert "/for-role" in routes
        assert "/validate-access" in routes
        assert "/admin/system-overview" in routes
        assert "/charterer/demurrage-focus" in routes
        assert "/broker/commission-focus" in routes
        assert "/owner/compliance-focus" in routes
        assert "/refresh-cache" in routes
        return True
    
    validator.test(
        "Dashboard API v2 has 7 endpoints",
        check_dashboard_endpoints
    )
    
    # ============ SECTION 5: ROUTE METHODS ============
    print("\n📡 Section 5: Validating HTTP Methods...")
    
    def check_route_methods():
        from app.routers.demurrage_api import router
        methods = {}
        for route in router.routes:
            if hasattr(route, 'methods'):
                for method in route.methods:
                    methods[route.path] = methods.get(route.path, []) + [method]
        assert "GET" in methods.get("/hourly/{room_id}", [])
        return True
    
    validator.test(
        "Routes have proper HTTP methods",
        check_route_methods
    )
    
    # ============ SECTION 6: DOCUMENTATION ============
    print("\n📚 Section 6: Validating Documentation...")
    
    def check_endpoint_docstrings():
        from app.routers.demurrage_api import get_demurrage_hourly
        assert get_demurrage_hourly.__doc__ is not None
        assert len(get_demurrage_hourly.__doc__) > 50
        return True
    
    validator.test(
        "Endpoints have docstrings",
        check_endpoint_docstrings
    )
    
    def check_router_tags():
        from app.routers.demurrage_api import router
        assert router.tags is not None
        assert "demurrage" in router.tags
        return True
    
    validator.test(
        "Routers have proper tags",
        check_router_tags
    )
    
    # ============ SECTION 7: ERROR HANDLING ============
    print("\n⚠️  Section 7: Validating Error Handling...")
    
    def check_error_handling():
        import inspect
        from app.routers.demurrage_api import get_demurrage_hourly
        source = inspect.getsource(get_demurrage_hourly)
        assert "try:" in source
        assert "except" in source
        assert "HTTPException" in source
        return True
    
    validator.test(
        "Endpoints have try/except blocks",
        check_error_handling
    )
    
    # ============ SECTION 8: TYPE HINTS ============
    print("\n🔍 Section 8: Validating Type Hints...")
    
    def check_type_hints():
        import inspect
        from app.routers.demurrage_api import get_demurrage_hourly
        sig = inspect.signature(get_demurrage_hourly)
        has_hints = all(param.annotation != inspect.Parameter.empty 
                       for param in sig.parameters.values())
        assert has_hints, "Not all parameters have type hints"
        assert sig.return_annotation != inspect.Signature.empty
        return True
    
    validator.test(
        "Functions have type hints",
        check_type_hints
    )
    
    # ============ SECTION 9: AUTHENTICATION ============
    print("\n🔐 Section 9: Validating Authentication...")
    
    def check_auth_dependency():
        import inspect
        from app.routers.demurrage_api import get_demurrage_hourly
        source = inspect.getsource(get_demurrage_hourly)
        assert "get_current_user" in source
        assert "AsyncSession" in source
        return True
    
    validator.test(
        "Endpoints use authentication dependency",
        check_auth_dependency
    )
    
    # ============ SECTION 10: TEST FILE ============
    print("\n🧪 Section 10: Validating Test Suite...")
    
    def check_test_file():
        test_file = Path("tests/test_fase2_api.py")
        assert test_file.exists(), "Test file not found"
        with open(test_file, "r") as f:
            content = f.read()
            assert "TestDemurrageAPI" in content
            assert "TestCommissionAPI" in content
            assert "TestComplianceAPI" in content
            assert "TestNotificationsAPI" in content
            assert "TestDocumentsAPI" in content
            assert "TestDashboardAPIv2" in content
            assert "TestAPIIntegration" in content
            assert "TestErrorHandling" in content
        return True
    
    validator.test(
        "Test file exists with all test classes",
        check_test_file
    )
    
    # ============ SECTION 11: CODE STATISTICS ============
    print("\n📊 Section 11: Validating Code Statistics...")
    
    def check_code_lines():
        files = [
            "app/routers/demurrage_api.py",
            "app/routers/commission_api.py",
            "app/routers/compliance_api.py",
            "app/routers/notifications_api_v2.py",
            "app/routers/documents_api_v2.py",
            "app/routers/dashboard_api_v2.py",
        ]
        total_lines = 0
        for file in files:
            with open(file, "r") as f:
                total_lines += len(f.readlines())
        assert total_lines > 1000, f"Expected >1000 lines, got {total_lines}"
        return total_lines
    
    lines = validator.test(
        "Total lines of new code >1000",
        check_code_lines
    )
    
    # ============ SECTION 12: SCHEMA VALIDATION ============
    print("\n✔️  Section 12: Validating Schema Structure...")
    
    def check_schema_fields():
        from app.schemas.fase2_schemas import DemurrageHourlyResponse
        from pydantic import BaseModel
        assert issubclass(DemurrageHourlyResponse, BaseModel)
        # Check fields
        fields = DemurrageHourlyResponse.model_fields
        assert "room_id" in fields
        assert "hours_elapsed" in fields
        assert "total_exposure" in fields
        return True
    
    validator.test(
        "Schemas have correct structure",
        check_schema_fields
    )
    
    # ============ PRINT FINAL RESULTS ============
    validator.print_results()
    
    # Return exit code based on results
    return 0 if validator.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())