import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { AdCard, Avatar } from "@/components/AdCard";
import { FavoriteButton } from "@/components/FavoriteButton";
import { MediaGallery } from "@/components/MediaView";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { FORMAT_LABELS, PLATFORM_LABELS, SOURCE_LABELS, fmtDate, fmtDays, fmtNum, libraryPageUrl, timeAgo } from "@/lib/format";
import { LANGUAGE_NAMES } from "@/lib/lang";
import { nicheLabel } from "@/lib/niche/catalog";
import { getAd, relatedAds } from "@/lib/queries";
import { countryName } from "@/lib/sources/countries";
import type { AdView } from "@/lib/types";

export const dynamic = "force-dynamic";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-soft">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function Related({ title, ads, more }: { title: string; ads: AdView[]; more?: string }) {
  if (!ads.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {more ? (
          <a href={more} className="text-sm text-accent hover:underline">
            Ver todos
          </a>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ads.slice(0, 8).map((a) => (
          <AdCard key={a.id} ad={a} />
        ))}
      </div>
    </section>
  );
}

export default async function AdPage({ params }: { params: { id: string } }) {
  const ad = await getAd(decodeURIComponent(params.id));
  if (!ad) notFound();
  const related = await relatedAds(ad);
  const mediaExpired = ad.mediaExpiresAt ? new Date(ad.mediaExpiresAt).getTime() < Date.now() : false;
  const advertiserLibrary = libraryPageUrl(ad.pageId);

  return (
    <div className="space-y-8">
      <a href="/" className="text-sm text-soft hover:text-text">
        ← Volver a explorar
      </a>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <header className="flex flex-wrap items-center gap-3">
            <Avatar name={ad.pageName} url={ad.advertiserAvatar} size={44} />
            <div className="min-w-0 flex-1">
              <a href={`/anunciantes/${encodeURIComponent(ad.pageId)}`} className="text-xl font-bold hover:underline">
                {ad.pageName}
              </a>
              <p className="text-sm text-soft">
                {ad.advertiserActiveAds} anuncios activos · ID de biblioteca <span className="font-mono">{ad.id}</span>
              </p>
            </div>
            <FavoriteButton adId={ad.id} initial={ad.isFavorite} />
            <a href={ad.libraryUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              Ver en la Biblioteca <ExternalLink className="h-4 w-4" />
            </a>
          </header>

          {ad.isManual ? (
            <p className="rounded-lg bg-amber-soft p-3 text-sm text-amber">Este anuncio se cargó manualmente (herramienta de pruebas/mantenimiento).</p>
          ) : null}
          {ad.partial ? (
            <p className="rounded-lg bg-amber-soft p-3 text-sm text-amber">
              Datos parciales leídos desde la tarjeta visible. Ábrelo en la Biblioteca con la extensión para completarlo.
            </p>
          ) : null}
          {mediaExpired ? (
            <p className="rounded-lg bg-surface-2 p-3 text-sm text-soft">
              Los enlaces firmados de la creatividad expiraron ({fmtDate(ad.mediaExpiresAt)}). No se guardan copias: vuelve a capturarlo desde la Biblioteca para refrescarlos.
            </p>
          ) : null}

          <MediaGallery media={ad.media} libraryUrl={ad.libraryUrl} />

          <section className="card space-y-3 p-5">
            {ad.title ? <h1 className="text-lg font-semibold">{ad.title}</h1> : null}
            <p className="whitespace-pre-line text-[15px] leading-relaxed">{ad.body ?? "La fuente no entregó texto para este anuncio."}</p>
            {ad.linkDescription ? <p className="text-sm text-soft">{ad.linkDescription}</p> : null}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {ad.ctaText ? <span className="chip text-text">Botón: {ad.ctaText}</span> : null}
              {ad.offers.map((o) => (
                <a key={o} href={`/?offer=${encodeURIComponent(o)}`} className="chip border-amber/40 text-amber">
                  {o}
                </a>
              ))}
            </div>
            {ad.landingDomain ? (
              <div className="rounded-lg bg-surface-2 p-3 text-sm">
                <p className="text-soft">Destino</p>
                {ad.linkUrl ? (
                  <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-medium text-accent hover:underline">
                    {ad.linkUrl}
                  </a>
                ) : (
                  <p className="font-medium">{ad.landingDomain} <span className="text-soft">(dominio visible; la URL completa llega con la extensión)</span></p>
                )}
                <a href={`/?landing=${encodeURIComponent(ad.landingKey ?? "")}&status=all`} className="mt-1 block text-xs text-accent hover:underline">
                  Ver todos los anuncios que llevan a {ad.landingKey}
                </a>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-5">
          <ScoreBreakdown score={ad.score} signals={ad.scoreBreakdown} />
          <section className="card p-5">
            <h2 className="mb-2 text-sm font-semibold">Datos del anuncio</h2>
            <dl>
              <Fact label="Estado">{ad.isActive ? <span className="text-good">Activo</span> : "Inactivo"}</Fact>
              <Fact label="Empezó a circular">{fmtDate(ad.startDate)}</Fact>
              {!ad.isActive && ad.stopDate ? <Fact label="Dejó de circular">{fmtDate(ad.stopDate)}</Fact> : null}
              <Fact label="Días activo">{fmtDays(ad.daysActive)}</Fact>
              <Fact label="Plataformas">{ad.platforms.length ? ad.platforms.map((p) => PLATFORM_LABELS[p]?.label ?? p).join(", ") : "—"}</Fact>
              <Fact label="Países">{ad.countries.length ? ad.countries.map(countryName).join(", ") : "—"}</Fact>
              <Fact label="Idioma">{ad.language ? (LANGUAGE_NAMES[ad.language] ?? ad.language.toUpperCase()) : "—"}</Fact>
              <Fact label="Formato">{FORMAT_LABELS[ad.format] ?? ad.format}</Fact>
              <Fact label="Variantes">{ad.collationCount ? `${ad.collationCount} versiones` : "—"}</Fact>
              {ad.euTotalReach ? <Fact label="Alcance en la UE">{fmtNum(ad.euTotalReach)}</Fact> : null}
              <Fact label="Nicho">
                {nicheLabel(ad.niche)}
                {ad.nicheSource ? (
                  <span className="block text-xs font-normal text-soft">
                    {ad.nicheSource === "ai" ? "IA" : ad.nicheSource === "rules" ? "reglas" : ad.nicheSource}
                    {ad.nicheConfidence !== null ? ` · confianza ${Math.round(ad.nicheConfidence * 100)}%` : ""}
                  </span>
                ) : null}
              </Fact>
              {ad.nicheTerms.length ? <Fact label="Señales del nicho">{ad.nicheTerms.slice(0, 5).join(", ")}</Fact> : null}
              <Fact label="Fuentes">{ad.sources.map((s) => SOURCE_LABELS[s] ?? s).join(", ")}</Fact>
              <Fact label="Primera vez visto">{fmtDate(ad.firstSeenAt)}</Fact>
              <Fact label="Última verificación">{timeAgo(ad.lastSeenAt)}</Fact>
            </dl>
            {advertiserLibrary ? (
              <a href={advertiserLibrary} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-3 w-full">
                Todos los anuncios del anunciante en Meta <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </section>
        </aside>
      </div>

      <Related title="Variantes con el mismo mensaje" ads={related.sameMessage} />
      <Related
        title="Otros anuncios hacia la misma landing page"
        ads={related.sameLanding}
        more={ad.landingKey ? `/?landing=${encodeURIComponent(ad.landingKey)}&status=all` : undefined}
      />
      <Related title={`Más anuncios de ${ad.pageName}`} ads={related.sameAdvertiser} more={`/anunciantes/${encodeURIComponent(ad.pageId)}`} />
    </div>
  );
}
