/**
 * Radar local (página de la extensión: app.html), organizado como un buscador
 * de anuncios: Descubrir, Anunciantes, Siguiendo, Buscar, Studio y Favoritos.
 * Todo el texto de los anuncios se inserta como texto (nunca como HTML).
 */
import { daysActive } from "../lib/dates";
import { fmtDate, fmtDays, fmtNum, FORMAT_LABELS, PLATFORM_LABELS, timeAgo } from "../lib/format";
import { landingKind } from "../lib/landing";
import { LANGUAGE_NAMES } from "../lib/lang";
import type { AdRecord, AdvertiserRecord } from "../lib/merge";
import { NICHE_BY_ID, NICHES, nicheLabel } from "../lib/niche/catalog";
import { SCORE_DISCLAIMER, scoreTier } from "../lib/scoring";
import { countryName } from "../lib/sources/countries";
import { normalizeText, truncate } from "../lib/text";
import type { Platform } from "../lib/types";
import {
  adLibraryUrl,
  advertiserLibraryUrl,
  blockedMessage,
  DEFAULT_QUERIES,
  DISCOVERY_COUNTRIES,
  librarySearchUrl,
  MAX_PER_HOUR,
  parseAdId,
  runJob,
  runQueue,
  searchesLeft,
  type DiscoveryProgress,
  type QueueItem,
  type SearchOptions,
} from "./discovery";
import { LocalStore, RETENTION_DAYS, type Favorite, type Follow, type LogEntry } from "./store";
import { studioView } from "./studio";
import { chip, h, icon, platformBadge, type Child } from "./ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

type Dest = "web" | "messaging" | "social" | "app_store" | "none";

export interface View extends AdRecord {
  days: number | null;
  fav: boolean;
  /** Anuncios activos del anunciante en tu radar. */
  advActive: number;
  /** Tamaño del anunciante: activos según la Biblioteca o, si no se conoce, los de tu radar. */
  advSize: number;
  avatar: string | null;
  search: string;
  nicheList: string[];
  dest: Dest;
  /** Anuncios que usan esta misma creatividad (Meta los agrupa como copias). */
  copies: number;
  /** Versiones distintas del anunciante hacia el mismo destino. */
  variantsCount: number;
}

type Screen = "discover" | "advertisers" | "advertiser" | "following" | "search" | "studio" | "favorites" | "data";

const EMPTY_FILTERS = {
  q: "",
  niche: "",
  days: "",
  platform: "",
  dest: "",
  country: "",
  format: "",
  size: "",
  status: "active",
  query: "",
  landing: "",
  pageId: "",
  sort: "scaling",
  group: false as boolean,
};
type Filters = typeof EMPTY_FILTERS;
type FilterKey = Exclude<keyof Filters, "group">;

const state = {
  store: null as LocalStore | null,
  ads: [] as View[],
  byId: new Map<string, View>(),
  advertisers: new Map<string, AdvertiserRecord>(),
  favorites: new Map<string, Favorite>(),
  follows: new Map<string, Follow>(),
  log: [] as LogEntry[],
  screen: "discover" as Screen,
  pageId: "",
  advSeenBefore: null as string | null,
  f: { ...EMPTY_FILTERS },
  limit: 60,
  expanded: new Set<string>(),
  collapsed: new Set<string>(),
  showFilters: false,
  adv: { q: "", niche: "", sort: "scaling", limit: 48 },
  search: {
    q: "",
    country: "ALL",
    sort: "total_impressions" as NonNullable<SearchOptions["sort"]>,
    status: "active" as NonNullable<SearchOptions["status"]>,
    media: "all" as NonNullable<SearchOptions["media"]>,
    platform: "",
    language: "",
    size: "",
    running: false,
    message: "",
    shown: "",
  },
  radar: { country: "ALL", queries: DEFAULT_QUERIES.join("\n") },
  update: null as DiscoveryProgress | null,
  notice: "",
  cancel: false,
  searchLeft: MAX_PER_HOUR,
  lastUpdate: null as string | null,
  addUrl: { value: "", running: false, message: "" },
};

const busy = () => Boolean(state.update?.running || state.search.running || state.addUrl.running);
const queryKey = (q: string) => q.trim().toLowerCase().slice(0, 80);
const compact = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });

function destOf(a: AdRecord): Dest {
  if (a.landingDomain) return landingKind(a.landingDomain);
  if (a.ctaText && /whatsapp|mensaje|message|messenger|chat/i.test(a.ctaText)) return "messaging";
  return "none";
}

async function load() {
  const store = state.store!;
  const [ads, advs, favs, follows, log] = await Promise.all([store.allAds(), store.allAdvertisers(), store.favorites(), store.follows(), store.log(30)]);
  state.advertisers = new Map(advs.map((a) => [a.pageId, a]));
  state.favorites = favs;
  state.follows = follows;
  state.log = log;
  // Variantes: anuncios distintos del mismo anunciante hacia el mismo destino.
  const groups = new Map<string, number>();
  for (const a of ads) if (a.landingKey) groups.set(`${a.pageId}|${a.landingKey}`, (groups.get(`${a.pageId}|${a.landingKey}`) ?? 0) + 1);
  state.ads = ads.map((a) => {
    const adv = state.advertisers.get(a.pageId);
    const nicheList = a.niches?.length ? a.niches : a.niche ? [a.niche] : [];
    return {
      ...a,
      days: daysActive(a.startDate, { isActive: a.isActive, stopDate: a.stopDate, lastSeenAt: a.lastSeenAt }),
      fav: favs.has(a.id),
      advActive: adv?.activeAds ?? 0,
      advSize: adv?.metaActiveCount ?? adv?.activeAds ?? 0,
      avatar: adv?.avatarUrl ?? null,
      nicheList,
      dest: destOf(a),
      copies: Math.max(1, a.collationCount ?? 1),
      variantsCount: Math.max(1, a.variants ?? 1, a.landingKey ? (groups.get(`${a.pageId}|${a.landingKey}`) ?? 1) : 1),
      search: normalizeText([a.pageName, a.title, a.body, a.linkDescription, a.caption, a.landingKey].filter(Boolean).join(" ")),
    };
  });
  state.byId = new Map(state.ads.map((a) => [a.id, a]));
  render();
}

// ── Orden y filtros ────────────────────────────────────────────────────────

const SORTS: Record<string, { label: string; fn: (a: View, b: View) => number }> = {
  scaling: { label: "Escalando", fn: (a, b) => b.score - a.score || b.copies - a.copies || (b.days ?? -1) - (a.days ?? -1) },
  copies: { label: "Más duplicados", fn: (a, b) => b.copies - a.copies || b.score - a.score },
  views: { label: "Más vistos", fn: (a, b) => (a.impressionRank ?? 1e9) - (b.impressionRank ?? 1e9) || b.score - a.score },
  recent: { label: "Más recientes", fn: (a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "") || b.score - a.score },
  longest: { label: "Más días activo", fn: (a, b) => (b.days ?? -1) - (a.days ?? -1) || b.score - a.score },
  variants: { label: "Más variantes", fn: (a, b) => b.variantsCount - a.variantsCount || b.score - a.score },
};
const sortFn = (key: string) => (SORTS[key] ?? SORTS.scaling!).fn;

const DAY_OPTIONS: Array<[string, string]> = [
  ["new", "Nuevos (7 días o menos)"],
  ["7", "7+ días"],
  ["30", "30+ días"],
  ["60", "60+ días"],
  ["90", "90+ días"],
  ["180", "180+ días"],
];
const DEST_LABELS: Record<Dest, string> = {
  web: "Sitio web",
  messaging: "WhatsApp o mensajes",
  social: "Redes sociales",
  app_store: "Tienda de apps",
  none: "Sin destino visible",
};
const SIZES: Array<{ id: string; label: string; min: number; max: number }> = [
  { id: "s", label: "Pequeño (1–4 activos)", min: 0, max: 4 },
  { id: "m", label: "Mediano (5–19)", min: 5, max: 19 },
  { id: "l", label: "Grande (20–99)", min: 20, max: 99 },
  { id: "xl", label: "Muy grande (100+)", min: 100, max: Infinity },
];
const sizeOf = (n: number) => SIZES.find((s) => n >= s.min && n <= s.max)?.id ?? "s";
const STATUS_OPTIONS: Array<[string, string]> = [
  ["active", "Activos"],
  ["inactive", "Inactivos"],
  ["all", "Todos"],
];

function filterAds(f: Filters, skip?: FilterKey, base: View[] = state.ads): View[] {
  const terms = normalizeText(f.q).split(" ").filter((t) => t.length >= 2);
  const minDays = Number(f.days) || 0;
  return base.filter((a) => {
    if (a.isManual) return false;
    if (skip !== "status" && f.status === "active" && !a.isActive) return false;
    if (skip !== "status" && f.status === "inactive" && a.isActive) return false;
    if (skip !== "niche" && f.niche && (f.niche === "none" ? a.nicheList.length > 0 : !a.nicheList.includes(f.niche))) return false;
    if (skip !== "days" && f.days && (f.days === "new" ? (a.days ?? 999) > 7 : (a.days ?? 0) < minDays)) return false;
    if (skip !== "platform" && f.platform && !a.platforms.includes(f.platform as Platform)) return false;
    if (skip !== "dest" && f.dest && a.dest !== f.dest) return false;
    if (skip !== "country" && f.country && !a.countries.includes(f.country)) return false;
    if (skip !== "format" && f.format && a.format !== f.format) return false;
    if (skip !== "size" && f.size && sizeOf(a.advSize) !== f.size) return false;
    if (f.pageId && a.pageId !== f.pageId) return false;
    if (f.landing && a.landingKey !== f.landing) return false;
    if (f.query && !(a.queries ?? []).includes(f.query)) return false;
    return terms.every((t) => a.search.includes(t));
  });
}

