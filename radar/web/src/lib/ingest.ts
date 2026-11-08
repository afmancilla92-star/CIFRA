import type { InValue } from "@libsql/client";
import { db, json } from "./db/client";
import { normalizeLanding } from "./landing";
import { detectLanguage } from "./lang";
import { classifyByRules } from "./niche/rules";
import { detectOffers, messageHash } from "./text";
import { recomputeForPages } from "./stats";
import type { AdFormat, MediaItem, Platform, RawAd, SourceKind } from "./types";

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

interface ExistingRow {
  id: string;
  page_id: string;
  page_name: string;
  is_active: number;
  start_date: string | null;
  stop_date: string | null;
  platforms: string;
  languages: string;
  countries: string;
  body: string | null;
  title: string | null;
  link_description: string | null;
  caption: string | null;
  cta_text: string | null;
  link_url: string | null;
  format: string;
  media: string;
  collation_id: string | null;
  collation_count: number | null;
  message_hash: string | null;
  niche: string | null;
  niche_confidence: number | null;
  niche_source: string | null;
  niche_terms: string;
  eu_total_reach: number | null;
  sources: string;
  is_manual: number;
  partial: number;
  first_seen_at: string;
}

const ID_RE = /^[A-Za-z0-9_-]{3,64}$/;

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

function inferFormat(ad: Pick<RawAd, "format" | "media">): AdFormat {
  if (ad.format && ad.format !== "unknown") return ad.format;
  if (ad.media.length > 1) return "carousel";
  if (ad.media[0]?.type === "video") return "video";
  if (ad.media[0]?.type === "image") return "image";
  return "unknown";
}

