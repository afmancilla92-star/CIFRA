/**
 * Studio: arma la base de un producto propio (qué es, para quién, cuánto
 * cuesta) y genera un borrador de oferta, anuncios, estructura de landing y
 * respuestas a objeciones. Con una clave de Anthropic guardada solo en este
 * Chrome usa Claude; sin clave arma un borrador con plantillas.
 * Nunca inventa testimonios, cifras ni resultados.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { AdRecord } from "../lib/merge";
import { NICHES, nicheLabel } from "../lib/niche/catalog";
import { truncate } from "../lib/text";
import type { LocalStore } from "./store";
import { chip, h, icon, type Child } from "./ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

/** Anuncio guardado que se puede usar como referencia. */
export interface StudioRef extends Pick<AdRecord, "id" | "pageName" | "title" | "body" | "linkDescription" | "ctaText" | "price"> {
  days: number | null;
  copies: number;
  nicheList: string[];
}

export interface StudioHost {
  favorites(): StudioRef[];
  store(): LocalStore;
  rerender(): void;
}

export interface Generated {
  oferta: { titulo: string; promesa: string; para_quien: string; incluye: string[]; bonos: string[]; garantia: string; precio: string; cta: string };
  anuncios: Array<{ angulo: string; gancho: string; texto: string; cta: string; idea_creativa: string }>;
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
  createdAt: string;
  updatedAt: string;
  output: Generated | null;
  outputSource: "ia" | "plantilla" | null;
  outputAt: string | null;
}

type TextField = "name" | "what" | "customer" | "problem" | "promise" | "price" | "guarantee" | "bonuses";

const MODEL = "claude-opus-5-5";
const MAX_REFS = 5;

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
    createdAt: now,
    updatedAt: now,
    output: null,
    outputSource: null,
    outputAt: null,
  };
}

const S = {
  step: 1 as 1 | 2 | 3,
  draft: newDraft(),
  products: [] as Draft[],
  loaded: false,
  key: null as string | null,
  keyInput: "",
  keyMessage: "",
  generating: false,
  error: "",
  saved: "",
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
  ["name", "Nombre"],
  ["kind", "Tipo de producto"],
  ["what", "Qué es"],
  ["customer", "Cliente ideal"],
  ["problem", "Problema"],
  ["promise", "Resultado"],
  ["price", "Precio"],
];

function completeness(d: Draft) {
  const done = REQUIRED.filter(([k]) => String(d[k] ?? "").trim()).length;
  return Math.round((done / REQUIRED.length) * 100);
}

function copyBtn(text: string, label = "Copiar") {
  const b = h(
    "button",
    {
      class: "btn small",
      onclick: async (e: Event) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          b.lastChild!.textContent = "Copiado";
        } catch {
          b.lastChild!.textContent = "No se pudo copiar";
        }
      },
    },
    icon("copy", 13),
    h("span", null, label),
  );
  return b;
}

async function persist(host: StudioHost) {
  S.draft.updatedAt = new Date().toISOString();
  await host.store().saveProduct({ ...S.draft } as unknown as { id: string } & Record<string, unknown>);
  S.products = await loadProducts(host);
}

