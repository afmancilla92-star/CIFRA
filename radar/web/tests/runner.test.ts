import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NICHES } from "@/lib/niche/catalog";
import { nicheSeeds } from "@/lib/niche/seeds";
import { MAX_PER_HOUR } from "@/ext/discovery";
import {
  buildPlan,
  DEFAULT_SETTINGS,
  getRun,
  handleJobDone,
  LAST_FULL_KEY,
  nextAutoAt,
  normalizeSettings,
  planSize,
  SETTINGS_KEY,
  staleAdvertisers,
  startMediaRun,
  startRun,
  stopRun,
  tick,
  type RunItem,
} from "@/ext/runner";

// Chrome simulado: almacenamiento en memoria, pestañas numeradas y alarmas sin efecto.
function fakeChrome() {
  const area = () => {
    const data = new Map<string, unknown>();
    return {
      data,
      async get(keys: string | string[]) {
        const out: Record<string, unknown> = {};
        for (const k of Array.isArray(keys) ? keys : [keys]) if (data.has(k)) out[k] = structuredClone(data.get(k));
        return out;
      },
      async set(obj: Record<string, unknown>) {
        for (const [k, v] of Object.entries(obj)) data.set(k, structuredClone(v));
      },
      async remove(key: string) {
        data.delete(key);
      },
    };
  };
  const tabs: Array<{ id: number; url: string; closed: boolean }> = [];
  return {
    storage: { local: area(), session: area() },
    alarms: { get: async () => null, create: async () => {} },
    tabs: {
      list: tabs,
      async create({ url }: { url: string }) {
        const tab = { id: tabs.length + 1, url, closed: false };
        tabs.push(tab);
        return tab;
      },
      async remove(id: number) {
        const t = tabs.find((x) => x.id === id);
        if (t) t.closed = true;
      },
    },
  };
}

const deps = { follows: async () => [], touchFollow: vi.fn(async () => {}) };
const items: RunItem[] = [
  { label: "«a»", url: "https://www.facebook.com/ads/library/?q=a", q: "a" },
  { label: "«b»", url: "https://www.facebook.com/ads/library/?q=b", q: "b" },
];
let chrome: ReturnType<typeof fakeChrome>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
  chrome = fakeChrome();
  (globalThis as unknown as { chrome: unknown }).chrome = chrome;
});
afterEach(async () => {
  await stopRun(deps).catch(() => {});
  vi.useRealTimers();
});

describe("plan de la pasada", () => {
  it("normaliza la configuración", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    const s = normalizeSettings({ depth: 9, niches: ["moda", "inventado"], extra: [" faja ", "faja", ""], country: "colombia", auto: false });
    expect(s).toMatchObject({ depth: 3, niches: ["moda"], extra: ["faja"], country: "ALL", auto: false });
    expect(normalizeSettings({ niches: NICHES.map((n) => n.id) }).niches).toBeNull();
  });

  it("cada nicho tiene al menos tres palabras de búsqueda", () => {
    for (const n of NICHES) expect(nicheSeeds(n.id).length, n.id).toBeGreaterThanOrEqual(3);
  });

  it("empieza por los seguidos y va por vueltas", () => {
    const s = normalizeSettings({ depth: 2, niches: ["moda", "mascotas"], extra: ["faja"] });
    const plan = buildPlan(s, [{ pageId: "123", name: "Marca" }], new Date("2026-11-16T12:00:00Z"));
    expect(plan[0]).toMatchObject({ label: "Marca", follow: "123", q: "" });
    expect(plan[0]!.url).toContain("view_all_page_id=123");
    // 1 seguido + (2 nichos + 1 palabra propia) × 2 vueltas
    expect(plan).toHaveLength(7);
    expect(plan.slice(1, 4).every((i) => i.rank === true)).toBe(true);
    expect(plan.slice(4).every((i) => i.rank === false)).toBe(true);
    expect(plan.slice(4).every((i) => /media_type=(video|image)|start_date/.test(i.url))).toBe(true);
    expect(planSize(s, 1)).toBe(7);
  });

  it("cambia la palabra de cada nicho de un día al siguiente", () => {
    const s = normalizeSettings({ depth: 1, niches: ["moda"] });
    const today = buildPlan(s, [], new Date("2026-11-16T12:00:00Z"))[0]!.q;
    const tomorrow = buildPlan(s, [], new Date("2026-11-17T12:00:00Z"))[0]!.q;
    expect(today).not.toBe(tomorrow);
    expect(nicheSeeds("moda")).toContain(today);
    expect(nicheSeeds("moda")).toContain(tomorrow);
  });

  it("con todos los nichos y profundidad 2 son 90 búsquedas", () => {
    expect(buildPlan(normalizeSettings({ depth: 2 }), []).length).toBe(NICHES.length * 2);
  });
});