function countBy<T>(list: T[], key: (a: T) => string | string[] | null | undefined) {
  const m = new Map<string, number>();
  for (const a of list) {
    const k = key(a);
    for (const v of Array.isArray(k) ? k : [k]) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

function setFilter(key: FilterKey, value: string) {
  state.f = { ...state.f, [key]: value };
  state.limit = 60;
  render();
}

function filterBy(patch: Partial<Filters>) {
  const scoped = Boolean(patch.pageId || patch.landing || patch.query);
  state.f = { ...EMPTY_FILTERS, sort: state.f.sort, ...patch, status: patch.status ?? (scoped ? "all" : "active") };
  go("discover");
}

function go(screen: Screen) {
  state.screen = screen;
  state.limit = 60;
  closeDetail();
  render();
  window.scrollTo({ top: 0 });
}

// ── Componentes ────────────────────────────────────────────────────────────

function avatar(name: string, url: string | null, size = 32) {
  const letter = () =>
    h("span", { class: "avatar avatar-letter", style: `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px` }, name.trim().charAt(0).toUpperCase() || "?");
  if (!url) return letter();
  const img = h("img", { class: "avatar", src: url, alt: "", width: size, height: size, referrerpolicy: "no-referrer", style: `width:${size}px;height:${size}px` });
  img.addEventListener("error", () => img.replaceWith(letter()));
  return img;
}

function scoreBadge(score: number, big = false) {
  const tier = scoreTier(score);
  return h("span", { class: `score score-${tier.tone}${big ? " score-big" : ""}`, title: `Puntuación orientativa (señales observables): ${tier.label}` }, String(score), h("small", null, "/100"));
}

function placeholder(expired: boolean) {
  return h(
    "div",
    { class: "thumb thumb-empty" },
    icon(expired ? "play" : "cube", 22),
    h("span", null, expired ? "La vista previa expiró. Ábrela en la Biblioteca." : "Creatividad disponible en la Biblioteca"),
  );
}

/** Miniatura de un video cuyo archivo ya expiró (Meta hace caducar los enlaces). */
function previewImage(src: string) {
  const box = h(
    "div",
    { class: "thumb" },
    h("img", { src, alt: "", referrerpolicy: "no-referrer" }),
    h("span", { class: "thumb-count" }, "El video expiró: ábrelo en la Biblioteca"),
  );
  box.querySelector("img")!.addEventListener("error", () => box.replaceWith(placeholder(true)));
  return box;
}

/** Creatividad del anuncio. En las tarjetas, el video se reproduce al pulsar ▶. */
function media(ad: View) {
  const first = ad.media[0];
  if (!first) return placeholder(false);
  const wrap = h("div", { class: "thumb" });
  const playVideo = () => {
    const v = h("video", { src: first.url, poster: first.preview ?? undefined, controls: true, autoplay: true, playsinline: true });
    v.addEventListener("click", (e) => e.stopPropagation());
    v.addEventListener("error", () => wrap.replaceWith(first.preview ? previewImage(first.preview) : placeholder(true)));
    wrap.replaceChildren(v);
  };
  const src = first.type === "video" ? first.preview : first.url;
  if (src) {
    const img = h("img", { src, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
    img.addEventListener("error", () => wrap.replaceWith(placeholder(true)));
    wrap.append(img);
  } else if (first.type === "video") {
    const v = h("video", { src: first.url, preload: "metadata", muted: true, playsinline: true });
    v.addEventListener("error", () => wrap.replaceWith(placeholder(true)));
    wrap.append(v);
  }
  if (first.type === "video") {
    wrap.append(h("button", { class: "play", "aria-label": "Reproducir video", onclick: (e: Event) => { e.stopPropagation(); playVideo(); } }, icon("play", 20)));
  }
  if (ad.media.length > 1) wrap.append(h("span", { class: "thumb-count" }, `1/${ad.media.length}`));
  return wrap;
}

async function toggleFavorite(ad: View) {
  await state.store!.setFavorite(ad.id, !ad.fav);
  await load();
  if (document.querySelector(".modal")) openDetail(ad.id);
}

function favButton(ad: View, overlay = true) {
  return h(
    "button",
    {
      class: overlay ? `fav-overlay${ad.fav ? " on" : ""}` : `btn${ad.fav ? " fav-on" : ""}`,
      title: ad.fav ? "Quitar de favoritos" : "Guardar en favoritos",
      "aria-pressed": String(ad.fav),
      onclick: (e: Event) => {
        e.stopPropagation();
        void toggleFavorite(ad);
      },
    },
    icon("heart", overlay ? 16 : 15),
    overlay ? null : ad.fav ? "En favoritos" : "Guardar",
  );
}

function domainLink(ad: View) {
  if (ad.dest === "messaging") return h("small", { class: "muted" }, ad.landingDomain?.includes("whatsapp") || ad.landingDomain === "wa.me" ? "WhatsApp" : "Mensajes");
  if (!ad.landingDomain) return h("small", { class: "muted" }, `${fmtNum(ad.advActive)} ${ad.advActive === 1 ? "anuncio activo" : "anuncios activos"}`);
  const href = ad.linkUrl ?? `https://${ad.landingDomain}`;
  return h(
    "a",
    { class: "domain", href, target: "_blank", rel: "noopener noreferrer nofollow", onclick: (e: Event) => e.stopPropagation(), title: href },
    ad.landingDomain.replace(/^www\./, ""),
    icon("ext", 11),
  );
}

function statsRow(ad: View) {
  const hot = ad.copies >= 10;
  return h(
    "div",
    { class: "stats3" },
    h("div", { class: "sbox" }, h("b", null, ad.days === null ? "—" : fmtNum(ad.days)), h("small", null, ad.days === 1 ? "día activo" : "días activo")),
    h(
      "div",
      { class: `sbox${ad.copies > 1 ? " copies" : ""}${hot ? " fire" : ""}`, title: "Anuncios que usan esta misma creatividad (Meta los agrupa como copias)" },
      h("b", null, hot ? "🔥 " : "", fmtNum(ad.copies)),
      h("small", null, ad.copies === 1 ? "copia" : "copias"),
    ),
    h(
      "div",
      { class: `sbox${ad.variantsCount > 1 ? " variants" : ""}`, title: "Anuncios distintos del mismo anunciante hacia el mismo destino" },
      h("b", null, fmtNum(ad.variantsCount)),
      h("small", null, ad.variantsCount === 1 ? "variante" : "variantes"),
    ),
  );
}

function adChips(ad: View) {
  return h(
    "div",
    { class: "chips" },
    ad.price ? chip(ad.price.text, "chip-price") : null,
    ad.impressionRank && ad.impressionRank <= 30 ? chip(`Top #${ad.impressionRank} vistos`, "chip-hot") : null,
    ad.nicheList[0] ? chip(nicheLabel(ad.nicheList[0]), "chip-accent") : null,
    ad.partial ? chip("Parcial", "chip-warn") : null,
  );
}

function card(ad: View, extra = "") {
  const cls = ["card", "ad-card", ad.copies > 1 ? "stacked" : "", ad.copies >= 10 ? "hot" : "", extra].filter(Boolean).join(" ");
  return h(
    "article",
    { class: cls, onclick: () => openDetail(ad.id) },
    h(
      "div",
      { class: "ad-top" },
      avatar(ad.pageName, ad.avatar, 30),
      h(
        "div",
        { class: "ad-top-text" },
        h("button", { class: "name-link", onclick: (e: Event) => { e.stopPropagation(); openAdvertiser(ad.pageId); } }, ad.pageName),
        domainLink(ad),
      ),
      extra.includes("is-new") ? chip("Nuevo", "chip-new") : null,
    ),
    h(
      "div",
      { class: "media-wrap" },
      media(ad),
      h("span", { class: `status-badge${ad.isActive ? "" : " off"}` }, ad.isActive ? "● Activo" : "Inactivo"),
      favButton(ad),
    ),
    h(
      "div",
      { class: "ad-info" },
      h(
        "div",
        { class: "pf-row" },
        ad.platforms.slice(0, 5).map((p) => platformBadge(p, PLATFORM_LABELS[p]?.label ?? p)),
        h("span", { class: "fmt" }, FORMAT_LABELS[ad.format] ?? ad.format),
        ad.startDate ? h("span", { class: "since" }, `desde ${fmtDate(ad.startDate)}`) : null,
      ),
      h("p", { class: "ad-text" }, truncate(ad.body || ad.title || ad.linkDescription || "Sin texto disponible.", 220)),
      adChips(ad),
      statsRow(ad),
      h("div", { class: "ad-foot" }, h("span", { class: "details-link" }, "Ver detalles", icon("chevron", 13)), scoreBadge(ad.score)),
    ),
  );
}

function landingGroupCard(group: View[]) {
  const rep = group[0]!;
  const advs = new Set(group.map((a) => a.pageId)).size;
  return h(
    "div",
    { class: "group" },
    h(
      "button",
      { class: "group-ribbon", onclick: () => filterBy({ landing: rep.landingKey! }), title: rep.landingKey ?? "" },
      icon("branch", 13),
      h("span", null, advs > 1 ? `${group.length} anuncios de ${advs} marcas en esta landing` : `${group.length} anuncios en esta landing`),
      icon("chevron", 13),
    ),
    card(rep, "in-group"),
  );
}

function opt(label: Child, n: number | null, on: boolean, onClick: () => void) {
  return h(
    "button",
    { class: `opt${on ? " on" : ""}${n === 0 ? " zero" : ""}`, onclick: onClick, "aria-pressed": String(on) },
    h("span", { class: "opt-label" }, label),
    n !== null ? h("span", { class: "opt-n" }, fmtNum(n)) : null,
  );
}

/** Sección plegable de la barra lateral (radio de opciones con conteos). */
function sideSection(
  id: string,
  title: string,
  current: string,
  options: Array<[string, string, number]>,
  set: (v: string) => void,
  o: { limit?: number; allLabel?: string | null; allCount?: number | null; note?: string } = {},
) {
  const limit = o.limit ?? 8;
  const expanded = state.expanded.has(id);
  const visible = expanded || options.length <= limit + 1 ? options : options.slice(0, limit);
  const curLabel = options.find((x) => x[0] === current)?.[1];
  const box = h(
    "details",
    { class: "side", open: !state.collapsed.has(id) },
    h("summary", null, h("span", null, title), current && curLabel ? h("span", { class: "side-value" }, curLabel) : null),
    h(
      "div",
      { class: "opts" },
      o.allLabel === null ? null : opt(o.allLabel ?? "Todos", o.allCount ?? null, current === "", () => set("")),
      visible.map(([v, label, n]) => opt(label, n, current === v, () => set(current === v && o.allLabel !== null ? "" : v))),
      visible.length < options.length || expanded
        ? h(
            "button",
            {
              class: "more-link",
              onclick: () => {
                if (expanded) state.expanded.delete(id);
                else state.expanded.add(id);
                render();
              },
            },
            expanded ? "Ver menos" : `Ver más (${options.length - visible.length})`,
          )
        : null,
      o.note ? h("small", { class: "side-note" }, o.note) : null,
    ),
  );
  box.addEventListener("toggle", () => {
    if ((box as HTMLDetailsElement).open) state.collapsed.delete(id);
    else state.collapsed.add(id);
  });
  return box;
}

function nicheOptions(counts: Map<string, number>, total: number): Array<[string, string, number]> {
  const list: Array<[string, string, number]> = NICHES.map((n) => [n.id, n.label, counts.get(n.id) ?? 0]);
  list.sort((a, b) => b[2] - a[2]);
  void total;
  return list;
}

function selectEl(value: string, options: Array<[string, string]>, onChange: (v: string) => void, attrs: Record<string, string> = {}) {
  const s = h("select", attrs, options.map(([v, l]) => h("option", { value: v, selected: v === value }, l))) as HTMLSelectElement;
  s.value = value;
  s.addEventListener("change", () => onChange(s.value));
  return s;
}

function field(label: string, control: HTMLElement) {
  return h("label", { class: "field" }, h("span", null, label), control);
}

function sortPills(current: string, set: (k: string) => void, sorts: Record<string, { label: string }> = SORTS) {
  return h(
    "div",
    { class: "pills", role: "tablist", "aria-label": "Ordenar" },
    icon("sort", 14),
    Object.entries(sorts).map(([k, s]) =>
      h("button", { class: `pill${current === k ? " on" : ""}`, role: "tab", "aria-selected": String(current === k), onclick: () => set(k) }, k === "copies" ? "🔥 " : "", s.label),
    ),
  );
}

function searchInput(key: string, value: string, placeholderText: string, onInput: (v: string) => void, onEnter?: (v: string) => void) {
  const input = h("input", { type: "search", class: "search", placeholder: placeholderText, value, "data-key": key, "aria-label": placeholderText }) as HTMLInputElement;
  input.addEventListener("input", () => onInput(input.value));
  if (onEnter) input.addEventListener("keydown", (e) => (e as KeyboardEvent).key === "Enter" && onEnter(input.value));
  return h("div", { class: "search-box" }, icon("search", 16), input);
}

let searchTimer: number | undefined;

// ── Descubrir ──────────────────────────────────────────────────────────────

function countrySelect(value: string, set: (v: string) => void, allLabel = "Todos los países") {
  return selectEl(
    value,
    DISCOVERY_COUNTRIES.map((c) => [c, c === "ALL" ? allLabel : countryName(c)]),
    set,
    { class: "inline-select", "aria-label": "País" },
  );
}

function setRadarCountry(v: string) {
  state.radar.country = v;
  chrome.storage.local.set({ discoveryCountry: v }).catch(() => {});
}

function emptyRadar() {
  const u = state.update;
  return h(
    "section",
    { class: "hero-empty card" },
    h("div", { class: "hero-icon" }, icon("radar", 34)),
    h("h1", null, "Llena tu radar con anuncios reales"),
    h(
      "p",
      { class: "muted" },
      `Cifra busca por ti en la Biblioteca de Anuncios de Meta (${NICHES.length} nichos, los más vistos primero), desde tu propio Chrome, y organiza lo que encuentra por nicho, días activo y copias. Nunca muestra anuncios inventados.`,
    ),
    h(
      "div",
      { class: "row wrap center-row" },
      countrySelect(state.radar.country, setRadarCountry),
      u?.running
        ? h("button", { class: "btn danger", onclick: () => { state.cancel = true; } }, "Detener")
        : h("button", { class: "btn btn-primary btn-lg", disabled: busy(), onclick: () => void startUpdate() }, icon("refresh", 16), "Llenar mi radar ahora"),
    ),
    u ? progressBar(u) : null,
    h(
      "p",
      { class: "muted small" },
      `Cada búsqueda abre la Biblioteca en una pestaña de fondo, guarda lo que carga y la cierra. Máximo ${MAX_PER_HOUR} búsquedas por hora: si hay más, Cifra espera y continúa sola. Si Meta limita el acceso o pide iniciar sesión, se detiene.`,
    ),
  );
}

function progressBar(u: DiscoveryProgress) {
  const pct = u.total ? Math.round((u.done / u.total) * 100) : 0;
  return h(
    "div",
    { class: "progress" },
    h("div", { class: "bar" }, h("i", { style: `width:${u.running ? Math.max(4, pct) : 100}%` })),
    h(
      "p",
      { class: "muted small" },
      u.running
        ? u.waitingUntil
          ? `En pausa por el límite de ${MAX_PER_HOUR} búsquedas por hora: sigue a las ${hhmm(u.waitingUntil)}. Deja esta pestaña abierta.`
          : `Buscando ${u.current ?? ""} (${u.done + 1} de ${u.total}) · ${fmtNum(u.created)} anuncios nuevos hasta ahora`
        : u.message,
    ),
  );
}

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

function discoverSidebar() {
  const f = state.f;
  const base = filterAds(f, "niche");
  const nicheCounts = countBy(base, (a) => a.nicheList);
  const none = base.filter((a) => !a.nicheList.length).length;
  const niches = nicheOptions(nicheCounts, base.length);
  if (none) niches.push(["none", "Sin clasificar", none]);

  const daysBase = filterAds(f, "days");
  const dayCounts: Array<[string, string, number]> = DAY_OPTIONS.map(([v, l]) => [
    v,
    l,
    daysBase.filter((a) => (v === "new" ? (a.days ?? 999) <= 7 : (a.days ?? 0) >= Number(v))).length,
  ]);
  const platBase = filterAds(f, "platform");
  const plat = countBy(platBase, (a) => a.platforms);
  const destBase = filterAds(f, "dest");
  const dest = countBy(destBase, (a) => a.dest);
  const fmtBase = filterAds(f, "format");
  const fmts = countBy(fmtBase, (a) => a.format);
  const cBase = filterAds(f, "country");
  const countries = countBy(cBase, (a) => a.countries);
  const sizeBase = filterAds(f, "size");
  const sizes = countBy(sizeBase, (a) => sizeOf(a.advSize));
  const stBase = filterAds(f, "status");
  const sorted = (m: Map<string, number>, label: (k: string) => string): Array<[string, string, number]> =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => [k, label(k), n]);
  const anyFilter = (["niche", "days", "platform", "dest", "country", "format", "size", "q", "pageId", "landing", "query"] as FilterKey[]).some((k) => f[k]) || f.status !== "active";

  return h(
    "aside",
    { class: "sidebar" },
    sideSection("niche", "Nicho", f.niche, niches, (v) => setFilter("niche", v), {
      limit: 12,
      allLabel: "Todos los nichos",
      allCount: base.length,
      note: "Un anuncio puede estar en varios nichos.",
    }),
    sideSection("days", "Días activo", f.days, dayCounts, (v) => setFilter("days", v), { allLabel: "Cualquiera" }),
    sideSection("platform", "Plataforma", f.platform, sorted(plat, (k) => PLATFORM_LABELS[k]?.label ?? k), (v) => setFilter("platform", v), { allLabel: "Todas" }),
    sideSection("dest", "Destino", f.dest, sorted(dest, (k) => DEST_LABELS[k as Dest] ?? k), (v) => setFilter("dest", v), { allLabel: "Todos" }),
    sideSection("format", "Formato", f.format, sorted(fmts, (k) => FORMAT_LABELS[k] ?? k), (v) => setFilter("format", v), { allLabel: "Todos" }),
    sideSection("country", "País", f.country, sorted(countries, countryName), (v) => setFilter("country", v), { allLabel: "Todos", limit: 6 }),
    sideSection(
      "size",
      "Tamaño del anunciante",
      f.size,
      SIZES.map((s) => [s.id, s.label, sizes.get(s.id) ?? 0]),
      (v) => setFilter("size", v),
      { allLabel: "Todos" },
    ),
    sideSection(
      "status",
      "Estado",
      f.status,
      STATUS_OPTIONS.map(([v, l]) => [v, l, v === "all" ? stBase.length : stBase.filter((a) => (v === "active" ? a.isActive : !a.isActive)).length]),
      (v) => setFilter("status", v),
      { allLabel: null },
    ),
    anyFilter
      ? h("button", { class: "btn wide", onclick: () => { state.f = { ...EMPTY_FILTERS, sort: f.sort, group: f.group }; state.limit = 60; render(); } }, "Limpiar filtros")
      : null,
  );
}

function scopeChips() {
  const f = state.f;
  const items: Array<[string, () => void]> = [];
  if (f.pageId) items.push([`Anunciante: ${state.advertisers.get(f.pageId)?.name ?? f.pageId}`, () => setFilter("pageId", "")]);
  if (f.landing) items.push([`Landing: ${f.landing}`, () => setFilter("landing", "")]);
  if (f.query) items.push([`Búsqueda: «${f.query}»`, () => setFilter("query", "")]);
  if (!items.length) return null;
  return h(
    "div",
    { class: "chips scope" },
    items.map(([label, clear]) => h("button", { class: "chip chip-scope", onclick: clear, title: "Quitar" }, label, " ×")),
  );
}

function discoverView() {
  if (!state.ads.some((a) => !a.isManual)) return emptyRadar();
  const f = state.f;
  const list = filterAds(f).sort(sortFn(f.sort));
  const def = f.niche && f.niche !== "none" ? NICHE_BY_ID[f.niche] : null;
  const advCount = new Set(list.map((a) => a.pageId)).size;
  const title = def ? `Anuncios de ${def.label}` : f.niche === "none" ? "Anuncios sin clasificar" : "Todos los anuncios";
  const description = def
    ? `Incluye ${def.description}.`
    : "Anuncios reales de la Biblioteca de Anuncios de Meta guardados en tu radar. Ordénalos por lo que está escalando, lo más duplicado o lo más visto.";

  return h(
    "div",
    { class: `layout${state.showFilters ? " show-filters" : ""}` },
    discoverSidebar(),
    h(
      "section",
      { class: "main-col" },
      h(
        "div",
        { class: "crumbs" },
        h("button", { class: "link-btn", onclick: () => setFilter("niche", "") }, "Anuncios"),
        def || f.niche === "none" ? [h("span", null, "›"), h("span", null, def?.label ?? "Sin clasificar")] : null,
      ),
      h("h1", { class: "page-title" }, title),
      h("p", { class: "muted lead" }, description),
      h(
        "div",
        { class: "toolbar" },
        h("div", { class: "result-count" }, h("b", null, fmtNum(list.length)), ` ${list.length === 1 ? "anuncio" : "anuncios"} · ${fmtNum(advCount)} ${advCount === 1 ? "anunciante" : "anunciantes"}`),
        searchInput(
          "discover-q",
          f.q,
          "Busca por texto, producto, anunciante o dominio…",
          (v) => {
            state.f.q = v;
            window.clearTimeout(searchTimer);
            searchTimer = window.setTimeout(() => {
              state.limit = 60;
              render();
            }, 220);
          },
        ),
        h(
          "label",
          { class: "toggle" },
          h("input", { type: "checkbox", checked: f.group, onchange: (e: Event) => { state.f.group = (e.target as HTMLInputElement).checked; state.limit = 60; render(); } }),
          h("span", null, "Agrupar por landing"),
        ),
        h("button", { class: "btn filters-btn", onclick: () => { state.showFilters = !state.showFilters; render(); } }, icon("sort", 14), state.showFilters ? "Ocultar filtros" : "Filtros"),
      ),
      sortPills(f.sort, (k) => { state.f.sort = k; state.limit = 60; render(); }),
      scopeChips(),
      resultsBlock(list),
    ),
  );
}

function resultsBlock(list: View[], emptyText = "Ningún anuncio coincide con estos filtros.") {
  if (state.f.group && state.screen === "discover") {
    const groups = new Map<string, View[]>();
    for (const a of list) {
      const k = a.landingKey ? `l:${a.landingKey}` : `a:${a.id}`;
      const g = groups.get(k);
      if (g) g.push(a);
      else groups.set(k, [a]);
    }
    const items = Array.from(groups.values());
    const shown = items.slice(0, state.limit);
    return h(
      "div",
      null,
      h("p", { class: "muted small" }, `${fmtNum(items.filter((g) => g.length > 1).length)} landings con más de un anuncio.`),
      shown.length ? h("div", { class: "grid" }, shown.map((g) => (g.length > 1 ? landingGroupCard(g) : card(g[0]!)))) : h("div", { class: "card empty" }, emptyText),
      moreButton(items.length - shown.length),
    );
  }
  const shown = list.slice(0, state.limit);
  return h(
    "div",
    null,
    shown.length ? h("div", { class: "grid" }, shown.map((a) => card(a))) : h("div", { class: "card empty" }, emptyText),
    moreButton(list.length - shown.length),
  );
}

function moreButton(rest: number) {
  return rest > 0 ? h("button", { class: "btn more", onclick: () => { state.limit += 60; render(); } }, `Mostrar más (${fmtNum(rest)} restantes)`) : null;
}

// ── Anunciantes ────────────────────────────────────────────────────────────

interface AdvView {
  a: AdvertiserRecord;
  ads: View[];
  active: View[];
  niches: string[];
  maxDays: number | null;
  maxCopies: number;
  avgTop: number;
  scaling: number;
  thumbs: View[];
  domains: Array<[string, number]>;
  lastSeen: string;
  meta: number | null;
  search: string;
}

function advertiserViews(): AdvView[] {
  const byPage = new Map<string, View[]>();
  for (const ad of state.ads) {
    if (ad.isManual) continue;
    const list = byPage.get(ad.pageId);
    if (list) list.push(ad);
    else byPage.set(ad.pageId, [ad]);
  }
  const out: AdvView[] = [];
  for (const [pageId, ads] of byPage) {
    const a = state.advertisers.get(pageId);
    if (!a) continue;
    const active = ads.filter((x) => x.isActive);
    const pool = active.length ? active : ads;
    const top = pool.map((x) => x.score).sort((x, y) => y - x).slice(0, 3);
    const avgTop = top.length ? top.reduce((s, x) => s + x, 0) / top.length : 0;
    const maxCopies = Math.max(1, ...ads.map((x) => x.copies));
    const nicheCounts = countBy(pool, (x) => x.nicheList);
    const domains = Array.from(countBy(ads, (x) => x.landingDomain?.replace(/^www\./, "") ?? null).entries()).sort((x, y) => y[1] - x[1]);
    out.push({
      a,
      ads,
      active,
      niches: Array.from(nicheCounts.entries()).sort((x, y) => y[1] - x[1]).map(([k]) => k),
      maxDays: pool.reduce<number | null>((m, x) => (x.days !== null && (m === null || x.days > m) ? x.days : m), null),
      maxCopies,
      avgTop,
      scaling: avgTop + 6 * Math.log2(active.length + 1) + 2 * Math.log2(maxCopies),
      thumbs: [...pool].sort(sortFn("scaling")).filter((x) => x.media[0] && (x.media[0].type === "image" || x.media[0].preview)).slice(0, 3),
      domains,
      lastSeen: ads.reduce((m, x) => (x.lastSeenAt > m ? x.lastSeenAt : m), ""),
      meta: a.metaActiveCount ?? null,
      search: normalizeText([a.name, ...domains.map(([d]) => d)].join(" ")),
    });
  }
  return out;
}

const ADV_SORTS: Record<string, { label: string; fn: (a: AdvView, b: AdvView) => number }> = {
  scaling: { label: "Escalando", fn: (a, b) => b.scaling - a.scaling },
  active: { label: "Más anuncios activos", fn: (a, b) => (b.meta ?? b.active.length) - (a.meta ?? a.active.length) || b.active.length - a.active.length },
  copies: { label: "Más duplicados", fn: (a, b) => b.maxCopies - a.maxCopies || b.scaling - a.scaling },
  likes: { label: "Más seguidores", fn: (a, b) => (b.a.likes ?? -1) - (a.a.likes ?? -1) },
  oldest: { label: "Anuncio más longevo", fn: (a, b) => (b.maxDays ?? -1) - (a.maxDays ?? -1) },
  recent: { label: "Vistos recientemente", fn: (a, b) => b.lastSeen.localeCompare(a.lastSeen) },
};

function miniThumb(ad: View) {
  const m = ad.media[0]!;
  const src = m.type === "video" ? m.preview : m.url;
  const box = h("div", { class: "mini" });
  if (src) {
    const img = h("img", { src, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
    img.addEventListener("error", () => img.remove());
    box.append(img);
  }
  if (m.type === "video") box.append(h("span", { class: "mini-play" }, icon("play", 12)));
  return box;
}

function stat(value: string, label: string) {
  return h("div", { class: "astat" }, h("b", null, value), h("small", null, label));
}

function advCard(v: AdvView) {
  const followed = state.follows.has(v.a.pageId);
  return h(
    "article",
    { class: "card adv-card", onclick: () => openAdvertiser(v.a.pageId) },
    h(
      "div",
      { class: "adv-head" },
      avatar(v.a.name, v.a.avatarUrl, 44),
      h(
        "div",
        { class: "grow" },
        h("div", { class: "strong ellipsis" }, v.a.name),
        h("small", { class: "muted" }, v.a.likes ? `${compact.format(v.a.likes)} seguidores` : v.domains[0]?.[0] ?? nicheLabel(v.niches[0] ?? null)),
      ),
      followed ? chip("Siguiendo", "chip-accent") : null,
    ),
    h("div", { class: "adv-thumbs" }, [0, 1, 2].map((i) => (v.thumbs[i] ? miniThumb(v.thumbs[i]!) : h("div", { class: "mini empty" })))),
    h(
      "div",
      { class: "adv-stats" },
      stat(fmtNum(v.active.length), "activos en tu radar"),
      stat(v.meta !== null ? `~${fmtNum(v.meta)}` : "—", "activos en Meta"),
      stat(v.maxDays === null ? "—" : fmtNum(v.maxDays), "días el más longevo"),
    ),
    h(
      "div",
      { class: "chips" },
      v.niches.slice(0, 3).map((n) => chip(nicheLabel(n), "chip-accent")),
      v.maxCopies >= 10 ? chip(`🔥 ${v.maxCopies} copias`, "chip-hot") : v.maxCopies > 1 ? chip(`${v.maxCopies} copias`, "chip-strong") : null,
    ),
  );
}

function advertisersView() {
  const s = state.adv;
  const all = advertiserViews();
  const terms = normalizeText(s.q).split(" ").filter((t) => t.length >= 2);
  const bySearch = all.filter((v) => terms.every((t) => v.search.includes(t)));
  const counts = countBy(bySearch, (v) => v.niches);
  const list = bySearch.filter((v) => !s.niche || v.niches.includes(s.niche)).sort((ADV_SORTS[s.sort] ?? ADV_SORTS.scaling!).fn);
  const shown = list.slice(0, s.limit);
  const def = s.niche ? NICHE_BY_ID[s.niche] : null;
  return h(
    "div",
    { class: `layout${state.showFilters ? " show-filters" : ""}` },
    h(
      "aside",
      { class: "sidebar" },
      sideSection("adv-niche", "Nicho", s.niche, nicheOptions(counts, bySearch.length), (v) => { s.niche = v; s.limit = 48; render(); }, {
        limit: 12,
        allLabel: "Todos los nichos",
        allCount: bySearch.length,
      }),
    ),
    h(
      "section",
      { class: "main-col" },
      h("h1", { class: "page-title" }, def ? `Anunciantes de ${def.label}` : "Anunciantes"),
      h("p", { class: "muted lead" }, "Las marcas detrás de los anuncios de tu radar: cuántos anuncios mantienen activos, cuánto duran y qué duplican."),
      h(
        "div",
        { class: "toolbar" },
        h("div", { class: "result-count" }, h("b", null, fmtNum(list.length)), ` ${list.length === 1 ? "anunciante" : "anunciantes"}`),
        searchInput("adv-q", s.q, "Buscar anunciante o dominio…", (v) => {
          s.q = v;
          window.clearTimeout(searchTimer);
          searchTimer = window.setTimeout(render, 220);
        }),
        h("button", { class: "btn filters-btn", onclick: () => { state.showFilters = !state.showFilters; render(); } }, icon("sort", 14), state.showFilters ? "Ocultar filtros" : "Filtros"),
      ),
      sortPills(s.sort, (k) => { s.sort = k; render(); }, ADV_SORTS),
      shown.length ? h("div", { class: "grid grid-adv" }, shown.map(advCard)) : h("div", { class: "card empty" }, "Ningún anunciante coincide."),
      list.length > shown.length ? h("button", { class: "btn more", onclick: () => { s.limit += 48; render(); } }, `Mostrar más (${fmtNum(list.length - shown.length)})`) : null,
    ),
  );
}

async function openAdvertiser(pageId: string) {
  closeDetail();
  const f = state.follows.get(pageId);
  state.advSeenBefore = f?.seenAt ?? null;
  state.pageId = pageId;
  go("advertiser");
  if (f) {
    await state.store!.touchFollow(pageId, { seenAt: new Date().toISOString() });
    state.follows = await state.store!.follows();
  }
}

function followButton(a: { pageId: string; name: string }) {
  const on = state.follows.has(a.pageId);
  return h(
    "button",
    {
      class: on ? "btn following" : "btn btn-primary",
      onclick: async (e: Event) => {
        e.stopPropagation();
        if (on) await state.store!.unfollow(a.pageId);
        else await state.store!.follow(a.pageId, a.name);
        await load();
        const modal = document.querySelector<HTMLElement>(".modal[data-id]");
        if (modal) openDetail(modal.dataset.id!);
      },
    },
    on ? "✓ Siguiendo" : "+ Seguir",
  );
}

function kpi(label: string, value: string, sub?: string) {
  return h("div", { class: "kpi" }, h("small", null, label), h("b", null, value), sub ? h("small", { class: "muted" }, sub) : null);
}

async function fetchAdvertiser(a: AdvertiserRecord) {
  const followed = state.follows.has(a.pageId);
  await runItems([
    {
      label: a.name,
      url: advertiserLibraryUrl(a.pageId),
      q: "",
      after: followed ? () => state.store!.touchFollow(a.pageId, { refreshedAt: new Date().toISOString() }) : undefined,
    },
  ]);
}

function advertiserView() {
  const v = advertiserViews().find((x) => x.a.pageId === state.pageId);
  if (!v) {
    return h("div", { class: "card empty" }, h("p", null, "No encontramos este anunciante en tu radar."), h("button", { class: "btn", onclick: () => go("advertisers") }, "Ver anunciantes"));
  }
  const a = v.a;
  const fbUrl = a.pageUrl ?? (/^\d+$/.test(a.pageId) ? `https://www.facebook.com/${a.pageId}` : null);
  const seen = state.advSeenBefore;
  const list = [...v.ads].sort((x, y) => Number(y.isActive) - Number(x.isActive) || sortFn(state.f.sort)(x, y));
  const shown = list.slice(0, state.limit);
  return h(
    "div",
    { class: "adv-layout" },
    h(
      "aside",
      { class: "card pad adv-panel" },
      h("button", { class: "link-btn back", onclick: () => go("advertisers") }, "← Anunciantes"),
      h(
        "div",
        { class: "adv-id" },
        avatar(a.name, a.avatarUrl, 72),
        h("h2", null, a.name),
        a.likes ? h("p", { class: "muted" }, `${fmtNum(a.likes)} seguidores`) : null,
        a.categories.length ? h("p", { class: "muted small" }, a.categories.slice(0, 2).join(" · ")) : null,
      ),
      h(
        "div",
        { class: "row wrap center-row" },
        followButton(a),
        fbUrl ? h("a", { class: "btn", href: fbUrl, target: "_blank", rel: "noopener" }, "Facebook", icon("ext", 13)) : null,
      ),
      h(
        "div",
        { class: "kpis" },
        kpi("Activos en Meta", v.meta !== null ? `~${fmtNum(v.meta)}` : "—", v.meta !== null ? `según la Biblioteca · ${timeAgo(a.metaCountAt)}` : "pulsa «Traer todos sus anuncios»"),
        kpi("En tu radar", `${fmtNum(v.active.length)} / ${fmtNum(v.ads.length)}`, "activos / guardados"),
        kpi("Más longevo", fmtDays(v.maxDays)),
        kpi("Más duplicado", `${fmtNum(v.maxCopies)} ${v.maxCopies === 1 ? "copia" : "copias"}`),
      ),
      h(
        "button",
        { class: "btn btn-primary wide", disabled: busy(), onclick: () => void fetchAdvertiser(a) },
        icon("refresh", 14),
        state.update?.running && state.update.current === a.name ? "Trayendo anuncios…" : "Traer todos sus anuncios",
      ),
      h("small", { class: "muted" }, "Abre su página de la Biblioteca en una pestaña de fondo y guarda los anuncios que carga (unos 30 por vez)."),
      v.domains.length
        ? h(
            "div",
            { class: "side-block" },
            h("h4", null, "Dominios"),
            v.domains.slice(0, 6).map(([d, n]) =>
              h("button", { class: "opt", onclick: () => filterBy({ pageId: a.pageId, q: d }) }, h("span", { class: "opt-label" }, d), h("span", { class: "opt-n" }, fmtNum(n))),
            ),
          )
        : null,
      v.niches.length ? h("div", { class: "side-block" }, h("h4", null, "Nichos"), h("div", { class: "chips" }, v.niches.slice(0, 6).map((n) => chip(nicheLabel(n), "chip-accent")))) : null,
      h("a", { href: advertiserLibraryUrl(a.pageId), target: "_blank", rel: "noopener", class: "small-link" }, "Ver en la Biblioteca de Anuncios ↗"),
    ),
    h(
      "section",
      { class: "main-col" },
      h("h1", { class: "page-title" }, `Anuncios de ${a.name}`),
      h("p", { class: "muted lead" }, `${fmtNum(v.active.length)} activos de ${fmtNum(v.ads.length)} guardados en tu radar.`),
      sortPills(state.f.sort, (k) => { state.f.sort = k; render(); }),
      h("div", { class: "grid" }, shown.map((ad) => card(ad, seen && ad.firstSeenAt > seen ? "is-new" : ""))),
      moreButton(list.length - shown.length),
    ),
  );
}

// ── Siguiendo ──────────────────────────────────────────────────────────────

function followingView() {
  const follows = Array.from(state.follows.values());
  if (!follows.length) {
    return h(
      "section",
      { class: "hero-empty card" },
      h("div", { class: "hero-icon" }, icon("radar", 34)),
      h("h1", null, "Sigue las marcas que quieres entender"),
      h("p", { class: "muted" }, "Pulsa «Seguir» en cualquier anunciante. Cifra revisará sus anuncios cada vez que actualices y te avisará de lo nuevo."),
      h(
        "div",
        { class: "features" },
        h("div", { class: "feature" }, icon("trend", 20), h("b", null, "Su operación"), h("small", { class: "muted" }, "Cuántos anuncios mantiene activos y cuántos lanza nuevos.")),
        h("div", { class: "feature" }, icon("branch", 20), h("b", null, "Su estrategia"), h("small", { class: "muted" }, "Qué ofertas, landings y formatos usa, y cómo los combina.")),
        h("div", { class: "feature" }, icon("copy", 20), h("b", null, "Sus señales"), h("small", { class: "muted" }, "Cuándo duplica una creatividad y cuánto tiempo la sostiene.")),
      ),
      h("button", { class: "btn btn-primary btn-lg", onclick: () => go("advertisers") }, "Explorar anunciantes"),
    );
  }
  const advs = new Map(advertiserViews().map((v) => [v.a.pageId, v]));
  const rows = follows
    .map((f) => {
      const v = advs.get(f.pageId);
      const fresh = (v?.ads ?? []).filter((a) => a.firstSeenAt > f.seenAt);
      return { f, v, fresh };
    })
    .sort((x, y) => y.fresh.length - x.fresh.length || x.f.name.localeCompare(y.f.name));
  const freshAds = rows.flatMap((r) => r.fresh).sort(sortFn("recent"));
  const latest = freshAds.length
    ? freshAds
    : rows
        .flatMap((r) => r.v?.active ?? [])
        .sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt))
        .slice(0, 24);
  return h(
    "div",
    { class: "stack" },
    h(
      "div",
      { class: "row between wrap" },
      h("div", null, h("h1", { class: "page-title" }, `Siguiendo (${follows.length})`), h("p", { class: "muted lead" }, "Lo que hacen las marcas que sigues. «Actualizar» revisa primero a tus seguidos.")),
      h(
        "button",
        { class: "btn btn-primary", disabled: busy(), onclick: () => void startUpdate({ followsOnly: true }) },
        icon("refresh", 14),
        "Actualizar seguidos",
      ),
    ),
    h(
      "div",
      { class: "card list" },
      rows.map(({ f, v, fresh }) =>
        h(
          "div",
          { class: "list-row", onclick: () => void openAdvertiser(f.pageId) },
          avatar(f.name, v?.a.avatarUrl ?? null, 40),
          h(
            "div",
            { class: "grow" },
            h("div", { class: "strong" }, v?.a.name ?? f.name),
            h(
              "small",
              { class: "muted" },
              `${fmtNum(v?.active.length ?? 0)} activos en tu radar${v?.meta != null ? ` · ~${fmtNum(v.meta)} en Meta` : ""} · revisado ${timeAgo(f.refreshedAt)}`,
            ),
          ),
          fresh.length ? h("span", { class: "chip chip-new" }, `${fresh.length} ${fresh.length === 1 ? "nuevo" : "nuevos"}`) : null,
          h(
            "button",
            {
              class: "btn small",
              onclick: async (e: Event) => {
                e.stopPropagation();
                await state.store!.unfollow(f.pageId);
                await load();
              },
            },
            "Dejar de seguir",
          ),
        ),
      ),
    ),
    h("h2", null, freshAds.length ? "Lo nuevo de tus seguidos" : "Sus anuncios activos más recientes"),
    latest.length ? h("div", { class: "grid" }, latest.slice(0, 60).map((a) => card(a, freshAds.length ? "is-new" : ""))) : h("div", { class: "card empty" }, "Aún no hay anuncios de tus seguidos. Pulsa «Actualizar seguidos»."),
  );
}

// ── Buscar ─────────────────────────────────────────────────────────────────

async function runSearch() {
  const s = state.search;
  const q = s.q.trim();
  if (!q || busy()) return;
  if ((await searchesLeft()) <= 0) {
    s.message = `Llegaste al límite de ${MAX_PER_HOUR} búsquedas por hora. Vuelve a intentarlo más tarde.`;
    render();
    return;
  }
  s.running = true;
  s.message = `Buscando «${q}» en la Biblioteca (${s.country === "ALL" ? "todos los países" : countryName(s.country)})…`;
  render();
  const opts: SearchOptions = {
    country: s.country,
    sort: s.sort,
    status: s.status,
    media: s.media,
    platform: s.platform || undefined,
    language: s.language || undefined,
  };
  const r = await runJob(librarySearchUrl(q, opts), q, 3);
  s.running = false;
  s.shown = queryKey(q);
  s.message = r.blocked
    ? blockedMessage(r.blocked)
    : r.detected
      ? `«${q}»: ${fmtNum(r.created)} nuevos y ${fmtNum(r.updated)} actualizados${r.resultCount ? ` · la Biblioteca informa ~${fmtNum(r.resultCount)} resultados` : ""}.`
      : `«${q}»: ${r.error ?? "la Biblioteca no devolvió anuncios para esta búsqueda"}.`;
  state.searchLeft = await searchesLeft();
  await load();
}

function recentQueries() {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of state.log) {
    const q = typeof l.context.q === "string" ? queryKey(l.context.q) : "";
    if (q && !seen.has(q)) {
      seen.add(q);
      out.push(q);
    }
  }
  return out.slice(0, 12);
}

function searchView() {
  const s = state.search;
  const running = s.running;
  const results = s.shown
    ? state.ads
        .filter((a) => (a.queries ?? []).includes(s.shown) && (!s.size || sizeOf(a.advSize) === s.size))
        .sort(
          (a, b) =>
            (a.impressionQuery === s.shown ? (a.impressionRank ?? 1e6) : 1e6) - (b.impressionQuery === s.shown ? (b.impressionRank ?? 1e6) : 1e6) ||
            b.score - a.score,
        )
    : [];
  const recents = recentQueries();
  const queries = h("textarea", { class: "queries", rows: 8, "aria-label": "Búsquedas del radar", "data-key": "radar-queries" }, state.radar.queries) as HTMLTextAreaElement;
  queries.addEventListener("input", () => (state.radar.queries = queries.value));
  queries.addEventListener("change", () => saveQueries());
  const nQueries = parseQueries(state.radar.queries).length;

  return h(
    "div",
    { class: "stack" },
    h(
      "section",
      { class: "search-hero card" },
      h("h1", null, "Buscar en la Biblioteca de Anuncios"),
      h("p", { class: "muted" }, "Busca cualquier producto, marca u oferta. Cifra abre la Biblioteca en tu propio Chrome, trae los anuncios y los guarda en tu radar."),
      h(
        "div",
        { class: "searchbar" },
        searchInput("search-q", s.q, "Ej.: zapatillas, curso de inglés, colágeno…", (v) => (s.q = v), () => void runSearch()),
        countrySelect(s.country, (v) => (s.country = v)),
        h("button", { class: "btn btn-primary btn-lg", disabled: busy(), onclick: () => void runSearch() }, running ? "Buscando…" : "Buscar"),
      ),
      h(
        "div",
        { class: "search-filters" },
        field("Ordenar", selectEl(s.sort, [["total_impressions", "Más vistos primero"], ["relevance", "Relevancia (Meta)"]], (v) => (s.sort = v as typeof s.sort))),
        field("Estado", selectEl(s.status, [["active", "Activos"], ["all", "Activos e inactivos"]], (v) => (s.status = v as typeof s.status))),
        field(
          "Formato",
          selectEl(s.media, [["all", "Todos"], ["image", "Imágenes"], ["video", "Videos"], ["meme", "Memes"], ["none", "Sin imagen ni video"]], (v) => (s.media = v as typeof s.media)),
        ),
        field(
          "Plataforma",
          selectEl(
            s.platform,
            [["", "Todas"], ...(["facebook", "instagram", "messenger", "audience_network", "whatsapp", "threads"] as const).map((p): [string, string] => [p, PLATFORM_LABELS[p]?.label ?? p])],
            (v) => (s.platform = v),
          ),
        ),
        field("Idioma", selectEl(s.language, [["", "Todos"], ["es", "Español"], ["pt", "Portugués"], ["en", "Inglés"]], (v) => (s.language = v))),
        field(
          "Tamaño del anunciante",
          selectEl(s.size, [["", "Todos"], ...SIZES.map((x): [string, string] => [x.id, x.label])], (v) => {
            s.size = v;
            render();
          }),
        ),
      ),
      h(
        "p",
        { class: "muted small" },
        `Te quedan ${state.searchLeft} de ${MAX_PER_HOUR} búsquedas esta hora. «Más vistos» usa el orden por impresiones de la Biblioteca (Meta no publica ventas).`,
      ),
      s.message ? h("p", { class: running ? "notice-inline" : "muted" }, running ? h("span", { class: "spinner" }) : null, s.message) : null,
      recents.length
        ? h(
            "div",
            { class: "chips recents" },
            h("small", { class: "muted" }, "Recientes:"),
            recents.map((q) => h("button", { class: `chip chip-btn${s.shown === q ? " on" : ""}`, onclick: () => { s.q = q; s.shown = q; render(); } }, q)),
          )
        : null,
    ),
    s.shown
      ? h(
          "section",
          { class: "stack" },
          h(
            "div",
            { class: "row between wrap" },
            h("h2", null, `Resultados para «${s.shown}» · ${fmtNum(results.length)}`),
            h("button", { class: "btn small", onclick: () => filterBy({ query: s.shown }) }, "Ver con todos los filtros →"),
          ),
          results.length ? h("div", { class: "grid" }, results.slice(0, 120).map((a) => card(a))) : h("div", { class: "card empty" }, running ? "Buscando…" : "Sin anuncios guardados para esta búsqueda."),
        )
      : null,
    h(
      "section",
      { class: "card pad" },
      h("div", { class: "row between wrap" }, h("h2", null, "Radar automático"), h("small", { class: "muted" }, `${nQueries} búsquedas · ${state.lastUpdate ? `última vez ${timeAgo(state.lastUpdate)}` : "aún no se ejecuta"}`)),
      h(
        "p",
        { class: "muted" },
        "Estas búsquedas se repasan cada vez que pulsas «Actualizar» (arriba a la derecha), después de tus anunciantes seguidos. Una por línea. Por defecto hay una por nicho, ordenadas por los más vistos.",
      ),
      queries,
      h(
        "div",
        { class: "row wrap" },
        h("label", { class: "field inline" }, h("span", null, "País"), countrySelect(state.radar.country, setRadarCountry)),
        h("button", { class: "btn btn-primary", disabled: busy(), onclick: () => { saveQueries(); void startUpdate(); } }, icon("refresh", 14), "Actualizar ahora"),
        h("button", { class: "btn", onclick: () => { state.radar.queries = DEFAULT_QUERIES.join("\n"); saveQueries(); render(); } }, `Restaurar lista (${DEFAULT_QUERIES.length} nichos)`),
      ),
    ),
  );
}

function parseQueries(text: string) {
  return Array.from(new Set(text.split(/\n+/).map((x) => x.trim()).filter(Boolean)));
}

function saveQueries() {
  chrome.storage.local.set({ discoveryQueries: parseQueries(state.radar.queries), queriesVersion: 2 }).catch(() => {});
}

// ── Actualizar (cola de búsquedas) ─────────────────────────────────────────

async function runItems(items: QueueItem[], markUpdate = false) {
  if (!items.length || busy()) return;
  state.cancel = false;
  state.notice = "";
  state.update = { running: true, done: 0, total: items.length, current: items[0]!.label, created: 0, updated: 0, detected: 0, message: "", waitingUntil: null };
  render();
  const p = await runQueue(
    items,
    async (prog) => {
      state.update = prog;
      state.searchLeft = await searchesLeft();
      await load();
    },
    () => state.cancel,
  );
  if (markUpdate) {
    state.lastUpdate = new Date().toISOString();
    chrome.storage.local.set({ lastUpdate: state.lastUpdate }).catch(() => {});
  }
  state.notice = p.message;
  state.searchLeft = await searchesLeft();
  await load();
}

async function startUpdate(o: { followsOnly?: boolean } = {}) {
  const follows: QueueItem[] = Array.from(state.follows.values()).map((f) => ({
    label: f.name,
    url: advertiserLibraryUrl(f.pageId),
    q: "",
    after: () => state.store!.touchFollow(f.pageId, { refreshedAt: new Date().toISOString() }),
  }));
  const queries: QueueItem[] = o.followsOnly
    ? []
    : parseQueries(state.radar.queries).map((q) => ({ label: `«${q}»`, url: librarySearchUrl(q, { country: state.radar.country }), q }));
  await runItems([...follows, ...queries], !o.followsOnly);
}

function updatePill() {
  const u = state.update;
  if (u?.running) {
    return h(
      "div",
      { class: "update-pill running", role: "status" },
      h("span", { class: "spinner" }),
      h(
        "span",
        { class: "ellipsis" },
        u.waitingUntil ? `En pausa por límite · sigue a las ${hhmm(u.waitingUntil)}` : `${u.done + 1}/${u.total} · ${u.current ?? ""}`,
      ),
      u.created ? h("b", null, `+${fmtNum(u.created)}`) : null,
      h("button", { class: "link-btn", onclick: () => { state.cancel = true; } }, "Detener"),
    );
  }
  return h(
    "button",
    {
      class: "update-pill",
      disabled: busy(),
      title: "Revisa tus seguidos y las búsquedas del radar automático en la Biblioteca de Anuncios",
      onclick: () => void startUpdate(),
    },
    icon("refresh", 14),
    "Actualizar",
    h("small", null, state.lastUpdate ? timeAgo(state.lastUpdate) : "nunca"),
  );
}

// ── Favoritos ──────────────────────────────────────────────────────────────

async function addByUrl() {
  const s = state.addUrl;
  const id = parseAdId(s.value);
  if (!id) {
    s.message = "Pega el enlace de un anuncio de la Biblioteca (…/ads/library/?id=123…) o su número de ID.";
    render();
    return;
  }
  if (state.byId.has(id)) {
    if (!state.byId.get(id)!.fav) await state.store!.setFavorite(id, true);
    s.value = "";
    s.message = "Ese anuncio ya estaba en tu radar: quedó en favoritos.";
    await load();
    return;
  }
  if (busy()) return;
  if ((await searchesLeft()) <= 0) {
    s.message = `Llegaste al límite de ${MAX_PER_HOUR} búsquedas por hora. Inténtalo más tarde.`;
    render();
    return;
  }
  s.running = true;
  s.message = "Abriendo el anuncio en la Biblioteca…";
  render();
  const r = await runJob(adLibraryUrl(id), "", 0);
  s.running = false;
  await load();
  if (state.byId.has(id)) {
    await state.store!.setFavorite(id, true);
    s.value = "";
    s.message = "Anuncio agregado a favoritos.";
  } else {
    s.message = r.blocked ? blockedMessage(r.blocked) : (r.error ?? "La Biblioteca no devolvió ese anuncio (puede que ya no esté disponible).");
  }
  await load();
}

function addUrlBox() {
  const s = state.addUrl;
  const input = h("input", { type: "url", class: "search", placeholder: "https://www.facebook.com/ads/library/?id=…", value: s.value, "data-key": "add-url", "aria-label": "Enlace del anuncio" }) as HTMLInputElement;
  input.addEventListener("input", () => (s.value = input.value));
  input.addEventListener("keydown", (e) => (e as KeyboardEvent).key === "Enter" && void addByUrl());
  return h(
    "div",
    { class: "add-url" },
    h("div", { class: "row wrap" }, input, h("button", { class: "btn btn-primary", disabled: s.running, onclick: () => void addByUrl() }, icon("plus", 14), s.running ? "Agregando…" : "Añadir por URL")),
    s.message ? h("small", { class: "muted" }, s.message) : null,
  );
}

function favoritesView() {
  const list = state.ads.filter((a) => a.fav).sort(sortFn(state.f.sort));
  if (!list.length) {
    return h(
      "section",
      { class: "hero-empty card" },
      h("div", { class: "hero-icon" }, icon("heart", 30)),
      h("h1", null, "Guarda lo que vale la pena volver a mirar"),
      h("p", { class: "muted" }, "Toca el corazón de cualquier anuncio o pega aquí el enlace de un anuncio de la Biblioteca. Tus favoritos no se borran y sirven de referencia en Studio."),
      h("div", { class: "row wrap center-row" }, h("button", { class: "btn", onclick: () => go("search") }, icon("search", 14), "Buscar anuncios"), h("button", { class: "btn", onclick: () => go("discover") }, icon("compass", 14), "Descubrir")),
      addUrlBox(),
    );
  }
  return h(
    "div",
    { class: "stack" },
    h("div", { class: "row between wrap" }, h("div", null, h("h1", { class: "page-title" }, `Favoritos (${list.length})`), h("p", { class: "muted lead" }, "No se borran por la retención y puedes usarlos como referencia en Studio.")), addUrlBox()),
    sortPills(state.f.sort, (k) => { state.f.sort = k; render(); }),
    h("div", { class: "grid" }, list.map((a) => card(a))),
  );
}

// ── Datos ──────────────────────────────────────────────────────────────────

function dataView() {
  const total = state.ads.length;
  const active = state.ads.filter((a) => a.isActive).length;
  const msg = h("p", { class: "muted", id: "data-msg" });
  const say = (t: string) => (msg.textContent = t);
  const file = h("input", { type: "file", accept: "application/json,.json" }) as HTMLInputElement;
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      const r = await state.store!.importFile(JSON.parse(await f.text()));
      await load();
      say(`Importado (${r.kind}): ${fmtNum(r.count)} anuncios.`);
    } catch (e) {
      say(`No se pudo importar: ${(e as Error).message}`);
    }
  });
  return h(
    "div",
    { class: "stack narrow" },
    h("h1", { class: "page-title" }, "Tus datos"),
    h(
      "section",
      { class: "card pad" },
      h("p", null, `${fmtNum(total)} anuncios (${fmtNum(active)} activos) de ${fmtNum(state.advertisers.size)} anunciantes, ${fmtNum(state.follows.size)} seguidos y ${fmtNum(state.favorites.size)} favoritos, guardados solo en este Chrome.`),
      h(
        "p",
        { class: "muted" },
        `Nada se comparte: no hay servidor ni catálogo común. Las creatividades no se descargan: se guardan sus enlaces originales, que Meta hace expirar. Los anuncios no favoritos que no se vuelven a ver en ${RETENTION_DAYS} días se borran solos.`,
      ),
      h(
        "div",
        { class: "row wrap" },
        h(
          "button",
          {
            class: "btn btn-primary",
            onclick: async () => {
              const data = await state.store!.exportAll();
              const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
              const a = h("a", { href: url, download: `cifra-radar-${new Date().toISOString().slice(0, 10)}.json` });
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
              say("Respaldo descargado. Puedes importarlo en otro Chrome.");
            },
          },
          "Descargar respaldo (JSON)",
        ),
        h("label", { class: "btn" }, "Importar archivo JSON", file),
        h(
          "button",
          {
            class: "btn",
            onclick: async () => {
              const n = await state.store!.reindex();
              await load();
              say(`Nichos, precios y puntuaciones recalculados (${fmtNum(n)} anuncios).`);
            },
          },
          "Volver a clasificar",
        ),
        h(
          "button",
          {
            class: "btn danger",
            onclick: async () => {
              if (!confirm("¿Borrar todos los anuncios, anunciantes, seguidos y favoritos guardados en este Chrome?")) return;
              await state.store!.clear();
              await load();
              say("Datos borrados.");
            },
          },
          "Borrar todo",
        ),
      ),
      msg,
    ),
    h(
      "section",
      { class: "card pad" },
      h("h2", null, "Últimas capturas"),
      state.log.length
        ? h(
            "table",
            null,
            h("thead", null, h("tr", null, ["Cuándo", "Búsqueda", "Recibidos", "Nuevos", "Actualizados"].map((t) => h("th", null, t)))),
            h(
              "tbody",
              null,
              state.log.slice(0, 20).map((l) =>
                h(
                  "tr",
                  null,
                  h("td", null, timeAgo(l.createdAt)),
                  h("td", null, [l.context.q ? `«${String(l.context.q)}»` : "", l.context.country ? ` · ${String(l.context.country)}` : ""].join("") || "—"),
                  h("td", null, fmtNum(l.received)),
                  h("td", null, fmtNum(l.created)),
                  h("td", null, fmtNum(l.updated)),
                ),
              ),
            ),
          )
        : h("p", { class: "muted" }, "Todavía no hay capturas."),
    ),
    h("p", { class: "muted small" }, SCORE_DISCLAIMER),
  );
}

