import { NextResponse } from "next/server";
import { z } from "zod";
import { adminGuard, jsonError, readJson } from "@/lib/http";
import { runAiClassification } from "@/lib/niche/ai";
import { purgeExpired, recomputeAll } from "@/lib/stats";
import { runAllWatchQueries } from "@/lib/sync";

export const maxDuration = 300;

const Body = z.object({ action: z.enum(["recompute", "purge", "ai", "sync"]) });

export async function POST(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await readJson(req, 1000));
  if (!parsed.success) return jsonError("Acción inválida", 400);
  switch (parsed.data.action) {
    case "recompute":
      return NextResponse.json({ ok: true, message: `Puntuaciones recalculadas para ${await recomputeAll()} anunciantes.` });
    case "purge":
      return NextResponse.json({ ok: true, message: `${await purgeExpired()} anuncios eliminados por retención.` });
    case "ai": {
      const r = await runAiClassification(100);
      return NextResponse.json({ ok: true, message: r.message });
    }
    case "sync": {
      const outcomes = await runAllWatchQueries();
      const ok = outcomes.filter((o) => o.status === "ok");
      const message = outcomes.length
        ? `${ok.length}/${outcomes.length} búsquedas ejecutadas · ${ok.reduce((s, o) => s + o.created, 0)} anuncios nuevos${outcomes.find((o) => o.status === "error") ? ` · error: ${outcomes.find((o) => o.status === "error")!.message}` : ""}`
        : "No hay búsquedas monitoreadas activas.";
      return NextResponse.json({ ok: true, message, outcomes });
    }
  }
}
