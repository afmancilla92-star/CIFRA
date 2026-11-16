/**
 * Actualización del radar en segundo plano (service worker de la extensión).
 *
 * Una «pasada» es una lista de búsquedas en la Biblioteca de Anuncios que se
 * ejecutan de una en una, en pestañas de fondo del propio Chrome del usuario,
 * aunque la pestaña del radar esté cerrada. El estado vive en
 * chrome.storage.local, así que sobrevive a reinicios del service worker y
 * del navegador. Reglas de cuidado:
 *   - máximo MAX_PER_HOUR búsquedas por hora (si se alcanza, espera y sigue);
 *   - pausa entre búsquedas, más larga si Meta limitó alguna consulta;
 *   - si Meta bloquea, se pausa una hora y reintenta una vez; si pide iniciar
 *     sesión o vuelve a bloquear, la pasada termina y se avisa.
 * La pasada automática se lanza cada 24 horas si el usuario la tiene activa.
 */
import { NICHES } from "../lib/niche/catalog";
import { nicheSeeds } from "../lib/niche/seeds";
import { advertiserLibraryUrl, blockedMessage, librarySearchUrl, MAX_PER_HOUR, nextSlotAt, noteSearch, searchesLeft } from "./discovery";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export const RUN_KEY = "radarRun";
export const SETTINGS_KEY = "radarSettings";
export const LAST_FULL_KEY = "radarLastFull";
export const ALARM = "radar-tick";

const DAY_MS = 86_400_000;
const GAP_MS = 8_000;
const LIMITED_GAP_MS = 25_000;
const JOB_TIMEOUT_MS = 100_000;
const BLOCK_PAUSE_MS = 60 * 60_000;

export interface RadarSettings {
  /** Lanza una pasada completa cada 24 horas. */
  auto: boolean;
  /** Búsquedas por nicho en cada pasada (1 a 3). */
  depth: number;
  /** Nichos que se repasan; null = todos. */
  niches: string[] | null;
  /** Palabras clave propias del usuario, además de los nichos. */
  extra: string[];
  country: string;
  /** Intenta cargar más resultados por búsqueda (más páginas de la misma búsqueda). */
  deep: boolean;
}

export const DEFAULT_SETTINGS: RadarSettings = { auto: true, depth: 2, niches: null, extra: [], country: "ALL", deep: true };

export interface RunItem {
  label: string;
  url: string;
  /** Palabra clave (vacía para anunciantes). */
  q: string;
  /** false = no registrar la posición por impresiones (búsquedas con filtro). */
  rank?: boolean;
  /** Página de un anunciante seguido: al terminar se marca como revisado. */
  follow?: string;
}

export interface RunState {
  id: string;
  kind: "auto" | "manual";
  /** Pasada completa (cuenta para el reloj de 24 horas). */
  full: boolean;
  running: boolean;
  items: RunItem[];
  index: number;
  done: number;
  total: number;
  current: string | null;
  created: number;
  updated: number;
  detected: number;
  message: string;
  /** Si está en pausa (límite por hora o bloqueo): cuándo continúa. */
  waitingUntil: number | null;
  waitingReason: "limit" | "blocked" | null;
  startedAt: string;
  finishedAt: string | null;
  job: { id: string; tabId: number; startedAt: number } | null;
  lastJobEndedAt: number;
  /** Meta limitó alguna consulta: se va más despacio y sin carga profunda. */
  limited: boolean;
  blocks: number;
}

export interface RunnerDeps {
  follows(): Promise<Array<{ pageId: string; name: string }>>;
  /** Anunciantes con anuncios activos cuya imagen ya venció, de más a menos (ver staleAdvertisers). */
  stale?(): Promise<Array<{ pageId: string; name: string }>>;
  touchFollow(pageId: string): Promise<void>;
  /** Avisa a las páginas abiertas del radar (cambios de estado). */
  notify?(): void;
}

type Facet = "top" | "recent" | "video" | "image";
const EXTRA_FACETS: Facet[] = ["recent", "video", "image"];
const FACET_LABEL: Record<Facet, string> = { top: "", recent: " · nuevos", video: " · videos", image: " · imágenes" };

export function normalizeSettings(raw: unknown): RadarSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<RadarSettings>;
  const valid = new Set(NICHES.map((n) => n.id));
  const niches = Array.isArray(r.niches) ? r.niches.filter((x): x is string => typeof x === "string" && valid.has(x)) : null;
  return {
    auto: typeof r.auto === "boolean" ? r.auto : DEFAULT_SETTINGS.auto,
    depth: Math.min(3, Math.max(1, Math.round(Number(r.depth) || DEFAULT_SETTINGS.depth))),
    niches: niches && niches.length && niches.length < valid.size ? niches : null,
    extra: Array.isArray(r.extra)
      ? Array.from(new Set(r.extra.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 80)).filter(Boolean))).slice(0, 60)
      : [],
    country: typeof r.country === "string" && /^[A-Z]{2,3}$/.test(r.country) ? r.country : DEFAULT_SETTINGS.country,
    deep: typeof r.deep === "boolean" ? r.deep : DEFAULT_SETTINGS.deep,
  };
}

