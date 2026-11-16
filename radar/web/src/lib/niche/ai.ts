import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { all, run } from "../db/client";
import { config } from "../config";
import { recomputeForPages } from "../stats";
import { truncate } from "../text";
import { NICHES } from "./catalog";

/**
 * Clasificación de nicho con IA (opcional). Solo corre si hay
 * ANTHROPIC_API_KEY y se ejecuta a pedido o desde el cron; las reglas
 * siguen siendo la clasificación base. Se envía únicamente el texto público
 * del anuncio (cuerpo, título, descripción, anunciante y dominio).
 */

const BATCH = 20;
const CONFIDENCE = { alta: 0.9, media: 0.7, baja: 0.5 } as const;

const ResultSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      niche: z.string(),
      confidence: z.enum(["alta", "media", "baja"]),
    }),
  ),
});

const NICHE_IDS = [...NICHES.map((n) => n.id), "none"];

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          niche: { type: "string", enum: NICHE_IDS },
          confidence: { type: "string", enum: ["alta", "media", "baja"] },
        },
        required: ["id", "niche", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

const SYSTEM = `Clasificas anuncios publicitarios (en español, portugués o inglés) en un nicho de mercado.
Nichos disponibles (id: descripción):
${NICHES.map((n) => `- ${n.id}: ${n.label}`).join("\n")}
- none: no se puede determinar con el texto disponible.
Elige el nicho del producto o servicio que se vende, no el del público. Usa "none" si el texto no alcanza; no adivines.
Devuelve un resultado por cada anuncio recibido, con el mismo id.`;

export interface AiItem {
  id: string;
  text: string;
}

export interface AiOutcome {
  classified: number;
  skipped: number;
  message: string;
}

export async function classifyBatch(client: Anthropic, items: AiItem[]) {
  const response = await client.beta.messages.create({
    model: config.aiModel,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(items) }],
  });
  if (response.stop_reason === "refusal") return [];
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
  if (!text) return [];
  const parsed = ResultSchema.safeParse(JSON.parse(text));
  if (!parsed.success) return [];
  const ids = new Set(items.map((i) => i.id));
  return parsed.data.results.filter((r) => ids.has(r.id) && NICHE_IDS.includes(r.niche));
}

/** Clasifica con IA los anuncios sin nicho o con baja confianza por reglas. */
export async function runAiClassification(limit = 100): Promise<AiOutcome> {
  if (!config.anthropicKey) return { classified: 0, skipped: 0, message: "Falta ANTHROPIC_API_KEY: la clasificación por IA está desactivada." };
  const rows = await all<{ id: string; page_id: string; page_name: string; body: string | null; title: string | null; link_description: string | null; landing_domain: string | null }>(
    `SELECT id, page_id, page_name, body, title, link_description, landing_domain FROM ads
     WHERE is_manual = 0 AND COALESCE(niche_source, '') NOT IN ('ai', 'manual')
       AND (niche IS NULL OR COALESCE(niche_confidence, 0) < 0.35)
       AND (body IS NOT NULL OR title IS NOT NULL)
     ORDER BY score DESC LIMIT ?`,
    [Math.min(500, Math.max(1, limit))],
  );
  if (!rows.length) return { classified: 0, skipped: 0, message: "No hay anuncios pendientes de clasificar." };

  const client = new Anthropic({ apiKey: config.anthropicKey });
  const pages = new Set<string>();
  let classified = 0;
  let skipped = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const items = chunk.map((r) => ({
      id: r.id,
      text: truncate([r.page_name, r.title, r.body, r.link_description, r.landing_domain].filter(Boolean).join(" | "), 1200),
    }));
    let results: Awaited<ReturnType<typeof classifyBatch>> = [];
    try {
      results = await classifyBatch(client, items);
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError)
        return { classified, skipped, message: "ANTHROPIC_API_KEY inválida." };
      if (err instanceof Anthropic.RateLimitError) {
        return { classified, skipped: skipped + rows.length - i, message: `Límite de la API de Claude alcanzado; ${classified} clasificados.` };
      }
      if (err instanceof Anthropic.APIError) {
        skipped += chunk.length;
        continue;
      }
      throw err;
    }
    for (const r of results) {
      const row = chunk.find((c) => c.id === r.id)!;
      await run("UPDATE ads SET niche = ?, niche_confidence = ?, niche_source = 'ai', niche_terms = '[]' WHERE id = ?", [
        r.niche === "none" ? null : r.niche,
        r.niche === "none" ? 0 : CONFIDENCE[r.confidence],
        r.id,
      ]);
      pages.add(row.page_id);
      classified++;
    }
    skipped += chunk.length - results.length;
  }
  if (pages.size) await recomputeForPages(Array.from(pages));
  return { classified, skipped, message: `${classified} anuncios clasificados por IA${skipped ? `, ${skipped} sin resultado` : ""}.` };
}
