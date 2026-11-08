import type { InStatement } from "@libsql/client";
import { db, json } from "./db/client";
import { daysActive, isoWeekKey } from "./dates";
import { landingKind } from "./landing";
import { computeScore } from "./scoring";
import type { MediaItem } from "./types";

interface AdRow {
  id: string;
  is_active: number;
  start_date: string | null;
  stop_date: string | null;
  last_seen_at: string;
  collation_count: number | null;
  message_hash: string | null;
  offers: string;
  landing_key: string | null;
  landing_domain: string | null;
  link_url: string | null;
  format: string;
  media: string;
  niche: string | null;
  is_manual: number;
}

/**
 * Recalcula los agregados por anunciante y la puntuación de cada uno de sus
 * anuncios. Se llama después de cada ingesta y a diario desde el cron
 * (los días activos cambian con el tiempo).
 */
export async function recomputeForPages(pageIds: string[], now = new Date()) {
  const client = await db();
  for (const pageId of pageIds) {
    const rows = (
      await client.execute({
        sql: `SELECT id, is_active, start_date, stop_date, last_seen_at, collation_count, message_hash, offers,
                     landing_key, landing_domain, link_url, format, media, niche, is_manual
              FROM ads WHERE page_id = ?`,
        args: [pageId],
      })
    ).rows as unknown as AdRow[];
    if (!rows.length) {
      await client.execute({ sql: "DELETE FROM advertisers WHERE page_id = ?", args: [pageId] });
      continue;
    }

    const active = rows.filter((r) => r.is_active === 1);
    const hashCounts = new Map<string, number>();
    const offerCounts = new Map<string, number>();
    const groups = new Map<string, AdRow[]>();
    for (const r of rows) {
      if (r.message_hash) hashCounts.set(r.message_hash, (hashCounts.get(r.message_hash) ?? 0) + 1);
      for (const o of json<string[]>(r.offers, [])) offerCounts.set(o, (offerCounts.get(o) ?? 0) + 1);
      const g = r.landing_key ?? "__sin_destino__";
      groups.set(g, [...(groups.get(g) ?? []), r]);
    }

    const groupStats = new Map<string, { creatives: number; formats: number; weeks: number }>();
    for (const [key, list] of Array.from(groups.entries())) {
      const creatives = new Set(
        list.map((r) => r.message_hash ?? json<MediaItem[]>(r.media, [])[0]?.url ?? r.id),
      );
      const formats = new Set(list.map((r) => r.format).filter((f) => f !== "unknown"));
      const weeks = new Set(list.map((r) => (r.start_date ? isoWeekKey(r.start_date) : null)).filter(Boolean));
      groupStats.set(key, { creatives: creatives.size, formats: Math.max(1, formats.size), weeks: weeks.size });
    }

    const statements: InStatement[] = [];
    for (const r of rows) {
      const offers = json<string[]>(r.offers, []);
      const offerRepeat = offers.length ? Math.max(...offers.map((o) => (offerCounts.get(o) ?? 1) - 1)) : 0;
      const g = groupStats.get(r.landing_key ?? "__sin_destino__")!;
      const { score, signals } = computeScore({
        daysActive: daysActive(r.start_date, {
          isActive: r.is_active === 1,
          stopDate: r.stop_date,
          lastSeenAt: r.last_seen_at,
          now,
        }),
        isActive: r.is_active === 1,
        collationCount: r.collation_count,
        sameMessageCount: r.message_hash ? (hashCounts.get(r.message_hash) ?? 1) - 1 : 0,
        offers,
        offerRepeatCount: offerRepeat,
        advertiserActiveAds: active.length,
        distinctCreatives: r.landing_key ? g.creatives : 1,
        distinctFormats: r.landing_key ? g.formats : 1,
        landingKind: r.landing_domain ? landingKind(r.landing_domain) : null,
        landingDomainOnly: !r.link_url,
        launchWeeks: r.landing_key ? g.weeks : r.start_date ? 1 : 0,
      });
      statements.push({
        sql: "UPDATE ads SET score = ?, score_breakdown = ? WHERE id = ?",
        args: [score, JSON.stringify(signals), r.id],
      });
    }

    const nicheCounts = new Map<string, number>();
    for (const r of rows) if (r.niche) nicheCounts.set(r.niche, (nicheCounts.get(r.niche) ?? 0) + 1);
    const mainNiche = Array.from(nicheCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const landingCount = new Set(rows.map((r) => r.landing_key).filter(Boolean)).size;

    statements.push({
      sql: "UPDATE advertisers SET total_ads = ?, active_ads = ?, landing_count = ?, main_niche = ? WHERE page_id = ?",
      args: [rows.length, active.length, landingCount, mainNiche, pageId],
    });
    await client.batch(statements, "write");
  }
}

export async function recomputeAll(now = new Date()) {
  const client = await db();
  const pages = (await client.execute("SELECT DISTINCT page_id FROM ads")).rows.map((r) => String(r.page_id));
  await recomputeForPages(pages, now);
  return pages.length;
}

/**
 * Retención: elimina anuncios no favoritos que no se ven desde hace más de
 * RETENTION_DAYS días. No se descargan ni re-alojan creatividades: solo se
 * guardan referencias (URLs) que expiran por sí solas.
 */
export async function purgeExpired(now = new Date()) {
  const days = Number(process.env.RETENTION_DAYS || 180);
  if (!Number.isFinite(days) || days <= 0) return 0;
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
  const client = await db();
  const pages = (
    await client.execute({
      sql: `SELECT DISTINCT page_id FROM ads WHERE last_seen_at < ? AND id NOT IN (SELECT ad_id FROM favorites)`,
      args: [cutoff],
    })
  ).rows.map((r) => String(r.page_id));
  const res = await client.execute({
    sql: `DELETE FROM ads WHERE last_seen_at < ? AND id NOT IN (SELECT ad_id FROM favorites)`,
    args: [cutoff],
  });
  if (pages.length) await recomputeForPages(pages, now);
  return res.rowsAffected;
}
