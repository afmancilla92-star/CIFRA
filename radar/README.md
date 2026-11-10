# Cifra Radar — buscador de anuncios publicitarios reales

Plataforma de **inteligencia publicitaria**: descubre anuncios reales que otras empresas publican en Facebook e Instagram,
los recopila desde fuentes públicas autorizadas (Meta Ad Library), los organiza y los presenta en un buscador con filtros,
agrupación por landing page, ranking de anunciantes, favoritos y una puntuación orientativa explicada.

**No es** un administrador de anuncios, ni un creador de publicidad, ni un lugar para publicar campañas propias.

```
radar/
├── extension/   Extensión de Chrome (Manifest V3): captura en la Biblioteca de Anuncios + explorador local
└── web/         Plataforma web opcional (Next.js 14 + TypeScript + Tailwind + libSQL/SQLite)
```

## La forma más fácil: solo la extensión (sin servidor ni terminal)

1. Descarga y descomprime la carpeta `radar/extension` (o el zip `cifra-radar-extension.zip`).
2. En Chrome abre `chrome://extensions`, activa **Modo desarrollador**, pulsa **Cargar descomprimida** y elige esa carpeta
   (la que contiene `manifest.json`). Se abre sola la pestaña **Cifra Radar** con las instrucciones.
3. Abre la [Biblioteca de Anuncios](https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&media_type=all),
   busca (por ejemplo «zapatillas» en Colombia), desplázate y pulsa **«Guardar en Cifra Radar»** en el panel de abajo a la derecha.
4. Pulsa **«Abrir mi radar»**: anuncios con filtros, orden por días activos, puntuación explicada, anunciantes, landing pages,
   favoritos y respaldo en JSON.

Todo queda guardado **solo en ese Chrome** (IndexedDB), con la misma lógica de fusión y puntuación que la plataforma web. La plataforma
web es opcional: sirve para la sincronización automática con la API oficial, para compartir con un equipo o para tener los datos en un
servidor. Para usarla también, en el ícono de la extensión → «Plataforma web (opcional)» marca «Enviar también a mi plataforma».

## Cómo llegan los anuncios

| Fuente | Rol | Qué cubre | Qué no cubre |
| --- | --- | --- | --- |
| **Extensión de Chrome** | Principal | Lo que tú consultas en la Biblioteca de Anuncios, de **cualquier país**: textos, imágenes, videos, carruseles, CTA, URL de destino, plataformas, fecha de inicio, variantes | Solo lo que cargas en pantalla; no navega ni pagina sola |
| **Ad Library API oficial** | Automática (cron diario) | Búsquedas monitoreadas por palabra clave o página. Anuncios **comerciales que llegaron a la UE**, idiomas, plataformas, alcance UE | Fuera de la UE solo devuelve anuncios políticos/sociales. No entrega imágenes ni videos ni la URL de destino (solo el dominio visible) |
| **Importación JSON** | Puntual | Respuestas guardadas de la API (`{ "data": [...] }`) o exportaciones de la extensión (`{ "nodes": [...] }`) | — |
| **Carga manual** | Secundaria (pruebas/mantenimiento) | Un anuncio a mano | Se marca como manual y **no aparece en Explorar** salvo que se active el filtro «Incluir carga manual» |

La plataforma nunca muestra anuncios inventados: con la base vacía, Explorar muestra la guía para conectar fuentes.
Cuando la misma pieza llega por varias vías (p. ej. la API y luego la extensión), se **fusiona** en un solo registro: la
extensión completa la creatividad y la URL que la API no da.

### Límites reales de Meta (no se asume acceso ilimitado)

- La API exige una app con acceso a la Ad Library API y **verificación de identidad** del titular del token.
- `ad_reached_countries` es obligatorio; los anuncios comerciales solo se devuelven si llegaron a la UE.
- El `ad_snapshot_url` lleva el token: **no se guarda**. El enlace público es `facebook.com/ads/library/?id=<ID>`.
- Se respetan los límites de llamadas: la paginación se detiene ante los errores 4/17/32/613 o si `x-app-usage` supera el 90 %.
- Si un campo opcional (`eu_total_reach`) es rechazado, se reintenta sin él.

## Funcionalidades

- **Explorar**: búsqueda de texto completo sin tildes (texto, título, anunciante, dominio) y filtros por estado, nicho, país, idioma,
  plataforma, formato, oferta detectada, días activos, puntuación, variantes, volumen del anunciante, fecha de inicio, landing y fuente.
