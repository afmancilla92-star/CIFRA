const DAY = 86_400_000;

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Acepta unix (s o ms), "YYYY-MM-DD", ISO completo. Devuelve YYYY-MM-DD o null. */
export function parseDateValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const ms = value < 1e12 ? value * 1000 : value;
    return toIsoDate(new Date(ms));
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (/^\d{9,13}$/.test(s)) return parseDateValue(Number(s));
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return toIsoDate(d);
  }
  return null;
}

const MONTHS: Record<string, number> = {
  // español
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5,
  jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, septiembre: 9, set: 9, setiembre: 9,
  oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12,
  // portugués
  fev: 2, fevereiro: 2, marco: 3, mai: 5, maio: 5, junho: 6, julho: 7, setembro: 9, out: 10, outubro: 10,
  novembro: 11, dez: 12, dezembro: 12, janeiro: 1, jan: 1,
  // inglés
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, aug: 8, august: 8,
  september: 9, october: 10, november: 11, dec: 12, december: 12,
};

/**
 * Extrae la fecha de textos de la Biblioteca de Anuncios, p. ej.:
 * "Circulando desde el 3 nov 2026", "Started running on Nov 3, 2026",
 * "Veiculação iniciada em 3 de nov de 2026".
 */
export function parseLibraryDateText(text: string): string | null {
  const t = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\./g, " ");
  // 3 nov 2026 / 3 de noviembre de 2026
  let m = t.match(/(\d{1,2})\s+(?:de\s+)?([a-z]{3,10})\s+(?:de\s+)?(\d{4})/);
  if (m) {
    const month = MONTHS[m[2] as string];
    if (month) return iso(Number(m[3]), month, Number(m[1]));
  }
  // nov 3, 2026
  m = t.match(/([a-z]{3,10})\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const month = MONTHS[m[1] as string];
    if (month) return iso(Number(m[3]), month, Number(m[2]));
  }
  // 03/11/2026 (día/mes/año)
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return iso(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}

function iso(y: number, mo: number, d: number): string | null {
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Días en circulación: desde el inicio hasta hoy (si sigue activo) o hasta
 * la fecha de fin / última vez visto (si ya no circula).
 */
export function daysActive(
  startDate: string | null,
  opts: { isActive: boolean; stopDate?: string | null; lastSeenAt?: string | null; now?: Date },
): number | null {
  if (!startDate) return null;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start)) return null;
  const now = opts.now ?? new Date();
  let end = now.getTime();
  if (!opts.isActive) {
    const stop = opts.stopDate ? Date.parse(`${opts.stopDate}T00:00:00Z`) : NaN;
    const seen = opts.lastSeenAt ? Date.parse(opts.lastSeenAt) : NaN;
    if (!Number.isNaN(stop)) end = stop;
    else if (!Number.isNaN(seen)) end = seen;
  }
  return Math.max(0, Math.floor((end - start) / DAY));
}

export function isoWeekKey(date: string): string | null {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function daysAgo(n: number, now = new Date()): string {
  return toIsoDate(new Date(now.getTime() - n * DAY));
}
