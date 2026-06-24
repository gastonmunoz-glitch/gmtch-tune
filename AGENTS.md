# Gmtch Tune OS - Reglas para Codex

Este repositorio corresponde a Gmtch Tune OS, una plataforma SaaS inicialmente orientada a talleres automotrices, diagnóstico, file service, mecánica, pagos, trazabilidad y colaboradores/slaves, con proyección a replicarse en otros rubros.

## Reglas generales

- No modificar archivos no solicitados.
- No hacer commits.
- No hacer push.
- No tocar backend si la tarea es frontend.
- No tocar frontend si la tarea es backend.
- No eliminar funciones existentes sin justificar.
- No cambiar arquitectura sin avisar.
- No tocar variables sensibles, tokens, credenciales ni archivos .env.
- Siempre devolver resumen de cambios.
- Siempre indicar qué archivos fueron modificados.
- Siempre indicar si el build/check pasó o falló.
- Siempre respetar la arquitectura Gmtch Tune OS.

## Arquitectura operativa

Mantener separados estos conceptos:

- Cierre técnico
- Cierre comercial
- Pago
- Entrega
- Auditoría
- Evidencia técnica
- Responsables por etapa

File Service no debe cerrar pago ni entrega comercial.
Órdenes de trabajo deben manejar pago, entrega y cierre comercial.

## Flujo base

Recepción
→ Diagnóstico obligatorio
→ File Service / trabajo técnico
→ Post escritura o validación final
→ Finalizado técnico
→ Orden lista para entrega
→ Pago confirmado
→ Entregado
→ Historial completo

## Reglas de trabajo

Cuando se pida un cambio:

1. Analizar antes de modificar.
2. Modificar solo los archivos solicitados.
3. Mantener compatibilidad con el flujo actual.
4. Priorizar trazabilidad, seguridad y escalabilidad.
5. Si detectas un riesgo, informarlo antes de cambiar más archivos.
6. No inventar rutas si el backend no las tiene.
7. No duplicar formularios si ya existe un módulo específico.
8. Preferir archivar antes que eliminar.
9. Registrar responsables y fechas cuando sea posible.

## Verificaciones recomendadas

Para backend:
node --check backend/server.js
node --check backend/src/controllers/<archivo>.js
node --check backend/src/routes/<archivo>.js

Para frontend:
npm --prefix frontend run build

## Rol de Codex

Codex es ejecutor técnico dentro del repositorio.
No decide la arquitectura final.
No hace commits.
No hace push.
Debe entregar cambios revisables.
