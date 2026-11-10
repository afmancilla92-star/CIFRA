# Extensión Cifra Radar

Captura los anuncios que ves en la Biblioteca de Anuncios de Meta y los guarda en un explorador dentro de tu propio Chrome.
No necesita servidor ni configuración. Instalación y funcionamiento: ver [`../README.md`](../README.md).

- `src/page-hook.js`: observa, sin modificar nada ni hacer peticiones, las respuestas que la Biblioteca ya cargó.
- `src/collector.js`: encuentra los anuncios (`ad_archive_id`) y conserva solo los campos necesarios.
- `src/content.js`: panel flotante, lectura de respaldo de tarjetas visibles y guardado a pedido.
- `src/background.js`: guarda en IndexedDB y, si lo activas, envía también a la plataforma web (`POST /api/ingest/extension`).
- `app.html` + `src/app.js`: explorador local: **Descubrir** (llenar el radar y buscar en la Biblioteca desde el radar,
  categorías por nicho, lo que está escalando), anuncios, anunciantes, landing pages, favoritos y respaldo.
- Búsquedas pedidas desde el radar: se abre la Biblioteca en una pestaña de fondo; `content.js` espera los resultados, baja un par
  de veces, guarda y avisa; el radar cierra la pestaña. Máximo 30 por hora; se detiene si Meta limita o pide iniciar sesión.
- `src/core.js`, `src/app.js`: generados desde `radar/web/src/ext` con `npm run build:extension`. No se editan a mano.
- `popup.*`: abrir el radar, guardar desde el ícono y conexión opcional con la plataforma.

Permisos: `storage` y `unlimitedStorage` (configuración y anuncios guardados en tu Chrome) y `activeTab` (estado de la pestaña
actual desde el ícono). Solo se ejecuta en `https://www.facebook.com/ads/library*`.
