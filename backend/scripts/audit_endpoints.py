#!/usr/bin/env python3
"""
Endpoint Security Audit Script
Analyzes all routers to find endpoints without permission checks
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple

# Configuration
ROUTERS_PATH = Path(__file__).parent.parent / "app" / "routers"
OUTPUT_FILE = Path(__file__).parent.parent / "ENDPOINT_AUDIT_REPORT.md"

# Patterns to detect permission checks
PERMISSION_PATTERNS = [
    r'@require_permission',
    r'@require_role',
    r'get_current_user',
    r'Permission',
    r'permission',
    r'check_permission',
    r'check_access',
    r'can_access',
    r'authorize',
]

# Patterns to detect endpoints
ENDPOINT_PATTERNS = [
    r'@router\.(get|post|put|delete|patch)',
    r'@app\.(get|post|put|delete|patch)',
]


def analyze_file(file_path: Path) -> Tuple[List[Dict], List[Dict]]:
    """
    Analyze a router file for endpoints and permission checks
    
    Returns:
        Tuple of (endpoints_with_permissions, endpoints_without_permissions)
    """
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ Error reading {file_path}: {e}")
        return [], []
    
    endpoints_with_perms = []
    endpoints_without_perms = []
    
    # Split by function definitions
    function_blocks = re.split(r'(?=^async def |^def )', content, flags=re.MULTILINE)
    
    for block in function_blocks:
        lines = block.split('\n')
        if not lines:
            continue
        
        # Find function definition
        func_line = None
        for i, line in enumerate(lines):
            if line.startswith(('async def ', 'def ')):
                func_line = line
                break
        
        if not func_line:
            continue
        
        # Extract function name
        func_match = re.search(r'def\s+(\w+)\s*\(', func_line)
        if not func_match:
            continue
        func_name = func_match.group(1)
        
        # Find decorator with route
        route = None
        decorator_section = []
        for i in range(len(lines) - 1, -1, -1):
            line = lines[i].strip()
            if line.startswith('@'):
                decorator_section.append(line)
                if 'router.' in line or 'app.' in line:
                    route = line
            elif line.startswith('async def ') or line.startswith('def '):
                break
        
        if not route:
            continue
        
        # Check for permission decorators or checks in function body
        has_permission = False
        for pattern in PERMISSION_PATTERNS:
            if re.search(pattern, block):
                has_permission = True
                break
        
        # Extract method and path
        method_match = re.search(r'\.(get|post|put|delete|patch)', route)
        method = method_match.group(1).upper() if method_match else 'UNKNOWN'
        
        path_match = re.search(r'\("([^"]+)"\)', route)
        path = path_match.group(1) if path_match else 'UNKNOWN'
        
        endpoint_info = {
            'router': file_path.stem,
            'method': method,
            'path': path,
            'function': func_name,
            'decorators': decorator_section,
        }
        
        if has_permission:
            endpoints_with_perms.append(endpoint_info)
        else:
            endpoints_without_perms.append(endpoint_info)
    
    return endpoints_with_perms, endpoints_without_perms


def generate_report(with_perms: List[Dict], without_perms: List[Dict]):
    """Generate audit report"""
    
    report_lines = [
        "# 🔒 ENDPOINT SECURITY AUDIT REPORT",
        "",
        f"**Generated:** {__import__('datetime').datetime.now().isoformat()}",
        "",
        "## 📊 SUMMARY",
        "",
        f"- ✅ Endpoints WITH permission checks: **{len(with_perms)}**",
        f"- ⚠️  Endpoints WITHOUT permission checks: **{len(without_perms)}**",
        f"- 📈 Coverage: **{len(with_perms) / (len(with_perms) + len(without_perms)) * 100:.1f}%**",
        "",
    ]
    
    if without_perms:
        report_lines.extend([
            "## 🚨 CRITICAL - ENDPOINTS WITHOUT PERMISSION CHECKS",
            "",
            "These endpoints need permission enforcement added:",
            "",
        ])
        
        # Group by router
        by_router = {}
        for endpoint in without_perms:
            router = endpoint['router']
            if router not in by_router:
                by_router[router] = []
            by_router[router].append(endpoint)
        
        for router, endpoints in sorted(by_router.items()):
            report_lines.append(f"### 📄 `{router}.py`")
            report_lines.append("")
            for ep in endpoints:
                report_lines.append(
                    f"- **{ep['method']}** `{ep['path']}` → `{ep['function']}`"
                )
            report_lines.append("")
    
    if with_perms:
        report_lines.extend([
            "## ✅ ENDPOINTS WITH PERMISSION CHECKS",
            "",
            "These endpoints have proper security:",
            "",
        ])
        
        # Group by router
        by_router = {}
        for endpoint in with_perms:
            router = endpoint['router']
            if router not in by_router:
                by_router[router] = []
            by_router[router].append(endpoint)
        
        for router, endpoints in sorted(by_router.items()):
            report_lines.append(f"### ✓ `{router}.py` ({len(endpoints)} secure)")
            report_lines.append("")
    
    report_lines.extend([
        "## 🔧 ACTIONS REQUIRED",
        "",
        "1. Review all endpoints in the **CRITICAL** section",
        "2. Add `@require_permission(...)` decorator to each endpoint",
        "3. Or add permission check in endpoint body",
        "4. Re-run this script to verify",
        "",
        "### Template for adding permissions:",
        "",
        "```python",
        "@router.get('/path')",
        "@require_permission('resource.permission')",
        "async def endpoint_name(request: Request):",
        "    # Your code",
        "    pass",
        "```",
    ])
    
    return "\n".join(report_lines)


def main():
    """Run audit"""
    print("🔍 AUDITING ENDPOINTS FOR PERMISSION CHECKS...")
    print()
    
    all_with_perms = []
    all_without_perms = []
    
    # Analyze all router files
    if not ROUTERS_PATH.exists():
        print(f"❌ Routers path not found: {ROUTERS_PATH}")
        return
    
    router_files = sorted(ROUTERS_PATH.glob("*.py"))
    for router_file in router_files:
        if router_file.name.startswith("__"):
            continue
        
        print(f"📄 Analyzing {router_file.name}...", end=" ")
        with_perms, without_perms = analyze_file(router_file)
        print(f"✓ ({len(with_perms)} safe, {len(without_perms)} risky)")
        
        all_with_perms.extend(with_perms)
        all_without_perms.extend(without_perms)
    
    # Generate and save report
    print()
    print("📝 GENERATING REPORT...")
    report = generate_report(all_with_perms, all_without_perms)
    
    OUTPUT_FILE.write_text(report, encoding='utf-8')
    print(f"✅ Report saved to: {OUTPUT_FILE}")
    print()
    
    # Summary
    total = len(all_with_perms) + len(all_without_perms)
    coverage = len(all_with_perms) / total * 100 if total > 0 else 0
    print(f"📊 SUMMARY:")
    print(f"   Safe endpoints:   {len(all_with_perms)} ({coverage:.1f}%)")
    print(f"   Risky endpoints:  {len(all_without_perms)} ({100 - coverage:.1f}%)")
    
    if all_without_perms:
        print()
        print(f"⚠️  {len(all_without_perms)} endpoints need permission enforcement!")


if __name__ == "__main__":
    main()