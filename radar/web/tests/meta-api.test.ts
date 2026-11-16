import { describe, expect, it, vi } from "vitest";
import { apiCoverageWarning, buildMetaUrl, fetchMetaAds, mapArchivedAd, MetaApiError } from "@/lib/sources/meta-api";

// Respuesta con la forma documentada de ads_archive (datos sintéticos de prueba).
const apiAd = {
  id: "100000000000001",
  page_id: "200000000000001",
  page_name: "Marca de prueba",
  ad_creative_bodies: ["Nuevo sérum facial con 30% de descuento"],
  ad_creative_link_captions: ["marca.example"],
  ad_creative_link_titles: ["Sérum facial"],
  ad_delivery_start_time: "2026-09-01",
  languages: ["es"],
  publisher_platforms: ["FACEBOOK", "INSTAGRAM"],
  eu_total_reach: 15000,
  ad_snapshot_url: "https://www.facebook.com/ads/archive/render_ad/?id=1&access_token=SECRET",
};

describe("Meta Ad Library API", () => {
  it("mapea un ArchivedAd sin conservar el snapshot con token", () => {
    const r = mapArchivedAd(apiAd, { countries: ["es"], activeStatus: "ACTIVE" })!;
    expect(r).toMatchObject({
      id: "100000000000001",
      pageId: "200000000000001",
      isActive: true,
      startDate: "2026-09-01",
      platforms: ["facebook", "instagram"],
      countries: ["ES"],
      caption: "marca.example",
      euTotalReach: 15000,
      media: [],
    });
    expect(JSON.stringify(r)).not.toContain("SECRET");
  });

  it("construye la URL con parámetros en formato de arreglo", () => {
    const url = new URL(
      buildMetaUrl({ searchTerms: "serum", countries: ["ES", "PT"], platforms: ["instagram"] }, { version: "v26.0", token: "T", fields: ["id"] }),
    );
    expect(url.pathname).toBe("/v26.0/ads_archive");
    expect(url.searchParams.get("ad_reached_countries")).toBe('["ES","PT"]');
    expect(url.searchParams.get("publisher_platforms")).toBe('["INSTAGRAM"]');
    expect(url.searchParams.get("ad_type")).toBe("ALL");
    expect(url.searchParams.get("ad_active_status")).toBe("ACTIVE");
  });

  it("advierte la cobertura limitada fuera de la UE", () => {
    expect(apiCoverageWarning(["ES", "FR"])).toBeNull();
    expect(apiCoverageWarning(["CL", "ES"])).toContain("CL");
  });

  it("pagina y reintenta sin campos opcionales si Meta los rechaza", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => {
      calls.push(url);
      if (calls.length === 1) return new Response(JSON.stringify({ error: { code: 100, message: "nonexisting field" } }), { status: 400 });
      if (calls.length === 2)
        return new Response(JSON.stringify({ data: [apiAd], paging: { cursors: { after: "C1" }, next: "https://next" } }), { status: 200 });
      return new Response(JSON.stringify({ data: [{ ...apiAd, id: "100000000000002" }] }), { status: 200 });
    });
    const r = await fetchMetaAds({ searchTerms: "serum", countries: ["ES"] }, { token: "T", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.ads.map((a) => a.id)).toEqual(["100000000000001", "100000000000002"]);
    expect(calls[0]).toContain("eu_total_reach");
    expect(calls[1]).not.toContain("eu_total_reach");
    expect(calls[2]).toContain("after=C1");
  });

  it("traduce errores de token sin exponerlo", async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ error: { code: 190, message: "bad token SECRET" } }), { status: 400 });
    await expect(
      fetchMetaAds({ searchTerms: "x", countries: ["ES"] }, { token: "SECRET", fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toSatisfy((e: unknown) => e instanceof MetaApiError && e.kind === "auth" && !e.message.includes("SECRET"));
  });

  it("se detiene ante el límite de llamadas conservando lo obtenido", async () => {
    let n = 0;
    const fetchImpl = async () => {
      n++;
      if (n === 1) return new Response(JSON.stringify({ data: [apiAd], paging: { cursors: { after: "C1" }, next: "x" } }), { status: 200 });
      return new Response(JSON.stringify({ error: { code: 613, message: "rate" } }), { status: 400 });
    };
    const r = await fetchMetaAds({ searchTerms: "x", countries: ["ES"] }, { token: "T", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.ads).toHaveLength(1);
    expect(r.stoppedEarly).toBe(true);
  });
});
