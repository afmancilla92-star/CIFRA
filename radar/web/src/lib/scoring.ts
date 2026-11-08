import type { ScoreSignal } from "./types";
import type { LandingKind } from "./landing";

/**
 * Puntuación ORIENTATIVA de oportunidad publicitaria.
 *
 * Solo usa señales observables en la Biblioteca de Anuncios. No mide
 * ventas, conversiones ni rentabilidad: una puntuación alta indica que el
 * anunciante sostiene, repite y diversifica el anuncio, nada más.
 */
export interface ScoreInput {
  daysActive: number | null;
  isActive: boolean;
  collationCount: number | null;
  /** Otros anuncios del mismo anunciante con el mismo mensaje normalizado. */
  sameMessageCount: number;
  /** Ofertas detectadas en este anuncio. */
  offers: string[];
  /** Otros anuncios del anunciante que repiten alguna de esas ofertas. */
  offerRepeatCount: number;
  advertiserActiveAds: number;
  /** Creatividades distintas (mensaje o pieza) del anunciante hacia el mismo destino. */
  distinctCreatives: number;
  /** Formatos distintos (imagen, video, carrusel…) hacia el mismo destino. */
  distinctFormats: number;
  landingKind: LandingKind | null;
  landingDomainOnly: boolean;
  /** Semanas distintas en que el anunciante lanzó anuncios hacia el mismo destino. */
  launchWeeks: number;
}

export interface ScoreResult {
  score: number;
  signals: ScoreSignal[];
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const round1 = (x: number) => Math.round(x * 10) / 10;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function computeScore(i: ScoreInput): ScoreResult {
  const signals: ScoreSignal[] = [];

  // 1. Días activos (30)
  const d = i.daysActive ?? 0;
  signals.push({
    key: "longevity",
    label: "Días activos",
    max: 30,
    points: round1(30 * clamp01(Math.log(1 + d) / Math.log(1 + 90))),
    observed: i.daysActive === null ? "Fecha de inicio desconocida" : plural(d, "día", "días"),
    explanation:
      "Cuanto más tiempo mantiene el anunciante un anuncio en circulación, mayor es la señal de continuidad. Alcanza el máximo a los 90 días.",
  });

  // 2. Variantes (15)
  const variants = Math.max(i.collationCount ?? 1, i.sameMessageCount + 1, 1);
  signals.push({
    key: "variants",
    label: "Variantes del anuncio",
    max: 15,
    points: round1(15 * clamp01(Math.log(variants) / Math.log(10))),
    observed: plural(variants, "versión", "versiones"),
    explanation:
      "Cantidad de anuncios que usan la misma creatividad y texto (dato de la Biblioteca) o el mismo mensaje. Duplicar un anuncio suele hacerse para ampliar su alcance.",
  });

  // 3. Volumen del anunciante (15)
  const n = Math.max(0, i.advertiserActiveAds);
  signals.push({
    key: "advertiser_volume",
    label: "Anuncios activos del anunciante",
    max: 15,
    points: round1(15 * clamp01(n <= 1 ? 0 : Math.log(n) / Math.log(30))),
    observed: plural(n, "anuncio activo", "anuncios activos"),
    explanation:
      "Anuncios activos de la misma página registrados en la plataforma. Muchos anuncios simultáneos indican una inversión sostenida en publicidad.",
  });

  // 4. Repetición de ofertas y mensajes (10)
  const msgPts = 6 * clamp01(i.sameMessageCount / 4);
  const offerPts = i.offers.length ? 4 * clamp01(i.offerRepeatCount / 4) : 0;
  const repParts: string[] = [];
  repParts.push(plural(i.sameMessageCount, "anuncio más con el mismo mensaje", "anuncios más con el mismo mensaje"));
  if (i.offers.length) repParts.push(`oferta (${i.offers.join(", ")}) repetida en ${i.offerRepeatCount}`);
  signals.push({
    key: "message_repetition",
    label: "Repetición de ofertas y mensajes",
    max: 10,
    points: round1(msgPts + offerPts),
    observed: repParts.join(" · "),
    explanation:
      "Cuando el anunciante repite el mismo mensaje u oferta en varios anuncios, ese ángulo comercial forma parte central de su estrategia.",
  });

  // 5. Diversidad de creatividades (10)
  const c = Math.max(1, i.distinctCreatives);
  const f = Math.max(1, i.distinctFormats);
  signals.push({
    key: "creative_diversity",
    label: "Diversidad de creatividades",
    max: 10,
    points: round1(6 * clamp01((c - 1) / 5) + 4 * clamp01((f - 1) / 2)),
    observed: `${plural(c, "creatividad", "creatividades")} · ${plural(f, "formato", "formatos")}`,
    explanation:
      "Creatividades y formatos distintos que el anunciante usa hacia el mismo destino. Probar variaciones es típico de campañas que se optimizan activamente.",
  });

  // 6. Landing page disponible (10)
  let landingPts = 0;
  let landingObs = "Sin destino identificado";
  if (i.landingKind === "web") {
    landingPts = i.landingDomainOnly ? 7 : 10;
    landingObs = i.landingDomainOnly ? "Dominio visible (sin URL completa)" : "Landing page identificada";
  } else if (i.landingKind === "app_store") {
    landingPts = 6;
    landingObs = "Tienda de aplicaciones";
  } else if (i.landingKind) {
    landingPts = 3;
    landingObs = i.landingKind === "messaging" ? "Mensajería (WhatsApp/Messenger)" : "Red social";
  }
  signals.push({
    key: "landing",
    label: "Landing page disponible",
    max: 10,
    points: landingPts,
    observed: landingObs,
    explanation:
      "Un destino web identificable permite analizar la oferta completa y agrupar todos los anuncios que llevan a la misma página.",
  });

  // 7. Continuidad de la campaña (10)
  const w = Math.max(0, i.launchWeeks);
  signals.push({
    key: "continuity",
    label: "Continuidad de la campaña",
    max: 10,
    points: round1((i.isActive ? 4 : 0) + 6 * clamp01((w - 1) / 5)),
    observed: `${i.isActive ? "Sigue activo" : "Ya no circula"} · lanzamientos en ${plural(w, "semana", "semanas")} distintas`,
    explanation:
      "Si el anunciante sigue lanzando anuncios hacia el mismo destino en semanas distintas, la campaña tiene continuidad en el tiempo.",
  });

  const score = Math.round(signals.reduce((s, x) => s + x.points, 0));
  return { score: Math.max(0, Math.min(100, score)), signals };
}

export function scoreTier(score: number): { label: string; tone: "low" | "mid" | "high" } {
  if (score >= 70) return { label: "Señales altas", tone: "high" };
  if (score >= 40) return { label: "Señales moderadas", tone: "mid" };
  return { label: "Señales bajas", tone: "low" };
}

export const SCORE_DISCLAIMER =
  "Puntuación orientativa basada solo en señales públicas observables (tiempo activo, variantes, volumen, repetición, diversidad, destino y continuidad). No mide ventas, conversiones ni rentabilidad, y no indica que un anuncio sea ganador.";
