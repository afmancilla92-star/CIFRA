const $ = (id) => document.getElementById(id);
const LIBRARY_URL = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&media_type=all";
const DEFAULTS = { apiBase: "", token: "", platformEnabled: false };

function show(el, text, ok) {
  el.textContent = text;
  el.className = `msg ${ok === undefined ? "" : ok ? "ok" : "err"}`;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadCounts() {
  try {
    const c = await chrome.runtime.sendMessage({ type: "radar:counts" });
    $("counts").textContent = c && c.total ? `${c.total} anuncios guardados (${c.active} activos)` : "Todavía no guardaste anuncios.";
  } catch (_) {
    $("counts").textContent = "";
  }
}

async function loadSettings() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  $("apiBase").value = s.apiBase;
  $("token").value = s.token;
  $("platformEnabled").checked = Boolean(s.platformEnabled);
}

async function refreshTab() {
  const tab = await activeTab();
  const onLibrary = tab && /^https:\/\/www\.facebook\.com\/ads\/library/.test(tab.url || "");
  $("open-library").hidden = Boolean(onLibrary);
  if (!onLibrary) return;
  try {
    const st = await chrome.tabs.sendMessage(tab.id, { type: "radar:status" });
    $("tab-status").innerHTML = "";
    const strong = document.createElement("strong");
    strong.className = "count";
    strong.textContent = `${st.detected} anuncios detectados`;
    const p = document.createElement("span");
    p.className = "muted";
    p.textContent = `${st.pending} sin guardar${st.query.country ? ` · país: ${st.query.country}` : ""}${st.query.q ? ` · «${st.query.q}»` : ""}`;
    $("tab-status").append(strong, p);
    $("send").hidden = false;
    $("send").disabled = st.sending;
    $("send").textContent = st.pending ? `Guardar ${st.pending} anuncios` : "Guardar anuncios detectados";
    if (st.lastMessage) show($("send-result"), st.lastMessage);
  } catch (_) {
    $("tab-status").textContent = "Recarga la página de la Biblioteca para activar la captura.";
  }
}

$("open-app").addEventListener("click", () => chrome.runtime.sendMessage({ type: "radar:openApp" }).then(() => window.close()));

$("save").addEventListener("click", async () => {
  const apiBase = $("apiBase").value.trim().replace(/\/+$/, "");
  const token = $("token").value.trim();
  const platformEnabled = $("platformEnabled").checked;
  if (platformEnabled) {
    try {
      const u = new URL(apiBase);
      const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
      if (u.protocol !== "https:" && !(local && u.protocol === "http:")) throw new Error();
    } catch (_) {
      return show($("config-result"), "La URL debe empezar con https:// (o http://localhost).", false);
    }
    if (!token) return show($("config-result"), "Escribe el token de la plataforma.", false);
  }
  await chrome.storage.sync.set({ apiBase, token, platformEnabled });
  show($("config-result"), platformEnabled ? "Guardado. Las capturas también se enviarán a tu plataforma." : "Guardado. Solo se guarda en este Chrome.", true);
});

$("test").addEventListener("click", async () => {
  show($("config-result"), "Probando…");
  await chrome.storage.sync.set({ apiBase: $("apiBase").value.trim(), token: $("token").value.trim() });
  const res = await chrome.runtime.sendMessage({ type: "radar:ping" });
  show($("config-result"), res && res.ok ? "Conexión correcta con la plataforma." : (res && res.error) || "Sin respuesta.", Boolean(res && res.ok));
});

$("send").addEventListener("click", async () => {
  const tab = await activeTab();
  $("send").disabled = true;
  show($("send-result"), "Guardando…");
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "radar:sendNow" });
    show($("send-result"), res && res.ok ? `Listo: ${res.created || 0} nuevos, ${res.updated || 0} actualizados.` : (res && res.error) || "Error", Boolean(res && res.ok));
  } finally {
    refreshTab();
    loadCounts();
  }
});

$("open-library").addEventListener("click", () => chrome.tabs.create({ url: LIBRARY_URL }));

loadCounts();
loadSettings();
refreshTab();
