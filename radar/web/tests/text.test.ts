import { describe, expect, it } from "vitest";
import { detectLanguage } from "@/lib/lang";
import { classifyByRules } from "@/lib/niche/rules";
import { detectOffers, messageHash, normalizeText } from "@/lib/text";
import { daysActive, parseLibraryDateText } from "@/lib/dates";

describe("texto", () => {
  it("normaliza tildes, emojis y signos", () => {
    expect(normalizeText("¡ENVÍO gratis! 🚚 Hoy")).toBe("envio gratis hoy");
  });

  it("produce la misma huella para el mismo mensaje con distinto formato", () => {
    expect(messageHash("¡Envío GRATIS a todo el país! 🚚", null)).toBe(messageHash("envio gratis a todo el pais", null));
    expect(messageHash("corto", null)).toBeNull();
  });

  it("detecta ofertas", () => {
    expect(detectOffers("50% OFF + envío gratis solo hoy")).toEqual(expect.arrayContaining(["Descuento", "Envío gratis", "Tiempo limitado"]));
    expect(detectOffers("Conoce nuestra historia")).toEqual([]);
  });
});

describe("idioma", () => {
  it("detecta español, portugués e inglés", () => {
    expect(detectLanguage("Descubre la nueva colección con envío gratis para todo el país")).toBe("es");
    expect(detectLanguage("Compre agora com frete grátis para você e sua família")).toBe("pt");
    expect(detectLanguage("Get the new collection today with free shipping on your order")).toBe("en");
    expect(detectLanguage("ok")).toBeNull();
  });
});

describe("nichos por reglas", () => {
  it("clasifica belleza", () => {
    const r = classifyByRules({ body: "Nuevo sérum antiarrugas para una rutina facial simple. Piel radiante en 14 días." });
    expect(r.niche).toBe("belleza");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.terms.length).toBeGreaterThan(0);
  });

  it("usa la categoría de la página", () => {
    expect(classifyByRules({ body: "Conoce nuestras propuestas", categories: ["Real Estate"] }).niche).toBe("inmobiliaria");
  });

  it("ropa por catálogo no se confunde con apps", () => {
    expect(
      classifyByRules({ body: "¡Descarga la App de Temu hoy!", title: "Conjunto de dos piezas para mujer, pantalones deportivos y camiseta" }).niche,
    ).toBe("moda");
    expect(classifyByRules({ body: "Descubre la nueva crema de maní con proteína", title: "Nuevo snack" }).niche).toBe("alimentacion");
  });

  it("reconoce calzado en inglés y español", () => {
    expect(classifyByRules({ body: "Comfortable slippers for every day. Pantuflas suaves" }).niche).toBe("moda");
  });

  it("no inventa un nicho sin evidencia", () => {
    expect(classifyByRules({ body: "Hola" }).niche).toBeNull();
  });
});

describe("fechas", () => {
  it("lee fechas de la Biblioteca en varios idiomas", () => {
    expect(parseLibraryDateText("Circulando desde el 3 nov 2026")).toBe("2026-11-03");
    expect(parseLibraryDateText("Started running on Nov 3, 2026")).toBe("2026-11-03");
    expect(parseLibraryDateText("Veiculação iniciada em 3 de nov de 2026")).toBe("2026-11-03");
  });

  it("calcula los días activos", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    expect(daysActive("2026-10-09", { isActive: true, now })).toBe(30);
    expect(daysActive("2026-10-01", { isActive: false, stopDate: "2026-10-11", now })).toBe(10);
    expect(daysActive(null, { isActive: true, now })).toBeNull();
  });
});
