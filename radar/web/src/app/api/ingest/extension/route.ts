import { NextResponse } from "next/server";
import { bearer, config, safeEqual } from "@/lib/config";
import { ExtensionPayload, ingestExtensionPayload, isAdLibraryUrl } from "@/lib/extension-ingest";
import { CORS_HEADERS, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

function authorize(req: Request): NextResponse | null {
  const expected = config.ingestToken;
  if (!expected) return jsonError("La plataforma no tiene INGEST_TOKEN configurado.", 503, CORS_HEADERS);
  const got = bearer(req);
  if (!got || !safeEqual(got, expected)) return jsonError("Token de la extensión inválido.", 401, CORS_HEADERS);
  return null;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Prueba de conexión desde la extensión. */
export function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  return NextResponse.json({ ok: true, app: "Cifra Radar", apiVersion: 1 }, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  const body = await readJson(req, 8_000_000);
  if (!body) return jsonError("Cuerpo JSON inválido o demasiado grande.", 400, CORS_HEADERS);
  const parsed = ExtensionPayload.safeParse(body);
  if (!parsed.success) return jsonError(`Formato inválido: ${parsed.error.issues[0]?.message ?? ""}`, 400, CORS_HEADERS);
  if (!isAdLibraryUrl(parsed.data.pageUrl))
    return jsonError("Solo se aceptan capturas hechas en facebook.com/ads/library.", 400, CORS_HEADERS);
  const result = await ingestExtensionPayload(parsed.data);
  return NextResponse.json({ ok: true, ...result, ids: result.ids.slice(0, 50) }, { headers: CORS_HEADERS });
}
