import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { LocalStore } from "@/ext/store";

// Datos sintéticos de prueba con la forma de la Biblioteca de Anuncios.
const node = (id: string, page: string, body: string, link: string, startUnix: number, extra: Record<string, unknown> = {}) => ({
  ad_archive_id: id,
  page_id: page,
  page_name: `Página ${page.slice(-1)}`,
  is_active: true,
  start_date: startUnix,
  publisher_platform: ["FACEBOOK", "INSTAGRAM"],
  collation_count: 3,
  snapshot: {
    body: { text: body },
    link_url: link,
    display_format: "IMAGE",
    images: [{ original_image_url: `https://scontent.example/${id}.jpg` }],
    page_profile_picture_url: "https://scontent.example/avatar.jpg",
  },
  ...extra,
});
const day = 86400;
const now = Math.floor(Date.now() / 1000);
const payload = {
  pageUrl: "https://www.facebook.com/ads/library/?country=CO&q=serum",
  query: { country: "CO", q: "serum" },
  nodes: [
    node("110000000000001", "120000000000001", "Sérum facial con 30% de descuento y envío gratis", "https://tienda.example/serum?utm_source=fb", now - 60 * day),
    node("110000000000002", "120000000000001", "Sérum facial con 30% de descuento y envío gratis", "https://tienda.example/serum", now - 10 * day),
    node("110000000000003", "120000000000002", "Zapatillas urbanas nueva colección", "https://zapas.example/", now - 3 * day),
  ],
};

describe("almacén local de la extensión", () => {
  it("guarda capturas, agrupa y puntúa como la plataforma", async () => {
    const store = await LocalStore.open(new IDBFactory());
    const r = await store.ingestExtensionPayload(payload);
    expect(r).toMatchObject({ created: 3, updated: 0 });

    const ads = await store.allAds();
    const a = ads.find((x) => x.id === "110000000000001")!;
    expect(a).toMatchObject({ countries: ["CO"], niche: "belleza", landingKey: "tienda.example/serum", format: "image" });
    expect(a.scoreBreakdown).toHaveLength(7);
    expect(a.score).toBeGreaterThan(0);

    const advs = await store.allAdvertisers();
    expect(advs.find((x) => x.pageId === "120000000000001")).toMatchObject({ activeAds: 2, mainNiche: "belleza", landingCount: 1 });

    // Segunda captura del mismo anuncio: actualiza, no duplica.
    const r2 = await store.ingestExtensionPayload({ ...payload, nodes: payload.nodes.slice(0, 1) });
    expect(r2).toMatchObject({ created: 0, updated: 1 });
    expect((await store.allAds()).length).toBe(3);
    store.close();
  });

  it("favoritos, respaldo y retención", async () => {
    const factory = new IDBFactory();
    const store = await LocalStore.open(factory);
    await store.ingestExtensionPayload(payload);
    await store.setFavorite("110000000000003", true, "revisar");
    expect((await store.favorites()).get("110000000000003")?.note).toBe("revisar");

    const backup = await store.exportAll();
    expect(backup.ads).toHaveLength(3);

    const removed = await store.purge(180, new Date(Date.now() + 400 * day * 1000));
    expect(removed).toBe(2);
    expect((await store.allAds()).map((x) => x.id)).toEqual(["110000000000003"]);

    await store.clear();
    expect(await store.allAds()).toHaveLength(0);
    const imported = await store.importFile(backup);
    expect(imported.count).toBe(3);
    expect((await store.favorites()).has("110000000000003")).toBe(true);
    store.close();
  });

  it("rechaza capturas que no vienen de la Biblioteca", async () => {
    const store = await LocalStore.open(new IDBFactory());
    await expect(store.ingestExtensionPayload({ ...payload, pageUrl: "https://otra.example/ads/library" })).rejects.toThrow();
    store.close();
  });
});
