# QA Operativo V1 - GMTCH Tune OS

Documento de validacion manual para ejecutar despues de cambios grandes, deploys o antes de operar con clientes reales. No incluir tokens, claves ni datos sensibles en evidencias.

## 1. Checklist General Despues de Deploy

- Backend responde: `https://api.gmtchtune.com/api/health`.
- Login interno funciona en `https://gmtchtune.com/login`.
- Dashboard / Centro de Mando V2 carga sin errores visibles.
- Roles y permisos se respetan: OWNER, ADMIN, SUPERVISOR, RECEPCION, OPERADOR_ECU, MECANICO, TUNER.
- Web publica carga en `https://gmtchtune.com/web`.
- Portal Masters login carga en `https://gmtchtune.com/portal/login`.
- Portal admin interno carga en `/portal-admin` solo para rol autorizado.
- Notificaciones cargan contador y ultimas alertas.

## 1.1 QA Post Reset Operativo

- Ejecutar primero `node scripts/reset-operacion.js` en DRY_RUN y revisar conteos.
- Confirmar que `Usuarios` no se borra.
- Confirmar si `PortalCuenta` y `PortalUsuario` se conservan o si se usara `RESET_PORTAL_ACCOUNTS=true`.
- Despues del reset real, confirmar dashboard sin clientes, vehiculos, ordenes, fotos, File Service ni finanzas demo.
- Confirmar que `gaston` puede iniciar sesion.
- Crear cliente, vehiculo y orden real de prueba controlada.
- Ejecutar `node scripts/smoke-prod.js` con token OWNER.

## 1.2 Puesta en marcha lunes / operacion con base limpia

- Login como OWNER y confirmar que el Dashboard muestra el checklist de inicio del lunes.
- Confirmar empty state de Clientes: aun no hay clientes reales registrados.
- Confirmar empty state de Vehiculos: registrar el primer vehiculo para iniciar operacion.
- Confirmar empty state de Ordenes: crear la primera orden real del dia.
- Confirmar empty state de File Service: seleccionar o crear una orden antes de registrar archivos.
- Confirmar empty state de Finanzas: sin movimientos registrados despues del reset.
- Confirmar empty state de Bitacora: sin observaciones abiertas.
- Crear el primer cliente real con nombre y telefono correcto.
- Crear el primer vehiculo real con patente normalizada, marca y modelo.
- Crear la primera orden usando servicio sugerido y luego editar motivo si corresponde.
- Validar que prioridad quede seleccionada y editable manualmente.
- Validar que recepcion use la guia: Cliente, Vehiculo, Motivo / Servicio, Prioridad / Responsable, Crear orden.
- Probar notificacion interna con una accion simple.
- Probar PWA en iPhone desde Safari: Compartir, Agregar a pantalla de inicio.
- Confirmar que datos demo no aparecen en dashboard, finanzas ni estadisticas.

## 2. QA Dashboard / Centro de Mando

- Semaforo operativo muestra Operacion normal, Atencion requerida o Bloqueo operativo segun datos.
- Atencion inmediata muestra correcciones, archivos ECU, post escritura, nueva lectura, MOD listo, listos para entrega y pagos pendientes.
- Finanzas OWNER/ADMIN muestra ingresos pagados separados de pendientes/presupuestados.
- Graficos simples muestran pagado vs pendiente, ordenes por estado, material mes e ingresos vs egresos.
- Cola de trabajo muestra orden, cliente/vehiculo, estado, prioridad, responsable y proxima accion.
- Bloque File Service separa pendiente revision, en proceso, MOD listo, correccion, nueva lectura y post escritura.
- Postventa/correcciones muestra DTC, cliente volvio, responsable sugerido y estado.
- Intervencion fisica separa mecanica asociada vs mecanica independiente.
- Bitacora rapida permite crear observacion y listar abiertas.
- Notificaciones mantienen campana, contador, alerta flotante y polling.
- Sonido: probar normal, fuerte y boton de prueba sin repeticion infinita.

## 2.3 QA Sistema Visual de Estados

- Confirmar que rojo se use solo para critico, urgente, bloqueado, vencido, cliente volvio o pago bloqueando entrega.
- Confirmar que ambar se use para pendiente, requiere atencion o espera de accion interna.
- Confirmar que azul se use para procesos en curso.
- Confirmar que morado se use para espera de tercero: master, slave, cliente, proveedor o nueva lectura.
- Confirmar que verde se use para listo, completado, pagado o validado.
- Confirmar que gris se use para archivado, cancelado, perdido, spam o sin accion.
- Revisar Dashboard, Ordenes, File Service, Portal Admin, Finanzas, Leads y Notificaciones.

