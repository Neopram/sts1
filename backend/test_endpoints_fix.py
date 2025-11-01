"""
Script para probar que los endpoints arreglados funcionan correctamente
"""

import asyncio
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models import DocumentType, User, Document, Room
from app.database import get_async_session

async def test_document_type_fields():
    """Prueba que los campos de DocumentType se pueden acceder sin errores"""
    print("\n" + "="*60)
    print("🧪 PRUEBA 1: Acceder a campos de DocumentType")
    print("="*60)
    
    try:
        # Get database session
        async for session in get_async_session():
            # Get first document type
            result = await session.execute(select(DocumentType).limit(1))
            doc_type = result.scalar_one_or_none()
            
            if doc_type:
                print(f"\n📋 DocumentType encontrado:")
                print(f"   - id: {doc_type.id}")
                print(f"   - code: {doc_type.code}")
                print(f"   - name: {doc_type.name}")
                print(f"   - description: {doc_type.description}")
                print(f"   - category: {doc_type.category}")
                print(f"   - required: {doc_type.required}")
                print(f"   - criticality: {doc_type.criticality}")
                print("✅ Todos los campos accesibles sin errores")
            else:
                print("⚠️  No hay document types en la BD (normal en desarrollo)")
            
            break
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_user_response_serialization():
    """Prueba que UserResponse se puede serializar correctamente"""
    print("\n" + "="*60)
    print("🧪 PRUEBA 2: Serializar UserResponse")
    print("="*60)
    
    try:
        from app.base_schemas import UserResponse
        
        # Get database session
        async for session in get_async_session():
            # Get first user
            result = await session.execute(select(User).limit(1))
            user = result.scalar_one_or_none()
            
            if user:
                print(f"\n👤 Usuario encontrado: {user.email}")
                
                # Try to create UserResponse
                user_response = UserResponse(
                    id=str(user.id),
                    email=user.email,
                    name=user.name,
                    role=user.role,
                    avatar_url=user.avatar_url,
                    created_at=user.created_at,
                    updated_at=user.updated_at
                )
                
                # Try to serialize to dict
                user_dict = user_response.model_dump()
                print(f"\n✅ UserResponse serializado correctamente:")
                print(f"   {json.dumps(user_dict, default=str, indent=2)}")
            else:
                print("⚠️  No hay usuarios en la BD (normal en desarrollo)")
            
            break
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_document_type_response():
    """Prueba que DocumentTypeResponse se puede serializar correctamente"""
    print("\n" + "="*60)
    print("🧪 PRUEBA 3: Serializar DocumentTypeResponse")
    print("="*60)
    
    try:
        from app.base_schemas import DocumentTypeResponse
        
        # Get database session
        async for session in get_async_session():
            # Get first document type
            result = await session.execute(select(DocumentType).limit(1))
            doc_type = result.scalar_one_or_none()
            
            if doc_type:
                print(f"\n📄 DocumentType encontrado: {doc_type.name}")
                
                # Try to create DocumentTypeResponse
                response = DocumentTypeResponse(
                    id=doc_type.id,
                    code=doc_type.code,
                    name=doc_type.name,
                    description=doc_type.description,
                    category=doc_type.category,
                    required=doc_type.required,
                    criticality=doc_type.criticality
                )
                
                # Try to serialize to dict
                response_dict = response.model_dump()
                print(f"\n✅ DocumentTypeResponse serializado correctamente:")
                print(f"   {json.dumps(response_dict, default=str, indent=2)}")
            else:
                print("⚠️  No hay document types en la BD (normal en desarrollo)")
            
            break
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Ejecuta todas las pruebas"""
    print("\n\n🚀 INICIANDO PRUEBAS DE ENDPOINTS...")
    
    results = []
    
    # Prueba 1
    results.append(("DocumentType Fields", await test_document_type_fields()))
    
    # Prueba 2
    results.append(("UserResponse Serialization", await test_user_response_serialization()))
    
    # Prueba 3
    results.append(("DocumentTypeResponse Serialization", await test_document_type_response()))
    
    # Resumen
    print("\n" + "="*60)
    print("📊 RESUMEN DE PRUEBAS")
    print("="*60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ TODAS LAS PRUEBAS PASARON")
        print("="*60)
        return 0
    else:
        print("❌ ALGUNAS PRUEBAS FALLARON")
        print("="*60)
        return 1

if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)