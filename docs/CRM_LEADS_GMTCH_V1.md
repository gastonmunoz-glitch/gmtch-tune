# CRM Comercial y Leads V1 - GMTCH Tune OS

## Objetivo

CRM Comercial V1 centraliza oportunidades que llegan por WhatsApp, Instagram, web, llamada, presencial o referidos. El objetivo es no perder conversaciones reales y convertirlas en cliente, vehiculo y orden solo cuando exista interes validado.

## Reglas V1

- No envia mensajes automaticos.
- No usa API real de WhatsApp ni Instagram.
- No crea ordenes automaticamente sin accion humana.
- No cambia pagos, entregas ni estados operativos existentes.
- Las sugerencias son deterministicas y deben revisarse antes de responder.
- Los operadores ECU/TUNER solo ven leads asignados.
- OWNER, ADMIN y RECEPCION gestionan leads.
- SUPERVISOR ve la cola completa y puede asignar responsables.

## Estados del Pipeline

- `NUEVO`: contacto recien registrado.
- `CONTACTADO`: ya hubo respuesta saliente.
- `CALIFICANDO`: faltan datos para definir interes.
- `POTENCIAL_REAL`: oportunidad con datos suficientes.
- `COTIZADO`: ya se envio orientacion/cotizacion.
- `AGENDADO`: existe intencion clara de visita.
- `GANADO`: convertido a operacion real.
- `PERDIDO`, `NO_INTERESADO`, `SPAM`: cierre comercial sin avance.

## Score Comercial

El backend calcula un score de 0 a 100 usando reglas simples:

- Vehiculo claro: +20.
- Datos minimos para cotizar completos: +15.
- Servicio concreto: +15.
- Ubicacion cercana o posible visita: +15.
- Intencion de agendar: +20.
- Patente o motor informado: +10.
- Taller, flota o master: +10.
- Solo pregunta precio sin datos minimos: -25.
- Presupuesto bajo el minimo del tarifario: -25.
- Datos completos y presupuesto compatible con rango cargado: +15.
- Spam o no relacionado: -50.

## Tarifario Comercial V1

El tarifario vive en `/api/tarifas` y sirve como base interna para responder sin inventar valores.

Campos principales:

- `servicio`, `categoria`, `moneda`.
- `precio_desde`, `precio_minimo`, `precio_referencia`.
- `requiere_evaluacion`, `requiere_diagnostico`, `activo`.
- `descripcion` y `notas_internas`.

Permisos:

- OWNER y ADMIN crean/editan tarifas.
- RECEPCION y SUPERVISOR ven tarifas activas para orientar cotizaciones.
- OPERADORES pueden ver referencias activas, pero no notas internas.
- Portal Masters externo no accede.

Regla operativa: si una tarifa tiene montos en cero, no se debe presentar como precio al cliente. Debe pedirse evaluacion o datos minimos.

## Agente Comercial con Tarifario

Cuando se crea o califica un lead, el backend busca la tarifa asociada al `servicio_interes`.

- Si faltan marca, modelo, año, motor o servicio, el lead queda con datos incompletos y la respuesta pide esos datos.
- Si el presupuesto informado es menor que `precio_minimo`, se marca `presupuesto_bajo` y la prioridad baja.
- Si hay datos completos y presupuesto compatible, sube el score y puede quedar como `POTENCIAL_REAL`.
- La respuesta sugerida puede incluir “precio desde” cuando exista tarifa cargada.
- No se envia mensaje automaticamente; solo se copia para responder manualmente.

## Notificaciones

Se crean notificaciones internas cuando:

- Un lead queda como potencial real.
- Un lead muestra intencion de agendar.
- Un lead nuevo lleva mas de 30 minutos sin respuesta.
- Un lead cotizado lleva mas de 24 horas sin seguimiento.

Todas apuntan a `/leads?leadId={id}` cuando hay lead especifico.

## Conversion

Desde `/leads` se puede:

- Convertir lead a cliente.
- Crear orden desde lead usando un `vehiculoId` existente.
- Registrar interacciones entrantes, salientes o internas.
- Copiar una respuesta sugerida para responder manualmente por el canal correspondiente.

## QA Minimo

1. Crear lead manual con telefono o mensaje.
2. Confirmar score, estado y prioridad.
3. Cargar o editar tarifa como OWNER/ADMIN.
4. Confirmar que RECEPCION ve tarifa activa y operadores no ven notas internas.
5. Crear lead que solo pregunta precio sin datos y confirmar baja de score.
6. Crear lead con presupuesto menor al minimo y confirmar alerta de presupuesto bajo.
7. Crear lead con datos completos y servicio con tarifa, confirmar respuesta sugerida.
8. Registrar interaccion saliente.
9. Convertir a cliente.
10. Crear orden desde lead con vehiculo existente.
11. Ver resumen CRM en Dashboard.
12. Confirmar que roles operativos no ven leads no asignados.
