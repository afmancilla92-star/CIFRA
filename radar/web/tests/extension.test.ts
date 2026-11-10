import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetDbForTests } from "@/lib/db/client";
import { ExtensionPayload, ingestExtensionPayload, isAdLibraryUrl } from "@/lib/extension-ingest";
import { getAd } from "@/lib/queries";

const require = createRequire(import.meta.url);
// El mismo archivo que carga la extensión en Chrome.
const collector = require("../../extension/src/collector.js") as {
  extractFromText: (t: string) => Array<Record<string, unknown>>;
  findAdNodes: (v: unknown) => Array<Record<string, unknown>>;
};

// Estructura sintética anidada al estilo de los datos incrustados en la página.
const node = {
  ad_archive_id: "800000000000001",
  page_id: "900000000000001",
  page_name: "Tienda de prueba",
  is_active: true,
  start_date: 1788220800,
  publisher_platform: ["FACEBOOK", "INSTAGRAM"],
  collation_count: 3,
  spend: { lower_bound: 100 },
  demographic_distribution: [{ age: "18-24" }],
  snapshot: {
    body: { text: "Colchón ortopédico con 40% de descuento y envío gratis" },
    link_url: "https://tienda.example/colchon?utm_source=meta",
    caption: "TIENDA.EXAMPLE",
    images: [{ original_image_url: "https://scontent.example/a.jpg", unrelated: "x" }],
    page_categories: ["Furniture"],
    branded_content: { secret: true },
  },
};
const embedded = { require: [["ScheduledServerJS", "handle", null, [{ __bbox: { result: { data: { ad_library_main: { search_results_connection: { edges: [{ node: { collated_results: [node] } }] } } } } } }]]] };

const dir = mkdtempSync(path.join(tmpdir(), "radar-ext-"));
beforeAll(async () => {
  await resetDbForTests(`file:${path.join(dir, "t.db")}`);
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("colector de la extensión", () => {
  it("encuentra anuncios anidados y descarta campos no usados", () => {
    const found = collector.findAdNodes(embedded);
    expect(found).toHaveLength(1);
    expect(found[0]).not.toHaveProperty("spend");
    expect(found[0]).not.toHaveProperty("demographic_distribution");
    const snap = found[0]!.snapshot as Record<string, unknown>;
    expect(snap).not.toHaveProperty("branded_content");
    expect((snap.images as Array<Record<string, unknown>>)[0]).toEqual({ original_image_url: "https://scontent.example/a.jpg" });
  });

  it("lee respuestas con prefijo y en varias líneas", () => {
    expect(collector.extractFromText(`for (;;);${JSON.stringify(embedded)}`)).toHaveLength(1);
    const multi = `${JSON.stringify({ data: { a: [node] } })}\n${JSON.stringify({ label: "x", data: { b: [{ ...node, ad_archive_id: "800000000000002" }] } })}`;
    expect(collector.extractFromText(multi).map((n) => n.ad_archive_id)).toEqual(["800000000000001", "800000000000002"]);
  });

  it("de la captura a la plataforma", async () => {
    expect(isAdLibraryUrl("https://www.facebook.com/ads/library/?q=colchon&country=CL")).toBe(true);
    expect(isAdLibraryUrl("https://evil.example/ads/library")).toBe(false);
    const payload = ExtensionPayload.parse({
      pageUrl: "https://www.facebook.com/ads/library/?q=colchon&country=CL",
      query: { country: "CL", q: "colchon" },
      nodes: collector.findAdNodes(embedded),
      domCards: [],
    });
    const r = await ingestExtensionPayload(payload);
    expect(r).toMatchObject({ created: 1, mapped: 1 });
    const ad = (await getAd("800000000000001"))!;
    expect(ad).toMatchObject({ countries: ["CL"], niche: "hogar", landingKey: "tienda.example/colchon", format: "image" });
    expect(ad.offers).toEqual(expect.arrayContaining(["Descuento", "Envío gratis"]));
  });
});
