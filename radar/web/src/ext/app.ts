/**
 * Explorador del modo local (página de la extensión: app.html).
 * Todo el texto de los anuncios se inserta como texto (nunca como HTML).
 */
import { daysActive } from "../lib/dates";
import { fmtDate, fmtDays, fmtNum, FORMAT_LABELS, libraryPageUrl, PLATFORM_LABELS, timeAgo } from "../lib/format";
import { LANGUAGE_NAMES } from "../lib/lang";
import type { AdRecord, AdvertiserRecord } from "../lib/merge";
import { nicheLabel } from "../lib/niche/catalog";
import { SCORE_DISCLAIMER, scoreTier } from "../lib/scoring";
import { countryName } from "../lib/sources/countries";
import { normalizeText, truncate } from "../lib/text";
import type { MediaItem } from "../lib/types";
import { DEFAULT_QUERIES, DISCOVERY_COUNTRIES, MAX_PER_HOUR, blockedMessage, runDiscovery, runSearchJob, searchesLeft, type DiscoveryProgress } from "./discovery";
import { LocalStore, RETENTION_DAYS, type Favorite, type LogEntry } from "./store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, string | number | boolean | null | undefined | ((e: Event) => void)>;

// Solo http(s), páginas de la propia extensión o rutas relativas (nunca javascript:, data:, etc.).
const SAFE_URL = /^(https?:|chrome-extension:|(?![a-z][a-z0-9+.-]*:))/i;

function h(tag: string, attrs: Attrs | null, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === "function") el.addEventListener(k.replace(/^on/, ""), v as EventListener);
    // Los navegadores ignoran espacios y caracteres de control en las URLs: se quitan antes de validar.
    else if ((k === "href" || k === "src" || k === "poster") && !SAFE_URL.test(String(v).replace(/[\u0000-\u0020\u007f]/g, ""))) continue;
    else if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  const add = (c: Child) => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  children.forEach(add);
  return el;
}

const LIBRARY_HOME = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&media_type=all";

interface View extends AdRecord {
  days: number | null;
  fav: boolean;
  advActive: number;
  avatar: string | null;
  search: string;
}

type Tab = "discover" | "ads" | "advertisers" | "landings" | "favorites" | "data";

const state = {
  store: null as LocalStore | null,
  ads: [] as View[],
  advertisers: new Map<string, AdvertiserRecord>(),
  favorites: new Map<string, Favorite>(),
  log: [] as LogEntry[],
  tab: "discover" as Tab,
  country: "CO",
  queries: DEFAULT_QUERIES.join("\n"),
  searchLeft: MAX_PER_HOUR,
  disc: null as DiscoveryProgress | null,
  cancel: false,
  live: { q: "", running: false, message: "" },
  limit: 60,
  f: {
    q: "",
    status: "active",
    niche: "",
    country: "",
    platform: "",
    format: "",
    offer: "",
    minDays: "",
    minScore: "",
    pageId: "",
    landing: "",
    query: "",
    sort: "longest",
  },
  advQuery: "",
  landingQuery: "",
};

const SORTS: Record<string, { label: string; fn: (a: View, b: View) => number }> = {
  longest: { label: "Más días activos", fn: (a, b) => (b.days ?? -1) - (a.days ?? -1) || b.score - a.score },
  score: { label: "Mayor puntuación", fn: (a, b) => b.score - a.score || (b.days ?? -1) - (a.days ?? -1) },
  newest: { label: "Más recientes", fn: (a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "") },
  variants: { label: "Más variantes", fn: (a, b) => (b.collationCount ?? 1) - (a.collationCount ?? 1) || b.score - a.score },
  advertiser: { label: "Anunciantes con más anuncios", fn: (a, b) => b.advActive - a.advActive || b.score - a.score },
  seen: { label: "Vistos recientemente", fn: (a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt) },
};

async function load() {
  const store = state.store!;
  const [ads, advs, favs, log] = await Promise.all([store.allAds(), store.allAdvertisers(), store.favorites(), store.log(15)]);
  state.advertisers = new Map(advs.map((a) => [a.pageId, a]));
  state.favorites = favs;
  state.log = log;
  state.ads = ads.map((a) => {
    const adv = state.advertisers.get(a.pageId);
    return {
      ...a,
      days: daysActive(a.startDate, { isActive: a.isActive, stopDate: a.stopDate, lastSeenAt: a.lastSeenAt }),
      fav: favs.has(a.id),
      advActive: adv?.activeAds ?? 0,
      avatar: adv?.avatarUrl ?? null,
      search: normalizeText([a.pageName, a.title, a.body, a.linkDescription, a.caption, a.landingKey].filter(Boolean).join(" ")),
    };
  });
  render();
}

