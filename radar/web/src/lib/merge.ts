/**
 * Lógica pura de fusión de anuncios, compartida por la plataforma (SQLite)
 * y por el modo local de la extensión (IndexedDB). No accede a ninguna base.
 */
import { normalizeLanding } from "./landing";
import { detectLanguage } from "./lang";
import { classifyByRules } from "./niche/rules";
import { detectOffers, messageHash } from "./text";
import type { AdFormat, MediaItem, Platform, RawAd, ScoreSignal, SourceKind } from "./types";

export interface AdRecord {
  id: string;
  pageId: string;
  pageName: string;
  isActive: boolean;
  startDate: string | null;
  stopDate: string | null;
  platforms: Platform[];
  languages: string[];
  countries: string[];
  language: string | null;
  body: string | null;
  title: string | null;
  linkDescription: string | null;
  caption: string | null;
  ctaText: string | null;
  linkUrl: string | null;
  landingKey: string | null;
  landingDomain: string | null;
  format: AdFormat;
  media: MediaItem[];
  mediaExpiresAt: string | null;
  collationId: string | null;
  collationCount: number | null;
  messageHash: string | null;
  offers: string[];
  niche: string | null;
  nicheConfidence: number | null;
  nicheSource: string | null;
  nicheTerms: string[];
  euTotalReach: number | null;
  sources: SourceKind[];
  /** Búsquedas (palabras clave) en las que apareció el anuncio. */
  queries?: string[];
  /** Mejor posición en una búsqueda ordenada por impresiones totales (1 = más visto). */
  impressionRank?: number | null;
  impressionQuery?: string | null;
  impressionCountry?: string | null;
  impressionAt?: string | null;
  isManual: boolean;
  partial: boolean;
  score: number;
  scoreBreakdown: ScoreSignal[];
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
}

