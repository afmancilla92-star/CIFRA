/*
 * Cifra Radar — service worker. Única pieza que habla con tu plataforma.
 * Guarda la URL y el token en chrome.storage.sync (nunca en la página).
 */
const DEFAULTS = { apiBase: "", token: "" };

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
  return { apiBase: normalizeBase(s.apiBase), token: String(s.token || "").trim() };
}

async function call(method, body) {
  const { apiBase, token } = await settings();
  if (!apiBase || !token) return { ok: false, error: "Configura la URL de la plataforma y el token en el ícono de la extensión." };
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

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || typeof msg.type !== "string") return;
  // Solo se aceptan envíos desde la Biblioteca de Anuncios o desde el popup de la extensión.
  const fromLibrary = sender.tab && /^https:\/\/www\.facebook\.com\/ads\/library/.test(sender.tab.url || sender.url || "");
  const fromExtension = sender.id === chrome.runtime.id && !sender.tab;
  if (msg.type === "radar:send" && fromLibrary) {
    call("POST", msg.payload).then(reply);
    return true;
  }
  if (msg.type === "radar:ping" && fromExtension) {
    call("GET").then(reply);
    return true;
  }
});
