# Roadmap Portal Masters V1

## Objetivo

Crear una evolucion controlada para atender masters y talleres aliados sin exponer la operacion interna de GMTCH. WhatsApp puede ser canal de entrada, pero la fuente oficial debe seguir siendo Gmtch Tune OS.

## Fase 1: Ingreso Manual Por GMTCH

Los masters envian archivos por WhatsApp u otro canal. El equipo GMTCH registra manualmente cliente, vehiculo, orden y File Service. Esta fase mantiene control interno y evita exponer datos sensibles.

## Fase 2: Formulario Externo Controlado

Crear un formulario externo para subir archivos sin acceso al sistema interno. Debe pedir datos minimos: contacto, vehiculo, ECU, tipo de servicio, observacion y archivo original. GMTCH revisa y convierte cada solicitud en orden interna.

## Fase 3: Portal Externo Con Login

El master accede a un portal limitado donde solo ve sus propios trabajos. Funciones V1:

- Saldo de creditos.
- Subir archivo.
- Ver estado del archivo.
- Descargar MOD.
- Pedir correccion.
- Historial de archivos propios.

## Fase 4: Creditos Y Prepago

Implementar packs de creditos, consumo por servicio, vencimiento razonable y bloqueo de descarga si no existe saldo o pago confirmado. La logica debe proteger a GMTCH sin friccion excesiva para clientes frecuentes.

## Fase 5: Automatizacion WhatsApp

WhatsApp puede automatizar recepcion, avisos y recordatorios, pero no debe convertirse en el sistema principal. Todo archivo recibido debe quedar registrado en Gmtch Tune OS.

## Riesgos A Controlar

- No exponer clientes internos de GMTCH.
- No exponer dashboard ni estadisticas internas.
- No mostrar trabajos de otros talleres.
- No entregar MOD sin pago, credito o autorizacion.
- No mezclar datos de operacion GMTCH con datos externos.
- No permitir que el portal externo reemplace la trazabilidad interna.
