#!/usr/bin/env python
"""
Validate that all dashboard services can be imported without errors
"""
import sys
import importlib

def validate_service(module_path, class_name):
    """Try to import a service and verify it exists"""
    try:
        module = importlib.import_module(module_path)
        cls = getattr(module, class_name, None)
        if cls:
            print(f"  ✓ {class_name} - OK")
            return True
        else:
            print(f"  ✗ {class_name} - NOT FOUND in {module_path}")
            return False
    except Exception as e:
        print(f"  ✗ {class_name} - ERROR: {str(e)[:60]}")
        return False

def main():
    print("\n=== VALIDATING SERVICES ===\n")
    
    services = [
        ("app.services.metrics_service", "MetricsService"),
        ("app.services.demurrage_service", "DemurrageService"),
        ("app.services.commission_service", "CommissionService"),
        ("app.services.compliance_service", "ComplianceService"),
        ("app.services.dashboard_projection_service", "DashboardProjectionService"),
    ]
    
    results = []
    for module_path, class_name in services:
        print(f"Testing {class_name}...")
        result = validate_service(module_path, class_name)
        results.append(result)
    
    print("\n=== VALIDATING SCHEMAS ===\n")
    
    try:
        from app.schemas.dashboard_schemas import (
            DemurrageByRoom,
            CommissionByRoom,
            SireCompliance,
            ChartererDashboard,
            BrokerDashboard,
            OwnerDashboard,
        )
        print("  ✓ Dashboard schemas - OK")
        results.append(True)
    except Exception as e:
        print(f"  ✗ Dashboard schemas - ERROR: {str(e)[:60]}")
        results.append(False)
    
    print("\n=== VALIDATING MODELS ===\n")
    
    try:
        from app.models import Metric, PartyMetric, Room, Document
        print("  ✓ Metric model - OK")
        print("  ✓ PartyMetric model - OK")
        print("  ✓ Room model - OK")
        print("  ✓ Document model - OK")
        results.append(True)
    except Exception as e:
        print(f"  ✗ Models - ERROR: {str(e)[:60]}")
        results.append(False)
    
    print("\n=== SUMMARY ===")
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if all(results):
        print("\n✅ All validations passed!")
        return 0
    else:
        print("\n⚠️  Some validations failed. See details above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())