function filtered(): View[] {
  const f = state.f;
  const terms = normalizeText(f.q).split(" ").filter((t) => t.length >= 2);
  const minDays = Number(f.minDays) || 0;
  const minScore = Number(f.minScore) || 0;
  return state.ads
    .filter((a) => {
      if (a.isManual) return false;
      if (f.status === "active" && !a.isActive) return false;
      if (f.status === "inactive" && a.isActive) return false;
      if (f.niche && (f.niche === "none" ? a.niche : a.niche !== f.niche)) return false;
      if (f.country && !a.countries.includes(f.country)) return false;
      if (f.platform && !a.platforms.includes(f.platform as never)) return false;
      if (f.format && a.format !== f.format) return false;
      if (f.offer && !a.offers.includes(f.offer)) return false;
      if (minDays && (a.days ?? 0) < minDays) return false;
      if (minScore && a.score < minScore) return false;
      if (f.pageId && a.pageId !== f.pageId) return false;
      if (f.landing && a.landingKey !== f.landing) return false;
      if (f.query && !(a.queries ?? []).includes(f.query)) return false;
      return terms.every((t) => a.search.includes(t));
    })
    .sort(SORTS[f.sort]?.fn ?? SORTS.longest!.fn);
}

function facet<T extends string>(values: Array<T | null | undefined>): Array<[T, number]> {
  const m = new Map<T, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

// ── Componentes ────────────────────────────────────────────────────────────

function avatar(name: string, url: string | null, size = 32) {
  return url
    ? h("img", { class: "avatar", src: url, alt: "", width: size, height: size, referrerpolicy: "no-referrer", style: `width:${size}px;height:${size}px` })
    : h("span", { class: "avatar avatar-letter", style: `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px` }, name.trim().charAt(0).toUpperCase() || "?");
}

function scoreBadge(score: number, big = false) {
  const tier = scoreTier(score);
  return h("span", { class: `score score-${tier.tone}${big ? " score-big" : ""}`, title: `Puntuación orientativa: ${tier.label}` }, String(score), h("small", null, "/100"));
}

function mediaThumb(media: MediaItem[], libraryUrl: string) {
  const first = media[0];
  const src = first ? (first.type === "video" ? first.preview : first.url) : null;
  const placeholder = () =>
    h("div", { class: "thumb thumb-empty" }, first ? "La creatividad expiró: ábrela en la Biblioteca." : "Creatividad disponible en la Biblioteca");
  if (!first || !src) return placeholder();
  const img = h("img", { src, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
  img.addEventListener("error", () => wrap.replaceWith(placeholder()));
  const wrap = h(
    "div",
    { class: "thumb" },
    img,
    first.type === "video" ? h("span", { class: "thumb-tag" }, "▶ Video") : null,
    media.length > 1 ? h("span", { class: "thumb-tag thumb-tag-right" }, `${media.length} piezas`) : null,
  );
  void libraryUrl;
  return wrap;
}

function favButton(ad: View, compact = true) {
  const btn = h("button", { class: `fav${ad.fav ? " on" : ""}${compact ? "" : " btn"}`, title: ad.fav ? "Quitar de favoritos" : "Guardar en favoritos", "aria-pressed": String(ad.fav) }, ad.fav ? "★" : "☆", compact ? null : ad.fav ? " En favoritos" : " Favorito");
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await state.store!.setFavorite(ad.id, !ad.fav);
    await load();
    if (document.querySelector(".modal")) openDetail(ad.id);
  });
  return btn;
}

const libraryUrl = (id: string) => `https://www.facebook.com/ads/library/?id=${encodeURIComponent(id)}`;

function chip(text: string, cls = "") {
  return h("span", { class: `chip ${cls}` }, text);
}

function card(ad: View) {
  return h(
    "article",
    { class: "card ad", onclick: () => openDetail(ad.id) },
    h(
      "div",
      { class: "ad-head" },
      avatar(ad.pageName, ad.avatar),
      h(
        "div",
        { class: "ad-head-text" },
        h("a", { href: "#", class: "strong", onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); filterBy({ pageId: ad.pageId }); } }, ad.pageName),
        h("small", null, `${ad.advActive} ${ad.advActive === 1 ? "anuncio activo" : "anuncios activos"}`),
      ),
      favButton(ad),
    ),
    mediaThumb(ad.media, libraryUrl(ad.id)),
    h(
      "div",
      { class: "ad-body" },
      h(
        "div",
        { class: "row between" },
        h("div", null, h("div", { class: "days" }, fmtDays(ad.days)), h("small", null, `${ad.isActive ? "activo" : "circuló"} · desde ${fmtDate(ad.startDate)}`)),
        scoreBadge(ad.score),
      ),
      ad.title ? h("p", { class: "strong" }, truncate(ad.title, 90)) : null,
      h("p", { class: "muted clamp" }, ad.body ? truncate(ad.body, 260) : "Sin texto disponible."),
      h(
        "div",
        { class: "chips" },
        ad.niche ? chip(nicheLabel(ad.niche), "chip-accent") : null,
        chip(FORMAT_LABELS[ad.format] ?? ad.format),
        (ad.collationCount ?? 1) > 1 ? chip(`${ad.collationCount} copias activas`, "chip-strong") : null,
        ad.platforms.map((p) => chip(PLATFORM_LABELS[p]?.short ?? p)),
        ad.countries.slice(0, 3).map((c) => chip(c)),
        ad.partial ? chip("Parcial", "chip-warn") : null,
      ),
      ad.landingKey
        ? h("a", { href: "#", class: "landing", onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); filterBy({ landing: ad.landingKey! }); } }, `→ ${ad.landingKey}`)
        : h("small", { class: "muted" }, "Sin landing identificada"),
    ),
  );
}

