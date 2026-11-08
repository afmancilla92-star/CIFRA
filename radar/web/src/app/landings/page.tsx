import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { MediaThumb } from "@/components/MediaView";
import { Pagination } from "@/components/Pagination";
import { ScoreBadge } from "@/components/ScoreBadge";
import { fmtDays, fmtNum, qs } from "@/lib/format";
import { LANDING_SORTS, listLandings, type LandingSort } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LandingsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sort = (searchParams.sort && searchParams.sort in LANDING_SORTS ? searchParams.sort : "ads") as LandingSort;
  const minAds = Number(searchParams.minAds) || 2;
  const page = Number(searchParams.page) || 1;
  const res = await listLandings({ q: searchParams.q, minAds, sort, page });
  const base = { q: searchParams.q, minAds: minAds === 2 ? undefined : minAds, sort: sort === "ads" ? undefined : sort };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Landing pages</h1>
        <p className="text-sm text-soft">
          Anuncios agrupados por la página a la que dirigen (sin parámetros de seguimiento). Muchas creatividades hacia el mismo destino suelen señalar la oferta principal del anunciante.
        </p>
      </div>
      <AutoSubmitForm className="card flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[220px] flex-1">
          <span className="label">Dominio, ruta o anunciante</span>
          <input name="q" defaultValue={searchParams.q} className="input" placeholder="tienda.com/oferta" />
        </label>
        <label>
          <span className="label">Anuncios mínimos</span>
          <select name="minAds" defaultValue={String(minAds)} className="input">
            {[1, 2, 3, 5, 10, 25].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Ordenar</span>
          <select name="sort" defaultValue={sort} className="input">
            {Object.entries(LANDING_SORTS).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary" type="submit">
          Filtrar
        </button>
      </AutoSubmitForm>

      <p className="text-sm text-soft">{fmtNum(res.total)} destinos</p>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {res.items.map((l) => (
          <article key={l.key} className="card flex gap-4 overflow-hidden p-3">
            <a href={`/?landing=${encodeURIComponent(l.key)}&status=all`} className="w-28 shrink-0 overflow-hidden rounded-xl">
              <MediaThumb media={l.sample?.media ?? []} libraryUrl={l.sample?.libraryUrl ?? "#"} alt="" />
            </a>
            <div className="min-w-0 flex-1 space-y-1">
              <a href={`/?landing=${encodeURIComponent(l.key)}&status=all`} className="block break-all font-semibold hover:underline">
                {l.key}
              </a>
              <p className="text-xs text-soft">{l.advertiserNames.join(", ")}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="chip">{l.ads} anuncios</span>
                <span className="chip">{l.active} activos</span>
                <span className="chip">{l.advertisers} {l.advertisers === 1 ? "anunciante" : "anunciantes"}</span>
                <span className="chip">máx. {fmtDays(l.maxDays)}</span>
                <ScoreBadge score={l.bestScore} />
              </div>
              {l.url ? (
                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate pt-1 text-xs text-accent hover:underline">
                  Abrir landing ↗
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {!res.items.length ? <div className="card p-8 text-center text-soft">Aún no hay destinos con {minAds} o más anuncios.</div> : null}
      <Pagination page={res.page} perPage={res.perPage} total={res.total} href={(p) => `/landings${qs(base, { page: p })}`} />
    </div>
  );
}
