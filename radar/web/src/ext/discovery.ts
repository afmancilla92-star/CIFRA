/**
 * Búsquedas en la Biblioteca de Anuncios pedidas desde el radar (como el
 * «puente» de otras herramientas): se abre la Biblioteca en una pestaña de
 * fondo del propio Chrome del usuario, con su sesión, la extensión guarda lo
 * que la página carga y la pestaña se cierra. Con límite por hora y parada
 * inmediata si Meta limita el acceso o pide iniciar sesión.
 */
import { NICHES } from "../lib/niche/catalog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

/** Una búsqueda por nicho (palabra semilla de cada categoría). */
export const DEFAULT_QUERIES = NICHES.map((n) => n.seed);

export const DISCOVERY_COUNTRIES = ["ALL", "CO", "MX", "AR", "CL", "PE", "EC", "VE", "GT", "DO", "BO", "PY", "UY", "CR", "PA", "ES", "US", "BR"];

/** Máximo de búsquedas automáticas por hora, para no forzar la cuenta del usuario. */
export const MAX_PER_HOUR = 30;
const GAP_MS = 6000;
const JOB_TIMEOUT_MS = 90_000;

export interface SearchOptions {
  country: string;
  /** «total_impressions» = los más vistos primero; «relevance» = orden por defecto de Meta. */
  sort?: "total_impressions" | "relevance";
  status?: "active" | "all";
  media?: "all" | "image" | "video" | "meme" | "none";
  platform?: string;
  language?: string;
}

const BASE = "https://www.facebook.com/ads/library/";

export function librarySearchUrl(q: string, o: SearchOptions) {
  const p = new URLSearchParams({
    active_status: o.status ?? "active",
    ad_type: "all",
    country: o.country || "ALL",
    q,
    search_type: "keyword_unordered",
    media_type: o.media ?? "all",
  });
  if (o.platform) p.set("publisher_platforms[0]", o.platform);
  if (o.language) p.set("content_languages[0]", o.language);
  if ((o.sort ?? "total_impressions") === "total_impressions") {
    p.set("sort_data[mode]", "total_impressions");
    p.set("sort_data[direction]", "desc");
  }
  return `${BASE}?${p.toString()}`;
}

export function advertiserLibraryUrl(pageId: string) {
  const p = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country: "ALL",
    view_all_page_id: pageId,
    search_type: "page",
    media_type: "all",
  });
  return `${BASE}?${p.toString()}`;
}

export function adLibraryUrl(id: string) {
  return `${BASE}?id=${encodeURIComponent(id)}`;
}

/** Acepta un enlace de la Biblioteca (…?id=123) o el ID suelto. */
export function parseAdId(input: string): string | null {
  const s = input.trim();
  if (/^\d{6,25}$/.test(s)) return s;
  const m = s.match(/[?&]id=(\d{6,25})/);
  return m ? m[1]! : null;
}

export interface JobResult {
  q: string;
  detected: number;
  created: number;
  updated: number;
  blocked: string | null;
  /** Meta limitó alguna consulta de la página pero los anuncios llegaron: conviene ir más despacio. */
  limited?: boolean;
  /** Total de resultados que informó la Biblioteca. */
  resultCount?: number;
  error: string | null;
}

async function recentSearches(): Promise<number[]> {
  const { searchLog = [] } = (await chrome.storage.local.get("searchLog")) as { searchLog?: number[] };
  const hourAgo = Date.now() - 3_600_000;
  return searchLog.filter((t) => t > hourAgo);
}

export async function searchesLeft() {
  return Math.max(0, MAX_PER_HOUR - (await recentSearches()).length);
}

/** Cuándo se libera la próxima búsqueda dentro del límite por hora. */
export async function nextSlotAt(): Promise<number> {
  const log = (await recentSearches()).sort((a, b) => a - b);
  return log.length < MAX_PER_HOUR ? Date.now() : log[0]! + 3_600_000 + 5_000;
}

async function noteSearch() {
  const log = await recentSearches();
  log.push(Date.now());
  await chrome.storage.local.set({ searchLog: log });
}

export function blockedMessage(reason: string | null) {
  if (reason === "login") return "La Biblioteca pidió iniciar sesión. Abre facebook.com, inicia sesión tú mismo y vuelve a intentarlo.";
  if (reason === "rate_limit")
    return "Meta limitó temporalmente las búsquedas desde tu navegador. Se detuvo para proteger tu cuenta: vuelve a intentarlo en una hora.";
  return reason ? `Búsqueda detenida: ${reason}` : "";
}

