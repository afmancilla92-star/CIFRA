import { NextResponse } from "next/server";
import { bearer, config, safeEqual } from "@/lib/config";
import { jsonError } from "@/lib/http";
import { runAiClassification } from "@/lib/niche/ai";
import { dailyMaintenance, runAllWatchQueries } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Ejecutado por Vercel Cron (Authorization: Bearer $CRON_SECRET) o por
 * cualquier programador externo: consulta la API oficial con las búsquedas
 * monitoreadas, recalcula puntuaciones y aplica la retención.
 */
export async function GET(req: Request) {
  const secret = config.cronSecret;
  if (!secret) return jsonError("CRON_SECRET no configurado.", 503);
  const got = bearer(req);
  if (!got || !safeEqual(got, secret)) return jsonError("No autorizado", 401);
  const outcomes = await runAllWatchQueries();
  const maintenance = await dailyMaintenance();
  const ai = config.anthropicKey ? await runAiClassification(100) : null;
  return NextResponse.json({ ok: true, outcomes, maintenance, ai });
}
