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

## 3. QA Ordenes

- Crear orden con vehiculo existente.
- Editar prioridad sin perder datos.
- Asignar responsables por etapa.
- Cambiar estados operativos.
- Marcar LISTO_PARA_ENTREGA.
- Confirmar pago y entregar solo si corresponde.
- Validar que roles sin permisos comerciales no vean caja, ventas ni ticket promedio.

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
