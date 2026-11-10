/**
 * Almacén local del modo «sin servidor» de la extensión: IndexedDB dentro
 * del propio Chrome del usuario. Usa la misma lógica de fusión y puntuación
 * que la plataforma web.
 */
import { computeAdvertiserStats } from "../lib/advertiser-stats";
import { normalizeLanding } from "../lib/landing";
import { mergeAd, mergeAdvertiser, prepareBatch, type AdRecord, type AdvertiserRecord } from "../lib/merge";
import { classifyByRules } from "../lib/niche/rules";
import { cleanTemplate, mapDomCard, mapLibraryNode, type DomCard } from "../lib/sources/library-page";
import { mapArchivedAd, type MetaArchivedAd } from "../lib/sources/meta-api";
import type { RawAd, SourceKind } from "../lib/types";

const DB_NAME = "cifra-radar";
const DB_VERSION = 1;
export const RETENTION_DAYS = 180;

export interface Favorite {
  adId: string;
  note: string | null;
  createdAt: string;
}

export interface LogEntry {
  id?: number;
  source: SourceKind;
  createdAt: string;
  received: number;
  created: number;
  updated: number;
  skipped: number;
  context: Record<string, unknown>;
}

export interface LocalIngestResult {
  received: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  ids: string[];
}

export interface ExtensionPayload {
  pageUrl: string;
  query?: { country?: string | null; q?: string | null; pageId?: string | null; sort?: string | null };
  /** Posición de cada anuncio cuando la búsqueda está ordenada por impresiones totales. */
  ranks?: Record<string, number>;
  nodes?: unknown[];
  domCards?: DomCard[];
}

export interface ExportFile {
  format: "cifra-radar";
  version: 1;
  exportedAt: string;
  ads: AdRecord[];
  advertisers: AdvertiserRecord[];
  favorites: Favorite[];
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function isAdLibraryUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && /(^|\.)facebook\.com$/.test(u.hostname) && u.pathname.startsWith("/ads/library");
  } catch {
    return false;
  }
}

/** Traduce una captura de la extensión al modelo interno (igual que la plataforma). */
export function mapExtensionPayload(p: ExtensionPayload): { ads: RawAd[]; countries: string[] } {
  const country = p.query?.country?.toUpperCase();
  const countries = country && country !== "ALL" && /^[A-Z]{2}$/.test(country) ? [country] : [];
  const pageId = p.query?.pageId && /^\d{3,25}$/.test(p.query.pageId) ? p.query.pageId : null;
  const ctx = { countries, pageId };
  const ads: RawAd[] = [];
  for (const n of (p.nodes ?? []).slice(0, 1500)) {
    const m = mapLibraryNode(n, ctx);
    if (m) ads.push(m);
  }
  const seen = new Set(ads.map((a) => a.id));
  for (const c of (p.domCards ?? []).slice(0, 500)) {
    if (!c || seen.has(c.libraryId)) continue;
    const m = mapDomCard(c, ctx);
    if (m) ads.push(m);
  }
  return { ads, countries };
}

function sanitizeRanks(r: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(r).slice(0, 3000)) if (/^\d{5,25}$/.test(id) && Number.isFinite(n) && n > 0) out[id] = Math.round(n);
  return out;
}

export class LocalStore {
  private constructor(private idb: IDBDatabase) {}

