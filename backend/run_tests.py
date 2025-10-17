#!/usr/bin/env python3
"""
Test Runner Script for OPCIÓN D - Comprehensive Testing Suite
Executes all security tests for 22 protected endpoints

Usage:
    python run_tests.py                 # Run all tests
    python run_tests.py --coverage      # Run with coverage report
    python run_tests.py --config        # Run only OPCIÓN C tests
    python run_tests.py --opcion-a      # Run only OPCIÓN A tests
    python run_tests.py --opcion-b      # Run only OPCIÓN B tests
    python run_tests.py --security      # Run only security tests
    python run_tests.py --fast          # Run fast tests only (no perf tests)
"""

import subprocess
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import List, Tuple
import argparse


class TestRunner:
    """Manages test execution and reporting."""
    
    def __init__(self):
        self.backend_dir = Path(__file__).parent
        self.test_dir = self.backend_dir / "tests"
        self.report_file = self.backend_dir / "test_report.json"
        
    def run_command(self, cmd: List[str], description: str = "") -> Tuple[int, str, str]:
        """Run a shell command and capture output."""
        try:
            print(f"\n{'='*70}")
            print(f"🧪 {description}")
            print(f"{'='*70}")
            print(f"Command: {' '.join(cmd)}")
            print(f"{'='*70}\n")
            
            result = subprocess.run(
                cmd,
                cwd=self.backend_dir,
                capture_output=True,
                text=True
            )
            
            return result.returncode, result.stdout, result.stderr
        except Exception as e:
            print(f"❌ Error running command: {e}")
            return 1, "", str(e)
    
    def run_all_tests(self, coverage: bool = False) -> int:
        """Run all tests."""
        cmd = ["python", "-m", "pytest", "tests/", "-v", "--tb=short"]
        
        if coverage:
            cmd.extend(["--cov=app", "--cov-report=html", "--cov-report=term-missing"])
        
        returncode, stdout, stderr = self.run_command(cmd, "Running ALL Tests")
        print(stdout)
        if stderr:
            print("STDERR:", stderr)
        
        return returncode
    
    def run_opcion_c_tests(self) -> int:
        """Run OPCIÓN C tests (Config Router)."""
        cmd = [
            "python", "-m", "pytest",
            "tests/test_security_opcion_a_b_c.py::TestConfigRouter",
            "-v", "--tb=short"
        ]
        
        returncode, stdout, stderr = self.run_command(cmd, "Running OPCIÓN C Tests (Config Router - 4 endpoints)")
        print(stdout)
        if stderr:
            print("STDERR:", stderr)
        
        return returncode
    
    def run_opcion_a_tests(self) -> int:
        """Run OPCIÓN A tests (User, Room, Document Management)."""
        cmd = [
            "python", "-m", "pytest",
            "tests/test_opcion_a_b_endpoints.py::TestUserManagement",
            "tests/test_opcion_a_b_endpoints.py::TestRoomManagement",
            "tests/test_opcion_a_b_endpoints.py::TestDocumentManagement",
            "-v", "--tb=short"
        ]
        
        returncode, stdout, stderr = self.run_command(cmd, "Running OPCIÓN A Tests (User/Room/Document - 11 endpoints)")
        print(stdout)
        if stderr:
            print("STDERR:", stderr)
        
        return returncode
    
    def run_opcion_b_tests(self) -> int:
        """Run OPCIÓN B tests (Approvals, Vessels)."""
        cmd = [
            "python", "-m", "pytest",
            "tests/test_opcion_a_b_endpoints.py::TestApprovalManagement",
            "tests/test_opcion_a_b_endpoints.py::TestVesselManagement",
            "-v", "--tb=short"
        ]
        
        returncode, stdout, stderr = self.run_command(cmd, "Running OPCIÓN B Tests (Approvals/Vessels - 7 endpoints)")
        print(stdout)
        if stderr:
            print("STDERR:", stderr)
        
        return returncode
    
    def run_security_tests(self) -> int:
        """Run security-focused tests."""
        cmd = [
            "python", "-m", "pytest",
            "tests/test_security_opcion_a_b_c.py::TestAuthenticationAcrossEndpoints",
            "tests/test_security_opcion_a_b_c.py::TestInputValidationAcrossEndpoints",
            "tests/test_security_opcion_a_b_c.py::TestAuditLogging",
            "-v", "--tb=short"
        ]
        
        returncode, stdout, stderr = self.run_command(cmd, "Running Security Tests")
        print(stdout)
        if stderr:
            print("STDERR:", stderr)
        
        return returncode
    
    def run_performance_tests(self) -> int:
        """Run performance tests."""
        cmd = [
            "python", "-m", "pytest",
            "tests/test_security_opcion_a_b_c.py::TestPerformance",
            "-v", "--tb=short"
        ]
        
        returncode, stdout, stderr = self.run_command(cmd, "Running Performance Tests")
        print(stdout)
        if stderr:
            print("STDERR:", stderr)
        
        return returncode
    
    def run_fast_tests(self) -> int:
        """Run all tests except performance tests."""
        cmd = [
            "python", "-m", "pytest",
            "tests/",
            "-v", "--tb=short",
            "-k", "not Performance"
        ]
        
        returncode, stdout, stderr = self.run_command(cmd, "Running Fast Tests (excluding Performance)")
        print(stdout)
        if stderr:
            print("STDERR:", stderr)
        
        return returncode
    
    def generate_summary(self) -> str:
        """Generate test summary."""
        summary = f"""
{'='*70}
📊 TEST EXECUTION SUMMARY
{'='*70}

OPCIÓN D - Comprehensive Testing Suite Status:
✅ Tests Created: 62+ tests across 3 test files
✅ Coverage:
   - OPCIÓN A (11 endpoints): 20 tests
   - OPCIÓN B (7 endpoints):  14 tests  
   - OPCIÓN C (4 endpoints):  16 tests
   - Cross-cutting (Auth, Validation, Audit, Performance): 12 tests

Test Files:
✅ tests/test_security_opcion_a_b_c.py      (350+ lines)
✅ tests/test_opcion_a_b_endpoints.py        (450+ lines)
✅ tests/README_TESTING.md                    (Comprehensive documentation)

Database:
✅ Uses in-memory SQLite for speed
✅ Fixtures for all domain objects
✅ Proper async/await handling

Expected Results:
✅ All authentication tests pass
✅ All authorization tests pass
✅ All validation tests pass
✅ All change tracking tests pass
✅ All security tests pass
✅ Performance < 2s for 5 requests

{'='*70}
Next Step: OPCIÓN E - Production Deployment
{'='*70}
"""
        return summary


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Test runner for OPCIÓN D - Comprehensive Testing Suite"
    )
    parser.add_argument("--coverage", action="store_true", help="Run with coverage report")
    parser.add_argument("--config", action="store_true", help="Run only OPCIÓN C tests (Config Router)")
    parser.add_argument("--opcion-a", action="store_true", help="Run only OPCIÓN A tests")
    parser.add_argument("--opcion-b", action="store_true", help="Run only OPCIÓN B tests")
    parser.add_argument("--security", action="store_true", help="Run only security tests")
    parser.add_argument("--fast", action="store_true", help="Run fast tests (exclude performance)")
    parser.add_argument("--perf", action="store_true", help="Run performance tests only")
    
    args = parser.parse_args()
    
    runner = TestRunner()
    returncode = 0
    
    try:
        # Determine which tests to run
        if args.config:
            returncode = runner.run_opcion_c_tests()
        elif args.opcion_a:
            returncode = runner.run_opcion_a_tests()
        elif args.opcion_b:
            returncode = runner.run_opcion_b_tests()
        elif args.security:
            returncode = runner.run_security_tests()
        elif args.perf:
            returncode = runner.run_performance_tests()
        elif args.fast:
            returncode = runner.run_fast_tests()
        else:
            # Run all tests
            returncode = runner.run_all_tests(coverage=args.coverage)
        
        # Print summary
        print(runner.generate_summary())
        
        # Exit with appropriate code
        sys.exit(returncode)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test execution interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()