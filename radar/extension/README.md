# Extensión Cifra Radar

Captura los anuncios que ves en la Biblioteca de Anuncios de Meta y los guarda en un explorador dentro de tu propio Chrome.
No necesita servidor ni configuración. Instalación y funcionamiento: ver [`../README.md`](../README.md).

- `src/page-hook.js`: observa, sin modificar nada ni hacer peticiones, las respuestas que la Biblioteca ya cargó.
- `src/collector.js`: encuentra los anuncios (`ad_archive_id`) y conserva solo los campos necesarios.
- `src/content.js`: panel flotante, lectura de respaldo de tarjetas visibles y guardado a pedido.
- `src/background.js`: guarda en IndexedDB, ejecuta en segundo plano la pasada de búsquedas (manual y automática cada 24 horas,
  ver `radar/web/src/ext/runner.ts`) y, si lo activas, envía también a la plataforma web (`POST /api/ingest/extension`).
- `app.html` + `src/app.js`: el radar local: **Descubrir** (filtros laterales, duplicados, agrupar por landing), **Anunciantes**
  (seguir, traer todos sus anuncios), **Siguiendo**, **Buscar** (búsqueda en la Biblioteca y radar automático), **Studio** (oferta
  y anuncios para tu producto, con plantillas o con tu clave de Anthropic), **Favoritos** (también por enlace) y respaldo.
- Búsquedas pedidas desde el radar: se abre la Biblioteca en una pestaña de fondo; `content.js` espera los resultados, baja un par
  de veces, guarda y avisa; la pestaña se cierra. Máximo 30 por hora; ante un límite de Meta se pausa una hora y reintenta una
  vez; si pide iniciar sesión, se detiene. Con «carga profunda», `page-hook.js` avisa a la lista de que cargue su siguiente tanda
  (en pestañas de fondo Chrome no lo hace solo).
- `fonts/`: tipografía Archivo (licencia abierta OFL, incluida en `fonts/OFL.txt`).
- `src/core.js`, `src/app.js`: generados desde `radar/web/src/ext` con `npm run build:extension`. No se editan a mano.
- `popup.*`: abrir el radar, guardar desde el ícono y conexión opcional con la plataforma.

Permisos: `storage` y `unlimitedStorage` (configuración y anuncios guardados en tu Chrome), `activeTab` (estado de la pestaña
actual desde el ícono) y `alarms` (despertador de la pasada automática). Solo se ejecuta en `https://*.facebook.com/ads/library*`. Studio solo se conecta a `api.anthropic.com`
si guardas tu propia clave y pulsas «Generar con IA» (la clave queda en `chrome.storage.local` de ese Chrome; se usa el modelo
`claude-opus-5-5` con respaldo automático de Anthropic si no está disponible).
