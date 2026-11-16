import { z } from "zod";
import { ingestAds } from "./ingest";
import { mapDomCard, mapLibraryNode } from "./sources/library-page";
import type { RawAd } from "./types";

const DomCardSchema = z.object({
  libraryId: z.string().max(30),
  text: z.string().max(6000),
  images: z.array(z.string().max(3000)).max(12).optional(),
  videos: z.array(z.object({ src: z.string().max(3000), poster: z.string().max(3000).nullish() })).max(6).optional(),
  links: z.array(z.string().max(3000)).max(20).optional(),
  pageName: z.string().max(200).nullish(),
  pageUrl: z.string().max(500).nullish(),
});

export const ExtensionPayload = z.object({
  extensionVersion: z.string().max(20).optional(),
  pageUrl: z.string().max(3000),
  capturedAt: z.string().max(40).optional(),
  query: z
    .object({
      country: z.string().max(10).nullish(),
      q: z.string().max(300).nullish(),
      activeStatus: z.string().max(20).nullish(),
      adType: z.string().max(40).nullish(),
      mediaType: z.string().max(20).nullish(),
      pageId: z.string().max(40).nullish(),
    })
    .partial()
    .default({}),
  nodes: z.array(z.unknown()).max(1500).default([]),
  domCards: z.array(DomCardSchema).max(500).default([]),
});
export type ExtensionPayloadT = z.infer<typeof ExtensionPayload>;

/** La extensión solo puede enviar capturas hechas en la Biblioteca de Anuncios. */
export function isAdLibraryUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && /(^|\.)facebook\.com$/.test(u.hostname) && u.pathname.startsWith("/ads/library");
  } catch {
    return false;
  }
}

export async function ingestExtensionPayload(p: ExtensionPayloadT) {
  const country = p.query.country?.toUpperCase();
  const countries = country && country !== "ALL" && /^[A-Z]{2}$/.test(country) ? [country] : [];
  const pageId = p.query.pageId && /^\d{3,25}$/.test(p.query.pageId) ? p.query.pageId : null;
  const ctx = { countries, pageId };

  const ads: RawAd[] = [];
  for (const n of p.nodes) {
    const m = mapLibraryNode(n, ctx);
    if (m) ads.push(m);
  }
  const seen = new Set(ads.map((a) => a.id));
  for (const c of p.domCards) {
    if (seen.has(c.libraryId)) continue;
    const m = mapDomCard(c, ctx);
    if (m) ads.push(m);
  }
  const result = await ingestAds(ads, {
    source: "extension",
    queryCountries: countries,
    context: {
      pageUrl: p.pageUrl.slice(0, 500),
      q: p.query.q ?? null,
      country: country ?? null,
      nodes: p.nodes.length,
      domCards: p.domCards.length,
      extensionVersion: p.extensionVersion ?? null,
    },
  });
  return { ...result, mapped: ads.length, ignored: p.nodes.length + p.domCards.length - ads.length };
}
