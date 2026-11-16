# Instrucciones para Claude en este repositorio

## Idioma

Todo va en **español**, salvo que el dueño del repositorio pida otro idioma de forma expresa: respuestas y resúmenes, mensajes de
commit, títulos y descripciones de PR, comentarios en GitHub, documentación, comentarios del código y textos de la interfaz.

Los nombres internos del código (variables, funciones, archivos) pueden seguir en inglés.

## Proyecto

- `cifra-app/`: el quiz en producción (lo despliega Vercel). No se modifica salvo que se pida.
- `radar/`: Cifra Radar, buscador de anuncios reales de la Biblioteca de Anuncios de Meta.
  - `radar/extension/`: extensión de Chrome (Manifest V3). Es de uso privado: guarda todo en el Chrome del usuario, sin catálogo
    compartido.
  - `radar/web/`: plataforma web opcional (Next.js) y código fuente compartido con la extensión (`src/lib`, `src/ext`).

## Reglas del producto

- Solo anuncios reales: nunca datos inventados ni de prueba en lo que ve el usuario.
- No afirmar que un anuncio es «ganador», rentable o exitoso: Meta no publica ventas. La puntuación es orientativa.
- No evadir CAPTCHAs, inicios de sesión ni límites de Meta. Las búsquedas automáticas se detienen si Meta limita el acceso.

## Antes de subir cambios en `radar/`

Desde `radar/web`:

```bash
npm run typecheck
```

```bash
npm run build:extension
```

```bash
npm test
```

`radar/extension/src/core.js` y `radar/extension/src/app.js` son archivos generados por `npm run build:extension`: no se editan a
mano y deben subirse actualizados (una prueba falla si quedan desfasados). Al cambiar la extensión, sube también la versión en
`radar/extension/manifest.json`.
