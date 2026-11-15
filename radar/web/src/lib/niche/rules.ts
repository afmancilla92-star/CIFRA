import { normalizeText } from "../text";
import { NICHES } from "./catalog";

export interface NicheResult {
  /** Nicho principal (el de más evidencia). */
  niche: string | null;
  /** Todos los nichos con evidencia suficiente, el principal primero (máx. 3). */
  niches: string[];
  /** 0..1, orientativa. */
  confidence: number;
  terms: string[];
}

export interface NicheInput {
  body?: string | null;
  title?: string | null;
  linkDescription?: string | null;
  caption?: string | null;
  pageName?: string | null;
  categories?: string[];
}

const CHANNEL_NICHES = new Set(["ecommerce", "leads"]);

const termCache = new Map<string, RegExp | null>();
function termRegex(term: string) {
  if (!termCache.has(term)) {
    const t = normalizeText(term);
    termCache.set(term, t ? new RegExp(`(?:^| )${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?= |$)`, "g") : null);
  }
  return termCache.get(term)!;
}

/** Palabras débiles de un nicho, las frases más largas primero. */
const weakCache = new Map<string, string[]>();
function weakTerms(n: { id: string; weak: string[] }) {
  let list = weakCache.get(n.id);
  if (!list) {
    list = [...n.weak].sort((a, b) => b.length - a.length);
    weakCache.set(n.id, list);
  }
  return list;
}

function countTerm(haystack: string, term: string): number {
  const re = termRegex(term);
  if (!re) return 0;
  re.lastIndex = 0;
  return (haystack.match(re) ?? []).length;
}

/**
 * Clasificación por reglas: suma de pesos de palabras clave por nicho.
 * Un anuncio puede quedar en varios nichos (p. ej. «Nutrición» y «Fitness»).
 */
export function classifyByRules(input: NicheInput): NicheResult {
  const text = ` ${normalizeText(
    [input.title, input.body, input.linkDescription, input.pageName, (input.caption ?? "").replace(/\./g, " ")]
      .filter(Boolean)
      .join(" "),
  )} `;
  const cats = normalizeText((input.categories ?? []).join(" | "));

  // El título suele ser el producto u oferta (en catálogos de tiendas, el texto es genérico): pesa más.
  const title = ` ${normalizeText(input.title)} `;

  const scored: Array<{ id: string; score: number; terms: string[] }> = [];
  let total = 0;
  for (const n of NICHES) {
    let score = 0;
    const terms: string[] = [];
    let rest = text;
    let strongHits = 0;
    let weakHits = 0;
    let categoryHit = false;
    for (const term of n.strong) {
      const c = countTerm(text, term);
      if (c) {
        score += 2 * Math.min(c, 3) + (countTerm(title, term) ? 2 : 0);
        strongHits++;
        terms.push(term);
        // Una palabra débil contenida en una frase fuerte no se cuenta dos veces.
        const re = termRegex(term)!;
        re.lastIndex = 0;
        rest = rest.replace(re, " ");
      }
    }
    for (const term of weakTerms(n)) {
      const c = countTerm(rest, term);
      if (c) {
        score += Math.min(c, 3) + (countTerm(title, term) ? 1 : 0);
        weakHits++;
        terms.push(term);
        // Igual entre débiles: «crédito» dentro de «crédito hipotecario» cuenta una vez.
        const re = termRegex(term)!;
        re.lastIndex = 0;
        rest = rest.replace(re, " ");
      }
    }
    for (const cat of n.categories ?? []) {
      if (cats && cats.includes(normalizeText(cat))) {
        score += 4;
        categoryHit = true;
        terms.push(`categoría: ${cat}`);
      }
    }
    // Una sola palabra genérica repetida («app», «juego») no alcanza: hace falta un término
    // fuerte, la categoría de la página o dos palabras distintas del nicho.
    if (!strongHits && !categoryHit && weakHits < 2) continue;
    total += score;
    // «E-commerce» y «Generación de leads» describen cómo vende, no qué vende:
    // cuentan como nicho secundario frente al producto.
    if (score > 0) scored.push({ id: n.id, score: CHANNEL_NICHES.has(n.id) ? score * 0.6 : score, terms });
  }
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 1.2) return { niche: null, niches: [], confidence: 0, terms: [] };
  // Un nicho secundario necesita evidencia comparable a la del principal.
  const niches = scored.filter((s) => s.score >= Math.max(1.2, best.score * 0.6)).slice(0, 3).map((s) => s.id);
  const share = best.score / total;
  const volume = Math.min(1, best.score / 8);
  return { niche: best.id, niches, confidence: Math.round(share * volume * 100) / 100, terms: best.terms.slice(0, 8) };
}