/** Abre una URL de la Biblioteca en segundo plano, espera el resultado y cierra la pestaña. */
export async function runJob(url: string, q: string, scrolls = 3): Promise<JobResult> {
  await noteSearch();
  const tab = await chrome.tabs.create({ url, active: false });
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = `job:${tab.id}`;
  await chrome.storage.session.set({ [key]: { id: jobId, q, scrolls } });
  return new Promise((resolve) => {
    let finished = false;
    const finish = (r: Partial<JobResult>) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      chrome.runtime.onMessage.removeListener(onMsg);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      chrome.storage.session.remove(key).catch(() => {});
      chrome.tabs.remove(tab.id).catch(() => {});
      resolve({ q, detected: 0, created: 0, updated: 0, blocked: null, error: null, ...r });
    };
    const onMsg = (msg: Record<string, unknown>) => {
      if (msg && msg.type === "radar:jobDone" && msg.jobId === jobId) {
        finish({
          detected: Number(msg.detected) || 0,
          created: Number(msg.created) || 0,
          updated: Number(msg.updated) || 0,
          blocked: (msg.blocked as string) || null,
          limited: Boolean(msg.limited),
          resultCount: Number(msg.resultCount) || 0,
          error: (msg.error as string) || null,
        });
      }
    };
    const onRemoved = (id: number) => {
      if (id === tab.id) finish({ error: "La pestaña de búsqueda se cerró antes de terminar." });
    };
    const timer = setTimeout(() => finish({ error: "La Biblioteca tardó demasiado en responder." }), JOB_TIMEOUT_MS);
    chrome.runtime.onMessage.addListener(onMsg);
    chrome.tabs.onRemoved.addListener(onRemoved);
  });
}

export function runSearchJob(q: string, o: SearchOptions, scrolls = 3) {
  return runJob(librarySearchUrl(q, o), q, scrolls);
}

export interface QueueItem {
  /** Lo que se muestra en el progreso («zapatillas», «Anunciante X»). */
  label: string;
  url: string;
  /** Palabra clave (vacía para anunciantes o anuncios sueltos). */
  q: string;
  /** Al terminar (p. ej. marcar un seguido como actualizado). */
  after?: (r: JobResult) => Promise<void> | void;
}

export interface DiscoveryProgress {
  running: boolean;
  done: number;
  total: number;
  current: string | null;
  created: number;
  updated: number;
  detected: number;
  message: string;
  /** Si espera a que se libere el límite por hora: cuándo continúa. */
  waitingUntil: number | null;
}

/**
 * Cola de búsquedas en serie, con pausa entre ellas. Si se alcanza el límite
 * por hora, espera (con el radar abierto) y continúa. Se detiene ante un
 * bloqueo real de Meta o si el usuario la cancela.
 */
export async function runQueue(
  items: QueueItem[],
  onProgress: (p: DiscoveryProgress) => void,
  isCancelled: () => boolean,
): Promise<DiscoveryProgress> {
  const p: DiscoveryProgress = { running: true, done: 0, total: items.length, current: null, created: 0, updated: 0, detected: 0, message: "", waitingUntil: null };
  for (let i = 0; i < items.length; i++) {
    if (isCancelled()) {
      p.message = "Actualización detenida.";
      break;
    }
    // Límite por hora: espera a que se libere un turno.
    while ((await searchesLeft()) <= 0 && !isCancelled()) {
      p.waitingUntil = await nextSlotAt();
      onProgress({ ...p });
      await new Promise((res) => setTimeout(res, 10_000));
    }
    p.waitingUntil = null;
    if (isCancelled()) {
      p.message = "Actualización detenida.";
      break;
    }
    const item = items[i]!;
    p.current = item.label;
    onProgress({ ...p });
    const r = await runJob(item.url, item.q, 3);
    p.done++;
    p.created += r.created;
    p.updated += r.updated;
    p.detected += r.detected;
    if (item.after) await item.after(r);
    if (r.blocked) {
      p.message = blockedMessage(r.blocked);
      break;
    }
    onProgress({ ...p });
    const gap = r.limited ? GAP_MS * 3 : GAP_MS;
    if (i < items.length - 1 && !isCancelled()) await new Promise((res) => setTimeout(res, gap));
  }
  p.running = false;
  p.current = null;
  p.waitingUntil = null;
  if (!p.message) p.message = `Listo: ${p.created} anuncios nuevos y ${p.updated} actualizados en ${p.done} búsquedas.`;
  onProgress({ ...p });
  return p;
}