/** Anunciantes cuyas imágenes se renuevan en cada pasada diaria (los de más anuncios vencidos). */
export const STALE_PER_PASS = 8;
/** Máximo de anunciantes en «Recargar imágenes». */
export const STALE_PER_REFRESH = 20;

/** Cuántas búsquedas hace una pasada completa con esta configuración. */
export function planSize(s: RadarSettings, follows = 0, stale = 0) {
  const niches = s.niches?.length ?? NICHES.length;
  return follows + Math.min(stale, STALE_PER_PASS) + niches * s.depth + s.extra.length * Math.min(2, s.depth);
}

interface StaleAd {
  pageId: string;
  isActive: boolean;
  isManual?: boolean;
  mediaExpiresAt: string | null;
}

/**
 * Meta firma los enlaces de imágenes y videos con una fecha de vencimiento.
 * Devuelve los anunciantes con anuncios activos cuyo enlace ya venció, de más a
 * menos anuncios vencidos: abrir la página de cada uno en la Biblioteca trae
 * enlaces nuevos para todos sus anuncios de una vez.
 */
export function staleAdvertisers(ads: StaleAd[], advertisers: Array<{ pageId: string; name: string }>, now = new Date()) {
  const limit = now.toISOString();
  const counts = new Map<string, number>();
  for (const a of ads) {
    if (!a.isActive || a.isManual || !a.mediaExpiresAt || a.mediaExpiresAt > limit || !/^\d+$/.test(a.pageId)) continue;
    counts.set(a.pageId, (counts.get(a.pageId) ?? 0) + 1);
  }
  const names = new Map(advertisers.map((a) => [a.pageId, a.name]));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([pageId, count]) => ({ pageId, name: names.get(pageId) ?? pageId, count }));
}

const staleItems = (list: Array<{ pageId: string; name: string }>, skip: Set<string>, max: number): RunItem[] =>
  list
    .filter((a) => !skip.has(a.pageId))
    .slice(0, max)
    .map((a) => ({ label: `${a.name} · imágenes`, url: advertiserLibraryUrl(a.pageId), q: "" }));

/**
 * Lista de búsquedas de una pasada completa. Cada día cambia la palabra de
 * cada nicho y el filtro de las búsquedas adicionales (anuncios nuevos, solo
 * videos, solo imágenes), para traer anuncios distintos con el mismo esfuerzo.
 * Va por «vueltas»: primero una búsqueda de cada nicho, luego la segunda…
 */
export function buildPlan(
  s: RadarSettings,
  follows: Array<{ pageId: string; name: string }>,
  now = new Date(),
  stale: Array<{ pageId: string; name: string }> = [],
): RunItem[] {
  const day = Math.floor(now.getTime() / DAY_MS);
  const since = new Date(now.getTime() - 30 * DAY_MS).toISOString().slice(0, 10);
  const items: RunItem[] = follows.map((f) => ({ label: f.name, url: advertiserLibraryUrl(f.pageId), q: "", follow: f.pageId }));
  // Los seguidos ya renuevan sus imágenes; después, los anunciantes con más imágenes vencidas.
  items.push(...staleItems(stale, new Set(follows.map((f) => f.pageId)), STALE_PER_PASS));
  const seen = new Set<string>();
  const add = (q: string, facet: Facet) => {
    const key = `${q.toLowerCase()}|${facet}`;
    if (!q || seen.has(key)) return;
    seen.add(key);
    items.push({
      label: `«${q}»${FACET_LABEL[facet]}`,
      url: librarySearchUrl(q, {
        country: s.country,
        media: facet === "video" ? "video" : facet === "image" ? "image" : "all",
        since: facet === "recent" ? since : undefined,
      }),
      q,
      rank: facet === "top",
    });
  };
  const facetFor = (round: number, offset: number): Facet => (round === 0 ? "top" : EXTRA_FACETS[(day + round - 1 + offset) % EXTRA_FACETS.length]!);
  const ids = s.niches?.length ? s.niches : NICHES.map((n) => n.id);
  for (let round = 0; round < s.depth; round++) {
    for (const id of ids) {
      const seeds = nicheSeeds(id);
      if (seeds.length) add(seeds[(day + round) % seeds.length]!, facetFor(round, 0));
    }
    if (round < 2) for (const q of s.extra) add(q, facetFor(round, 0));
  }
  return items;
}

