# Reportes y Estadísticas V1

## Objetivo

Definir reportes futuros para convertir la operación diaria de GMTCH en información útil para ventas, flujo, calidad técnica y seguimiento.

## Regla base

Antes de confiar en reportes, se deben limpiar o marcar datos demo/test. Las órdenes y clientes excluidos de estadísticas no deben contaminar caja, ventas, ticket promedio ni flujo real.

## Reportes comerciales

- Ventas por día, semana y mes.
- Caja por medio de pago.
- Ticket promedio.
- Total pagado mensual.
- Trabajos ingresados por día.
- Servicios más vendidos.
- Categoría cliente vs ventas.
- Clientes VIP, FLOTA y TALLER_ALIADO.
- Órdenes excluidas de estadísticas.

## Reportes operativos

- Fechas y horarios de mayor flujo.
- Órdenes activas por estado.
- Órdenes listas para entrega.
- Órdenes pendientes de pago.
- Órdenes con seguimiento pendiente.
- Feedback operarios más recurrente.
- Historial por responsable u operario.

## Reportes técnicos

- File Service por tipo de servicio.
- File Service pendientes de post escritura.
- Correcciones solicitadas.
- Fallas recurrentes por DTC.
- Fallas por marca, modelo y año.
- Recomendaciones futuras por vehículo.
- Detalles pendientes por orden.

## Secuencia recomendada

### 1. Limpiar datos demo

Marcar clientes y órdenes de prueba con “Excluir de estadísticas / Demo”. No borrar historial.

### 2. Capturar datos consistentes

El equipo debe registrar montos, fecha de pago, estado de pago, entrega, diagnóstico, DTC, tipo de servicio y feedback operativo.

### 3. Crear reportes confiables

Cuando los datos estén estables, crear reportes filtrables por fecha, estado, cliente, categoría, marca, modelo, operario y tipo de servicio.

## Riesgos

- Reportes falsos por datos incompletos.
- Caja inflada por órdenes demo.
- Servicios mal clasificados.
- Feedback escrito sin criterio común.
- Mezclar datos internos con futuros datos de talleres externos.
