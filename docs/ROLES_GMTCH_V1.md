# Roles GMTCH V1

Documento práctico para entender roles, responsables y administración de usuarios en Gmtch Tune OS.

## Usuarios actuales

| Persona | Rol principal | Enfoque operativo |
| --- | --- | --- |
| Gastón | OWNER | Diagnóstico avanzado, supervisión general, administración |
| Camila | RECEPCION | Recepción, cobro, entrega y coordinación |
| Felipe | OPERADOR_ECU | Diagnóstico, lectura ECU, apoyo técnico |
| Alejandro | OPERADOR_ECU | Diagnóstico, lectura ECU, apoyo técnico |
| Gerson | MECANICO | Trabajo mecánico asignado |

## Conceptos clave

El rol principal no siempre significa única tarea.

Una persona puede apoyar otra etapa si el taller lo necesita. El rol define permisos generales dentro del sistema, pero el responsable asignado indica quién tiene la pelota ahora.

## Responsable asignado

Responsable asignado significa que esa persona debe tomar acción o seguimiento en esa etapa.

Ejemplos:

- Diagnóstico / scanner: quien debe revisar o cargar diagnóstico.
- Operador ECU: quien debe leer, escribir o coordinar ECU.
- Mecánico: quien debe ejecutar trabajo físico.
- Supervisor: quien debe revisar o destrabar.
- Tuner / Master: quien debe trabajar o validar archivo.
- Slave / operador externo: quien debe ejecutar escritura o apoyo externo.

## Usuarios y seguridad

- Los usuarios no se eliminan físicamente.
- Si alguien deja de operar, se desactiva su acceso.
- Desactivar usuario conserva historial, responsables, cobros, entregas y auditoría.
- No compartir usuarios ni contraseñas.

## Listado de responsables

Los usuarios asignables se listan desde:

`GET /usuarios/responsables`

Ese listado devuelve solo usuarios activos y datos mínimos:

- id
- nombre
- username
- rol
- activo

No devuelve contraseñas ni datos sensibles.

## Administración de usuarios

La administración completa de usuarios es solo para OWNER.

OWNER puede:

- Crear usuarios.
- Cambiar roles.
- Cambiar contraseñas.
- Activar o desactivar usuarios.

Los demás roles pueden aparecer como responsables, pero no deben administrar usuarios.

## Recomendación operativa

Antes de iniciar la jornada:

1. Confirmar usuarios activos.
2. Revisar dashboard y checklist operativo.
3. Asignar responsables a órdenes abiertas.
4. Revisar File Service activos y correcciones pendientes.
5. Confirmar quién cobra y quién entrega.
