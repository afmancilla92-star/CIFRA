/**
 * Detección de idioma liviana por palabras funcionales. Solo se usa cuando
 * la fuente no informa el idioma; devuelve null si no hay evidencia clara.
 */
const STOPWORDS: Record<string, string[]> = {
  es: ["el", "la", "los", "las", "de", "del", "que", "y", "en", "un", "una", "para", "con", "por", "tu", "tus", "es", "mas", "nuestro", "nuestra", "ahora", "aqui", "hoy", "envio", "compra", "gratis", "solo", "cuando", "como", "pero", "muy", "sin", "lo"],
  pt: ["o", "a", "os", "as", "de", "do", "da", "dos", "das", "que", "e", "em", "um", "uma", "para", "com", "por", "voce", "seu", "sua", "mais", "agora", "aqui", "hoje", "frete", "nao", "sao", "esta", "muito", "sem", "compre", "nosso"],
  en: ["the", "and", "of", "to", "in", "for", "with", "you", "your", "is", "on", "our", "now", "get", "this", "that", "free", "shop", "today", "are", "it", "at", "from", "new", "more", "only"],
  fr: ["le", "la", "les", "de", "des", "du", "et", "en", "un", "une", "pour", "avec", "vous", "votre", "est", "sur", "nos", "plus", "maintenant", "livraison", "gratuite", "aujourd", "dans", "pas"],
  it: ["il", "lo", "la", "gli", "le", "di", "del", "della", "che", "e", "per", "con", "un", "una", "tuo", "tua", "piu", "ora", "spedizione", "gratuita", "oggi", "sono", "non", "nel"],
  de: ["der", "die", "das", "und", "zu", "mit", "fur", "ist", "ein", "eine", "dein", "deine", "jetzt", "auf", "nicht", "sie", "wir", "versand", "kostenlos", "heute", "bei", "auch", "noch"],
};

export const LANGUAGE_NAMES: Record<string, string> = {
  es: "Español",
  pt: "Portugués",
  en: "Inglés",
  fr: "Francés",
  it: "Italiano",
  de: "Alemán",
};

export function detectLanguage(text: string | null | undefined): string | null {
  if (!text) return null;
  const words = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  if (words.length < 4) return null;
  let best: string | null = null;
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
  // Exige evidencia mínima y una ventaja sobre el segundo idioma (es/pt se parecen).
  if (bestScore < 2 || bestScore - second < 1) return null;
  return best;
}