async function loadProducts(host: StudioHost) {
  const list = await host.store().products<Draft>();
  return list.filter((p) => p && typeof p.id === "string").sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

// ── Generación ─────────────────────────────────────────────────────────────

const str = { type: "string" } as const;
const strList = { type: "array", items: str } as const;
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["oferta", "anuncios", "landing", "objeciones"],
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

const SYSTEM = `Eres un estratega de marketing de respuesta directa que ayuda a emprendedores de Latinoamérica a armar ofertas y anuncios para Facebook e Instagram.

Reglas:
- No inventes testimonios, cifras de ventas, cantidad de clientes o alumnos, resultados garantizados, certificaciones, premios ni escasez falsa. Si falta un dato, escribe una sugerencia entre corchetes para que el usuario la complete, por ejemplo [cantidad de módulos].
- No copies frases, nombres ni marcas de los anuncios de referencia: úsalos solo para entender ángulos, ganchos y estructura.
- Respeta las políticas publicitarias de Meta: nada de afirmaciones médicas, financieras o de pérdida de peso garantizadas, ni frases que aludan a características personales del lector (por ejemplo «¿Tienes diabetes?»).
- Sé concreto: ganchos de menos de 12 palabras y textos de anuncio de 40 a 120 palabras.
- Escribe en español latinoamericano neutro, con tuteo.`;

function refText(r: StudioRef) {
  return truncate([r.title, r.body, r.linkDescription].filter(Boolean).join(" — "), 600);
}

function buildPrompt(d: Draft, refs: StudioRef[]) {
  const k = kindOf(d);
  const out = [
    "Datos del producto (los escribió el usuario y pueden estar incompletos):",
    `- Nombre: ${d.name || "(sin definir)"}`,
    `- Tipo: ${k?.label ?? "(sin definir)"}`,
    `- Qué es: ${d.what || "(sin definir)"}`,
    `- Cliente ideal: ${d.customer || "(sin definir)"}`,
    `- Problema que resuelve: ${d.problem || "(sin definir)"}`,
    `- Resultado que ayuda a lograr: ${d.promise || "(sin definir)"}`,
    `- Nicho: ${d.niche ? nicheLabel(d.niche) : "(sin definir)"}`,
    `- Precio: ${priceText(d) || "(sin definir)"}`,
    `- Garantía: ${d.guarantee || "(sin definir)"}`,
    `- Bonos: ${lines(d.bonuses).join("; ") || "(ninguno)"}`,
  ];
  if (refs.length) {
    out.push(
      "",
      "Anuncios reales de otros anunciantes que el usuario guardó como referencia (solo para entender ángulos y estructura; no los copies):",
      ...refs.map((r, i) => `${i + 1}. ${r.pageName} · ${r.days ?? "?"} días activo · ${r.copies} copias${r.ctaText ? ` · botón «${r.ctaText}»` : ""}\n${refText(r)}`),
    );
  }
  out.push(
    "",
    "Entrega: la oferta; exactamente 3 anuncios con ángulos distintos (dolor, resultado y oferta), cada uno con su idea creativa (imagen o video); la estructura de la landing por secciones, con lo que debe decir cada una; y de 4 a 6 objeciones frecuentes con su respuesta.",
  );
  return out.join("\n");
}

function sanitize(raw: unknown): Generated {
  const o = (raw ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const arr = <T>(v: unknown, map: (x: Record<string, unknown>) => T): T[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object").map((x) => map(x as Record<string, unknown>)) : []);
  const sl = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
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
    landing: arr(o.landing, (x) => ({ seccion: s(x.seccion), contenido: s(x.contenido) })),
    objeciones: arr(o.objeciones, (x) => ({ objecion: s(x.objecion), respuesta: s(x.respuesta) })),
  };
}

export async function generateWithClaude(d: Draft, refs: StudioRef[], apiKey: string, fetchImpl?: typeof fetch): Promise<Generated> {
  // La clave es del usuario y vive solo en su Chrome: la página de la extensión llama directo a Anthropic.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  const msg = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    // Si el modelo no está disponible, Anthropic responde con uno de respaldo.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: buildPrompt(d, refs) }],
  });
  if (msg.stop_reason === "refusal") throw new Error("Claude no generó este contenido. Revisa que el producto cumpla las políticas publicitarias de Meta.");
  if (msg.stop_reason === "max_tokens") throw new Error("La respuesta quedó incompleta. Vuelve a intentarlo.");
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return sanitize(JSON.parse(text));
}