describe("imágenes vencidas", () => {
  const ad = (pageId: string, expires: string | null, isActive = true) => ({ pageId, isActive, mediaExpiresAt: expires });
  const past = "2026-11-10T00:00:00.000Z";
  const future = "2026-11-30T00:00:00.000Z";

  it("ordena los anunciantes por anuncios activos con la imagen vencida", () => {
    const list = staleAdvertisers(
      [ad("1", past), ad("1", past), ad("1", future), ad("2", past), ad("3", past, false), ad("4", null), ad("manual-x", past)],
      [{ pageId: "1", name: "Uno" }, { pageId: "2", name: "Dos" }],
      new Date("2026-11-16T12:00:00Z"),
    );
    expect(list).toEqual([
      { pageId: "1", name: "Uno", count: 2 },
      { pageId: "2", name: "Dos", count: 1 },
    ]);
  });

  it("la pasada diaria renueva primero las imágenes de quienes más tienen vencidas (sin repetir seguidos)", () => {
    const s = normalizeSettings({ depth: 1, niches: ["moda"] });
    const stale = Array.from({ length: 12 }, (_, i) => ({ pageId: String(100 + i), name: `Marca ${i}` }));
    const plan = buildPlan(s, [{ pageId: "100", name: "Marca 0" }], new Date("2026-11-16T12:00:00Z"), stale);
    expect(plan[0]).toMatchObject({ follow: "100" });
    const refresh = plan.filter((i) => i.label.endsWith("· imágenes"));
    expect(refresh).toHaveLength(8);
    expect(refresh[0]!.url).toContain("view_all_page_id=101");
    expect(plan.at(-1)!.q).toBeTruthy(); // los nichos van después
    expect(planSize(s, 1, 12)).toBe(plan.length);
  });

  it("«Recargar imágenes» hace una búsqueda por anunciante, hasta 40", async () => {
    const stale = Array.from({ length: 50 }, (_, i) => ({ pageId: String(200 + i), name: `M${i}` }));
    const run = await startMediaRun({ ...deps, stale: async () => stale });
    expect(run).toMatchObject({ running: true, full: false, total: 40 });
    expect(run!.items.every((i) => i.url.includes("view_all_page_id=") && i.q === "")).toBe(true);
    expect(await startMediaRun({ ...deps, stale: async () => [] }).then((r) => r?.running)).toBe(true); // ya hay una en curso
  });
});

