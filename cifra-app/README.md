# Cifra — Evaluación cognitiva interactiva

Landing + test interactivo + resultado + oferta, construido en **Next.js 14 (App
Router) + TypeScript + Tailwind CSS + Framer Motion**. Marca, copy, ilustraciones
y banco de preguntas son 100% originales.

## Arquitectura

```
src/
├── app/
│   ├── layout.tsx          # fuentes (next/font), metadata SEO, ThemeProvider
│   ├── page.tsx             # landing (server component)
│   ├── globals.css          # Tailwind + tokens de color (light/dark)
│   ├── icon.svg              # favicon (la marca del anillo)
│   ├── robots.ts / sitemap.ts
│   └── test/
│       ├── layout.tsx       # metadata específica de /test (noindex)
│       └── page.tsx          # orquesta intro → quiz → analyzing → resultado → oferta
├── components/
│   ├── landing/              # Header, Hero, Benefits, HowItWorks, Testimonials, FAQ, FinalCTA, Footer
│   ├── quiz/                 # Intro, QuizScreen, QuestionVisual, OptionsGrid, Analyzing
│   ├── results/               # ResultsScreen (radar + badges + fortalezas/mejoras)
│   ├── offer/                 # OfferScreen, Countdown
│   ├── ui/                    # Ring, Logo, LGlyph, BrainNetwork, Eyebrow, Toast, ThemeToggle
│   └── providers/              # ThemeProvider (modo claro/oscuro persistente)
├── data/questions.ts          # banco de 25 preguntas tipado
├── lib/
│   ├── types.ts                # tipos de dominio (Question, Answer, Dimension...)
│   ├── scoring.ts               # puntaje, percentil, puntajes por dimensión (puro, testeable)
│   └── content.ts               # copy de fortalezas/áreas de mejora por dimensión
└── hooks/useTheme.ts
```

Cada pieza es un componente desacoplado con una sola responsabilidad — puedes
reemplazar, reordenar o eliminar secciones sin tocar el resto.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
npm run typecheck
npm run lint
```

Requiere Node 18.18+ y acceso a internet en build/dev (next/font descarga
Inter, Manrope y Plus Jakarta Sans desde Google Fonts y las auto-aloja).

## Antes de publicar — reemplaza esto

1. **Testimonios** (`src/components/landing/Testimonials.tsx`) — son de plantilla.
2. **Precio y oferta** (`src/components/offer/OfferScreen.tsx`) — `$29.900` / `$69.900` son placeholders.
3. **Checkout real** (`src/app/test/page.tsx`, función `handleCheckout`) — ahora mismo solo
   muestra un toast. Conecta ahí tu link de Hotmart, tu integración de Stripe o tu modal de pago.
4. **`metadataBase` / dominio** en `src/app/layout.tsx`, `robots.ts` y `sitemap.ts` — está en
   `https://cifra.example.com`, cámbialo por tu dominio real.
5. **Banco de preguntas** — `src/data/questions.ts` está pensado para que agregues, quites o
   reordenes preguntas sin tocar ningún componente.

## Sistema de puntuación

`src/lib/scoring.ts` es puro (sin dependencias de UI), así que es fácil de testear:

- `computeScore(answers)` → puntaje 80-145 según proporción de aciertos.
- `percentileForScore(score)` → percentil ilustrativo por escalones.
- `computeDimensionScores(answers, totalElapsedMs)` → puntaje 0-100 en
  Lógica, Patrones, Memoria, Visión espacial y Velocidad (esta última cruza
  el tiempo sugerido por pregunta contra el tiempo real invertido).

## Accesibilidad y rendimiento

- Contraste verificado en ambos temas, foco visible (`:focus-visible`) en todos los controles.
- `prefers-reduced-motion` respetado globalmente vía `globals.css`.
- Server Components por defecto en la landing; el quiz es la única parte
  fuertemente interactiva y se carga bajo `/test`.
- Sin `localStorage` salvo para la preferencia de tema (no se persisten
  respuestas del test entre sesiones por diseño).

## Honestidad del producto

El resultado se presenta explícitamente como una herramienta de
autoconocimiento/entretenimiento, no como un instrumento clínico o
psicométrico validado (ver el pie de página de `ResultsScreen` y el FAQ).
Mantén ese disclaimer si publicas el producto.
