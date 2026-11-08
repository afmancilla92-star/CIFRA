/** Lectura centralizada de variables de entorno (solo servidor). */
export const config = {
  get metaToken() {
    return process.env.META_ACCESS_TOKEN?.trim() || null;
  },
  get metaVersion() {
    return process.env.META_GRAPH_VERSION?.trim() || "v26.0";
  },
  get metaMaxPages() {
    const n = Number(process.env.META_MAX_PAGES || 4);
    return Number.isFinite(n) && n > 0 ? Math.min(20, n) : 4;
  },
  get ingestToken() {
    return process.env.INGEST_TOKEN?.trim() || null;
  },
  get appPassword() {
    return process.env.APP_PASSWORD || null;
  },
  get cronSecret() {
    return process.env.CRON_SECRET?.trim() || null;
  },
  get retentionDays() {
    return Number(process.env.RETENTION_DAYS || 180);
  },
  get anthropicKey() {
    return process.env.ANTHROPIC_API_KEY?.trim() || null;
  },
  get aiModel() {
    return process.env.AI_CLASSIFY_MODEL?.trim() || "claude-opus-5-5";
  },
};

/** Comparación en tiempo constante para tokens. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? (m[1] as string).trim() : null;
}
