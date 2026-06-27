# Smoke Test Produccion V2

Guia para ejecutar `scripts/smoke-prod.js` despues de cada deploy o antes de operar GMTCH Tune OS en taller.

## Que valida

El script hace pruebas solo lectura contra endpoints principales:

- `GET /api/health`
- `GET /api/usuarios/responsables`
- `GET /api/ordenes`
- `GET /api/archivos-ecu`
- `GET /api/notificaciones`
- `GET /api/bitacora-operativa`
- `GET /api/finanzas/resumen`

No crea datos, no borra datos y no modifica produccion.

## Variables requeridas

- `API_BASE`: URL base de la API. Default: `https://api.gmtchtune.com/api`.
- `TOKEN`: token interno JWT de un usuario GMTCH. Obligatorio para endpoints protegidos.

## Como obtener TOKEN interno

1. Entrar a `https://gmtchtune.com/login`.
2. Iniciar sesion con un usuario valido.
3. Abrir consola del navegador.
4. Ejecutar:

```js
localStorage.getItem("token")
```

5. Copiar el token completo solo para la terminal local. No compartirlo ni guardarlo en archivos.

## Como ejecutar en CMD Windows

```bat
cd /d C:\gmtch-tune-app
set TOKEN=PEGAR_TOKEN_AQUI
node scripts/smoke-prod.js
```

Con API custom:

```bat
cd /d C:\gmtch-tune-app
set API_BASE=https://api.gmtchtune.com/api
set TOKEN=PEGAR_TOKEN_AQUI
node scripts/smoke-prod.js
```

## Resultado esperado

Cada prueba debe mostrar:

- nombre
- HTTP status
- `OK` o `FALLA`
- detalle breve si falla

Resumen esperado:

```text
Total pruebas: 7
Pasadas: 7
Fallidas: 0
```

Si alguna falla, el script termina con codigo `1`.

## Si da 401

Revisar:

- token vencido o mal copiado
- usuario desactivado
- token de Portal Masters usado por error
- endpoint requiere token interno, no `portalToken`

Accion: volver a iniciar sesion en `/login`, copiar `localStorage.getItem("token")` y repetir.

## Si da 403

Revisar:

- rol sin permiso para endpoint
- probar con usuario OWNER para validacion global
- confirmar permisos de `/usuarios/responsables` y `/bitacora-operativa`
- confirmar que `/finanzas/resumen` se prueba con OWNER/ADMIN

## Si da 500

Revisar:

- logs del backend en Railway
- conexion PostgreSQL
- migracion/tabla faltante
- errores de controller
- variables de entorno backend

No operar con clientes si fallan `ordenes`, `archivos-ecu` o login.

## Si Railway no desplego

Senales:

- frontend muestra cambios antiguos
- backend no tiene endpoint nuevo
- asset JS/CSS no cambia despues de deploy
- smoke test falla con 404 en endpoint nuevo

Acciones:

- revisar ultimo deploy en Railway
- confirmar servicio correcto: frontend vs backend
- revisar branch conectado a Railway
- revisar logs de build/start
- ejecutar smoke test nuevamente despues del redeploy

## Buenas practicas

- Ejecutar con token OWNER para prueba completa.
- Luego ejecutar con usuario operativo si se quiere validar permisos reales.
- No pegar tokens en capturas, chats, commits ni docs.
- Guardar evidencia solo con OK/FALLA, no con token.
- Complementar con `docs/QA_OPERATIVO_V1.md` antes de operacion real.
