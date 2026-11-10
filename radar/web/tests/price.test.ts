import { describe, expect, it } from "vitest";
import { extractPrice } from "@/lib/price";

describe("precio mencionado en el anuncio", () => {
  it("reconoce formatos de la región", () => {
    expect(extractPrice("Hoy a solo AR$ 19.999 con envío")).toMatchObject({ amount: 19999, currency: "ARS" });
    expect(extractPrice("Precio especial $19.99")).toMatchObject({ amount: 19.99, currency: "$" });
    expect(extractPrice("$129.000 y págalo a cuotas")).toMatchObject({ amount: 129000 });
    expect(extractPrice("Solo 59.900 COP")).toMatchObject({ amount: 59900, currency: "COP" });
    expect(extractPrice("R$ 97,00 à vista")).toMatchObject({ amount: 97, currency: "BRL" });
  });
  it("no confunde porcentajes ni números sueltos", () => {
    expect(extractPrice("50% de descuento en 3 cuotas")).toBeNull();
    expect(extractPrice("Más de 500 suplementos")).toBeNull();
  });
});
