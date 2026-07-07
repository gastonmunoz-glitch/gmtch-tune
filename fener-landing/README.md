# Fener.cl Sitio Corporativo

Sitio corporativo premium multipagina para Fener.cl, creado con Astro y Tailwind CSS.

## Rutas

- `/`
- `/servicios`
- `/trayectoria`
- `/calidad-e-inocuidad`
- `/clientes`
- `/galeria`
- `/contacto`

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
npm run zip:cpanel
```

## Edicion rapida

- Contacto, correo, telefono, WhatsApp y formulario: `src/data/site.ts`
- SEO por pagina: `src/data/site.ts`
- Servicios, metricas, rubros, calidad, cobertura y galeria: `src/data/site.ts`
- Componentes visuales: `src/components/`
- Paginas Astro: `src/pages/`
- Imagen principal y futuras fotos reales: `public/images/`

Si no hay telefono o WhatsApp confirmado, deja esos campos vacios en `src/data/site.ts`. El sitio no muestra telefonos falsos ni redes sociales genericas.

## Formulario

El formulario usa `contact.formAction` desde `src/data/site.ts`.

Por ahora puede quedar como `mailto:contacto@fener.cl`. Para Formspree, Netlify Forms o un backend autorizado, cambia `formAction` y `formMethod` en el mismo archivo.

## Fotos y clientes

La galeria y la seccion de clientes usan placeholders sobrios. Reemplaza esos bloques cuando existan fotos reales, logos o nombres con autorizacion comercial.

No inventar nombres de clientes, certificaciones, anos de experiencia, raciones, cantidad de clientes ni logos.

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

Si ves `FENER_LANDING_ASTRO_OK_2026`, cPanel esta sirviendo la version Astro correcta.
