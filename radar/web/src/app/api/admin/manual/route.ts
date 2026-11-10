import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { adminGuard, jsonError, readJson } from "@/lib/http";
import { ingestAds } from "@/lib/ingest";
import type { MediaItem, Platform } from "@/lib/types";

/**
 * Carga manual: herramienta secundaria de pruebas y mantenimiento. Los
 * anuncios quedan marcados como manuales y no aparecen en la exploración
 * salvo que se active el filtro correspondiente.
 */
const Body = z.object({
  libraryId: z.string().trim().regex(/^\d{6,25}$/).nullish().or(z.literal("")),
  pageName: z.string().trim().min(1).max(200),
  pageId: z.string().trim().regex(/^\d{3,25}$/).nullish().or(z.literal("")),
  body: z.string().max(5000).nullish(),
  title: z.string().max(300).nullish(),
  linkUrl: z.string().url().max(2000).nullish().or(z.literal("")),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().or(z.literal("")),
  isActive: z.boolean().default(true),
  platforms: z.array(z.enum(["facebook", "instagram", "messenger", "audience_network", "whatsapp", "threads"])).default([]),
  countries: z.array(z.string().regex(/^[A-Za-z]{2}$/)).max(20).default([]),
  mediaUrl: z.string().url().max(3000).nullish().or(z.literal("")),
  mediaType: z.enum(["image", "video"]).default("image"),
});

export async function POST(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await readJson(req, 50_000));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  const b = parsed.data;
  const media: MediaItem[] = b.mediaUrl ? [{ type: b.mediaType, url: b.mediaUrl }] : [];
  const pageId = b.pageId || `manual-${b.pageName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
  const result = await ingestAds(
    [
      {
        id: b.libraryId || `manual-${randomBytes(6).toString("hex")}`,
        pageId,
        pageName: b.pageName,
        isActive: b.isActive,
        startDate: b.startDate || null,
        stopDate: null,
        platforms: b.platforms as Platform[],
        languages: [],
        countries: b.countries.map((c) => c.toUpperCase()),
        body: b.body || null,
        title: b.title || null,
        linkDescription: null,
        caption: null,
        ctaText: null,
        linkUrl: b.linkUrl || null,
        format: media.length ? b.mediaType : "unknown",
        media,
        collationId: null,
        collationCount: null,
        euTotalReach: null,
      },
    ],
    { source: "manual" },
  );
  return NextResponse.json({ ok: true, ...result });
}