function errorText(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError) return "La clave de Anthropic no es válida. Revísala o crea una nueva en console.anthropic.com → API Keys.";
  if (e instanceof Anthropic.PermissionDeniedError) return "Tu clave de Anthropic no tiene permiso para usar este modelo.";
  if (e instanceof Anthropic.RateLimitError) return "Llegaste al límite de uso de tu cuenta de Anthropic. Espera un momento y vuelve a intentarlo.";
  if (e instanceof Anthropic.APIConnectionError) return "No se pudo conectar con Anthropic. Revisa tu conexión a internet.";
  if (e instanceof Anthropic.APIError) {
    return /credit|billing|balance/i.test(e.message)
      ? "Tu cuenta de Anthropic no tiene saldo. Agrega créditos en console.anthropic.com → Billing."
      : `Anthropic respondió con un error (${e.status ?? "sin código"}). Vuelve a intentarlo en un momento.`;
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
    "LANDING",
    ...o.landing.map((s, i) => `${i + 1}. ${s.seccion}: ${s.contenido}`),
    "",
    "OBJECIONES",
    ...o.objeciones.map((x) => `- ${x.objecion}: ${x.respuesta}`),
  ]
    .filter((x) => x !== "")
    .join("\n");
}

async function generate(host: StudioHost, useAi: boolean) {
  if (S.generating) return;
  S.error = "";
  const refs = host.favorites().filter((r) => S.draft.refs.includes(r.id)).slice(0, MAX_REFS);
  if (!useAi) {
    S.draft.output = templateDraft(S.draft);
    S.draft.outputSource = "plantilla";
    S.draft.outputAt = new Date().toISOString();
    await persist(host);
    host.rerender();
    return;
  }
  if (!S.key) return;
  S.generating = true;
  host.rerender();
  try {
    S.draft.output = await generateWithClaude(S.draft, refs, S.key);
    S.draft.outputSource = "ia";
    S.draft.outputAt = new Date().toISOString();
    await persist(host);
  } catch (e) {
    S.error = errorText(e);
  } finally {
    S.generating = false;
    host.rerender();
  }
}

// ── Vista ──────────────────────────────────────────────────────────────────

function input(field: TextField, placeholder: string, host: StudioHost, multiline = false, rows = 3) {
  const attrs = { class: multiline ? "s-textarea" : "s-input", placeholder, "data-key": `studio-${field}`, "aria-label": placeholder };
  const el = (multiline ? h("textarea", { ...attrs, rows }, S.draft[field]) : h("input", { ...attrs, type: "text", value: S.draft[field] })) as HTMLInputElement;
  el.addEventListener("input", () => {
    S.draft[field] = el.value;
    refreshPreview(host);
  });
  el.addEventListener("change", () => void persist(host));
  return el;
}

function q(label: string, hint: string | null, control: Child) {
  return h("label", { class: "s-q" }, h("span", { class: "s-label" }, label), hint ? h("small", { class: "muted" }, hint) : null, control);
}

function select(value: string, options: Array<[string, string]>, onChange: (v: string) => void, label: string) {
  const s = h("select", { class: "s-input", "aria-label": label }, options.map(([v, l]) => h("option", { value: v, selected: v === value }, l))) as HTMLSelectElement;
  s.value = value;
  s.addEventListener("change", () => onChange(s.value));
  return s;
}

function stepOne(host: StudioHost) {
  return h(
    "div",
    { class: "s-step" },
    q("¿Cómo se llama tu producto?", "Puedes cambiarlo después.", input("name", "Ej.: Método Clientes en 30 días", host)),
    h(
      "div",
      { class: "s-q" },
      h("span", { class: "s-label" }, "¿Qué recibe tu comprador?"),
      h(
        "div",
        { class: "kind-grid" },
        KINDS.map((k) =>
          h(
            "button",
            {
              class: `kind${S.draft.kind === k.id ? " on" : ""}`,
              "aria-pressed": String(S.draft.kind === k.id),
              onclick: () => {
                S.draft.kind = k.id;
                void persist(host);
                host.rerender();
              },
            },
            h("b", null, k.label),
            h("small", null, k.hint),
          ),
        ),
      ),
    ),
    q("¿Qué es, en una frase?", "Lo que es y cómo se entrega, sin adornos.", input("what", "Ej.: Un curso en video de 6 módulos para vender por Instagram", host, true, 2)),
  );
}

