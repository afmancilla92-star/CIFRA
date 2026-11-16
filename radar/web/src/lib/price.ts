/**
 * Precio mencionado en el texto del anuncio (p. ej. «AR$ 19.999», «$19.99»,
 * «COP 59.900»). Es lo que el anunciante escribe, no un dato verificado.
 */
export interface Price {
  text: string;
  amount: number | null;
  currency: string | null;
}

const CURRENCY: Array<[RegExp, string]> = [
  [/^AR\$$/i, "ARS"],
  [/^US\$$/i, "USD"],
  [/^USD$/i, "USD"],
  [/^R\$$/i, "BRL"],
  [/^S\/\.?$/i, "PEN"],
  [/^COP$/i, "COP"],
  [/^MXN$/i, "MXN"],
  [/^CLP$/i, "CLP"],
  [/^€|EUR$/i, "EUR"],
  [/^\$$/, "$"],
];

const PREFIX = String.raw`(AR\$|US\$|R\$|S\/\.?|COP|MXN|CLP|USD|EUR|€|\$)\s?`;
const NUMBER = String.raw`(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d{1,6}(?:[.,]\d{1,2})?)`;
const SUFFIX = String.raw`\s?(USD|COP|MXN|CLP|EUR|€|pesos|d[oó]lares|reales|soles)`;

function parseAmount(raw: string): number | null {
  let s = raw.replace(/\s/g, "");
  const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  if (lastSep >= 0 && s.length - lastSep - 1 <= 2 && s.length - lastSep - 1 > 0) {
    // Decimales al final: 19.99 / 19,99
    s = s.slice(0, lastSep).replace(/[.,]/g, "") + "." + s.slice(lastSep + 1);
  } else {
    s = s.replace(/[.,]/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function currencyOf(sym: string): string | null {
  for (const [re, code] of CURRENCY) if (re.test(sym.trim())) return code;
  const s = sym.toLowerCase();
  if (s.startsWith("peso")) return "$";
  if (s.startsWith("d")) return "USD";
  if (s.startsWith("real")) return "BRL";
  if (s.startsWith("sol")) return "PEN";
  return null;
}

export function extractPrice(...parts: Array<string | null | undefined>): Price | null {
  const text = parts.filter(Boolean).join(" \n ");
  if (!text) return null;
  const pre = new RegExp(`${PREFIX}${NUMBER}(?!\\s?%)`, "i").exec(text);
  if (pre) {
    const amount = parseAmount(pre[2]!);
    if (amount && amount >= 1) return { text: `${pre[1]!.replace(/\s+/g, "")} ${pre[2]!.trim()}`, amount, currency: currencyOf(pre[1]!) };
  }
  const post = new RegExp(`${NUMBER}${SUFFIX}\\b`, "i").exec(text);
  if (post) {
    const amount = parseAmount(post[1]!);
    if (amount && amount >= 1) return { text: `${post[1]!.trim()} ${post[2]!}`, amount, currency: currencyOf(post[2]!) };
  }
  return null;
}
