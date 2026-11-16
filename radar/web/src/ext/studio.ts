/**
 * Studio: describe tu producto en una sola pantalla y obtén la oferta, tres
 * anuncios, ganchos, la estructura de la landing y respuestas a objeciones.
 * Con una clave de Anthropic guardada solo en este Chrome escribe Claude; sin
 * clave arma un borrador con plantillas. Puedes usar como referencia cualquier
 * anuncio de tu radar. Nunca inventa testimonios, cifras ni resultados.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { AdRecord } from "../lib/merge";
import { NICHES, nicheLabel } from "../lib/niche/catalog";
import { truncate } from "../lib/text";
import type { LocalStore } from "./store";
import { chip, h, icon, type Child } from "./ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

/** Anuncio del radar que se puede usar como referencia. */
export interface StudioRef extends Pick<AdRecord, "id" | "pageName" | "title" | "body" | "linkDescription" | "ctaText" | "price"> {
  days: number | null;
  copies: number;
  nicheList: string[];
}

export interface StudioHost {
  favorites(): StudioRef[];
  /** Anuncios del radar por ID (favoritos o no). */
  ads(ids: string[]): StudioRef[];
  store(): LocalStore;
  rerender(): void;
}

export interface Generated {
  oferta: { titulo: string; promesa: string; para_quien: string; incluye: string[]; bonos: string[]; garantia: string; precio: string; cta: string };
  anuncios: Array<{ angulo: string; gancho: string; texto: string; cta: string; idea_creativa: string }>;
  /** Ganchos adicionales para probar en la primera línea o en los primeros segundos. */
  ganchos: string[];
  landing: Array<{ seccion: string; contenido: string }>;
  objeciones: Array<{ objecion: string; respuesta: string }>;
}

export interface Draft {
  id: string;
  name: string;
  kind: string;
  what: string;
  customer: string;
  problem: string;
  promise: string;
  niche: string;
  refs: string[];
  price: string;
  currency: string;
  payment: string;
  guarantee: string;
  bonuses: string;
  tone: string;
  market: string;
  createdAt: string;
  updatedAt: string;
  output: Generated | null;
  outputSource: "ia" | "plantilla" | null;
  outputAt: string | null;
}

type TextField = "name" | "what" | "customer" | "problem" | "promise" | "price" | "guarantee" | "bonuses" | "market";
type Tab = "oferta" | "anuncios" | "ganchos" | "landing" | "objeciones";

const MODEL = "claude-opus-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const MAX_REFS = 5;

const TONES: Array<[string, string, string]> = [
  ["cercano", "Cercano", "cálido y conversacional, como le hablarías a un amigo"],
  ["directo", "Directo", "frases cortas, al grano, sin adornos"],
  ["profesional", "Profesional", "sobrio y confiable, con datos concretos"],
  ["aspiracional", "Aspiracional", "inspirador, centrado en la vida que el cliente quiere"],
];

const KINDS = [
  {
    id: "curso",
    label: "Curso o formación",
    hint: "Clases en video, módulos, certificado",
    noun: "un curso",
    cta: "Quiero inscribirme",
    includes: ["Módulos en video paso a paso [cantidad]", "Material descargable", "Ejercicios prácticos", "Soporte o comunidad [opcional]"],
    time: "Son lecciones cortas que se ven a su propio ritmo.",
  },
  {
    id: "ebook",
    label: "Ebook o libro",
    hint: "PDF, guía, manual",
    noun: "una guía",
    cta: "Descargar ahora",
    includes: ["Guía en PDF [cantidad de páginas]", "Checklists para aplicar lo aprendido", "Ejemplos prácticos"],
    time: "Se lee en una tarde y se aplica por partes.",
  },
  {
    id: "plantilla",
    label: "Plantilla o recurso digital",
    hint: "Planillas, presets, packs",
    noun: "un pack de recursos",
    cta: "Lo quiero",
    includes: ["Plantillas listas para usar [cantidad]", "Instrucciones de uso", "Actualizaciones [opcional]"],
    time: "Se usa en minutos: solo hay que completarla.",
  },
  {
    id: "membresia",
    label: "Membresía o comunidad",
    hint: "Acceso recurrente, grupo privado",
    noun: "una membresía",
    cta: "Unirme ahora",
    includes: ["Contenido nuevo cada mes", "Comunidad privada", "Sesiones en vivo [frecuencia]"],
    time: "Se aprovecha a su ritmo, con contenido nuevo cada mes.",
  },
  {
    id: "coaching",
    label: "Coaching o acompañamiento",
    hint: "Sesiones 1 a 1 o grupales",
    noun: "un acompañamiento",
    cta: "Agendar una llamada",
    includes: ["Sesiones de acompañamiento [cantidad y duración]", "Plan personalizado", "Soporte entre sesiones"],
    time: "Las sesiones se agendan en los horarios que le sirvan.",
  },
  {
    id: "servicio",
    label: "Servicio hecho por ti",
    hint: "Diseño, gestión, consultoría",
    noun: "un servicio",
    cta: "Pedir cotización",
    includes: ["Diagnóstico inicial", "Entrega del trabajo [plazo]", "Revisiones incluidas [cantidad]"],
    time: "Lo haces tú: el cliente solo revisa y aprueba.",
  },
  {
    id: "evento",
    label: "Evento o taller en vivo",
    hint: "Webinar, masterclass, reto",
    noun: "un taller en vivo",
    cta: "Reservar mi lugar",
    includes: ["Sesión en vivo [fecha y duración]", "Grabación disponible [plazo]", "Material de trabajo"],
    time: "Es una sola sesión y queda grabada.",
  },
  {
    id: "fisico",
    label: "Producto físico",
    hint: "Envío a domicilio",
    noun: "un producto",
    cta: "Comprar ahora",
    includes: ["El producto [presentación]", "Envío [zonas y plazos]", "Atención por WhatsApp"],
    time: "Llega a su casa y se usa enseguida.",
  },
];

const CURRENCIES = ["COP", "MXN", "ARS", "CLP", "PEN", "USD", "EUR", "BRL", "UYU", "BOB", "PYG", "GTQ", "DOP", "CRC"];
const PAYMENTS: Array<[string, string]> = [
  ["unico", "Pago único"],
  ["mensual", "Suscripción mensual"],
  ["anual", "Suscripción anual"],
  ["cuotas", "En cuotas"],
  ["contraentrega", "Pago contra entrega"],
];

