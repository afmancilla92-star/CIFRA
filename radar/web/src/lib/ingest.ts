import type { InValue } from "@libsql/client";
import { db, json } from "./db/client";
import { mergeAd, prepareBatch, type AdRecord } from "./merge";
import { recomputeForPages } from "./stats";
import type { AdFormat, MediaItem, Platform, RawAd, ScoreSignal, SourceKind } from "./types";

export { mediaExpiry } from "./merge";

export interface IngestOptions {
  source: SourceKind;
  /** Países de la consulta (p. ej. el país elegido en la Biblioteca). */
  queryCountries?: string[];
  context?: Record<string, unknown>;
  now?: Date;
}

export interface IngestResult {
  received: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  ids: string[];
}

type Row = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? null : String(v));
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** Fila de SQLite → registro (mismo formato que usa la extensión). */
export function rowToRecord(r: Row): AdRecord {
  return {
    id: String(r.id),
    pageId: String(r.page_id),
    pageName: String(r.page_name),
    isActive: Number(r.is_active) === 1,
    startDate: s(r.start_date),
    stopDate: s(r.stop_date),
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
    collationId: s(r.collation_id),
    collationCount: n(r.collation_count),
    messageHash: s(r.message_hash),
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
    updatedAt: String(r.updated_at),
  };
}

function recordToValues(a: AdRecord): Record<string, InValue> {
  return {
    id: a.id,
    page_id: a.pageId,
    page_name: a.pageName,
    is_active: a.isActive ? 1 : 0,
    start_date: a.startDate,
    stop_date: a.stopDate,
    platforms: JSON.stringify(a.platforms),
    languages: JSON.stringify(a.languages),
    countries: JSON.stringify(a.countries),
    language: a.language,
    body: a.body,
    title: a.title,
    link_description: a.linkDescription,
    caption: a.caption,
    cta_text: a.ctaText,
    link_url: a.linkUrl,
    landing_key: a.landingKey,
    landing_domain: a.landingDomain,
    format: a.format,
    media: JSON.stringify(a.media),
    media_expires_at: a.mediaExpiresAt,
    collation_id: a.collationId,
    collation_count: a.collationCount,
    message_hash: a.messageHash,
    offers: JSON.stringify(a.offers),
    niche: a.niche,
    niche_confidence: a.nicheConfidence,
    niche_source: a.nicheSource,
    niche_terms: JSON.stringify(a.nicheTerms),
    eu_total_reach: a.euTotalReach,
    sources: JSON.stringify(a.sources),
    is_manual: a.isManual ? 1 : 0,
    partial: a.partial ? 1 : 0,
    first_seen_at: a.firstSeenAt,
    last_seen_at: a.lastSeenAt,
    updated_at: a.updatedAt,
  };
}

export async function ingestAds(input: RawAd[], opts: IngestOptions): Promise<IngestResult> {
  const now = (opts.now ?? new Date()).toISOString();
  const client = await db();
  const batch = prepareBatch(input);
  const result: IngestResult = { received: input.length, created: 0, updated: 0, skipped: batch.skipped, errors: batch.errors, ids: [] };
  const touchedPages = new Set<string>();

  for (const ad of batch.ads) {
    try {
      const row = (await client.execute({ sql: "SELECT * FROM ads WHERE id = ?", args: [ad.id] })).rows[0] as unknown as Row | undefined;
      const existing = row ? rowToRecord(row) : null;
      const { record, weak } = mergeAd(existing, ad, { source: opts.source, queryCountries: opts.queryCountries, now });

      const adv = ad.advertiser ?? {};
      await client.execute({
        sql: `INSERT INTO advertisers (page_id, name, page_url, avatar_url, likes, categories, first_seen_at, last_seen_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(page_id) DO UPDATE SET
                name = CASE WHEN ? THEN advertisers.name ELSE excluded.name END,
                page_url = COALESCE(excluded.page_url, advertisers.page_url),
                avatar_url = COALESCE(excluded.avatar_url, advertisers.avatar_url),
                likes = COALESCE(excluded.likes, advertisers.likes),
                categories = CASE WHEN excluded.categories = '[]' THEN advertisers.categories ELSE excluded.categories END,
                last_seen_at = excluded.last_seen_at`,
        args: [
          ad.pageId,
          record.pageName,
          adv.pageUrl ?? null,
          adv.avatarUrl ?? null,
          adv.likes ?? null,
          JSON.stringify(adv.categories ?? []),
          now,
          now,
          weak ? 1 : 0,
        ],
      });

      const values = recordToValues(record);
      // La puntuación la recalcula recomputeForPages; no se pisa aquí.
      const cols = Object.keys(values);
      await client.execute({
        sql: `INSERT INTO ads (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})
              ON CONFLICT(id) DO UPDATE SET ${cols
                .filter((c) => c !== "id" && c !== "first_seen_at")
                .map((c) => `${c} = excluded.${c}`)
                .join(", ")}`,
        args: cols.map((c) => values[c] as InValue),
      });

      if (existing) result.updated++;
      else result.created++;
      result.ids.push(ad.id);
      touchedPages.add(ad.pageId);
      // Si el anuncio cambió de anunciante (p. ej. un ID provisional), recalcula también el anterior.
      if (existing && existing.pageId !== ad.pageId) touchedPages.add(existing.pageId);
    } catch (err) {
      result.skipped++;
      if (result.errors.length < 20) result.errors.push(`Anuncio ${ad.id}: ${(err as Error).message}`);
    }
  }

  if (touchedPages.size) await recomputeForPages(Array.from(touchedPages), opts.now);

  await client.execute({
    sql: `INSERT INTO ingest_log (source, context, received, created, updated, skipped, errors, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      opts.source,
      JSON.stringify(opts.context ?? {}),
      result.received,
      result.created,
      result.updated,
      result.skipped,
      JSON.stringify(result.errors),
      now,
    ],
  });

  return result;
}