// ── Detalle ────────────────────────────────────────────────────────────────

function closeDetail() {
  document.querySelector(".modal")?.remove();
  document.body.classList.remove("no-scroll");
}

function fact(label: string, value: Child) {
  return h("div", { class: "fact" }, h("dt", null, label), h("dd", null, value));
}

function copyButton(text: string, label = "Copiar texto") {
  const b = h(
    "button",
    {
      class: "btn",
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(text);
          b.lastChild!.textContent = "Copiado";
        } catch {
          b.lastChild!.textContent = "No se pudo copiar";
        }
      },
    },
    icon("copy", 14),
    h("span", null, label),
  );
  return b;
}

function openDetail(id: string) {
  const ad = state.byId.get(id);
  if (!ad) return;
  closeDetail();
  const gallery = ad.media.length
    ? h(
        "div",
        { class: ad.media.length > 1 ? "gallery two" : "gallery" },
        ad.media.map((m) => {
          const el =
            m.type === "video"
              ? h("video", { src: m.url, poster: m.preview ?? undefined, controls: true, preload: "metadata", playsinline: true })
              : h("img", { src: m.url, alt: "", referrerpolicy: "no-referrer" });
          el.addEventListener("error", () => el.replaceWith(m.type === "video" && m.preview ? previewImage(m.preview) : placeholder(true)));
          return el;
        }),
      )
    : placeholder(false);
  const tier = scoreTier(ad.score);
  const text = [ad.title, ad.body, ad.linkDescription].filter(Boolean).join("\n\n");
  const modal = h(
    "div",
    { class: "modal", "data-id": ad.id, onclick: (e: Event) => { if (e.target === modal) closeDetail(); } },
    h(
      "div",
      { class: "modal-box", role: "dialog", "aria-modal": "true", "aria-label": `Anuncio de ${ad.pageName}` },
      h(
        "header",
        { class: "row between modal-head" },
        h(
          "div",
          { class: "row" },
          avatar(ad.pageName, ad.avatar, 44),
          h(
            "div",
            null,
            h("button", { class: "name-link big", onclick: () => void openAdvertiser(ad.pageId) }, ad.pageName),
            h("small", { class: "muted mono block" }, `ID ${ad.id}`),
          ),
        ),
        h("button", { class: "btn small", onclick: closeDetail, "aria-label": "Cerrar" }, "✕"),
      ),
      h(
        "div",
        { class: "row wrap" },
        favButton(ad, false),
        followButton({ pageId: ad.pageId, name: ad.pageName }),
        h("a", { class: "btn", href: adLibraryUrl(ad.id), target: "_blank", rel: "noopener" }, "Ver en la Biblioteca", icon("ext", 13)),
        ad.linkUrl ? h("a", { class: "btn", href: ad.linkUrl, target: "_blank", rel: "noopener noreferrer nofollow" }, "Abrir landing", icon("ext", 13)) : null,
        ad.landingKey ? h("button", { class: "btn", onclick: () => filterBy({ landing: ad.landingKey! }) }, icon("branch", 14), "Misma landing") : null,
        text ? copyButton(text) : null,
      ),
      ad.partial ? h("p", { class: "warn" }, "Datos parciales leídos de la tarjeta visible. Vuelve a guardarlo desde la Biblioteca para completarlo.") : null,
      h(
        "div",
        { class: "detail" },
        h(
          "div",
          { class: "stack" },
          gallery,
          h(
            "section",
            { class: "card pad" },
            ad.title ? h("h3", null, ad.title) : null,
            h("p", { class: "pre" }, ad.body ?? "La fuente no entregó texto para este anuncio."),
            ad.linkDescription ? h("p", { class: "muted" }, ad.linkDescription) : null,
            h("div", { class: "chips" }, ad.ctaText ? chip(`Botón: ${ad.ctaText}`) : null, ad.price ? chip(`Precio: ${ad.price.text}`, "chip-price") : null, ad.offers.map((o) => chip(o, "chip-warn"))),
            ad.linkUrl
              ? h("p", { class: "small" }, "Destino: ", h("a", { href: ad.linkUrl, target: "_blank", rel: "noopener noreferrer nofollow", class: "break" }, ad.linkUrl))
              : ad.landingDomain
                ? h("p", { class: "muted small" }, `Destino: ${ad.landingDomain} (dominio visible)`)
                : null,
          ),
        ),
        h(
          "div",
          { class: "stack" },
          statsRow(ad),
          h(
            "section",
            { class: "card pad" },
            h("div", { class: "row between" }, h("div", null, h("div", { class: "strong" }, "Puntuación de oportunidad"), h("small", { class: "muted" }, `${tier.label} · orientativa`)), scoreBadge(ad.score, true)),
            h(
              "ul",
              { class: "signals" },
              ad.scoreBreakdown.map((s) =>
                h(
                  "li",
                  null,
                  h("div", { class: "row between" }, h("span", { class: "strong" }, s.label), h("span", { class: "muted" }, `${s.points} / ${s.max}`)),
                  h("div", { class: "bar" }, h("i", { style: `width:${Math.min(100, (s.points / s.max) * 100)}%` })),
                  h("small", null, s.observed),
                  h("small", { class: "muted block" }, s.explanation),
                ),
              ),
            ),
            h("p", { class: "warn" }, SCORE_DISCLAIMER),
          ),
          h(
            "section",
            { class: "card pad" },
            h(
              "dl",
              { class: "facts" },
              fact("Estado", ad.isActive ? "Activo" : "Inactivo"),
              fact("Empezó a circular", fmtDate(ad.startDate)),
              !ad.isActive && ad.stopDate ? fact("Dejó de circular", fmtDate(ad.stopDate)) : null,
              fact("Días activo", fmtDays(ad.days)),
              fact("Copias activas", `${fmtNum(ad.copies)} ${ad.copies === 1 ? "anuncio" : "anuncios"} con esta creatividad`),
              fact("Variantes", `${fmtNum(ad.variantsCount)} hacia el mismo destino`),
              fact("Plataformas", ad.platforms.map((p) => PLATFORM_LABELS[p]?.label ?? p).join(", ") || "—"),
              fact("Países", ad.countries.map(countryName).join(", ") || "—"),
              fact("Idioma", ad.language ? (LANGUAGE_NAMES[ad.language] ?? ad.language.toUpperCase()) : "—"),
              fact("Formato", FORMAT_LABELS[ad.format] ?? ad.format),
              fact("Destino", DEST_LABELS[ad.dest]),
              ad.impressionRank
                ? fact("Ranking de impresiones", `#${ad.impressionRank} en «${ad.impressionQuery ?? ""}»${ad.impressionCountry ? ` (${countryName(ad.impressionCountry)})` : ""} · ${timeAgo(ad.impressionAt)}`)
                : null,
              fact("Nichos", ad.nicheList.length ? ad.nicheList.map((n) => nicheLabel(n)).join(", ") : "Sin clasificar"),
              ad.nicheTerms.length ? fact("Señales del nicho", ad.nicheTerms.slice(0, 5).join(", ")) : null,
              ad.queries?.length ? fact("Encontrado en búsquedas", ad.queries.join(", ")) : null,
              fact("Primera vez visto", fmtDate(ad.firstSeenAt)),
              fact("Última verificación", timeAgo(ad.lastSeenAt)),
            ),
          ),
        ),
      ),
    ),
  );
  document.body.append(modal);
  document.body.classList.add("no-scroll");
}

