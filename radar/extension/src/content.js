/*
 * Cifra Radar — script de la extensión en la Biblioteca de Anuncios.
 *
 * 1. Reúne los anuncios que la página ya cargó (datos incrustados en el HTML
 *    y respuestas que observa page-hook.js mientras tú navegas o haces scroll).
 * 2. Muestra un panel con el número de anuncios detectados.
 * 3. Solo cuando pulsas "Enviar" los manda a tu plataforma (vía background.js).
 *
 * No hace scroll, no pagina, no hace clics ni peticiones a Meta por su cuenta.
 */
(() => {
  if (window.__cifraRadarContent) return;
  window.__cifraRadarContent = true;

  const C = globalThis.CifraRadarCollector;
  const VERSION = chrome.runtime.getManifest().version;
  const BATCH = 250;
  const buffer = new Map(); // ad_archive_id -> nodo
  const sent = new Set();
  let sending = false;
  let lastMessage = "";

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
        addNodes(C.findAdNodes(JSON.parse(t)));
      } catch (_) {}
    }
  }

  // Respuestas observadas por page-hook.js (mismo origen, misma pestaña).
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.__cifraRadar !== 1 || e.data.kind !== "response") return;
    try {
      addNodes(C.extractFromText(e.data.text));
    } catch (_) {}
  });

  function queryContext() {
    const p = new URLSearchParams(location.search);
    return {
      country: p.get("country"),
      q: p.get("q"),
      activeStatus: p.get("active_status"),
      adType: p.get("ad_type"),
      mediaType: p.get("media_type"),
      pageId: p.get("view_all_page_id"),
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
        (a) => /^https:\/\/www\.facebook\.com\/[^/?#]+\/?$/.test(a.href) && (a.innerText || "").trim().length > 1,
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
    if (sending) return { ok: false, error: "Ya hay un envío en curso." };
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
        };
        const res = await chrome.runtime.sendMessage({ type: "radar:send", payload });
        if (!res || !res.ok) {
          lastMessage = (res && res.error) || "No se pudo enviar. Revisa la configuración de la extensión.";
          return { ok: false, error: lastMessage };
        }
        totals.created += res.created || 0;
        totals.updated += res.updated || 0;
        totals.skipped += res.skipped || 0;
        for (const [id] of chunk) sent.add(id);
      }
      lastMessage = `Enviado: ${totals.created} nuevos, ${totals.updated} actualizados${totals.skipped ? `, ${totals.skipped} omitidos` : ""}.`;
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
    host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483646;";
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
        .x{background:transparent;color:#9aa3ad;padding:2px 6px}
        .msg{margin-top:8px;font-size:12px;color:#c9d1d9}
        .mini{background:#10151b;color:#f1f3f5;border:1px solid #2b333d;border-radius:999px;padding:8px 12px;font:600 12px system-ui,sans-serif;cursor:pointer}
      </style>
      <div class="box" part="box">
        <div class="row"><span class="brand"><span class="dot"></span>Cifra Radar</span><button class="x" title="Minimizar">–</button></div>
        <div class="count">0</div>
        <div class="muted pending"></div>
        <button class="send">Enviar a Cifra Radar</button>
        <div class="msg"></div>
      </div>
      <button class="mini" hidden>Cifra Radar · <span class="n">0</span></button>`;
    shadow.querySelector(".send").addEventListener("click", () => send());
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
      ? `${p} sin enviar en esta vista`
      : "Busca en la Biblioteca o desplázate: los anuncios que cargues aparecerán aquí.";
    const btn = shadow.querySelector(".send");
    btn.disabled = sending;
    btn.textContent = sending ? "Enviando…" : p ? `Enviar ${p} a Cifra Radar` : "Enviar a Cifra Radar";
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

  scanEmbedded();
  render();
  // La Biblioteca es una SPA: al cambiar de búsqueda se vuelve a leer lo incrustado.
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scanEmbedded();
      render();
    }
  }, 1500);
})();
