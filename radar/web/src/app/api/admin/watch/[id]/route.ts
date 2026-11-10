import { NextResponse } from "next/server";
import { z } from "zod";
import { adminGuard, jsonError, readJson } from "@/lib/http";
import { deleteWatchQuery, runWatchQuery, setWatchEnabled } from "@/lib/sync";

export const maxDuration = 120;

const Body = z.object({ action: z.enum(["run", "enable", "disable"]) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return jsonError("ID inválido", 400);
  const parsed = Body.safeParse(await readJson(req, 1000));
  if (!parsed.success) return jsonError("Acción inválida", 400);
  if (parsed.data.action === "run") return NextResponse.json({ ok: true, outcome: await runWatchQuery(id) });
  await setWatchEnabled(id, parsed.data.action === "enable");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return jsonError("ID inválido", 400);
  await deleteWatchQuery(id);
  return NextResponse.json({ ok: true });
}
