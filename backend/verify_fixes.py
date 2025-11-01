"""
Script para verificar que todos los arreglos funcionan correctamente
"""

import asyncio
import sqlite3
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
import sys

async def verify_database_schema():
    """Verifica que el schema de la BD sea correcto"""
    print("\n" + "="*60)
    print("🔍 VERIFICANDO SCHEMA DE BASE DE DATOS")
    print("="*60)
    
    try:
        # Verificar SQLite directamente
        conn = sqlite3.connect('sts_clearance.db')
        cursor = conn.cursor()
        
        # Check document_types schema
        cursor.execute("PRAGMA table_info(document_types)")
        columns = cursor.fetchall()
        
        print("\n📋 Columnas en table 'document_types':")
        column_names = []
        for col in columns:
            col_id, name, type_, notnull, default, pk = col
            column_names.append(name)
            print(f"   - {name}: {type_} {'NOT NULL' if notnull else 'NULLABLE'}")
        
        # Verify required columns exist
        required_cols = ['id', 'code', 'name', 'description', 'category', 'required', 'criticality']
        missing_cols = [col for col in required_cols if col not in column_names]
        
        if missing_cols:
            print(f"\n❌ FALTAN COLUMNAS: {missing_cols}")
            return False
        else:
            print(f"\n✅ TODAS LAS COLUMNAS REQUERIDAS EXISTEN")
        
        # Check users table
        cursor.execute("PRAGMA table_info(users)")
        user_columns = [col[1] for col in cursor.fetchall()]
        
        print("\n📋 Columnas en table 'users':")
        user_required = ['id', 'email', 'name', 'role', 'avatar_url', 'created_at', 'updated_at']
        for col in user_required:
            status = "✅" if col in user_columns else "❌"
            print(f"   {status} {col}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error verificando schema: {e}")
        return False

async def verify_imports():
    """Verifica que los imports del backend funcionan"""
    print("\n" + "="*60)
    print("🔍 VERIFICANDO IMPORTS DEL BACKEND")
    print("="*60)
    
    try:
        from app.models import User, DocumentType, Document
        print("✅ Imports de modelos funcionan")
        
        from app.base_schemas import UserResponse, DocumentTypeResponse
        print("✅ Imports de schemas funcionan")
        
        # Verify UserResponse has correct fields
        user_response_fields = UserResponse.__fields__.keys()
        print(f"\n📋 Campos en UserResponse: {list(user_response_fields)}")
        
        # Verify DocumentTypeResponse has correct fields
        doc_type_fields = DocumentTypeResponse.__fields__.keys()
        print(f"📋 Campos en DocumentTypeResponse: {list(doc_type_fields)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en imports: {e}")
        import traceback
        traceback.print_exc()
        return False

async def verify_model_fields():
    """Verifica que los modelos SQLAlchemy tengan los campos correctos"""
    print("\n" + "="*60)
    print("🔍 VERIFICANDO CAMPOS DE MODELOS")
    print("="*60)
    
    try:
        from app.models import DocumentType, User
        
        # Check DocumentType
        doc_type_cols = DocumentType.__table__.columns.keys()
        print(f"\n📋 Columnas en modelo DocumentType: {list(doc_type_cols)}")
        
        required_doc_type_cols = ['description', 'category']
        missing = [col for col in required_doc_type_cols if col not in doc_type_cols]
        
        if missing:
            print(f"❌ FALTAN en DocumentType: {missing}")
            return False
        else:
            print("✅ DocumentType tiene todos los campos requeridos")
        
        # Check User
        user_cols = User.__table__.columns.keys()
        required_user_cols = ['avatar_url', 'updated_at']
        
        missing = [col for col in required_user_cols if col not in user_cols]
        if missing:
            print(f"❌ FALTAN en User: {missing}")
            return False
        else:
            print("✅ User tiene todos los campos requeridos")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verificando modelos: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Ejecuta todas las verificaciones"""
    print("\n\n🚀 INICIANDO VERIFICACIÓN DE CORRECCIONES...")
    
    results = []
    
    # Verificación 1: Schema
    results.append(("Schema BD", await verify_database_schema()))
    
    # Verificación 2: Imports
    results.append(("Imports", await verify_imports()))
    
    # Verificación 3: Model fields
    results.append(("Model Fields", await verify_model_fields()))
    
    # Resumen
    print("\n" + "="*60)
    print("📊 RESUMEN DE VERIFICACIÓN")
    print("="*60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ TODAS LAS VERIFICACIONES PASARON")
        print("="*60)
        return 0
    else:
        print("❌ ALGUNAS VERIFICACIONES FALLARON")
        print("="*60)
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)