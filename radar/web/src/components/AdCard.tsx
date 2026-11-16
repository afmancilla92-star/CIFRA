import { countryName } from "@/lib/sources/countries";
import { fmtDate, fmtDays, FORMAT_LABELS, PLATFORM_LABELS } from "@/lib/format";
import { nicheLabel } from "@/lib/niche/catalog";
import { truncate } from "@/lib/text";
import type { AdView } from "@/lib/types";
import { FavoriteButton } from "./FavoriteButton";
import { MediaThumb } from "./MediaView";
import { ScoreBadge } from "./ScoreBadge";

export function Avatar({ name, url, size = 32 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" className="shrink-0 rounded-full border border-border object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function AdCard({ ad }: { ad: AdView }) {
  return (
    <article className="card flex flex-col overflow-hidden shadow-soft">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Avatar name={ad.pageName} url={ad.advertiserAvatar} />
        <div className="min-w-0 flex-1">
          <a href={`/anunciantes/${encodeURIComponent(ad.pageId)}`} className="block truncate text-sm font-semibold hover:underline">
            {ad.pageName}
          </a>
          <p className="text-[11px] text-soft">
            {ad.advertiserActiveAds} {ad.advertiserActiveAds === 1 ? "anuncio activo" : "anuncios activos"}
          </p>
        </div>
        <FavoriteButton adId={ad.id} initial={ad.isFavorite} compact />
      </div>

      <a href={`/anuncio/${encodeURIComponent(ad.id)}`} className="block">
        <MediaThumb media={ad.media} libraryUrl={ad.libraryUrl} alt={`Anuncio de ${ad.pageName}`} />
      </a>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-lg font-bold leading-none tabular-nums">{fmtDays(ad.daysActive)}</p>
            <p className="mt-0.5 text-[11px] text-soft">
              {ad.isActive ? "activo" : "circuló"} · desde {fmtDate(ad.startDate)}
            </p>
          </div>
          <ScoreBadge score={ad.score} />
        </div>

        {ad.title ? <p className="text-sm font-semibold leading-snug">{truncate(ad.title, 90)}</p> : null}
        <p className="line-clamp-3 whitespace-pre-line text-sm text-soft">{ad.body ? truncate(ad.body, 260) : "Sin texto disponible."}</p>

        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {ad.niche ? <span className="chip border-accent/30 bg-accent-soft text-accent">{nicheLabel(ad.niche)}</span> : null}
          <span className="chip">{FORMAT_LABELS[ad.format] ?? ad.format}</span>
          {(ad.collationCount ?? 1) > 1 ? <span className="chip">{ad.collationCount} variantes</span> : null}
          {ad.platforms.map((p) => (
            <span key={p} className="chip" title={PLATFORM_LABELS[p]?.label}>
              {PLATFORM_LABELS[p]?.short ?? p}
            </span>
          ))}
          {ad.countries.slice(0, 3).map((c) => (
            <span key={c} className="chip" title={countryName(c)}>
              {c}
            </span>
          ))}
          {ad.isManual ? <span className="chip border-amber/40 text-amber">Carga manual</span> : null}
        </div>

        {ad.landingDomain ? (
          <a href={`/?landing=${encodeURIComponent(ad.landingKey ?? "")}&status=all`} className="truncate text-xs text-accent hover:underline" title={ad.linkUrl ?? ad.landingDomain}>
            → {ad.landingKey}
          </a>
        ) : (
          <span className="text-xs text-soft">Sin landing identificada</span>
        )}
      </div>
    </article>
  );
}