## 2.1 QA Agentes IA GMTCH V1

- Login como OWNER y confirmar bloque `Agentes IA GMTCH` en dashboard.
- Login como ADMIN si existe y confirmar acceso al bloque.
- Login como RECEPCION/OPERADOR_ECU/MECANICO/TUNER y confirmar que el bloque no aparece.
- Probar `GET /api/ai-agents/gerente-diario` con token OWNER.
- Probar `GET /api/ai-agents/resumen-operativo` con token OWNER.
- Probar `GET /api/ai-agents/auditoria-dia` con token OWNER.
- Probar `GET /api/ai-agents/file-service-alertas` con token OWNER.
- Probar `GET /api/ai-agents/finanzas-resumen` con token OWNER.
- Confirmar que cada agente devuelve resumen, alertas, sugerencias, accion recomendada y links.
- Confirmar que las sugerencias no crean ordenes, no cambian estados, no marcan pagos y no borran datos.
- Confirmar que si un endpoint falla, el dashboard sigue funcionando.
- Confirmar que los links de agentes llevan a modulos existentes: ordenes, File Service, Finanzas, Portal admin o bitacora.

## 2.2 QA Automatizaciones Operativas V1

- Login como OWNER y confirmar bloque `Automatizaciones GMTCH`.
- Ejecutar `Revision operativa` y confirmar resumen, prioridad, alertas y links accionables.
- Generar `Reporte apertura` y confirmar que se guarda como ultimo reporte.
- Generar `Reporte cierre` y confirmar que se guarda como ultimo reporte.
- Confirmar que apertura/cierre crean notificacion interna para OWNER/ADMIN/SUPERVISOR si hay alertas ALTA/URGENTE.
- Confirmar anti-spam: repetir la misma automatizacion no debe duplicar la misma alerta mas de una vez cada 2 horas.
- Ejecutar revision `File Service` y confirmar deteccion de post escritura, correcciones, nueva lectura, archivos sin responsable y casos viejos.
- Ejecutar revision `Finanzas` solo con OWNER/ADMIN.
- Ejecutar revision `Material recuperado` con OWNER/ADMIN/SUPERVISOR.
- Login como RECEPCION/OPERADOR_ECU/MECANICO/TUNER y confirmar que no aparecen botones de Finanzas ni reportes administrativos.
- Confirmar que ninguna automatizacion cambia estado, marca pagos, cierra ordenes, borra datos ni envia mensajes externos.
- Confirmar que Portal Masters externo no puede acceder a `/api/automatizaciones`.

## 2.2.1 QA Scheduler Interno V1

- Confirmar que con `ENABLE_INTERNAL_AUTOMATIONS=false` el Dashboard muestra Scheduler desactivado para OWNER/ADMIN.
- Probar `GET /api/automatizaciones/scheduler/status` con token OWNER/ADMIN.
- Probar que roles operativos no acceden a `scheduler/status` ni `scheduler/run-once`.
- Ejecutar `POST /api/automatizaciones/scheduler/run-once` desde el Dashboard con `Ejecutar revision ahora`.
- Confirmar que el resultado muestra ultima revision, resumen y notificaciones creadas si habia alertas.
- Confirmar que no cambia estados de ordenes, File Service, pagos ni cierres tecnicos.
- Confirmar anti-spam: repetir `run-once` no duplica la misma alerta de la misma entidad dentro de 2 horas.
- Confirmar que Process Guard no duplica infinitamente el mismo nivel para el mismo archivo.
- Confirmar que si un modulo falla, el endpoint responde resumen y no rompe el dashboard.
- Activar `ENABLE_INTERNAL_AUTOMATIONS=true` en Railway solo despues de validar manualmente.

## 3. QA Ordenes

- Crear orden con vehiculo existente.
- Editar prioridad sin perder datos.
- Asignar responsables por etapa.
- Cambiar estados operativos.
- Marcar LISTO_PARA_ENTREGA.
- Confirmar pago y entregar solo si corresponde.
- Validar que roles sin permisos comerciales no vean caja, ventas ni ticket promedio.

## 3.1 QA CRM Comercial / Leads V1