function filterBy(patch: Partial<typeof state.f>) {
  state.f = { ...state.f, pageId: "", landing: "", query: "", ...patch, status: patch.pageId || patch.landing || patch.query ? "all" : state.f.status };
  state.tab = "ads";
  state.limit = 60;
  closeDetail();
  render();
  window.scrollTo({ top: 0 });
}

function select(label: string, value: string, options: Array<[string, string]>, onChange: (v: string) => void, any = "Todos") {
  const s = h("select", null, h("option", { value: "" }, any), options.map(([v, l]) => h("option", { value: v, selected: v === value }, l))) as HTMLSelectElement;
  s.value = value;
  s.addEventListener("change", () => onChange(s.value));
  return h("label", { class: "field" }, h("span", null, label), s);
}

// ── Vistas ─────────────────────────────────────────────────────────────────

function emptyState() {
  return h(
    "section",
    { class: "card empty" },
    h("h2", null, "Tu radar está vacío"),
    h("p", { class: "muted" }, "Cifra Radar guarda anuncios reales de la Biblioteca de Anuncios de Meta. Nunca muestra anuncios inventados."),
    h("p", null, "Ve a «Descubrir» y pulsa «Llenar mi radar»: Cifra Radar buscará por ti en la Biblioteca de Anuncios y categorizará lo que encuentre."),
    h(
      "div",
      { class: "row wrap center-row" },
      h("button", { class: "btn btn-primary", onclick: () => { state.tab = "discover"; render(); } }, "Ir a Descubrir"),
      h("a", { class: "btn", href: LIBRARY_HOME, target: "_blank", rel: "noopener" }, "Abrir la Biblioteca de Anuncios"),
    ),
    h("p", { class: "muted small" }, "También puedes buscar tú en la Biblioteca y pulsar «Guardar en Cifra Radar» en el panel de abajo a la derecha."),
  );
}

function adsView() {
  if (!state.ads.filter((a) => !a.isManual).length) return emptyState();
  const f = state.f;
  const list = filtered();
  const base = state.ads.filter((a) => !a.isManual);
  const set = (k: keyof typeof state.f) => (v: string) => {
    state.f = { ...state.f, [k]: v };
    state.limit = 60;
    render();
  };
  const search = h("input", { type: "search", placeholder: "Busca por texto, producto, anunciante o dominio…", value: f.q, class: "search" }) as HTMLInputElement;
  let timer: number | undefined;
  search.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.f.q = search.value;
      state.limit = 60;
      renderResults();
    }, 200);
  });

  const filters = h(
    "div",
    { class: "filters" },
    select("Estado", f.status === "active" ? "" : f.status, [["all", "Activos e inactivos"], ["inactive", "Inactivos"]], (v) => set("status")(v || "active"), "Activos"),
    select("Nicho", f.niche, facet(base.map((a) => a.niche ?? "none")).map(([v, n]) => [v, `${nicheLabel(v === "none" ? null : v)} (${n})`]), set("niche")),
    select("País", f.country, facet(base.flatMap((a) => a.countries)).map(([v, n]) => [v, `${countryName(v)} (${n})`]), set("country")),
    select("Plataforma", f.platform, facet(base.flatMap((a) => a.platforms as string[])).map(([v, n]) => [v, `${PLATFORM_LABELS[v]?.label ?? v} (${n})`]), set("platform")),
    select("Formato", f.format, facet(base.map((a) => a.format as string)).map(([v, n]) => [v, `${FORMAT_LABELS[v] ?? v} (${n})`]), set("format")),
    select("Oferta", f.offer, facet(base.flatMap((a) => a.offers)).map(([v, n]) => [v, `${v} (${n})`]), set("offer"), "Cualquiera"),
    select("Días activos", f.minDays, [7, 14, 30, 60, 90, 180].map((d) => [String(d), `${d}+ días`]), set("minDays"), "Cualquiera"),
    select("Puntuación", f.minScore, [40, 55, 70, 85].map((d) => [String(d), `${d}+`]), set("minScore"), "Cualquiera"),
    select("Búsqueda", f.query, facet(base.flatMap((a) => a.queries ?? [])).map(([v, n]) => [v, `«${v}» (${n})`]), set("query"), "Todas"),
  );

  const sort = select("Ordenar", f.sort, Object.entries(SORTS).map(([k, s]) => [k, s.label]), set("sort"), "—");
  const active = f.pageId || f.landing || f.query;
  return h(
    "div",
    null,
    h("div", { class: "toolbar" }, search, sort),
    filters,
    active
      ? h(
          "p",
          { class: "muted" },
          f.pageId ? `Anunciante: ${state.advertisers.get(f.pageId)?.name ?? f.pageId}. ` : "",
          f.landing ? `Landing: ${f.landing}. ` : "",
          f.query ? `Búsqueda: «${f.query}». ` : "",
          h("a", { href: "#", onclick: (e: Event) => { e.preventDefault(); state.f = { ...state.f, pageId: "", landing: "", query: "" }; render(); } }, "Quitar"),
        )
      : null,
    h("div", { id: "results" }, resultsBlock(list)),
  );
}

