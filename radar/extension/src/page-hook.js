/*
 * Cifra Radar — observador pasivo (contexto de la página).
 *
 * Lee una COPIA de las respuestas que la propia Biblioteca de Anuncios ya
 * descargó para mostrarte resultados y reenvía al script de la extensión
 * solo las que contienen anuncios. No hace peticiones propias, no cambia la
 * página, no pagina ni hace scroll automático, y no envía nada fuera del
 * navegador: el envío a tu plataforma ocurre solo cuando pulsas "Enviar".
 */
(() => {
  if (window.__cifraRadarHook) return;
  window.__cifraRadarHook = true;

  const TAG = "__cifraRadar";
  const MAX = 6_000_000;

  function relay(text) {
    if (typeof text !== "string" || text.length > MAX || text.indexOf("ad_archive_id") === -1) return;
    window.postMessage({ [TAG]: 1, kind: "response", text }, window.location.origin);
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
