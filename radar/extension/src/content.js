/*
 * Cifra Radar — script de la extensión en la Biblioteca de Anuncios.
 *
 * 1. Reúne los anuncios que la página ya cargó (datos incrustados en el HTML
 *    y respuestas que observa page-hook.js mientras tú navegas o haces scroll).
 * 2. Muestra un panel con el número de anuncios detectados.
 * 3. Solo cuando pulsas "Guardar" los guarda en tu Chrome (y en tu plataforma,
 *    si la activaste) vía background.js.
 *
 * No hace scroll, no pagina, no hace clics ni peticiones a Meta por su cuenta.
 */
(() => {
  if (window.__cifraRadarContent) return;
  window.__cifraRadarContent = true;
  console.info(`[Cifra Radar] script cargado en ${location.host}`);

  const C = globalThis.CifraRadarCollector;
  if (!C) {
    console.error("[Cifra Radar] falta collector.js: reinstala la extensión desde la carpeta completa.");
    return;
  }
  const VERSION = chrome.runtime.getManifest().version;
  const BATCH = 250;
  const buffer = new Map(); // ad_archive_id -> nodo
  const sent = new Set();
  let sending = false;
  let lastMessage = "";
  let blocked = null; // "rate_limit" | "login" cuando Meta limita o pide iniciar sesión
  let jobRanks = null; // posición de cada anuncio en una búsqueda del radar ordenada por impresiones
  let resultCount = 0; // total de resultados que informa la Biblioteca («~225 resultados»)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function addNodes(nodes) {
    let added = 0;
    for (const n of nodes) {
      const id = String(n.ad_archive_id || "");
      if (!/^\d{5,25}$/.test(id)) continue;
      const prev = buffer.get(id);
      // Conserva la versión con snapshot más completo.
      if (!prev || (!prev.snapshot && n.snapshot) || JSON.stringify(n).length > JSON.stringify(prev).length) {
        if (!prev) added++;
        buffer.set(id, n);
      }
    }
    if (added) render();
  }

  // Datos incrustados en el HTML inicial.
  function scanEmbedded() {
    for (const s of document.querySelectorAll('script[type="application/json"]')) {
      const t = s.textContent || "";
      if (t.indexOf("ad_archive_id") === -1) continue;
      try {
        const json = JSON.parse(t);
        addNodes(C.findAdNodes(json));
        resultCount = Math.max(resultCount, C.findResultCount(json));
      } catch (_) {}
    }
  }

  // Respuestas observadas por page-hook.js (mismo origen, misma pestaña).
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.__cifraRadar !== 1) return;
    if (e.data.kind === "blocked") {
      blocked = e.data.reason || "rate_limit";
      lastMessage = "Meta limitó temporalmente las búsquedas. Espera un rato antes de seguir.";
      render();
      return;
    }
    if (e.data.kind !== "response") return;
    try {
      const parsed = C.parseAll(e.data.text);
      resultCount = Math.max(resultCount, parsed.count);
      addNodes(parsed.nodes);
    } catch (_) {}
  });
  // Avisa al observador de la página que ya puede entregar lo que guardó.
  window.postMessage({ __cifraRadar: 1, kind: "ready" }, location.origin);

  function queryContext() {
    const p = new URLSearchParams(location.search);
    return {
      country: p.get("country"),
      q: p.get("q"),
      activeStatus: p.get("active_status"),
      adType: p.get("ad_type"),
      mediaType: p.get("media_type"),
      pageId: p.get("view_all_page_id"),
      sort: p.get("sort_data[mode]"),
    };
  }

  // ── Respaldo: lectura de las tarjetas visibles (solo IDs que no llegaron como datos) ──
  const ID_RE = /(Library ID|Identificador de la biblioteca|ID de la biblioteca|ID da biblioteca|ID della libreria|Bibliotheks-ID|ID de bibliothèque)\s*:?\s*(\d{6,25})/i;

  function countIds(text) {
    const m = text.match(new RegExp(ID_RE.source, "gi"));
    return m ? m.length : 0;
  }

  function readDomCards() {
    const cards = [];
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode()) && cards.length < 400) {
      const m = (node.nodeValue || "").match(ID_RE);
      if (!m) continue;
      const id = m[2];
      if (seen.has(id) || buffer.has(id)) continue;
      seen.add(id);
      // Sube hasta el contenedor más grande que contiene un solo ID: la tarjeta.
      let el = node.parentElement;
      let card = el;
      for (let i = 0; i < 18 && el && el !== document.body; i++) {
        if (countIds(el.innerText || "") > 1) break;
        card = el;
        el = el.parentElement;
      }
      if (!card) continue;
      const images = Array.from(card.querySelectorAll("img"))
        .filter((img) => (img.naturalWidth || img.width) >= 120)
        .map((img) => img.currentSrc || img.src)
        .filter((src) => /^https:\/\//.test(src));
      const videos = Array.from(card.querySelectorAll("video"))
        .map((v) => ({ src: v.currentSrc || v.src, poster: v.poster || null }))
        .filter((v) => /^https:\/\//.test(v.src));
      const anchors = Array.from(card.querySelectorAll("a[href]"));
      const links = anchors.map((a) => a.href).filter((h) => /^https?:\/\//.test(h)).slice(0, 20);
      const pageAnchor = anchors.find(
        (a) => /^https:\/\/([a-z0-9-]+\.)?facebook\.com\/[^/?#]+\/?$/.test(a.href) && (a.innerText || "").trim().length > 1,
      );
      cards.push({
        libraryId: id,
        text: (card.innerText || "").slice(0, 6000),
        images: images.slice(0, 8),
        videos: videos.slice(0, 4),
        links,
        pageName: pageAnchor ? pageAnchor.innerText.trim().slice(0, 200) : null,
        pageUrl: pageAnchor ? pageAnchor.href : null,
      });
    }
    return cards;
  }

  function pending() {
    return Array.from(buffer.entries()).filter(([id]) => !sent.has(id));
  }

  async function send({ all = false } = {}) {
    if (sending) return { ok: false, error: "Ya se está guardando." };
    sending = true;
    render();
    try {
      const entries = all ? Array.from(buffer.entries()) : pending();
      const domCards = readDomCards();
      if (!entries.length && !domCards.length) {
        lastMessage = "No hay anuncios nuevos en esta vista. Haz una búsqueda o desplázate para cargar más.";
        return { ok: true, created: 0, updated: 0 };
      }
      const totals = { created: 0, updated: 0, skipped: 0 };
      const batches = [];
      for (let i = 0; i < entries.length; i += BATCH) batches.push(entries.slice(i, i + BATCH));
      if (!batches.length) batches.push([]);
      for (let b = 0; b < batches.length; b++) {
        const chunk = batches[b];
        const payload = {
          extensionVersion: VERSION,
          pageUrl: location.href,
          capturedAt: new Date().toISOString(),
          query: queryContext(),
          nodes: chunk.map(([, n]) => n),
          domCards: b === 0 ? domCards : [],
          ranks: jobRanks || undefined,
          resultCount: resultCount || undefined,
        };
        const res = await chrome.runtime.sendMessage({ type: "radar:send", payload });
        if (!res || !res.ok) {
          lastMessage = (res && res.error) || "No se pudo guardar. Recarga la página e inténtalo de nuevo.";
          console.warn(`[Cifra Radar] ${lastMessage}`);
          return { ok: false, error: lastMessage };
        }
        totals.created += res.created || 0;
        totals.updated += res.updated || 0;
        totals.skipped += res.skipped || 0;
        for (const [id] of chunk) sent.add(id);
        if (res.platform) totals.platform = res.platform;
      }
      lastMessage = `Guardado: ${totals.created} nuevos, ${totals.updated} actualizados${totals.skipped ? `, ${totals.skipped} omitidos` : ""}.`;
      if (totals.platform) {
        lastMessage += totals.platform.ok ? " También se envió a tu plataforma." : ` No se pudo enviar a la plataforma: ${totals.platform.error}`;
      }
      return { ok: true, ...totals };
    } catch (err) {
      lastMessage = `Error: ${err && err.message ? err.message : err}`;
      return { ok: false, error: lastMessage };
    } finally {
      sending = false;
      render();
    }
  }

  // ── Panel flotante (Shadow DOM para no mezclarse con los estilos de la página) ──
  let host = null;
  let shadow = null;

  function ensurePanel() {
    if (host) return;
    host = document.createElement("div");
    host.id = "cifra-radar-panel";
    host.style.cssText = "position:fixed;right:16px;bottom:88px;z-index:2147483646;";
    shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `
      <style>
        .box{font:13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#10151b;color:#f1f3f5;border:1px solid #2b333d;border-radius:14px;padding:12px 14px;width:280px;box-shadow:0 14px 36px -12px rgba(0,0,0,.55)}
        .row{display:flex;align-items:center;justify-content:space-between;gap:8px}
        .brand{font-weight:700;letter-spacing:.2px}
        .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#3fa295;margin-right:6px}
        .count{font-size:22px;font-weight:700;margin:6px 0 2px}
        .muted{color:#9aa3ad;font-size:12px}
        button{font:inherit;border:0;border-radius:10px;padding:8px 10px;cursor:pointer}
        .send{background:#3fa295;color:#06221f;font-weight:700;width:100%;margin-top:10px}
        .send:disabled{opacity:.55;cursor:default}
        .open{background:transparent;color:#cfe9e5;border:1px solid #2b333d;width:100%;margin-top:8px}
        .x{background:transparent;color:#9aa3ad;padding:2px 6px}
        .msg{margin-top:8px;font-size:12px;color:#c9d1d9}
        .mini{background:#10151b;color:#f1f3f5;border:1px solid #2b333d;border-radius:999px;padding:8px 12px;font:600 12px system-ui,sans-serif;cursor:pointer}
      </style>
      <div class="box" part="box">
        <div class="row"><span class="brand"><span class="dot"></span>Cifra Radar</span><button class="x" title="Minimizar">–</button></div>
        <div class="count">0</div>
        <div class="muted pending"></div>
        <button class="send">Guardar en Cifra Radar</button>
        <button class="open">Abrir mi radar</button>
        <div class="msg"></div>
      </div>
      <button class="mini" hidden>Cifra Radar · <span class="n">0</span></button>`;
    shadow.querySelector(".send").addEventListener("click", () => send());
    shadow.querySelector(".open").addEventListener("click", () => chrome.runtime.sendMessage({ type: "radar:openApp" }));
    shadow.querySelector(".x").addEventListener("click", () => setCollapsed(true));
    shadow.querySelector(".mini").addEventListener("click", () => setCollapsed(false));
    document.documentElement.appendChild(host);
    chrome.storage.local.get({ collapsed: false }, (v) => setCollapsed(Boolean(v.collapsed), false));
  }

  function setCollapsed(c, persist = true) {
    if (!shadow) return;
    shadow.querySelector(".box").hidden = c;
    shadow.querySelector(".mini").hidden = !c;
    if (persist) chrome.storage.local.set({ collapsed: c });
  }

  function render() {
    ensurePanel();
    const total = buffer.size;
    const p = pending().length;
    shadow.querySelector(".count").textContent = `${total} ${total === 1 ? "anuncio detectado" : "anuncios detectados"}`;
    shadow.querySelector(".pending").textContent = total
      ? (p ? `${p} sin guardar en esta vista` : "Todo guardado. Desplázate para cargar más.")
      : "Busca en la Biblioteca o desplázate: los anuncios que cargues aparecerán aquí.";
    const btn = shadow.querySelector(".send");
    btn.disabled = sending;
    btn.textContent = sending ? "Guardando…" : p ? `Guardar ${p} en Cifra Radar` : "Guardar en Cifra Radar";
    shadow.querySelector(".msg").textContent = lastMessage;
    shadow.querySelector(".n").textContent = String(p);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (!msg || typeof msg.type !== "string") return;
    if (msg.type === "radar:status") {
      reply({ detected: buffer.size, pending: pending().length, sending, lastMessage, query: queryContext() });
      return;
    }
    if (msg.type === "radar:sendNow") {
      send({ all: Boolean(msg.all) }).then(reply);
      return true; // respuesta asíncrona
    }
  });

  // Señal visible en la consola para confirmar que la extensión está activa en la página.
  console.info(`[Cifra Radar] extensión activa (v${VERSION}). Panel abajo a la derecha.`);
  // ── Búsqueda pedida desde el radar ─────────────────────────────────────────
  // El radar abre esta pestaña de fondo con una búsqueda; aquí se espera a que
  // la propia Biblioteca cargue los resultados, se baja unas pocas veces como
  // lo haría una persona, se guardan y se avisa al radar, que cierra la pestaña.
  // Nunca se resuelven CAPTCHAs ni se inicia sesión: si Meta limita o pide
  // iniciar sesión, la búsqueda se detiene y se informa.
  // Orden en que la Biblioteca entregó los resultados (las copias de una misma
  // creatividad comparten posición). Solo se usa en pestañas abiertas por el
  // radar, que contienen una única búsqueda.
  function computeRanks() {
    const ranks = {};
    const groups = new Map();
    let next = 0;
    for (const [id, n] of buffer) {
      const g = n.collation_id ? `c${n.collation_id}` : id;
      if (!groups.has(g)) groups.set(g, ++next);
      ranks[id] = groups.get(g);
    }
    return ranks;
  }

  function looksLikeLogin() {
    return Boolean(document.querySelector('input[name="email"], input[name="pass"], form[action*="login"]'));
  }

  async function runJob(job) {
    const started = Date.now();
    while (Date.now() - started < 25000 && !buffer.size && !blocked) await sleep(1000);
    if (!buffer.size && !blocked && looksLikeLogin()) blocked = "login";
    // Espera a que la primera tanda termine de llegar.
    let stable = 0;
    let last = -1;
    while (!blocked && buffer.size && stable < 2 && Date.now() - started < 35000) {
      stable = buffer.size === last ? stable + 1 : 0;
      last = buffer.size;
      await sleep(1000);
    }
    const scrolls = Math.max(0, Math.min(5, Number(job.scrolls) || 0));
    for (let i = 0; i < scrolls && !blocked && buffer.size; i++) {
      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(3500);
    }
    let res = { ok: true, created: 0, updated: 0 };
    // El ranking solo tiene sentido en búsquedas por palabra clave.
    jobRanks = job.q ? computeRanks() : null;
    if (buffer.size) res = await send({ all: true });
    // La página hace varias consultas; si alguna fue limitada pero los anuncios
    // llegaron, no es un bloqueo: se avisa como «limitado» para ir más despacio.
    const limited = Boolean(blocked && buffer.size);
    await chrome.runtime.sendMessage({
      type: "radar:jobDone",
      jobId: job.id,
      detected: buffer.size,
      created: res.created || 0,
      updated: res.updated || 0,
      blocked: limited ? null : blocked,
      limited,
      resultCount,
      error: res.ok ? null : res.error,
    }).catch(() => {});
  }

  async function checkJob() {
    for (let i = 0; i < 6; i++) {
      try {
        const job = await chrome.runtime.sendMessage({ type: "radar:whoami" });
        if (job && job.id) return runJob(job);
      } catch (_) {}
      await sleep(500);
    }
  }

  scanEmbedded();
  render();
  checkJob();
  // La Biblioteca es una SPA: al cambiar de búsqueda se vuelve a leer lo incrustado.
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      resultCount = 0;
      scanEmbedded();
      render();
    }
  }, 1500);
})();
