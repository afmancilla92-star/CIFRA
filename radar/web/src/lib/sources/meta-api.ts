import { parseDateValue, toIsoDate } from "../dates";
import type { AdFormat, Platform, RawAd } from "../types";
import { EU_COUNTRIES } from "./countries";

/**
 * Conector de la Meta Ad Library API oficial (GET /{version}/ads_archive).
 *
 * Límites reales a tener en cuenta (no se asume acceso ilimitado):
 *  - Requiere un token de una app con acceso a la Ad Library API y
 *    verificación de identidad del titular.
 *  - Anuncios comerciales: solo los que llegaron a la UE. Fuera de la UE la
 *    API devuelve únicamente anuncios sobre temas sociales, elecciones o
 *    política. Para el resto de países se usa la extensión de Chrome.
 *  - La API no entrega imágenes ni videos, solo textos y un snapshot que
 *    contiene el token (no se guarda). La creatividad se completa con la extensión.
 *  - Límite de llamadas por hora: se respeta x-app-usage y los errores 4/17/613.
 */

export type MetaMediaType = "ALL" | "IMAGE" | "MEME" | "VIDEO" | "NONE";
export type MetaActiveStatus = "ACTIVE" | "ALL" | "INACTIVE";
export type MetaSearchType = "KEYWORD_UNORDERED" | "KEYWORD_EXACT_PHRASE";

export interface MetaQuery {
  searchTerms?: string | null;
  pageIds?: string[];
  countries: string[];
  languages?: string[];
  platforms?: string[];
  mediaType?: MetaMediaType;
  activeStatus?: MetaActiveStatus;
  searchType?: MetaSearchType;
  deliveryDateMin?: string | null;
}

export interface MetaArchivedAd {
  id: string;
  page_id?: string;
  page_name?: string;
  ad_creation_time?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_descriptions?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  ad_snapshot_url?: string;
  languages?: string[];
  publisher_platforms?: string[];
  eu_total_reach?: number | string;
}

export const META_FIELDS_BASE = [
  "id",
  "page_id",
  "page_name",
  "ad_creation_time",
  "ad_creative_bodies",
  "ad_creative_link_captions",
  "ad_creative_link_descriptions",
  "ad_creative_link_titles",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
  "languages",
  "publisher_platforms",
];
/** Campos que solo existen para anuncios en la UE; si la API los rechaza, se reintenta sin ellos. */
export const META_FIELDS_OPTIONAL = ["eu_total_reach"];

const PLATFORM_MAP: Record<string, Platform> = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  MESSENGER: "messenger",
  AUDIENCE_NETWORK: "audience_network",
  WHATSAPP: "whatsapp",
  THREADS: "threads",
};

export function mapPlatforms(list: unknown): Platform[] {
  if (!Array.isArray(list)) return [];
  const out = new Set<Platform>();
  for (const p of list) {
    const m = PLATFORM_MAP[String(p).toUpperCase()];
    if (m) out.add(m);
  }
  return Array.from(out);
}

const first = (list?: string[]) => (Array.isArray(list) ? (list.find((x) => typeof x === "string" && x.trim()) ?? null) : null);

/** Traduce un ArchivedAd de la API al modelo interno. */
export function mapArchivedAd(ad: MetaArchivedAd, ctx: { countries: string[]; activeStatus?: MetaActiveStatus; now?: Date }): RawAd | null {
  if (!ad || !ad.id || !ad.page_id) return null;
  const today = toIsoDate(ctx.now ?? new Date());
  const start = parseDateValue(ad.ad_delivery_start_time) ?? parseDateValue(ad.ad_creation_time);
  const stop = parseDateValue(ad.ad_delivery_stop_time);
  const isActive = ctx.activeStatus === "ACTIVE" ? true : !stop || stop >= today;
  const bodies = (ad.ad_creative_bodies ?? []).filter(Boolean);
  const titles = (ad.ad_creative_link_titles ?? []).filter(Boolean);
  // Varias versiones de texto en un mismo anuncio = creatividad dinámica.
  const format: AdFormat = bodies.length > 1 || titles.length > 1 ? "dco" : "unknown";
  const reach = ad.eu_total_reach === undefined ? null : Number(ad.eu_total_reach);
  return {
    id: String(ad.id),
    pageId: String(ad.page_id),
    pageName: ad.page_name?.trim() || "Anunciante sin nombre",
    isActive,
    startDate: start,
    stopDate: isActive ? null : stop,
    platforms: mapPlatforms(ad.publisher_platforms),
    languages: (ad.languages ?? []).map((l) => String(l).toLowerCase()),
    countries: ctx.countries.map((c) => c.toUpperCase()),
    body: first(bodies),
    title: first(titles),
    linkDescription: first(ad.ad_creative_link_descriptions),
    caption: first(ad.ad_creative_link_captions),
    ctaText: null,
    linkUrl: null, // la API no expone la URL de destino, solo el dominio visible (caption)
    format,
    media: [],
    collationId: null,
    collationCount: null,
    euTotalReach: reach !== null && Number.isFinite(reach) ? reach : null,
  };
}

export function apiCoverageWarning(countries: string[]): string | null {
  const outside = countries.filter((c) => !EU_COUNTRIES.has(c.toUpperCase()));
  if (!outside.length) return null;
  return `Fuera de la UE (${outside.join(", ")}) la API oficial solo devuelve anuncios sobre temas sociales, elecciones o política. Para anuncios comerciales de esos países usa la extensión de Chrome.`;
}