export interface AdvertiserRecord {
  pageId: string;
  name: string;
  pageUrl: string | null;
  avatarUrl: string | null;
  likes: number | null;
  categories: string[];
  mainNiche: string | null;
  totalAds: number;
  activeAds: number;
  landingCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export const ID_RE = /^[A-Za-z0-9_-]{3,64}$/;

const union = <T,>(a: T[], b: T[]) => Array.from(new Set([...a, ...b]));
const pick = <T,>(next: T | null | undefined, prev: T | null | undefined): T | null =>
  next !== null && next !== undefined && next !== ("" as unknown as T) ? next : (prev ?? null);
const minDate = (a: string | null, b: string | null) => (!a ? b : !b ? a : a < b ? a : b);

/** Las URLs de fbcdn traen `oe=<hex unix>`: momento en que el enlace firmado expira. */
export function mediaExpiry(media: MediaItem[]): string | null {
  let min: number | null = null;
  for (const m of media) {
    for (const url of [m.url, m.preview]) {
      if (!url) continue;
      const match = url.match(/[?&]oe=([0-9A-Fa-f]{6,10})/);
      if (match) {
        const t = parseInt(match[1] as string, 16) * 1000;
        if (Number.isFinite(t) && (min === null || t < min)) min = t;
      }
    }
  }
  return min ? new Date(min).toISOString() : null;
}

export function inferFormat(ad: Pick<RawAd, "format" | "media">): AdFormat {
  if (ad.format && ad.format !== "unknown") return ad.format;
  if (ad.media.length > 1) return "carousel";
  if (ad.media[0]?.type === "video") return "video";
  if (ad.media[0]?.type === "image") return "image";
  return "unknown";
}

/** Valida IDs y anunciante, y deduplica el lote quedándose con la versión más completa. */
export function prepareBatch(input: RawAd[]) {
  const errors: string[] = [];
  let skipped = 0;
  const byId = new Map<string, RawAd>();
  for (const ad of input) {
    if (!ad || !ad.id || !ID_RE.test(ad.id)) {
      skipped++;
      if (errors.length < 20) errors.push(`ID inválido: ${String(ad?.id ?? "")}`);
      continue;
    }
    if (!ad.pageId || !ad.pageName) {
      skipped++;
      if (errors.length < 20) errors.push(`Anuncio ${ad.id} sin anunciante identificado`);
      continue;
    }
    const prev = byId.get(ad.id);
    if (!prev || (prev.partial && !ad.partial) || ad.media.length > prev.media.length) byId.set(ad.id, ad);
  }
  return { ads: Array.from(byId.values()), skipped, errors };
}

export interface MergeContext {
  source: SourceKind;
  queryCountries?: string[];
  /** Palabra clave de la búsqueda que trajo el anuncio. */
  query?: string | null;
  /** Posición del anuncio en esa búsqueda ordenada por impresiones (si se ordenó así). */
  rank?: number | null;
  /** ISO */
  now: string;
}

/**
 * Combina lo que ya se sabía de un anuncio con una nueva observación.
 * Reglas: los datos parciales nunca pisan datos completos; las listas se
 * unen; la creatividad y la URL se completan con la fuente que las tenga.
 */
export function mergeAd(existing: AdRecord | null, ad: RawAd, ctx: MergeContext): { record: AdRecord; weak: boolean } {
  const countries = (ad.countries.length ? ad.countries : (ctx.queryCountries ?? [])).map((c) => c.toUpperCase());
  const weak = Boolean(ad.partial && existing && !existing.partial);
  const e = existing;

  const pageName = weak ? e!.pageName : ad.pageName;
  const isActive = ad.isActive ?? (e ? e.isActive : true);
  const body = weak ? e!.body : pick(ad.body, e?.body);
  const title = weak ? e!.title : pick(ad.title, e?.title);
  const linkDescription = weak ? e!.linkDescription : pick(ad.linkDescription, e?.linkDescription);
  const caption = pick(weak ? null : ad.caption, e?.caption);
  const linkUrlRaw = pick(weak ? null : ad.linkUrl, e?.linkUrl);
  const media = ad.media.length && !weak ? ad.media : (e?.media ?? ad.media);
  const sources = union(e?.sources ?? [], [ctx.source]);
  const partial = e ? e.partial && Boolean(ad.partial) : Boolean(ad.partial);
  const languages = union(e?.languages ?? [], ad.languages.map((l) => l.toLowerCase()));

  let format = inferFormat({ format: weak ? (e!.format ?? "unknown") : ad.format, media });
  if (format === "unknown" && !media.length && body && !partial && sources.includes("extension")) format = "text";

  const landing = normalizeLanding(linkUrlRaw, caption);
  const hash = messageHash(body, title);
  const offers = detectOffers(body, title, linkDescription);
  const language = languages[0] ?? detectLanguage([body, title, linkDescription].filter(Boolean).join(" "));

  // Nicho: se respeta una clasificación por IA o manual mientras el mensaje no cambie.
  let niche = e?.niche ?? null;
  let nicheConfidence = e?.nicheConfidence ?? null;
  let nicheSource = e?.nicheSource ?? null;
  let nicheTerms = e?.nicheTerms ?? [];
  const keepNiche = e && (e.nicheSource === "ai" || e.nicheSource === "manual") && e.messageHash === hash;
  if (!keepNiche) {
    const r = classifyByRules({
      body,
      title,
      linkDescription,
      caption: landing?.domain ?? caption,
      pageName,
      categories: ad.advertiser?.categories,
    });
    niche = r.niche;
    nicheConfidence = r.confidence;
    nicheSource = r.niche ? "rules" : null;
    nicheTerms = r.terms;
  }

  const record: AdRecord = {
    id: ad.id,
    pageId: ad.pageId,
    pageName,
    isActive,
    startDate: minDate(ad.startDate, e?.startDate ?? null),
    stopDate: ad.isActive === true ? null : pick(ad.stopDate, e?.stopDate),
    platforms: ad.platforms.length && !weak ? ad.platforms : (e?.platforms ?? ad.platforms),
    languages,
    countries: union(e?.countries ?? [], countries),
    language: language ?? null,
    body,
    title,
    linkDescription,
    caption,
    ctaText: pick(weak ? null : ad.ctaText, e?.ctaText),
    linkUrl: landing?.url ?? null,
    landingKey: landing?.key ?? null,
    landingDomain: landing?.domain ?? null,
    format,
    media,
    mediaExpiresAt: mediaExpiry(media),
    collationId: pick(ad.collationId, e?.collationId),
    collationCount: pick(ad.collationCount, e?.collationCount),
    messageHash: hash,
    offers,
    niche,
    nicheConfidence,
    nicheSource,
    nicheTerms,
    euTotalReach: pick(ad.euTotalReach, e?.euTotalReach),
    sources,
    queries: union(e?.queries ?? [], ctx.query?.trim() ? [ctx.query.trim().toLowerCase().slice(0, 80)] : []).slice(-20),
    ...bestRank(e, ctx, countries),
    isManual: e ? e.isManual && ctx.source === "manual" : ctx.source === "manual",
    partial,
    score: e?.score ?? 0,
    scoreBreakdown: e?.scoreBreakdown ?? [],
    firstSeenAt: e?.firstSeenAt ?? ctx.now,
    lastSeenAt: ctx.now,
    updatedAt: ctx.now,
  };
  return { record, weak };
}

/**
 * El ranking de impresiones se renueva con cada búsqueda nueva para la misma
 * palabra clave (refleja el presente) y, entre búsquedas distintas, se conserva
 * la mejor posición. Rankings de más de 30 días se reemplazan.
 */
function bestRank(e: AdRecord | null, ctx: MergeContext, countries: string[]) {
  const prev = {
    impressionRank: e?.impressionRank ?? null,
    impressionQuery: e?.impressionQuery ?? null,
    impressionCountry: e?.impressionCountry ?? null,
    impressionAt: e?.impressionAt ?? null,
  };
  const rank = ctx.rank && ctx.rank > 0 ? Math.round(ctx.rank) : null;
  if (!rank) return prev;
  const next = {
    impressionRank: rank,
    impressionQuery: ctx.query?.trim().toLowerCase().slice(0, 80) ?? null,
    impressionCountry: countries[0] ?? null,
    impressionAt: ctx.now,
  };
  const stale = !prev.impressionAt || Date.parse(ctx.now) - Date.parse(prev.impressionAt) > 30 * 86_400_000;
  if (!prev.impressionRank || stale || prev.impressionQuery === next.impressionQuery || rank < prev.impressionRank) return next;
  return prev;
}

/** Datos del anunciante: se actualizan con cada observación sin perder lo ya conocido. */
export function mergeAdvertiser(existing: AdvertiserRecord | null, ad: RawAd, record: AdRecord, weak: boolean, now: string): AdvertiserRecord {
  const adv = ad.advertiser ?? {};
  return {
    pageId: ad.pageId,
    name: weak && existing ? existing.name : record.pageName,
    pageUrl: adv.pageUrl ?? existing?.pageUrl ?? null,
    avatarUrl: adv.avatarUrl ?? existing?.avatarUrl ?? null,
    likes: adv.likes ?? existing?.likes ?? null,
    categories: adv.categories?.length ? adv.categories : (existing?.categories ?? []),
    mainNiche: existing?.mainNiche ?? null,
    totalAds: existing?.totalAds ?? 0,
    activeAds: existing?.activeAds ?? 0,
    landingCount: existing?.landingCount ?? 0,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
  };
}
