// Archivo generado por radar/web/scripts/build-extension.mjs — no editar a mano.
"use strict";
var CifraCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/ext/index.ts
  var index_exports = {};
  __export(index_exports, {
    FORMAT_LABELS: () => FORMAT_LABELS,
    LANGUAGE_NAMES: () => LANGUAGE_NAMES,
    LocalStore: () => LocalStore,
    NICHES: () => NICHES,
    PLATFORM_LABELS: () => PLATFORM_LABELS,
    RETENTION_DAYS: () => RETENTION_DAYS,
    SCORE_DISCLAIMER: () => SCORE_DISCLAIMER,
    SOURCE_LABELS: () => SOURCE_LABELS,
    countryName: () => countryName,
    daysActive: () => daysActive,
    fmtDate: () => fmtDate,
    fmtDays: () => fmtDays,
    fmtNum: () => fmtNum,
    isAdLibraryUrl: () => isAdLibraryUrl,
    libraryPageUrl: () => libraryPageUrl,
    mapExtensionPayload: () => mapExtensionPayload,
    nicheLabel: () => nicheLabel,
    normalizeText: () => normalizeText,
    scoreTier: () => scoreTier,
    timeAgo: () => timeAgo,
    truncate: () => truncate
  });

  // src/lib/dates.ts
  var DAY = 864e5;
  function toIsoDate(d) {
    return d.toISOString().slice(0, 10);
  }
  function parseDateValue(value) {
    if (value === null || value === void 0 || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      const ms = value < 1e12 ? value * 1e3 : value;
      return toIsoDate(new Date(ms));
    }
    if (typeof value === "string") {
      const s = value.trim();
      if (/^\d{9,13}$/.test(s)) return parseDateValue(Number(s));
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return toIsoDate(d);
    }
    return null;
  }
  var MONTHS = {
    // español
    ene: 1,
    enero: 1,
    feb: 2,
    febrero: 2,
    mar: 3,
    marzo: 3,
    abr: 4,
    abril: 4,
    may: 5,
    mayo: 5,
    jun: 6,
    junio: 6,
    jul: 7,
    julio: 7,
    ago: 8,
    agosto: 8,
    sep: 9,
    sept: 9,
    septiembre: 9,
    set: 9,
    setiembre: 9,
    oct: 10,
    octubre: 10,
    nov: 11,
    noviembre: 11,
    dic: 12,
    diciembre: 12,
    // portugués
    fev: 2,
    fevereiro: 2,
    marco: 3,
    mai: 5,
    maio: 5,
    junho: 6,
    julho: 7,
    setembro: 9,
    out: 10,
    outubro: 10,
    novembro: 11,
    dez: 12,
    dezembro: 12,
    janeiro: 1,
    jan: 1,
    // inglés
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    june: 6,
    july: 7,
    aug: 8,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    dec: 12,
    december: 12
  };
  function parseLibraryDateText(text) {
    const t = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\./g, " ");
    let m = t.match(/(\d{1,2})\s+(?:de\s+)?([a-z]{3,10})\s+(?:de\s+)?(\d{4})/);
    if (m) {
      const month = MONTHS[m[2]];
      if (month) return iso(Number(m[3]), month, Number(m[1]));
    }
    m = t.match(/([a-z]{3,10})\s+(\d{1,2}),?\s+(\d{4})/);
    if (m) {
      const month = MONTHS[m[1]];
      if (month) return iso(Number(m[3]), month, Number(m[2]));
    }
    m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return iso(Number(m[3]), Number(m[2]), Number(m[1]));
    return null;
  }
  function iso(y, mo, d) {
    if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  function daysActive(startDate, opts) {
    if (!startDate) return null;
    const start = Date.parse(`${startDate}T00:00:00Z`);
    if (Number.isNaN(start)) return null;
    const now = opts.now ?? /* @__PURE__ */ new Date();
    let end = now.getTime();
    if (!opts.isActive) {
      const stop = opts.stopDate ? Date.parse(`${opts.stopDate}T00:00:00Z`) : NaN;
      const seen = opts.lastSeenAt ? Date.parse(opts.lastSeenAt) : NaN;
      if (!Number.isNaN(stop)) end = stop;
      else if (!Number.isNaN(seen)) end = seen;
    }
    return Math.max(0, Math.floor((end - start) / DAY));
  }
  function isoWeekKey(date) {
    const d = /* @__PURE__ */ new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / DAY - 3 + (firstThursday.getUTCDay() + 6) % 7) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  // src/lib/landing.ts
  var REDIRECT_HOSTS = /* @__PURE__ */ new Set(["l.facebook.com", "lm.facebook.com", "l.instagram.com", "l.messenger.com"]);
  var TRACKING_PARAM = /^(utm_|fbclid$|gclid$|gbraid$|wbraid$|ttclid$|msclkid$|mc_cid$|mc_eid$|_hsenc$|_hsmi$|campaign_id$|adset_id$|ad_id$|h_ad_id$|placement$|site_source_name$|fbc_id$|hsa_|ref_src$|igshid$|si$|_branch_match_id$|_ga$|_gl$|cid$|adid$|cmpid$|clickid$|sub_id|subid)/i;
  var MESSAGING_HOSTS = ["wa.me", "api.whatsapp.com", "whatsapp.com", "m.me", "messenger.com", "t.me", "telegram.me"];
  var SOCIAL_HOSTS = ["facebook.com", "fb.com", "fb.me", "instagram.com", "tiktok.com", "youtube.com", "youtu.be", "threads.net", "x.com", "twitter.com"];
  var APP_HOSTS = ["apps.apple.com", "itunes.apple.com", "play.google.com"];
  var IDENTITY_PARAMS = [
    ["api.whatsapp.com", "phone"],
    ["whatsapp.com", "phone"],
    ["play.google.com", "id"],
    ["facebook.com", "id"]
  ];
  function hostMatches(host, list) {
    return list.some((h) => host === h || host.endsWith(`.${h}`));
  }
  function landingKind(domain) {
    if (hostMatches(domain, MESSAGING_HOSTS)) return "messaging";
    if (hostMatches(domain, APP_HOSTS)) return "app_store";
    if (hostMatches(domain, SOCIAL_HOSTS)) return "social";
    return "web";
  }
  function unwrapRedirect(raw) {
    let current = raw.trim();
    for (let i = 0; i < 3; i++) {
      let u;
      try {
        u = new URL(current);
      } catch {
        return current;
      }
      if (REDIRECT_HOSTS.has(u.hostname) && u.searchParams.get("u")) {
        current = u.searchParams.get("u");
        continue;
      }
      return current;
    }
    return current;
  }
  function cleanHost(host) {
    return host.toLowerCase().replace(/^www\d?\./, "").replace(/\.$/, "");
  }
  function normalizeLanding(linkUrl, caption) {
    if (linkUrl && /^https?:\/\//i.test(linkUrl.trim())) {
      try {
        const u = new URL(unwrapRedirect(linkUrl));
        if (u.protocol === "http:" || u.protocol === "https:") {
          const domain = cleanHost(u.hostname);
          for (const name of Array.from(u.searchParams.keys())) {
            const value = u.searchParams.get(name) ?? "";
            if (TRACKING_PARAM.test(name) || /\{\{.*\}\}/.test(value)) u.searchParams.delete(name);
          }
          u.hash = "";
          let pathname = u.pathname.replace(/\/(index\.(html?|php))?$/i, "").replace(/\/{2,}/g, "/");
          if (!pathname) pathname = "";
          const query = u.searchParams.toString();
          const url = `${u.protocol}//${u.hostname.toLowerCase()}${pathname || "/"}${query ? `?${query}` : ""}`;
          const kind = landingKind(domain);
          let identity = "";
          for (const [host, param] of IDENTITY_PARAMS) {
            if (domain === host || domain.endsWith(`.${host}`)) {
              const v = u.searchParams.get(param);
              if (v) identity = `?${param}=${param === "phone" ? v.replace(/\D/g, "") : v.toLowerCase()}`;
            }
          }
          const key = `${domain}${pathname.toLowerCase()}${identity}`;
          return { key, domain, url, kind, domainOnly: false };
        }
      } catch {
      }
    }
    if (caption) {
      const c = caption.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[\s/]/)[0] ?? "";
      if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(c)) {
        const domain = cleanHost(c);
        return { key: domain, domain, url: null, kind: landingKind(domain), domainOnly: true };
      }
    }
    return null;
  }

  // src/lib/scoring.ts
  var clamp01 = (x) => Math.max(0, Math.min(1, x));
  var round1 = (x) => Math.round(x * 10) / 10;
  var plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  function computeScore(i) {
    const signals = [];
    const d = i.daysActive ?? 0;
    signals.push({
      key: "longevity",
      label: "Días activos",
      max: 25,
      points: round1(25 * clamp01(Math.log(1 + d) / Math.log(1 + 90))),
      observed: i.daysActive === null ? "Fecha de inicio desconocida" : plural(d, "día", "días"),
      explanation: "Cuanto más tiempo mantiene el anunciante un anuncio en circulación, mayor es la señal de continuidad. Alcanza el máximo a los 90 días."
    });
    const variants = Math.max(i.collationCount ?? 1, i.sameMessageCount + 1, 1);
    signals.push({
      key: "variants",
      label: "Variantes del anuncio",
      max: 15,
      points: round1(15 * clamp01(Math.log(variants) / Math.log(10))),
      observed: plural(variants, "versión", "versiones"),
      explanation: "Cantidad de anuncios que usan la misma creatividad y texto (dato de la Biblioteca) o el mismo mensaje. Duplicar un anuncio suele hacerse para ampliar su alcance."
    });
    const n = Math.max(0, i.advertiserActiveAds);
    signals.push({
      key: "advertiser_volume",
      label: "Anuncios activos del anunciante",
      max: 15,
      points: round1(15 * clamp01(n <= 1 ? 0 : Math.log(n) / Math.log(30))),
      observed: plural(n, "anuncio activo", "anuncios activos"),
      explanation: "Anuncios activos de la misma página registrados en la plataforma. Muchos anuncios simultáneos indican una inversión sostenida en publicidad."
    });
    const msgPts = 6 * clamp01(i.sameMessageCount / 4);
    const offerPts = i.offers.length ? 4 * clamp01(i.offerRepeatCount / 4) : 0;
    const repParts = [];
    repParts.push(plural(i.sameMessageCount, "anuncio más con el mismo mensaje", "anuncios más con el mismo mensaje"));
    if (i.offers.length) repParts.push(`oferta (${i.offers.join(", ")}) repetida en ${i.offerRepeatCount}`);
    signals.push({
      key: "message_repetition",
      label: "Repetición de ofertas y mensajes",
      max: 10,
      points: round1(msgPts + offerPts),
      observed: repParts.join(" · "),
      explanation: "Cuando el anunciante repite el mismo mensaje u oferta en varios anuncios, ese ángulo comercial forma parte central de su estrategia."
    });
    const c = Math.max(1, i.distinctCreatives);
    const f = Math.max(1, i.distinctFormats);
    signals.push({
      key: "creative_diversity",
      label: "Diversidad de creatividades",
      max: 10,
      points: round1(6 * clamp01((c - 1) / 5) + 4 * clamp01((f - 1) / 2)),
      observed: `${plural(c, "creatividad", "creatividades")} · ${plural(f, "formato", "formatos")}`,
      explanation: "Creatividades y formatos distintos que el anunciante usa hacia el mismo destino. Probar variaciones es típico de campañas que se optimizan activamente."
    });
    let landingPts = 0;
    let landingObs = "Sin destino identificado";
    if (i.landingKind === "web") {
      landingPts = i.landingDomainOnly ? 3.5 : 5;
      landingObs = i.landingDomainOnly ? "Dominio visible (sin URL completa)" : "Landing page identificada";
    } else if (i.landingKind === "app_store") {
      landingPts = 3;
      landingObs = "Tienda de aplicaciones";
    } else if (i.landingKind) {
      landingPts = 1.5;
      landingObs = i.landingKind === "messaging" ? "Mensajería (WhatsApp/Messenger)" : "Red social";
    }
    signals.push({
      key: "landing",
      label: "Landing page disponible",
      max: 5,
      points: landingPts,
      observed: landingObs,
      explanation: "Un destino web identificable permite analizar la oferta completa y agrupar todos los anuncios que llevan a la misma página."
    });
    const w = Math.max(0, i.launchWeeks);
    signals.push({
      key: "continuity",
      label: "Continuidad de la campaña",
      max: 10,
      points: round1((i.isActive ? 4 : 0) + 6 * clamp01((w - 1) / 5)),
      observed: `${i.isActive ? "Sigue activo" : "Ya no circula"} · lanzamientos en ${plural(w, "semana", "semanas")} distintas`,
      explanation: "Si el anunciante sigue lanzando anuncios hacia el mismo destino en semanas distintas, la campaña tiene continuidad en el tiempo."
    });
    const rank = i.impressionRank && i.impressionRank > 0 ? Math.round(i.impressionRank) : null;
    const rankPts = !rank ? 0 : rank === 1 ? 10 : rank <= 3 ? 9 : rank <= 10 ? 7.5 : rank <= 30 ? 5.5 : rank <= 60 ? 3.5 : 1.5;
    signals.push({
      key: "impressions",
      label: "Más visto (ranking de Meta)",
      max: 10,
      points: rankPts,
      observed: rank ? `Top #${rank} en impresiones${i.impressionQuery ? ` para «${i.impressionQuery}»` : ""}` : "Sin ranking de impresiones (búscalo desde el radar para obtenerlo)",
      explanation: "Posición del anuncio cuando la Biblioteca ordena la búsqueda por impresiones totales. Meta solo publica el orden, no cifras de vistas ni de ventas."
    });
    const score = Math.round(signals.reduce((s, x) => s + x.points, 0));
    return { score: Math.max(0, Math.min(100, score)), signals };
  }
  function scoreTier(score) {
    if (score >= 70) return { label: "Señales altas", tone: "high" };
    if (score >= 40) return { label: "Señales moderadas", tone: "mid" };
    return { label: "Señales bajas", tone: "low" };
  }
  var SCORE_DISCLAIMER = "Puntuación orientativa basada solo en señales públicas observables (tiempo activo, copias, volumen, repetición, diversidad, destino, continuidad y ranking de impresiones de Meta). No mide ventas, conversiones ni rentabilidad, y no indica que un anuncio sea ganador.";

  // src/lib/advertiser-stats.ts
  var NO_LANDING = "__sin_destino__";
  function computeAdvertiserStats(rows, now = /* @__PURE__ */ new Date()) {
    const active = rows.filter((r) => r.isActive);
    const hashCounts = /* @__PURE__ */ new Map();
    const offerCounts = /* @__PURE__ */ new Map();
    const groups = /* @__PURE__ */ new Map();
    for (const r of rows) {
      if (r.messageHash) hashCounts.set(r.messageHash, (hashCounts.get(r.messageHash) ?? 0) + 1);
      for (const o of r.offers) offerCounts.set(o, (offerCounts.get(o) ?? 0) + 1);
      const g = r.landingKey ?? NO_LANDING;
      groups.set(g, [...groups.get(g) ?? [], r]);
    }
    const groupStats = /* @__PURE__ */ new Map();
    for (const [key, list] of Array.from(groups.entries())) {
      const creatives = new Set(list.map((r) => r.messageHash ?? r.media[0]?.url ?? r.id));
      const formats = new Set(list.map((r) => r.format).filter((f) => f !== "unknown"));
      const weeks = new Set(list.map((r) => r.startDate ? isoWeekKey(r.startDate) : null).filter(Boolean));
      groupStats.set(key, { creatives: creatives.size, formats: Math.max(1, formats.size), weeks: weeks.size });
    }
    const perAd = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const offerRepeat = r.offers.length ? Math.max(...r.offers.map((o) => (offerCounts.get(o) ?? 1) - 1)) : 0;
      const g = groupStats.get(r.landingKey ?? NO_LANDING);
      const result = computeScore({
        daysActive: daysActive(r.startDate, { isActive: r.isActive, stopDate: r.stopDate, lastSeenAt: r.lastSeenAt, now }),
        isActive: r.isActive,
        collationCount: r.collationCount,
        sameMessageCount: r.messageHash ? (hashCounts.get(r.messageHash) ?? 1) - 1 : 0,
        offers: r.offers,
        offerRepeatCount: offerRepeat,
        advertiserActiveAds: active.length,
        distinctCreatives: r.landingKey ? g.creatives : 1,
        distinctFormats: r.landingKey ? g.formats : 1,
        landingKind: r.landingDomain ? landingKind(r.landingDomain) : null,
        landingDomainOnly: !r.linkUrl,
        launchWeeks: r.landingKey ? g.weeks : r.startDate ? 1 : 0,
        impressionRank: r.impressionRank ?? null,
        impressionQuery: r.impressionQuery ?? null
      });
      perAd.set(r.id, { score: result.score, signals: result.signals });
    }
    const nicheCounts = /* @__PURE__ */ new Map();
    for (const r of rows) if (r.niche) nicheCounts.set(r.niche, (nicheCounts.get(r.niche) ?? 0) + 1);
    const mainNiche = Array.from(nicheCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      perAd,
      totalAds: rows.length,
      activeAds: active.length,
      landingCount: new Set(rows.map((r) => r.landingKey).filter(Boolean)).size,
      mainNiche
    };
  }

  // src/lib/lang.ts
  var STOPWORDS = {
    es: ["el", "la", "los", "las", "de", "del", "que", "y", "en", "un", "una", "para", "con", "por", "tu", "tus", "es", "mas", "nuestro", "nuestra", "ahora", "aqui", "hoy", "envio", "compra", "gratis", "solo", "cuando", "como", "pero", "muy", "sin", "lo"],
    pt: ["o", "a", "os", "as", "de", "do", "da", "dos", "das", "que", "e", "em", "um", "uma", "para", "com", "por", "voce", "seu", "sua", "mais", "agora", "aqui", "hoje", "frete", "nao", "sao", "esta", "muito", "sem", "compre", "nosso"],
    en: ["the", "and", "of", "to", "in", "for", "with", "you", "your", "is", "on", "our", "now", "get", "this", "that", "free", "shop", "today", "are", "it", "at", "from", "new", "more", "only"],
    fr: ["le", "la", "les", "de", "des", "du", "et", "en", "un", "une", "pour", "avec", "vous", "votre", "est", "sur", "nos", "plus", "maintenant", "livraison", "gratuite", "aujourd", "dans", "pas"],
    it: ["il", "lo", "la", "gli", "le", "di", "del", "della", "che", "e", "per", "con", "un", "una", "tuo", "tua", "piu", "ora", "spedizione", "gratuita", "oggi", "sono", "non", "nel"],
    de: ["der", "die", "das", "und", "zu", "mit", "fur", "ist", "ein", "eine", "dein", "deine", "jetzt", "auf", "nicht", "sie", "wir", "versand", "kostenlos", "heute", "bei", "auch", "noch"]
  };
  var LANGUAGE_NAMES = {
    es: "Español",
    pt: "Portugués",
    en: "Inglés",
    fr: "Francés",
    it: "Italiano",
    de: "Alemán"
  };
  function detectLanguage(text) {
    if (!text) return null;
    const words = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
    if (words.length < 4) return null;
    let best = null;
    let bestScore = 0;
    let second = 0;
    for (const [lang, list] of Object.entries(STOPWORDS)) {
      const set = new Set(list);
      const score = words.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0);
      if (score > bestScore) {
        second = bestScore;
        bestScore = score;
        best = lang;
      } else if (score > second) {
        second = score;
      }
    }
    if (bestScore < 2 || bestScore - second < 1) return null;
    return best;
  }

  // src/lib/text.ts
  function normalizeText(input) {
    if (!input) return "";
    return input.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^\p{L}\p{N}%$€£]+/gu, " ").replace(/\s+/g, " ").trim();
  }
  function messageHash(body, title) {
    const text = normalizeText(`${body ?? ""} ${title ?? ""}`);
    if (text.length < 12) return null;
    return fnv1a64(text);
  }
  function fnv1a64(input) {
    let h = BigInt("0xcbf29ce484222325");
    const prime = BigInt("0x100000001b3");
    const mask = BigInt("0xffffffffffffffff");
    for (const byte of new TextEncoder().encode(input)) {
      h ^= BigInt(byte);
      h = h * prime & mask;
    }
    return h.toString(16).padStart(16, "0");
  }
  var OFFER_PATTERNS = [
    ["Descuento", /\b\d{1,2}\s?%\s?(off|de descuento|dto|desconto|descuento)?|\bdescuento|\bdesconto|\bsale\b|\brebaja|\boferta|\bpromo(cion|cao)?\b/],
    ["Envío gratis", /\benvio(s)? gratis|\bfrete gratis|\bfree shipping|\benvio sin costo/],
    ["2x1 / combo", /\b2\s?x\s?1\b|\b3\s?x\s?2\b|\bcombo|\bkit\b|\bpack\b|\blleva \d|\bcompra \d/],
    ["Gratis / regalo", /\bgratis\b|\bfree\b|\bregalo|\bbrinde|\bobsequio|\bde regalo/],
    ["Cuotas / pago", /\bcuotas|\bsin interes|\bparcelas|\bsem juros|\bmeses sin intereses|\bcontra ?entrega|\bpago contra/],
    ["Tiempo limitado", /\bsolo hoy|\bultimas? (unidades|horas)|\btiempo limitado|\bpor tiempo|\blimited time|\bhoy\b.*\bultimo|\bblack friday|\bcyber|\bhot sale|\bultimos dias/],
    ["Garantía", /\bgarantia|\bguarantee|\bdevolucion|\breembolso|\bmoney back/],
    ["Cupón", /\bcupon|\bcupom|\bcoupon|\bcodigo\b|\bcode\b/],
    ["Prueba gratis", /\bprueba gratis|\bfree trial|\bteste gratis|\bclase gratis|\bmuestra gratis/]
  ];
  function detectOffers(...parts) {
    const text = normalizeText(parts.filter(Boolean).join(" "));
    if (!text) return [];
    return OFFER_PATTERNS.filter(([, re]) => re.test(text)).map(([label]) => label);
  }
  function truncate(text, max) {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
  }

  // src/lib/niche/catalog.ts
  var NICHES = [
    {
      id: "salud",
      label: "Salud y bienestar",
      description: "salud general, dolor, sueño, digestión, tratamientos naturales",
      seed: "salud natural",
      strong: ["dolor articular", "articulaciones", "menopausia", "diabetes", "presion arterial", "colesterol", "insomnio", "digestion", "intestino", "inflamacion", "detox", "migrana", "varices", "hongos", "artritis", "ciatica", "prostata", "higado", "tiroides", "clinica", "odontologia", "dentista", "medico", "fisioterapia", "salud natural", "gut health"],
      weak: ["salud", "saude", "health", "bienestar", "bem estar", "wellness", "natural", "energia", "doctor", "terapia", "sueno", "dormir", "dolor", "cuerpo"],
      categories: ["health", "medical", "doctor", "hospital", "dentist", "pharmacy", "salud", "wellness"]
    },
    {
      id: "salud_mental",
      label: "Salud mental",
      description: "ansiedad, estrés, terapia, emociones, autoestima",
      seed: "ansiedad",
      strong: ["ansiedad", "estres", "depresion", "ataques de panico", "salud mental", "psicologo", "psicologa", "psicologia", "terapia online", "burnout", "trauma", "tdah", "autoestima", "mental health", "anxiety", "therapy", "overthinking"],
      weak: ["emociones", "emocional", "calma", "paz mental", "mente", "sanar", "bienestar emocional"],
      categories: ["psychologist", "mental health", "therapist", "counselor"]
    },
    {
      id: "educacion",
      label: "Educación académica",
      description: "colegios, universidades, tareas, exámenes, refuerzo escolar",
      seed: "universidad",
      strong: ["universidad", "colegio", "maestria", "doctorado", "pregrado", "bachillerato", "icfes", "examen de admision", "matriculas", "inscripciones", "beca", "becas", "tareas", "refuerzo escolar", "matematicas", "lectura", "ninos aprendan", "homeschool", "student", "college"],
      weak: ["educacion", "educacao", "education", "estudiar", "estudar", "alumnos", "escuela", "academia", "profesor", "aprendizaje", "estudiantes"],
      categories: ["education", "school", "college", "university", "tutor", "educational"]
    },
    {
      id: "cursos",
      label: "Cursos y formación online",
      description: "cursos, masterclass, certificaciones y formación a distancia",
      seed: "curso online",
      strong: ["curso online", "curso", "cursos", "masterclass", "clase gratis", "aula gratuita", "certificado", "certificacion", "diplomado", "capacitacion", "formacion", "bootcamp", "webinar", "taller online", "workshop", "aprende", "aprender", "aprenda", "inscribete", "modulos", "online course", "lecciones"],
      weak: ["clases", "online", "desde casa", "a tu ritmo", "acceso de por vida", "comunidad"],
      categories: ["education website", "online course", "course"]
    },
    {
      id: "fitness",
      label: "Fitness y entrenamiento",
      description: "gimnasio, rutinas, ejercicio en casa, deporte",
      seed: "rutina de ejercicios",
      strong: ["gimnasio", "gym", "entrenamiento", "treino", "workout", "rutina de ejercicios", "ejercicios en casa", "musculo", "masa muscular", "pilates", "yoga", "crossfit", "running", "abdominales", "gluteos", "calistenia", "personal trainer", "entrenador personal", "quemar grasa", "fat burning"],
      weak: ["fitness", "deporte", "esporte", "sport", "ejercicio", "exercicio", "cardio", "atleta", "tonificar", "fuerza"],
      categories: ["gym", "fitness", "sports", "athlete", "yoga", "personal trainer"]
    },
    {
      id: "nutricion",
      label: "Nutrición y dietas",
      description: "dietas, alimentación, planes de comida",
      seed: "dieta",
      strong: ["dieta", "dietas", "bajar de peso", "perder peso", "adelgazar", "emagrecer", "weight loss", "plan de alimentacion", "plan de comidas", "nutricionista", "keto", "ayuno intermitente", "antiinflamatoria", "deficit calorico", "recetas saludables", "meal plan", "comer sano", "alimentacion saludable"],
      weak: ["nutricion", "nutricao", "nutrition", "alimentacion", "calorias", "saludable", "saludables", "kilos", "peso"],
      categories: ["nutritionist", "dietitian", "nutrition"]
    },
    {
      id: "desarrollo_personal",
      label: "Desarrollo personal",
      description: "hábitos, mentalidad, motivación, superación",
      seed: "desarrollo personal",
      strong: ["desarrollo personal", "crecimiento personal", "mentalidad", "mindset", "habitos", "disciplina", "motivacion", "proposito de vida", "superacion", "inteligencia emocional", "confianza en ti", "mejor version", "self improvement", "personal growth"],
      weak: ["transformacion", "exito", "metas", "felicidad", "cambiar tu vida", "potencial"],
      categories: ["personal coach", "motivational speaker", "public figure"]
    },
    {
      id: "crianza",
      label: "Crianza y familia",
      description: "bebés, embarazo, maternidad, niños, vida en familia",
      seed: "crianza",
      strong: ["crianza", "bebe", "bebes", "embarazo", "embarazada", "lactancia", "maternidad", "paternidad", "panales", "fraldas", "recien nacido", "baby", "mama primeriza", "berrinches", "rabietas", "ninos", "criancas", "kids", "parenting", "cuentos para ninos", "juguetes", "infantil"],
      weak: ["hijos", "hijo", "hija", "mamas", "maes", "familia", "padres", "toddler"],
      categories: ["baby", "kids", "children", "toy", "maternity", "parenting"]
    },
    {
      id: "suplementos",
      label: "Suplementos",
      description: "vitaminas, proteínas, colágeno y suplementación",
      seed: "suplementos",
      strong: ["suplemento", "suplementos", "suplementacion", "colageno", "vitamina", "vitaminas", "probiotico", "proteina", "whey", "creatina", "magnesio", "omega 3", "capsulas", "gomitas", "pre entreno", "aminoacidos", "supplement", "supplements"],
      weak: ["multivitaminico", "dosis", "formula", "ingredientes naturales"],
      categories: ["nutrition supplement", "supplement", "vitamins"]
    },
    {
      id: "espiritualidad",
      label: "Espiritualidad",
      description: "meditación, energía, tarot, astrología, manifestación",
      seed: "meditacion",
      strong: ["espiritualidad", "espiritual", "meditacion", "meditar", "tarot", "astrologia", "horoscopo", "carta astral", "manifestar", "manifestacion", "ley de atraccion", "chakras", "energia espiritual", "sanacion", "reiki", "constelaciones", "angeles", "abundancia", "spiritual"],
      weak: ["universo", "vibracion", "energia", "alma", "intuicion", "despertar"],
      categories: ["spiritual", "astrologist", "psychic", "religious center"]
    },
    {
      id: "productividad",
      label: "Productividad",
      description: "organización, gestión del tiempo, agendas, planificación",
      seed: "productividad",
      strong: ["productividad", "productivo", "gestion del tiempo", "organizacion personal", "planner", "planificador", "agenda", "notion", "to do", "procrastinacion", "enfoque", "rutina diaria", "time management", "productivity"],
      weak: ["organizar", "organizate", "tiempo", "tareas", "planifica", "concentracion"],
      categories: ["productivity"]
    },
    {
      id: "religion",
      label: "Religión",
      description: "fe, Biblia, oración, iglesia, cristianismo",
      seed: "biblia",
      strong: ["biblia", "oracion", "orar", "jesus", "cristo", "dios", "iglesia", "fe cristiana", "devocional", "evangelio", "versiculo", "catolico", "cristiano", "cristiana", "salmo", "pastor", "bible", "prayer", "god"],
      weak: ["fe", "bendicion", "bendiciones", "senor", "gloria", "espiritu santo"],
      categories: ["religious", "church", "religious organization", "christian"]
    },
    {
      id: "belleza",
      label: "Belleza y estética",
      description: "skincare, maquillaje, cabello, tratamientos estéticos",
      seed: "skincare",
      strong: ["serum", "skincare", "skin care", "crema facial", "antiarrugas", "arrugas", "manchas", "acne", "maquillaje", "maquiagem", "makeup", "cabello", "caida del cabello", "shampoo", "champu", "pestanas", "unas", "perfume", "fragancia", "depilacion", "protector solar", "rutina facial", "cosmetico", "cosmeticos", "labial", "botox", "estetica", "tratamiento facial"],
      weak: ["belleza", "beleza", "beauty", "piel", "pele", "skin", "rostro", "glow", "hidratacion", "cuidado personal", "spa", "salon"],
      categories: ["beauty", "cosmetic", "skin care", "hair salon", "barber", "spa", "perfume"]
    },
    {
      id: "marketing",
      label: "Marketing digital",
      description: "publicidad online, redes sociales, embudos y tráfico",
      seed: "marketing digital",
      strong: ["marketing digital", "facebook ads", "meta ads", "google ads", "tiktok ads", "trafico pago", "embudo", "funnel", "copywriting", "agencia de marketing", "redes sociales para negocios", "community manager", "seo", "publicidad online", "anuncios que venden", "marketing"],
      weak: ["clientes potenciales", "estrategia", "campanas", "alcance", "engagement", "marca personal"],
      categories: ["marketing agency", "advertising", "digital creator", "advertising/marketing"]
    },
    {
      id: "relaciones",
      label: "Relaciones y citas",
      description: "pareja, conquista, reconquista, citas, sexualidad",
      seed: "pareja",
      strong: ["pareja", "relaciones de pareja", "reconquistar", "recuperar a tu ex", "ex pareja", "citas", "conquistar", "seduccion", "enamorar", "matrimonio", "infidelidad", "sexualidad", "dating", "relationship", "soltera", "soltero"],
      weak: ["amor", "novio", "novia", "esposo", "esposa", "corazon"],
      categories: ["dating service", "relationship coach"]
    },
    {
      id: "ia",
      label: "Inteligencia artificial",
      description: "herramientas de IA, ChatGPT y automatización",
      seed: "inteligencia artificial",
      strong: ["inteligencia artificial", "chatgpt", "chat gpt", "ia generativa", "prompts", "automatizacion con ia", "agentes de ia", "artificial intelligence", "ai tools", "midjourney", "claude", "gemini", "con ia", "usando ia"],
      weak: ["automatiza", "automatizacion", "algoritmo", "robot", "ai"],
      categories: ["artificial intelligence"]
    },
    {
      id: "finanzas",
      label: "Finanzas personales",
      description: "ahorro, deudas, crédito, presupuesto y préstamos",
      seed: "salir de deudas",
      strong: ["finanzas personales", "ahorro", "ahorrar", "deudas", "salir de deudas", "presupuesto", "prestamo", "prestamos", "credito", "tarjeta de credito", "libre inversion", "educacion financiera", "libertad financiera", "cuenta digital", "billetera", "fintech", "personal finance"],
      weak: ["finanzas", "financas", "finance", "dinero", "dinheiro", "money", "banco", "pagos", "cuotas"],
      categories: ["finance", "bank", "financial", "credit union", "financial service"]
    },
    {
      id: "gastronomia",
      label: "Gastronomía y recetas",
      description: "recetas, cocina, restaurantes y comida a domicilio",
      seed: "recetas",
      strong: ["receta", "recetas", "cocina", "cocinar", "restaurante", "delivery", "domicilio", "pizza", "hamburguesa", "sushi", "menu", "almuerzo", "cena", "postres", "reposteria", "panaderia", "pasteleria", "chef", "gourmet", "platos"],
      weak: ["sabor", "delicioso", "rico", "hambre", "food", "comer", "comida"],
      categories: ["restaurant", "food", "bakery", "cafe", "chef", "cooking"]
    },
    {
      id: "emprendimiento",
      label: "Emprendimiento y negocios",
      description: "emprender, negocio propio, pymes y franquicias",
      seed: "emprendimiento",
      strong: ["emprendedor", "emprendedores", "emprender", "emprendimiento", "negocio propio", "negocio digital", "escalar tu negocio", "pymes", "franquicia", "infoproducto", "ingresos extra", "trabajar desde casa", "ganar dinero", "business", "facturar", "modelo de negocio"],
      weak: ["negocio", "negocios", "empresa", "ingresos", "socio", "inversion inicial"],
      categories: ["business", "consulting", "entrepreneur", "small business"]
    },
    {
      id: "software",
      label: "Software y SaaS",
      description: "apps, plataformas, programas y suscripciones de software",
      seed: "software",
      strong: ["software", "saas", "app", "aplicacion", "aplicativo", "descarga la app", "descargar", "baixe", "download", "app store", "google play", "prueba gratis", "free trial", "crm", "erp", "programa contable", "sistema de facturacion"],
      weak: ["plataforma", "usuarios", "dashboard", "integraciones", "nube", "cloud"],
      categories: ["software", "app page", "internet company", "computer company"]
    },
    {
      id: "idiomas",
      label: "Idiomas",
      description: "inglés, portugués y aprendizaje de idiomas",
      seed: "aprender ingles",
      strong: ["ingles", "aprender ingles", "hablar ingles", "frances", "aleman", "portugues", "italiano", "idiomas", "idioma", "english", "language", "fluidez", "nativo", "toefl", "ielts"],
      weak: ["pronunciacion", "vocabulario", "gramatica", "conversacion"],
      categories: ["language school", "languages"]
    },
    {
      id: "hogar",
      label: "Hogar y decoración",
      description: "muebles, decoración, cocina, limpieza y organización",
      seed: "decoracion hogar",
      strong: ["decoracion", "decoracao", "home decor", "muebles", "moveis", "furniture", "colchon", "colchones", "sabanas", "utensilios", "organizador", "iluminacion", "lampara", "alfombra", "cortinas", "jardin", "limpieza", "aspiradora", "electrodomesticos", "freidora", "sofa", "cocina integral"],
      weak: ["hogar", "casa", "home", "living", "dormitorio", "bano", "ambiente"],
      categories: ["home decor", "furniture", "home improvement", "kitchen", "household", "garden"]
    },
    {
      id: "empleo",
      label: "Empleo y carrera profesional",
      description: "trabajo, currículum, entrevistas y vacantes",
      seed: "empleo",
      strong: ["empleo", "vacante", "vacantes", "oferta de trabajo", "ofertas de trabajo", "hoja de vida", "curriculum", "cv", "entrevista de trabajo", "linkedin", "carrera profesional", "postulate", "contratando", "estamos contratando", "trabaja con nosotros", "job", "hiring"],
      weak: ["trabajo", "salario", "sueldo", "oportunidad laboral", "profesional"],
      categories: ["employment agency", "recruiter", "jobs"]
    },
    {
      id: "mascotas",
      label: "Mascotas",
      description: "perros, gatos, alimento, accesorios y veterinaria",
      seed: "perros",
      strong: ["perro", "perros", "gato", "gatos", "cachorro", "mascota", "mascotas", "pet shop", "veterinaria", "veterinario", "alimento para perros", "racao", "dog", "cat", "pets", "arnes", "collar para perro", "arena para gatos", "adiestramiento"],
      weak: ["peludo", "peludos", "animal", "animales"],
      categories: ["pet", "veterinarian", "animal", "pet store"]
    },
    {
      id: "musica",
      label: "Música y audio",
      description: "instrumentos, canto, producción musical y audio",
      seed: "aprender guitarra",
      strong: ["guitarra", "piano", "canto", "cantar", "bateria musical", "produccion musical", "beats", "instrumento", "musico", "spotify", "podcast", "audiolibro", "audiolibros", "music", "dj"],
      weak: ["musica", "cancion", "canciones", "audio", "sonido"],
      categories: ["musician", "band", "music", "record label", "podcast"]
    },
    {
      id: "coaching",
      label: "Coaching y consultoría",
      description: "mentorías, asesorías y acompañamiento 1 a 1",
      seed: "mentoria",
      strong: ["coaching", "coach", "mentoria", "mentor", "asesoria", "consultoria", "consultor", "acompanamiento", "sesion 1 a 1", "agenda una llamada", "llamada gratuita", "programa de acompanamiento", "consulting"],
      weak: ["guia", "estrategia personalizada", "resultados", "metodo"],
      categories: ["coach", "life coach", "consulting agency", "business consultant"]
    },
    {
      id: "contenido",
      label: "Creación de contenido",
      description: "influencers, YouTube, TikTok, edición y UGC",
      seed: "creador de contenido",
      strong: ["creador de contenido", "creadores de contenido", "influencer", "youtube", "tiktok", "reels", "ugc", "editar videos", "edicion de video", "monetizar", "seguidores", "viralizar", "contenido viral", "content creator"],
      weak: ["contenido", "videos", "redes", "instagram", "audiencia"],
      categories: ["digital creator", "video creator", "blogger", "creator"]
    },
    {
      id: "diseno",
      label: "Diseño y creatividad",
      description: "diseño gráfico, Canva, arte y manualidades",
      seed: "diseño grafico",
      strong: ["diseno grafico", "canva", "photoshop", "ilustracion", "dibujo", "pintura", "manualidades", "crochet", "tejido", "bordado", "plantillas", "caligrafia", "arte", "design", "procreate"],
      weak: ["creatividad", "creativo", "colores", "logo", "logos"],
      categories: ["graphic designer", "artist", "arts & crafts", "design"]
    },
    {
      id: "gaming",
      label: "Videojuegos y gaming",
      description: "juegos, consolas, apuestas y casinos online",
      seed: "juegos",
      strong: ["videojuego", "videojuegos", "juego", "jogo", "game", "gaming", "jugar", "consola", "playstation", "xbox", "nintendo", "casino", "apuestas", "slots", "bonus de bienvenida", "free spins"],
      weak: ["nivel", "jugadores", "partida", "ganar premios"],
      categories: ["video game", "games", "gaming", "casino", "gambling"]
    },
    {
      id: "ecommerce",
      label: "E-commerce y dropshipping",
      description: "tiendas online, dropshipping, Shopify y envíos",
      seed: "pago contra entrega",
      strong: ["dropshipping", "ecommerce", "e commerce", "tienda online", "shopify", "pago contra entrega", "contra entrega", "envio gratis", "envios a todo el pais", "compra ahora", "stock limitado", "ultimas unidades", "producto ganador", "mayorista", "por mayor"],
      weak: ["pedido", "pedidos", "envio", "envios", "tienda", "comprar"],
      categories: ["shopping & retail", "e-commerce website", "retail company"]
    },
    {
      id: "seguros",
      label: "Seguros",
      description: "seguros de vida, salud, auto y hogar",
      seed: "seguro de vida",
      strong: ["seguro", "seguros", "seguro de vida", "seguro de salud", "seguro de auto", "soat", "poliza", "aseguradora", "cobertura", "insurance"],
      weak: ["proteccion", "protege a tu familia", "asistencia"],
      categories: ["insurance", "insurance agent", "insurance company"]
    },
    {
      id: "moda",
      label: "Moda y accesorios",
      description: "ropa, calzado, bolsos, joyas y relojes",
      seed: "ropa mujer",
      strong: ["vestido", "vestidos", "zapatillas", "sneakers", "calzado", "zapatos", "jeans", "remera", "camiseta", "camisetas", "camisa", "blusa", "lenceria", "ropa interior", "bikini", "traje de bano", "chaqueta", "campera", "moda", "fashion", "outfit", "coleccion", "talles", "tallas", "bolsos", "carteras", "tenis", "sandalias", "chanclas", "pantuflas", "slippers", "botas", "botines", "pantalones", "pantalon", "falda", "conjunto", "conjuntos", "shorts", "medias", "pijama", "sudadera", "hoodie", "joyeria", "anillo", "collar", "aretes", "pulsera", "reloj", "relojes", "lentes de sol", "gafas", "plata 925"],
      weak: ["ropa", "roupa", "clothing", "estilo", "look", "tendencia", "temporada", "prenda", "boutique", "accesorios"],
      categories: ["clothing", "fashion", "shoe", "apparel", "boutique", "jewelry", "watch", "accessories"]
    },
    {
      id: "inversiones",
      label: "Inversiones y bolsa",
      description: "acciones, fondos, rentabilidad y patrimonio",
      seed: "invertir",
      strong: ["invertir", "inversion", "inversiones", "investir", "investimento", "acciones", "bolsa de valores", "fondos de inversion", "etf", "dividendos", "rentabilidad", "renta pasiva", "patrimonio", "cdt", "interes compuesto", "investing"],
      weak: ["rendimiento", "capital", "ganancias", "portafolio"],
      categories: ["investing service", "investment", "financial planner"]
    },
    {
      id: "ventas",
      label: "Ventas y prospección",
      description: "vender más, cierre de ventas, prospectos y CRM",
      seed: "cerrar ventas",
      strong: ["vender mas", "cerrar ventas", "cierre de ventas", "tecnicas de venta", "prospeccion", "prospectos", "vendedores", "equipo comercial", "whatsapp business", "ventas por whatsapp", "sales", "objeciones"],
      weak: ["ventas", "vendas", "vender", "clientes", "comercial"],
      categories: ["sales"]
    },
    {
      id: "fotografia",
      label: "Fotografía y video",
      description: "cámaras, fotografía y edición de video",
      seed: "fotografia",
      strong: ["fotografia", "fotografo", "camara", "camaras", "lightroom", "presets", "sesion de fotos", "filmmaking", "drone", "edicion de fotos", "photography", "videografia"],
      weak: ["fotos", "foto", "video", "lente"],
      categories: ["photographer", "photography", "videographer"]
    },
    {
      id: "trading",
      label: "Trading",
      description: "forex, cripto, opciones y señales",
      seed: "trading",
      strong: ["trading", "trader", "forex", "criptomonedas", "cripto", "bitcoin", "btc", "binance", "opciones binarias", "senales de trading", "scalping", "analisis tecnico", "crypto", "nasdaq"],
      weak: ["mercado", "velas", "graficos", "apalancamiento"],
      categories: ["cryptocurrency", "trading", "brokerage"]
    },
    {
      id: "eventos",
      label: "Eventos y experiencias",
      description: "conciertos, entradas, talleres presenciales y ferias",
      seed: "entradas concierto",
      strong: ["entradas", "ingressos", "tickets", "boletas", "concierto", "festival", "evento", "eventos", "teatro", "conferencia", "congreso", "expo", "feria", "taller presencial"],
      weak: ["experiencia", "en vivo", "ao vivo", "live", "noche", "cupos"],
      categories: ["event", "concert", "entertainment", "event planner", "performance venue"]
    },
    {
      id: "legal",
      label: "Legal y trámites",
      description: "abogados, visas, migración, trámites e impuestos",
      seed: "abogado",
      strong: ["abogado", "abogados", "advogado", "visa", "visas", "migracion", "pasaporte", "ciudadania", "residencia", "tramite", "tramites", "impuestos", "declaracion de renta", "demanda", "pension", "divorcio", "lawyer"],
      weak: ["legal", "derechos", "asesoria legal", "juridico"],
      categories: ["lawyer", "legal", "law firm", "immigration lawyer", "tax preparation"]
    },
    {
      id: "viajes",
      label: "Viajes y turismo",
      description: "vuelos, hoteles, paquetes y tours",
      seed: "viajes",
      strong: ["vuelos", "pasajes", "passagens", "hotel", "hoteles", "resort", "paquetes turisticos", "vacaciones", "travel", "crucero", "todo incluido", "agencia de viajes", "excursion", "tour", "hospedaje", "airbnb", "destino"],
      weak: ["viaje", "viajar", "viagem", "turismo", "playa", "praia", "aventura", "escapada"],
      categories: ["travel", "hotel", "tour", "airline", "tourism"]
    },
    {
      id: "inmobiliaria",
      label: "Bienes raíces",
      description: "venta y alquiler de propiedades, proyectos y lotes",
      seed: "apartamentos",
      strong: ["departamento", "departamentos", "apartamento", "apartamentos", "casa en venta", "venta de casas", "alquiler", "arriendo", "inmobiliaria", "imobiliaria", "real estate", "lotes", "terrenos", "preventa", "condominio", "bienes raices", "propiedad", "propiedades", "proyecto de vivienda", "vis"],
      weak: ["casa propia", "credito hipotecario", "metros cuadrados", "m2", "entrega inmediata"],
      categories: ["real estate", "property", "apartment", "inmobiliaria"]
    },
    {
      id: "leads",
      label: "Generación de leads",
      description: "formularios, cotizaciones, citas y registros",
      seed: "cotiza gratis",
      strong: ["cotiza", "cotizacion", "cotizar", "solicita informacion", "dejanos tus datos", "agenda tu cita", "agenda una cita", "registrate", "formulario", "asesor te contactara", "te llamamos", "solicita tu", "get a quote"],
      weak: ["contactanos", "escribenos", "informacion"],
      categories: []
    },
    {
      id: "tecnologia",
      label: "Tecnología y gadgets",
      description: "celulares, audífonos y accesorios electrónicos",
      seed: "audífonos",
      strong: ["smartphone", "celular", "iphone", "android", "auriculares", "audifonos", "fone de ouvido", "smartwatch", "laptop", "notebook", "computadora", "tablet", "gadget", "cargador", "bluetooth", "parlante", "camara de seguridad", "consola", "funda para telefono", "power bank"],
      weak: ["tecnologia", "technology", "tech", "wifi", "inteligente", "electronica", "pantalla", "bateria"],
      categories: ["electronics", "computer", "technology", "mobile phone shop"]
    },
    {
      id: "automotriz",
      label: "Automotriz y movilidad",
      description: "autos, motos, repuestos y concesionarios",
      seed: "carros",
      strong: ["auto", "autos", "carro", "carros", "coche", "vehiculo", "vehiculos", "camioneta", "suv", "concesionario", "concesionaria", "0km", "test drive", "neumaticos", "llantas", "repuestos", "taller mecanico", "moto", "motos", "motocicleta", "scooter electrico"],
      weak: ["manejar", "conducir", "motor", "kilometros", "seminuevo", "usados"],
      categories: ["automotive", "car dealership", "motorcycle", "vehicle", "auto"]
    },
    {
      id: "alimentos",
      label: "Alimentos y bebidas",
      description: "snacks, bebidas, café y productos de consumo",
      seed: "snacks",
      strong: ["snack", "snacks", "mani", "crema de mani", "mantequilla de mani", "galletas", "granola", "cereal", "chocolate", "helado", "cafe", "cerveza", "vino", "vinos", "bebida", "bebidas", "jugo", "jugos", "salsa", "arepas", "empanadas", "organico", "vegano"],
      weak: ["sabor", "delicioso", "antojo", "merienda"],
      categories: ["food & beverage", "beverage", "grocery", "winery", "brewery", "food"]
    },
    {
      id: "servicios",
      label: "Servicios y hogar",
      description: "plomería, limpieza, reformas, mudanzas y energía solar",
      seed: "energia solar",
      strong: ["plomero", "electricista", "mudanzas", "fletes", "limpieza de oficinas", "remodelacion", "reformas", "energia solar", "paneles solares", "fumigacion", "cerrajero", "aire acondicionado", "instalacion", "mantenimiento"],
      weak: ["servicio", "servicios", "servicos", "services", "presupuesto", "a domicilio"],
      categories: ["contractor", "service", "plumber", "electrician", "solar", "cleaning service"]
    }
  ];
  var NICHE_LABELS = Object.fromEntries(NICHES.map((n) => [n.id, n.label]));
  var NICHE_BY_ID = Object.fromEntries(NICHES.map((n) => [n.id, n]));
  function nicheLabel(id) {
    if (!id || id === "none") return "Sin clasificar";
    return NICHE_LABELS[id] ?? id;
  }

  // src/lib/niche/rules.ts
  var CHANNEL_NICHES = /* @__PURE__ */ new Set(["ecommerce", "leads"]);
  var termCache = /* @__PURE__ */ new Map();
  function termRegex(term) {
    if (!termCache.has(term)) {
      const t = normalizeText(term);
      termCache.set(term, t ? new RegExp(`(?:^| )${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?= |$)`, "g") : null);
    }
    return termCache.get(term);
  }
  function countTerm(haystack, term) {
    const re = termRegex(term);
    if (!re) return 0;
    re.lastIndex = 0;
    return (haystack.match(re) ?? []).length;
  }
  function classifyByRules(input) {
    const text = ` ${normalizeText(
      [input.title, input.body, input.linkDescription, input.pageName, (input.caption ?? "").replace(/\./g, " ")].filter(Boolean).join(" ")
    )} `;
    const cats = normalizeText((input.categories ?? []).join(" | "));
    const scored = [];
    let total = 0;
    for (const n of NICHES) {
      let score = 0;
      const terms = [];
      let rest = text;
      for (const term of n.strong) {
        const c = countTerm(text, term);
        if (c) {
          score += 2 * Math.min(c, 3);
          terms.push(term);
          const re = termRegex(term);
          re.lastIndex = 0;
          rest = rest.replace(re, " ");
        }
      }
      for (const term of n.weak) {
        const c = countTerm(rest, term);
        if (c) {
          score += Math.min(c, 3);
          terms.push(term);
        }
      }
      for (const cat of n.categories ?? []) {
        if (cats && cats.includes(normalizeText(cat))) {
          score += 4;
          terms.push(`categoría: ${cat}`);
        }
      }
      total += score;
      if (score > 0) scored.push({ id: n.id, score: CHANNEL_NICHES.has(n.id) ? score * 0.6 : score, terms });
    }
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best || best.score < 1.2) return { niche: null, niches: [], confidence: 0, terms: [] };
    const niches = scored.filter((s) => s.score >= Math.max(1.2, best.score * 0.45)).slice(0, 3).map((s) => s.id);
    const share = best.score / total;
    const volume = Math.min(1, best.score / 8);
    return { niche: best.id, niches, confidence: Math.round(share * volume * 100) / 100, terms: best.terms.slice(0, 8) };
  }

  // src/lib/price.ts
  var CURRENCY = [
    [/^AR\$$/i, "ARS"],
    [/^US\$$/i, "USD"],
    [/^USD$/i, "USD"],
    [/^R\$$/i, "BRL"],
    [/^S\/\.?$/i, "PEN"],
    [/^COP$/i, "COP"],
    [/^MXN$/i, "MXN"],
    [/^CLP$/i, "CLP"],
    [/^€|EUR$/i, "EUR"],
    [/^\$$/, "$"]
  ];
  var PREFIX = String.raw`(AR\$|US\$|R\$|S\/\.?|COP|MXN|CLP|USD|EUR|€|\$)\s?`;
  var NUMBER = String.raw`(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d{1,6}(?:[.,]\d{1,2})?)`;
  var SUFFIX = String.raw`\s?(USD|COP|MXN|CLP|EUR|€|pesos|d[oó]lares|reales|soles)`;
  function parseAmount(raw) {
    let s = raw.replace(/\s/g, "");
    const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    if (lastSep >= 0 && s.length - lastSep - 1 <= 2 && s.length - lastSep - 1 > 0) {
      s = s.slice(0, lastSep).replace(/[.,]/g, "") + "." + s.slice(lastSep + 1);
    } else {
      s = s.replace(/[.,]/g, "");
    }
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function currencyOf(sym) {
    for (const [re, code] of CURRENCY) if (re.test(sym.trim())) return code;
    const s = sym.toLowerCase();
    if (s.startsWith("peso")) return "$";
    if (s.startsWith("d")) return "USD";
    if (s.startsWith("real")) return "BRL";
    if (s.startsWith("sol")) return "PEN";
    return null;
  }
  function extractPrice(...parts) {
    const text = parts.filter(Boolean).join(" \n ");
    if (!text) return null;
    const pre = new RegExp(`${PREFIX}${NUMBER}(?!\\s?%)`, "i").exec(text);
    if (pre) {
      const amount = parseAmount(pre[2]);
      if (amount && amount >= 1) return { text: `${pre[1].replace(/\s+/g, "")} ${pre[2].trim()}`, amount, currency: currencyOf(pre[1]) };
    }
    const post = new RegExp(`${NUMBER}${SUFFIX}\\b`, "i").exec(text);
    if (post) {
      const amount = parseAmount(post[1]);
      if (amount && amount >= 1) return { text: `${post[1].trim()} ${post[2]}`, amount, currency: currencyOf(post[2]) };
    }
    return null;
  }

  // src/lib/merge.ts
  var ID_RE = /^[A-Za-z0-9_-]{3,64}$/;
  var union = (a, b) => Array.from(/* @__PURE__ */ new Set([...a, ...b]));
  var pick = (next, prev) => next !== null && next !== void 0 && next !== "" ? next : prev ?? null;
  var minDate = (a, b) => !a ? b : !b ? a : a < b ? a : b;
  function mediaExpiry(media) {
    let min = null;
    for (const m of media) {
      for (const url of [m.url, m.preview]) {
        if (!url) continue;
        const match = url.match(/[?&]oe=([0-9A-Fa-f]{6,10})/);
        if (match) {
          const t = parseInt(match[1], 16) * 1e3;
          if (Number.isFinite(t) && (min === null || t < min)) min = t;
        }
      }
    }
    return min ? new Date(min).toISOString() : null;
  }
  function inferFormat(ad) {
    if (ad.format && ad.format !== "unknown") return ad.format;
    if (ad.media.length > 1) return "carousel";
    if (ad.media[0]?.type === "video") return "video";
    if (ad.media[0]?.type === "image") return "image";
    return "unknown";
  }
  function prepareBatch(input) {
    const errors = [];
    let skipped = 0;
    const byId = /* @__PURE__ */ new Map();
    for (const ad of input) {
      if (!ad || !ad.id || !ID_RE.test(ad.id)) {
        skipped++;
        if (errors.length < 20) errors.push(`ID inválido: ${String(ad?.id ?? "")}`);
        continue;
      }
      if (!ad.pageId || !ad.pageName) {
        skipped++;
        if (errors.length < 20) errors.push(`Anuncio ${ad.id} sin anunciante identificado`);
        continue;
      }
      const prev = byId.get(ad.id);
      if (!prev || prev.partial && !ad.partial || ad.media.length > prev.media.length) byId.set(ad.id, ad);
    }
    return { ads: Array.from(byId.values()), skipped, errors };
  }
  function mergeAd(existing, ad, ctx) {
    const countries = (ad.countries.length ? ad.countries : ctx.queryCountries ?? []).map((c) => c.toUpperCase());
    const weak = Boolean(ad.partial && existing && !existing.partial);
    const e = existing;
    const pageName = weak ? e.pageName : ad.pageName;
    const isActive = ad.isActive ?? (e ? e.isActive : true);
    const body = weak ? e.body : pick(ad.body, e?.body);
    const title = weak ? e.title : pick(ad.title, e?.title);
    const linkDescription = weak ? e.linkDescription : pick(ad.linkDescription, e?.linkDescription);
    const caption = pick(weak ? null : ad.caption, e?.caption);
    const linkUrlRaw = pick(weak ? null : ad.linkUrl, e?.linkUrl);
    const media = ad.media.length && !weak ? ad.media : e?.media ?? ad.media;
    const sources = union(e?.sources ?? [], [ctx.source]);
    const partial = e ? e.partial && Boolean(ad.partial) : Boolean(ad.partial);
    const languages = union(e?.languages ?? [], ad.languages.map((l) => l.toLowerCase()));
    let format = inferFormat({ format: weak ? e.format ?? "unknown" : ad.format, media });
    if (format === "unknown" && !media.length && body && !partial && sources.includes("extension")) format = "text";
    const landing = normalizeLanding(linkUrlRaw, caption);
    const hash = messageHash(body, title);
    const offers = detectOffers(body, title, linkDescription);
    const language = languages[0] ?? detectLanguage([body, title, linkDescription].filter(Boolean).join(" "));
    let niche = e?.niche ?? null;
    let niches = e?.niches ?? (niche ? [niche] : []);
    let nicheConfidence = e?.nicheConfidence ?? null;
    let nicheSource = e?.nicheSource ?? null;
    let nicheTerms = e?.nicheTerms ?? [];
    const keepNiche = e && (e.nicheSource === "ai" || e.nicheSource === "manual") && e.messageHash === hash;
    if (!keepNiche) {
      const r = classifyByRules({
        body,
        title,
        linkDescription,
        caption: landing?.domain ?? caption,
        pageName,
        categories: ad.advertiser?.categories
      });
      niche = r.niche;
      niches = r.niches;
      nicheConfidence = r.confidence;
      nicheSource = r.niche ? "rules" : null;
      nicheTerms = r.terms;
    }
    const record = {
      id: ad.id,
      pageId: ad.pageId,
      pageName,
      isActive,
      startDate: minDate(ad.startDate, e?.startDate ?? null),
      stopDate: ad.isActive === true ? null : pick(ad.stopDate, e?.stopDate),
      platforms: ad.platforms.length && !weak ? ad.platforms : e?.platforms ?? ad.platforms,
      languages,
      countries: union(e?.countries ?? [], countries),
      language: language ?? null,
      body,
      title,
      linkDescription,
      caption,
      ctaText: pick(weak ? null : ad.ctaText, e?.ctaText),
      linkUrl: landing?.url ?? null,
      landingKey: landing?.key ?? null,
      landingDomain: landing?.domain ?? null,
      format,
      media,
      mediaExpiresAt: mediaExpiry(media),
      collationId: pick(ad.collationId, e?.collationId),
      collationCount: pick(ad.collationCount, e?.collationCount),
      messageHash: hash,
      offers,
      niche,
      niches,
      nicheConfidence,
      nicheSource,
      nicheTerms,
      euTotalReach: pick(ad.euTotalReach, e?.euTotalReach),
      price: extractPrice(title, body, linkDescription) ?? e?.price ?? null,
      variants: pick(ad.variants, e?.variants),
      sources,
      queries: union(e?.queries ?? [], ctx.query?.trim() ? [ctx.query.trim().toLowerCase().slice(0, 80)] : []).slice(-20),
      ...bestRank(e, ctx, countries),
      isManual: e ? e.isManual && ctx.source === "manual" : ctx.source === "manual",
      partial,
      score: e?.score ?? 0,
      scoreBreakdown: e?.scoreBreakdown ?? [],
      firstSeenAt: e?.firstSeenAt ?? ctx.now,
      lastSeenAt: ctx.now,
      updatedAt: ctx.now
    };
    return { record, weak };
  }
  function bestRank(e, ctx, countries) {
    const prev = {
      impressionRank: e?.impressionRank ?? null,
      impressionQuery: e?.impressionQuery ?? null,
      impressionCountry: e?.impressionCountry ?? null,
      impressionAt: e?.impressionAt ?? null
    };
    const rank = ctx.rank && ctx.rank > 0 ? Math.round(ctx.rank) : null;
    if (!rank) return prev;
    const next = {
      impressionRank: rank,
      impressionQuery: ctx.query?.trim().toLowerCase().slice(0, 80) ?? null,
      impressionCountry: countries[0] ?? null,
      impressionAt: ctx.now
    };
    const stale = !prev.impressionAt || Date.parse(ctx.now) - Date.parse(prev.impressionAt) > 30 * 864e5;
    if (!prev.impressionRank || stale || prev.impressionQuery === next.impressionQuery || rank < prev.impressionRank) return next;
    return prev;
  }
  function mergeAdvertiser(existing, ad, record, weak, now) {
    const adv = ad.advertiser ?? {};
    return {
      pageId: ad.pageId,
      name: weak && existing ? existing.name : record.pageName,
      pageUrl: adv.pageUrl ?? existing?.pageUrl ?? null,
      avatarUrl: adv.avatarUrl ?? existing?.avatarUrl ?? null,
      likes: adv.likes ?? existing?.likes ?? null,
      categories: adv.categories?.length ? adv.categories : existing?.categories ?? [],
      mainNiche: existing?.mainNiche ?? null,
      totalAds: existing?.totalAds ?? 0,
      activeAds: existing?.activeAds ?? 0,
      landingCount: existing?.landingCount ?? 0,
      metaActiveCount: existing?.metaActiveCount ?? null,
      metaCountAt: existing?.metaCountAt ?? null,
      firstSeenAt: existing?.firstSeenAt ?? now,
      lastSeenAt: now
    };
  }

  // src/lib/sources/countries.ts
  var COUNTRY_NAMES = {
    AR: "Argentina",
    BO: "Bolivia",
    BR: "Brasil",
    CL: "Chile",
    CO: "Colombia",
    CR: "Costa Rica",
    CU: "Cuba",
    DO: "Rep. Dominicana",
    EC: "Ecuador",
    SV: "El Salvador",
    GT: "Guatemala",
    HN: "Honduras",
    MX: "México",
    NI: "Nicaragua",
    PA: "Panamá",
    PY: "Paraguay",
    PE: "Perú",
    PR: "Puerto Rico",
    UY: "Uruguay",
    VE: "Venezuela",
    US: "Estados Unidos",
    CA: "Canadá",
    ES: "España",
    PT: "Portugal",
    FR: "Francia",
    IT: "Italia",
    DE: "Alemania",
    GB: "Reino Unido",
    IE: "Irlanda",
    NL: "Países Bajos",
    BE: "Bélgica",
    AT: "Austria",
    PL: "Polonia",
    SE: "Suecia",
    DK: "Dinamarca",
    FI: "Finlandia",
    GR: "Grecia",
    CZ: "Chequia",
    RO: "Rumania",
    HU: "Hungría",
    BG: "Bulgaria",
    HR: "Croacia",
    SK: "Eslovaquia",
    SI: "Eslovenia",
    LT: "Lituania",
    LV: "Letonia",
    EE: "Estonia",
    LU: "Luxemburgo",
    MT: "Malta",
    CY: "Chipre",
    AU: "Australia",
    NZ: "Nueva Zelanda",
    IN: "India",
    ZA: "Sudáfrica",
    AE: "Emiratos Árabes",
    CH: "Suiza",
    NO: "Noruega",
    JP: "Japón"
  };
  function countryName(code) {
    return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
  }

  // src/lib/sources/meta-api.ts
  var PLATFORM_MAP = {
    FACEBOOK: "facebook",
    INSTAGRAM: "instagram",
    MESSENGER: "messenger",
    AUDIENCE_NETWORK: "audience_network",
    WHATSAPP: "whatsapp",
    THREADS: "threads"
  };
  function mapPlatforms(list) {
    if (!Array.isArray(list)) return [];
    const out = /* @__PURE__ */ new Set();
    for (const p of list) {
      const m = PLATFORM_MAP[String(p).toUpperCase()];
      if (m) out.add(m);
    }
    return Array.from(out);
  }
  var first = (list) => Array.isArray(list) ? list.find((x) => typeof x === "string" && x.trim()) ?? null : null;
  function mapArchivedAd(ad, ctx) {
    if (!ad || !ad.id || !ad.page_id) return null;
    const today = toIsoDate(ctx.now ?? /* @__PURE__ */ new Date());
    const start = parseDateValue(ad.ad_delivery_start_time) ?? parseDateValue(ad.ad_creation_time);
    const stop = parseDateValue(ad.ad_delivery_stop_time);
    const isActive = ctx.activeStatus === "ACTIVE" ? true : !stop || stop >= today;
    const bodies = (ad.ad_creative_bodies ?? []).filter(Boolean);
    const titles = (ad.ad_creative_link_titles ?? []).filter(Boolean);
    const format = bodies.length > 1 || titles.length > 1 ? "dco" : "unknown";
    const reach = ad.eu_total_reach === void 0 ? null : Number(ad.eu_total_reach);
    return {
      id: String(ad.id),
      pageId: String(ad.page_id),
      pageName: ad.page_name?.trim() || "Anunciante sin nombre",
      isActive,
      startDate: start,
      stopDate: isActive ? null : stop,
      platforms: mapPlatforms(ad.publisher_platforms),
      languages: (ad.languages ?? []).map((l) => String(l).toLowerCase()),
      countries: ctx.countries.map((c) => c.toUpperCase()),
      body: first(bodies),
      title: first(titles),
      linkDescription: first(ad.ad_creative_link_descriptions),
      caption: first(ad.ad_creative_link_captions),
      ctaText: null,
      linkUrl: null,
      // la API no expone la URL de destino, solo el dominio visible (caption)
      format,
      media: [],
      collationId: null,
      collationCount: null,
      euTotalReach: reach !== null && Number.isFinite(reach) ? reach : null
    };
  }

  // src/lib/sources/library-page.ts
  var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
  var str = (v) => typeof v === "string" && v.trim() ? v.trim() : null;
  var num = (v) => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  };
  function stripHtml(html) {
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
  }
  function textOf(v) {
    if (typeof v === "string") return str(v);
    if (isObj(v)) {
      if (typeof v.text === "string") return str(v.text);
      const markup = v.markup;
      if (isObj(markup) && typeof markup.__html === "string") return str(stripHtml(markup.__html));
    }
    return null;
  }
  function cleanTemplate(s) {
    if (!s) return s;
    const out = s.replace(/\{\{[^{}]{1,80}\}\}/g, "").replace(/[ \t]{2,}/g, " ").replace(/^\s+|\s+$/g, "");
    return out ? out : null;
  }
  function collectMedia(snapshot) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const push = (m) => {
      if (!m || !/^https:\/\//.test(m.url) || seen.has(m.url)) return;
      seen.add(m.url);
      out.push(m);
    };
    const fromVideo = (v) => {
      const url = str(v.video_hd_url) ?? str(v.video_sd_url) ?? str(v.watermarked_video_hd_url) ?? str(v.watermarked_video_sd_url);
      return url ? { type: "video", url, preview: str(v.video_preview_image_url) } : null;
    };
    const fromImage = (v) => {
      const url = str(v.original_image_url) ?? str(v.resized_image_url) ?? str(v.watermarked_resized_image_url);
      return url ? { type: "image", url, preview: str(v.resized_image_url) } : null;
    };
    for (const key of ["videos", "extra_videos"]) {
      const list = snapshot[key];
      if (Array.isArray(list)) list.filter(isObj).forEach((v) => push(fromVideo(v)));
    }
    for (const key of ["images", "extra_images"]) {
      const list = snapshot[key];
      if (Array.isArray(list)) list.filter(isObj).forEach((v) => push(fromImage(v)));
    }
    const cards = snapshot.cards;
    if (Array.isArray(cards)) {
      for (const c of cards.filter(isObj)) push(fromVideo(c) ?? fromImage(c));
    }
    return out.slice(0, 12);
  }
  var FORMAT_MAP = {
    IMAGE: "image",
    VIDEO: "video",
    CAROUSEL: "carousel",
    MULTI_IMAGES: "carousel",
    MULTI_VIDEOS: "carousel",
    MULTI_MEDIUM: "carousel",
    DPA: "carousel",
    DCO: "dco",
    TEXT: "text"
  };
  function mapLibraryNode(node, ctx) {
    if (!isObj(node)) return null;
    const id = str(node.ad_archive_id) ?? (num(node.ad_archive_id) !== null ? String(node.ad_archive_id) : null);
    if (!id) return null;
    const snapshot = isObj(node.snapshot) ? node.snapshot : {};
    const pageId = str(node.page_id) ?? (num(node.page_id) !== null ? String(node.page_id) : null) ?? str(snapshot.page_id) ?? ctx.pageId ?? null;
    const pageName = str(node.page_name) ?? str(snapshot.page_name);
    if (!pageId || !pageName) return null;
    const cards = Array.isArray(snapshot.cards) ? snapshot.cards.filter(isObj) : [];
    const firstCard = cards[0] ?? {};
    const body = cleanTemplate(textOf(snapshot.body)) ?? cleanTemplate(textOf(firstCard.body));
    const title = cleanTemplate(str(snapshot.title)) ?? cleanTemplate(str(firstCard.title));
    const linkUrlRaw = str(snapshot.link_url) ?? str(firstCard.link_url);
    const media = collectMedia(snapshot);
    const displayFormat = str(snapshot.display_format)?.toUpperCase() ?? "";
    let format = FORMAT_MAP[displayFormat] ?? "unknown";
    if (format === "unknown") format = media.length > 1 ? "carousel" : media[0]?.type ?? (body ? "text" : "unknown");
    const isActive = typeof node.is_active === "boolean" ? node.is_active : null;
    const categories = Array.isArray(snapshot.page_categories) ? snapshot.page_categories.map((c) => isObj(c) ? str(c.name) : str(c)).filter((c) => Boolean(c)) : [];
    const reached = Array.isArray(node.reached_countries) ? node.reached_countries.map(String) : [];
    return {
      id,
      pageId,
      pageName,
      isActive,
      startDate: parseDateValue(node.start_date),
      stopDate: isActive ? null : parseDateValue(node.end_date),
      platforms: mapPlatforms(node.publisher_platform ?? node.publisher_platforms),
      languages: [],
      countries: reached.length ? reached : ctx.countries,
      body,
      title,
      linkDescription: cleanTemplate(str(snapshot.link_description)) ?? cleanTemplate(str(firstCard.link_description)),
      caption: str(snapshot.caption) ?? str(firstCard.caption),
      ctaText: str(snapshot.cta_text) ?? str(firstCard.cta_text),
      linkUrl: linkUrlRaw ? unwrapRedirect(linkUrlRaw) : null,
      format,
      media,
      collationId: str(node.collation_id) ?? (num(node.collation_id) !== null ? String(node.collation_id) : null),
      collationCount: num(node.collation_count),
      euTotalReach: null,
      // Anuncios dinámicos: cada tarjeta es una versión distinta del mismo anuncio.
      variants: displayFormat === "DCO" && cards.length > 1 ? cards.length : null,
      advertiser: {
        pageUrl: str(snapshot.page_profile_uri),
        avatarUrl: str(snapshot.page_profile_picture_url),
        likes: num(snapshot.page_like_count),
        categories
      }
    };
  }
  var STATUS_ACTIVE = /^(activo|active|ativo|attivo|actif)$/i;
  var STATUS_INACTIVE = /^(inactivo|inactive|inativo|non attivo|inactif)$/i;
  var SPONSORED = /^(patrocinado|sponsored|sponsorisé|sponsorizzato|gesponsert)$/i;
  var NOISE = /^(identificador de la biblioteca|library id|id da biblioteca|plataformas|platforms|ver detalles del anuncio|see ad details|ver detalhes do anúncio|ver resumen|see summary details|abrir menú desplegable|open drop-down menu|este anuncio tiene varias versiones|this ad has multiple versions)/i;
  function mapDomCard(card, ctx) {
    if (!card || !/^\d{6,25}$/.test(card.libraryId ?? "")) return null;
    const lines = (card.text ?? "").split(/\n+/).map((l) => l.trim()).filter(Boolean).slice(0, 80);
    let isActive = null;
    let startDate = null;
    let stopDate = null;
    let collationCount = null;
    let sponsoredIdx = -1;
    lines.forEach((line, i) => {
      if (STATUS_ACTIVE.test(line)) isActive = true;
      else if (STATUS_INACTIVE.test(line)) isActive = false;
      if (SPONSORED.test(line) && sponsoredIdx < 0) sponsoredIdx = i;
      const coll = line.match(/^(\d+)\s+(anuncios|ads|anúncios)\b/i);
      if (coll) collationCount = Number(coll[1]);
      if (!startDate && /\d{4}/.test(line) && !/^\d+$/.test(line)) {
        const parts = line.split(/\s[-–]\s/);
        const s = parseLibraryDateText(parts[0] ?? line);
        if (s) {
          startDate = s;
          if (parts[1]) stopDate = parseLibraryDateText(parts[1]);
        }
      }
    });
    const pageName = card.pageName?.trim() || (sponsoredIdx > 0 ? lines[sponsoredIdx - 1] : null) || null;
    const bodyLines = sponsoredIdx >= 0 ? lines.slice(sponsoredIdx + 1).filter((l) => !NOISE.test(l) && !STATUS_ACTIVE.test(l) && !STATUS_INACTIVE.test(l)) : [];
    const captionIdx = bodyLines.findIndex((l) => /^[A-Z0-9-]+(\.[A-Z0-9-]+)+$/.test(l));
    const body = (captionIdx >= 0 ? bodyLines.slice(0, captionIdx) : bodyLines.slice(0, 6)).join("\n").slice(0, 3e3) || null;
    const caption = captionIdx >= 0 ? bodyLines[captionIdx] ?? null : null;
    const title = captionIdx >= 0 ? bodyLines[captionIdx + 1] ?? null : null;
    const ctaText = captionIdx >= 0 ? bodyLines[captionIdx + 3] ?? bodyLines[captionIdx + 2] ?? null : null;
    const outbound = (card.links ?? []).map((l) => unwrapRedirect(l)).find((l) => /^https?:\/\//.test(l) && !/facebook\.com|instagram\.com|fbcdn\.net/.test(l)) ?? null;
    const media = [
      ...(card.videos ?? []).filter((v) => /^https:\/\//.test(v.src)).map((v) => ({ type: "video", url: v.src, preview: v.poster ?? null })),
      ...(card.images ?? []).filter((src) => /^https:\/\//.test(src)).map((src) => ({ type: "image", url: src }))
    ].slice(0, 8);
    const pageId = ctx.pageId ?? (pageName ? `nombre:${pageName.toLowerCase().replace(/\s+/g, "-").slice(0, 50)}` : null);
    if (!pageId || !pageName) return null;
    const active = isActive;
    return {
      id: card.libraryId,
      pageId,
      pageName,
      isActive: active,
      startDate,
      stopDate: active ? null : stopDate,
      platforms: [],
      languages: [],
      countries: ctx.countries,
      body,
      title,
      linkDescription: null,
      caption,
      ctaText,
      linkUrl: outbound,
      format: media.length > 1 ? "carousel" : media[0]?.type ?? "unknown",
      media,
      collationId: null,
      collationCount,
      euTotalReach: null,
      advertiser: { pageUrl: card.pageUrl ?? null },
      partial: true
    };
  }

  // src/ext/store.ts
  var DB_NAME = "cifra-radar";
  var DB_VERSION = 2;
  var RETENTION_DAYS = 180;
  function req(r) {
    return new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  function done(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  function isAdLibraryUrl(raw) {
    try {
      const u = new URL(raw);
      return u.protocol === "https:" && /(^|\.)facebook\.com$/.test(u.hostname) && u.pathname.startsWith("/ads/library");
    } catch {
      return false;
    }
  }
  function mapExtensionPayload(p) {
    const country = p.query?.country?.toUpperCase();
    const countries = country && country !== "ALL" && /^[A-Z]{2}$/.test(country) ? [country] : [];
    const pageId = p.query?.pageId && /^\d{3,25}$/.test(p.query.pageId) ? p.query.pageId : null;
    const ctx = { countries, pageId };
    const ads = [];
    for (const n of (p.nodes ?? []).slice(0, 1500)) {
      const m = mapLibraryNode(n, ctx);
      if (m) ads.push(m);
    }
    const seen = new Set(ads.map((a) => a.id));
    for (const c of (p.domCards ?? []).slice(0, 500)) {
      if (!c || seen.has(c.libraryId)) continue;
      const m = mapDomCard(c, ctx);
      if (m) ads.push(m);
    }
    return { ads, countries };
  }
  function sanitizeRanks(r) {
    const out = {};
    for (const [id, n] of Object.entries(r).slice(0, 3e3)) if (/^\d{5,25}$/.test(id) && Number.isFinite(n) && n > 0) out[id] = Math.round(n);
    return out;
  }
  var LocalStore = class _LocalStore {
    constructor(idb) {
      this.idb = idb;
    }
    static async open(factory = indexedDB) {
      const r = factory.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains("ads")) d.createObjectStore("ads", { keyPath: "id" }).createIndex("pageId", "pageId");
        if (!d.objectStoreNames.contains("advertisers")) d.createObjectStore("advertisers", { keyPath: "pageId" });
        if (!d.objectStoreNames.contains("favorites")) d.createObjectStore("favorites", { keyPath: "adId" });
        if (!d.objectStoreNames.contains("log")) d.createObjectStore("log", { keyPath: "id", autoIncrement: true });
        if (!d.objectStoreNames.contains("follows")) d.createObjectStore("follows", { keyPath: "pageId" });
        if (!d.objectStoreNames.contains("products")) d.createObjectStore("products", { keyPath: "id" });
      };
      return new _LocalStore(await req(r));
    }
    close() {
      this.idb.close();
    }
    async get(store, key) {
      const tx = this.idb.transaction(store, "readonly");
      return await req(tx.objectStore(store).get(key)) ?? null;
    }
    async getAll(store) {
      const tx = this.idb.transaction(store, "readonly");
      return await req(tx.objectStore(store).getAll());
    }
    async allAds() {
      return this.getAll("ads");
    }
    async allAdvertisers() {
      return this.getAll("advertisers");
    }
    async favorites() {
      return new Map((await this.getAll("favorites")).map((f) => [f.adId, f]));
    }
    async log(limit = 20) {
      return (await this.getAll("log")).slice(-limit).reverse();
    }
    async setFavorite(adId, on, note = null) {
      const tx = this.idb.transaction("favorites", "readwrite");
      if (on) tx.objectStore("favorites").put({ adId, note, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
      else tx.objectStore("favorites").delete(adId);
      await done(tx);
    }
    async ingest(input, opts) {
      const now = (opts.now ?? /* @__PURE__ */ new Date()).toISOString();
      const batch = prepareBatch(input);
      const result = { received: input.length, created: 0, updated: 0, skipped: batch.skipped, errors: batch.errors, ids: [] };
      const touched = /* @__PURE__ */ new Set();
      for (const ad of batch.ads) {
        const existing = await this.get("ads", ad.id);
        const { record, weak } = mergeAd(existing, ad, {
          source: opts.source,
          queryCountries: opts.queryCountries,
          query: opts.query,
          rank: opts.ranks?.[ad.id] ?? null,
          now
        });
        const advExisting = await this.get("advertisers", ad.pageId);
        const adv = mergeAdvertiser(advExisting, ad, record, weak, now);
        const tx2 = this.idb.transaction(["ads", "advertisers"], "readwrite");
        tx2.objectStore("ads").put(record);
        tx2.objectStore("advertisers").put(adv);
        await done(tx2);
        if (existing) result.updated++;
        else result.created++;
        result.ids.push(ad.id);
        touched.add(ad.pageId);
        if (existing && existing.pageId !== ad.pageId) touched.add(existing.pageId);
      }
      await this.recompute(Array.from(touched), opts.now);
      const tx = this.idb.transaction("log", "readwrite");
      tx.objectStore("log").add({
        source: opts.source,
        createdAt: now,
        received: result.received,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        context: opts.context ?? {}
      });
      await done(tx);
      return result;
    }
    async ingestExtensionPayload(p) {
      if (!isAdLibraryUrl(p.pageUrl)) throw new Error("Solo se aceptan capturas hechas en facebook.com/ads/library.");
      const { ads, countries } = mapExtensionPayload(p);
      const pageId = p.query?.pageId && /^\d{3,25}$/.test(p.query.pageId) ? p.query.pageId : null;
      const count = Number(p.resultCount);
      const result = await this.ingest(ads, {
        source: "extension",
        queryCountries: countries,
        query: p.query?.q ?? null,
        ranks: p.query?.sort === "total_impressions" && p.ranks ? sanitizeRanks(p.ranks) : void 0,
        context: { q: p.query?.q ?? null, country: countries[0] ?? null }
      });
      if (pageId && Number.isFinite(count) && count > 0) await this.setMetaCount(pageId, count);
      return result;
    }
    async setMetaCount(pageId, count) {
      const adv = await this.get("advertisers", pageId);
      if (!adv) return;
      const tx = this.idb.transaction("advertisers", "readwrite");
      tx.objectStore("advertisers").put({ ...adv, metaActiveCount: Math.round(count), metaCountAt: (/* @__PURE__ */ new Date()).toISOString() });
      await done(tx);
    }
    async follows() {
      return new Map((await this.getAll("follows")).map((f) => [f.pageId, f]));
    }
    async follow(pageId, name) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const tx = this.idb.transaction("follows", "readwrite");
      tx.objectStore("follows").put({ pageId, name, followedAt: now, seenAt: now, refreshedAt: null });
      await done(tx);
    }
    async unfollow(pageId) {
      const tx = this.idb.transaction("follows", "readwrite");
      tx.objectStore("follows").delete(pageId);
      await done(tx);
    }
    async touchFollow(pageId, patch) {
      const f = await this.get("follows", pageId);
      if (!f) return;
      const tx = this.idb.transaction("follows", "readwrite");
      tx.objectStore("follows").put({ ...f, ...patch });
      await done(tx);
    }
    async products() {
      return this.getAll("products");
    }
    async saveProduct(product) {
      const tx = this.idb.transaction("products", "readwrite");
      tx.objectStore("products").put(product);
      await done(tx);
    }
    async deleteProduct(id) {
      const tx = this.idb.transaction("products", "readwrite");
      tx.objectStore("products").delete(id);
      await done(tx);
    }
    /** Recalcula puntuación y agregados de los anunciantes indicados (o de todos). */
    async recompute(pageIds, now = /* @__PURE__ */ new Date()) {
      const ads = await this.allAds();
      const byPage = /* @__PURE__ */ new Map();
      for (const a of ads) byPage.set(a.pageId, [...byPage.get(a.pageId) ?? [], a]);
      const targets = pageIds ?? Array.from(byPage.keys());
      for (const pageId of targets) {
        const list = byPage.get(pageId) ?? [];
        const tx = this.idb.transaction(["ads", "advertisers"], "readwrite");
        const advStore = tx.objectStore("advertisers");
        if (!list.length) {
          advStore.delete(pageId);
          await done(tx);
          continue;
        }
        const stats = computeAdvertiserStats(list, now);
        for (const a of list) {
          const s = stats.perAd.get(a.id);
          if (s) tx.objectStore("ads").put({ ...a, score: s.score, scoreBreakdown: s.signals });
        }
        const adv = await req(advStore.get(pageId));
        if (adv) {
          advStore.put({ ...adv, totalAds: stats.totalAds, activeAds: stats.activeAds, landingCount: stats.landingCount, mainNiche: stats.mainNiche });
        }
        await done(tx);
      }
      return targets.length;
    }
    /**
     * Vuelve a calcular landing page y nicho (por reglas) de los anuncios ya
     * guardados, para aplicar mejoras de versiones nuevas sin recapturar.
     */
    async reindex() {
      const ads = await this.allAds();
      const advs = new Map((await this.allAdvertisers()).map((a) => [a.pageId, a]));
      const tx = this.idb.transaction("ads", "readwrite");
      for (const a of ads) {
        const landing = normalizeLanding(a.linkUrl, a.caption);
        const next = {
          ...a,
          body: cleanTemplate(a.body),
          title: cleanTemplate(a.title),
          linkDescription: cleanTemplate(a.linkDescription),
          landingKey: landing?.key ?? null,
          landingDomain: landing?.domain ?? null,
          linkUrl: landing?.url ?? null
        };
        next.price = extractPrice(next.title, next.body, next.linkDescription);
        if (a.nicheSource !== "ai" && a.nicheSource !== "manual") {
          const r = classifyByRules({
            body: next.body,
            title: next.title,
            linkDescription: next.linkDescription,
            caption: landing?.domain ?? a.caption,
            pageName: a.pageName,
            categories: advs.get(a.pageId)?.categories
          });
          next.niche = r.niche;
          next.niches = r.niches;
          next.nicheConfidence = r.confidence;
          next.nicheSource = r.niche ? "rules" : null;
          next.nicheTerms = r.terms;
        }
        tx.objectStore("ads").put(next);
      }
      await done(tx);
      await this.recompute();
      return ads.length;
    }
    /** Retención: borra anuncios no favoritos que no se ven hace más de `days` días. */
    async purge(days = RETENTION_DAYS, now = /* @__PURE__ */ new Date()) {
      const cutoff = new Date(now.getTime() - days * 864e5).toISOString();
      const favs = await this.favorites();
      const stale = (await this.allAds()).filter((a) => a.lastSeenAt < cutoff && !favs.has(a.id));
      if (!stale.length) return 0;
      const tx = this.idb.transaction("ads", "readwrite");
      for (const a of stale) tx.objectStore("ads").delete(a.id);
      await done(tx);
      await this.recompute(Array.from(new Set(stale.map((a) => a.pageId))), now);
      return stale.length;
    }
    async clear() {
      const tx = this.idb.transaction(["ads", "advertisers", "favorites", "log", "follows"], "readwrite");
      for (const s of ["ads", "advertisers", "favorites", "log", "follows"]) tx.objectStore(s).clear();
      await done(tx);
    }
    async exportAll() {
      return {
        format: "cifra-radar",
        version: 1,
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        ads: await this.allAds(),
        advertisers: await this.allAdvertisers(),
        favorites: Array.from((await this.favorites()).values())
      };
    }
    /**
     * Importa un respaldo de Cifra Radar o una respuesta de la Ad Library API
     * ({ data: [...] }). Devuelve cuántos anuncios se cargaron.
     */
    async importFile(json, countries = []) {
      const obj = json;
      if (obj && obj.format === "cifra-radar" && Array.isArray(obj.ads)) {
        const tx = this.idb.transaction(["ads", "advertisers", "favorites"], "readwrite");
        for (const a of obj.ads) if (a && typeof a.id === "string" && typeof a.pageId === "string") tx.objectStore("ads").put(a);
        for (const a of obj.advertisers ?? []) if (a && typeof a.pageId === "string") tx.objectStore("advertisers").put(a);
        for (const f of obj.favorites ?? []) if (f && typeof f.adId === "string") tx.objectStore("favorites").put(f);
        await done(tx);
        await this.recompute();
        return { kind: "Respaldo de Cifra Radar", count: obj.ads.length };
      }
      const items = Array.isArray(json) ? json : Array.isArray(obj?.data) ? obj.data : Array.isArray(obj?.nodes) ? obj.nodes : [];
      const ads = [];
      for (const it of items.slice(0, 5e3)) {
        if (!it || typeof it !== "object") continue;
        const m = "ad_archive_id" in it ? mapLibraryNode(it, { countries }) : mapArchivedAd(it, { countries });
        if (m) ads.push(m);
      }
      const r = await this.ingest(ads, { source: "import", queryCountries: countries, context: { kind: "archivo" } });
      return { kind: "Resultados de la Biblioteca / API", count: r.created + r.updated };
    }
  };

  // src/lib/format.ts
  var dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  var numFmt = new Intl.NumberFormat("es");
  function fmtDate(iso2) {
    if (!iso2) return "—";
    const d = new Date(iso2.length === 10 ? `${iso2}T00:00:00Z` : iso2);
    return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
  }
  function fmtNum(n) {
    return n === null || n === void 0 ? "—" : numFmt.format(n);
  }
  function fmtDays(n) {
    if (n === null || n === void 0) return "—";
    if (n === 0) return "Hoy";
    return `${numFmt.format(n)} ${n === 1 ? "día" : "días"}`;
  }
  function timeAgo(iso2, now = /* @__PURE__ */ new Date()) {
    if (!iso2) return "nunca";
    const diff = now.getTime() - new Date(iso2).getTime();
    const m = Math.round(diff / 6e4);
    if (m < 1) return "hace instantes";
    if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return `hace ${d} ${d === 1 ? "día" : "días"}`;
  }
  var PLATFORM_LABELS = {
    facebook: { short: "FB", label: "Facebook" },
    instagram: { short: "IG", label: "Instagram" },
    messenger: { short: "MSG", label: "Messenger" },
    audience_network: { short: "AN", label: "Audience Network" },
    whatsapp: { short: "WA", label: "WhatsApp" },
    threads: { short: "TH", label: "Threads" }
  };
  var FORMAT_LABELS = {
    image: "Imagen",
    video: "Video",
    carousel: "Carrusel",
    dco: "Dinámico",
    text: "Solo texto",
    unknown: "Sin creatividad"
  };
  var SOURCE_LABELS = {
    meta_api: "API oficial",
    extension: "Extensión",
    import: "Importación",
    manual: "Carga manual"
  };
  function libraryPageUrl(pageId) {
    return /^\d+$/.test(pageId) ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=${pageId}` : null;
  }
  return __toCommonJS(index_exports);
})();