export function newDraft(): Draft {
  const now = new Date().toISOString();
  return {
    id: `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    kind: "",
    what: "",
    customer: "",
    problem: "",
    promise: "",
    niche: "",
    refs: [],
    price: "",
    currency: "COP",
    payment: "unico",
    guarantee: "",
    bonuses: "",
    tone: "cercano",
    market: "",
    createdAt: now,
    updatedAt: now,
    output: null,
    outputSource: null,
    outputAt: null,
  };
}

const S = {
  draft: newDraft(),
  products: [] as Draft[],
  loaded: false,
  key: null as string | null,
  keyInput: "",
  keyMessage: "",
  showKey: false,
  showRefs: false,
  tab: "anuncios" as Tab,
  generating: "" as "" | "todo" | "ganchos",
  progress: 0,
  error: "",
};

// ── Utilidades ─────────────────────────────────────────────────────────────

const lines = (t: string) => t.split(/\n+/).map((x) => x.trim()).filter(Boolean);
const cap = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const kindOf = (d: Draft) => KINDS.find((k) => k.id === d.kind) ?? null;

function priceText(d: Draft) {
  if (!d.price.trim()) return "";
  const pay = PAYMENTS.find(([v]) => v === d.payment)?.[1];
  return `${d.price.trim()} ${d.currency}${pay && d.payment !== "unico" ? ` · ${pay.toLowerCase()}` : ""}`;
}

const REQUIRED: Array<[keyof Draft, string]> = [
  ["what", "qué vendes"],
  ["kind", "tipo"],
  ["customer", "para quién"],
  ["problem", "problema"],
  ["promise", "resultado"],
  ["price", "precio"],
];

function completeness(d: Draft) {
  const done = REQUIRED.filter(([k]) => String(d[k] ?? "").trim()).length;
  return Math.round((done / REQUIRED.length) * 100);
}

function copyBtn(text: () => string, label = "Copiar") {
  const b = h(
    "button",
    {
      class: "btn small",
      onclick: async (e: Event) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text());
          b.lastChild!.textContent = "Copiado";
        } catch {
          b.lastChild!.textContent = "No se pudo copiar";
        }
        setTimeout(() => (b.lastChild!.textContent = label), 1600);
      },
    },
    icon("copy", 13),
    h("span", null, label),
  );
  return b;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
async function persist(host: StudioHost) {
  clearTimeout(saveTimer);
  S.draft.updatedAt = new Date().toISOString();
  await host.store().saveProduct({ ...S.draft } as unknown as { id: string } & Record<string, unknown>);
  S.products = await loadProducts(host);
}
/** Guarda sin esperar a que el usuario salga del campo. */
function persistSoon(host: StudioHost) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void persist(host).catch(() => {}), 700);
}

async function loadProducts(host: StudioHost) {
  const list = await host.store().products<Draft>();
  return list.filter((p) => p && typeof p.id === "string").sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

const hasContent = (d: Draft) => Boolean(d.name.trim() || d.what.trim() || d.customer.trim() || d.output);

/** Usa un anuncio del radar como referencia del producto actual (lo llama el radar). */
export function addReference(ad: StudioRef) {
  if (!S.draft.refs.includes(ad.id)) S.draft.refs = [...S.draft.refs, ad.id].slice(-MAX_REFS);
  if (!S.draft.niche && ad.nicheList[0]) S.draft.niche = ad.nicheList[0];
  S.showRefs = true;
}

// ── Generación con Claude ──────────────────────────────────────────────────

const str = { type: "string" } as const;
const strList = { type: "array", items: str } as const;
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["oferta", "anuncios", "ganchos", "landing", "objeciones"],
  properties: {
    oferta: {
      type: "object",
      additionalProperties: false,
      required: ["titulo", "promesa", "para_quien", "incluye", "bonos", "garantia", "precio", "cta"],
      properties: { titulo: str, promesa: str, para_quien: str, incluye: strList, bonos: strList, garantia: str, precio: str, cta: str },
    },
    anuncios: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["angulo", "gancho", "texto", "cta", "idea_creativa"],
        properties: { angulo: str, gancho: str, texto: str, cta: str, idea_creativa: str },
      },
    },
    ganchos: strList,
    landing: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["seccion", "contenido"], properties: { seccion: str, contenido: str } },
    },
    objeciones: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["objecion", "respuesta"], properties: { objecion: str, respuesta: str } },
    },
  },
};
const HOOKS_SCHEMA = { type: "object", additionalProperties: false, required: ["ganchos"], properties: { ganchos: strList } };

const SYSTEM = `Eres un estratega de marketing de respuesta directa que ayuda a emprendedores de Latinoamérica a armar ofertas y anuncios para Facebook e Instagram.

Reglas:
- No inventes testimonios, cifras de ventas, cantidad de clientes o alumnos, resultados garantizados, certificaciones, premios ni escasez falsa. Si falta un dato, escribe una sugerencia entre corchetes para que el usuario la complete, por ejemplo [cantidad de módulos].
- No copies frases, nombres ni marcas de los anuncios de referencia: úsalos solo para entender ángulos, ganchos y estructura.
- Respeta las políticas publicitarias de Meta: nada de afirmaciones médicas, financieras o de pérdida de peso garantizadas, ni frases que aludan a características personales del lector (por ejemplo «¿Tienes diabetes?»).
- Sé concreto: ganchos de menos de 12 palabras y textos de anuncio de 40 a 120 palabras, listos para pegar.
- Escribe en español latinoamericano, con tuteo, en el tono que se indique.`;

function refText(r: StudioRef) {
  return truncate([r.title, r.body, r.linkDescription].filter(Boolean).join(" — "), 600);
}

function productBrief(d: Draft, refs: StudioRef[]) {
  const k = kindOf(d);
  const tone = TONES.find(([id]) => id === d.tone) ?? TONES[0]!;
  const out = [
    "Datos del producto (los escribió el usuario y pueden estar incompletos):",
    `- Nombre: ${d.name || "(sin definir: propón uno)"}`,
    `- Tipo: ${k?.label ?? "(sin definir)"}`,
    `- Qué es: ${d.what || "(sin definir)"}`,
    `- Cliente ideal: ${d.customer || "(sin definir)"}`,
    `- Problema que resuelve: ${d.problem || "(sin definir)"}`,
    `- Resultado que ayuda a lograr: ${d.promise || "(sin definir)"}`,
    `- Nicho: ${d.niche ? nicheLabel(d.niche) : "(sin definir)"}`,
    `- Precio: ${priceText(d) || "(sin definir)"}`,
    `- Garantía: ${d.guarantee || "(sin definir)"}`,
    `- Bonos: ${lines(d.bonuses).join("; ") || "(ninguno)"}`,
    `- Mercado: ${d.market || "Latinoamérica"}`,
    `- Tono: ${tone[1]} (${tone[2]})`,
  ];
  if (refs.length) {
    out.push(
      "",
      "Anuncios reales de otros anunciantes que el usuario guardó como referencia (solo para entender ángulos y estructura; no los copies):",
      ...refs.map((r, i) => `${i + 1}. ${r.pageName} · ${r.days ?? "?"} días activo · ${r.copies} copias${r.ctaText ? ` · botón «${r.ctaText}»` : ""}\n${refText(r)}`),
    );
  }
  return out.join("\n");
}

function buildPrompt(d: Draft, refs: StudioRef[]) {
  return `${productBrief(d, refs)}

Entrega:
- la oferta;
- exactamente 3 anuncios con ángulos distintos (dolor, resultado y oferta), cada uno con su idea creativa (imagen o video);
- 10 ganchos adicionales, distintos entre sí y de los anuncios, para la primera línea o los primeros 3 segundos de un video;
- la estructura de la landing por secciones, con lo que debe decir cada una;
- de 4 a 6 objeciones frecuentes con su respuesta.`;
}

function sanitize(raw: unknown): Generated {
  const o = (raw ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const arr = <T>(v: unknown, map: (x: Record<string, unknown>) => T): T[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object").map((x) => map(x as Record<string, unknown>)) : []);
  const sl = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && Boolean(x.trim())) : []);
  const of = (o.oferta ?? {}) as Record<string, unknown>;
  return {
    oferta: {
      titulo: s(of.titulo),
      promesa: s(of.promesa),
      para_quien: s(of.para_quien),
      incluye: sl(of.incluye),
      bonos: sl(of.bonos),
      garantia: s(of.garantia),
      precio: s(of.precio),
      cta: s(of.cta),
    },
    anuncios: arr(o.anuncios, (x) => ({ angulo: s(x.angulo), gancho: s(x.gancho), texto: s(x.texto), cta: s(x.cta), idea_creativa: s(x.idea_creativa) })),
    ganchos: sl(o.ganchos),
    landing: arr(o.landing, (x) => ({ seccion: s(x.seccion), contenido: s(x.contenido) })),
    objeciones: arr(o.objeciones, (x) => ({ objecion: s(x.objecion), respuesta: s(x.respuesta) })),
  };
}

/** Lee el JSON de la respuesta aunque venga rodeado de texto. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const a = text.indexOf("{");
    const b = text.lastIndexOf("}");
    if (a === -1 || b <= a) throw new SyntaxError("respuesta sin JSON");
    return JSON.parse(text.slice(a, b + 1));
  }
}

interface AskOptions {
  apiKey: string;
  prompt: string;
  schema: Record<string, unknown>;
  effort: "low" | "medium";
  onText?: (chars: number) => void;
  fetchImpl?: typeof fetch;
}

/**
 * Una pregunta a Claude con respuesta en JSON. Usa streaming (muestra avance y
 * evita cortes por tiempo) y salida estructurada. Si la cuenta o la
 * plataforma rechazan alguna opción (error 400), reintenta con menos: primero
 * sin el modelo de respaldo del servidor y después sin formato estructurado.
 */
async function askClaude(o: AskOptions): Promise<unknown> {
  // La clave es del usuario y vive solo en su Chrome: la página de la extensión llama directo a Anthropic.
  const client = new Anthropic({ apiKey: o.apiKey, dangerouslyAllowBrowser: true, maxRetries: 2, ...(o.fetchImpl ? { fetch: o.fetchImpl } : {}) });
  const base = { model: MODEL, max_tokens: 64000, system: SYSTEM };
  const format = { type: "json_schema" as const, schema: o.schema };
  let chars = 0;
  const watch = <T extends { on(event: "text", listener: (delta: string) => void): unknown }>(stream: T) => {
    stream.on("text", (delta) => {
      chars += delta.length;
      o.onText?.(chars);
    });
    return stream;
  };
  const attempts = [
    // 1) Con modelo de respaldo: si el principal declina o no está disponible, Anthropic responde con otro.
    () =>
      watch(
        client.beta.messages.stream({
          ...base,
          betas: [FALLBACK_BETA],
          fallbacks: "default",
          output_config: { effort: o.effort, format },
          messages: [{ role: "user", content: o.prompt }],
        }),
      ).finalMessage(),
    // 2) Sin respaldo del servidor.
    () => watch(client.messages.stream({ ...base, output_config: { effort: o.effort, format }, messages: [{ role: "user", content: o.prompt }] })).finalMessage(),
    // 3) Sin formato estructurado: se pide el JSON en el propio mensaje.
    () =>
      watch(
        client.messages.stream({
          ...base,
          output_config: { effort: o.effort },
          messages: [{ role: "user", content: `${o.prompt}\n\nResponde únicamente con un objeto JSON válido que siga este esquema, sin texto adicional:\n${JSON.stringify(o.schema)}` }],
        }),
      ).finalMessage(),
  ];
  let lastError: unknown;
  for (const attempt of attempts) {
    chars = 0;
    try {
      // Las dos variantes del SDK (beta y estable) entregan la misma forma mínima.
      const msg = (await attempt()) as unknown as { stop_reason: string | null; content: Array<{ type: string; text?: string }> };
      if (msg.stop_reason === "refusal") throw new Error("Claude no generó este contenido. Revisa que el producto cumpla las políticas publicitarias de Meta.");
      if (msg.stop_reason === "max_tokens") throw new Error("La respuesta quedó incompleta. Vuelve a intentarlo.");
      const text = msg.content.map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");
      return parseJson(text);
    } catch (e) {
      lastError = e;
      // Solo un «400 solicitud inválida» justifica probar con menos opciones.
      if (!(e instanceof Anthropic.BadRequestError)) throw e;
    }
  }
  throw lastError;
}

export async function generateWithClaude(d: Draft, refs: StudioRef[], apiKey: string, fetchImpl?: typeof fetch, onText?: (chars: number) => void): Promise<Generated> {
  return sanitize(await askClaude({ apiKey, prompt: buildPrompt(d, refs), schema: SCHEMA, effort: "medium", onText, fetchImpl }));
}

/** Diez ganchos más, distintos de los que ya hay (rápido: esfuerzo bajo). */
export async function moreHooksWithClaude(d: Draft, refs: StudioRef[], existing: string[], apiKey: string, fetchImpl?: typeof fetch, onText?: (chars: number) => void): Promise<string[]> {
  const prompt = `${productBrief(d, refs)}

Ganchos que ya tiene (no los repitas ni los parafrasees):
${existing.map((x) => `- ${x}`).join("\n") || "(ninguno)"}

Escribe 10 ganchos nuevos para la primera línea de un anuncio o los primeros 3 segundos de un video. Varía el enfoque: pregunta, dato concreto, error común, contraste, historia breve, objeción, curiosidad.`;
  const raw = (await askClaude({ apiKey, prompt, schema: HOOKS_SCHEMA, effort: "low", onText, fetchImpl })) as { ganchos?: unknown };
  return Array.isArray(raw?.ganchos) ? raw.ganchos.filter((x): x is string => typeof x === "string" && Boolean(x.trim())) : [];
}

function errorText(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError) return "La clave de Anthropic no es válida. Revísala o crea una nueva en console.anthropic.com → API Keys.";
  if (e instanceof Anthropic.PermissionDeniedError) return "Tu clave de Anthropic no tiene permiso para usar este modelo.";
  if (e instanceof Anthropic.RateLimitError) return "Llegaste al límite de uso de tu cuenta de Anthropic. Espera un momento y vuelve a intentarlo.";
  if (e instanceof Anthropic.APIConnectionError) return "No se pudo conectar con Anthropic. Revisa tu conexión a internet.";
  if (e instanceof Anthropic.APIError) {
    if (e.type === "billing_error") return "Tu cuenta de Anthropic no tiene saldo. Agrega créditos en console.anthropic.com → Billing.";
    if (e.type === "overloaded_error") return "Anthropic está con mucha demanda en este momento. Vuelve a intentarlo en un minuto.";
    return `Anthropic respondió con un error (${e.status ?? "sin código"}). Vuelve a intentarlo en un momento.`;
  }
  if (e instanceof SyntaxError) return "La respuesta no llegó en el formato esperado. Vuelve a intentarlo.";
  return (e as Error)?.message ?? String(e);
}

/** Borrador sin IA: arma la oferta con plantillas a partir de lo que escribiste. */
export function templateDraft(d: Draft): Generated {
  const k = kindOf(d);
  const name = d.name.trim() || "[Nombre de tu producto]";
  const who = d.customer.trim() || "[tu cliente ideal]";
  const problem = d.problem.trim() || "[el problema que resuelves]";
  const promise = d.promise.trim() || "[el resultado que ayudas a lograr]";
  const what = d.what.trim() || `${cap(k?.noun ?? "una solución")} [descríbelo en una frase]`;
  const price = priceText(d) || "[tu precio]";
  const guarantee = d.guarantee.trim() || "[tu garantía, p. ej. 7 días de devolución]";
  const cta = k?.cta ?? "Quiero saber más";
  const includes = k?.includes ?? ["[Qué recibe exactamente]", "[Cómo se entrega]", "[Soporte]"];
  const bonuses = lines(d.bonuses);
  return {
    oferta: {
      titulo: name,
      promesa: d.promise.trim() ? cap(promise) : `${cap(k?.noun ?? "Una solución")} para ${who} que ${problem}.`,
      para_quien: who,
      incluye: includes,
      bonos: bonuses.length ? bonuses : ["[Un bono que acelere el resultado: guía rápida, plantilla o sesión extra]"],
      garantia: guarantee,
      precio: price,
      cta,
    },
    anuncios: [
      {
        angulo: "Dolor",
        gancho: `Para ${who} que ${problem}`,
        texto: `${cap(problem)} no tiene por qué seguir así.\n\n${name} es ${what.charAt(0).toLowerCase() + what.slice(1)}, pensado para ${who}. Te ayuda a ${promise}.\n\nPrecio: ${price}. Garantía: ${guarantee}.`,
        cta,
        idea_creativa: "Video corto (15–30 s): la situación del problema en los primeros 3 segundos, con texto grande, y luego el producto en uso.",
      },
      {
        angulo: "Resultado",
        gancho: `Cómo ${promise}`,
        texto: `${name}: ${what}.\n\nIncluye:\n${includes.map((x) => `• ${x}`).join("\n")}${bonuses.length ? `\n\nBonos:\n${bonuses.map((x) => `• ${x}`).join("\n")}` : ""}\n\n${k?.time ?? ""}`.trim(),
        cta,
        idea_creativa: "Carrusel: 1) la promesa, 2–4) qué incluye, 5) precio, garantía y botón.",
      },
      {
        angulo: "Oferta",
        gancho: `${name} por ${price}`,
        texto: `${cap(what)}.\n\n✔ Para ${who}\n✔ Te ayuda a ${promise}\n✔ Garantía: ${guarantee}\n\n[Solo si es verdad: fecha límite, cupos o stock disponible]`,
        cta,
        idea_creativa: "Imagen del producto (o una maqueta) con el precio y la garantía bien visibles.",
      },
    ],
    landing: [
      { seccion: "Encabezado", contenido: `${cap(promise)}. Subtítulo: ${name}, ${what.charAt(0).toLowerCase() + what.slice(1)} para ${who}. Botón: ${cta}.` },
      { seccion: "El problema", contenido: `Describe con palabras de tu cliente cómo es vivir con esto: «${problem}».` },
      { seccion: "La solución", contenido: `Presenta ${name} y explica en 3 pasos cómo lleva a ${who} hasta ${promise}.` },
      { seccion: "Qué incluye", contenido: includes.join(" · ") },
      { seccion: "Para quién es (y para quién no)", contenido: `Es para ${who}. Aclara también para quién no es: genera confianza.` },
      { seccion: "Bonos", contenido: bonuses.length ? bonuses.join(" · ") : "[Agrega 1 o 2 bonos que aceleren el resultado]" },
      { seccion: "Garantía", contenido: guarantee },
      { seccion: "Precio y botón", contenido: `${price}. Botón: ${cta}. Repite el botón al final de la página.` },
      { seccion: "Preguntas frecuentes", contenido: "Responde las objeciones de abajo, con frases cortas." },
    ],
    ganchos: [
      `Para ${who} que ${problem}`,
      `Cómo ${promise}`,
      `${name}: ${what.charAt(0).toLowerCase() + what.slice(1)}`,
      `Lo que nadie te explica sobre ${promise}`,
      `Deja de pelear con esto: ${problem}`,
      `${cap(promise)}, paso a paso`,
      `${name} por ${price}`,
      `Antes de rendirte con ${promise}, mira esto`,
    ],
    objeciones: [
      { objecion: "Es muy caro", respuesta: `Compáralo con lo que cuesta seguir con «${problem}». ${d.payment === "cuotas" ? "Recuerda que se puede pagar en cuotas." : "Considera ofrecer pago en cuotas."}` },
      { objecion: "No tengo tiempo", respuesta: k?.time ?? "Explica cuánto tiempo requiere de verdad y cómo se adapta a su rutina." },
      { objecion: "¿Funcionará para mí?", respuesta: `Explica para quién es exactamente (${who}) y muestra el proceso paso a paso. No prometas resultados que no puedas comprobar.` },
      { objecion: "¿Es confiable?", respuesta: `Muestra quién está detrás, cómo se entrega y la garantía: ${guarantee}. Usa solo testimonios reales y con permiso.` },
    ],
  };
}

function outputAsText(o: Generated) {
  return [
    `OFERTA: ${o.oferta.titulo}`,
    `Promesa: ${o.oferta.promesa}`,
    `Para quién: ${o.oferta.para_quien}`,
    `Incluye:\n${o.oferta.incluye.map((x) => `- ${x}`).join("\n")}`,
    o.oferta.bonos.length ? `Bonos:\n${o.oferta.bonos.map((x) => `- ${x}`).join("\n")}` : "",
    `Garantía: ${o.oferta.garantia}`,
    `Precio: ${o.oferta.precio}`,
    `Botón: ${o.oferta.cta}`,
    "",
    ...o.anuncios.map((a, i) => `ANUNCIO ${i + 1} (${a.angulo})\n${a.gancho}\n\n${a.texto}\n\nBotón: ${a.cta}\nIdea creativa: ${a.idea_creativa}\n`),
    o.ganchos.length ? `GANCHOS\n${o.ganchos.map((x) => `- ${x}`).join("\n")}\n` : "",
    "LANDING",
    ...o.landing.map((s, i) => `${i + 1}. ${s.seccion}: ${s.contenido}`),
    "",
    "OBJECIONES",
    ...o.objeciones.map((x) => `- ${x.objecion}: ${x.respuesta}`),
  ]
    .filter((x) => x !== "")
    .join("\n");
}

function showProgress(chars: number) {
  S.progress = chars;
  const el = document.getElementById("studio-progress");
  if (el) el.textContent = chars ? `${chars.toLocaleString("es")} caracteres` : "pensando…";
}

async function generate(host: StudioHost, useAi: boolean) {
  if (S.generating) return;
  S.error = "";
  const refs = host.ads(S.draft.refs).slice(0, MAX_REFS);
  const done = async (output: Generated, source: "ia" | "plantilla") => {
    S.draft.output = output;
    S.draft.outputSource = source;
    S.draft.outputAt = new Date().toISOString();
    if (!S.draft.name.trim() && output.oferta.titulo && !output.oferta.titulo.startsWith("[")) S.draft.name = output.oferta.titulo;
    S.tab = "anuncios";
    await persist(host);
  };
  if (!useAi) {
    await done(templateDraft(S.draft), "plantilla");
    host.rerender();
    return;
  }
  if (!S.key) {
    S.showKey = true;
    host.rerender();
    return;
  }
  S.generating = "todo";
  S.progress = 0;
  host.rerender();
  try {
    await done(await generateWithClaude(S.draft, refs, S.key, undefined, showProgress), "ia");
  } catch (e) {
    S.error = errorText(e);
  } finally {
    S.generating = "";
    host.rerender();
  }
}

async function moreHooks(host: StudioHost) {
  const o = S.draft.output;
  if (!o || S.generating) return;
  S.error = "";
  if (!S.key) {
    // Sin IA: las variaciones de plantilla que aún no estén en la lista.
    const extra = templateDraft(S.draft).ganchos.filter((g) => !o.ganchos.includes(g));
    if (extra.length) o.ganchos.push(...extra);
    else S.error = "Con plantillas no hay más variaciones. Guarda tu clave de Anthropic para que Claude escriba ganchos nuevos.";
    await persist(host);
    host.rerender();
    return;
  }
  S.generating = "ganchos";
  S.progress = 0;
  host.rerender();
  try {
    const refs = host.ads(S.draft.refs).slice(0, MAX_REFS);
    const fresh = await moreHooksWithClaude(S.draft, refs, [...o.ganchos, ...o.anuncios.map((a) => a.gancho)], S.key, undefined, showProgress);
    o.ganchos.push(...fresh.filter((g) => !o.ganchos.includes(g)));
    await persist(host);
  } catch (e) {
    S.error = errorText(e);
  } finally {
    S.generating = "";
    host.rerender();
  }
}

// ── Vista ──────────────────────────────────────────────────────────────────

function refreshMeter() {
  document.getElementById("studio-meter")?.replaceWith(meter());
}

function meter() {
  const pct = completeness(S.draft);
  const missing = REQUIRED.filter(([k]) => !String(S.draft[k] ?? "").trim()).map(([, l]) => l);
  return h(
    "div",
    { class: "s-meter", id: "studio-meter" },
    h("div", { class: "bar" }, h("i", { style: `width:${pct}%` })),
    h("small", { class: "muted" }, pct === 100 ? "Completo. Entre más detalle, mejor el resultado." : `Falta: ${missing.join(", ")}. Puedes generar igual: lo que falte saldrá entre [corchetes].`),
  );
}

function input(field: TextField, placeholder: string, host: StudioHost, rows = 0) {
  const attrs = { class: rows ? "s-textarea" : "s-input", placeholder, "data-key": `studio-${field}`, "aria-label": placeholder };
  const el = (rows ? h("textarea", { ...attrs, rows }, S.draft[field]) : h("input", { ...attrs, type: "text", value: S.draft[field] })) as HTMLInputElement;
  el.addEventListener("input", () => {
    S.draft[field] = el.value;
    refreshMeter();
    persistSoon(host);
  });
  return el;
}

function q(label: string, control: Child, hint?: string) {
  return h("label", { class: "s-q" }, h("span", { class: "s-label" }, label), control, hint ? h("small", { class: "muted" }, hint) : null);
}

function select(value: string, options: Array<[string, string]>, onChange: (v: string) => void, label: string) {
  const s = h("select", { class: "s-input", "aria-label": label }, options.map(([v, l]) => h("option", { value: v, selected: v === value }, l))) as HTMLSelectElement;
  s.value = value;
  s.addEventListener("change", () => onChange(s.value));
  return s;
}

/** Texto del resultado que se puede corregir en el sitio. */
function editable(value: string, onChange: (v: string) => void, host: StudioHost, cls = "") {
  const rows = Math.min(16, Math.max(1, value.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 58)), 0)));
  const el = h("textarea", { class: `s-edit ${cls}`, rows, "aria-label": "Texto editable" }, value) as HTMLTextAreaElement;
  el.addEventListener("input", () => {
    onChange(el.value);
    persistSoon(host);
  });
  return el;
}

function refsBlock(host: StudioHost) {
  const d = S.draft;
  const chosen = host.ads(d.refs);
  const favs = host.favorites();
  const toggle = (id: string) => {
    d.refs = d.refs.includes(id) ? d.refs.filter((x) => x !== id) : [...d.refs, id].slice(-MAX_REFS);
    void persist(host);
    host.rerender();
  };
  return h(
    "div",
    { class: "s-block" },
    h(
      "div",
      { class: "row between wrap" },
      h("div", { class: "eyebrow" }, `Referencias de tu radar (${chosen.length}/${MAX_REFS})`),
      favs.length ? h("button", { class: "link-btn", onclick: () => { S.showRefs = !S.showRefs; host.rerender(); } }, S.showRefs ? "Ocultar favoritos" : "Elegir de favoritos") : null,
    ),
    chosen.length
      ? h(
          "div",
          { class: "chips" },
          chosen.map((r) => h("button", { class: "chip chip-scope", title: "Quitar referencia", onclick: () => toggle(r.id) }, truncate(`${r.pageName}: ${r.title || r.body || "anuncio"}`, 48), " ×")),
        )
      : h("small", { class: "muted" }, "Opcional. Abre cualquier anuncio del radar y pulsa «Usar en Studio», o elige de tus favoritos: Claude toma sus ángulos, sin copiar el texto."),
    S.showRefs && favs.length
      ? h(
          "div",
          { class: "refs" },
          favs.slice(0, 40).map((r) => {
            const on = d.refs.includes(r.id);
            return h(
              "button",
              { class: `ref${on ? " on" : ""}`, "aria-pressed": String(on), onclick: () => toggle(r.id) },
              h("span", { class: "ref-check" }, on ? "✓" : ""),
              h("span", { class: "grow" }, h("b", null, r.pageName), h("small", { class: "muted block" }, truncate(r.title || r.body || "Sin texto", 90))),
              h("small", { class: "muted" }, `${r.days ?? "—"} d · ${r.copies}×`),
            );
          }),
        )
      : null,
  );
}

function keyPanel(host: StudioHost) {
  if (S.key) {
    return h(
      "div",
      { class: "key-panel ok" },
      icon("sparkle", 14),
      h("span", null, `IA activada: clave de Anthropic guardada en este Chrome (…${S.key.slice(-4)}).`),
      h(
        "button",
        {
          class: "link-btn",
          onclick: async () => {
            await chrome.storage.local.remove("anthropicKey").catch(() => {});
            S.key = null;
            S.keyMessage = "Clave eliminada de este Chrome.";
            host.rerender();
          },
        },
        "Quitar",
      ),
    );
  }
  if (!S.showKey) {
    return h(
      "button",
      { class: "link-btn s-key-link", onclick: () => { S.showKey = true; host.rerender(); } },
      "¿Quieres que lo escriba Claude? Guarda tu clave de Anthropic",
    );
  }
  const el = h("input", { type: "password", class: "s-input", placeholder: "sk-ant-…", value: S.keyInput, autocomplete: "off", "data-key": "studio-key", "aria-label": "Clave de Anthropic" }) as HTMLInputElement;
  el.addEventListener("input", () => (S.keyInput = el.value));
  const save = async () => {
    const k = S.keyInput.trim();
    if (!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k)) {
      S.keyMessage = "Esa no parece una clave de Anthropic: empieza con «sk-ant-».";
      host.rerender();
      return;
    }
    await chrome.storage.local.set({ anthropicKey: k }).catch(() => {});
    S.key = k;
    S.keyInput = "";
    S.keyMessage = "";
    host.rerender();
  };
  el.addEventListener("keydown", (e) => (e as KeyboardEvent).key === "Enter" && void save());
  return h(
    "div",
    { class: "key-panel" },
    h("div", { class: "s-row" }, el, h("button", { class: "btn", onclick: () => void save() }, "Guardar clave")),
    h(
      "small",
      { class: "muted" },
      "Créala en console.anthropic.com → API Keys → Create Key (con saldo en Billing). Se guarda solo en este Chrome y se envía únicamente a Anthropic cuando generas.",
    ),
    S.keyMessage ? h("small", { class: "s-key-msg" }, S.keyMessage) : null,
  );
}

function formView(host: StudioHost) {
  const d = S.draft;
  const busy = Boolean(S.generating);
  const set = (patch: Partial<Draft>) => {
    Object.assign(d, patch);
    void persist(host);
    host.rerender();
  };
  return h(
    "section",
    { class: "card pad s-form" },
    h(
      "div",
      { class: "s-block" },
      h("div", { class: "eyebrow" }, "1 · Lo esencial"),
      q("¿Qué vendes?", input("what", "Ej.: Un curso en video de 6 módulos para vender por Instagram", host, 2), "Qué es y cómo se entrega, sin adornos."),
      h(
        "div",
        { class: "kind-chips", role: "group", "aria-label": "Tipo de producto" },
        KINDS.map((k) => h("button", { class: `chip chip-btn${d.kind === k.id ? " on" : ""}`, "aria-pressed": String(d.kind === k.id), title: k.hint, onclick: () => set({ kind: d.kind === k.id ? "" : k.id }) }, k.label)),
      ),
      h(
        "div",
        { class: "s-row" },
        q("Nombre", input("name", "Si no tienes, Claude propone uno", host)),
        q("Precio", input("price", "Ej.: 149.900", host)),
        q("Moneda", select(d.currency, CURRENCIES.map((c): [string, string] => [c, c]), (v) => set({ currency: v }), "Moneda")),
      ),
    ),
    h(
      "div",
      { class: "s-block" },
      h("div", { class: "eyebrow" }, "2 · A quién y para qué"),
      q("¿Para quién es?", input("customer", "Ej.: emprendedoras que venden por redes y recién empiezan", host, 2)),
      q("¿Qué problema le resuelve?", input("problem", "Ej.: publican todos los días y no consiguen clientes", host, 2), "Con las palabras de tu cliente."),
      q("¿Qué resultado le ayuda a lograr?", input("promise", "Ej.: conseguir sus primeras ventas con un método simple", host, 2), "Realista y comprobable: nada de resultados garantizados."),
    ),
    h(
      "details",
      { class: "s-more" },
      h("summary", null, "Más opciones: nicho, tono, mercado, garantía y bonos"),
      h(
        "div",
        { class: "s-row" },
        q("Nicho", select(d.niche, [["", "Sin definir"], ...NICHES.map((n): [string, string] => [n.id, n.label])], (v) => set({ niche: v }), "Nicho")),
        q("Tono", select(d.tone, TONES.map(([id, label]): [string, string] => [id, label]), (v) => set({ tone: v }), "Tono")),
        q("Mercado", input("market", "Ej.: Colombia", host)),
      ),
      h(
        "div",
        { class: "s-row" },
        q("Garantía", input("guarantee", "Ej.: 7 días de devolución", host), "Solo la que vas a cumplir."),
        q("Forma de pago", select(d.payment, PAYMENTS, (v) => set({ payment: v }), "Forma de pago")),
      ),
      q("Bonos (uno por línea)", input("bonuses", "Ej.: Plantillas de mensajes para WhatsApp", host, 2)),
    ),
    refsBlock(host),
    h(
      "div",
      { class: "s-actions" },
      meter(),
      h(
        "div",
        { class: "row wrap" },
        h(
          "button",
          { class: "btn btn-primary btn-lg", disabled: busy, onclick: () => void generate(host, true), title: S.key ? "" : "Necesita tu clave de Anthropic" },
          S.generating === "todo" ? h("span", { class: "spinner" }) : icon("sparkle", 16),
          S.generating === "todo" ? "Claude está escribiendo…" : d.output ? "Regenerar con IA" : "Generar con IA",
        ),
        S.generating === "todo" ? h("small", { class: "muted", id: "studio-progress" }, "pensando…") : null,
        h("button", { class: "btn", disabled: busy, onclick: () => void generate(host, false) }, "Borrador rápido sin IA"),
      ),
      keyPanel(host),
      !S.key && S.keyMessage && !S.showKey ? h("small", { class: "muted" }, S.keyMessage) : null,
      S.error ? h("p", { class: "warn" }, S.error) : null,
    ),
  );
}

function emptyOutput() {
  return h(
    "div",
    { class: "card pad s-empty" },
    h("div", { class: "hero-icon" }, icon("sparkle", 30)),
    h("h2", null, "Tu oferta y tus anuncios, en un minuto"),
    h("p", { class: "muted" }, "Describe lo esencial a la izquierda y genera. Vas a recibir:"),
    h(
      "ul",
      { class: "s-list" },
      h("li", null, h("b", null, "3 anuncios"), " listos para pegar, con ángulos distintos y su idea creativa."),
      h("li", null, h("b", null, "10 ganchos"), " para la primera línea o los primeros segundos del video."),
      h("li", null, h("b", null, "La oferta"), ": promesa, qué incluye, bonos, garantía y botón."),
      h("li", null, h("b", null, "La landing"), " por secciones y las ", h("b", null, "objeciones"), " con su respuesta."),
    ),
    h("small", { class: "muted" }, "Todo se puede editar, copiar y descargar. Cifra no inventa testimonios, cifras ni resultados."),
  );
}

function outputView(host: StudioHost, d: Draft) {
  const o = d.output!;
  const tabs: Array<[Tab, string]> = [
    ["anuncios", `Anuncios (${o.anuncios.length})`],
    ["ganchos", `Ganchos (${o.ganchos.length})`],
    ["oferta", "Oferta"],
    ["landing", "Landing"],
    ["objeciones", "Objeciones"],
  ];
  const listEdit = (items: string[], set: (v: string[]) => void) => editable(items.join("\n"), (v) => set(lines(v)), host);
  let body: HTMLElement;
  if (S.tab === "anuncios") {
    body = h(
      "div",
      { class: "s-ads" },
      o.anuncios.map((a, i) =>
        h(
          "article",
          { class: "out-ad" },
          h("div", { class: "row between" }, h("div", { class: "eyebrow" }, `Anuncio ${i + 1} · ${a.angulo}`), copyBtn(() => `${a.gancho}\n\n${a.texto}`, "Copiar")),
          editable(a.gancho, (v) => (a.gancho = v), host, "s-edit-strong"),
          editable(a.texto, (v) => (a.texto = v), host),
          h("div", { class: "chips" }, chip(`Botón: ${a.cta}`, "chip-accent")),
          h("p", { class: "muted small" }, h("b", null, "Idea creativa: "), a.idea_creativa),
        ),
      ),
    );
  } else if (S.tab === "ganchos") {
    body = h(
      "div",
      { class: "stack" },
      o.ganchos.length
        ? h(
            "ol",
            { class: "hook-list" },
            o.ganchos.map((g, i) => h("li", null, editable(g, (v) => (o.ganchos[i] = v), host), copyBtn(() => o.ganchos[i] ?? "", "Copiar"))),
          )
        : h("p", { class: "muted" }, "Aún no hay ganchos adicionales."),
      h(
        "div",
        { class: "row wrap" },
        h(
          "button",
          { class: "btn", disabled: Boolean(S.generating), onclick: () => void moreHooks(host) },
          S.generating === "ganchos" ? h("span", { class: "spinner" }) : icon("plus", 14),
          S.generating === "ganchos" ? "Escribiendo ganchos…" : S.key ? "10 ganchos más con IA" : "Más ganchos",
        ),
        S.generating === "ganchos" ? h("small", { class: "muted", id: "studio-progress" }, "pensando…") : null,
      ),
    );
  } else if (S.tab === "oferta") {
    body = h(
      "div",
      { class: "offer" },
      q("Título", editable(o.oferta.titulo, (v) => (o.oferta.titulo = v), host, "s-edit-title")),
      q("Promesa", editable(o.oferta.promesa, (v) => (o.oferta.promesa = v), host, "s-edit-strong")),
      q("Para quién", editable(o.oferta.para_quien, (v) => (o.oferta.para_quien = v), host)),
      h(
        "div",
        { class: "offer-cols" },
        q("Incluye (uno por línea)", listEdit(o.oferta.incluye, (v) => (o.oferta.incluye = v))),
        q("Bonos (uno por línea)", listEdit(o.oferta.bonos, (v) => (o.oferta.bonos = v))),
      ),
      h(
        "div",
        { class: "s-row" },
        q("Precio", editable(o.oferta.precio, (v) => (o.oferta.precio = v), host)),
        q("Garantía", editable(o.oferta.garantia, (v) => (o.oferta.garantia = v), host)),
        q("Botón", editable(o.oferta.cta, (v) => (o.oferta.cta = v), host)),
      ),
    );
  } else if (S.tab === "landing") {
    body = h("ol", { class: "steps" }, o.landing.map((s) => h("li", null, h("b", null, s.seccion), editable(s.contenido, (v) => (s.contenido = v), host))));
  } else {
    body = h("dl", { class: "objections" }, o.objeciones.map((x) => [h("dt", null, x.objecion), h("dd", null, editable(x.respuesta, (v) => (x.respuesta = v), host))]));
  }
  return h(
    "div",
    { class: "card pad s-result" },
    h(
      "div",
      { class: "row between wrap" },
      h(
        "div",
        null,
        h("h2", null, d.name.trim() || (o.oferta.titulo && !o.oferta.titulo.startsWith("[") ? o.oferta.titulo : "Tu material")),
        h("small", { class: "muted" }, d.outputSource === "ia" ? "Escrito por Claude con tus datos." : "Borrador con plantillas.", " Edita lo que quieras y completa lo que está entre [corchetes]."),
      ),
      h(
        "div",
        { class: "row wrap" },
        copyBtn(() => outputAsText(o), "Copiar todo"),
        h(
          "button",
          {
            class: "btn small",
            onclick: () => {
              const url = URL.createObjectURL(new Blob([outputAsText(o)], { type: "text/plain;charset=utf-8" }));
              h("a", { href: url, download: `${(d.name.trim() || "cifra-studio").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60)}.txt` }).click();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            },
          },
          "Descargar .txt",
        ),
      ),
    ),
    h(
      "div",
      { class: "s-tabs", role: "tablist" },
      tabs.map(([id, label]) => h("button", { class: `s-tab${S.tab === id ? " on" : ""}`, role: "tab", "aria-selected": String(S.tab === id), onclick: () => { S.tab = id; host.rerender(); } }, label)),
    ),
    body,
    h("small", { class: "muted" }, "Revisa siempre el texto antes de publicarlo y cumple las políticas publicitarias de Meta."),
  );
}

export function studioView(host: StudioHost): HTMLElement {
  if (!S.loaded) {
    S.loaded = true;
    void (async () => {
      try {
        S.products = await loadProducts(host);
        // Si llegaste con una referencia nueva («Usar en Studio»), no se pisa lo que ya hay en pantalla.
        if (S.products[0] && !hasContent(S.draft) && !S.draft.refs.length) S.draft = { ...newDraft(), ...S.products[0] };
      } catch {
        /* sin almacén de productos */
      }
      try {
        const { anthropicKey } = await chrome.storage.local.get("anthropicKey");
        if (typeof anthropicKey === "string" && anthropicKey) S.key = anthropicKey;
      } catch {
        /* fuera de la extensión */
      }
      host.rerender();
    })();
  }
  const d = S.draft;
  if (d.output && !Array.isArray(d.output.ganchos)) d.output.ganchos = [];
  const saved = S.products.some((p) => p.id === d.id);
  return h(
    "div",
    { class: "stack studio" },
    h(
      "div",
      { class: "row between wrap" },
      h(
        "div",
        null,
        h("h1", { class: "page-title" }, "Studio"),
        h("p", { class: "muted lead" }, "Describe tu producto y recibe la oferta, 3 anuncios, 10 ganchos y la estructura de tu landing, con los ángulos de los anuncios que guardaste."),
      ),
      h(
        "div",
        { class: "row wrap" },
        S.products.length
          ? select(
              d.id,
              [...(saved ? [] : [[d.id, d.name || "Producto nuevo"] as [string, string]]), ...S.products.map((p): [string, string] => [p.id, p.name || "Sin nombre"])],
              (id) => {
                const p = S.products.find((x) => x.id === id);
                if (p) S.draft = { ...newDraft(), ...p };
                S.error = "";
                host.rerender();
              },
              "Tus productos",
            )
          : null,
        h("button", { class: "btn", onclick: () => { S.draft = newDraft(); S.error = ""; host.rerender(); } }, icon("plus", 14), "Nuevo"),
        saved
          ? h(
              "button",
              {
                class: "btn danger",
                onclick: async () => {
                  if (!confirm(`¿Eliminar «${d.name || "este producto"}»?`)) return;
                  await host.store().deleteProduct(d.id);
                  S.products = await loadProducts(host);
                  S.draft = S.products[0] ? { ...newDraft(), ...S.products[0] } : newDraft();
                  host.rerender();
                },
              },
              "Eliminar",
            )
          : null,
      ),
    ),
    h("div", { class: "studio-grid" }, formView(host), h("section", { class: "s-out" }, d.output ? outputView(host, d) : emptyOutput())),
  );
}