function resultsBlock(list: View[]) {
  const shown = list.slice(0, state.limit);
  return h(
    "div",
    null,
    h("p", { class: "muted" }, `${fmtNum(list.length)} ${list.length === 1 ? "anuncio" : "anuncios"} · ${SORTS[state.f.sort]?.label.toLowerCase()}`),
    shown.length
      ? h("div", { class: "grid" }, shown.map(card))
      : h("div", { class: "card empty" }, "Ningún anuncio coincide con estos filtros."),
    list.length > shown.length
      ? h("button", { class: "btn more", onclick: () => { state.limit += 60; renderResults(); } }, `Mostrar más (${fmtNum(list.length - shown.length)} restantes)`)
      : null,
  );
}

function renderResults() {
  const box = document.getElementById("results");
  if (box) box.replaceChildren(resultsBlock(filtered()));
}

function advertisersView() {
  const rows = Array.from(state.advertisers.values())
    .filter((a) => !state.advQuery || normalizeText(a.name).includes(normalizeText(state.advQuery)))
    .map((a) => {
      const ads = state.ads.filter((x) => x.pageId === a.pageId && x.isActive);
      const oldest = ads.reduce<number | null>((m, x) => (x.days !== null && (m === null || x.days > m) ? x.days : m), null);
      const avg = ads.length ? Math.round(ads.reduce((s, x) => s + x.score, 0) / ads.length) : 0;
      return { a, oldest, avg };
    })
    .sort((x, y) => y.a.activeAds - x.a.activeAds || (y.oldest ?? 0) - (x.oldest ?? 0));
  const q = h("input", { type: "search", class: "search", placeholder: "Buscar anunciante", value: state.advQuery }) as HTMLInputElement;
  q.addEventListener("change", () => { state.advQuery = q.value; render(); });
  return h(
    "div",
    null,
    h("div", { class: "toolbar" }, q),
    h("p", { class: "muted" }, `${fmtNum(rows.length)} anunciantes, ordenados por anuncios activos al mismo tiempo.`),
    h(
      "div",
      { class: "card list" },
      rows.map(({ a, oldest, avg }) =>
        h(
          "div",
          { class: "list-row", onclick: () => filterBy({ pageId: a.pageId }) },
          avatar(a.name, a.avatarUrl, 40),
          h("div", { class: "grow" }, h("div", { class: "strong" }, a.name), h("small", { class: "muted" }, nicheLabel(a.mainNiche))),
          h("div", { class: "stat" }, h("b", null, fmtNum(a.activeAds)), h("small", null, "activos")),
          h("div", { class: "stat" }, h("b", null, fmtNum(a.landingCount)), h("small", null, a.landingCount === 1 ? "landing" : "landings")),
          h("div", { class: "stat" }, h("b", null, fmtDays(oldest)), h("small", null, "más antiguo")),
          scoreBadge(avg),
          libraryPageUrl(a.pageId)
            ? h("a", { href: libraryPageUrl(a.pageId)!, target: "_blank", rel: "noopener", class: "btn small", onclick: (e: Event) => e.stopPropagation() }, "Biblioteca ↗")
            : null,
        ),
      ),
    ),
  );
}

