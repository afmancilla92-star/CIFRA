import { NextResponse } from "next/server";
import { adminGuard, jsonError, readJson } from "@/lib/http";
import { importJson } from "@/lib/importers";

export async function POST(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const body = await readJson<{ countries?: unknown; payload?: unknown }>(req, 15_000_000);
  if (!body) return jsonError("JSON inválido o demasiado grande (máx. 15 MB).", 400);
  const countries = Array.isArray(body.countries)
    ? body.countries.map(String).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c))
    : [];
  const result = await importJson(body.payload, countries);
  if (!result.received && !result.ignored) return jsonError("No se encontraron anuncios en el archivo.", 400);
  return NextResponse.json({ ok: true, ...result, ids: result.ids.slice(0, 20) });
}