describe("pasada en segundo plano", () => {
  it("lanza las búsquedas de una en una y termina con el resumen", async () => {
    const run = await startRun("manual", items, true, deps);
    expect(run).toMatchObject({ running: true, total: 2, index: 0 });
    expect(chrome.storage.local.data.get(LAST_FULL_KEY)).toBe(Date.now());
    await tick(deps);
    expect(chrome.tabs.list).toHaveLength(1);
    const first = (await getRun())!;
    expect(first.job).toMatchObject({ tabId: 1 });
    // Mientras la pestaña trabaja no se abre otra.
    await tick(deps);
    expect(chrome.tabs.list).toHaveLength(1);

    expect(await handleJobDone({ jobId: "otro" }, deps)).toBe(false);
    expect(await handleJobDone({ jobId: first.job!.id, created: 12, updated: 3, detected: 15 }, deps)).toBe(true);
    expect(chrome.tabs.list[0]!.closed).toBe(true);
    expect(await getRun()).toMatchObject({ index: 1, done: 1, created: 12, job: null, running: true });

    // Pausa entre búsquedas: la siguiente no sale de inmediato.
    await tick(deps);
    expect(chrome.tabs.list).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(9000);
    expect(chrome.tabs.list).toHaveLength(2);

    const second = (await getRun())!;
    await handleJobDone({ jobId: second.job!.id, created: 5, updated: 0, detected: 5 }, deps);
    const done = (await getRun())!;
    expect(done.running).toBe(false);
    expect(done.message).toBe("Listo: 17 anuncios nuevos y 3 actualizados en 2 búsquedas.");
    expect(chrome.tabs.list.every((t) => t.closed)).toBe(true);
  });

  it("si una pestaña no responde, sigue con la siguiente", async () => {
    await startRun("manual", items, false, deps);
    await tick(deps);
    await vi.advanceTimersByTimeAsync(101_000);
    await tick(deps);
    expect(chrome.tabs.list[0]!.closed).toBe(true);
    expect((await getRun())!.index).toBe(1);
    // Tras la pausa entre búsquedas sale la siguiente.
    await vi.advanceTimersByTimeAsync(9000);
    expect(chrome.tabs.list).toHaveLength(2);
  });

  it("ante un bloqueo se pausa una hora, reintenta una vez y luego se detiene", async () => {
    await startRun("manual", items, false, deps);
    await tick(deps);
    let run = (await getRun())!;
    await handleJobDone({ jobId: run.job!.id, blocked: "rate_limit" }, deps);
    run = (await getRun())!;
    expect(run).toMatchObject({ running: true, index: 0, blocks: 1, waitingReason: "blocked", limited: true });
    expect(run.waitingUntil).toBe(Date.now() + 3_600_000);
    await tick(deps);
    expect(chrome.tabs.list).toHaveLength(1); // sigue en pausa

    await vi.advanceTimersByTimeAsync(3_600_000 + 1000);
    await tick(deps);
    expect(chrome.tabs.list).toHaveLength(2); // reintento de la misma búsqueda
    run = (await getRun())!;
    expect(run.index).toBe(0);
    // Tras un límite, sin carga profunda.
    expect((chrome.storage.session.data.get("job:2") as { deep: boolean }).deep).toBe(false);
    await handleJobDone({ jobId: run.job!.id, blocked: "rate_limit" }, deps);
    run = (await getRun())!;
    expect(run.running).toBe(false);
    expect(run.message).toContain("Meta limitó");
  });

  it("si la Biblioteca pide iniciar sesión, se detiene de inmediato", async () => {
    await startRun("manual", items, false, deps);
    await tick(deps);
    const run = (await getRun())!;
    await handleJobDone({ jobId: run.job!.id, blocked: "login" }, deps);
    expect(await getRun()).toMatchObject({ running: false });
    expect((await getRun())!.message).toContain("iniciar sesión");
  });

  it("respeta el límite por hora y espera", async () => {
    await chrome.storage.local.set({ searchLog: Array.from({ length: MAX_PER_HOUR }, (_, i) => Date.now() - i * 1000) });
    await startRun("manual", items, false, deps);
    await tick(deps);
    expect(chrome.tabs.list).toHaveLength(0);
    expect(await getRun()).toMatchObject({ waitingReason: "limit" });
    await vi.advanceTimersByTimeAsync(3_600_000 + 10_000);
    await tick(deps);
    expect(chrome.tabs.list).toHaveLength(1);
  });

  it("la automática sale 24 horas después de la última pasada completa", async () => {
    await chrome.storage.local.set({ [SETTINGS_KEY]: normalizeSettings({ depth: 1, niches: ["moda"] }) });
    expect(await nextAutoAt()).toBeNull(); // nunca se llenó el radar: no arranca sola
    await tick(deps);
    expect(await getRun()).toBeNull();

    await chrome.storage.local.set({ [LAST_FULL_KEY]: Date.now() - 23 * 3_600_000 });
    await tick(deps);
    expect(await getRun()).toBeNull();

    await chrome.storage.local.set({ [LAST_FULL_KEY]: Date.now() - 25 * 3_600_000 });
    await tick(deps);
    await vi.advanceTimersByTimeAsync(500);
    expect(await getRun()).toMatchObject({ kind: "auto", running: true, full: true, total: 1 });

    await stopRun(deps);
    await chrome.storage.local.set({ [SETTINGS_KEY]: normalizeSettings({ auto: false }), [LAST_FULL_KEY]: Date.now() - 48 * 3_600_000 });
    expect(await nextAutoAt()).toBeNull(); // apagada por el usuario
  });
});
