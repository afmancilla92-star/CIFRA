import { ingestAds } from "./ingest";
import { mapLibraryNode } from "./sources/library-page";
import { mapArchivedAd, type MetaArchivedAd } from "./sources/meta-api";
import type { RawAd } from "./types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Importación de resultados de fuentes autorizadas:
 *  - Respuesta JSON de la Ad Library API ({ data: [...] } o un arreglo de ArchivedAd).
 *  - Exportación de la extensión ({ nodes: [...] }).
 */
export function parseImport(body: unknown, countries: string[]): { ads: RawAd[]; kind: string; ignored: number } {
  let items: unknown[] = [];
  if (Array.isArray(body)) items = body;
  else if (isObj(body) && Array.isArray(body.data)) items = body.data;
  else if (isObj(body) && Array.isArray(body.nodes)) items = body.nodes;
  else if (isObj(body) && Array.isArray(body.ads)) items = body.ads;

  const ads: RawAd[] = [];
  let api = 0;
  let library = 0;
  for (const item of items.slice(0, 5000)) {
    if (!isObj(item)) continue;
    if ("ad_archive_id" in item) {
      const m = mapLibraryNode(item, { countries });
      if (m) {
        ads.push(m);
        library++;
      }
    } else if ("id" in item && ("page_id" in item || "ad_creative_bodies" in item)) {
      const m = mapArchivedAd(item as unknown as MetaArchivedAd, { countries });
      if (m) {
        ads.push(m);
        api++;
      }
    }
  }
  const kind = api && library ? "mixto" : api ? "Ad Library API" : library ? "Biblioteca (extensión)" : "desconocido";
  return { ads, kind, ignored: items.length - ads.length };
}

export async function importJson(body: unknown, countries: string[]) {
  const { ads, kind, ignored } = parseImport(body, countries);
  const result = await ingestAds(ads, { source: "import", queryCountries: countries, context: { kind } });
  return { ...result, kind, ignored };
}
