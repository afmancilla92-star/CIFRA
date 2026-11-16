import type { InStatement } from "@libsql/client";
import { computeAdvertiserStats, type StatsInput } from "./advertiser-stats";
import { db, json } from "./db/client";
import type { MediaItem } from "./types";

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
                     landing_key, landing_domain, link_url, format, media, niche
              FROM ads WHERE page_id = ?`,
        args: [pageId],
      })
    ).rows as unknown as Array<Record<string, unknown>>;
    if (!rows.length) {
      await client.execute({ sql: "DELETE FROM advertisers WHERE page_id = ?", args: [pageId] });
      continue;
    }
    const inputs: StatsInput[] = rows.map((r) => ({
      id: String(r.id),
      isActive: Number(r.is_active) === 1,
      startDate: (r.start_date as string) ?? null,
      stopDate: (r.stop_date as string) ?? null,
      lastSeenAt: String(r.last_seen_at),
      collationCount: r.collation_count === null || r.collation_count === undefined ? null : Number(r.collation_count),
      messageHash: (r.message_hash as string) ?? null,
      offers: json<string[]>(r.offers, []),
      landingKey: (r.landing_key as string) ?? null,
      landingDomain: (r.landing_domain as string) ?? null,
      linkUrl: (r.link_url as string) ?? null,
      format: String(r.format),
      media: json<MediaItem[]>(r.media, []),
      niche: (r.niche as string) ?? null,
    }));
    const stats = computeAdvertiserStats(inputs, now);
    const statements: InStatement[] = [];
    for (const [id, { score, signals }] of Array.from(stats.perAd.entries())) {
      statements.push({ sql: "UPDATE ads SET score = ?, score_breakdown = ? WHERE id = ?", args: [score, JSON.stringify(signals), id] });
    }
    statements.push({
      sql: "UPDATE advertisers SET total_ads = ?, active_ads = ?, landing_count = ?, main_niche = ? WHERE page_id = ?",
      args: [stats.totalAds, stats.activeAds, stats.landingCount, stats.mainNiche, pageId],
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