- Login como OWNER/ADMIN/RECEPCION/SUPERVISOR y confirmar acceso a `/leads`.
- Login como OPERADOR_ECU/TUNER y confirmar que solo ve leads asignados.
- Crear lead manual desde WhatsApp con nombre, telefono, servicio y mensaje inicial.
- Confirmar que se calcula score, estado, prioridad y proxima accion.
- Crear/editar tarifa como OWNER o ADMIN desde `/leads`.
- Confirmar que RECEPCION/SUPERVISOR ven tarifas activas.
- Confirmar que OPERADOR_ECU/TUNER no ven notas internas de tarifas.
- Crear lead que solo pregunta precio sin marca/modelo/año/motor y confirmar `Sin datos minimos`.
- Crear lead con presupuesto bajo el minimo del tarifario y confirmar prioridad BAJA o alerta de presupuesto bajo.
- Crear lead con datos completos y presupuesto compatible y confirmar mejora de score.
- Crear campaña como OWNER/ADMIN con canal FACEBOOK_ADS o INSTAGRAM_ADS.
- Confirmar que RECEPCION ve campañas activas y puede asignar lead.
- Confirmar que un lead sin campaña queda como “Sin campaña / orgánico”.
- Confirmar que UTM source/campaign/content quedan guardados si se ingresan.
- Confirmar resumen por campaña: leads totales, potenciales reales, ganados, perdidos y conversion simple.
- Confirmar que operadores no ven presupuesto ni métricas sensibles de campaña.
- Confirmar que el Dashboard muestra Leads nuevos, Potenciales reales, Sin datos minimos, Presupuesto bajo, Sin responder +30m y Cotizados sin seguimiento.
- Confirmar que el Dashboard muestra leads calientes y campaña con más potenciales reales cuando existan datos.
- Registrar interaccion saliente y confirmar que el estado puede pasar a CONTACTADO.
- Copiar sugerencia de respuesta y confirmar que usa precio desde solo si hay tarifa cargada.
- Confirmar que la respuesta pide marca/modelo/año/motor cuando faltan datos.
- Confirmar que no se envia automaticamente.
- Convertir lead a cliente y confirmar que queda vinculado.
- Crear orden desde lead usando un vehiculo existente.
- Confirmar que notificaciones de lead llevan a `/leads?leadId={id}`.
- Confirmar que no se crean pagos, entregas ni cierres comerciales desde CRM.

## 4. QA Postventa Tecnica

- Registrar correccion/postventa asociada a orden.
- Guardar DTC y sintoma reportado.
- Marcar cliente volvio al taller.
- Asignar responsable sugerido.
- Confirmar notificacion interna.
- Confirmar que aparece en dashboard.
- Confirmar que aparece en ficha vehiculo.

## 5. QA Intervencion Fisica

- Crear orden sin intervencion fisica.
- Marcar mecanica asociada al servicio tecnico.
- Completar checklist fisico.
- Confirmar que no mueve a `PARA_MECANICA`.
- Marcar mecanica independiente / mantencion.
- Confirmar que puede moverse a `PARA_MECANICA`.

## 6. QA Bitacora Operativa

- Crear observacion prioridad MEDIA.
- Crear observacion prioridad ALTA o URGENTE.
- Confirmar notificacion para OWNER/ADMIN/SUPERVISOR.
- Resolver observacion con rol autorizado.
- Confirmar que RECEPCION, OPERADOR_ECU, MECANICO y TUNER pueden crear/ver.
- Confirmar que roles no autorizados no pueden resolver.

## 7. QA Finanzas / Material Recuperado

