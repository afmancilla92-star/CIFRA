import { NextResponse } from "next/server";
import { z } from "zod";
import { adminGuard, jsonError, readJson } from "@/lib/http";
import { createWatchQuery, listWatchQueries } from "@/lib/sync";

const list = (max: number, re: RegExp) =>
  z
    .array(z.string().trim())
    .max(max)
    .transform((xs) => xs.filter(Boolean))
    .refine((xs) => xs.every((x) => re.test(x)), "Valor inválido");

const Body = z
  .object({
    label: z.string().trim().min(1).max(120),
    searchTerms: z.string().trim().max(100).nullish(),
    pageIds: list(10, /^\d{3,25}$/).default([]),
    countries: list(30, /^[A-Za-z]{2}$/).refine((x) => x.length > 0, "Indica al menos un país"),
    languages: list(10, /^[a-z]{2}$/).default([]),
    platforms: list(6, /^(facebook|instagram|messenger|audience_network|whatsapp|threads)$/).default([]),
    mediaType: z.enum(["ALL", "IMAGE", "MEME", "VIDEO", "NONE"]).default("ALL"),
    activeStatus: z.enum(["ACTIVE", "ALL", "INACTIVE"]).default("ACTIVE"),
    searchType: z.enum(["KEYWORD_UNORDERED", "KEYWORD_EXACT_PHRASE"]).default("KEYWORD_UNORDERED"),
    enabled: z.boolean().default(true),
  })
  .refine((b) => Boolean(b.searchTerms) || b.pageIds.length > 0, "Indica palabras clave o IDs de página");

export async function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  return NextResponse.json({ ok: true, items: await listWatchQueries() });
}

export async function POST(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await readJson(req, 50_000));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  const id = await createWatchQuery({ ...parsed.data, searchTerms: parsed.data.searchTerms || null });
  return NextResponse.json({ ok: true, id });
}
