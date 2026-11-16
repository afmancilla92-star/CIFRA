/** Utilidades de interfaz del radar: creación segura de elementos e íconos. */

export type Child = Node | string | number | null | undefined | false | Child[];
export type Attrs = Record<string, string | number | boolean | null | undefined | ((e: Event) => void)>;

// Solo http(s), páginas de la propia extensión o rutas relativas (nunca javascript:, data:, etc.).
const SAFE_URL = /^(https?:|chrome-extension:|(?![a-z][a-z0-9+.-]*:))/i;

/** Crea un elemento; el texto siempre se inserta como texto (nunca como HTML). */
export function h(tag: string, attrs: Attrs | null, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === "function") el.addEventListener(k.replace(/^on/, ""), v as EventListener);
    // Los navegadores ignoran espacios y caracteres de control en las URLs: se quitan antes de validar.
    else if ((k === "href" || k === "src" || k === "poster") && !SAFE_URL.test(String(v).replace(/[\u0000- \u007f]/g, ""))) continue;
    else if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  const add = (c: Child) => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  children.forEach(add);
  return el;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** Ícono SVG a partir de trazos fijos (no se usa texto externo). */
export function icon(name: keyof typeof ICONS, size = 16) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "ico");
  for (const d of ICONS[name]) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg as unknown as HTMLElement;
}

export const ICONS = {
  compass: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M15.5 8.5l-2 5-5 2 2-5z"],
  store: ["M3 9l1.5-5h15L21 9", "M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z", "M5 13v7h14v-7"],
  radar: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0", "M12 12l6-6"],
  cube: ["M12 2l9 5v10l-9 5-9-5V7z", "M3 7l9 5 9-5", "M12 12v10"],
  heart: ["M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3 3.3 0 5.5 3.3 4 6.8C19.5 16.4 12 21 12 21z"],
  search: ["M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0", "M21 21l-5-5"],
  copy: ["M9 9h11v11H9z", "M5 15H4V4h11v1"],
  branch: ["M6 3v12", "M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M18 9a9 9 0 0 1-9 9"],
  ext: ["M14 4h6v6", "M20 4L10 14", "M18 14v6H4V6h6"],
  refresh: ["M20 11a8 8 0 0 0-14.9-4", "M4 4v4h4", "M4 13a8 8 0 0 0 14.9 4", "M20 20v-4h-4"],
  sort: ["M7 4v16", "M3 8l4-4 4 4", "M17 20V4", "M13 16l4 4 4-4"],
  gear: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"],
  chevron: ["M9 6l6 6-6 6"],
  plus: ["M12 5v14", "M5 12h14"],
  trend: ["M3 17l6-6 4 4 8-8", "M14 7h7v7"],
  play: ["M7 4l13 8-13 8z"],
  sparkle: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"],
} as const;

/** Insignia de plataforma (texto corto, sin logotipos de marcas). */
export function platformBadge(p: string, label: string) {
  const short: Record<string, string> = { facebook: "f", instagram: "IG", messenger: "M", audience_network: "AN", whatsapp: "WA", threads: "@" };
  return h("span", { class: `pf pf-${p}`, title: label }, short[p] ?? p.slice(0, 2).toUpperCase());
}

export function chip(text: string, cls = "") {
  return h("span", { class: `chip ${cls}` }, text);
}
