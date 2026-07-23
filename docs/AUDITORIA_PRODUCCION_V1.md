# Auditoria Produccion V1 - GMTCH Tune OS

Version: V1  
Fecha: 2026-06-28  
Objetivo: preparar operacion real y reset controlado de datos demo sin borrar nada durante esta auditoria.

## Hallazgos Criticos

1. **API frontend apuntaba a Railway antiguo.**  
   `frontend/src/services/api.js` usaba `https://gmtch-tune-production.up.railway.app/api`. Esto podia hacer que `gmtchtune.com` consumiera una API distinta a `https://api.gmtchtune.com/api`.

2. **CORS estaba abierto a cualquier origen.**  
   `backend/server.js` aceptaba y reflejaba cualquier `Origin`. Esto era riesgoso antes de abrir Portal Masters externo.

3. **Usuario OWNER se reseteaba en cada arranque.**  
   La credencial histórica fue retirada. El bootstrap OWNER ahora exige configuración fuerte, explícita y de un solo uso.

4. **Uploads locales privados.**
   El filesystem local sigue siendo temporal, pero `/uploads` ya no se publica. La descarga interna exige autenticación, empresa, permiso y un identificador de registro.

5. **Ruta antigua `/api/files/upload-ecu`.**  
   Existe ruta opcional con webhook externo hardcodeado y logs de archivo. Esta protegida por OWNER/ADMIN, pero conviene retirarla o aislarla si no se usa.

## Hallazgos Medios

- No hay rate limit real para login interno ni portal externo. Portal registra intentos fallidos, pero no bloquea.
- `JWT_SECRET` y `PORTAL_JWT_SECRET` tienen fallback local. En produccion deben existir variables reales.
- Descargas Portal Masters requieren token, pero las rutas guardadas en BD deberian validarse siempre contra directorio permitido o storage externo.
- Finanzas tiene proteccion backend para valores OWNER/ADMIN, pero la ruta `/finanzas` tambien permite roles operativos para comprobantes. Conviene separar una pantalla "Comprobantes" de "Finanzas completa".
- `App.jsx` y `FinanzasPage.jsx` estan grandes. Riesgo de mantenimiento, no de operacion inmediata.
- Hay paginas antiguas no usadas directamente: `Dashboard.jsx`, `Login.jsx`, `FileService.jsx`. No se eliminaron.
- PWA esta bien preparada, pero push real aun no existe.

## Mejoras Aplicadas

- `frontend/src/services/api.js` ahora usa `VITE_API_URL` con fallback oficial `https://api.gmtchtune.com/api`.
- `frontend/src/services/portalApi.js` queda alineado al fallback oficial.
- `backend/server.js` ahora limita CORS a dominios oficiales, localhost y variables `FRONTEND_URL` / `FRONTEND_URLS`.
- `backend/server.js` agrega headers defensivos: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- `backend/server.js` no modifica ni reactiva un OWNER existente durante el arranque.
- `backend/server.js` bloquea `/uploads`; los endpoints privados responden con `no-store`, `nosniff` y descarga como adjunto.
- `docs/SMOKE_TEST_PROD_V1.md` actualiza API base a `https://api.gmtchtune.com/api`.

## Permisos y Roles

- OWNER/ADMIN ven finanzas, caja, utilidad, fondo, cierres y valores de material.
- Roles operativos no ven metricas comerciales en dashboard.
- Portal externo usa `portalToken`; plataforma interna usa `token`.
- `/portal-admin` queda protegido por token interno y rol OWNER.
- `/portal/files` queda protegido por `portalToken`.
- Recepcion puede subir comprobantes por flujo operativo, pero no valida ni cierra finanzas.

## Notificaciones

- Modelo `Notificacion` incluye `accion_url`, `accion_tipo`, `entidad_tipo`, `entidad_id` y `metadata`.
- Click en campana o alerta flotante navega a `accion_url` cuando existe.
- Fallbacks cubren orden, archivo ECU, portal admin, bitacora y postventa.
- Recordatorios no crean duplicados por nivel gracias a `recordatorio_de_id` y `recordatorio_nivel`.
- Sonido normal/fuerte/tsunami depende de activacion del usuario.

## Finanzas

