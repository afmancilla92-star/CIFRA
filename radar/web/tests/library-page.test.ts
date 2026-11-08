import { describe, expect, it } from "vitest";
import { mapDomCard, mapLibraryNode } from "@/lib/sources/library-page";

// Nodo sintético con la forma que usa la página de la Biblioteca de Anuncios.
const node = {
  ad_archive_id: "300000000000001",
  page_id: "400000000000001",
  page_name: "Tienda de prueba",
  is_active: true,
  start_date: 1788220800, // 2026-09-01
  end_date: 1788307200,
  publisher_platform: ["FACEBOOK", "INSTAGRAM", "AUDIENCE_NETWORK"],
  collation_count: 7,
  collation_id: "999",
  snapshot: {
    body: { text: "Zapatillas urbanas con envío gratis 🚚" },
    title: "Nueva colección",
    caption: "TIENDA.EXAMPLE",
    cta_text: "Comprar",
    link_url: "https://l.facebook.com/l.php?u=https%3A%2F%2Ftienda.example%2Fzapatillas%3Futm_source%3Dfb",
    display_format: "VIDEO",
    videos: [{ video_hd_url: "https://video.fbcdn.example/v.mp4?oe=6A000000", video_preview_image_url: "https://scontent.example/p.jpg" }],
    images: [],
    cards: [],
    page_profile_picture_url: "https://scontent.example/avatar.jpg",
    page_like_count: 1200,
    page_categories: ["Clothing (Brand)"],
  },
};

describe("Biblioteca de Anuncios (extensión)", () => {
  it("mapea un nodo de resultados", () => {
    const r = mapLibraryNode(node, { countries: ["CL"] })!;
    expect(r).toMatchObject({
      id: "300000000000001",
      pageId: "400000000000001",
      isActive: true,
      startDate: "2026-09-01",
      stopDate: null,
      platforms: ["facebook", "instagram", "audience_network"],
      countries: ["CL"],
      body: "Zapatillas urbanas con envío gratis 🚚",
      linkUrl: "https://tienda.example/zapatillas?utm_source=fb",
      format: "video",
      collationCount: 7,
    });
    expect(r.media[0]).toMatchObject({ type: "video", preview: "https://scontent.example/p.jpg" });
    expect(r.advertiser?.categories).toEqual(["Clothing (Brand)"]);
  });

  it("acepta cuerpo en formato markup y plantillas de catálogo", () => {
    const r = mapLibraryNode(
      { ...node, snapshot: { ...node.snapshot, body: { markup: { __html: "Hola<br/>mundo &amp; más" } }, title: "{{product.name}}" } },
      { countries: [] },
    )!;
    expect(r.body).toBe("Hola\nmundo & más");
    expect(r.title).toBeNull();
  });

  it("descarta nodos sin anunciante", () => {
    expect(mapLibraryNode({ ad_archive_id: "1" }, { countries: [] })).toBeNull();
  });

  it("lee una tarjeta visible como dato parcial", () => {
    const text = [
      "Activo",
      "Identificador de la biblioteca: 300000000000009",
      "Circulando desde el 3 oct 2026",
      "Plataformas",
      "3 anuncios usan este contenido y texto",
      "Ver detalles del anuncio",
      "Tienda de prueba",
      "Patrocinado",
      "Zapatillas urbanas, 2x1 solo hoy",
      "TIENDA.EXAMPLE",
      "Nueva colección",
      "Envío a todo el país",
      "Comprar",
    ].join("\n");
    const r = mapDomCard(
      { libraryId: "300000000000009", text, links: ["https://l.facebook.com/l.php?u=https%3A%2F%2Ftienda.example%2F2x1"] },
      { countries: ["CL"], pageId: "400000000000001" },
    )!;
    expect(r).toMatchObject({
      id: "300000000000009",
      pageId: "400000000000001",
      pageName: "Tienda de prueba",
      isActive: true,
      startDate: "2026-10-03",
      collationCount: 3,
      body: "Zapatillas urbanas, 2x1 solo hoy",
      caption: "TIENDA.EXAMPLE",
      title: "Nueva colección",
      linkUrl: "https://tienda.example/2x1",
      partial: true,
    });
  });
});
