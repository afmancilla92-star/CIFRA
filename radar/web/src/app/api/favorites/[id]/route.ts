import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, jsonGuard, readJson } from "@/lib/http";
import { adExists, setFavorite } from "@/lib/queries";

const Body = z.object({ on: z.boolean(), note: z.string().max(1000).nullish() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = jsonGuard(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await readJson(req, 10_000));
  if (!parsed.success) return jsonError("Datos inválidos", 400);
  if (!(await adExists(params.id))) return jsonError("Anuncio no encontrado", 404);
  await setFavorite(params.id, parsed.data.on, parsed.data.note);
  return NextResponse.json({ ok: true, favorite: parsed.data.on });
}