- Ingresos pagados y pendientes se calculan separados.
- Comprobantes no se descargan publicamente; requieren endpoint autenticado.
- Sueldos, fondo, cierre semanal y utilidad se exigen por backend con OWNER/ADMIN.
- Cierre semanal es control interno y no reemplaza contabilidad formal.

## File Service y Portal Masters

- File Service interno mantiene MOD, post escritura, correcciones, responsables y nueva lectura.
- Portal Masters separa login externo y admin interno.
- Descarga MOD externa descuenta creditos solo una vez y bloquea si no hay saldo.
- Nueva lectura requerida queda trazada en auditoria.
- Riesgo pendiente: migrar archivos locales a R2/S3 con URLs firmadas.

## PWA iOS

- Manifest creado con start `/login`, scope `/`, standalone e iconos.
- `sw.js` no cachea `/api` ni `/uploads`.
- Push event queda preparado, pero falta backend Web Push.
- Documentacion en `docs/PWA_IOS_GMTCH.md`.

## Storage y Archivos Locales

Directorios locales detectados:

- `backend/src/uploads/ecu`
- `backend/src/uploads/ecu_files`
- `backend/src/uploads/fotos`
- `backend/src/uploads/scanner`
- `backend/src/uploads/comprobantes`
- `backend/src/portal_uploads`

Riesgo Railway: filesystem local puede no ser persistente entre deploys o replicas. Fase siguiente recomendada: Cloudflare R2 o S3 compatible, con descargas autenticadas/firmadas.

## Checklist Antes de Reset

- Confirmar backup PostgreSQL Railway.
- Confirmar backup manual de uploads locales si contienen evidencia util.
- Para una base sin OWNER, habilitar temporalmente `OWNER_BOOTSTRAP_ENABLED`, definir `OWNER_INITIAL_USERNAME` y una `OWNER_INITIAL_PASSWORD` fuerte; retirar el opt-in después.
- Confirmar `JWT_SECRET` y `PORTAL_JWT_SECRET` fuertes en Railway.
- Confirmar `FRONTEND_URL=https://gmtchtune.com`.
- Confirmar `FRONTEND_URLS=https://gmtchtune.com,https://www.gmtchtune.com`.
- Confirmar `VITE_API_URL=https://api.gmtchtune.com/api` en frontend.
- Ejecutar smoke test con token OWNER.
- Revisar que Portal Masters real tenga cuentas/usuarios que se quieran conservar.

## Tablas a Limpiar en Reset Controlado

No ejecutar desde esta auditoria. Orden recomendado si se quiere dejar operacion desde cero:

1. `notificaciones`
2. `bitacora_operativa`
3. `comprobantes_pago`
4. `movimientos_financieros`
5. `fondo_reserva_movimientos`
6. `cierres_semanales`
7. `materiales_recuperados`
8. `fotos_vehiculo`
9. `diagnosticos`
10. `archivos_ecu`
11. `ordenes_trabajo`
12. `vehiculos`
13. `clientes`

Portal Masters, solo si eran pruebas:

1. `portal_auditoria_eventos`
2. `portal_credito_movimientos`
3. `portal_file_services`
4. `portal_usuarios`
5. `portal_cuentas`

## Tablas a Conservar

- `Usuarios`
- Cuentas/usuarios portal reales si ya existen.
- Cualquier tabla de configuracion futura.

## Checklist Despues de Reset

- Crear/validar usuarios reales: OWNER, RECEPCION, OPERADOR_ECU, MECANICO, TUNER.
- Crear cliente real de prueba controlada.
- Crear vehiculo real de prueba controlada.
- Crear orden, subir foto, diagnostico y File Service si aplica.
- Validar post escritura y finalizar tecnico.
- Validar pago/entrega solo con monto real.
- Validar dashboard sin datos demo.
- Validar notificacion accionable.
- Validar Portal Masters con una cuenta externa real o de prueba aprobada.
- Ejecutar `node scripts/smoke-prod.js`.

## Prioridad Siguiente

1. Rotar credenciales administrativas y secretos JWT antes de cargar datos reales.
2. Configurar rate limit para login interno y portal.
3. Migrar uploads a R2/S3 con descargas autenticadas.
4. Separar UI de Comprobantes operativos de Finanzas completa.
5. Retirar o deshabilitar `/api/files/upload-ecu` si no se usa.
6. Refactor gradual de `App.jsx` y `FinanzasPage.jsx`.
7. Implementar Web Push real solo despues de estabilizar operacion.
