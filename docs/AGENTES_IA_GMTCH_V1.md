# Agentes IA GMTCH V1

Version: V1  
Fecha: 2026-06-28

## Objetivo

Agentes IA GMTCH V1 crea una base interna de lectura operativa para apoyar decisiones diarias en GMTCH Tune OS. En esta version no se conecta a un proveedor externo de IA: usa reglas deterministicas sobre datos existentes del sistema.

## Regla de Seguridad

- Solo lectura y sugerencias.
- No crea ordenes automaticamente.
- No cambia estados.
- No marca pagos.
- No borra ni archiva datos.
- No ejecuta acciones destructivas.
- Toda accion futura debe requerir confirmacion humana.

## Acceso

Endpoints protegidos con token interno:

- `GET /api/ai-agents/resumen-operativo`
- `GET /api/ai-agents/auditoria-dia`
- `GET /api/ai-agents/file-service-alertas`
- `GET /api/ai-agents/finanzas-resumen`
- `GET /api/ai-agents/gerente-diario`

Permisos V1: `OWNER` y `ADMIN`.

## Agentes V1

### Asistente Recepcion

Resume ordenes activas, vehiculos listos para entrega, pagos pendientes, clientes prioritarios y accesos utiles para recepcion.

### Auditor Operativo

Detecta tiempos muertos, ordenes atrasadas, bitacoras prioritarias abiertas, mecanica asociada e independiente.

### Asistente File Service

Revisa File Service activos, MOD listos, post escritura pendiente, correcciones, nueva lectura requerida y casos atrasados.

### Asistente Finanzas

Resume caja pagada, ingresos/egresos del mes, comprobantes pendientes, pagos pendientes y material recuperado. Es apoyo operativo, no contabilidad formal.

### Gerente Diario GMTCH

Entrega una lectura ejecutiva: puntos criticos, volumen operativo, postventa tecnica, File Service y foco recomendado del dia.

## Frontend

El dashboard muestra el bloque `Agentes IA GMTCH` solo para `OWNER` y `ADMIN`. Cada tarjeta incluye:

- resumen
- alertas
- sugerencias
- accion recomendada
- links internos a modulos existentes

## Datos Analizados

- Ordenes de trabajo
- Clientes y vehiculos
- File Service interno
- Bitacora operativa
- Finanzas y comprobantes
- Material recuperado

Si una tabla no existe o falla, el agente degrada la respuesta sin ejecutar cambios.

## Evolucion Futura

V2 puede integrar proveedor IA externo para redactar recomendaciones mejores, pero debe mantener:

- permisos internos
- trazabilidad
- no ejecucion automatica
- confirmacion humana previa a cualquier accion
