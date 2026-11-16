/*
 * Cifra Radar — observador pasivo (contexto de la página).
 *
 * Lee una COPIA de las respuestas que la propia Biblioteca de Anuncios ya
 * descargó para mostrarte resultados y reenvía al script de la extensión
 * solo las que contienen anuncios. No hace peticiones propias y no envía nada
 * fuera del navegador. Mientras navegas tú, no cambia la página; solo en las
 * búsquedas que pide el radar puede avisar a la lista de que cargue su
 * siguiente tanda (ver «carga profunda» más abajo).
 */
(() => {
  if (window.__cifraRadarHook) return;
  window.__cifraRadarHook = true;

  const TAG = "__cifraRadar";
  const MAX = 6_000_000;

  // Las respuestas pueden llegar antes de que el script de la extensión esté
  // listo: se guardan (con un tope) y se entregan cuando avisa «ready».
  let ready = false;
  let queue = [];
  let queued = 0;
  function post(msg) {
    if (ready) return window.postMessage(msg, window.location.origin);
    const size = msg.text ? msg.text.length : 0;
    if (queued + size > 30_000_000) return;
    queued += size;
    queue.push(msg);
  }
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data[TAG] !== 1 || e.data.kind !== "ready" || ready) return;
    ready = true;
    const pending = queue;
    queue = [];
    queued = 0;
    for (const m of pending) window.postMessage(m, window.location.origin);
  });

  // Carga profunda (solo en búsquedas pedidas desde el radar): en una pestaña de
  // fondo Chrome no entrega los avisos de «este elemento está a la vista», así
  // que la lista no carga más resultados aunque se baje. Se recuerda qué
  // elementos observa la página y, cuando el radar lo pide («kick»), se le avisa
  // de los que están al final de la lista. No se hacen peticiones propias: es la
  // página la que decide cargar su siguiente tanda, como al bajar con el ratón.
  const NativeIO = window.IntersectionObserver;
  const observers = new Set();
  if (typeof NativeIO === "function") {
    try {
      window.IntersectionObserver = class extends NativeIO {
        constructor(callback, options) {
          super(callback, options);
          this.__cifraCallback = callback;
          this.__cifraTargets = new Set();
          observers.add(this);
        }
        observe(target) {
          this.__cifraTargets.add(target);
          return super.observe(target);
        }
        unobserve(target) {
          this.__cifraTargets.delete(target);
          return super.unobserve(target);
        }
        disconnect() {
          this.__cifraTargets.clear();
          observers.delete(this);
          return super.disconnect();
        }
      };
    } catch (_) {
      /* si no se puede envolver, simplemente no hay carga profunda */
    }
  }
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data[TAG] !== 1 || e.data.kind !== "kick") return;
    const bottom = document.documentElement.scrollHeight - 2500;
    for (const io of observers) {
      for (const target of Array.from(io.__cifraTargets || [])) {
        try {
          if (!target.isConnected) continue;
          const rect = target.getBoundingClientRect();
          if (rect.top + window.scrollY < bottom) continue;
          io.__cifraCallback.call(io, [{ target, isIntersecting: true, intersectionRatio: 1, boundingClientRect: rect, intersectionRect: rect, rootBounds: null, time: performance.now() }], io);
        } catch (_) {
          /* nunca interferir con la página */
        }
      }
    }
  });

  function relay(text) {
    if (typeof text !== "string" || text.length > MAX) return;
    // Meta limitó las consultas: se avisa para detener cualquier búsqueda en curso.
    if (text.indexOf("1675004") !== -1 || text.indexOf("Rate limit exceeded") !== -1) {
      post({ [TAG]: 1, kind: "blocked", reason: "rate_limit" });
    }
    if (text.indexOf("ad_archive_id") === -1) return;
    post({ [TAG]: 1, kind: "response", text });
  }

  const isGraphql = (url) => typeof url === "string" && url.indexOf("/api/graphql") !== -1;

  const origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = function (input, init) {
      const p = origFetch.apply(this, arguments);
      try {
        const url = typeof input === "string" ? input : input && input.url;
        if (isGraphql(url)) {
          p.then((res) => res.clone().text().then(relay)).catch(() => {});
        }
      } catch (_) {
        /* nunca interferir con la página */
      }
      return p;
    };
  }

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      this.__cifraRadarUrl = String(url);
    } catch (_) {}
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    try {
      if (isGraphql(this.__cifraRadarUrl)) {
        this.addEventListener("load", () => {
          try {
            if (this.responseType === "" || this.responseType === "text") relay(this.responseText);
          } catch (_) {}
        });
      }
    } catch (_) {}
    return origSend.apply(this, arguments);
  };
})();
