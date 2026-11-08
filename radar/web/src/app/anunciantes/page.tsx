import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { Avatar } from "@/components/AdCard";
import { Pagination } from "@/components/Pagination";
import { ScoreBadge } from "@/components/ScoreBadge";
import { fmtDays, fmtNum, qs } from "@/lib/format";
import { NICHES, nicheLabel } from "@/lib/niche/catalog";
import { ADVERTISER_SORTS, listAdvertisers, type AdvertiserSort } from "@/lib/queries";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

export default async function AdvertisersPage({ searchParams }: { searchParams: SP }) {
  const sort = (searchParams.sort && searchParams.sort in ADVERTISER_SORTS ? searchParams.sort : "active") as AdvertiserSort;
  const minActive = Number(searchParams.minActive) || undefined;
  const page = Number(searchParams.page) || 1;
  const filters = { q: searchParams.q, niche: searchParams.niche, minActive, sort, page };
  const res = await listAdvertisers(filters);
  const base = { q: filters.q, niche: filters.niche, minActive, sort: sort === "active" ? undefined : sort };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Anunciantes</h1>
        <p className="text-sm text-soft">Páginas con anuncios registrados, ordenadas por cuántos mantienen activos al mismo tiempo.</p>
      </div>

      <AutoSubmitForm className="card flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[220px] flex-1">
          <span className="label">Buscar anunciante</span>
          <input name="q" defaultValue={filters.q} className="input" placeholder="Nombre de la página" />
        </label>
        <label>
          <span className="label">Nicho principal</span>
          <select name="niche" defaultValue={filters.niche ?? ""} className="input">
            <option value="">Todos</option>
            {NICHES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Anuncios activos</span>
          <select name="minActive" defaultValue={minActive ? String(minActive) : ""} className="input">
            <option value="">Cualquiera</option>
            {[2, 5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}+ activos
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Ordenar</span>
          <select name="sort" defaultValue={sort} className="input">
            {Object.entries(ADVERTISER_SORTS).map(([k, s]) => (
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

      <p className="text-sm text-soft">{fmtNum(res.total)} anunciantes</p>

      <div className="card divide-y divide-border overflow-hidden">
        {res.items.map((a) => (
          <a key={a.pageId} href={`/anunciantes/${encodeURIComponent(a.pageId)}`} className="flex flex-wrap items-center gap-4 p-4 hover:bg-surface-2">
            <Avatar name={a.name} url={a.avatarUrl} size={40} />
            <div className="min-w-[200px] flex-1">
              <p className="font-semibold">{a.name}</p>
              <p className="text-xs text-soft">
                {nicheLabel(a.mainNiche)}
                {a.topDomains.length ? ` · ${a.topDomains.join(", ")}` : ""}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-6 text-right text-sm">
              <div>
                <p className="text-lg font-bold tabular-nums">{fmtNum(a.activeAds)}</p>
                <p className="text-[11px] text-soft">activos</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{fmtNum(a.landingCount)}</p>
                <p className="text-[11px] text-soft">{a.landingCount === 1 ? "landing" : "landings"}</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{fmtDays(a.oldestActiveDays)}</p>
                <p className="text-[11px] text-soft">anuncio más antiguo</p>
              </div>
              <div className="flex flex-col items-end justify-center">
                <ScoreBadge score={a.avgScore} />
                <p className="mt-1 text-[11px] text-soft">media</p>
              </div>
            </div>
          </a>
        ))}
        {!res.items.length ? <p className="p-6 text-center text-soft">No hay anunciantes con estos filtros.</p> : null}
      </div>
      <Pagination page={res.page} perPage={res.perPage} total={res.total} href={(p) => `/anunciantes${qs(base, { page: p })}`} />
    </div>
  );
}
