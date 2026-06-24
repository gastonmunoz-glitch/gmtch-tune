# Smoke Test Produccion V1

Este documento explica como ejecutar una prueba rapida de endpoints principales de Gmtch Tune OS despues de cada deploy.

## Que es el smoke test

El smoke test es una verificacion corta para confirmar que produccion responde y que los endpoints protegidos principales funcionan con un token real de usuario.

No reemplaza QA completo. Solo ayuda a detectar fallas basicas despues de un deploy.

## Cuando usarlo

Usar despues de:

- Deploy de backend.
- Deploy de frontend que dependa de endpoints.
- Cambios de permisos, rutas o autenticacion.
- Antes de abrir operacion en taller.

## Como obtener TOKEN desde navegador

1. Entrar a la app de produccion.
2. Iniciar sesion con un usuario valido.
3. Abrir la consola del navegador.
4. Ejecutar:

```js
localStorage.getItem("token")
```

5. Copiar el token completo.

No pegar el token en commits, tickets, capturas ni mensajes publicos.

## Como ejecutar en CMD Windows

```bat
cd /d C:\gmtch-tune-app
set TOKEN=PEGAR_TOKEN_AQUI
node scripts/smoke-prod.js
```

Opcionalmente se puede cambiar la API:

```bat
set API_BASE=https://gmtch-tune-production.up.railway.app/api
node scripts/smoke-prod.js
```

## Endpoints probados

- `GET /api/health`
- `GET /api/usuarios/responsables`
- `GET /api/ordenes`
- `GET /api/archivos-ecu`
- `GET /api/notificaciones`

## Como interpretar OK / FALLA

- `OK`: el endpoint respondio con status HTTP exitoso.
- `FALLA`: el endpoint respondio con error HTTP o hubo error de red.

El script muestra:

- nombre de prueba
- status HTTP
- OK / FALLA
- detalle breve si falla
- resumen final con pasadas y fallidas

Si alguna prueba falla, el script termina con codigo de salida `1`.

## Si falla /usuarios/responsables

Revisar:

- que el usuario tenga token valido
- que backend tenga montado `/api/usuarios`
- que la ruta `/usuarios/responsables` exista
- que el middleware permita roles operativos
- que existan usuarios activos

Impacto probable: no se podran asignar responsables en Ordenes o File Service.

## Si falla /ordenes o /archivos-ecu

Revisar:

- token expirado o usuario sin permiso
- backend desplegado correctamente
- Railway backend activo
- conexion a base de datos
- logs de errores en controllers

Impacto probable: el taller no podra operar fila de trabajo o File Service.

## Si falla /notificaciones

Revisar:

- modelo/tabla `notificaciones`
- montaje de `/api/notificaciones`
- permisos GET/PATCH
- logs del backend

Impacto probable: la campana no mostrara eventos internos, pero el flujo principal podria seguir funcionando.

## Buenas practicas

- Ejecutar con token de `gaston` para validacion completa.
- Ejecutar tambien con token operativo si se quiere validar permisos reales.
- No guardar tokens en archivos.
- Si falla una prueba critica, revisar logs antes de operar con clientes.