- Entrar a `/finanzas` con OWNER o ADMIN y confirmar que se ven valores.
- Entrar con RECEPCION/OPERADOR_ECU/MECANICO y confirmar que kg se ven, pero valores financieros aparecen ocultos.
- Confirmar que el acceso de menu Finanzas solo aparece para OWNER/ADMIN.
- Confirmar que cada tab muestra resumen/lista primero y no despliega todo el detalle al cargar.
- Confirmar que formularios de crear nuevo estan colapsados o claramente separados.
- Seleccionar/expandir movimiento, comprobante o material y confirmar que aparece el detalle.
- Confirmar panel ejecutivo de Finanzas: semaforo financiero, tarjetas grandes y micrograficos simples.
- Confirmar ayuda visible: Pagado, Pendiente, Fondo reserva y Material recuperado.
- Confirmar aviso OWNER/ADMIN: datos actuales pueden incluir pruebas hasta ejecutar reset operativo.
- Subir comprobante de transferencia desde una orden y confirmar estado `PENDIENTE_REVISION`.
- Confirmar que subir comprobante no marca la orden como pagada ni entregada.
- Validar y rechazar comprobantes con OWNER/ADMIN.
- Descargar comprobante protegido con sesion activa.
- Registrar ingreso tipo `SERVICIO`, `FILE_SERVICE`, `VENTA_MATERIAL` u `OTRO`.
- Registrar gasto operativo con categoria, monto, fecha, proveedor y descripcion.
- Registrar sueldo semanal como egreso categoria `SUELDO`.
- Confirmar campos sueldo semanal: semana_inicio, semana_fin, trabajador, tipo, monto, estado, fecha pago y observacion.
- Confirmar que `periodo` queda guardado como rango semanal compatible.
- Confirmar que cierre semanal toma sueldos dentro del rango semana seleccionado.
- Confirmar que sueldos y utilidad no son visibles para roles operativos.
- Registrar movimiento de fondo de reserva: aporte, retiro y ajuste.
- Previsualizar cierre semanal con ingresos, egresos, sueldos, aporte reserva y utilidad distribuible.
- Cerrar semana y confirmar reparto en 3 para Gaston, Felipe y Alejandro.
- Confirmar advertencia si la utilidad distribuible es negativa.
- Registrar material recuperado desde una orden DPF/FAP o intervencion fisica asociada.
- Confirmar autocompletado de patente, marca, modelo y ano al seleccionar orden.
- Registrar kg mayores a 0 y confirmar lote automatico `YYYY-MM`.
- Confirmar que se calcula alerta OK/REVISAR/ALERTA segun promedio historico.
- Confirmar resumen mensual de material: lote actual, kg acumulados, kg esperados, diferencia kg/%, valor estimado y valor vendido.
- Confirmar ranking por modelo: promedio kg, cantidad registros y confianza BAJA/MEDIA/ALTA.
- Confirmar que registros fuera de rango aparecen como alertas y se puede seleccionarlos.
- Confirmar que el detalle de material aparece solo al seleccionar un registro.
- Crear caso fuera de rango mayor a 20% y confirmar notificacion a OWNER/ADMIN.
- Revisar ranking por modelo, promedio kg, minimo, maximo y confianza estadistica.
- Revisar cierre mensual: kg esperados, kg reales, diferencia y valor estimado.
- Marcar venta solo con OWNER/ADMIN: comprador, precio real kg y valor real.
- Desde material vendido, registrar ingreso financiero tipo `VENTA_MATERIAL`.
- Cerrar lote mensual solo con OWNER/ADMIN.
- Confirmar que ficha vehiculo muestra historial de material recuperado.
- Confirmar que ficha vehiculo muestra comprobantes asociados.
- Confirmar que Centro de Mando muestra solo para OWNER/ADMIN: pagos por revisar, utilidad semanal estimada, fondo reserva y material del mes.
- Confirmar que Centro de Mando muestra micrograficos de ingresos/gastos, pagado/pendiente, fondo/material.
- Confirmar que no se modifican pagos, entrega ni cierre comercial de la orden.

## 8. QA File Service Interno

- Crear File Service desde orden valida.
- Subir archivo original.
- Asignar responsables File Service.
- Registrar procesamiento externo si aplica.
- Subir MOD.
- Ver MOD listo.
- Registrar post escritura OK.
- Solicitar correccion si aplica.
- Finalizar tecnico sin cerrar pago ni entrega comercial.

### QA Process Guard V1

- Subir MOD y confirmar que aparece `Process Guard: esperando post escritura/cierre`.
- Marcar MOD descargado/aplicado y confirmar `mod_descargado_at`.
- Simular caso MOD listo sin post escritura y ejecutar `POST /api/automatizaciones/process-guard/revisar`.
- Confirmar SLA visual 30/60/120/180 min: aviso, advertencia, critico y escalado.
- Registrar post escritura OK y confirmar que sigue pidiendo cierre tecnico.
- Cerrar tecnico OK y confirmar que la orden pasa a `LISTO_PARA_ENTREGA` sin marcar pago ni entrega.
- Registrar resultado `REQUIERE_CORRECCION` y confirmar notificacion accionable.
- Registrar resultado `REQUIERE_NUEVA_LECTURA` y confirmar alerta/escalamiento.
- Confirmar dashboard `Procesos sin cierre`: total, criticos y por responsable.
- Confirmar que notificacion abre `/archivos-ecu?archivoId={id}#post-escritura`.
- Confirmar que no se duplican notificaciones infinitas por el mismo nivel del mismo archivo.

## 9. QA Portal Masters

