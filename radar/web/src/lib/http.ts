import { NextResponse } from "next/server";
import { config } from "./config";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
};

export function jsonError(message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ ok: false, error: message }, { status, headers });
}

/**
 * Las rutas de administración pasan por el middleware (sesión) cuando hay
 * APP_PASSWORD. En producción sin contraseña se bloquean para no dejar la
 * administración abierta en Internet.
 */
export function adminGuard(req: Request): NextResponse | null {
  if (process.env.NODE_ENV === "production" && !config.appPassword)
    return jsonError("Configura APP_PASSWORD para habilitar la administración en producción.", 403);
  return jsonGuard(req);
}

/** Exige JSON en escrituras: un formulario de otro sitio no puede enviarlo sin preflight CORS. */
export function jsonGuard(req: Request): NextResponse | null {
  const ct = req.headers.get("content-type") ?? "";
  if (req.method !== "GET" && req.method !== "DELETE" && !ct.includes("application/json"))
    return jsonError("Se espera Content-Type: application/json", 415);
  return null;
}

export async function readJson<T = unknown>(req: Request, maxBytes = 5_000_000): Promise<T | null> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return null;
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
