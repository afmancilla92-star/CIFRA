import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { generateWithClaude, moreHooksWithClaude, newDraft, templateDraft } from "../src/ext/studio";

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

const reply = {
  oferta: { titulo: "T", promesa: "P", para_quien: "Q", incluye: ["a"], bonos: [], garantia: "G", precio: "1", cta: "C" },
  anuncios: [{ angulo: "Dolor", gancho: "g", texto: "t", cta: "c", idea_creativa: "i" }],
  ganchos: ["uno", "dos"],
  landing: [{ seccion: "s", contenido: "c" }],
  objeciones: [{ objecion: "o", respuesta: "r" }],
};

/** Respuesta de la API en streaming (eventos SSE), como la entrega Anthropic. */
function sse(text: string, stopReason = "end_turn") {
  const half = Math.ceil(text.length / 2);
  const events: Array<Record<string, unknown>> = [
    { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } } },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: text.slice(0, half) } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: text.slice(half) } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 5 } },
    { type: "message_stop" },
  ];
  const body = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

const apiError = (status: number, type: string, message: string) =>
  new Response(JSON.stringify({ type: "error", error: { type, message } }), { status, headers: { "content-type": "application/json" } });

interface Call {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
}

/** fetch simulado: entrega las respuestas en orden y anota cada petición. */
function fakeFetch(responses: Array<() => Response>) {
  const calls: Call[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
    const next = responses[Math.min(calls.length - 1, responses.length - 1)]!;
    return next();
  }) as typeof fetch;
  return { fn, calls };
}

describe("Studio: plantillas", () => {
  it("arma un borrador con plantillas a partir de los datos", () => {
    const o = templateDraft(draft());
    expect(o.anuncios).toHaveLength(3);
    expect(o.ganchos.length).toBeGreaterThanOrEqual(6);
    expect(new Set(o.ganchos).size).toBe(o.ganchos.length);
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
    expect(JSON.stringify(o)).not.toMatch(/testimonio de|clientes satisfechos|\d+ ?% de (éxito|resultados)/i);
  });
});

describe("Studio: generación con Claude", () => {
  it("pide en streaming, con salida estructurada y modelo de respaldo, y avisa del avance", async () => {
    const { fn, calls } = fakeFetch([() => sse(JSON.stringify(reply))]);
    const progress: number[] = [];
    const out = await generateWithClaude(draft(), [], "sk-ant-prueba", fn, (n) => progress.push(n));
    expect(out.oferta.titulo).toBe("T");
    expect(out.ganchos).toEqual(["uno", "dos"]);
    expect(progress.length).toBe(2);
    expect(progress.at(-1)).toBe(JSON.stringify(reply).length);
    expect(calls).toHaveLength(1);
    const c = calls[0]!;
    expect(c.url).toContain("/v1/messages");
    expect(c.headers.get("x-api-key") ?? c.headers.get("authorization")).toContain("sk-ant-prueba");
    expect(c.headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(c.headers.get("anthropic-dangerous-direct-browser-access")).toBe("true");
    expect(c.body).toMatchObject({ model: "claude-opus-5-5", stream: true, fallbacks: "default" });
    expect(c.body.output_config).toMatchObject({ effort: "medium", format: { type: "json_schema" } });
    expect(JSON.stringify(c.body.messages)).toContain("Método Ventas");
    expect(JSON.stringify(c.body.messages)).toContain("10 ganchos");
  });

  it("si la cuenta rechaza el respaldo (400), reintenta sin él", async () => {
    const { fn, calls } = fakeFetch([() => apiError(400, "invalid_request_error", "fallbacks: no disponible"), () => sse(JSON.stringify(reply))]);
    const out = await generateWithClaude(draft(), [], "sk-ant-prueba", fn);
    expect(out.anuncios[0]!.gancho).toBe("g");
    expect(calls).toHaveLength(2);
    expect(calls[1]!.body.fallbacks).toBeUndefined();
    expect(calls[1]!.headers.get("anthropic-beta") ?? "").not.toContain("server-side-fallback");
    expect((calls[1]!.body.output_config as { format?: unknown }).format).toBeDefined();
  });

  it("si tampoco acepta el formato estructurado, pide el JSON en el mensaje y lo extrae", async () => {
    const bad = () => apiError(400, "invalid_request_error", "output_config: no disponible");
    const { fn, calls } = fakeFetch([bad, bad, () => sse(`Aquí tienes:\n${JSON.stringify(reply)}\nListo.`)]);
    const out = await generateWithClaude(draft(), [], "sk-ant-prueba", fn);
    expect(out.landing[0]!.seccion).toBe("s");
    expect(calls).toHaveLength(3);
    expect((calls[2]!.body.output_config as { format?: unknown }).format).toBeUndefined();
    expect(JSON.stringify(calls[2]!.body.messages)).toContain("objeto JSON");
  });

  it("no insiste cuando la clave es inválida o no hay saldo", async () => {
    const auth = fakeFetch([() => apiError(401, "authentication_error", "invalid x-api-key")]);
    await expect(generateWithClaude(draft(), [], "sk-ant-prueba", auth.fn)).rejects.toBeInstanceOf(Anthropic.AuthenticationError);
    expect(auth.calls).toHaveLength(1);
    const billing = fakeFetch([() => apiError(402, "billing_error", "sin saldo")]);
    await expect(generateWithClaude(draft(), [], "sk-ant-prueba", billing.fn)).rejects.toMatchObject({ type: "billing_error" });
    expect(billing.calls).toHaveLength(1);
  });

  it("informa cuando Claude rechaza generar", async () => {
    const { fn } = fakeFetch([() => sse("", "refusal")]);
    await expect(generateWithClaude(draft(), [], "sk-ant-prueba", fn)).rejects.toThrow(/políticas/);
  });

  it("pide más ganchos con esfuerzo bajo y sin repetir los que ya hay", async () => {
    const { fn, calls } = fakeFetch([() => sse(JSON.stringify({ ganchos: ["tres", " ", "cuatro"] }))]);
    const hooks = await moreHooksWithClaude(draft(), [], ["uno", "dos"], "sk-ant-prueba", fn);
    expect(hooks).toEqual(["tres", "cuatro"]);
    expect(calls[0]!.body.output_config).toMatchObject({ effort: "low" });
    expect(JSON.stringify(calls[0]!.body.messages)).toContain("- uno");
  });
});
