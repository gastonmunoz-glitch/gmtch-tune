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

## 2. QA Dashboard / Centro de Mando

- Semaforo operativo muestra Operacion normal, Atencion requerida o Bloqueo operativo segun datos.
- Atencion inmediata muestra correcciones, archivos ECU, post escritura, nueva lectura, MOD listo, listos para entrega y pagos pendientes.
- Cola de trabajo muestra orden, cliente/vehiculo, estado, prioridad, responsable y proxima accion.
- Bloque File Service separa pendiente revision, en proceso, MOD listo, correccion, nueva lectura y post escritura.
- Postventa/correcciones muestra DTC, cliente volvio, responsable sugerido y estado.
- Intervencion fisica separa mecanica asociada vs mecanica independiente.
- Bitacora rapida permite crear observacion y listar abiertas.
- Notificaciones mantienen campana, contador, alerta flotante y polling.
- Sonido: probar normal, fuerte y boton de prueba sin repeticion infinita.

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

## 7. QA File Service Interno

- Crear File Service desde orden valida.
- Subir archivo original.
- Asignar responsables File Service.
- Registrar procesamiento externo si aplica.
- Subir MOD.
- Ver MOD listo.
- Registrar post escritura OK.
- Solicitar correccion si aplica.
- Finalizar tecnico sin cerrar pago ni entrega comercial.

## 8. QA Portal Masters

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

## 9. QA Notificaciones

- Nueva solicitud portal crea alerta.
- Nueva lectura crea alerta.
- Correccion portal crea alerta.
- Postventa interna crea alerta.
- Bitacora urgente crea alerta.
- Sonido activado suena una vez por evento nuevo.
- Alerta visual aparece sin tapar toda la pantalla.
- Contador de campana aumenta y baja al marcar leidas.

## 10. QA Web Publica

- `/web` carga en desktop y celular.
- WhatsApp apunta a `+56 9 6226 7642`.
- Instagram apunta a `https://instagram.com/gmtchtune`.
- Secciones Stage 1, Stage 2, Stage 3 visibles.
- Servicios tecnicos, File Service y soporte a talleres visibles.
- Formulario/CTA WhatsApp funciona.
- No hay textos tipo placeholder, rellenar o instrucciones internas.

## 11. QA Seguridad Basica

- Portal externo no accede a rutas internas.
- Usuario interno no usa ni mezcla `portalToken`.
- Descargas protegidas requieren token correcto.
- No se exponen paths internos del servidor.
- Errores no muestran secretos.
- No hay tokens impresos en consola.
- Portal admin no visible para usuarios externos.

## 12. Tabla de Resultado

| Prueba | Resultado OK/Falla | Evidencia | Responsable | Observacion |
| --- | --- | --- | --- | --- |
| Health backend |  |  |  |  |
| Login interno |  |  |  |  |
| Dashboard V2 |  |  |  |  |
| Bitacora operativa |  |  |  |  |
| Ordenes |  |  |  |  |
| Postventa tecnica |  |  |  |  |
| Intervencion fisica |  |  |  |  |
| File Service interno |  |  |  |  |
| Portal Masters |  |  |  |  |
| Notificaciones |  |  |  |  |
| Web publica |  |  |  |  |
| Seguridad basica |  |  |  |  |

## Criterio de Operacion

- Operar: smoke test OK, login OK, dashboard OK, ordenes y File Service OK.
- Operar con cuidado: falla una funcion no critica y existe workaround documentado.
- No operar: falla login, backend, ordenes, File Service, pagos/entrega o seguridad de portal.
