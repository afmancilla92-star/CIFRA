import { createHash } from "node:crypto";

/** Minúsculas, sin tildes, sin emojis ni signos; espacios colapsados. */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}%$€£]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Huella del mensaje: mismo texto con distinta puntuación, emojis o
 * mayúsculas produce la misma huella. Sirve para detectar repetición.
 */
export function messageHash(body: string | null, title: string | null): string | null {
  const text = normalizeText(`${body ?? ""} ${title ?? ""}`);
  if (text.length < 12) return null;
  return createHash("sha1").update(text).digest("hex").slice(0, 16);
}

const OFFER_PATTERNS: Array<[string, RegExp]> = [
  ["Descuento", /\b\d{1,2}\s?%\s?(off|de descuento|dto|desconto|descuento)?|\bdescuento|\bdesconto|\bsale\b|\brebaja|\boferta|\bpromo(cion|cao)?\b/],
  ["Envío gratis", /\benvio(s)? gratis|\bfrete gratis|\bfree shipping|\benvio sin costo/],
  ["2x1 / combo", /\b2\s?x\s?1\b|\b3\s?x\s?2\b|\bcombo|\bkit\b|\bpack\b|\blleva \d|\bcompra \d/],
  ["Gratis / regalo", /\bgratis\b|\bfree\b|\bregalo|\bbrinde|\bobsequio|\bde regalo/],
  ["Cuotas / pago", /\bcuotas|\bsin interes|\bparcelas|\bsem juros|\bmeses sin intereses|\bcontra ?entrega|\bpago contra/],
  ["Tiempo limitado", /\bsolo hoy|\bultimas? (unidades|horas)|\btiempo limitado|\bpor tiempo|\blimited time|\bhoy\b.*\bultimo|\bblack friday|\bcyber|\bhot sale|\bultimos dias/],
  ["Garantía", /\bgarantia|\bguarantee|\bdevolucion|\breembolso|\bmoney back/],
  ["Cupón", /\bcupon|\bcupom|\bcoupon|\bcodigo\b|\bcode\b/],
  ["Prueba gratis", /\bprueba gratis|\bfree trial|\bteste gratis|\bclase gratis|\bmuestra gratis/],
];

/** Ofertas o ganchos comerciales presentes en el texto del anuncio. */
export function detectOffers(...parts: Array<string | null | undefined>): string[] {
  const text = normalizeText(parts.filter(Boolean).join(" "));
  if (!text) return [];
  return OFFER_PATTERNS.filter(([, re]) => re.test(text)).map(([label]) => label);
}

export function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
