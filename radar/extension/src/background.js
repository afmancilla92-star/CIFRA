/*
 * Cifra Radar — service worker.
 *
 * Modo local (por defecto): guarda las capturas en IndexedDB, dentro de este
 * Chrome, sin servidor ni configuración. El explorador está en app.html.
 * Plataforma web (opcional): si la activas en el popup, cada captura también
 * se envía a tu plataforma con su URL y token.
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
  // Avisa al explorador (si está abierto) para que se actualice solo.
  chrome.runtime.sendMessage({ type: "radar:updated" }).catch(() => {});
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

// Al instalar por primera vez, abre el explorador con las instrucciones.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") openApp();
});
