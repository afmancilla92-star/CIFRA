import { all, json, one, run } from "./db/client";
import { config } from "./config";
import { ingestAds } from "./ingest";
import { fetchMetaAds, MetaApiError, type MetaActiveStatus, type MetaMediaType, type MetaSearchType } from "./sources/meta-api";
import { purgeExpired, recomputeAll } from "./stats";

export interface WatchQuery {
  id: number;
  label: string;
  searchTerms: string | null;
  pageIds: string[];
  countries: string[];
  languages: string[];
  platforms: string[];
  mediaType: MetaMediaType;
  activeStatus: MetaActiveStatus;
  searchType: MetaSearchType;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
  lastCount: number | null;
}

function rowToWatch(r: Record<string, unknown>): WatchQuery {
  return {
    id: Number(r.id),
    label: String(r.label),
    searchTerms: (r.search_terms as string) ?? null,
    pageIds: json<string[]>(r.page_ids, []),
    countries: json<string[]>(r.countries, []),
    languages: json<string[]>(r.languages, []),
    platforms: json<string[]>(r.platforms, []),
    mediaType: (r.media_type as MetaMediaType) ?? "ALL",
    activeStatus: (r.active_status as MetaActiveStatus) ?? "ACTIVE",
    searchType: (r.search_type as MetaSearchType) ?? "KEYWORD_UNORDERED",
    enabled: Number(r.enabled) === 1,
    lastRunAt: (r.last_run_at as string) ?? null,
    lastStatus: (r.last_status as string) ?? null,
    lastMessage: (r.last_message as string) ?? null,
    lastCount: r.last_count === null || r.last_count === undefined ? null : Number(r.last_count),
  };
}

export async function listWatchQueries() {
  return (await all("SELECT * FROM watch_queries ORDER BY created_at DESC")).map(rowToWatch);
}

export type WatchInput = Omit<WatchQuery, "id" | "lastRunAt" | "lastStatus" | "lastMessage" | "lastCount">;

export async function createWatchQuery(w: WatchInput) {
  const res = await run(
    `INSERT INTO watch_queries (label, search_terms, page_ids, countries, languages, platforms, media_type, active_status, search_type, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      w.label,
      w.searchTerms,
      JSON.stringify(w.pageIds),
      JSON.stringify(w.countries.map((c) => c.toUpperCase())),
      JSON.stringify(w.languages),
      JSON.stringify(w.platforms),
      w.mediaType,
      w.activeStatus,
      w.searchType,
      w.enabled ? 1 : 0,
      new Date().toISOString(),
    ],
  );
  return Number(res.lastInsertRowid);
}

export async function setWatchEnabled(id: number, enabled: boolean) {
  await run("UPDATE watch_queries SET enabled = ? WHERE id = ?", [enabled ? 1 : 0, id]);
}

export async function deleteWatchQuery(id: number) {
  await run("DELETE FROM watch_queries WHERE id = ?", [id]);
}

export interface RunOutcome {
  id: number;
  status: "ok" | "error" | "skipped";
  message: string;
  received: number;
  created: number;
  updated: number;
  fatal?: boolean;
}

export async function runWatchQuery(id: number, fetchImpl?: typeof fetch): Promise<RunOutcome> {
  const row = await one("SELECT * FROM watch_queries WHERE id = ?", [id]);
  if (!row) return { id, status: "skipped", message: "Búsqueda no encontrada", received: 0, created: 0, updated: 0 };
  const w = rowToWatch(row);
  const token = config.metaToken;
  const now = new Date().toISOString();
  if (!token) {
    const message = "Falta META_ACCESS_TOKEN: la API oficial no está configurada.";
    await run("UPDATE watch_queries SET last_run_at = ?, last_status = 'error', last_message = ? WHERE id = ?", [now, message, id]);
    return { id, status: "error", message, received: 0, created: 0, updated: 0, fatal: true };
  }
  try {
    const res = await fetchMetaAds(
      {
        searchTerms: w.searchTerms,
        pageIds: w.pageIds,
        countries: w.countries,
        languages: w.languages,
        platforms: w.platforms,
        mediaType: w.mediaType,
        activeStatus: w.activeStatus,
        searchType: w.searchType,
      },
      { token, version: config.metaVersion, maxPages: config.metaMaxPages, fetchImpl },
    );
    const ing = await ingestAds(res.ads, {
      source: "meta_api",
      queryCountries: w.countries,
      context: { watchId: id, label: w.label, pages: res.pages },
    });
    const message = [`${res.ads.length} anuncios recibidos (${ing.created} nuevos, ${ing.updated} actualizados)`, ...res.warnings].join(" · ");
    await run("UPDATE watch_queries SET last_run_at = ?, last_status = 'ok', last_message = ?, last_count = ? WHERE id = ?", [
      now,
      message,
      res.ads.length,
      id,
    ]);
    return { id, status: "ok", message, received: res.ads.length, created: ing.created, updated: ing.updated };
  } catch (err) {
    const e = err as MetaApiError;
    const message = e.message || "Error desconocido";
    await run("UPDATE watch_queries SET last_run_at = ?, last_status = 'error', last_message = ? WHERE id = ?", [now, message, id]);
    return {
      id,
      status: "error",
      message,
      received: 0,
      created: 0,
      updated: 0,
      fatal: e instanceof MetaApiError && (e.kind === "auth" || e.kind === "permission" || e.kind === "rate_limit"),
    };
  }
}

/** Ejecuta las búsquedas activas en serie; se detiene ante errores de token, permiso o límite. */
export async function runAllWatchQueries(fetchImpl?: typeof fetch) {
  const queries = (await listWatchQueries()).filter((w) => w.enabled);
  const outcomes: RunOutcome[] = [];
  for (const q of queries) {
    const o = await runWatchQuery(q.id, fetchImpl);
    outcomes.push(o);
    if (o.fatal) break;
  }
  return outcomes;
}

export async function dailyMaintenance() {
  const recomputed = await recomputeAll();
  const purged = await purgeExpired();
  return { recomputed, purged };
}
