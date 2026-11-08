import { normalizeText } from "../text";
import { NICHES } from "./catalog";

export interface NicheResult {
  niche: string | null;
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

function countTerm(haystack: string, term: string): number {
  // Coincidencia por palabra completa sobre texto normalizado.
  const t = normalizeText(term);
  if (!t) return 0;
  const re = new RegExp(`(?:^| )${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?= |$)`, "g");
  return (haystack.match(re) ?? []).length;
}

/** Clasificación por reglas: suma de pesos de palabras clave por nicho. */
export function classifyByRules(input: NicheInput): NicheResult {
  const text = ` ${normalizeText(
    [input.title, input.body, input.linkDescription, input.pageName, (input.caption ?? "").replace(/\./g, " ")]
      .filter(Boolean)
      .join(" "),
  )} `;
  const cats = normalizeText((input.categories ?? []).join(" | "));

  let best: { id: string; score: number; terms: string[] } | null = null;
  let total = 0;
  for (const n of NICHES) {
    let score = 0;
    const terms: string[] = [];
    for (const term of n.strong) {
      const c = countTerm(text, term);
      if (c) {
        score += 2 * Math.min(c, 3);
        terms.push(term);
      }
    }
    for (const term of n.weak) {
      const c = countTerm(text, term);
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
    if (score > 0 && (!best || score > best.score)) best = { id: n.id, score, terms };
  }

  if (!best || best.score < 2) return { niche: null, confidence: 0, terms: [] };
  // Confianza: peso relativo frente a otros nichos y volumen de evidencia.
  const share = best.score / total;
  const volume = Math.min(1, best.score / 8);
  const confidence = Math.round(share * volume * 100) / 100;
  return { niche: best.id, confidence, terms: best.terms.slice(0, 8) };
}