// ── Estado ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<RadarSettings> {
  const v = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(v[SETTINGS_KEY]);
}

export async function getRun(): Promise<RunState | null> {
  const v = await chrome.storage.local.get(RUN_KEY);
  return (v[RUN_KEY] as RunState | undefined) ?? null;
}

async function setRun(run: RunState) {
  await chrome.storage.local.set({ [RUN_KEY]: run });
}

/** Próxima pasada automática (ms), o null si está desactivada o nunca se llenó el radar. */
export async function nextAutoAt(): Promise<number | null> {
  const s = await getSettings();
  if (!s.auto) return null;
  const v = await chrome.storage.local.get([LAST_FULL_KEY, "lastUpdate"]);
  const last = Number(v[LAST_FULL_KEY]) || (typeof v.lastUpdate === "string" ? Date.parse(v.lastUpdate) : 0);
  return last ? last + DAY_MS : null;
}

// Un solo paso a la vez dentro del service worker.
let chain: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  return next;
}

let timer: ReturnType<typeof setTimeout> | null = null;
function schedule(ms: number, deps: RunnerDeps) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void tick(deps);
  }, Math.max(250, ms));
}

/** El despertador mantiene viva la pasada aunque el service worker se duerma. */
export async function ensureAlarm(running: boolean) {
  const period = running ? 1 : 15;
  const current = await chrome.alarms.get(ALARM);
  if (!current || current.periodInMinutes !== period) await chrome.alarms.create(ALARM, { periodInMinutes: period, delayInMinutes: period });
}

async function closeTab(tabId: number) {
  await chrome.storage.session.remove(`job:${tabId}`).catch(() => {});
  await chrome.tabs.remove(tabId).catch(() => {});
}

function summary(run: RunState) {
  return `Listo: ${run.created} anuncios nuevos y ${run.updated} actualizados en ${run.done} ${run.done === 1 ? "búsqueda" : "búsquedas"}.`;
}

async function finish(run: RunState, message: string, deps: RunnerDeps) {
  const job = run.job;
  const done: RunState = { ...run, running: false, job: null, current: null, waitingUntil: null, waitingReason: null, message, finishedAt: new Date().toISOString() };
  await setRun(done);
  if (job) await closeTab(job.tabId);
  await ensureAlarm(false);
  deps.notify?.();
  return done;
}

/** Empieza una pasada (si ya hay una en curso, la devuelve sin cambios). */
export function startRun(kind: RunState["kind"], items: RunItem[], full: boolean, deps: RunnerDeps): Promise<RunState | null> {
  return locked(async () => {
    const current = await getRun();
    if (current?.running) return current;
    if (!items.length) return null;
    const now = Date.now();
    const run: RunState = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      full,
      running: true,
      items,
      index: 0,
      done: 0,
      total: items.length,
      current: items[0]!.label,
      created: 0,
      updated: 0,
      detected: 0,
      message: "",
      waitingUntil: null,
      waitingReason: null,
      startedAt: new Date(now).toISOString(),
      finishedAt: null,
      job: null,
      lastJobEndedAt: 0,
      limited: false,
      blocks: 0,
    };
    await setRun(run);
    if (full) await chrome.storage.local.set({ [LAST_FULL_KEY]: now, lastUpdate: run.startedAt });
    await ensureAlarm(true);
    deps.notify?.();
    schedule(300, deps);
    return run;
  });
}

/** Pasada completa con la configuración guardada: seguidos + imágenes vencidas + nichos + palabras propias. */
export async function startFullRun(kind: RunState["kind"], deps: RunnerDeps, now = new Date()) {
  const [settings, follows, stale] = await Promise.all([getSettings(), deps.follows(), deps.stale?.() ?? Promise.resolve([])]);
  return startRun(kind, buildPlan(settings, follows, now, stale), true, deps);
}

/** Solo renovar imágenes vencidas: una búsqueda por anunciante, los de más anuncios vencidos primero. */
export async function startMediaRun(deps: RunnerDeps) {
  const stale = (await deps.stale?.()) ?? [];
  return startRun("manual", staleItems(stale, new Set(), STALE_PER_REFRESH), false, deps);
}

/** Solo los anunciantes seguidos. */
export async function startFollowsRun(deps: RunnerDeps) {
  const follows = await deps.follows();
  return startRun(
    "manual",
    follows.map((f) => ({ label: f.name, url: advertiserLibraryUrl(f.pageId), q: "", follow: f.pageId })),
    false,
    deps,
  );
}

export function stopRun(deps: RunnerDeps, message = "Actualización detenida.") {
  return locked(async () => {
    const run = await getRun();
    if (!run?.running) return run;
    return finish(run, message, deps);
  });
}