function stepTwo(host: StudioHost) {
  const favs = host.favorites();
  return h(
    "div",
    { class: "s-step" },
    q("¿Para quién es?", "Tu cliente ideal: quién es y en qué momento está.", input("customer", "Ej.: emprendedoras que venden por redes y recién empiezan", host, true, 2)),
    q("¿Qué problema le resuelve?", "Con sus palabras, como lo diría tu cliente.", input("problem", "Ej.: publican todos los días y no consiguen clientes", host, true, 2)),
    q("¿Qué resultado le ayuda a lograr?", "Realista y comprobable: nada de resultados garantizados.", input("promise", "Ej.: conseguir sus primeras ventas con un método simple", host, true, 2)),
    q(
      "Nicho",
      null,
      select(
        S.draft.niche,
        [["", "Elige un nicho"], ...NICHES.map((n): [string, string] => [n.id, n.label])],
        (v) => {
          S.draft.niche = v;
          void persist(host);
          refreshPreview(host);
        },
        "Nicho",
      ),
    ),
    h(
      "div",
      { class: "s-q" },
      h("span", { class: "s-label" }, `Anuncios de referencia (hasta ${MAX_REFS})`),
      h("small", { class: "muted" }, "Elige anuncios de tus favoritos para inspirar los ángulos. No se copian sus textos."),
      favs.length
        ? h(
            "div",
            { class: "refs" },
            favs.slice(0, 40).map((r) => {
              const on = S.draft.refs.includes(r.id);
              return h(
                "button",
                {
                  class: `ref${on ? " on" : ""}`,
                  "aria-pressed": String(on),
                  onclick: () => {
                    S.draft.refs = on ? S.draft.refs.filter((x) => x !== r.id) : [...S.draft.refs, r.id].slice(-MAX_REFS);
                    void persist(host);
                    host.rerender();
                  },
                },
                h("span", { class: "ref-check" }, on ? "✓" : ""),
                h("span", { class: "grow" }, h("b", null, r.pageName), h("small", { class: "muted block" }, truncate(r.title || r.body || "Sin texto", 90))),
                h("small", { class: "muted" }, `${r.days ?? "—"} d · ${r.copies}×`),
              );
            }),
          )
        : h("p", { class: "muted small" }, "Aún no tienes favoritos: guarda anuncios con ♥ para usarlos aquí."),
    ),
  );
}

function stepThree(host: StudioHost) {
  return h(
    "div",
    { class: "s-step" },
    h(
      "div",
      { class: "s-row" },
      q("Precio", null, input("price", "Ej.: 149.900", host)),
      q(
        "Moneda",
        null,
        select(S.draft.currency, CURRENCIES.map((c): [string, string] => [c, c]), (v) => {
          S.draft.currency = v;
          void persist(host);
          refreshPreview(host);
        }, "Moneda"),
      ),
      q(
        "Forma de pago",
        null,
        select(S.draft.payment, PAYMENTS, (v) => {
          S.draft.payment = v;
          void persist(host);
          refreshPreview(host);
        }, "Forma de pago"),
      ),
    ),
    q("Garantía", "Solo la que de verdad vas a cumplir.", input("guarantee", "Ej.: 7 días de devolución sin preguntas", host)),
    q("Bonos", "Uno por línea.", input("bonuses", "Ej.: Plantillas de mensajes para WhatsApp", host, true, 3)),
  );
}

function previewRow(label: string, value: string | null | undefined) {
  return h("div", { class: "p-row" }, h("small", null, label), value && value.trim() ? h("span", null, value) : h("span", { class: "muted" }, "—"));
}

function previewBlock() {
  const d = S.draft;
  const pct = completeness(d);
  const missing = REQUIRED.filter(([k]) => !String(d[k] ?? "").trim()).map(([, l]) => l);
  return h(
    "aside",
    { class: "card pad s-preview", id: "studio-preview" },
    h("div", { class: "eyebrow" }, "La base de tu producto"),
    h("h3", null, d.name.trim() || "Tu producto"),
    h("div", { class: "bar" }, h("i", { style: `width:${pct}%` })),
    h("small", { class: "muted" }, pct === 100 ? "Completo: listo para generar." : `${pct}% · falta: ${missing.join(", ")}`),
    previewRow("Tipo", kindOf(d)?.label),
    previewRow("Qué es", d.what),
    previewRow("Para quién", d.customer),
    previewRow("Problema", d.problem),
    previewRow("Resultado", d.promise),
    previewRow("Nicho", d.niche ? nicheLabel(d.niche) : ""),
    previewRow("Precio", priceText(d)),
    previewRow("Garantía", d.guarantee),
    previewRow("Bonos", lines(d.bonuses).join(" · ")),
    d.refs.length ? previewRow("Referencias", `${d.refs.length} ${d.refs.length === 1 ? "anuncio" : "anuncios"}`) : null,
  );
}

