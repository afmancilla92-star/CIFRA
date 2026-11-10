import { describe, expect, it } from "vitest";
import { generateWithClaude, newDraft, templateDraft } from "../src/ext/studio";

const draft = () => ({
  ...newDraft(),
  name: "Método Ventas",
  kind: "curso",
  what: "Un curso en video de 6 módulos",
  customer: "emprendedoras que recién empiezan",
  problem: "no consiguen clientes",
  promise: "conseguir sus primeras ventas",
  price: "149.900",
  currency: "COP",
  guarantee: "7 días de devolución",
  bonuses: "Plantillas\nGuía",
});

describe("Studio", () => {
  it("arma un borrador con plantillas a partir de los datos", () => {
    const o = templateDraft(draft());
    expect(o.anuncios).toHaveLength(3);
    expect(o.oferta.precio).toBe("149.900 COP");
    expect(o.oferta.bonos).toEqual(["Plantillas", "Guía"]);
    expect(o.landing.length).toBeGreaterThan(5);
    expect(o.objeciones.length).toBeGreaterThanOrEqual(4);
  });

  it("deja entre corchetes lo que falta, sin inventar datos", () => {
    const o = templateDraft(newDraft());
    expect(o.oferta.titulo).toMatch(/^\[/);
    expect(o.oferta.precio).toMatch(/^\[/);
    expect(o.oferta.garantia).toMatch(/^\[/);
    const all = JSON.stringify(o);
    expect(all).not.toMatch(/testimonio de|clientes satisfechos|\d+ ?% de (éxito|resultados)/i);
  });

  it("llama a Claude con salida estructurada y modelo de respaldo", async () => {
    const calls: Array<{ url: string; headers: Headers; body: Record<string, unknown> }> = [];
    const reply = {
      oferta: { titulo: "T", promesa: "P", para_quien: "Q", incluye: ["a"], bonos: [], garantia: "G", precio: "1", cta: "C" },
      anuncios: [{ angulo: "Dolor", gancho: "g", texto: "t", cta: "c", idea_creativa: "i" }],
      landing: [{ seccion: "s", contenido: "c" }],
      objeciones: [{ objecion: "o", respuesta: "r" }],
    };
    const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
      return new Response(
        JSON.stringify({
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-opus-5-5",
          content: [{ type: "text", text: JSON.stringify(reply) }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;
    const out = await generateWithClaude(draft(), [], "sk-ant-prueba", fakeFetch);
    expect(out.oferta.titulo).toBe("T");
    expect(out.anuncios[0]!.gancho).toBe("g");
    const c = calls[0]!;
    expect(c.url).toContain("/v1/messages");
    expect(c.headers.get("x-api-key") ?? c.headers.get("authorization")).toContain("sk-ant-prueba");
    expect(c.headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(c.headers.get("anthropic-dangerous-direct-browser-access")).toBe("true");
    expect(c.body.model).toBe("claude-opus-5-5");
    expect(c.body.fallbacks).toBe("default");
    expect((c.body.output_config as { format: { type: string } }).format.type).toBe("json_schema");
    expect(JSON.stringify(c.body.messages)).toContain("Método Ventas");
  });

  it("informa cuando Claude rechaza generar", async () => {
    const fakeFetch = (async () =>
      new Response(
        JSON.stringify({ id: "m", type: "message", role: "assistant", model: "x", content: [], stop_reason: "refusal", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } }),
        { status: 200, headers: { "content-type": "application/json" } },
      )) as typeof fetch;
    await expect(generateWithClaude(draft(), [], "sk-ant-prueba", fakeFetch)).rejects.toThrow(/políticas/);
  });
});
