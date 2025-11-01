"""
Script automatizado para fix de encoding UTF-8 en tests para Windows

Este script busca todos los archivos de test que puedan tener problemas de encoding
y agrega el fix necesario al inicio de cada archivo.
"""

import os
import re
from pathlib import Path
from typing import List, Tuple

# Encoding fix code to add
ENCODING_FIX = """import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""


def has_unicode_characters(content: str) -> bool:
    """Check if content has emojis or unicode characters that might fail on Windows"""
    # Check for common emojis and unicode characters
    unicode_patterns = [
        r'[\U0001F300-\U0001F9FF]',  # Emojis
        r'[✓✅❌⚠️🚀🧪🔧🔍🔐]',  # Common special characters
        r'[→←↑↓]',  # Arrows
    ]
    
    for pattern in unicode_patterns:
        if re.search(pattern, content):
            return True
    
    # Check for explicit unicode escapes
    if '\\U0001' in content or '\\u2705' in content or '\\u2713' in content:
        return True
    
    return False


def already_has_fix(content: str) -> bool:
    """Check if file already has the encoding fix"""
    return 'io.TextIOWrapper' in content and 'sys.platform == \'win32\'' in content


def fix_file_encoding(file_path: Path) -> Tuple[bool, str]:
    """
    Fix encoding in a test file
    
    Returns:
        (success, message)
    """
    try:
        # Read file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Skip if already has fix
        if already_has_fix(content):
            return False, "Already has encoding fix"
        
        # Skip if no unicode characters
        if not has_unicode_characters(content):
            return False, "No unicode characters found"
        
        # Find first import statement or first line
        lines = content.split('\n')
        
        # Find where to insert (after any existing imports or at the start)
        insert_pos = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import ') or line.strip().startswith('from '):
                insert_pos = i + 1
            elif line.strip() and not line.strip().startswith('#'):
                # Stop at first non-import, non-comment line
                break
        
        # Insert encoding fix
        lines.insert(insert_pos, ENCODING_FIX.rstrip())
        
        # Write back
        new_content = '\n'.join(lines)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        return True, "Encoding fix added"
    
    except Exception as e:
        return False, f"Error: {str(e)}"


def find_test_files(directory: Path) -> List[Path]:
    """Find all Python files in directory"""
    test_files = []
    
    # Common test file patterns
    patterns = [
        'test_*.py',
        '*_test.py',
        '*_tests.py',
        'create_test_*.py',
        'FASE*_VALIDATION*.py',
        'PHASE*_*.py',
        'run_*.py',
    ]
    
    for pattern in patterns:
        test_files.extend(directory.rglob(pattern))
    
    # Also check for files with test content
    for py_file in directory.rglob('*.py'):
        if py_file.name.startswith('test') or 'test' in py_file.name.lower():
            if py_file not in test_files:
                test_files.append(py_file)
    
    # Remove duplicates
    return list(set(test_files))


def main():
    """Main function"""
    # Fix encoding for this script too
    import sys
    import io
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    # Get backend directory
    backend_dir = Path(__file__).parent
    
    print("=" * 60)
    print("FIX ENCODING UTF-8 EN TESTS PARA WINDOWS")
    print("=" * 60)
    print(f"\nBuscando archivos de test en: {backend_dir}")
    
    # Find test files
    test_files = find_test_files(backend_dir)
    
    print(f"\nEncontrados {len(test_files)} archivos de test")
    
    # Process each file
    fixed_count = 0
    skipped_count = 0
    error_count = 0
    
    results = []
    
    for test_file in sorted(test_files):
        print(f"\nProcesando: {test_file.name}")
        success, message = fix_file_encoding(test_file)
        
        if success:
            print(f"  [OK] {message}")
            fixed_count += 1
        else:
            print(f"  [SKIP] {message}")
            skipped_count += 1
        
        results.append({
            "file": str(test_file),
            "success": success,
            "message": message
        })
    
    # Summary
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Archivos procesados: {len(test_files)}")
    print(f"[OK] Fix aplicado: {fixed_count}")
    print(f"[SKIP] Omitidos: {skipped_count}")
    print(f"[ERROR] Errores: {error_count}")
    
    # Save results to JSON
    import json
    results_file = backend_dir / "encoding_fix_results.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump({
            "timestamp": __import__('datetime').datetime.now().isoformat(),
            "total_files": len(test_files),
            "fixed": fixed_count,
            "skipped": skipped_count,
            "errors": error_count,
            "results": results
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nResultados guardados en: {results_file}")
    print("\n✅ Proceso completado!")


if __name__ == "__main__":
    main()