  static async open(factory: IDBFactory = indexedDB): Promise<LocalStore> {
    const r = factory.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains("ads")) d.createObjectStore("ads", { keyPath: "id" }).createIndex("pageId", "pageId");
      if (!d.objectStoreNames.contains("advertisers")) d.createObjectStore("advertisers", { keyPath: "pageId" });
      if (!d.objectStoreNames.contains("favorites")) d.createObjectStore("favorites", { keyPath: "adId" });
      if (!d.objectStoreNames.contains("log")) d.createObjectStore("log", { keyPath: "id", autoIncrement: true });
    };
    return new LocalStore(await req(r));
  }

  close() {
    this.idb.close();
  }

  private async get<T>(store: string, key: string): Promise<T | null> {
    const tx = this.idb.transaction(store, "readonly");
    return ((await req(tx.objectStore(store).get(key))) as T | undefined) ?? null;
  }

  private async getAll<T>(store: string): Promise<T[]> {
    const tx = this.idb.transaction(store, "readonly");
    return (await req(tx.objectStore(store).getAll())) as T[];
  }

  async allAds() {
    return this.getAll<AdRecord>("ads");
  }

  async allAdvertisers() {
    return this.getAll<AdvertiserRecord>("advertisers");
  }

  async favorites(): Promise<Map<string, Favorite>> {
    return new Map((await this.getAll<Favorite>("favorites")).map((f) => [f.adId, f]));
  }

  async log(limit = 20): Promise<LogEntry[]> {
    return (await this.getAll<LogEntry>("log")).slice(-limit).reverse();
  }

  async setFavorite(adId: string, on: boolean, note: string | null = null) {
    const tx = this.idb.transaction("favorites", "readwrite");
    if (on) tx.objectStore("favorites").put({ adId, note, createdAt: new Date().toISOString() } satisfies Favorite);
    else tx.objectStore("favorites").delete(adId);
    await done(tx);
  }

  async ingest(
    input: RawAd[],
    opts: {
      source: SourceKind;
      queryCountries?: string[];
      query?: string | null;
      /** Posición de cada anuncio (por ID) en una búsqueda ordenada por impresiones. */
      ranks?: Record<string, number>;
      context?: Record<string, unknown>;
      now?: Date;
    },
  ): Promise<LocalIngestResult> {
    const now = (opts.now ?? new Date()).toISOString();
    const batch = prepareBatch(input);
    const result: LocalIngestResult = { received: input.length, created: 0, updated: 0, skipped: batch.skipped, errors: batch.errors, ids: [] };
    const touched = new Set<string>();
    for (const ad of batch.ads) {
      const existing = await this.get<AdRecord>("ads", ad.id);
      const { record, weak } = mergeAd(existing, ad, {
        source: opts.source,
        queryCountries: opts.queryCountries,
        query: opts.query,
        rank: opts.ranks?.[ad.id] ?? null,
        now,
      });
      const advExisting = await this.get<AdvertiserRecord>("advertisers", ad.pageId);
      const adv = mergeAdvertiser(advExisting, ad, record, weak, now);
      const tx = this.idb.transaction(["ads", "advertisers"], "readwrite");
      tx.objectStore("ads").put(record);
      tx.objectStore("advertisers").put(adv);
      await done(tx);
      if (existing) result.updated++;
      else result.created++;
      result.ids.push(ad.id);
      touched.add(ad.pageId);
      if (existing && existing.pageId !== ad.pageId) touched.add(existing.pageId);
    }
    await this.recompute(Array.from(touched), opts.now);
    const tx = this.idb.transaction("log", "readwrite");
    tx.objectStore("log").add({
      source: opts.source,
      createdAt: now,
      received: result.received,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      context: opts.context ?? {},
    } satisfies LogEntry);
    await done(tx);
    return result;
  }

  async ingestExtensionPayload(p: ExtensionPayload) {
    if (!isAdLibraryUrl(p.pageUrl)) throw new Error("Solo se aceptan capturas hechas en facebook.com/ads/library.");
    const { ads, countries } = mapExtensionPayload(p);
    return this.ingest(ads, {
      source: "extension",
      queryCountries: countries,
      query: p.query?.q ?? null,
      ranks: p.query?.sort === "total_impressions" && p.ranks ? sanitizeRanks(p.ranks) : undefined,
      context: { q: p.query?.q ?? null, country: countries[0] ?? null },
    });
  }

  /** Recalcula puntuación y agregados de los anunciantes indicados (o de todos). */
  async recompute(pageIds?: string[], now = new Date()) {
    const ads = await this.allAds();
    const byPage = new Map<string, AdRecord[]>();
    for (const a of ads) byPage.set(a.pageId, [...(byPage.get(a.pageId) ?? []), a]);
    const targets = pageIds ?? Array.from(byPage.keys());
    for (const pageId of targets) {
      const list = byPage.get(pageId) ?? [];
      const tx = this.idb.transaction(["ads", "advertisers"], "readwrite");
      const advStore = tx.objectStore("advertisers");
      if (!list.length) {
        advStore.delete(pageId);
        await done(tx);
        continue;
      }
      const stats = computeAdvertiserStats(list, now);
      for (const a of list) {
        const s = stats.perAd.get(a.id);
        if (s) tx.objectStore("ads").put({ ...a, score: s.score, scoreBreakdown: s.signals });
      }
      const adv = (await req(advStore.get(pageId))) as AdvertiserRecord | undefined;
      if (adv) {
        advStore.put({ ...adv, totalAds: stats.totalAds, activeAds: stats.activeAds, landingCount: stats.landingCount, mainNiche: stats.mainNiche });
      }
      await done(tx);
    }
    return targets.length;
  }

  /**
   * Vuelve a calcular landing page y nicho (por reglas) de los anuncios ya
   * guardados, para aplicar mejoras de versiones nuevas sin recapturar.
   */
  async reindex() {
    const ads = await this.allAds();
    const advs = new Map((await this.allAdvertisers()).map((a) => [a.pageId, a]));
    const tx = this.idb.transaction("ads", "readwrite");
    for (const a of ads) {
      const landing = normalizeLanding(a.linkUrl, a.caption);
      const next: AdRecord = {
        ...a,
        body: cleanTemplate(a.body),
        title: cleanTemplate(a.title),
        linkDescription: cleanTemplate(a.linkDescription),
        landingKey: landing?.key ?? null,
        landingDomain: landing?.domain ?? null,
        linkUrl: landing?.url ?? null,
      };
      if (a.nicheSource !== "ai" && a.nicheSource !== "manual") {
        const r = classifyByRules({
          body: next.body,
          title: next.title,
          linkDescription: next.linkDescription,
          caption: landing?.domain ?? a.caption,
          pageName: a.pageName,
          categories: advs.get(a.pageId)?.categories,
        });
        next.niche = r.niche;
        next.nicheConfidence = r.confidence;
        next.nicheSource = r.niche ? "rules" : null;
        next.nicheTerms = r.terms;
      }
      tx.objectStore("ads").put(next);
    }
    await done(tx);
    await this.recompute();
    return ads.length;
  }

  /** Retención: borra anuncios no favoritos que no se ven hace más de `days` días. */
  async purge(days = RETENTION_DAYS, now = new Date()) {
    const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
    const favs = await this.favorites();
    const stale = (await this.allAds()).filter((a) => a.lastSeenAt < cutoff && !favs.has(a.id));
    if (!stale.length) return 0;
    const tx = this.idb.transaction("ads", "readwrite");
    for (const a of stale) tx.objectStore("ads").delete(a.id);
    await done(tx);
    await this.recompute(Array.from(new Set(stale.map((a) => a.pageId))), now);
    return stale.length;
  }

  async clear() {
    const tx = this.idb.transaction(["ads", "advertisers", "favorites", "log"], "readwrite");
    for (const s of ["ads", "advertisers", "favorites", "log"]) tx.objectStore(s).clear();
    await done(tx);
  }

  async exportAll(): Promise<ExportFile> {
    return {
      format: "cifra-radar",
      version: 1,
      exportedAt: new Date().toISOString(),
      ads: await this.allAds(),
      advertisers: await this.allAdvertisers(),
      favorites: Array.from((await this.favorites()).values()),
    };
  }

  /**
   * Importa un respaldo de Cifra Radar o una respuesta de la Ad Library API
   * ({ data: [...] }). Devuelve cuántos anuncios se cargaron.
   */
  async importFile(json: unknown, countries: string[] = []): Promise<{ kind: string; count: number }> {
    const obj = json as Record<string, unknown>;
    if (obj && obj.format === "cifra-radar" && Array.isArray(obj.ads)) {
      const tx = this.idb.transaction(["ads", "advertisers", "favorites"], "readwrite");
      for (const a of obj.ads as AdRecord[]) if (a && typeof a.id === "string" && typeof a.pageId === "string") tx.objectStore("ads").put(a);
      for (const a of (obj.advertisers as AdvertiserRecord[]) ?? []) if (a && typeof a.pageId === "string") tx.objectStore("advertisers").put(a);
      for (const f of (obj.favorites as Favorite[]) ?? []) if (f && typeof f.adId === "string") tx.objectStore("favorites").put(f);
      await done(tx);
      await this.recompute();
      return { kind: "Respaldo de Cifra Radar", count: (obj.ads as unknown[]).length };
    }
    const items: unknown[] = Array.isArray(json) ? json : Array.isArray(obj?.data) ? (obj.data as unknown[]) : Array.isArray(obj?.nodes) ? (obj.nodes as unknown[]) : [];
    const ads: RawAd[] = [];
    for (const it of items.slice(0, 5000)) {
      if (!it || typeof it !== "object") continue;
      const m =
        "ad_archive_id" in (it as object)
          ? mapLibraryNode(it, { countries })
          : mapArchivedAd(it as MetaArchivedAd, { countries });
      if (m) ads.push(m);
    }
    const r = await this.ingest(ads, { source: "import", queryCountries: countries, context: { kind: "archivo" } });
    return { kind: "Resultados de la Biblioteca / API", count: r.created + r.updated };
  }
}
