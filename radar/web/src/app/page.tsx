import { Search } from "lucide-react";
import { AdCard } from "@/components/AdCard";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { CollapsibleFilters } from "@/components/CollapsibleFilters";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { config } from "@/lib/config";
import { filtersToParams, parseExploreFilters } from "@/lib/filters";
import { FORMAT_LABELS, PLATFORM_LABELS, SOURCE_LABELS, fmtNum, qs, timeAgo } from "@/lib/format";
import { LANGUAGE_NAMES } from "@/lib/lang";
import { nicheLabel } from "@/lib/niche/catalog";
import { getFacets, getOverview, searchAds, SORTS } from "@/lib/queries";
import { countryName } from "@/lib/sources/countries";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function Select({ name, label, value, options, any = "Todos" }: { name: string; label: string; value?: string | number; options: Array<{ value: string; label: string }>; any?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select name={name} defaultValue={value === undefined ? "" : String(value)} className="input">
        <option value="">{any}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function ExplorePage({ searchParams }: { searchParams: SP }) {
  const f = parseExploreFilters(searchParams);
  const [overview, facets, results] = await Promise.all([getOverview(), getFacets(), searchAds(f)]);

  if (overview.ads === 0 && !f.includeManual) {
    return <EmptyState metaConfigured={Boolean(config.metaToken)} extensionConfigured={Boolean(config.ingestToken)} />;
  }

  const params = filtersToParams(f);
  const withCount = (label: string, n: number) => `${label} (${fmtNum(n)})`;
  const activeFilters = Object.entries(params).filter(([k, v]) => v !== undefined && k !== "sort" && k !== "q").length;

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Explorar anuncios</h1>
          <p className="text-sm text-soft">
            {fmtNum(overview.active)} activos de {fmtNum(overview.ads)} registrados · {fmtNum(overview.advertisers)} anunciantes ·{" "}
            {fmtNum(overview.landings)} landing pages · última captura {timeAgo(overview.lastIngest)}
          </p>
        </div>
      </section>

      <AutoSubmitForm className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CollapsibleFilters count={activeFilters}>
          <Select
            name="status"
            label="Estado"
            value={f.status === "active" ? "" : f.status}
            any="Activos"
            options={[
              { value: "all", label: "Activos e inactivos" },
              { value: "inactive", label: "Inactivos" },
            ]}
          />
          <Select name="niche" label="Nicho" value={f.niche} options={facets.niches.map((x) => ({ value: x.value, label: withCount(nicheLabel(x.value === "none" ? null : x.value), x.count) }))} />
          <Select name="country" label="País" value={f.country} options={facets.countries.map((x) => ({ value: x.value, label: withCount(countryName(x.value), x.count) }))} />
          <Select name="language" label="Idioma" value={f.language} options={facets.languages.map((x) => ({ value: x.value, label: withCount(LANGUAGE_NAMES[x.value] ?? x.value.toUpperCase(), x.count) }))} />
          <Select name="platform" label="Plataforma" value={f.platform} options={facets.platforms.map((x) => ({ value: x.value, label: withCount(PLATFORM_LABELS[x.value]?.label ?? x.value, x.count) }))} />
          <Select name="format" label="Formato" value={f.format} options={facets.formats.map((x) => ({ value: x.value, label: withCount(FORMAT_LABELS[x.value] ?? x.value, x.count) }))} />
          <Select name="offer" label="Oferta detectada" value={f.offer} any="Cualquiera" options={facets.offers.map((x) => ({ value: x.value, label: withCount(x.value, x.count) }))} />
          <Select
            name="minDays"
            label="Días activos (mínimo)"
            value={f.minDays}
            any="Cualquiera"
            options={[7, 14, 30, 60, 90, 180].map((d) => ({ value: String(d), label: `${d}+ días` }))}
          />
          <Select
            name="minScore"
            label="Puntuación (mínimo)"
            value={f.minScore}
            any="Cualquiera"
            options={[40, 55, 70, 85].map((d) => ({ value: String(d), label: `${d}+` }))}
          />
          <Select
            name="minVariants"
            label="Variantes (mínimo)"
            value={f.minVariants}
            any="Cualquiera"
            options={[2, 3, 5, 10].map((d) => ({ value: String(d), label: `${d}+ versiones` }))}
          />
          <Select
            name="minAdvertiserAds"
            label="Anuncios activos del anunciante"
            value={f.minAdvertiserAds}
            any="Cualquiera"
            options={[3, 5, 10, 25, 50].map((d) => ({ value: String(d), label: `${d}+ anuncios` }))}
          />
          <label className="block">
            <span className="label">Empezó a circular desde</span>
            <input type="date" name="startedAfter" defaultValue={f.startedAfter} className="input" />
          </label>
          <Select name="source" label="Fuente" value={f.source} any="Todas" options={(["meta_api", "extension", "import"] as const).map((s) => ({ value: s, label: SOURCE_LABELS[s] ?? s }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="hasLanding" value="1" defaultChecked={f.hasLanding} /> Con landing page
          </label>
          <label className="flex items-center gap-2 text-sm text-soft">
            <input type="checkbox" name="manual" value="1" defaultChecked={f.includeManual} /> Incluir carga manual (pruebas)
          </label>
          {f.pageId ? <input type="hidden" name="pageId" value={f.pageId} /> : null}
          {f.landing ? <input type="hidden" name="landing" value={f.landing} /> : null}
          {f.domain ? <input type="hidden" name="domain" value={f.domain} /> : null}
          <a href="/" className="btn-ghost w-full">
            Limpiar filtros
          </a>
        </CollapsibleFilters>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
              <input name="q" defaultValue={f.q} placeholder="Busca por texto, producto, anunciante o dominio…" className="input py-2.5 pl-9" />
            </label>
            <select name="sort" defaultValue={f.sort} className="input w-auto py-2.5" aria-label="Ordenar">
              {Object.entries(SORTS).map(([k, s]) => (
                <option key={k} value={k}>
                  {s.label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary py-2.5">
              Buscar
            </button>
          </div>

          {f.landing || f.pageId || f.domain ? (
            <p className="text-sm text-soft">
              {f.landing ? <>Anuncios que llevan a <strong className="text-text">{f.landing}</strong>. </> : null}
              {f.domain ? <>Dominio <strong className="text-text">{f.domain}</strong>. </> : null}
              {f.pageId ? <>Filtrado por anunciante. </> : null}
              <a className="text-accent hover:underline" href={`/${qs(params, { landing: undefined, pageId: undefined, domain: undefined })}`}>
                Quitar
              </a>
            </p>
          ) : null}

          <p className="text-sm text-soft">
            {fmtNum(results.total)} {results.total === 1 ? "anuncio" : "anuncios"} · ordenados por {SORTS[f.sort ?? "longest"].label.toLowerCase()}
          </p>

          {results.items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {results.items.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-soft">
              Ningún anuncio coincide con estos filtros. Prueba ampliar el estado a «Activos e inactivos» o quitar algún filtro.
            </div>
          )}

          <Pagination page={results.page} perPage={results.perPage} total={results.total} href={(p) => `/${qs(params, { page: p })}`} />
        </div>
      </AutoSubmitForm>
    </div>
  );
}
