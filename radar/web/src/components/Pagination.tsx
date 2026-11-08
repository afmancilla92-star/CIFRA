export function Pagination({ page, perPage, total, href }: { page: number; perPage: number; total: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-center gap-2 text-sm" aria-label="Paginación">
      {page > 1 ? (
        <a className="btn-ghost" href={href(page - 1)}>
          ← Anterior
        </a>
      ) : null}
      <span className="px-2 text-soft">
        Página {page} de {pages}
      </span>
      {page < pages ? (
        <a className="btn-ghost" href={href(page + 1)}>
          Siguiente →
        </a>
      ) : null}
    </nav>
  );
}