export function buildMetaUrl(q: MetaQuery, opts: { version: string; token: string; fields: string[]; limit?: number; after?: string | null }) {
  const p = new URLSearchParams();
  p.set("ad_type", "ALL");
  p.set("ad_reached_countries", JSON.stringify(q.countries.map((c) => c.toUpperCase())));
  p.set("ad_active_status", q.activeStatus ?? "ACTIVE");
  if (q.searchTerms?.trim()) {
    p.set("search_terms", q.searchTerms.trim().slice(0, 100));
    p.set("search_type", q.searchType ?? "KEYWORD_UNORDERED");
  }
  if (q.pageIds?.length) p.set("search_page_ids", JSON.stringify(q.pageIds.slice(0, 10)));
  if (q.languages?.length) p.set("languages", JSON.stringify(q.languages));
  if (q.platforms?.length) p.set("publisher_platforms", JSON.stringify(q.platforms.map((x) => x.toUpperCase())));
  if (q.mediaType && q.mediaType !== "ALL") p.set("media_type", q.mediaType);
  if (q.deliveryDateMin) p.set("ad_delivery_date_min", q.deliveryDateMin);
  p.set("fields", opts.fields.join(","));
  p.set("limit", String(opts.limit ?? 200));
  if (opts.after) p.set("after", opts.after);
  p.set("access_token", opts.token);
  return `https://graph.facebook.com/${opts.version}/ads_archive?${p.toString()}`;
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public kind: "auth" | "permission" | "rate_limit" | "invalid" | "network" | "unknown",
    public code?: number,
  ) {
    super(message);
  }
}

function classifyError(status: number, body: unknown): MetaApiError {
  const e = (body as { error?: { message?: string; code?: number; error_subcode?: number } })?.error;
  const code = e?.code;
  const raw = e?.message ?? `HTTP ${status}`;
  if (code === 190 || status === 401) return new MetaApiError("Token de Meta inválido o expirado. Genera uno nuevo y actualiza META_ACCESS_TOKEN.", "auth", code);
  if (code === 4 || code === 17 || code === 32 || code === 613 || status === 429)
    return new MetaApiError("Meta limitó temporalmente las consultas (rate limit). Se reintentará en la próxima ejecución.", "rate_limit", code);
  if (code === 10 || code === 200 || code === 2332004 || status === 403)
    return new MetaApiError(`La app no tiene permiso para la Ad Library API (${raw}). Revisa la verificación de identidad y el acceso de la app.`, "permission", code);
  if (code === 100) return new MetaApiError(`Parámetros rechazados por Meta: ${raw}`, "invalid", code);
  return new MetaApiError(`Error de Meta: ${raw}`, "unknown", code);
}

function usageTooHigh(headers: Headers): boolean {
  for (const name of ["x-app-usage", "x-ad-account-usage", "x-business-use-case-usage"]) {
    const v = headers.get(name);
    if (!v) continue;
    const nums = (v.match(/\d+(\.\d+)?/g) ?? []).map(Number);
    if (name === "x-app-usage" && nums.some((n) => n >= 90)) return true;
  }
  return false;
}

export interface MetaFetchResult {
  ads: RawAd[];
  pages: number;
  warnings: string[];
  stoppedEarly: boolean;
}

/** Ejecuta una búsqueda paginada respetando límites. Nunca registra el token. */
export async function fetchMetaAds(
  q: MetaQuery,
  opts: { token: string; version?: string; maxPages?: number; fetchImpl?: typeof fetch; now?: Date },
): Promise<MetaFetchResult> {
  const version = opts.version || "v26.0";
  const maxPages = Math.max(1, Math.min(20, opts.maxPages ?? 4));
  const doFetch = opts.fetchImpl ?? fetch;
  const warnings: string[] = [];
  const coverage = apiCoverageWarning(q.countries);
  if (coverage) warnings.push(coverage);
  if (!q.countries.length) throw new MetaApiError("Indica al menos un país (ad_reached_countries es obligatorio).", "invalid");
  if (!q.searchTerms?.trim() && !q.pageIds?.length) throw new MetaApiError("Indica palabras clave o IDs de página.", "invalid");

  let fields = [...META_FIELDS_BASE, ...META_FIELDS_OPTIONAL];
  const ads: RawAd[] = [];
  let after: string | null = null;
  let pages = 0;
  let stoppedEarly = false;

  while (pages < maxPages) {
    const url = buildMetaUrl(q, { version, token: opts.token, fields, after });
    let res: Response;
    try {
      res = await doFetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    } catch (err) {
      throw new MetaApiError(`No se pudo conectar con graph.facebook.com: ${(err as Error).message}`, "network");
    }
    const body = (await res.json().catch(() => ({}))) as {
      data?: MetaArchivedAd[];
      paging?: { cursors?: { after?: string }; next?: string };
    };
    if (!res.ok) {
      const err = classifyError(res.status, body);
      // Campos opcionales no disponibles para esta consulta: reintenta sin ellos.
      if (err.kind === "invalid" && fields.length > META_FIELDS_BASE.length) {
        fields = [...META_FIELDS_BASE];
        continue;
      }
      if (err.kind === "rate_limit" && ads.length) {
        warnings.push(err.message);
        stoppedEarly = true;
        break;
      }
      throw err;
    }
    pages++;
    for (const item of body.data ?? []) {
      const mapped = mapArchivedAd(item, { countries: q.countries, activeStatus: q.activeStatus, now: opts.now });
      if (mapped) ads.push(mapped);
    }
    after = body.paging?.next ? (body.paging?.cursors?.after ?? null) : null;
    if (!after) break;
    if (usageTooHigh(res.headers)) {
      warnings.push("Uso de la API cercano al límite por hora; se detuvo la paginación para no exceder la cuota.");
      stoppedEarly = true;
      break;
    }
  }
  return { ads, pages, warnings, stoppedEarly };
}
