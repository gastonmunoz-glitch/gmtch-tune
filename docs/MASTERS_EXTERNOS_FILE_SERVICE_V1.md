# Masters Externos File Service V1

## Recomendación actual

No dar acceso completo a masters externos todavía. El flujo interno debe seguir controlado por GMTCH hasta validar seguridad, permisos, trazabilidad y calidad de datos.

WhatsApp puede usarse como canal de entrada, pero no debe ser el sistema principal. Todo archivo recibido por WhatsApp debe ingresarse al portal para quedar asociado a cliente, vehículo, orden y File Service.

## Reglas operativas

- Cliente del master externo debe registrarse como `TALLER_ALIADO`.
- Cada archivo debe tener una orden de trabajo.
- Cada archivo debe tener un registro File Service.
- Todo MOD, corrección, post escritura y entrega técnica debe quedar en plataforma.
- No se deben procesar archivos externos sin trazabilidad mínima.
- Si el master envía información por WhatsApp, GMTCH debe copiarla al portal.

## Portal externo futuro

El portal externo debe estar aislado del sistema interno GMTCH. Un usuario externo solo debe ver sus propios File Service y estados asociados.

No debe ver:

- Clientes internos GMTCH.
- Dashboard.
- Usuarios.
- Órdenes internas.
- Caja, pagos o estadísticas globales.
- Historial técnico de otros talleres.

## Fases recomendadas

### Fase 1: ingreso manual por GMTCH

GMTCH recibe archivos por WhatsApp, correo o presencial. El equipo registra cliente `TALLER_ALIADO`, vehículo si corresponde, orden y File Service.

### Fase 2: formulario externo controlado

Crear formulario público o semiprivado para carga de datos mínimos: taller, contacto, vehículo, servicio solicitado y archivo original. GMTCH revisa antes de convertirlo en orden real.

### Fase 3: portal externo con login

Usuarios externos acceden con permisos limitados. Solo pueden ver sus solicitudes, estados, archivos enviados, MOD recibidos y observaciones.

### Fase 4: automatización WhatsApp

WhatsApp puede crear pre-solicitudes o adjuntar archivos automáticamente, pero siempre con validación y trazabilidad en plataforma.

## Riesgos

- Exponer información interna por permisos mal definidos.
- Duplicar órdenes si WhatsApp y portal no se sincronizan.
- Recibir archivos sin datos suficientes.
- Confundir cierre técnico con cobro o entrega comercial.
