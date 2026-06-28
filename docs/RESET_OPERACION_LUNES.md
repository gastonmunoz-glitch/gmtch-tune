# Reset Operacion Lunes - GMTCH Tune OS

Version: V1  
Fecha: 2026-06-28

## Objetivo

Dejar la base operativa limpia para comenzar con datos reales, sin borrar usuarios internos, roles, configuracion, estructura de tablas, codigo ni variables de entorno.

El script es seguro por defecto: corre en `DRY_RUN` y solo muestra el plan con conteos.

## Que borra

Datos internos operativos:

- `notificaciones`
- `bitacora_operativa`
- `comprobantes_pago`
- `movimientos_financieros`
- `fondo_reserva_movimientos`
- `cierres_semanales`
- `materiales_recuperados`
- `fotos_vehiculo`
- `diagnosticos`
- `archivos_ecu`
- `ordenes_trabajo`
- `vehiculos`
- `clientes`

Datos Portal Masters operativos por defecto:

- `portal_auditoria_eventos`
- `portal_credito_movimientos`
- `portal_file_services`

Si `RESET_PORTAL_ACCOUNTS=true`, tambien borra:

- `portal_usuarios`
- `portal_cuentas`

## Que conserva

- `Usuarios`
- roles internos
- configuracion
- estructura de tablas
- codigo
- variables de entorno
- `portal_cuentas` y `portal_usuarios` por defecto

Si se conservan cuentas portal, el reset real deja `saldo_creditos = 0` para evitar saldos sin historial despues de borrar movimientos.

## Archivos fisicos

Por defecto no borra archivos fisicos.

Solo borra archivos si:

- `RESET_UPLOAD_FILES=true`
- y tambien existe `RESET_CONFIRM=RESET_GMTCH_PROD_LUNES`

Directorios revisados:

- `backend/src/uploads/ecu`
- `backend/src/uploads/ecu_files`
- `backend/src/uploads/fotos`
- `backend/src/uploads/scanner`
- `backend/src/uploads/comprobantes`
- `backend/src/portal_uploads`

No borra `.gitkeep`.

## Antes de ejecutar

1. Hacer backup de PostgreSQL Railway.
2. Descargar evidencia/archivos utiles desde uploads si se quieren conservar.
3. Confirmar variables Railway:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `PORTAL_JWT_SECRET`
   - `FRONTEND_URL=https://gmtchtune.com`
   - `FRONTEND_URLS=https://gmtchtune.com,https://www.gmtchtune.com`
   - `VITE_API_URL=https://api.gmtchtune.com/api`
4. Confirmar password real de `gaston`.
5. Cerrar la app para operadores mientras se ejecuta reset real.

## DRY_RUN

Ejecutar desde la raiz del repo:

```bat
node scripts/reset-operacion.js
```

Resultado esperado:

- muestra modo `DRY_RUN`
- cuenta registros por tabla
- muestra archivos fisicos detectados
- no borra nada

## Reset real

```bat
set RESET_CONFIRM=RESET_GMTCH_PROD_LUNES
node scripts/reset-operacion.js
set RESET_CONFIRM=
```

## Reset real incluyendo cuentas portal

Usar solo si las cuentas masters/slaves actuales son de prueba.

```bat
set RESET_CONFIRM=RESET_GMTCH_PROD_LUNES
set RESET_PORTAL_ACCOUNTS=true
node scripts/reset-operacion.js
set RESET_CONFIRM=
set RESET_PORTAL_ACCOUNTS=
```

## Reset real incluyendo archivos fisicos

Usar solo si ya hay respaldo o si todos los archivos son de prueba.

```bat
set RESET_CONFIRM=RESET_GMTCH_PROD_LUNES
set RESET_UPLOAD_FILES=true
node scripts/reset-operacion.js
set RESET_CONFIRM=
set RESET_UPLOAD_FILES=
```

## Reset completo de pruebas portal + archivos

```bat
set RESET_CONFIRM=RESET_GMTCH_PROD_LUNES
set RESET_PORTAL_ACCOUNTS=true
set RESET_UPLOAD_FILES=true
node scripts/reset-operacion.js
set RESET_CONFIRM=
set RESET_PORTAL_ACCOUNTS=
set RESET_UPLOAD_FILES=
```

## QA posterior

1. Entrar a `https://gmtchtune.com/login`.
2. Login con `gaston`.
3. Confirmar dashboard sin datos operativos antiguos.
4. Crear cliente real de prueba controlada.
5. Crear vehiculo.
6. Crear orden.
7. Subir foto/evidencia.
8. Crear diagnostico.
9. Crear File Service si corresponde.
10. Validar notificacion.
11. Validar Finanzas sin saldos demo.
12. Validar Portal Masters si se conserva o recrea cuenta.

## Smoke test posterior

```bat
set TOKEN=PEGAR_TOKEN_OWNER_AQUI
node scripts/smoke-prod.js
set TOKEN=
```

## Checklist lunes

- Backup confirmado.
- Reset DRY_RUN revisado.
- Reset real ejecutado una sola vez.
- Variables temporales limpiadas con `set RESET_CONFIRM=`.
- Usuarios internos siguen activos.
- Cuentas portal reales conservadas o recreadas.
- Dashboard limpio.
- Smoke test OK.
- Primera orden real creada sin errores.

## Riesgos

- Si se ejecuta reset real contra produccion, los datos operativos se eliminan de la base.
- Si `RESET_UPLOAD_FILES=true`, los archivos fisicos locales se eliminan y no hay rollback.
- Railway puede perder uploads locales entre deploys; migrar a R2/S3 es prioridad siguiente.
- No usar este script como tarea automatica. Debe ejecutarse manualmente y con backup.
