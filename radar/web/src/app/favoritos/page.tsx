import { AdCard } from "@/components/AdCard";
import { Pagination } from "@/components/Pagination";
import { fmtNum } from "@/lib/format";
import { searchAds } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function FavoritesPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const page = Number(searchParams.page) || 1;
  const res = await searchAds({ favorites: true, status: "all", includeManual: true, sort: "longest", page });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Favoritos</h1>
        <p className="text-sm text-soft">
          {fmtNum(res.total)} anuncios guardados. Los favoritos no se eliminan por la política de retención.
        </p>
      </div>
      {res.items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {res.items.map((a) => (
            <AdCard key={a.id} ad={a} />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-soft">Usa la estrella de cualquier anuncio para guardarlo aquí.</div>
      )}
      <Pagination page={res.page} perPage={res.perPage} total={res.total} href={(p) => `/favoritos?page=${p}`} />
    </div>
  );
}
