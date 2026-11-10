import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { AdCard, Avatar } from "@/components/AdCard";
import { Pagination } from "@/components/Pagination";
import { ScoreBadge } from "@/components/ScoreBadge";
import { fmtDate, fmtDays, fmtNum, libraryPageUrl } from "@/lib/format";
import { nicheLabel } from "@/lib/niche/catalog";
import { advertiserLandings, getAdvertiser, searchAds, SORTS, type SortKey } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdvertiserPage({ params, searchParams }: { params: { pageId: string }; searchParams: Record<string, string | undefined> }) {
  const pageId = decodeURIComponent(params.pageId);
  const adv = await getAdvertiser(pageId);
  if (!adv) notFound();
  const sort = (searchParams.sort && searchParams.sort in SORTS ? searchParams.sort : "longest") as SortKey;
  const status = searchParams.status === "all" ? "all" : "active";
  const page = Number(searchParams.page) || 1;
  const [ads, landings] = await Promise.all([
    searchAds({ pageId, status, sort, page, includeManual: true }),
    advertiserLandings(pageId),
  ]);
  const library = libraryPageUrl(pageId);
  const base = `/anunciantes/${encodeURIComponent(pageId)}`;

  return (
    <div className="space-y-6">
      <a href="/anunciantes" className="text-sm text-soft hover:text-text">
        ← Anunciantes
      </a>
      <header className="card flex flex-wrap items-center gap-4 p-5">
        <Avatar name={adv.name} url={adv.avatarUrl} size={56} />
        <div className="min-w-[220px] flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{adv.name}</h1>
          <p className="text-sm text-soft">
            {nicheLabel(adv.mainNiche)}
            {adv.categories.length ? ` · ${adv.categories.join(", ")}` : ""}
            {adv.likes ? ` · ${fmtNum(adv.likes)} seguidores` : ""} · visto desde {fmtDate(adv.firstSeenAt)}
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-2xl font-bold tabular-nums">{fmtNum(adv.activeAds)}</p>
            <p className="text-xs text-soft">activos de {fmtNum(adv.totalAds)}</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{fmtDays(adv.oldestActiveDays)}</p>
            <p className="text-xs text-soft">anuncio activo más antiguo</p>
          </div>
          <div className="flex flex-col items-end">
            <ScoreBadge score={adv.avgScore} size="lg" />
            <p className="mt-1 text-xs text-soft">puntuación media</p>
          </div>
        </div>
        {library ? (
          <a href={library} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            Ver en la Biblioteca <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </header>

      {landings.length ? (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Landing pages de este anunciante</h2>
          <ul className="divide-y divide-border text-sm">
            {landings.map((l) => (
              <li key={l.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <a href={`/?landing=${encodeURIComponent(l.key)}&status=all`} className="break-all font-medium text-accent hover:underline">
                  {l.key}
                </a>
                <span className="text-soft">
                  {l.ads} anuncios · {l.active} activos
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Anuncios ({fmtNum(ads.total)})</h2>
        <div className="flex gap-2 text-sm">
          <a className={status === "active" ? "btn-primary" : "btn-ghost"} href={`${base}?sort=${sort}`}>
            Activos
          </a>
          <a className={status === "all" ? "btn-primary" : "btn-ghost"} href={`${base}?status=all&sort=${sort}`}>
            Todos
          </a>
          {(["longest", "score", "newest"] as const).map((k) => (
            <a key={k} className={sort === k ? "btn-primary" : "btn-ghost"} href={`${base}?sort=${k}${status === "all" ? "&status=all" : ""}`}>
              {SORTS[k].label}
            </a>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {ads.items.map((a) => (
          <AdCard key={a.id} ad={a} />
        ))}
      </div>
      <Pagination page={ads.page} perPage={ads.perPage} total={ads.total} href={(p) => `${base}?page=${p}&sort=${sort}${status === "all" ? "&status=all" : ""}`} />
    </div>
  );
}