function refreshPreview(host: StudioHost) {
  void host;
  document.getElementById("studio-preview")?.replaceWith(previewBlock());
}

function keyPanel(host: StudioHost) {
  if (S.key) {
    return h(
      "div",
      { class: "key-panel ok" },
      icon("sparkle", 15),
      h("span", null, `Clave de Anthropic guardada en este Chrome (termina en …${S.key.slice(-4)}).`),
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
        "Quitar clave",
      ),
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
    S.keyMessage = "Clave guardada solo en este Chrome.";
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
      "Para generar con IA necesitas tu propia clave de Anthropic: créala en console.anthropic.com → API Keys → Create Key (con saldo en Billing). Se guarda solo en este Chrome y se envía únicamente a Anthropic cuando generas.",
    ),
  );
}

function outputView(d: Draft) {
  const o = d.output!;
  return h(
    "section",
    { class: "stack s-output" },
    h(
      "div",
      { class: "row between wrap" },
      h(
        "div",
        null,
        h("h2", null, "Tu oferta y anuncios"),
        h(
          "small",
          { class: "muted" },
          d.outputSource === "ia" ? "Generado con Claude a partir de tus datos." : "Borrador automático con plantillas: complétalo y ajústalo.",
          " Revisa todo antes de publicar y completa lo que está entre [corchetes].",
        ),
      ),
      copyBtn(outputAsText(o), "Copiar todo"),
    ),
    h(
      "article",
      { class: "card pad offer" },
      h("div", { class: "eyebrow" }, "Oferta"),
      h("h3", null, o.oferta.titulo),
      h("p", { class: "lead-text" }, o.oferta.promesa),
      h("p", { class: "muted" }, `Para: ${o.oferta.para_quien}`),
      h("div", { class: "offer-cols" }, h("div", null, h("b", null, "Incluye"), h("ul", null, o.oferta.incluye.map((x) => h("li", null, x)))), o.oferta.bonos.length ? h("div", null, h("b", null, "Bonos"), h("ul", null, o.oferta.bonos.map((x) => h("li", null, x)))) : null),
      h("div", { class: "chips" }, chip(`Precio: ${o.oferta.precio}`, "chip-price"), chip(`Garantía: ${o.oferta.garantia}`), chip(`Botón: ${o.oferta.cta}`, "chip-accent")),
    ),
    h(
      "div",
      { class: "grid" },
      o.anuncios.map((a, i) =>
        h(
          "article",
          { class: "card pad out-ad" },
          h("div", { class: "eyebrow" }, `Anuncio ${i + 1} · ${a.angulo}`),
          h("p", { class: "strong" }, a.gancho),
          h("p", { class: "pre" }, a.texto),
          h("div", { class: "chips" }, chip(`Botón: ${a.cta}`, "chip-accent")),
          h("p", { class: "muted small" }, h("b", null, "Idea creativa: "), a.idea_creativa),
          copyBtn(`${a.gancho}\n\n${a.texto}`, "Copiar anuncio"),
        ),
      ),
    ),
    h(
      "article",
      { class: "card pad" },
      h("div", { class: "eyebrow" }, "Estructura de la landing"),
      h("ol", { class: "steps" }, o.landing.map((s) => h("li", null, h("b", null, s.seccion), h("span", null, s.contenido)))),
    ),
    h(
      "article",
      { class: "card pad" },
      h("div", { class: "eyebrow" }, "Objeciones y respuestas"),
      h("dl", { class: "objections" }, o.objeciones.map((x) => [h("dt", null, x.objecion), h("dd", null, x.respuesta)])),
    ),
  );
}

