# Automatizaciones Operativas GMTCH V1

Version: V1  
Fecha: 2026-06-28

## Objetivo

Automatizaciones Operativas V1 permite revisar pendientes, generar reportes internos y crear alertas accionables para operar GMTCH Tune OS de forma proactiva.

## Regla de Seguridad

- No borra datos.
- No cambia estados criticos.
- No marca pagos.
- No cierra ordenes.
- No envia mensajes externos.
- No ejecuta cron por defecto.
- Solo genera reportes, sugerencias y notificaciones internas accionables.

La variable operativa futura es `ENABLE_INTERNAL_AUTOMATIONS=false`. En V1 la ejecucion es manual desde el dashboard.

## Endpoints

Base: `/api/automatizaciones`

- `GET /revision-operativa`
- `POST /reporte-apertura`
- `POST /reporte-cierre`
- `GET /file-service`
- `GET /finanzas`
- `GET /material-recuperado`
- `GET /reportes/ultimo`

## Permisos

- `OWNER` y `ADMIN`: ejecutan todo.
- `SUPERVISOR`: puede revisar operacion, File Service, material y ultimo reporte.
- Roles operativos: pueden ejecutar revision operativa general si tienen token interno.
- Portal Masters externo no tiene acceso.

## Reportes

Los reportes de apertura y cierre se guardan en `automatizacion_reportes` con:

- tipo
- titulo
- resumen
- prioridad
- alertas
- sugerencias
- metricas
- accion_url
- generado_por
- origen `AUTOMATIZACION`

## Anti-Spam de Notificaciones

Las automatizaciones pueden crear notificaciones internas solo para alertas ALTA o URGENTE. Antes de crear una notificacion, el sistema revisa si ya existe una alerta equivalente en las ultimas 2 horas usando:

- tipo
- entidad_tipo
- entidad_id

Si existe, no duplica.

## Dashboard

El bloque `Automatizaciones GMTCH` permite:

- ejecutar revision operativa
- generar reporte apertura
- generar reporte cierre
- revisar File Service
- revisar Finanzas
- revisar Material recuperado
- ver ultimo reporte

Cada resultado muestra resumen, prioridad, alertas, sugerencias, accion recomendada y links a modulos existentes.

## Alcance Futuro

V2 puede agregar ejecucion programada si `ENABLE_INTERNAL_AUTOMATIONS=true`, pero debe mantenerse desactivada por defecto y auditable.