/** Avanza la pasada: lanza la siguiente búsqueda cuando toca. También decide si toca la pasada automática. */
export function tick(deps: RunnerDeps): Promise<void> {
  return locked(async () => {
    let run = await getRun();
    const now = Date.now();
    if (!run?.running) {
      const due = await nextAutoAt();
      if (due !== null && now >= due) {
        // Fuera del candado no hace falta: startFullRun vuelve a entrar en la cola.
        void startFullRun("auto", deps);
      } else {
        await ensureAlarm(false);
      }
      return;
    }
    await ensureAlarm(true);
    if (run.job) {
      if (now - run.job.startedAt < JOB_TIMEOUT_MS) return; // la pestaña avisará al terminar
      await closeTab(run.job.tabId);
      run = { ...run, job: null, index: run.index + 1, done: run.done + 1, lastJobEndedAt: now };
      await setRun(run);
    }
    if (run.index >= run.items.length) {
      await finish(run, summary(run), deps);
      return;
    }
    if (run.waitingReason === "blocked" && run.waitingUntil && now < run.waitingUntil) return;
    if ((await searchesLeft()) <= 0) {
      const until = await nextSlotAt();
      if (run.waitingUntil !== until || run.waitingReason !== "limit") {
        await setRun({ ...run, waitingUntil: until, waitingReason: "limit" });
        deps.notify?.();
      }
      return;
    }
    const gap = run.limited ? LIMITED_GAP_MS : GAP_MS;
    if (now - run.lastJobEndedAt < gap) {
      schedule(gap - (now - run.lastJobEndedAt), deps);
      return;
    }
    const item = run.items[run.index]!;
    const settings = await getSettings();
    await noteSearch();
    const tab = await chrome.tabs.create({ url: item.url, active: false });
    const jobId = `${run.id}-${run.index}`;
    await chrome.storage.session.set({
      [`job:${tab.id}`]: { id: jobId, q: item.q, scrolls: 3, rank: item.rank !== false, deep: settings.deep && !run.limited },
    });
    await setRun({ ...run, job: { id: jobId, tabId: tab.id, startedAt: now }, current: item.label, waitingUntil: null, waitingReason: null });
    deps.notify?.();
  });
}

export interface JobDoneMessage {
  jobId?: unknown;
  detected?: unknown;
  created?: unknown;
  updated?: unknown;
  blocked?: unknown;
  limited?: unknown;
}

/** La pestaña de una búsqueda terminó. Devuelve true si era de la pasada en curso. */
export function handleJobDone(msg: JobDoneMessage, deps: RunnerDeps): Promise<boolean> {
  return locked(async () => {
    const run = await getRun();
    if (!run?.running || !run.job || run.job.id !== msg.jobId) return false;
    const now = Date.now();
    const item = run.items[run.index]!;
    const tabId = run.job.tabId;
    const blocked = typeof msg.blocked === "string" && msg.blocked ? msg.blocked : null;
    let next: RunState = {
      ...run,
      job: null,
      lastJobEndedAt: now,
      created: run.created + (Number(msg.created) || 0),
      updated: run.updated + (Number(msg.updated) || 0),
      detected: run.detected + (Number(msg.detected) || 0),
      limited: run.limited || Boolean(msg.limited) || Boolean(blocked),
    };
    if (blocked) {
      if (blocked === "login" || run.blocks >= 1) {
        await finish(next, blockedMessage(blocked), deps);
        await closeTab(tabId);
        return true;
      }
      // Primer bloqueo: se pausa una hora y se reintenta esta misma búsqueda una vez.
      next = { ...next, blocks: run.blocks + 1, waitingUntil: now + BLOCK_PAUSE_MS, waitingReason: "blocked" };
      await setRun(next);
      await closeTab(tabId);
      deps.notify?.();
      return true;
    }
    next = { ...next, index: run.index + 1, done: run.done + 1 };
    await setRun(next);
    await closeTab(tabId);
    if (item.follow) await deps.touchFollow(item.follow).catch(() => {});
    if (next.index >= next.items.length) await finish(next, summary(next), deps);
    else {
      deps.notify?.();
      schedule(next.limited ? LIMITED_GAP_MS : GAP_MS, deps);
    }
    return true;
  });
}

/** El usuario (o Chrome) cerró la pestaña de la búsqueda en curso: se sigue con la siguiente. */
export function handleTabRemoved(tabId: number, deps: RunnerDeps): Promise<void> {
  return locked(async () => {
    const run = await getRun();
    if (!run?.running || !run.job || run.job.tabId !== tabId) return;
    await chrome.storage.session.remove(`job:${tabId}`).catch(() => {});
    await setRun({ ...run, job: null, index: run.index + 1, done: run.done + 1, lastJobEndedAt: Date.now() });
    schedule(GAP_MS, deps);
  });
}

export { MAX_PER_HOUR };