export function studioView(host: StudioHost): HTMLElement {
  if (!S.loaded) {
    S.loaded = true;
    void (async () => {
      try {
        S.products = await loadProducts(host);
        if (S.products[0]) S.draft = { ...newDraft(), ...S.products[0] };
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
  const steps: Array<[1 | 2 | 3, string]> = [
    [1, "La base"],
    [2, "La venta"],
    [3, "El negocio"],
  ];
  const goStep = (n: 1 | 2 | 3) => {
    S.step = n;
    void persist(host);
    host.rerender();
  };
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
        h("p", { class: "muted lead" }, "Arma la base de tu producto y conviértela en una oferta, 3 anuncios y la estructura de tu landing, inspirándote en los anuncios que guardaste."),
      ),
      h(
        "div",
        { class: "row wrap" },
        S.products.length
          ? select(
              d.id,
              [...(S.products.some((p) => p.id === d.id) ? [] : [[d.id, d.name || "Producto nuevo"] as [string, string]]), ...S.products.map((p): [string, string] => [p.id, p.name || "Sin nombre"])],
              (id) => {
                const p = S.products.find((x) => x.id === id);
                if (p) S.draft = { ...newDraft(), ...p };
                S.step = 1;
                S.error = "";
                host.rerender();
              },
              "Tus productos",
            )
          : null,
        h(
          "button",
          {
            class: "btn",
            onclick: () => {
              S.draft = newDraft();
              S.step = 1;
              S.error = "";
              host.rerender();
            },
          },
          icon("plus", 14),
          "Nuevo producto",
        ),
      ),
    ),
    h(
      "div",
      { class: "studio-grid" },
      h(
        "section",
        { class: "card pad" },
        h(
          "div",
          { class: "stepper" },
          steps.map(([n, label]) => h("button", { class: `stp${S.step === n ? " on" : ""}${S.step > n ? " done" : ""}`, onclick: () => goStep(n) }, h("span", { class: "stp-n" }, S.step > n ? "✓" : String(n)), h("span", null, label))),
        ),
        S.step === 1 ? stepOne(host) : S.step === 2 ? stepTwo(host) : stepThree(host),
        h(
          "div",
          { class: "row between s-nav" },
          S.step > 1 ? h("button", { class: "btn", onclick: () => goStep((S.step - 1) as 1 | 2) }, "← Atrás") : h("span", null),
          S.step < 3
            ? h("button", { class: "btn btn-primary", onclick: () => goStep((S.step + 1) as 2 | 3) }, "Siguiente →")
            : h("button", { class: "btn btn-primary", onclick: () => document.getElementById("studio-generate")?.scrollIntoView({ behavior: "smooth" }) }, "Listo: generar ↓"),
        ),
      ),
      previewBlock(),
    ),
    h(
      "section",
      { class: "card pad s-gen", id: "studio-generate" },
      h("h2", null, "Genera tu oferta y anuncios"),
      keyPanel(host),
      S.keyMessage ? h("small", { class: "muted" }, S.keyMessage) : null,
      h(
        "div",
        { class: "row wrap" },
        h(
          "button",
          { class: "btn btn-primary btn-lg", disabled: !S.key || S.generating, onclick: () => void generate(host, true), title: S.key ? "" : "Guarda tu clave de Anthropic para usar la IA" },
          S.generating ? h("span", { class: "spinner" }) : icon("sparkle", 16),
          S.generating ? "Generando con Claude…" : "Generar con IA",
        ),
        h("button", { class: "btn", disabled: S.generating, onclick: () => void generate(host, false) }, "Borrador sin IA (plantillas)"),
        d.id && S.products.some((p) => p.id === d.id)
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
              "Eliminar producto",
            )
          : null,
      ),
      completeness(d) < 100 ? h("small", { class: "muted" }, "Puedes generar aunque falten datos: lo que falte aparecerá entre [corchetes] para que lo completes.") : null,
      S.error ? h("p", { class: "warn" }, S.error) : null,
      h("small", { class: "muted" }, "Cifra no inventa testimonios, cifras ni resultados: revisa siempre el texto antes de publicarlo y cumple las políticas publicitarias de Meta."),
    ),
    d.output ? outputView(d) : null,
  );
}