function landingsView() {
  const groups = new Map<string, View[]>();
  for (const a of state.ads) if (a.landingKey && !a.isManual) groups.set(a.landingKey, [...(groups.get(a.landingKey) ?? []), a]);
  const rows = Array.from(groups.entries())
    .filter(([k, list]) => !state.landingQuery || k.includes(state.landingQuery.toLowerCase()) || list.some((a) => normalizeText(a.pageName).includes(normalizeText(state.landingQuery))))
    .map(([key, list]) => ({
      key,
      list,
      active: list.filter((a) => a.isActive).length,
      advertisers: Array.from(new Set(list.map((a) => a.pageName))),
      maxDays: list.reduce<number | null>((m, a) => (a.days !== null && (m === null || a.days > m) ? a.days : m), null),
      best: Math.max(...list.map((a) => a.score)),
      url: list.find((a) => a.linkUrl)?.linkUrl ?? null,
      sample: list.find((a) => a.media.length) ?? list[0]!,
    }))
    .sort((a, b) => b.list.length - a.list.length || b.active - a.active);
  const q = h("input", { type: "search", class: "search", placeholder: "Dominio, ruta o anunciante", value: state.landingQuery }) as HTMLInputElement;
  q.addEventListener("change", () => { state.landingQuery = q.value; render(); });
  return h(
    "div",
    null,
    h("div", { class: "toolbar" }, q),
    h("p", { class: "muted" }, "Anuncios agrupados por la página a la que dirigen, sin parámetros de seguimiento."),
    h(
      "div",
      { class: "grid grid-wide" },
      rows.map((g) =>
        h(
          "article",
          { class: "card landing-card", onclick: () => filterBy({ landing: g.key }) },
          h("div", { class: "landing-thumb" }, mediaThumb(g.sample.media, libraryUrl(g.sample.id))),
          h(
            "div",
            { class: "grow" },
            h("div", { class: "strong break" }, g.key),
            h("small", { class: "muted" }, g.advertisers.slice(0, 4).join(", ")),
            h(
              "div",
              { class: "chips" },
              chip(`${g.list.length} anuncios`),
              chip(`${g.active} activos`),
              chip(`${g.advertisers.length} ${g.advertisers.length === 1 ? "anunciante" : "anunciantes"}`),
              chip(`máx. ${fmtDays(g.maxDays)}`),
              scoreBadge(g.best),
            ),
            g.url ? h("a", { href: g.url, target: "_blank", rel: "noopener noreferrer nofollow", class: "small-link", onclick: (e: Event) => e.stopPropagation() }, "Abrir landing ↗") : null,
          ),
        ),
      ),
    ),
    rows.length ? null : h("div", { class: "card empty" }, "Aún no hay landing pages identificadas."),
  );
}

