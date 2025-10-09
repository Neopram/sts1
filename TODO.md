# TODO: Verificar y Corregir Conflictos en Login

## Información Recopilada
- Backend omite validación de contraseñas, solo verifica existencia de usuario.
- Modelo User no tiene campo de contraseña.
- Roles válidos: owner, seller, buyer, charterer, broker, admin (falta 'viewer').
- Usuarios creados: owner@sts.com (owner), charterer@sts.com (charterer), broker@sts.com (broker), viewer@sts.com (viewer - inválido).
- Frontend tiene botones demo para admin@sts.com y test@sts.com (no creados).
- Contraseñas en frontend no se validan.

## Plan de Corrección
- [ ] Actualizar valid_roles en auth.py para incluir 'viewer'.
- [ ] Agregar campo password_hash al modelo User.
- [ ] Actualizar auth.py para validar contraseñas con bcrypt.
- [ ] Modificar create_test_users.py para crear usuarios con contraseñas hasheadas y agregar usuarios faltantes.
- [ ] Actualizar botones demo en frontend para coincidir con usuarios existentes.
- [ ] Ejecutar create_test_users.py para crear usuarios.
- [ ] Probar logins con test_login_final.py.
- [ ] Generar reporte final.

## Usuarios Existentes (después de correcciones)
- admin@sts.com (admin) - admin123
- owner@sts.com (owner) - owner123
- charterer@sts.com (charterer) - charterer123
- broker@sts.com (broker) - broker123
- viewer@sts.com (viewer) - viewer123
- test@sts.com (buyer) - test123

## Comandos para Levantar Servicios
- Backend: `cd sts && docker-compose up -d backend`
- Frontend: `cd sts && docker-compose up -d frontend`
- Ambos: `cd sts && docker-compose up -d`
- Migrar DB: `cd sts && make migrate`
- Sembrar datos: `cd sts && make seed`

## Seguimiento de Progreso
- [ ] Paso 1 completado
- [ ] Paso 2 completado
- etc.
