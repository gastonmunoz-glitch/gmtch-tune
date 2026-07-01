# PWA iOS GMTCH Tune OS

Version: V1  
Fecha: 2026-06-28

## Objetivo

GMTCH Tune OS puede instalarse como PWA en iPhone/iPad desde Safari para abrir la plataforma como app de pantalla completa, con icono GMTCH, branding propio y Web Push V1 habilitable mediante VAPID.

## Instalacion en iPhone

1. Abrir Safari.
2. Entrar a `https://gmtchtune.com/login`.
3. Tocar el boton Compartir de Safari.
4. Elegir **Agregar a pantalla de inicio**.
5. Confirmar el nombre **GMTCH Tune OS**.
6. Abrir la plataforma desde el icono GMTCH creado en la pantalla de inicio.

## Instalacion en iPad

1. Abrir Safari en iPad.
2. Entrar a `https://gmtchtune.com/login`.
3. Tocar Compartir.
4. Seleccionar **Agregar a pantalla de inicio**.
5. Abrir desde el icono instalado.

## Probar pantalla completa

Despues de instalar:

1. Abrir GMTCH Tune OS desde el icono de pantalla de inicio.
2. Confirmar que no aparece la barra normal de Safari.
3. Iniciar sesion.
4. Navegar por Dashboard, Ordenes, File Service y Portal Admin si corresponde.

## Probar Service Worker

En escritorio:

1. Abrir `https://gmtchtune.com/login`.
2. Abrir DevTools.
3. Ir a **Application > Service Workers**.
4. Confirmar que `/sw.js` esta registrado.
5. Confirmar que no se cachean respuestas de `https://api.gmtchtune.com/api`.

## Alertas y sonido

La PWA mantiene las alertas internas existentes:

- campana de notificaciones
- alerta flotante
- sonido normal/fuerte/tsunami si el usuario lo activa
- polling interno
- notificaciones accionables

Para probar:

1. Entrar a la plataforma.
2. Abrir la campana de notificaciones.
3. Presionar **Activar sonido**.
4. Usar **Probar sonido** o **Probar sonido fuerte** si esta disponible.

## PWA vs app nativa

La PWA permite acceso rapido, pantalla completa y experiencia similar a app desde Safari. No reemplaza una app nativa publicada en App Store.

Limitaciones iOS:

- Debe instalarse en pantalla de inicio para comportarse como app.
- Los permisos de notificacion dependen de iOS/Safari.
- Algunas versiones de iOS pueden tener comportamiento distinto.
- El sonido siempre requiere una accion previa del usuario.
- Web Push requiere backend activo con VAPID y permisos del navegador.

## Web Push V1

El service worker incluye handlers para:

- `push`
- `notificationclick`
- apertura o foco de `data.url`

Backend y frontend incluyen:

- claves VAPID por variables de entorno
- suscripcion push por usuario interno
- endpoints `/api/push/*`
- envio Web Push desde notificaciones internas criticas
- panel `Notificaciones del dispositivo` dentro de la campana

Para usarlo:

1. Activar `ENABLE_WEB_PUSH=true` en Railway.
2. Configurar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`.
3. Abrir la PWA instalada.
4. Entrar a la campana.
5. Presionar **Activar notificaciones en este dispositivo**.
6. Usar **Enviar prueba**.

## Fase 2 recomendada

Para una experiencia tipo app real:

1. Agregar administracion avanzada de dispositivos por usuario.
2. Evaluar Capacitor iOS.
3. Crear cuenta Apple Developer.
4. Preparar build iOS para TestFlight/App Store si se requiere push nativo mas robusto.

## Regla operativa

La PWA mejora acceso y respuesta operativa, pero GMTCH Tune OS sigue siendo la fuente oficial de trabajo. Las alertas ayudan; el registro en plataforma es lo que deja trazabilidad.
