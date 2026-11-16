"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import clsx from "clsx";

/** En pantallas chicas los filtros se pliegan para que los anuncios aparezcan primero. */
export function CollapsibleFilters({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="card h-fit p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-sm font-semibold lg:pointer-events-none" aria-expanded={open}>
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Filtros {count ? <span className="chip">{count}</span> : null}
        </span>
        <span className="text-xs font-normal text-soft lg:hidden">{open ? "Ocultar" : "Mostrar"}</span>
      </button>
      <div className={clsx("mt-4 space-y-4", open ? "block" : "hidden lg:block")}>{children}</div>
    </aside>
  );
}