- **Orden**: más días activos (antigüedad), mayor puntuación, más recientes, más variantes, anunciantes con más anuncios, vistos recientemente.
- **Detalle del anuncio**: creatividades, texto, CTA, destino, ofertas detectadas, datos (inicio, días activos, plataformas, países, idioma,
  formato, variantes, nicho con su origen y confianza), puntuación desglosada, variantes con el mismo mensaje, anuncios hacia la misma landing
  (de cualquier anunciante) y más anuncios del anunciante.
- **Anunciantes**: ranking por anuncios activos simultáneos, anuncio activo más antiguo, landings y puntuación media.
- **Landing pages**: anuncios agrupados por destino normalizado (sin `utm_*`, `fbclid`, macros `{{ad.id}}`, redirecciones `l.facebook.com`).
- **Favoritos**: se guardan en la base y no se borran por retención.
- **Fuentes**: estado de cada fuente, búsquedas monitoreadas (API), importación, mantenimiento, registro de ingestas y carga manual.

### Días activos

Desde la fecha de inicio hasta hoy si sigue activo, o hasta la fecha de fin / última vez visto si ya no circula.

### Puntuación de oportunidad (orientativa)

Suma de 7 señales observables, cada una con su explicación en la ficha del anuncio:

| Señal | Máx. | Cómo se mide |
| --- | --- | --- |
| Días activos | 30 | Curva logarítmica; máximo a los 90 días |
| Variantes del anuncio | 15 | «N anuncios usan esta creatividad y texto» o anuncios con el mismo mensaje normalizado |
| Anuncios activos del anunciante | 15 | Anuncios activos simultáneos de la página (máximo con 30) |
| Repetición de ofertas y mensajes | 10 | Mismo mensaje en otros anuncios + ofertas (descuento, envío gratis, 2x1…) repetidas |
| Diversidad de creatividades | 10 | Creatividades y formatos distintos hacia el mismo destino |
| Landing page disponible | 10 | URL completa (10), solo dominio (7), tienda de apps (6), mensajería/red social (3) |
| Continuidad de la campaña | 10 | Sigue activo + lanzamientos en semanas distintas hacia el mismo destino |

Se muestra siempre con la aclaración de que **no mide ventas, conversiones ni rentabilidad** y no indica que un anuncio sea «ganador».

### Nichos

1. **Reglas** (siempre): ~20 nichos con palabras clave en español, portugués e inglés + categorías de la página. Guarda los términos que
   justifican la clasificación y una confianza orientativa.
2. **IA (opcional)**: con `ANTHROPIC_API_KEY`, los anuncios sin nicho claro se clasifican con Claude (`AI_CLASSIFY_MODEL`, por defecto
   `claude-opus-5-5`, esfuerzo bajo, salida JSON estructurada y respaldo automático ante rechazos). Solo se envía el texto público del anuncio.

## Cumplimiento y uso responsable

- **Sin scraping masivo**: la extensión no hace peticiones propias a Meta, no hace scroll, no pagina, no hace clics y no evade CAPTCHAs,
  inicios de sesión ni restricciones. Lee una copia de lo que la Biblioteca ya cargó en tu navegador y **solo envía cuando pulsas «Enviar»**.
- **Minimización**: la extensión conserva solo los campos que usa la plataforma (descarta gasto, demografía, contenido de marca, etc.) y
  el servidor solo acepta capturas hechas en `facebook.com/ads/library`.
- **Sin re-alojar creatividades**: se guardan las URLs originales de Meta (que expiran solas); si expiran, la ficha enlaza a la Biblioteca.
- **Retención**: los anuncios no favoritos que no se ven en `RETENTION_DAYS` días (180 por defecto) se eliminan en el mantenimiento diario.
- Revisa las condiciones de la Biblioteca de Anuncios y de la Ad Library API de Meta antes de usar la plataforma con terceros, y ajusta
  la retención a lo que te permitan.

## Puesta en marcha local

```bash
cd radar/web
npm install
npm run dev                  # http://localhost:3000
```

En local (`npm run dev`) no hace falta configurar nada: sin `INGEST_TOKEN`, la plataforma acepta el token `radar-local`.
Para producción copia `.env.example` y define las variables.

Variables de entorno (ver `web/.env.example`):

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | `file:./data/radar.db` en local; `libsql://…` (Turso) en producción |
| `APP_PASSWORD`, `SESSION_SECRET` | Protege toda la plataforma. En producción la administración se bloquea si falta `APP_PASSWORD` |
| `INGEST_TOKEN` | Token que la extensión envía como `Authorization: Bearer` |
| `META_ACCESS_TOKEN`, `META_GRAPH_VERSION`, `META_MAX_PAGES` | API oficial |
| `CRON_SECRET` | Protege `/api/cron/sync` (Vercel lo envía como `Authorization: Bearer`) |
| `RETENTION_DAYS` | Retención de anuncios no favoritos |
| `ANTHROPIC_API_KEY`, `AI_CLASSIFY_MODEL` | Clasificación de nichos con IA (opcional) |

