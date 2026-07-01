# Web Push GMTCH Tune OS V1

## Objetivo

Web Push V1 permite que GMTCH Tune OS envie alertas criticas a dispositivos registrados aunque el usuario no este mirando la pantalla. Aplica a Process Guard, post escritura pendiente, pagos bloqueantes, postventa tecnica, leads calientes, bitacoras urgentes y otras notificaciones internas accionables.

## Que Hace

- Registra dispositivos autenticados mediante Service Worker y Push API.
- Guarda suscripciones por usuario interno.
- Envia push usando VAPID estandar con `web-push`.
- Respeta prioridad minima configurable.
- Abre la URL accionable de la notificacion al tocarla.
- Desactiva suscripciones invalidas cuando el navegador responde 404/410.

## Que No Hace

- No envia WhatsApp, Instagram ni correos.
- No cambia estados.
- No marca pagos.
- No cierra ordenes ni procesos tecnicos.
- No expone `VAPID_PRIVATE_KEY`.
- No esta disponible para Portal Masters externo.

## Variables Railway

Por defecto queda desactivado:

```bash
ENABLE_WEB_PUSH=false
PUSH_MIN_PRIORITY=ALTA
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:gaston.munoz@usach.cl
```

Para activar:

```bash
ENABLE_WEB_PUSH=true
PUSH_MIN_PRIORITY=ALTA
VAPID_PUBLIC_KEY=PEGAR_PUBLIC_KEY
VAPID_PRIVATE_KEY=PEGAR_PRIVATE_KEY
VAPID_SUBJECT=mailto:gaston.munoz@usach.cl
```

## Generar VAPID Keys

Desde el backend:

```bash
cd backend
npx web-push generate-vapid-keys
```

Guardar solo la clave publica y privada en variables Railway. No pegarlas en codigo ni documentacion.

## Endpoints

Todos requieren token interno:

- `GET /api/push/status`
- `GET /api/push/vapid-public-key`
- `POST /api/push/subscribe`
- `POST /api/push/unsubscribe`
- `POST /api/push/test`
- `POST /api/push/test-critical` solo OWNER/ADMIN

## Panel Frontend

La campana muestra `Notificaciones del dispositivo`:

- Soporte Push disponible/no disponible.
- Permiso actual.
- Backend activo/inactivo.
- Estado del dispositivo registrado.
- Activar/desactivar dispositivo.
- Enviar prueba.
- Enviar prueba critica para OWNER/ADMIN.

## Integracion con Notificaciones Internas

Cuando se crea una notificacion interna:

1. El backend infiere prioridad desde `metadata.prioridad`, severidad o tipo.
2. Si prioridad cumple `PUSH_MIN_PRIORITY`, intenta enviar push.
3. Si la notificacion es URGENTE, OWNER/ADMIN tambien reciben push.
4. El payload incluye `title`, `body`, `url`, `prioridad`, `entidad_tipo`, `entidad_id`, `icon`, `badge` y `tag`.
5. El Service Worker abre o enfoca la URL accionable.

## Anti-Spam

- No se envia la misma push al mismo usuario para la misma entidad/tag mas de una vez cada 5 minutos.
- El `tag` agrupa notificaciones por entidad:
  `gmtch-{entidad_tipo}-{entidad_id}-{prioridad}`.

## QA PC

1. Activar variables Railway.
2. Entrar a `https://gmtchtune.com/login`.
3. Abrir campana.
4. Presionar `Activar notificaciones en este dispositivo`.
5. Permitir notificaciones del navegador.
6. Presionar `Enviar prueba`.
7. Como OWNER/ADMIN, presionar `Enviar prueba critica`.
8. Tocar la notificacion y confirmar que abre la ruta correcta.

## QA iPhone / PWA

1. Abrir Safari.
2. Entrar a `https://gmtchtune.com/login`.
3. Agregar a pantalla de inicio.
4. Abrir GMTCH Tune OS desde el icono.
5. Iniciar sesion.
6. Abrir campana y activar notificaciones.
7. Permitir notificaciones si iOS lo ofrece.
8. Enviar prueba.

Limitaciones iOS:

- Debe usarse como PWA instalada para mejor comportamiento.
- Permisos dependen de version iOS/Safari.
- Algunos navegadores iOS pueden no soportar Push API igual que Safari.

## Desactivar

En Railway:

```bash
ENABLE_WEB_PUSH=false
```

Los dispositivos registrados quedan guardados, pero no reciben push mientras el backend este desactivado.

## Riesgos

- Si no hay VAPID keys, el panel mostrara backend inactivo.
- Si el usuario deniega permiso, debe reactivarlo desde ajustes del navegador/sistema.
- En multiples instancias backend, el anti-spam en memoria no es global.
- Web Push complementa la campana interna; no reemplaza la disciplina operativa.
