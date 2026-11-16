import type { ExploreFilters, SortKey } from "./queries";
import { SORTS } from "./queries";
import type { SourceKind } from "./types";

type SP = Record<string, string | string[] | undefined>;

const str = (sp: SP, k: string) => {
  const v = sp[k];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim().slice(0, 200) : undefined;
};
const int = (sp: SP, k: string) => {
  const s = str(sp, k);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : undefined;
};

export function parseExploreFilters(sp: SP): ExploreFilters {
  const status = str(sp, "status");
  const sort = str(sp, "sort");
  const source = str(sp, "source");
  return {
    q: str(sp, "q"),
    niche: str(sp, "niche"),
    country: str(sp, "country"),
    language: str(sp, "language"),
    platform: str(sp, "platform"),
    format: str(sp, "format"),
    offer: str(sp, "offer"),
    status: status === "all" || status === "inactive" ? status : "active",
    minDays: int(sp, "minDays"),
    maxDays: int(sp, "maxDays"),
    startedAfter: /^\d{4}-\d{2}-\d{2}$/.test(str(sp, "startedAfter") ?? "") ? str(sp, "startedAfter") : undefined,
    minScore: int(sp, "minScore"),
    minVariants: int(sp, "minVariants"),
    minAdvertiserAds: int(sp, "minAdvertiserAds"),
    hasLanding: str(sp, "hasLanding") === "1",
    domain: str(sp, "domain"),
    landing: str(sp, "landing"),
    pageId: str(sp, "pageId"),
    source: source && ["meta_api", "extension", "import", "manual"].includes(source) ? (source as SourceKind) : undefined,
    includeManual: str(sp, "manual") === "1",
    sort: sort && sort in SORTS ? (sort as SortKey) : "longest",
    page: int(sp, "page") ?? 1,
  };
}

/** Parámetros actuales para reconstruir enlaces (paginación, etc.). */
export function filtersToParams(f: ExploreFilters): Record<string, string | number | boolean | undefined> {
  return {
    q: f.q,
    niche: f.niche,
    country: f.country,
    language: f.language,
    platform: f.platform,
    format: f.format,
    offer: f.offer,
    status: f.status === "active" ? undefined : f.status,
    minDays: f.minDays,
    maxDays: f.maxDays,
    startedAfter: f.startedAfter,
    minScore: f.minScore,
    minVariants: f.minVariants,
    minAdvertiserAds: f.minAdvertiserAds,
    hasLanding: f.hasLanding || undefined,
    domain: f.domain,
    landing: f.landing,
    pageId: f.pageId,
    source: f.source,
    manual: f.includeManual || undefined,
    sort: f.sort === "longest" ? undefined : f.sort,
  };
}