// ── Estructura ─────────────────────────────────────────────────────────────

const NAV: Array<[Screen, string, Parameters<typeof icon>[0]]> = [
  ["discover", "Descubrir", "compass"],
  ["advertisers", "Anunciantes", "store"],
  ["following", "Siguiendo", "radar"],
  ["search", "Buscar", "search"],
  ["studio", "Studio", "sparkle"],
  ["favorites", "Favoritos", "heart"],
];

const studioHost = {
  favorites: () => state.ads.filter((a) => a.fav),
  store: () => state.store!,
  rerender: () => render(),
};

function screenView() {
  switch (state.screen) {
    case "discover":
      return discoverView();
    case "advertisers":
      return advertisersView();
    case "advertiser":
      return advertiserView();
    case "following":
      return followingView();
    case "search":
      return searchView();
    case "studio":
      return studioView(studioHost);
    case "favorites":
      return favoritesView();
    default:
      return dataView();
  }
}

function render() {
  const root = document.getElementById("app")!;
  // Conserva el foco y el cursor del campo en el que se escribe (la vista se redibuja entera).
  const focused = document.activeElement as HTMLInputElement | null;
  const key = focused?.getAttribute?.("data-key") ?? null;
  const sel = key && typeof focused?.selectionStart === "number" ? [focused.selectionStart, focused.selectionEnd ?? focused.selectionStart] : null;
  const current = state.screen === "advertiser" ? "advertisers" : state.screen;
  root.replaceChildren(
    h(
      "header",
      { class: "top" },
      h("button", { class: "brand", onclick: () => go("discover"), "aria-label": "Inicio" }, h("img", { src: "icons/icon48.png", alt: "", width: 26, height: 26 }), h("span", null, "Cifra"), h("small", null, "Radar")),
      h(
        "nav",
        null,
        NAV.map(([s, label, ic]) =>
          h(
            "button",
            { class: `tab${current === s ? " active" : ""}`, onclick: () => go(s) },
            icon(ic, 15),
            h("span", null, label),
            s === "favorites" && state.favorites.size ? h("span", { class: "count" }, String(state.favorites.size)) : null,
            s === "following" && state.follows.size ? h("span", { class: "count" }, String(state.follows.size)) : null,
          ),
        ),
      ),
      h(
        "div",
        { class: "top-right" },
        updatePill(),
        h("button", { class: `icon-btn${state.screen === "data" ? " active" : ""}`, title: "Tus datos", "aria-label": "Tus datos", onclick: () => go("data") }, icon("gear", 17)),
      ),
    ),
    ...(state.notice && !state.update?.running
      ? [h("div", { class: "notice" }, h("span", null, state.notice), h("button", { class: "link-btn", onclick: () => { state.notice = ""; render(); } }, "Cerrar"))]
      : []),
    h("main", null, screenView()),
    h("footer", { class: "muted small" }, "Datos públicos de la Biblioteca de Anuncios de Meta, guardados solo en tu navegador. Las puntuaciones son orientativas y no reflejan ventas ni rentabilidad."),
  );
  if (key) {
    const el = root.querySelector<HTMLInputElement>(`[data-key="${key}"]`);
    if (el) {
      el.focus();
      try {
        if (sel) el.setSelectionRange(sel[0]!, sel[1]!);
      } catch {
        /* campos sin selección de texto */
      }
    }
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetail();
});

