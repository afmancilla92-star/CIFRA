import type { InValue } from "@libsql/client";
import { all, json, one, run } from "./db/client";
import type { AdFormat, AdView, MediaItem, Platform, ScoreSignal, SourceKind } from "./types";

export const DAYS_EXPR = `CAST(julianday(CASE WHEN a.is_active = 1 THEN 'now' ELSE COALESCE(a.stop_date, a.last_seen_at) END) - julianday(a.start_date) AS INTEGER)`;

export const SORTS = {
  longest: { label: "Más días activos", sql: `(a.start_date IS NULL), days DESC, a.score DESC` },
  score: { label: "Mayor puntuación", sql: `a.score DESC, days DESC` },
  newest: { label: "Más recientes", sql: `(a.start_date IS NULL), a.start_date DESC` },
  variants: { label: "Más variantes", sql: `COALESCE(a.collation_count, 1) DESC, a.score DESC` },
  advertiser: { label: "Anunciantes con más anuncios", sql: `COALESCE(adv.active_ads, 0) DESC, a.score DESC` },
  seen: { label: "Vistos recientemente", sql: `a.last_seen_at DESC` },
} as const;
export type SortKey = keyof typeof SORTS;

export interface ExploreFilters {
  q?: string;
  niche?: string;
  country?: string;
  language?: string;
  platform?: string;
  format?: string;
  status?: "active" | "inactive" | "all";
  minDays?: number;
  maxDays?: number;
  startedAfter?: string;
  minScore?: number;
  minVariants?: number;
  minAdvertiserAds?: number;
  hasLanding?: boolean;
  domain?: string;
  landing?: string;
  pageId?: string;
  offer?: string;
  source?: SourceKind;
  includeManual?: boolean;
  favorites?: boolean;
  sort?: SortKey;
  page?: number;
  perPage?: number;
}

/** Convierte la búsqueda del usuario en una consulta FTS5 segura (prefijos, sin operadores). */
export function toFtsQuery(q: string): string | null {
  const terms = q
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2)
    .slice(0, 8);
  if (!terms.length) return null;
  return terms.map((t) => `"${t}"*`).join(" ");
}

function buildWhere(f: ExploreFilters) {
  const where: string[] = [];
  const args: InValue[] = [];
  if (!f.includeManual && f.source !== "manual") where.push("a.is_manual = 0");
  if (f.q) {
    const fts = toFtsQuery(f.q);
    if (fts) {
      where.push("a.rowid IN (SELECT rowid FROM ads_fts WHERE ads_fts MATCH ?)");
      args.push(fts);
    }
  }
  if (f.niche) {
    if (f.niche === "none") where.push("a.niche IS NULL");
    else {
      where.push("a.niche = ?");
      args.push(f.niche);
    }
  }
  if (f.country) {
    where.push("EXISTS (SELECT 1 FROM json_each(a.countries) WHERE value = ?)");
    args.push(f.country.toUpperCase());
  }
  if (f.language) {
    where.push("(a.language = ? OR EXISTS (SELECT 1 FROM json_each(a.languages) WHERE value = ?))");
    args.push(f.language, f.language);
  }
  if (f.platform) {
    where.push("EXISTS (SELECT 1 FROM json_each(a.platforms) WHERE value = ?)");
    args.push(f.platform);
  }
  if (f.offer) {
    where.push("EXISTS (SELECT 1 FROM json_each(a.offers) WHERE value = ?)");
    args.push(f.offer);
  }
  if (f.source) {
    where.push("EXISTS (SELECT 1 FROM json_each(a.sources) WHERE value = ?)");
    args.push(f.source);
  }
  if (f.format) {
    where.push("a.format = ?");
    args.push(f.format);
  }
  const status = f.status ?? "active";
  if (status === "active") where.push("a.is_active = 1");
  if (status === "inactive") where.push("a.is_active = 0");
  if (f.minDays !== undefined && Number.isFinite(f.minDays)) {
    where.push(`${DAYS_EXPR} >= ?`);
    args.push(f.minDays);
  }
  if (f.maxDays !== undefined && Number.isFinite(f.maxDays)) {
    where.push(`${DAYS_EXPR} <= ?`);
    args.push(f.maxDays);
  }
  if (f.startedAfter) {
    where.push("a.start_date >= ?");
    args.push(f.startedAfter);
  }
  if (f.minScore !== undefined && Number.isFinite(f.minScore)) {
    where.push("a.score >= ?");
    args.push(f.minScore);
  }
  if (f.minVariants !== undefined && Number.isFinite(f.minVariants)) {
    where.push("COALESCE(a.collation_count, 1) >= ?");
    args.push(f.minVariants);
  }
  if (f.minAdvertiserAds !== undefined && Number.isFinite(f.minAdvertiserAds)) {
    where.push("COALESCE(adv.active_ads, 0) >= ?");
    args.push(f.minAdvertiserAds);
  }
  if (f.hasLanding) where.push("a.landing_key IS NOT NULL");
  if (f.domain) {
    where.push("a.landing_domain = ?");
    args.push(f.domain.toLowerCase());
  }
  if (f.landing) {
    where.push("a.landing_key = ?");
    args.push(f.landing);
  }
  if (f.pageId) {
    where.push("a.page_id = ?");
    args.push(f.pageId);
  }
  if (f.favorites) where.push("fav.ad_id IS NOT NULL");
  return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", args };
}

