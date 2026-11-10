/**
 * Búsquedas en la Biblioteca de Anuncios pedidas desde el radar (como el
 * «puente» de otras herramientas): se abre la Biblioteca en una pestaña de
 * fondo del propio Chrome del usuario, con su sesión, la extensión guarda lo
 * que la página carga y la pestaña se cierra. Con límite por hora y parada
 * inmediata si Meta limita el acceso o pide iniciar sesión.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export const DEFAULT_QUERIES = [
  "suplementos",
  "skincare",
  "ropa mujer",
  "zapatillas",
  "relojes",
  "curso online",
  "emprendedores",
  "audífonos",
  "decoración hogar",
  "perros",
  "envío gratis",
  "pago contra entrega",
];

export const DISCOVERY_COUNTRIES = ["CO", "MX", "AR", "CL", "PE", "EC", "VE", "GT", "DO", "BO", "PY", "UY", "CR", "PA", "ES", "US", "BR"];

/** Máximo de búsquedas automáticas por hora, para no forzar la cuenta del usuario. */
export const MAX_PER_HOUR = 30;
const GAP_MS = 6000;
const JOB_TIMEOUT_MS = 90_000;

export function librarySearchUrl(q: string, country: string) {
  const p = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country,
    q,
    search_type: "keyword_unordered",
    media_type: "all",
  });
  return `https://www.facebook.com/ads/library/?${p.toString()}`;
}

export interface JobResult {
  q: string;
  detected: number;
  created: number;
  updated: number;
  blocked: string | null;
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

/** Una búsqueda: abre la Biblioteca en segundo plano, espera el resultado y cierra la pestaña. */
export async function runSearchJob(q: string, country: string, scrolls = 2): Promise<JobResult> {
  await noteSearch();
  const tab = await chrome.tabs.create({ url: librarySearchUrl(q, country), active: false });
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = `job:${tab.id}`;
  await chrome.storage.session.set({ [key]: { id: jobId, q, country, scrolls } });
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

export interface DiscoveryProgress {
  running: boolean;
  done: number;
  total: number;
  current: string | null;
  created: number;
  updated: number;
  detected: number;
  message: string;
}

/** Varias búsquedas en serie, con pausa entre ellas; se detiene ante cualquier bloqueo. */
export async function runDiscovery(
  queries: string[],
  country: string,
  onProgress: (p: DiscoveryProgress) => void,
  isCancelled: () => boolean,
): Promise<DiscoveryProgress> {
  const list = Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean))).slice(0, MAX_PER_HOUR);
  const p: DiscoveryProgress = { running: true, done: 0, total: list.length, current: null, created: 0, updated: 0, detected: 0, message: "" };
  for (let i = 0; i < list.length; i++) {
    if (isCancelled()) {
      p.message = "Búsqueda detenida.";
      break;
    }
    if ((await searchesLeft()) <= 0) {
      p.message = `Llegaste al límite de ${MAX_PER_HOUR} búsquedas por hora. Continúa más tarde.`;
      break;
    }
    p.current = list[i]!;
    onProgress({ ...p });
    const r = await runSearchJob(list[i]!, country, 2);
    p.done++;
    p.created += r.created;
    p.updated += r.updated;
    p.detected += r.detected;
    if (r.blocked) {
      p.message = blockedMessage(r.blocked);
      break;
    }
    if (r.error && !r.detected) p.message = `«${r.q}»: ${r.error}`;
    onProgress({ ...p });
    if (i < list.length - 1 && !isCancelled()) await new Promise((res) => setTimeout(res, GAP_MS));
  }
  p.running = false;
  p.current = null;
  if (!p.message) p.message = `Listo: ${p.created} anuncios nuevos y ${p.updated} actualizados en ${p.done} búsquedas.`;
  onProgress({ ...p });
  return p;
}
