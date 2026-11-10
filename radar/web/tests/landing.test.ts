import { describe, expect, it } from "vitest";
import { normalizeLanding, unwrapRedirect } from "@/lib/landing";

describe("landing", () => {
  it("desenvuelve la redirección de Facebook", () => {
    const wrapped = "https://l.facebook.com/l.php?u=https%3A%2F%2Ftienda.example%2Fproducto%3Futm_source%3Dfb&h=AT0";
    expect(unwrapRedirect(wrapped)).toBe("https://tienda.example/producto?utm_source=fb");
  });

  it("agrupa URLs que solo difieren en parámetros de seguimiento", () => {
    const a = normalizeLanding("https://www.Tienda.example/oferta/?utm_source=facebook&fbclid=abc&color=rojo");
    const b = normalizeLanding("https://tienda.example/oferta?utm_campaign=x&ad_id={{ad.id}}&color=rojo");
    expect(a?.key).toBe("tienda.example/oferta");
    expect(b?.key).toBe(a?.key);
    expect(a?.url).toBe("https://www.tienda.example/oferta?color=rojo");
    expect(a?.kind).toBe("web");
  });

  it("usa el dominio visible cuando no hay URL", () => {
    const l = normalizeLanding(null, "TIENDA.EXAMPLE");
    expect(l).toMatchObject({ key: "tienda.example", domainOnly: true, kind: "web" });
  });

  it("reconoce destinos de mensajería", () => {
    expect(normalizeLanding("https://wa.me/5491100000000")?.kind).toBe("messaging");
    expect(normalizeLanding("https://play.google.com/store/apps/details?id=x")?.kind).toBe("app_store");
  });

  it("ignora valores que no son URL ni dominio", () => {
    expect(normalizeLanding("javascript:alert(1)", "Compra ya")).toBeNull();
  });
});

describe("token de la extensión", () => {
  it("usa radar-local solo fuera de producción", async () => {
    const { config, DEV_INGEST_TOKEN } = await import("@/lib/config");
    const env = process.env as Record<string, string | undefined>;
    const prev = { node: env.NODE_ENV, token: env.INGEST_TOKEN };
    delete env.INGEST_TOKEN;
    env.NODE_ENV = "development";
    expect(config.ingestToken).toBe(DEV_INGEST_TOKEN);
    env.NODE_ENV = "production";
    expect(config.ingestToken).toBeNull();
    env.INGEST_TOKEN = "otro";
    expect(config.ingestToken).toBe("otro");
    env.NODE_ENV = prev.node;
    if (prev.token === undefined) delete env.INGEST_TOKEN;
    else env.INGEST_TOKEN = prev.token;
  });
});

describe("destinos compartidos", () => {
  it("no agrupa distintos números de WhatsApp ni distintas apps", () => {
    const a = normalizeLanding("https://api.whatsapp.com/send?phone=+57 300 000 0001&text=hola");
    const b = normalizeLanding("https://api.whatsapp.com/send?phone=573000000002");
    expect(a?.key).toBe("api.whatsapp.com/send?phone=573000000001");
    expect(b?.key).not.toBe(a?.key);
    const p1 = normalizeLanding("https://play.google.com/store/apps/details?id=com.ejemplo.tienda&utm_source=fb");
    const p2 = normalizeLanding("https://play.google.com/store/apps/details?id=com.otra.app");
    expect(p1?.key).toBe("play.google.com/store/apps/details?id=com.ejemplo.tienda");
    expect(p2?.key).not.toBe(p1?.key);
    expect(normalizeLanding("https://tienda.example/oferta?id=5")?.key).toBe("tienda.example/oferta");
  });
});