const SELECT = `SELECT a.*, ${DAYS_EXPR} AS days,
  COALESCE(adv.active_ads, 0) AS adv_active, adv.avatar_url AS adv_avatar,
  CASE WHEN fav.ad_id IS NULL THEN 0 ELSE 1 END AS is_fav, fav.note AS fav_note
  FROM ads a
  LEFT JOIN advertisers adv ON adv.page_id = a.page_id
  LEFT JOIN favorites fav ON fav.ad_id = a.id`;

type Row = Record<string, unknown>;

export function rowToAd(r: Row): AdView {
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const s = (v: unknown) => (v === null || v === undefined ? null : String(v));
  return {
    id: String(r.id),
    pageId: String(r.page_id),
    pageName: String(r.page_name),
    isActive: Number(r.is_active) === 1,
    startDate: s(r.start_date),
    stopDate: s(r.stop_date),
    daysActive: r.days === null || r.days === undefined ? null : Math.max(0, Number(r.days)),
    platforms: json<Platform[]>(r.platforms, []),
    languages: json<string[]>(r.languages, []),
    countries: json<string[]>(r.countries, []),
    language: s(r.language),
    body: s(r.body),
    title: s(r.title),
    linkDescription: s(r.link_description),
    caption: s(r.caption),
    ctaText: s(r.cta_text),
    linkUrl: s(r.link_url),
    landingKey: s(r.landing_key),
    landingDomain: s(r.landing_domain),
    format: (s(r.format) ?? "unknown") as AdFormat,
    media: json<MediaItem[]>(r.media, []),
    mediaExpiresAt: s(r.media_expires_at),
    collationCount: n(r.collation_count),
    offers: json<string[]>(r.offers, []),
    niche: s(r.niche),
    nicheConfidence: n(r.niche_confidence),
    nicheSource: s(r.niche_source),
    nicheTerms: json<string[]>(r.niche_terms, []),
    euTotalReach: n(r.eu_total_reach),
    sources: json<SourceKind[]>(r.sources, []),
    isManual: Number(r.is_manual) === 1,
    partial: Number(r.partial) === 1,
    score: Number(r.score ?? 0),
    scoreBreakdown: json<ScoreSignal[]>(r.score_breakdown, []),
    firstSeenAt: String(r.first_seen_at),
    lastSeenAt: String(r.last_seen_at),
    isFavorite: Number(r.is_fav ?? 0) === 1,
    favoriteNote: s(r.fav_note),
    advertiserActiveAds: Number(r.adv_active ?? 0),
    advertiserAvatar: s(r.adv_avatar),
    libraryUrl: `https://www.facebook.com/ads/library/?id=${encodeURIComponent(String(r.id))}`,
  };
}

