/*
 * Cifra Radar — service worker.
 *
 * Modo local (por defecto): guarda las capturas en IndexedDB, dentro de este
 * Chrome, sin servidor ni configuración. El explorador está en app.html.
 * Plataforma web (opcional): si la activas en el popup, cada captura también
 * se envía a tu plataforma con su URL y token.
 * Actualización en segundo plano: la pasada diaria de búsquedas corre aquí
 * (ver radar/web/src/ext/runner.ts), aunque la pestaña del radar esté cerrada.
 */
importScripts("core.js");

const DEFAULTS = { apiBase: "", token: "", platformEnabled: false };
let storePromise = null;

function store() {
  if (!storePromise) storePromise = CifraCore.LocalStore.open();
  return storePromise;
}

function normalizeBase(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol !== "https:" && !(local && u.protocol === "http:")) return null;
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, "")}`;
  } catch (_) {
    return null;
  }
}

async function settings() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  return { apiBase: normalizeBase(s.apiBase), token: String(s.token || "").trim(), platformEnabled: Boolean(s.platformEnabled) };
}

async function callPlatform(method, body) {
  const { apiBase, token } = await settings();
  if (!apiBase || !token) return { ok: false, error: "Escribe la URL de la plataforma y el token en el ícono de la extensión." };
  let res;
  try {
    res = await fetch(`${apiBase}/api/ingest/extension`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return { ok: false, error: `No se pudo conectar con ${apiBase}: ${err && err.message ? err.message : err}` };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error || `La plataforma respondió ${res.status}` };
  return data;
}

// ── Actualización en segundo plano (pasada diaria y «Actualizar») ───────────
const R = CifraCore.runner;
const runnerDeps = {
  follows: async () => Array.from((await (await store()).follows()).values()).map((f) => ({ pageId: f.pageId, name: f.name })),
  touchFollow: async (pageId) => (await store()).touchFollow(pageId, { refreshedAt: new Date().toISOString() }),
  notify: () => chrome.runtime.sendMessage({ type: "radar:run" }).catch(() => {}),
};

// Anuncios nuevos desde la última vez que se abrió el radar: se muestran en el ícono.
async function addBadge(n) {
  if (!n) return;
  const { badgeNew = 0 } = await chrome.storage.local.get("badgeNew");
  const total = badgeNew + n;
  await chrome.storage.local.set({ badgeNew: total });
  chrome.action.setBadgeBackgroundColor({ color: "#2440e0" }).catch(() => {});
  chrome.action.setBadgeText({ text: total > 999 ? "999+" : String(total) }).catch(() => {});
}

async function clearBadge() {
  await chrome.storage.local.set({ badgeNew: 0 });
  chrome.action.setBadgeText({ text: "" }).catch(() => {});
}

async function saveCapture(payload) {
  const s = await settings();
  let local;
  try {
    local = await (await store()).ingestExtensionPayload(payload);
  } catch (err) {
    return { ok: false, error: `No se pudo guardar: ${err && err.message ? err.message : err}` };
  }
  const result = { ok: true, created: local.created, updated: local.updated, skipped: local.skipped };
  if (s.platformEnabled) {
    const remote = await callPlatform("POST", payload);
    result.platform = remote.ok ? { ok: true, created: remote.created, updated: remote.updated } : { ok: false, error: remote.error };
  }
  // Avisa al explorador (si está abierto) de que hay anuncios nuevos.
  chrome.runtime.sendMessage({ type: "radar:updated", created: local.created, updated: local.updated }).catch(() => {});
  addBadge(local.created).catch(() => {});
  return result;
}

async function openApp() {
  const url = chrome.runtime.getURL("app.html");
  const [existing] = await chrome.tabs.query({ url }).catch(() => []);
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    await chrome.windows.update(existing.windowId, { focused: true }).catch(() => {});
  } else {
    await chrome.tabs.create({ url });
  }
}

async function counts() {
  const ads = await (await store()).allAds();
  return { total: ads.length, active: ads.filter((a) => a.isActive).length };
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || typeof msg.type !== "string") return;
  const fromLibrary = /^https:\/\/([a-z0-9-]+\.)?facebook\.com\/ads\/library/.test((sender.tab && sender.tab.url) || sender.url || "");
  const fromExtension = sender.id === chrome.runtime.id && !sender.tab;
  // El radar (app.html) vive en una pestaña de la propia extensión.
  const fromApp = sender.id === chrome.runtime.id && String(sender.url || "").startsWith(chrome.runtime.getURL(""));
  if (msg.type === "radar:jobDone" && fromLibrary) {
    R.handleJobDone(msg, runnerDeps);
    return;
  }
  if (msg.type === "radar:runStart" && (fromApp || fromExtension)) {
    (msg.mode === "follows" ? R.startFollowsRun(runnerDeps) : R.startFullRun("manual", runnerDeps)).then(
      (run) => reply({ ok: Boolean(run), total: run ? run.total : 0 }),
      (err) => reply({ ok: false, error: String((err && err.message) || err) }),
    );
    return true;
  }
  if (msg.type === "radar:runStop" && (fromApp || fromExtension)) {
    R.stopRun(runnerDeps).then(() => reply({ ok: true }));
    return true;
  }
  if (msg.type === "radar:seen" && (fromApp || fromExtension)) {
    clearBadge().then(() => reply({ ok: true }));
    return true;
  }
  // La pestaña de la Biblioteca pregunta si fue abierta por el radar para una búsqueda.
  if (msg.type === "radar:whoami" && fromLibrary && sender.tab) {
    const key = `job:${sender.tab.id}`;
    chrome.storage.session.get(key).then((v) => reply(v[key] || null));
    return true;
  }
  if (msg.type === "radar:send" && fromLibrary) {
    saveCapture(msg.payload).then(reply);
    return true;
  }
  if (msg.type === "radar:openApp" && (fromLibrary || fromExtension)) {
    openApp().then(() => reply({ ok: true }));
    return true;
  }
  if (msg.type === "radar:counts" && fromExtension) {
    counts().then(reply);
    return true;
  }
  if (msg.type === "radar:ping" && fromExtension) {
    callPlatform("GET").then(reply);
    return true;
  }
});

// El despertador avanza la pasada y lanza la automática cada 24 horas.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === R.ALARM) R.tick(runnerDeps);
});
chrome.runtime.onStartup.addListener(() => R.tick(runnerDeps));
chrome.tabs.onRemoved.addListener((tabId) => {
  R.handleTabRemoved(tabId, runnerDeps);
});
// Cada vez que el service worker despierta: retoma lo pendiente.
R.tick(runnerDeps).catch(() => {});

// Al instalar por primera vez, abre el explorador con las instrucciones.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") openApp();
});
