import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetDbForTests } from "@/lib/db/client";
import { ingestAds } from "@/lib/ingest";
import { getAd, getAdvertiser, listAdvertisers, listLandings, relatedAds, searchAds, setFavorite } from "@/lib/queries";
import { purgeExpired } from "@/lib/stats";
import type { RawAd } from "@/lib/types";

// Base temporal con datos sintéticos SOLO para pruebas; nunca se usan en la app.
const dir = mkdtempSync(path.join(tmpdir(), "radar-test-"));

function ad(over: Partial<RawAd>): RawAd {
  return {
    id: "500000000000001",
    pageId: "600000000000001",
    pageName: "Marca A",
    isActive: true,
    startDate: "2026-08-01",
    stopDate: null,
    platforms: ["facebook"],
    languages: [],
    countries: [],
    body: "Sérum antiarrugas con envío gratis a todo el país",
    title: "Rutina facial",
    linkDescription: null,
    caption: "marca-a.example",
    ctaText: null,
    linkUrl: null,
    format: "unknown",
    media: [],
    collationId: null,
    collationCount: null,
    euTotalReach: null,
    ...over,
  };
}

beforeAll(async () => {
  await resetDbForTests(`file:${path.join(dir, "t.db")}`);
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("pipeline de ingesta", () => {
  it("crea anuncios desde la API y los enriquece con la extensión", async () => {
    const r1 = await ingestAds([ad({})], { source: "meta_api", queryCountries: ["ES"] });
    expect(r1).toMatchObject({ created: 1, updated: 0 });

    const r2 = await ingestAds(
      [
        ad({
          linkUrl: "https://marca-a.example/serum?utm_source=fb",
          media: [{ type: "image", url: "https://scontent.example/a.jpg?oe=6A000000" }],
          collationCount: 4,
          ctaText: "Comprar",
        }),
      ],
      { source: "extension", queryCountries: ["CL"] },
    );
    expect(r2).toMatchObject({ created: 0, updated: 1 });

    const a = (await getAd("500000000000001"))!;
    expect(a.sources).toEqual(["meta_api", "extension"]);
    expect(a.countries).toEqual(["ES", "CL"]);
    expect(a.landingKey).toBe("marca-a.example/serum");
    expect(a.format).toBe("image");
    expect(a.niche).toBe("belleza");
    expect(a.language).toBe("es");
    expect(a.offers).toContain("Envío gratis");
    expect(a.mediaExpiresAt).toMatch(/^20\d\d-/);
    expect(a.scoreBreakdown).toHaveLength(7);
    expect(a.score).toBeGreaterThan(0);
    expect(a.daysActive).toBeGreaterThan(30);
  });

  it("los datos parciales no pisan datos completos", async () => {
    await ingestAds([ad({ body: "texto leído mal", partial: true, media: [], isActive: true })], { source: "extension" });
    const a = (await getAd("500000000000001"))!;
    expect(a.body).toContain("Sérum");
    expect(a.media).toHaveLength(1);
    expect(a.partial).toBe(false);
  });

  it("agrupa por anunciante y landing y recalcula señales", async () => {
    await ingestAds(
      [
        ad({ id: "500000000000002", startDate: "2026-09-20", linkUrl: "https://marca-a.example/serum?fbclid=1", format: "video", media: [{ type: "video", url: "https://v.example/1.mp4" }] }),
        ad({ id: "500000000000003", startDate: "2026-10-15", body: "Otro mensaje distinto para la crema facial", linkUrl: "https://marca-a.example/serum" }),
        ad({ id: "500000000000004", pageId: "600000000000002", pageName: "Marca B", linkUrl: "https://marca-a.example/serum", body: "Revendedor autorizado del sérum facial" }),
      ],
      { source: "extension", queryCountries: ["CL"] },
    );
    const adv = (await getAdvertiser("600000000000001"))!;
    expect(adv.activeAds).toBe(3);
    expect(adv.mainNiche).toBe("belleza");

    const landings = await listLandings({ minAds: 2 });
    expect(landings.items[0]).toMatchObject({ key: "marca-a.example/serum", ads: 4, advertisers: 2 });

    const a = (await getAd("500000000000001"))!;
    const variants = a.scoreBreakdown.find((s) => s.key === "variants")!;
    expect(variants.observed).toBe("4 versiones");
    const rep = a.scoreBreakdown.find((s) => s.key === "message_repetition")!;
    expect(rep.points).toBeGreaterThan(0);

    const related = await relatedAds(a);
    expect(related.sameLanding.map((x) => x.id)).toContain("500000000000004");
    expect(related.sameMessage.map((x) => x.id)).toContain("500000000000002");

    const advs = await listAdvertisers({ sort: "active" });
    expect(advs.items[0]?.pageId).toBe("600000000000001");
  });

  it("filtra, busca sin tildes y ordena por antigüedad", async () => {
    const byText = await searchAds({ q: "serum", status: "all" });
    expect(byText.total).toBe(3);
    const byCountry = await searchAds({ country: "ES" });
    expect(byCountry.items.map((x) => x.id)).toEqual(["500000000000001"]);
    const oldestFirst = await searchAds({ sort: "longest", pageId: "600000000000001" });
    expect(oldestFirst.items.map((x) => x.id)).toEqual(["500000000000001", "500000000000002", "500000000000003"]);
    const minDays = await searchAds({ minDays: 40 });
    expect(minDays.items.every((x) => (x.daysActive ?? 0) >= 40)).toBe(true);
    const video = await searchAds({ format: "video" });
    expect(video.items.map((x) => x.id)).toEqual(["500000000000002"]);
  });

  it("la carga manual queda fuera de la exploración por defecto", async () => {
    await ingestAds([ad({ id: "manual-prueba-1", pageId: "manual-page", pageName: "Prueba interna" })], { source: "manual" });
    const def = await searchAds({ q: "serum", status: "all" });
    expect(def.items.find((x) => x.id === "manual-prueba-1")).toBeUndefined();
    const withManual = await searchAds({ q: "serum", status: "all", includeManual: true });
    expect(withManual.items.find((x) => x.id === "manual-prueba-1")?.isManual).toBe(true);
  });

  it("favoritos sobreviven a la retención", async () => {
    await setFavorite("500000000000003", true, "ver oferta");
    const fav = await searchAds({ favorites: true, status: "all" });
    expect(fav.items.map((x) => x.id)).toEqual(["500000000000003"]);
    expect(fav.items[0]?.favoriteNote).toBe("ver oferta");

    const future = new Date(Date.now() + 400 * 86_400_000);
    const removed = await purgeExpired(future);
    expect(removed).toBeGreaterThan(0);
    expect(await getAd("500000000000003")).not.toBeNull();
    expect(await getAd("500000000000001")).toBeNull();
  });

  it("rechaza IDs inválidos", async () => {
    const r = await ingestAds([ad({ id: "../../etc" }), ad({ id: "700000000000001", pageId: "" })], { source: "extension" });
    expect(r).toMatchObject({ created: 0, skipped: 2 });
  });
});
