# Campañas Meta / Leads V1 - GMTCH Tune OS

## Objetivo

Campañas V1 prepara el CRM para medir origen comercial antes de conectar APIs reales de Meta, WhatsApp o Instagram. La regla base es registrar todo lead manualmente y medir calidad, no solo volumen de mensajes.

## Canales Soportados

- WhatsApp
- Instagram Ads
- Facebook Ads
- Grupos Facebook
- Web
- Referidos
- Presencial
- Otro

WhatsApp oficial público: `+56 9 6226 7642`.

## Campañas

Cada campaña registra:

- nombre, canal, objetivo y estado.
- presupuesto interno.
- fecha inicio y fecha fin.
- UTM source, campaign y content.
- descripción y responsable creador.

Estados: `BORRADOR`, `ACTIVA`, `PAUSADA`, `FINALIZADA`.

## Reglas Operativas

- Usar un WhatsApp público único para campañas.
- Registrar todo lead en `/leads`.
- Si el origen no se sabe, usar “Sin campaña / orgánico”.
- No conectar bot automático hasta probar campañas, tarifario y respuesta sugerida.
- Usar Click-to-WhatsApp como campaña inicial recomendada.
- Medir potencial real, agendados y ganados, no solo cantidad de mensajes.

## Métricas V1

- leads totales.
- leads sin datos mínimos.
- potenciales reales.
- cotizados.
- agendados.
- ganados.
- perdidos.
- presupuesto.
- costo estimado por lead.
- costo estimado por lead real.
- conversión simple.

## Permisos

- OWNER/ADMIN crean y editan campañas.
- RECEPCION ve campañas activas y asigna leads.
- SUPERVISOR ve resumen.
- Operadores no ven presupuesto ni métricas comerciales sensibles.
- Portal Masters externo no accede.

## Preparación Para Meta

V1 guarda UTM y campaña en el lead. Cuando se conecte Meta/WhatsApp API, la integración podrá mapear `utm_source`, `utm_campaign`, `utm_content`, canal y campaña sin rehacer el modelo comercial.
