import { parseDateValue, parseLibraryDateText } from "../dates";
import { unwrapRedirect } from "../landing";
import type { AdFormat, MediaItem, RawAd } from "../types";
import { mapPlatforms } from "./meta-api";

/**
 * Traduce lo que la extensión observó en la página de la Biblioteca de
 * Anuncios (la misma información que el navegador del usuario ya recibió)
 * al modelo interno. La traducción vive en el servidor para poder ajustarla
 * si Meta cambia el formato, sin publicar una nueva versión de la extensión.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function textOf(v: unknown): string | null {
  if (typeof v === "string") return str(v);
  if (isObj(v)) {
    if (typeof v.text === "string") return str(v.text);
    const markup = v.markup;
    if (isObj(markup) && typeof markup.__html === "string") return str(stripHtml(markup.__html));
  }
  return null;
}

/** Plantillas de catálogo sin resolver ({{product.name}}) no aportan texto real. */
const cleanTemplate = (s: string | null) => (s && /^\{\{[^}]+\}\}$/.test(s) ? null : s);

function collectMedia(snapshot: Obj): MediaItem[] {
  const out: MediaItem[] = [];
  const seen = new Set<string>();
  const push = (m: MediaItem | null) => {
    if (!m || !/^https:\/\//.test(m.url) || seen.has(m.url)) return;
    seen.add(m.url);
    out.push(m);
  };
  const fromVideo = (v: Obj): MediaItem | null => {
    const url = str(v.video_hd_url) ?? str(v.video_sd_url) ?? str(v.watermarked_video_hd_url) ?? str(v.watermarked_video_sd_url);
    return url ? { type: "video", url, preview: str(v.video_preview_image_url) } : null;
  };
  const fromImage = (v: Obj): MediaItem | null => {
    const url = str(v.original_image_url) ?? str(v.resized_image_url) ?? str(v.watermarked_resized_image_url);
    return url ? { type: "image", url, preview: str(v.resized_image_url) } : null;
  };
  for (const key of ["videos", "extra_videos"]) {
    const list = snapshot[key];
    if (Array.isArray(list)) list.filter(isObj).forEach((v) => push(fromVideo(v)));
  }
  for (const key of ["images", "extra_images"]) {
    const list = snapshot[key];
    if (Array.isArray(list)) list.filter(isObj).forEach((v) => push(fromImage(v)));
  }
  const cards = snapshot.cards;
  if (Array.isArray(cards)) {
    for (const c of cards.filter(isObj)) push(fromVideo(c) ?? fromImage(c));
  }
  return out.slice(0, 12);
}

const FORMAT_MAP: Record<string, AdFormat> = {
  IMAGE: "image",
  VIDEO: "video",
  CAROUSEL: "carousel",
  MULTI_IMAGES: "carousel",
  MULTI_VIDEOS: "carousel",
  MULTI_MEDIUM: "carousel",
  DPA: "carousel",
  DCO: "dco",
  TEXT: "text",
};

export interface LibraryContext {
  countries: string[];
  /** Si el usuario está en la vista de un anunciante (view_all_page_id). */
  pageId?: string | null;
}

/** Nodo de resultados de la Biblioteca (objeto que contiene ad_archive_id). */
export function mapLibraryNode(node: unknown, ctx: LibraryContext): RawAd | null {
  if (!isObj(node)) return null;
  const id = str(node.ad_archive_id) ?? (num(node.ad_archive_id) !== null ? String(node.ad_archive_id) : null);
  if (!id) return null;
  const snapshot = isObj(node.snapshot) ? node.snapshot : {};
  const pageId = str(node.page_id) ?? (num(node.page_id) !== null ? String(node.page_id) : null) ?? str(snapshot.page_id) ?? ctx.pageId ?? null;
  const pageName = str(node.page_name) ?? str(snapshot.page_name);
  if (!pageId || !pageName) return null;

  const cards = Array.isArray(snapshot.cards) ? snapshot.cards.filter(isObj) : [];
  const firstCard = cards[0] ?? {};
  const body = cleanTemplate(textOf(snapshot.body)) ?? cleanTemplate(textOf(firstCard.body));
  const title = cleanTemplate(str(snapshot.title)) ?? cleanTemplate(str(firstCard.title));
  const linkUrlRaw = str(snapshot.link_url) ?? str(firstCard.link_url);
  const media = collectMedia(snapshot);
  const displayFormat = str(snapshot.display_format)?.toUpperCase() ?? "";
  let format: AdFormat = FORMAT_MAP[displayFormat] ?? "unknown";
  if (format === "unknown") format = media.length > 1 ? "carousel" : media[0]?.type ?? (body ? "text" : "unknown");

  const isActive = typeof node.is_active === "boolean" ? node.is_active : null;
  const categories = Array.isArray(snapshot.page_categories)
    ? snapshot.page_categories.map((c) => (isObj(c) ? str(c.name) : str(c))).filter((c): c is string => Boolean(c))
    : [];
  const reached = Array.isArray(node.reached_countries) ? node.reached_countries.map(String) : [];

  return {
    id,
    pageId,
    pageName,
    isActive,
    startDate: parseDateValue(node.start_date),
    stopDate: isActive ? null : parseDateValue(node.end_date),
    platforms: mapPlatforms(node.publisher_platform ?? node.publisher_platforms),
    languages: [],
    countries: reached.length ? reached : ctx.countries,
    body,
    title,
    linkDescription: cleanTemplate(str(snapshot.link_description)) ?? cleanTemplate(str(firstCard.link_description)),
    caption: str(snapshot.caption) ?? str(firstCard.caption),
    ctaText: str(snapshot.cta_text) ?? str(firstCard.cta_text),
    linkUrl: linkUrlRaw ? unwrapRedirect(linkUrlRaw) : null,
    format,
    media,
    collationId: str(node.collation_id) ?? (num(node.collation_id) !== null ? String(node.collation_id) : null),
    collationCount: num(node.collation_count),
    euTotalReach: null,
    advertiser: {
      pageUrl: str(snapshot.page_profile_uri),
      avatarUrl: str(snapshot.page_profile_picture_url),
      likes: num(snapshot.page_like_count),
      categories,
    },
  };
}

export interface DomCard {
  libraryId: string;
  text: string;
  images?: string[];
  videos?: Array<{ src: string; poster?: string | null }>;
  links?: string[];
  pageName?: string | null;
  pageUrl?: string | null;
}

const STATUS_ACTIVE = /^(activo|active|ativo|attivo|actif)$/i;
const STATUS_INACTIVE = /^(inactivo|inactive|inativo|non attivo|inactif)$/i;
const SPONSORED = /^(patrocinado|sponsored|sponsorisé|sponsorizzato|gesponsert)$/i;
const NOISE = /^(identificador de la biblioteca|library id|id da biblioteca|plataformas|platforms|ver detalles del anuncio|see ad details|ver detalhes do anúncio|ver resumen|see summary details|abrir menú desplegable|open drop-down menu|este anuncio tiene varias versiones|this ad has multiple versions)/i;

/**
 * Lectura de respaldo desde el texto visible de una tarjeta. Se marca como
 * parcial: no reemplaza datos completos y no incluye plataformas.
 */
export function mapDomCard(card: DomCard, ctx: LibraryContext): RawAd | null {
  if (!card || !/^\d{6,25}$/.test(card.libraryId ?? "")) return null;
  const lines = (card.text ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 80);

  let isActive: boolean | null = null;
  let startDate: string | null = null;
  let stopDate: string | null = null;
  let collationCount: number | null = null;
  let sponsoredIdx = -1;
  lines.forEach((line, i) => {
    if (STATUS_ACTIVE.test(line)) isActive = true;
    else if (STATUS_INACTIVE.test(line)) isActive = false;
    if (SPONSORED.test(line) && sponsoredIdx < 0) sponsoredIdx = i;
    const coll = line.match(/^(\d+)\s+(anuncios|ads|anúncios)\b/i);
    if (coll) collationCount = Number(coll[1]);
    if (!startDate && /\d{4}/.test(line) && !/^\d+$/.test(line)) {
      const parts = line.split(/\s[-–]\s/);
      const s = parseLibraryDateText(parts[0] ?? line);
      if (s) {
        startDate = s;
        if (parts[1]) stopDate = parseLibraryDateText(parts[1]);
      }
    }
  });

  const pageName = card.pageName?.trim() || (sponsoredIdx > 0 ? lines[sponsoredIdx - 1] : null) || null;
  const bodyLines =
    sponsoredIdx >= 0
      ? lines.slice(sponsoredIdx + 1).filter((l) => !NOISE.test(l) && !STATUS_ACTIVE.test(l) && !STATUS_INACTIVE.test(l))
      : [];
  // El dominio visible suele aparecer en mayúsculas (TIENDA.COM) después del texto.
  const captionIdx = bodyLines.findIndex((l) => /^[A-Z0-9-]+(\.[A-Z0-9-]+)+$/.test(l));
  const body = (captionIdx >= 0 ? bodyLines.slice(0, captionIdx) : bodyLines.slice(0, 6)).join("\n").slice(0, 3000) || null;
  const caption = captionIdx >= 0 ? (bodyLines[captionIdx] ?? null) : null;
  const title = captionIdx >= 0 ? (bodyLines[captionIdx + 1] ?? null) : null;
  const ctaText = captionIdx >= 0 ? (bodyLines[captionIdx + 3] ?? bodyLines[captionIdx + 2] ?? null) : null;

  const outbound = (card.links ?? []).map((l) => unwrapRedirect(l)).find((l) => /^https?:\/\//.test(l) && !/facebook\.com|instagram\.com|fbcdn\.net/.test(l)) ?? null;

  const media: MediaItem[] = [
    ...(card.videos ?? []).filter((v) => /^https:\/\//.test(v.src)).map((v) => ({ type: "video" as const, url: v.src, preview: v.poster ?? null })),
    ...(card.images ?? []).filter((src) => /^https:\/\//.test(src)).map((src) => ({ type: "image" as const, url: src })),
  ].slice(0, 8);

  const pageId = ctx.pageId ?? (pageName ? `nombre:${pageName.toLowerCase().replace(/\s+/g, "-").slice(0, 50)}` : null);
  if (!pageId || !pageName) return null;
  const active: boolean | null = isActive;

  return {
    id: card.libraryId,
    pageId,
    pageName,
    isActive: active,
    startDate,
    stopDate: active ? null : stopDate,
    platforms: [],
    languages: [],
    countries: ctx.countries,
    body,
    title,
    linkDescription: null,
    caption,
    ctaText,
    linkUrl: outbound,
    format: media.length > 1 ? "carousel" : (media[0]?.type ?? "unknown"),
    media,
    collationId: null,
    collationCount,
    euTotalReach: null,
    advertiser: { pageUrl: card.pageUrl ?? null },
    partial: true,
  };
}