(async () => {
  state.store = await LocalStore.open();
  // Aplica mejoras de clasificación de versiones nuevas a los anuncios ya guardados.
  const DATA_VERSION = "5";
  try {
    if (localStorage.getItem("cifra-data-version") !== DATA_VERSION) {
      await state.store.reindex();
      localStorage.setItem("cifra-data-version", DATA_VERSION);
    }
  } catch {
    /* sin localStorage: se reintenta en la próxima apertura */
  }
  try {
    const saved = await chrome.storage.local.get(["discoveryCountry", "discoveryQueries", "queriesVersion", "lastUpdate"]);
    if (saved.discoveryCountry) state.radar.country = saved.discoveryCountry;
    // Las listas guardadas antes de los 45 nichos se reemplazan por la nueva.
    if (saved.queriesVersion === 2 && Array.isArray(saved.discoveryQueries) && saved.discoveryQueries.length) state.radar.queries = saved.discoveryQueries.join("\n");
    if (typeof saved.lastUpdate === "string") state.lastUpdate = saved.lastUpdate;
    state.searchLeft = await searchesLeft();
  } catch {
    /* fuera de la extensión (pruebas) */
  }
  if (location.hash.slice(1) && NAV.some(([s]) => s === location.hash.slice(1))) state.screen = location.hash.slice(1) as Screen;
  await state.store.purge();
  await state.store.recompute();
  await load();
  // La extensión avisa cuando guarda nuevas capturas (p. ej. al guardar desde la Biblioteca).
  try {
    chrome.runtime.onMessage.addListener((msg: { type?: string }) => {
      if (msg?.type === "radar:updated" && !busy()) void load();
    });
  } catch {
    /* fuera de la extensión (pruebas) */
  }
})();
