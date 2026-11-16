"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import clsx from "clsx";

export function FavoriteButton({ adId, initial, compact = false }: { adId: string; initial: boolean; compact?: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    start(async () => {
      const res = await fetch(`/api/favorites/${encodeURIComponent(adId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: next }),
      }).catch(() => null);
      if (!res || !res.ok) {
        setOn(!next);
        const data = res ? await res.json().catch(() => ({})) : {};
        setError((data as { error?: string }).error ?? "No se pudo guardar");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={on}
      title={error ?? (on ? "Quitar de favoritos" : "Guardar en favoritos")}
      className={clsx(
        compact ? "rounded-full p-1.5" : "btn-ghost",
        "transition",
        on ? "text-amber" : "text-soft hover:text-text",
        error && "text-bad",
      )}
    >
      <Star className={clsx("h-4 w-4", on && "fill-current")} />
      {compact ? null : on ? "En favoritos" : "Guardar"}
    </button>
  );
}