- Login externo con Email de login portal.
- Crear cuenta/usuario portal desde portal admin si aplica.
- Cargar archivo desde portal externo.
- Confirmar que aparece en portal admin.
- Descargar archivo original protegido desde admin.
- Solicitar nueva lectura.
- Subir nueva lectura desde portal externo.
- Confirmar auditoria del evento.
- Subir MOD.
- Master descarga MOD.
- Confirmar credito descontado una sola vez.
- Confirmar redescarga sin doble descuento.

## 10. QA Notificaciones

- Nueva solicitud portal crea alerta.
- Nueva lectura crea alerta.
- Correccion portal crea alerta.
- Postventa interna crea alerta.
- Bitacora urgente crea alerta.
- Material recuperado fuera de rango crea alerta accionable hacia Finanzas.
- Notificacion operativa critica crea primera alerta inmediata.
- Si sigue no leida por 2 horas, se genera recordatorio suave con misma accion directa.
- Si sigue alta/urgente por 3 horas, se genera recordatorio fuerte.
- Confirmar que no se crean duplicados infinitos por la misma notificacion.
- Confirmar que recordatorio fuerte usa sonido fuerte/tsunami solo si el usuario activo alertas sonoras.
- Sonido activado suena una vez por evento nuevo.
- Alerta visual aparece sin tapar toda la pantalla.
- Contador de campana aumenta y baja al marcar leidas.

### QA Web Push PWA V1

- Confirmar `GET /api/push/status` con usuario autenticado.
- Confirmar que `GET /api/push/vapid-public-key` no devuelve clave privada.
- Confirmar que con `ENABLE_WEB_PUSH=false` el panel muestra backend inactivo.
- Activar `ENABLE_WEB_PUSH=true` con VAPID keys en Railway y redeploy backend.
- En PC, abrir campana y presionar `Activar notificaciones en este dispositivo`.
- Permitir notificaciones del navegador.
- Confirmar que `POST /api/push/subscribe` registra el dispositivo.
- Presionar `Enviar prueba` y confirmar notificacion del sistema.
- Como OWNER/ADMIN, presionar `Enviar prueba critica`.
- Confirmar que al tocar la push abre la URL accionable.
- Crear alerta ALTA/URGENTE de Process Guard o Scheduler y confirmar que genera push si el dispositivo esta registrado.
- Confirmar anti-spam: misma entidad/tag no debe repetir push al mismo usuario dentro de 5 minutos.
- Desactivar dispositivo y confirmar que no recibe nuevas pruebas.
- En iPhone, instalar PWA desde Safari antes de probar permisos.
- Confirmar que Portal Masters externo no puede usar endpoints `/api/push`.

## 11. QA Web Publica

- `/web` carga en desktop y celular.
- WhatsApp apunta a `+56 9 6226 7642`.
- Instagram apunta a `https://instagram.com/gmtchtune`.
- Secciones Stage 1, Stage 2, Stage 3 visibles.
- Servicios tecnicos, File Service y soporte a talleres visibles.
- Formulario/CTA WhatsApp funciona.
- No hay textos tipo placeholder, rellenar o instrucciones internas.

## 12. QA Seguridad Basica

- Portal externo no accede a rutas internas.
- Usuario interno no usa ni mezcla `portalToken`.
- Descargas protegidas requieren token correcto.
- No se exponen paths internos del servidor.
- Errores no muestran secretos.
- No hay tokens impresos en consola.
- Portal admin no visible para usuarios externos.
- Roles operativos no ven valores financieros de material recuperado.

## 13. Tabla de Resultado

| Prueba | Resultado OK/Falla | Evidencia | Responsable | Observacion |
| --- | --- | --- | --- | --- |
| Health backend |  |  |  |  |
| Login interno |  |  |  |  |
| Dashboard V2 |  |  |  |  |
| Agentes IA GMTCH V1 |  |  |  |  |
| Automatizaciones GMTCH V1 |  |  |  |  |
| Scheduler Interno V1 |  |  |  |  |
| Bitacora operativa |  |  |  |  |
| Ordenes |  |  |  |  |
| Postventa tecnica |  |  |  |  |
| Intervencion fisica |  |  |  |  |
| Finanzas / Material recuperado |  |  |  |  |
| File Service interno |  |  |  |  |
| Portal Masters |  |  |  |  |
| Notificaciones |  |  |  |  |
| Web publica |  |  |  |  |
| Seguridad basica |  |  |  |  |

## Criterio de Operacion

- Operar: smoke test OK, login OK, dashboard OK, ordenes y File Service OK.
- Operar con cuidado: falla una funcion no critica y existe workaround documentado.
- No operar: falla login, backend, ordenes, File Service, pagos/entrega o seguridad de portal.
