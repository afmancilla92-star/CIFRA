/**
 * Agregados por anunciante y puntuación de cada anuncio (lógica pura,
 * compartida por la plataforma y el modo local de la extensión).
 */
import { daysActive, isoWeekKey } from "./dates";
import { landingKind } from "./landing";
import { computeScore } from "./scoring";
import type { MediaItem, ScoreSignal } from "./types";

export interface StatsInput {
  id: string;
  isActive: boolean;
  startDate: string | null;
  stopDate: string | null;
  lastSeenAt: string;
  collationCount: number | null;
  messageHash: string | null;
  offers: string[];
  landingKey: string | null;
  landingDomain: string | null;
  linkUrl: string | null;
  format: string;
  media: MediaItem[];
  niche: string | null;
  impressionRank?: number | null;
  impressionQuery?: string | null;
}

export interface AdvertiserStats {
  perAd: Map<string, { score: number; signals: ScoreSignal[] }>;
  totalAds: number;
  activeAds: number;
  landingCount: number;
  mainNiche: string | null;
}

const NO_LANDING = "__sin_destino__";

export function computeAdvertiserStats(rows: StatsInput[], now = new Date()): AdvertiserStats {
  const active = rows.filter((r) => r.isActive);
  const hashCounts = new Map<string, number>();
  const offerCounts = new Map<string, number>();
  const groups = new Map<string, StatsInput[]>();
  for (const r of rows) {
    if (r.messageHash) hashCounts.set(r.messageHash, (hashCounts.get(r.messageHash) ?? 0) + 1);
    for (const o of r.offers) offerCounts.set(o, (offerCounts.get(o) ?? 0) + 1);
    const g = r.landingKey ?? NO_LANDING;
    groups.set(g, [...(groups.get(g) ?? []), r]);
  }

  const groupStats = new Map<string, { creatives: number; formats: number; weeks: number }>();
  for (const [key, list] of Array.from(groups.entries())) {
    const creatives = new Set(list.map((r) => r.messageHash ?? r.media[0]?.url ?? r.id));
    const formats = new Set(list.map((r) => r.format).filter((f) => f !== "unknown"));
    const weeks = new Set(list.map((r) => (r.startDate ? isoWeekKey(r.startDate) : null)).filter(Boolean));
    groupStats.set(key, { creatives: creatives.size, formats: Math.max(1, formats.size), weeks: weeks.size });
  }

  const perAd = new Map<string, { score: number; signals: ScoreSignal[] }>();
  for (const r of rows) {
    const offerRepeat = r.offers.length ? Math.max(...r.offers.map((o) => (offerCounts.get(o) ?? 1) - 1)) : 0;
    const g = groupStats.get(r.landingKey ?? NO_LANDING)!;
    const result = computeScore({
      daysActive: daysActive(r.startDate, { isActive: r.isActive, stopDate: r.stopDate, lastSeenAt: r.lastSeenAt, now }),
      isActive: r.isActive,
      collationCount: r.collationCount,
      sameMessageCount: r.messageHash ? (hashCounts.get(r.messageHash) ?? 1) - 1 : 0,
      offers: r.offers,
      offerRepeatCount: offerRepeat,
      advertiserActiveAds: active.length,
      distinctCreatives: r.landingKey ? g.creatives : 1,
      distinctFormats: r.landingKey ? g.formats : 1,
      landingKind: r.landingDomain ? landingKind(r.landingDomain) : null,
      landingDomainOnly: !r.linkUrl,
      launchWeeks: r.landingKey ? g.weeks : r.startDate ? 1 : 0,
      impressionRank: r.impressionRank ?? null,
      impressionQuery: r.impressionQuery ?? null,
    });
    perAd.set(r.id, { score: result.score, signals: result.signals });
  }

  const nicheCounts = new Map<string, number>();
  for (const r of rows) if (r.niche) nicheCounts.set(r.niche, (nicheCounts.get(r.niche) ?? 0) + 1);
  const mainNiche = Array.from(nicheCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    perAd,
    totalAds: rows.length,
    activeAds: active.length,
    landingCount: new Set(rows.map((r) => r.landingKey).filter(Boolean)).size,
    mainNiche,
  };
}
