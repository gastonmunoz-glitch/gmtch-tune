# QA Operación V1

Checklist manual para validar Gmtch Tune OS antes de operar con clientes reales.

Usar esta tabla en pruebas. Completar Resultado real y Observaciones durante la revisión.

| Prueba | Resultado esperado | Resultado real | Observaciones |
| --- | --- | --- | --- |
| Login como gaston | Entra como OWNER y ve dashboard, usuarios, órdenes y File Service |  |  |
| Login como camila | Entra como RECEPCION y ve recepción, clientes, órdenes y fotos permitidas |  |  |
| Login como felipe | Entra como OPERADOR_ECU y ve órdenes/File Service según permisos |  |  |
| Login como alejandro | Entra como OPERADOR_ECU y ve órdenes/File Service según permisos |  |  |
| Crear cliente | Cliente queda guardado y aparece en listado |  |  |
| Buscar patente existente | Muestra vehículo, cliente y permite crear nueva orden |  |  |
| Buscar patente nueva | Permite crear cliente, vehículo y orden |  |  |
| Crear orden | Orden queda creada con estado inicial y monto |  |  |
| Subir múltiples fotos | Se cargan varias fotos asociadas a la orden |  |  |
| Crear diagnóstico con DTC | Diagnóstico queda asociado a la orden con DTC visible |  |  |
| Crear diagnóstico sin DTC | Permite marcar SIN DTC y guardar observación |  |  |
| Crear File Service | Archivo original queda asociado a la orden |  |  |
| Asignar responsables en orden | Responsable queda guardado y visible en la orden |  |  |
| Asignar responsables en File Service | Responsable queda guardado y visible en File Service |  |  |
| Ver notificaciones | Campana/listado muestra notificaciones internas |  |  |
| Subir MOD | MOD queda cargado como versión nueva |  |  |
| Registrar post escritura OK | Post escritura queda registrada con evidencia |  |  |
| Solicitar corrección | File Service queda con corrección pendiente |  |  |
| Finalizar técnico | File Service finaliza y orden queda lista para entrega |  |  |
| Cobrar y entregar | Orden queda pagada y entregada |  |  |
| Revisar dashboard | Métricas, alertas y checklist muestran datos coherentes |  |  |
| Revisar ficha vehículo | Muestra historial, fotos, diagnósticos, File Service y pagos |  |  |

## Reglas de prueba

- Probar con al menos una patente existente y una nueva.
- Probar con una orden que requiere File Service y otra que no.
- Confirmar que los responsables asignados aparecen después de refrescar.
- Confirmar que usuarios no OWNER no pueden administrar usuarios.
- Confirmar que desactivar usuario no borra historial.

## Criterio mínimo para operar

Se puede operar si:

- Login funciona para los usuarios reales.
- Recepción rápida crea orden sin duplicar vehículo.
- Fotos múltiples funcionan.
- Diagnóstico y File Service guardan evidencia.
- Pago y entrega funcionan desde Órdenes.
- Dashboard no se rompe y muestra alertas/checklist.

Si falla cobro, entrega o creación de orden, no operar hasta corregir.