export async function searchAds(f: ExploreFilters) {
  const perPage = Math.min(60, Math.max(1, f.perPage ?? 24));
  const page = Math.max(1, f.page ?? 1);
  const where = buildWhere(f);
  const order = SORTS[f.sort ?? "longest"]?.sql ?? SORTS.longest.sql;
  const rows = await all(`${SELECT} ${where.sql} ORDER BY ${order}, a.id DESC LIMIT ? OFFSET ?`, [
    ...where.args,
    perPage,
    (page - 1) * perPage,
  ]);
  const count = await one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM ads a LEFT JOIN advertisers adv ON adv.page_id = a.page_id LEFT JOIN favorites fav ON fav.ad_id = a.id ${where.sql}`,
    where.args,
  );
  return { items: rows.map(rowToAd), total: Number(count?.c ?? 0), page, perPage };
}

export async function getAd(id: string): Promise<AdView | null> {
  const r = await one(`${SELECT} WHERE a.id = ?`, [id]);
  return r ? rowToAd(r) : null;
}

export async function relatedAds(ad: AdView) {
  const [sameAdvertiser, sameLanding, sameMessage] = await Promise.all([
    all(`${SELECT} WHERE a.page_id = ? AND a.id != ? ORDER BY a.is_active DESC, days DESC LIMIT 12`, [ad.pageId, ad.id]),
    ad.landingKey
      ? all(`${SELECT} WHERE a.landing_key = ? AND a.id != ? ORDER BY a.is_active DESC, days DESC LIMIT 12`, [ad.landingKey, ad.id])
      : Promise.resolve([]),
    all(
      `${SELECT} WHERE a.message_hash IS NOT NULL AND a.message_hash = (SELECT message_hash FROM ads WHERE id = ?) AND a.id != ?
       ORDER BY days DESC LIMIT 12`,
      [ad.id, ad.id],
    ),
  ]);
  // Cada anuncio aparece una sola vez: variantes > misma landing > mismo anunciante.
  const msg = sameMessage.map(rowToAd);
  const seen = new Set(msg.map((a) => a.id));
  const landing = sameLanding.map(rowToAd).filter((a) => !seen.has(a.id));
  landing.forEach((a) => seen.add(a.id));
  const advertiser = sameAdvertiser.map(rowToAd).filter((a) => !seen.has(a.id));
  return { sameAdvertiser: advertiser, sameLanding: landing, sameMessage: msg };
}

export interface Facet {
  value: string;
  count: number;
}

export async function getFacets() {
  const base = "FROM ads a WHERE a.is_manual = 0";
  const [niches, countries, languages, platforms, formats, offers] = await Promise.all([
    all<Facet>(`SELECT COALESCE(a.niche, 'none') AS value, COUNT(*) AS count ${base} GROUP BY 1 ORDER BY 2 DESC`),
    all<Facet>(`SELECT j.value AS value, COUNT(*) AS count FROM ads a, json_each(a.countries) j WHERE a.is_manual = 0 GROUP BY 1 ORDER BY 2 DESC`),
    all<Facet>(`SELECT a.language AS value, COUNT(*) AS count ${base} AND a.language IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`),
    all<Facet>(`SELECT j.value AS value, COUNT(*) AS count FROM ads a, json_each(a.platforms) j WHERE a.is_manual = 0 GROUP BY 1 ORDER BY 2 DESC`),
    all<Facet>(`SELECT a.format AS value, COUNT(*) AS count ${base} GROUP BY 1 ORDER BY 2 DESC`),
    all<Facet>(`SELECT j.value AS value, COUNT(*) AS count FROM ads a, json_each(a.offers) j WHERE a.is_manual = 0 GROUP BY 1 ORDER BY 2 DESC`),
  ]);
  const norm = (list: Facet[]) => list.map((x) => ({ value: String(x.value), count: Number(x.count) }));
  return {
    niches: norm(niches),
    countries: norm(countries),
    languages: norm(languages),
    platforms: norm(platforms),
    formats: norm(formats),
    offers: norm(offers),
  };
}

export async function getOverview() {
  const r = await one<Record<string, number | string | null>>(
    `SELECT
       (SELECT COUNT(*) FROM ads WHERE is_manual = 0) AS ads,
       (SELECT COUNT(*) FROM ads WHERE is_manual = 0 AND is_active = 1) AS active,
       (SELECT COUNT(*) FROM ads WHERE is_manual = 1) AS manual,
       (SELECT COUNT(*) FROM advertisers) AS advertisers,
       (SELECT COUNT(*) FROM advertisers WHERE active_ads >= 5) AS big_advertisers,
       (SELECT COUNT(DISTINCT landing_key) FROM ads WHERE landing_key IS NOT NULL AND is_manual = 0) AS landings,
       (SELECT COUNT(*) FROM favorites) AS favorites,
       (SELECT MAX(created_at) FROM ingest_log WHERE source != 'manual') AS last_ingest`,
  );
  return {
    ads: Number(r?.ads ?? 0),
    active: Number(r?.active ?? 0),
    manual: Number(r?.manual ?? 0),
    advertisers: Number(r?.advertisers ?? 0),
    bigAdvertisers: Number(r?.big_advertisers ?? 0),
    landings: Number(r?.landings ?? 0),
    favorites: Number(r?.favorites ?? 0),
    lastIngest: (r?.last_ingest as string | null) ?? null,
  };
}

export interface AdvertiserView {
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
  oldestActiveDays: number | null;
  avgScore: number;
  topDomains: string[];
  firstSeenAt: string;
  lastSeenAt: string;
}

export const ADVERTISER_SORTS = {
  active: { label: "Más anuncios activos", sql: "adv.active_ads DESC, adv.total_ads DESC" },
  oldest: { label: "Anuncio activo más antiguo", sql: "oldest_days IS NULL, oldest_days DESC" },
  score: { label: "Mayor puntuación media", sql: "avg_score DESC" },
  recent: { label: "Vistos recientemente", sql: "adv.last_seen_at DESC" },
} as const;
export type AdvertiserSort = keyof typeof ADVERTISER_SORTS;

function rowToAdvertiser(r: Row): AdvertiserView {
  return {
    pageId: String(r.page_id),
    name: String(r.name),
    pageUrl: (r.page_url as string) ?? null,
    avatarUrl: (r.avatar_url as string) ?? null,
    likes: r.likes === null || r.likes === undefined ? null : Number(r.likes),
    categories: json<string[]>(r.categories, []),
    mainNiche: (r.main_niche as string) ?? null,
    totalAds: Number(r.total_ads ?? 0),
    activeAds: Number(r.active_ads ?? 0),
    landingCount: Number(r.landing_count ?? 0),
    oldestActiveDays: r.oldest_days === null || r.oldest_days === undefined ? null : Number(r.oldest_days),
    avgScore: Math.round(Number(r.avg_score ?? 0)),
    topDomains: String(r.domains ?? "")
      .split(",")
      .filter(Boolean)
      .slice(0, 3),
    firstSeenAt: String(r.first_seen_at),
    lastSeenAt: String(r.last_seen_at),
  };
}

const ADVERTISER_SELECT = `SELECT adv.*,
   (SELECT MAX(${DAYS_EXPR}) FROM ads a WHERE a.page_id = adv.page_id AND a.is_active = 1) AS oldest_days,
   (SELECT AVG(a.score) FROM ads a WHERE a.page_id = adv.page_id AND a.is_active = 1) AS avg_score,
   (SELECT GROUP_CONCAT(d, ',') FROM (SELECT DISTINCT a.landing_domain AS d FROM ads a WHERE a.page_id = adv.page_id AND a.landing_domain IS NOT NULL LIMIT 3)) AS domains
   FROM advertisers adv`;

export async function listAdvertisers(f: { q?: string; niche?: string; minActive?: number; sort?: AdvertiserSort; page?: number }) {
  const where: string[] = ["EXISTS (SELECT 1 FROM ads a WHERE a.page_id = adv.page_id AND a.is_manual = 0)"];
  const args: InValue[] = [];
  if (f.q?.trim()) {
    where.push("adv.name LIKE ?");
    args.push(`%${f.q.trim()}%`);
  }
  if (f.niche) {
    where.push("adv.main_niche = ?");
    args.push(f.niche);
  }
  if (f.minActive) {
    where.push("adv.active_ads >= ?");
    args.push(f.minActive);
  }
  const perPage = 30;
  const page = Math.max(1, f.page ?? 1);
  const order = ADVERTISER_SORTS[f.sort ?? "active"]?.sql ?? ADVERTISER_SORTS.active.sql;
  const w = `WHERE ${where.join(" AND ")}`;
  const rows = await all(`${ADVERTISER_SELECT} ${w} ORDER BY ${order} LIMIT ? OFFSET ?`, [...args, perPage, (page - 1) * perPage]);
  const count = await one<{ c: number }>(`SELECT COUNT(*) AS c FROM advertisers adv ${w}`, args);
  return { items: rows.map(rowToAdvertiser), total: Number(count?.c ?? 0), page, perPage };
}

export async function getAdvertiser(pageId: string): Promise<AdvertiserView | null> {
  const r = await one(`${ADVERTISER_SELECT} WHERE adv.page_id = ?`, [pageId]);
  return r ? rowToAdvertiser(r) : null;
}

export async function advertiserLandings(pageId: string) {
  return (
    await all(
      `SELECT landing_key, landing_domain, MAX(link_url) AS url, COUNT(*) AS ads, SUM(is_active) AS active
       FROM ads WHERE page_id = ? AND landing_key IS NOT NULL GROUP BY landing_key ORDER BY ads DESC LIMIT 20`,
      [pageId],
    )
  ).map((r) => ({
    key: String(r.landing_key),
    domain: String(r.landing_domain),
    url: (r.url as string) ?? null,
    ads: Number(r.ads),
    active: Number(r.active ?? 0),
  }));
}

export interface LandingGroup {
  key: string;
  domain: string;
  url: string | null;
  ads: number;
  active: number;
  advertisers: number;
  advertiserNames: string[];
  firstStart: string | null;
  maxDays: number | null;
  bestScore: number;
  sample: AdView | null;
}

export const LANDING_SORTS = {
  ads: { label: "Más anuncios", sql: "ads DESC, active DESC" },
  advertisers: { label: "Más anunciantes", sql: "advertisers DESC, ads DESC" },
  oldest: { label: "Más antigua", sql: "max_days IS NULL, max_days DESC" },
  score: { label: "Mayor puntuación", sql: "best_score DESC" },
} as const;
export type LandingSort = keyof typeof LANDING_SORTS;

export async function listLandings(f: { q?: string; minAds?: number; sort?: LandingSort; page?: number }) {
  const args: InValue[] = [];
  const where = ["a.landing_key IS NOT NULL", "a.is_manual = 0"];
  if (f.q?.trim()) {
    where.push("(a.landing_key LIKE ? OR a.page_name LIKE ?)");
    args.push(`%${f.q.trim().toLowerCase()}%`, `%${f.q.trim()}%`);
  }
  const perPage = 30;
  const page = Math.max(1, f.page ?? 1);
  const minAds = Math.max(1, f.minAds ?? 2);
  const order = LANDING_SORTS[f.sort ?? "ads"]?.sql ?? LANDING_SORTS.ads.sql;
  const grouped = `SELECT a.landing_key AS key, MAX(a.landing_domain) AS domain, MAX(a.link_url) AS url, COUNT(*) AS ads,
       SUM(a.is_active) AS active, COUNT(DISTINCT a.page_id) AS advertisers,
       GROUP_CONCAT(DISTINCT a.page_name) AS names, MIN(a.start_date) AS first_start,
       MAX(${DAYS_EXPR}) AS max_days, MAX(a.score) AS best_score,
       MAX(CASE WHEN a.media != '[]' THEN a.id END) AS sample_id, MAX(a.id) AS any_id
     FROM ads a WHERE ${where.join(" AND ")} GROUP BY a.landing_key HAVING COUNT(*) >= ?`;
  const rows = await all(`${grouped} ORDER BY ${order} LIMIT ? OFFSET ?`, [...args, minAds, perPage, (page - 1) * perPage]);
  const count = await one<{ c: number }>(`SELECT COUNT(*) AS c FROM (${grouped})`, [...args, minAds]);
  const sampleIds = rows.map((r) => String(r.sample_id ?? r.any_id));
  const samples = sampleIds.length
    ? (await all(`${SELECT} WHERE a.id IN (${sampleIds.map(() => "?").join(",")})`, sampleIds)).map(rowToAd)
    : [];
  const byId = new Map(samples.map((s) => [s.id, s]));
  const items: LandingGroup[] = rows.map((r) => ({
    key: String(r.key),
    domain: String(r.domain),
    url: (r.url as string) ?? null,
    ads: Number(r.ads),
    active: Number(r.active ?? 0),
    advertisers: Number(r.advertisers),
    advertiserNames: String(r.names ?? "").split(",").filter(Boolean).slice(0, 4),
    firstStart: (r.first_start as string) ?? null,
    maxDays: r.max_days === null || r.max_days === undefined ? null : Number(r.max_days),
    bestScore: Number(r.best_score ?? 0),
    sample: byId.get(String(r.sample_id ?? r.any_id)) ?? null,
  }));
  return { items, total: Number(count?.c ?? 0), page, perPage };
}

export async function setFavorite(adId: string, on: boolean, note?: string | null) {
  if (on) {
    await run(
      `INSERT INTO favorites (ad_id, note, created_at) VALUES (?, ?, ?)
       ON CONFLICT(ad_id) DO UPDATE SET note = COALESCE(excluded.note, favorites.note)`,
      [adId, note ?? null, new Date().toISOString()],
    );
  } else {
    await run("DELETE FROM favorites WHERE ad_id = ?", [adId]);
  }
}

export async function adExists(id: string) {
  return Boolean(await one("SELECT 1 AS x FROM ads WHERE id = ?", [id]));
}
