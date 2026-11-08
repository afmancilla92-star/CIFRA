# Extensión Cifra Radar

Puente entre la Biblioteca de Anuncios de Meta y tu plataforma Cifra Radar. Instalación y funcionamiento:
ver [`../README.md`](../README.md#extensión-de-chrome).

- `src/page-hook.js` — observa (sin modificar ni hacer peticiones) las respuestas que la Biblioteca ya cargó.
- `src/collector.js` — encuentra anuncios (`ad_archive_id`) y conserva solo los campos necesarios.
- `src/content.js` — panel flotante, lectura de respaldo de tarjetas visibles y envío a pedido.
- `src/background.js` — único componente que habla con la plataforma (`POST /api/ingest/extension`).
- `popup.*` — configuración (URL + token), prueba de conexión y envío.

Permisos: `storage` (configuración) y `activeTab` (estado de la pestaña actual desde el popup). Solo se ejecuta en
`https://www.facebook.com/ads/library*`.
