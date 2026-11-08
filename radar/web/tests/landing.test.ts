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