### Extensión de Chrome conectada a la plataforma

1. `chrome://extensions` → activa **Modo desarrollador** → **Cargar descomprimida** → carpeta `radar/extension`.
2. Ícono de Cifra Radar → «Plataforma web (opcional)» → marca «Enviar también a mi plataforma», escribe la URL
   (`http://localhost:3000` en local) y el `INGEST_TOKEN` (`radar-local` en local) → «Probar conexión».
3. Abre la [Biblioteca de Anuncios](https://www.facebook.com/ads/library/), busca (palabra clave, país, anunciante) y desplázate.
4. Pulsa **«Guardar en Cifra Radar»** en el panel flotante (o desde el ícono). Se guarda en el explorador local y en la plataforma.

Cómo funciona: `page-hook.js` (contexto de la página) observa las respuestas que la Biblioteca ya descargó y reenvía las que contienen
anuncios; `collector.js` encuentra los objetos con `ad_archive_id` y conserva solo los campos necesarios; `content.js` muestra el panel y,
al pulsar «Guardar», manda los anuncios a `background.js`, que los guarda en IndexedDB (`core.js`) y, si lo activaste, los envía a tu
plataforma. `app.html` es el explorador local. Si algún anuncio visible no llegó como dato estructurado, se lee el texto de su tarjeta
como respaldo y se marca como **parcial** (nunca pisa datos completos).

`core.js` y `app.js` se generan desde `web/src/ext` con `npm run build:extension` (una prueba avisa si quedaron desactualizados).

### Sincronización con la API oficial

En **Fuentes** crea búsquedas monitoreadas (palabras clave o IDs de página + países UE). Se ejecutan:

- a diario con Vercel Cron (`web/vercel.json` → `GET /api/cron/sync`), o
- a mano con «Ejecutar» / «Ejecutar búsquedas ahora», o
- con `npm run sync` desde un cron del sistema.

El mantenimiento diario recalcula puntuaciones (los días activos cambian), aplica la retención y, si hay clave, clasifica nichos con IA.

## Despliegue (Vercel + Turso)

1. Crea una base en Turso y define `DATABASE_URL` y `DATABASE_AUTH_TOKEN`.
2. En Vercel importa el repositorio con **Root Directory** `radar/web`.
3. Define `APP_PASSWORD`, `SESSION_SECRET`, `INGEST_TOKEN`, `CRON_SECRET` y, si tienes acceso, `META_ACCESS_TOKEN`.
4. El esquema se crea solo en el primer acceso (`npm run db:migrate` para hacerlo antes).

## Pruebas

```bash
cd radar/web
npm test          # unitarias + integración con base temporal (datos sintéticos solo de prueba)
npm run typecheck
npm run build
```

Cubren normalización de landings, idioma, nichos, fechas, puntuación, el conector de la API (paginación, campos opcionales, límites,
errores de token sin filtrarlo), el mapeo de la Biblioteca, el colector de la extensión (el mismo archivo que carga Chrome), el pipeline
completo de ingesta, búsqueda, favoritos y retención, el almacén local de la extensión (IndexedDB) y que los archivos compilados de la
extensión estén al día.

## Estructura de `web/src`

```
app/                 páginas (Explorar, anuncio, anunciantes, landings, favoritos, fuentes, login) y rutas API
  api/ingest/extension   recepción de capturas de la extensión (token + CORS)
  api/cron/sync          sincronización diaria
  api/admin/*            búsquedas monitoreadas, importación, carga manual, mantenimiento
components/          tarjetas, filtros, desglose de puntuación, formularios de administración
lib/
  db/                esquema (con FTS5) y cliente libSQL
  sources/           meta-api.ts (API oficial), library-page.ts (datos de la Biblioteca), países
  niche/             catálogo, reglas e IA opcional
  merge.ts           fusión entre fuentes (compartida con la extensión)
  advertiser-stats.ts agregados por anunciante y puntuación (compartida con la extensión)
  ingest.ts          ingesta en SQLite
  stats.ts           recálculo y retención en SQLite
  scoring.ts         puntuación orientativa con explicación por señal
  landing.ts         normalización y agrupación de destinos
  queries.ts         búsqueda, filtros, orden, anunciantes, landings, favoritos
ext/                 código de la extensión: almacén IndexedDB (store.ts) y explorador local (app.ts)
```
