/*
 * Cifra Radar — extracción de anuncios desde datos que la página ya cargó.
 * Busca objetos con "ad_archive_id" en cualquier nivel (robusto a cambios
 * de estructura) y conserva solo los campos que la plataforma usa.
 */
(function (root) {
  const NODE_KEYS = [
    "ad_archive_id", "page_id", "page_name", "is_active", "start_date", "end_date",
    "publisher_platform", "publisher_platforms", "collation_count", "collation_id", "reached_countries",
  ];
  const SNAPSHOT_KEYS = [
    "body", "title", "caption", "cta_text", "cta_type", "link_url", "link_description", "display_format",
    "images", "videos", "cards", "extra_images", "extra_videos", "page_profile_picture_url",
    "page_profile_uri", "page_like_count", "page_categories", "page_name", "page_id",
  ];
  const MEDIA_KEYS = [
    "original_image_url", "resized_image_url", "watermarked_resized_image_url",
    "video_hd_url", "video_sd_url", "watermarked_video_hd_url", "watermarked_video_sd_url",
    "video_preview_image_url", "body", "title", "link_url", "caption", "cta_text", "link_description",
  ];

  const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

  function pick(obj, keys) {
    const out = {};
    for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) out[k] = obj[k];
    return out;
  }

  function cleanBody(b) {
    if (typeof b === "string") return b.slice(0, 5000);
    if (isObj(b)) {
      if (typeof b.text === "string") return { text: b.text.slice(0, 5000) };
      if (isObj(b.markup) && typeof b.markup.__html === "string") return { markup: { __html: b.markup.__html.slice(0, 8000) } };
    }
    return null;
  }

  function cleanList(list) {
    if (!Array.isArray(list)) return undefined;
    return list.slice(0, 12).filter(isObj).map((m) => {
      const o = pick(m, MEDIA_KEYS);
      if (o.body !== undefined) o.body = cleanBody(o.body);
      return o;
    });
  }

  function cleanNode(n) {
    const out = pick(n, NODE_KEYS);
    if (isObj(n.snapshot)) {
      const s = pick(n.snapshot, SNAPSHOT_KEYS);
      if (s.body !== undefined) s.body = cleanBody(s.body);
      for (const k of ["images", "videos", "cards", "extra_images", "extra_videos"]) {
        if (s[k] !== undefined) s[k] = cleanList(s[k]);
      }
      if (Array.isArray(s.page_categories)) s.page_categories = s.page_categories.slice(0, 10);
      out.snapshot = s;
    }
    return out;
  }

  /** Recorre un valor JSON y devuelve los nodos de anuncio encontrados. */
  function findAdNodes(value, out, depth) {
    out = out || [];
    depth = depth || 0;
    if (depth > 60 || out.length > 5000) return out;
    if (Array.isArray(value)) {
      for (const v of value) findAdNodes(v, out, depth + 1);
    } else if (isObj(value)) {
      if (value.ad_archive_id !== undefined && (value.snapshot || value.page_id)) {
        out.push(cleanNode(value));
      }
      for (const k in value) {
        const v = value[k];
        if (v !== null && typeof v === "object") findAdNodes(v, out, depth + 1);
      }
    }
    return out;
  }

  /** Respuestas de Facebook: JSON simple, con prefijo "for (;;);" o varias líneas JSON. */
  function parseResponseText(text) {
    if (typeof text !== "string") return [];
    const clean = text.replace(/^for \(;;\);/, "");
    try {
      return [JSON.parse(clean)];
    } catch (_) {
      const out = [];
      for (const line of clean.split("\n")) {
        const t = line.trim();
        if (!t || t.indexOf("ad_archive_id") === -1) continue;
        try {
          out.push(JSON.parse(t));
        } catch (_) {}
      }
      return out;
    }
  }

  function extractFromText(text) {
    const nodes = [];
    for (const v of parseResponseText(text)) findAdNodes(v, nodes);
    return nodes;
  }

  /** Total de resultados que informa la Biblioteca para la búsqueda (p. ej. «~225 resultados»). */
  function findResultCount(value, depth) {
    depth = depth || 0;
    if (depth > 40 || value === null || typeof value !== "object") return 0;
    let best = 0;
    if (!Array.isArray(value) && isObj(value.search_results_connection)) {
      const c = Number(value.search_results_connection.count);
      if (Number.isFinite(c) && c > best) best = c;
    }
    for (const k in value) {
      const v = value[k];
      if (v !== null && typeof v === "object") best = Math.max(best, findResultCount(v, depth + 1));
    }
    return best;
  }

  /** Anuncios y total de resultados de una respuesta de la página. */
  function parseAll(text) {
    const nodes = [];
    let count = 0;
    for (const v of parseResponseText(text)) {
      findAdNodes(v, nodes);
      count = Math.max(count, findResultCount(v));
    }
    return { nodes, count };
  }

  const api = { findAdNodes, parseResponseText, extractFromText, findResultCount, parseAll, cleanNode };
  root.CifraRadarCollector = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