export async function ingestAds(input: RawAd[], opts: IngestOptions): Promise<IngestResult> {
  const now = (opts.now ?? new Date()).toISOString();
  const client = await db();
  const result: IngestResult = { received: input.length, created: 0, updated: 0, skipped: 0, errors: [], ids: [] };
  const touchedPages = new Set<string>();

  // Deduplica dentro del mismo lote (la Biblioteca repite anuncios entre páginas de resultados).
  const byId = new Map<string, RawAd>();
  for (const ad of input) {
    if (!ad || !ad.id || !ID_RE.test(ad.id)) {
      result.skipped++;
      if (result.errors.length < 20) result.errors.push(`ID inválido: ${String(ad?.id ?? "")}`);
      continue;
    }
    if (!ad.pageId || !ad.pageName) {
      result.skipped++;
      if (result.errors.length < 20) result.errors.push(`Anuncio ${ad.id} sin anunciante identificado`);
      continue;
    }
    const prev = byId.get(ad.id);
    // Si llega dos veces, conserva la versión con más datos.
    if (!prev || (prev.partial && !ad.partial) || ad.media.length > prev.media.length) byId.set(ad.id, ad);
  }

  for (const ad of Array.from(byId.values())) {
    try {
      const existing = (await client.execute({ sql: "SELECT * FROM ads WHERE id = ?", args: [ad.id] })).rows[0] as
        | unknown as ExistingRow | undefined;
      const countries = (ad.countries.length ? ad.countries : (opts.queryCountries ?? [])).map((c) => c.toUpperCase());

      // Datos parciales (lectura de tarjeta) nunca pisan datos completos.
      const weak = Boolean(ad.partial && existing && !existing.partial);

      const merged = {
        pageName: weak ? existing!.page_name : ad.pageName,
        isActive: ad.isActive ?? (existing ? existing.is_active === 1 : true),
        startDate: minDate(ad.startDate, existing?.start_date ?? null),
        stopDate: ad.isActive === true ? null : pick(ad.stopDate, existing?.stop_date),
        platforms: (ad.platforms.length && !weak ? ad.platforms : json<Platform[]>(existing?.platforms, ad.platforms)) as Platform[],
        languages: union(json<string[]>(existing?.languages, []), ad.languages.map((l) => l.toLowerCase())),
        countries: union(json<string[]>(existing?.countries, []), countries),
        body: weak ? existing!.body : pick(ad.body, existing?.body),
        title: weak ? existing!.title : pick(ad.title, existing?.title),
        linkDescription: weak ? existing!.link_description : pick(ad.linkDescription, existing?.link_description),
        caption: pick(weak ? null : ad.caption, existing?.caption),
        ctaText: pick(weak ? null : ad.ctaText, existing?.cta_text),
        linkUrl: pick(weak ? null : ad.linkUrl, existing?.link_url),
        media: ad.media.length && !weak ? ad.media : json<MediaItem[]>(existing?.media, ad.media),
        format: "unknown" as AdFormat,
        collationId: pick(ad.collationId, existing?.collation_id),
        collationCount: pick(ad.collationCount, existing?.collation_count),
        euTotalReach: pick(ad.euTotalReach, existing?.eu_total_reach),
        sources: union(json<SourceKind[]>(existing?.sources, []), [opts.source]),
        isManual: existing ? existing.is_manual === 1 && opts.source === "manual" : opts.source === "manual",
        partial: existing ? Boolean(existing.partial) && Boolean(ad.partial) : Boolean(ad.partial),
      };
      merged.format = inferFormat({
        format: weak ? ((existing!.format as AdFormat) ?? "unknown") : ad.format,
        media: merged.media,
      });
      if (merged.format === "unknown" && !merged.media.length && merged.body && !merged.partial && merged.sources.includes("extension")) {
        merged.format = "text";
      }

      const landing = normalizeLanding(merged.linkUrl, merged.caption);
      const hash = messageHash(merged.body, merged.title);
      const offers = detectOffers(merged.body, merged.title, merged.linkDescription);
      const language =
        merged.languages[0] ?? detectLanguage([merged.body, merged.title, merged.linkDescription].filter(Boolean).join(" "));

      // Nicho: se respeta una clasificación por IA o manual mientras el mensaje no cambie.
      let niche = existing?.niche ?? null;
      let nicheConfidence = existing?.niche_confidence ?? null;
      let nicheSource = existing?.niche_source ?? null;
      let nicheTerms = json<string[]>(existing?.niche_terms, []);
      const keepNiche = existing && (existing.niche_source === "ai" || existing.niche_source === "manual") && existing.message_hash === hash;
      if (!keepNiche) {
        const r = classifyByRules({
          body: merged.body,
          title: merged.title,
          linkDescription: merged.linkDescription,
          caption: landing?.domain ?? merged.caption,
          pageName: merged.pageName,
          categories: ad.advertiser?.categories,
        });
        niche = r.niche;
        nicheConfidence = r.confidence;
        nicheSource = r.niche ? "rules" : null;
        nicheTerms = r.terms;
      }

      // Anunciante
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
          merged.pageName,
          adv.pageUrl ?? null,
          adv.avatarUrl ?? null,
          adv.likes ?? null,
          JSON.stringify(adv.categories ?? []),
          now,
          now,
          weak ? 1 : 0,
        ],
      });

      const values: Record<string, InValue> = {
        id: ad.id,
        page_id: ad.pageId,
        page_name: merged.pageName,
        is_active: merged.isActive ? 1 : 0,
        start_date: merged.startDate,
        stop_date: merged.stopDate,
        platforms: JSON.stringify(merged.platforms),
        languages: JSON.stringify(merged.languages),
        countries: JSON.stringify(merged.countries),
        language: language ?? null,
        body: merged.body,
        title: merged.title,
        link_description: merged.linkDescription,
        caption: merged.caption,
        cta_text: merged.ctaText,
        link_url: landing?.url ?? null,
        landing_key: landing?.key ?? null,
        landing_domain: landing?.domain ?? null,
        format: merged.format,
        media: JSON.stringify(merged.media),
        media_expires_at: mediaExpiry(merged.media),
        collation_id: merged.collationId,
        collation_count: merged.collationCount,
        message_hash: hash,
        offers: JSON.stringify(offers),
        niche,
        niche_confidence: nicheConfidence,
        niche_source: nicheSource,
        niche_terms: JSON.stringify(nicheTerms),
        eu_total_reach: merged.euTotalReach,
        sources: JSON.stringify(merged.sources),
        is_manual: merged.isManual ? 1 : 0,
        partial: merged.partial ? 1 : 0,
        first_seen_at: existing?.first_seen_at ?? now,
        last_seen_at: now,
        updated_at: now,
      };
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
      if (existing && existing.page_id !== ad.pageId) touchedPages.add(existing.page_id);
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
