#!/usr/bin/env python3
"""
Script para corregir automáticamente todos los errores JSX de tags mal cerrados
"""

import os
import re

def fix_jsx_tags(file_path):
    """Corrige tags JSX mal cerrados en un archivo"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Corregir <h1>...</h2> → <h1>...</h1>
        content = re.sub(r'<h1([^>]*)>(.*?)</h2>', r'<h1\1>\2</h1>', content, flags=re.DOTALL)
        
        # Corregir <h2>...</h3> → <h2>...</h2>
        content = re.sub(r'<h2([^>]*)>(.*?)</h3>', r'<h2\1>\2</h2>', content, flags=re.DOTALL)
        
        # Corregir <h3>...</h4> → <h3>...</h3>
        content = re.sub(r'<h3([^>]*)>(.*?)</h4>', r'<h3\1>\2</h3>', content, flags=re.DOTALL)
        
        # Corregir <h4>...</h5> → <h4>...</h4>
        content = re.sub(r'<h4([^>]*)>(.*?)</h5>', r'<h4\1>\2</h4>', content, flags=re.DOTALL)
        
        # Corregir <h5>...</h6> → <h5>...</h5>
        content = re.sub(r'<h5([^>]*)>(.*?)</h6>', r'<h5\1>\2</h5>', content, flags=re.DOTALL)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ {file_path}: JSX tags corregidos")
            return True
        else:
            print(f"⚪ {file_path}: Sin errores JSX")
            return False
            
    except Exception as e:
        print(f"❌ Error en {file_path}: {e}")
        return False

def main():
    """Función principal"""
    print("🔧 Corrigiendo errores JSX automáticamente...")
    print("=" * 50)
    
    # Archivos a corregir
    files_to_fix = [
        'src/components/Pages/ActivityPage.tsx',
        'src/components/Pages/ApprovalPage.tsx', 
        'src/components/Pages/DocumentsPage.tsx',
        'src/components/Pages/HistoryPage.tsx'
    ]
    
    fixed_count = 0
    for file_path in files_to_fix:
        if os.path.exists(file_path):
            if fix_jsx_tags(file_path):
                fixed_count += 1
    
    print("=" * 50)
    print(f"🎉 Archivos corregidos: {fixed_count}")

if __name__ == "__main__":
    main()
