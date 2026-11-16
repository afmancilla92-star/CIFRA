const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const numFmt = new Intl.NumberFormat("es");

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

export function fmtNum(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : numFmt.format(n);
}

export function fmtDays(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "Hoy";
  return `${numFmt.format(n)} ${n === 1 ? "día" : "días"}`;
}

export function timeAgo(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "nunca";
  const diff = now.getTime() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "hace instantes";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

export const PLATFORM_LABELS: Record<string, { short: string; label: string }> = {
  facebook: { short: "FB", label: "Facebook" },
  instagram: { short: "IG", label: "Instagram" },
  messenger: { short: "MSG", label: "Messenger" },
  audience_network: { short: "AN", label: "Audience Network" },
  whatsapp: { short: "WA", label: "WhatsApp" },
  threads: { short: "TH", label: "Threads" },
};

export const FORMAT_LABELS: Record<string, string> = {
  image: "Imagen",
  video: "Video",
  carousel: "Carrusel",
  dco: "Dinámico",
  text: "Solo texto",
  unknown: "Sin creatividad",
};

export const SOURCE_LABELS: Record<string, string> = {
  meta_api: "API oficial",
  extension: "Extensión",
  import: "Importación",
  manual: "Carga manual",
};

export function libraryPageUrl(pageId: string) {
  return /^\d+$/.test(pageId)
    ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=${pageId}`
    : null;
}

export function qs(base: Record<string, string | number | boolean | undefined | null>, patch: Record<string, string | number | boolean | undefined | null> = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    p.set(k, v === true ? "1" : String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}
