# Scheduler Interno GMTCH Tune OS V1

## Objetivo

El Scheduler Interno V1 ejecuta revisiones periodicas de operacion para detectar trabajos trabados sin depender de que alguien presione un boton en el Dashboard. Su funcion es leer datos, generar reportes y crear notificaciones accionables.

## Que Revisa

- Process Guard: File Service con MOD listo, descargado o aplicado sin post escritura/cierre tecnico.
- File Service pendiente: originales cargados o Master notificado sin avance.
- Postventa tecnica abierta: correcciones, DTC o cliente que volvio.
- Bitacora operativa ALTA/URGENTE abierta.
- Pagos bloqueando entrega: orden lista para entrega sin pago confirmado.
- Comprobantes pendientes de revision administrativa.

## Que No Hace

- No borra datos.
- No cambia estados de ordenes.
- No marca pagos.
- No cierra procesos tecnicos.
- No envia WhatsApp, Instagram ni correos externos.
- No reemplaza validacion humana.

## Variables Railway

Por defecto el scheduler queda apagado.

```bash
ENABLE_INTERNAL_AUTOMATIONS=false
AUTOMATION_INTERVAL_MINUTES=10
AUTOMATION_START_DELAY_SECONDS=30
```

Para activarlo en Railway cuando ya este probado:

```bash
ENABLE_INTERNAL_AUTOMATIONS=true
AUTOMATION_INTERVAL_MINUTES=10
AUTOMATION_START_DELAY_SECONDS=30
```

Para desactivarlo, volver a:

```bash
ENABLE_INTERNAL_AUTOMATIONS=false
```

## Endpoints

Protegidos por token interno y rol OWNER/ADMIN:

- `GET /api/automatizaciones/scheduler/status`
- `POST /api/automatizaciones/scheduler/run-once`

`run-once` ejecuta una revision completa manual sin cambiar datos operativos.

## Anti-Spam

- Una misma alerta para la misma entidad no se repite mas de una vez cada 2 horas.
- Process Guard respeta el nivel de alerta por entidad para evitar duplicados infinitos.
- Si un modulo falla, el ciclo continua con los demas.
- Los errores se registran en logs simples sin tokens ni datos sensibles.

## Dashboard

OWNER/ADMIN ven el bloque Scheduler Interno dentro de Automatizaciones GMTCH:

- Estado: Activo / Desactivado.
- Intervalo.
- Ultima revision.
- Proxima revision aproximada.
- Boton `Ejecutar revision ahora`.

Si esta apagado, el Dashboard muestra:

`Scheduler interno desactivado. Activa ENABLE_INTERNAL_AUTOMATIONS=true en Railway cuando este probado.`

## QA Recomendado

1. Confirmar que con `ENABLE_INTERNAL_AUTOMATIONS=false` el servidor inicia sin ciclos automaticos.
2. Probar `GET /api/automatizaciones/scheduler/status` como OWNER.
3. Probar `POST /api/automatizaciones/scheduler/run-once` como OWNER.
4. Confirmar que se crean notificaciones accionables si hay alertas.
5. Confirmar que no cambia estados, pagos ni cierres.
6. Repetir `run-once` y validar anti-spam.
7. Activar variable en Railway solo despues de pruebas manuales.

## Riesgos Pendientes

- Si Railway reinicia varias instancias del backend, cada instancia podria iniciar su propio scheduler. V1 asume una instancia backend.
- El almacenamiento de archivos sigue dependiendo de la estrategia actual; V1 no migra uploads a R2/S3.
- El scheduler genera visibilidad, pero no reemplaza disciplina operativa.
