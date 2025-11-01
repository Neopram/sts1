"""
Script para ejecutar todos los tests disponibles y generar reporte
Maneja problemas de encoding en Windows
"""

import sys
import os
import subprocess
import json
from datetime import datetime
from pathlib import Path

# Fix encoding para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Cambiar al directorio correcto
os.chdir(Path(__file__).parent)

test_results = {
    "timestamp": datetime.now().isoformat(),
    "tests_executed": [],
    "summary": {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "errors": []
    }
}

def run_test(test_file, description):
    """Ejecutar un test individual"""
    print(f"\n{'='*60}")
    print(f"TEST: {description}")
    print(f"FILE: {test_file}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(
            [sys.executable, test_file],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=30
        )
        
        test_result = {
            "file": test_file,
            "description": description,
            "returncode": result.returncode,
            "stdout": result.stdout[:1000] if result.stdout else "",  # Limitar tamaño
            "stderr": result.stderr[:1000] if result.stderr else "",
            "success": result.returncode == 0
        }
        
        test_results["tests_executed"].append(test_result)
        test_results["summary"]["total"] += 1
        
        if result.returncode == 0:
            test_results["summary"]["passed"] += 1
            print(f"✅ PASÓ")
        else:
            test_results["summary"]["failed"] += 1
            print(f"❌ FALLÓ (code: {result.returncode})")
            if result.stderr:
                print(f"Error: {result.stderr[:500]}")
        
        return test_result
        
    except subprocess.TimeoutExpired:
        error_msg = f"Timeout ejecutando {test_file}"
        test_results["summary"]["errors"].append(error_msg)
        print(f"⏱️ TIMEOUT")
        return {"file": test_file, "error": "timeout"}
        
    except Exception as e:
        error_msg = f"Error ejecutando {test_file}: {str(e)}"
        test_results["summary"]["errors"].append(error_msg)
        print(f"❌ ERROR: {str(e)}")
        return {"file": test_file, "error": str(e)}


def find_test_files():
    """Encontrar todos los archivos de test"""
    test_files = []
    test_dir = Path(__file__).parent
    
    # Buscar en directorio actual
    for pattern in ["test_*.py", "*test*.py"]:
        test_files.extend(list(test_dir.glob(pattern)))
    
    # Buscar en tests/
    tests_dir = test_dir / "tests"
    if tests_dir.exists():
        for pattern in ["test_*.py", "*test*.py"]:
            test_files.extend(list(tests_dir.glob(pattern)))
    
    # Remover duplicados y este mismo archivo
    test_files = list(set(test_files))
    test_files = [f for f in test_files if f.name != "run_all_tests.py"]
    
    return sorted(test_files)


def main():
    print("="*60)
    print("EJECUTANDO TODOS LOS TESTS DISPONIBLES")
    print("="*60)
    print(f"Timestamp: {test_results['timestamp']}")
    print(f"Python: {sys.version}")
    print(f"Directorio: {os.getcwd()}")
    
    # Encontrar tests
    test_files = find_test_files()
    print(f"\nTests encontrados: {len(test_files)}")
    
    # Ejecutar tests
    for test_file in test_files:
        description = test_file.stem.replace("test_", "").replace("_", " ").title()
        run_test(str(test_file), description)
    
    # Resumen
    print(f"\n{'='*60}")
    print("RESUMEN FINAL")
    print(f"{'='*60}")
    print(f"Total ejecutados: {test_results['summary']['total']}")
    print(f"✅ Pasaron: {test_results['summary']['passed']}")
    print(f"❌ Fallaron: {test_results['summary']['failed']}")
    print(f"⏭️  Omitidos: {test_results['summary']['skipped']}")
    print(f"⚠️  Errores: {len(test_results['summary']['errors'])}")
    
    # Guardar resultados
    results_file = Path(__file__).parent / "test_results_all.json"
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump(test_results, f, indent=2, ensure_ascii=False)
    
    print(f"\nResultados guardados en: {results_file}")
    
    return test_results


if __name__ == "__main__":
    results = main()
    sys.exit(0 if results["summary"]["failed"] == 0 else 1)