function favoritesView() {
  const list = state.ads.filter((a) => a.fav).sort(SORTS.longest!.fn);
  return h(
    "div",
    null,
    h("p", { class: "muted" }, `${fmtNum(list.length)} anuncios guardados. Los favoritos no se borran por la retención.`),
    list.length ? h("div", { class: "grid" }, list.map(card)) : h("div", { class: "card empty" }, "Usa la estrella de cualquier anuncio para guardarlo aquí."),
  );
}

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
      say(`Importado (${r.kind}): ${fmtNum(r.count)} anuncios.`);
      await load();
    } catch (e) {
      say(`No se pudo importar: ${(e as Error).message}`);
    }
  });
  return h(
    "div",
    { class: "stack" },
    h(
      "section",
      { class: "card pad" },
      h("h2", null, "Tus datos"),
      h("p", null, `${fmtNum(total)} anuncios (${fmtNum(active)} activos) de ${fmtNum(state.advertisers.size)} anunciantes, guardados solo en este Chrome.`),
      h(
        "p",
        { class: "muted" },
        `Las creatividades no se descargan: se guardan sus enlaces originales, que Meta hace expirar. Los anuncios no favoritos que no se vuelven a ver en ${RETENTION_DAYS} días se borran solos.`,
      ),
      h(
        "div",
        { class: "row wrap" },
        h("button", {
          class: "btn btn-primary",
          onclick: async () => {
            const data = await state.store!.exportAll();
            const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
            const a = h("a", { href: url, download: `cifra-radar-${new Date().toISOString().slice(0, 10)}.json` });
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            say("Respaldo descargado. Puedes importarlo en otro Chrome o en la plataforma web.");
          },
        }, "Descargar respaldo (JSON)"),
        h("label", { class: "btn" }, "Importar archivo JSON", file),
        h("button", { class: "btn", onclick: async () => { const n = await state.store!.recompute(); say(`Puntuaciones recalculadas para ${n} anunciantes.`); await load(); } }, "Recalcular puntuaciones"),
        h("button", {
          class: "btn danger",
          onclick: async () => {
            if (!confirm("¿Borrar todos los anuncios, anunciantes y favoritos guardados en este Chrome?")) return;
            await state.store!.clear();
            say("Datos borrados.");
            await load();
          },
        }, "Borrar todo"),
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
              state.log.map((l) =>
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

// ── Descubrir ──────────────────────────────────────────────────────────────

function countrySelect() {
  const s = h(
    "select",
    { class: "inline-select", "aria-label": "País" },
    DISCOVERY_COUNTRIES.map((c) => h("option", { value: c, selected: c === state.country }, countryName(c))),
  ) as HTMLSelectElement;
  s.value = state.country;
  s.addEventListener("change", () => {
    state.country = s.value;
    chrome.storage.local.set({ discoveryCountry: s.value }).catch(() => {});
  });
  return s;
}

async function startLiveSearch(q: string) {
  q = q.trim();
  if (!q || state.live.running || state.disc?.running) return;
  if ((await searchesLeft()) <= 0) {
    state.live.message = `Llegaste al límite de ${MAX_PER_HOUR} búsquedas por hora. Continúa más tarde.`;
    render();
    return;
  }
  state.live = { q, running: true, message: `Buscando «${q}» en la Biblioteca de ${countryName(state.country)}…` };
  render();
  const r = await runSearchJob(q, state.country, 3);
  await load();
  state.live = {
    q,
    running: false,
    message: r.blocked ? blockedMessage(r.blocked) : r.detected ? `«${q}»: ${r.created} nuevos y ${r.updated} actualizados.` : `«${q}»: ${r.error ?? "no se encontraron anuncios"}.`,
  };
  state.searchLeft = await searchesLeft();
  if (r.detected && !r.blocked) filterBy({ query: q.toLowerCase() });
  else render();
}

async function startDiscovery() {
  if (state.disc?.running || state.live.running) return;
  const queries = state.queries.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  chrome.storage.local.set({ discoveryQueries: queries }).catch(() => {});
  state.cancel = false;
  await runDiscovery(
    queries,
    state.country,
    async (p) => {
      state.disc = p;
      state.searchLeft = await searchesLeft();
      await load();
    },
    () => state.cancel,
  );
  try {
    localStorage.setItem("cifra-last-discovery", new Date().toISOString());
  } catch {
    /* sin almacenamiento */
  }
  await load();
}

function nicheCards() {
  const base = state.ads.filter((a) => !a.isManual && a.isActive);
  const groups = new Map<string, View[]>();
  for (const a of base) groups.set(a.niche ?? "none", [...(groups.get(a.niche ?? "none") ?? []), a]);
  const list = Array.from(groups.entries()).sort((a, b) => (a[0] === "none" ? 1 : b[0] === "none" ? -1 : b[1].length - a[1].length));
  return h(
    "div",
    { class: "niche-grid" },
    list.map(([niche, ads]) => {
      const top = [...ads].sort(SORTS.score!.fn);
      const thumbs = top.filter((a) => a.media[0]).slice(0, 3);
      return h(
        "article",
        { class: "card niche-card", onclick: () => filterBy({ niche }) },
        h("div", { class: "niche-thumbs" }, thumbs.map((a) => mediaThumb(a.media, libraryUrl(a.id)))),
        h(
          "div",
          { class: "niche-body" },
          h("div", { class: "strong" }, nicheLabel(niche === "none" ? null : niche)),
          h("small", { class: "muted" }, `${fmtNum(ads.length)} anuncios activos · ${fmtNum(new Set(ads.map((a) => a.pageId)).size)} anunciantes`),
        ),
      );
    }),
  );
}

function row(title: string, list: View[], more: () => void) {
  if (!list.length) return null;
  return h(
    "section",
    { class: "stack" },
    h("div", { class: "row between" }, h("h2", null, title), h("a", { href: "#", onclick: (e: Event) => { e.preventDefault(); more(); } }, "Ver todos →")),
    h("div", { class: "grid" }, list.map(card)),
  );
}

function discoverView() {
  const active = state.ads.filter((a) => !a.isManual && a.isActive);
  const busy = Boolean(state.disc?.running || state.live.running);
  const liveInput = h("input", { type: "search", class: "search", placeholder: "Palabra clave: producto, marca, oferta…", value: state.live.q }) as HTMLInputElement;
  liveInput.addEventListener("input", () => (state.live.q = liveInput.value));
  liveInput.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") void startLiveSearch(liveInput.value);
  });
  const queries = h("textarea", { class: "queries", rows: 6, "aria-label": "Búsquedas" }, state.queries) as HTMLTextAreaElement;
  queries.addEventListener("input", () => (state.queries = queries.value));
  const d = state.disc;
  let last: string | null = null;
  try {
    last = localStorage.getItem("cifra-last-discovery");
  } catch {
    /* sin almacenamiento */
  }
  const pct = d && d.total ? Math.round((d.done / d.total) * 100) : 0;

  return h(
    "div",
    { class: "stack" },
    h(
      "section",
      { class: "hero card pad" },
      h("h1", null, "Anuncios que están escalando"),
      h(
        "p",
        { class: "muted" },
        active.length
          ? `${fmtNum(active.length)} anuncios activos de ${fmtNum(new Set(active.map((a) => a.pageId)).size)} anunciantes, categorizados por nicho.`
          : "Llena tu radar con un clic: Cifra Radar busca por ti en la Biblioteca de Anuncios de Meta y categoriza lo que encuentra.",
      ),
      h(
        "div",
        { class: "toolbar" },
        liveInput,
        countrySelect(),
        h("button", { class: "btn btn-primary", disabled: busy, onclick: () => void startLiveSearch(liveInput.value) }, state.live.running ? "Buscando…" : "Buscar en la Biblioteca"),
      ),
      state.live.message ? h("p", { class: "muted" }, state.live.message) : null,
    ),
    h(
      "section",
      { class: "card pad" },
      h(
        "div",
        { class: "row between wrap" },
        h(
          "div",
          null,
          h("h2", null, "Llenar mi radar"),
          h("small", { class: "muted" }, `Una búsqueda por línea en ${countryName(state.country)}. ${last ? `Última actualización: ${timeAgo(last)}.` : "Aún no lo has llenado."}`),
        ),
        d?.running
          ? h("button", { class: "btn danger", onclick: () => { state.cancel = true; } }, "Detener")
          : h("button", { class: "btn btn-primary", disabled: busy, onclick: () => void startDiscovery() }, active.length ? "Actualizar mi radar" : "Llenar mi radar ahora"),
      ),
      d
        ? h(
            "div",
            { class: "progress" },
            h("div", { class: "bar" }, h("i", { style: `width:${d.running ? Math.max(4, pct) : 100}%` })),
            h(
              "p",
              { class: "muted" },
              d.running
                ? `Buscando «${d.current ?? ""}» (${d.done + 1} de ${d.total}) · ${fmtNum(d.created)} anuncios nuevos hasta ahora`
                : d.message,
            ),
          )
        : null,
      h("details", null, h("summary", null, "Editar búsquedas"), queries),
      h(
        "p",
        { class: "muted small" },
        `Cada búsqueda abre la Biblioteca en una pestaña de fondo de tu Chrome, guarda lo que carga y la cierra. Máximo ${MAX_PER_HOUR} búsquedas por hora (te quedan ${state.searchLeft}). Si Meta limita el acceso o pide iniciar sesión, se detiene sola.`,
      ),
    ),
    active.length ? h("section", { class: "stack" }, h("h2", null, "Categorías"), nicheCards()) : null,
    row("Escalando ahora", [...active].sort(SORTS.score!.fn).slice(0, 8), () => { state.f = { ...state.f, sort: "score" }; filterBy({}); }),
    row("Más copias activas", [...active].filter((a) => (a.collationCount ?? 1) > 1).sort(SORTS.variants!.fn).slice(0, 8), () => { state.f = { ...state.f, sort: "variants" }; filterBy({}); }),
    row("Más tiempo activos", [...active].sort(SORTS.longest!.fn).slice(0, 8), () => { state.f = { ...state.f, sort: "longest" }; filterBy({}); }),
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

function openDetail(id: string) {
  const ad = state.ads.find((a) => a.id === id);
  if (!ad) return;
  closeDetail();
  const gallery = ad.media.length
    ? h(
        "div",
        { class: ad.media.length > 1 ? "gallery two" : "gallery" },
        ad.media.map((m) =>
          m.type === "video"
            ? h("video", { src: m.url, poster: m.preview ?? undefined, controls: true, preload: "none" })
            : h("img", { src: m.url, alt: "", referrerpolicy: "no-referrer" }),
        ),
      )
    : h("div", { class: "thumb thumb-empty" }, "Sin creatividad guardada: ábrelo en la Biblioteca para verla.");
  const tier = scoreTier(ad.score);
  const modal = h(
    "div",
    { class: "modal", onclick: (e: Event) => { if (e.target === modal) closeDetail(); } },
    h(
      "div",
      { class: "modal-box", role: "dialog", "aria-modal": "true" },
      h(
        "header",
        { class: "row between modal-head" },
        h("div", { class: "row" }, avatar(ad.pageName, ad.avatar, 40), h("div", null, h("div", { class: "strong big" }, ad.pageName), h("small", { class: "muted mono" }, `ID ${ad.id}`))),
        h("button", { class: "btn small", onclick: closeDetail, "aria-label": "Cerrar" }, "✕"),
      ),
      h(
        "div",
        { class: "row wrap" },
        favButton(ad, false),
        h("a", { class: "btn", href: libraryUrl(ad.id), target: "_blank", rel: "noopener" }, "Ver en la Biblioteca ↗"),
        h("button", { class: "btn", onclick: () => filterBy({ pageId: ad.pageId }) }, "Más de este anunciante"),
        ad.landingKey ? h("button", { class: "btn", onclick: () => filterBy({ landing: ad.landingKey! }) }, "Misma landing page") : null,
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
            h("div", { class: "chips" }, ad.ctaText ? chip(`Botón: ${ad.ctaText}`) : null, ad.offers.map((o) => chip(o, "chip-warn"))),
            ad.linkUrl
              ? h("p", null, "Destino: ", h("a", { href: ad.linkUrl, target: "_blank", rel: "noopener noreferrer nofollow", class: "break" }, ad.linkUrl))
              : ad.landingDomain
                ? h("p", { class: "muted" }, `Destino: ${ad.landingDomain} (dominio visible)`)
                : null,
          ),
        ),
        h(
          "div",
          { class: "stack" },
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
              fact("Plataformas", ad.platforms.map((p) => PLATFORM_LABELS[p]?.label ?? p).join(", ") || "—"),
              fact("Países", ad.countries.map(countryName).join(", ") || "—"),
              fact("Idioma", ad.language ? (LANGUAGE_NAMES[ad.language] ?? ad.language.toUpperCase()) : "—"),
              fact("Formato", FORMAT_LABELS[ad.format] ?? ad.format),
              fact("Copias activas", ad.collationCount ? `${ad.collationCount} anuncios con esta creatividad` : "—"),
              ad.queries?.length ? fact("Encontrado en búsquedas", ad.queries.join(", ")) : null,
              fact("Nicho", `${nicheLabel(ad.niche)}${ad.nicheConfidence ? ` · ${Math.round(ad.nicheConfidence * 100)}%` : ""}`),
              ad.nicheTerms.length ? fact("Señales del nicho", ad.nicheTerms.slice(0, 5).join(", ")) : null,
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

const TABS: Array<[Tab, string]> = [
  ["discover", "Descubrir"],
  ["ads", "Anuncios"],
  ["advertisers", "Anunciantes"],
  ["landings", "Landing pages"],
  ["favorites", "Favoritos"],
  ["data", "Datos"],
];

function render() {
  const root = document.getElementById("app")!;
  const total = state.ads.filter((a) => !a.isManual);
  const view =
    state.tab === "discover"
      ? discoverView()
      : state.tab === "ads"
      ? adsView()
      : state.tab === "advertisers"
        ? advertisersView()
        : state.tab === "landings"
          ? landingsView()
          : state.tab === "favorites"
            ? favoritesView()
            : dataView();
  root.replaceChildren(
    h(
      "header",
      { class: "top" },
      h("div", { class: "brand" }, h("img", { src: "icons/icon48.png", alt: "", width: 28, height: 28 }), h("span", null, "Cifra ", h("b", null, "Radar"))),
      h(
        "nav",
        null,
        TABS.map(([t, label]) =>
          h(
            "button",
            { class: `tab${state.tab === t ? " active" : ""}`, onclick: () => { state.tab = t; render(); } },
            label,
            t === "favorites" && state.favorites.size ? h("span", { class: "count" }, String(state.favorites.size)) : null,
          ),
        ),
      ),
      h("div", { class: "muted small top-stats" }, `${fmtNum(total.filter((a) => a.isActive).length)} activos · ${fmtNum(state.advertisers.size)} anunciantes`),
    ),
    h("main", null, view),
    h("footer", { class: "muted small" }, "Datos públicos de la Biblioteca de Anuncios de Meta, guardados solo en tu navegador. Las puntuaciones son orientativas y no reflejan ventas ni rentabilidad."),
  );
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetail();
});

(async () => {
  state.store = await LocalStore.open();
  // Aplica mejoras de clasificación de versiones nuevas a los anuncios ya guardados.
  const DATA_VERSION = "3";
  try {
    if (localStorage.getItem("cifra-data-version") !== DATA_VERSION) {
      await state.store.reindex();
      localStorage.setItem("cifra-data-version", DATA_VERSION);
    }
  } catch {
    /* sin localStorage: se reintenta en la próxima apertura */
  }
  try {
    const saved = await chrome.storage.local.get(["discoveryCountry", "discoveryQueries"]);
    if (saved.discoveryCountry) state.country = saved.discoveryCountry;
    if (Array.isArray(saved.discoveryQueries) && saved.discoveryQueries.length) state.queries = saved.discoveryQueries.join("\n");
    state.searchLeft = await searchesLeft();
  } catch {
    /* fuera de la extensión (pruebas) */
  }
  await state.store.purge();
  await state.store.recompute();
  await load();
  // La extensión avisa cuando guarda nuevas capturas.
  try {
    chrome.runtime.onMessage.addListener((msg: { type?: string }) => {
      if (msg?.type === "radar:updated") void load();
    });
  } catch {
    /* fuera de la extensión (pruebas) */
  }
})();
