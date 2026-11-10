"use client";

import { useState } from "react";
import { ImageOff, Play } from "lucide-react";
import type { MediaItem } from "@/lib/types";

/**
 * Muestra la creatividad desde su URL original (no se re-aloja). Las URLs
 * de Meta expiran: si falla, se ofrece abrir el anuncio en la Biblioteca.
 */
export function MediaThumb({ media, libraryUrl, alt }: { media: MediaItem[]; libraryUrl: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const first = media[0];
  const src = first ? (first.type === "video" ? first.preview : first.url) : null;
  if (!first || !src || failed) {
    return (
      <a href={libraryUrl} target="_blank" rel="noopener noreferrer" className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-surface-2 p-4 text-center text-xs text-soft">
        <ImageOff className="h-6 w-6" />
        {first ? "La creatividad expiró. Ábrela en la Biblioteca." : "Creatividad disponible en la Biblioteca"}
      </a>
    );
  }
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      {first.type === "video" ? (
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">
          <Play className="h-3 w-3" /> Video
        </span>
      ) : null}
      {media.length > 1 ? (
        <span className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">{media.length} piezas</span>
      ) : null}
    </div>
  );
}

export function MediaGallery({ media, libraryUrl }: { media: MediaItem[]; libraryUrl: string }) {
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  if (!media.length) {
    return (
      <a href={libraryUrl} target="_blank" rel="noopener noreferrer" className="card flex aspect-video flex-col items-center justify-center gap-2 p-6 text-center text-sm text-soft">
        <ImageOff className="h-7 w-7" />
        La fuente no entregó la creatividad (la API oficial solo da textos). Ábrelo en la Biblioteca con la extensión activa para capturarla.
      </a>
    );
  }
  return (
    <div className={media.length > 1 ? "grid gap-3 sm:grid-cols-2" : "mx-auto max-w-xl"}>
      {media.map((m, i) =>
        failed[i] ? (
          <a key={i} href={libraryUrl} target="_blank" rel="noopener noreferrer" className="card flex aspect-square items-center justify-center p-4 text-center text-xs text-soft">
            Enlace expirado: abre el anuncio en la Biblioteca para verlo.
          </a>
        ) : m.type === "video" ? (
          <video
            key={i}
            src={m.url}
            poster={m.preview ?? undefined}
            controls
            preload="none"
            onError={() => setFailed((f) => ({ ...f, [i]: true }))}
            className="w-full rounded-xl bg-black"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={m.url} alt={`Pieza ${i + 1}`} referrerPolicy="no-referrer" onError={() => setFailed((f) => ({ ...f, [i]: true }))} className="w-full rounded-xl border border-border bg-surface-2" />
        ),
      )}
    </div>
  );
}
