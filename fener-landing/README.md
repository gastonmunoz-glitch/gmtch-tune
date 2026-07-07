# Fener.cl Landing

Landing profesional para Fener.cl creada con Astro y Tailwind CSS.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run zip:cpanel
```

## Subida a BlueHosting/cPanel

1. Ejecuta `npm run build`.
2. Verifica que exista `dist/index.html`.
3. Verifica que exista `dist/health-check.txt` y que contenga `FENER_LANDING_ASTRO_OK_2026`.
4. Sube a `public_html` el contenido de `dist`, no la carpeta `dist`.
5. No subas `src`.
6. No subas `node_modules`.
7. No dejes la web dentro de `public_html/dist/index.html`; el archivo correcto debe quedar como `public_html/index.html`.

Para generar un ZIP listo para cPanel:

```bash
npm run build
npm run zip:cpanel
```

El comando crea `fener-web-dist.zip` con el contenido interno de `dist` en la raiz del ZIP. Al descomprimirlo en `public_html`, deben aparecer directamente `index.html`, `health-check.txt`, `favicon.svg`, `robots.txt`, `sitemap-index.xml` y la carpeta `_astro`.

Despues de subir, abre:

```text
https://fener.cl/health-check.txt
```

Si ves `FENER_LANDING_ASTRO_OK_2026`, cPanel esta sirviendo la landing Astro correcta.

## Edicion rapida

- Textos, telefono, WhatsApp, correo y redes: `src/data/site.ts`
- Componentes visuales: `src/components/`
- Imagen principal y galeria: `public/images/`
- Metadata SEO: `src/data/site.ts` y `src/layouts/BaseLayout.astro`

El formulario usa `mailto:` para no depender de backend ni inventar rutas. Para conectarlo a CRM, Formspree o backend propio, cambia `contact.formAction` en `src/data/site.ts`.
