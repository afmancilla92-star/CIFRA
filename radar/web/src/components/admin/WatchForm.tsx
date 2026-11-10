"use client";

import { useState } from "react";
import { Msg, useAction } from "./useAction";

const PLATFORMS = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["messenger", "Messenger"],
  ["audience_network", "Audience Network"],
  ["threads", "Threads"],
] as const;

const split = (s: string) => s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);

export function WatchForm({ disabled }: { disabled: boolean }) {
  const { call, busy, message, setMessage } = useAction();
  const [platforms, setPlatforms] = useState<string[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data = await call("/api/admin/watch", {
      label: String(fd.get("label") ?? ""),
      searchTerms: String(fd.get("searchTerms") ?? "") || null,
      pageIds: split(String(fd.get("pageIds") ?? "")),
      countries: split(String(fd.get("countries") ?? "")).map((c) => c.toUpperCase()),
      languages: split(String(fd.get("languages") ?? "")).map((c) => c.toLowerCase()),
      platforms,
      mediaType: fd.get("mediaType"),
      activeStatus: fd.get("activeStatus"),
      searchType: fd.get("searchType"),
      enabled: true,
    });
    if (data) {
      form.reset();
      setPlatforms([]);
      setMessage({ ok: true, text: "Búsqueda creada. Ejecútala ahora o espera al cron." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <label className="block">
        <span className="label">Nombre</span>
        <input name="label" required maxLength={120} className="input" placeholder="Skincare España" />
      </label>
      <label className="block">
        <span className="label">Palabras clave</span>
        <input name="searchTerms" maxLength={100} className="input" placeholder="serum facial" />
      </label>
      <label className="block">
        <span className="label">Países (ISO, separados por coma)</span>
        <input name="countries" required className="input" placeholder="ES, PT, FR" />
      </label>
      <label className="block">
        <span className="label">IDs de página (opcional, máx. 10)</span>
        <input name="pageIds" className="input" placeholder="1234567890" />
      </label>
      <label className="block">
        <span className="label">Idiomas (opcional)</span>
        <input name="languages" className="input" placeholder="es, pt" />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="label">Estado</span>
          <select name="activeStatus" className="input" defaultValue="ACTIVE">
            <option value="ACTIVE">Activos</option>
            <option value="ALL">Todos</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Medio</span>
          <select name="mediaType" className="input" defaultValue="ALL">
            <option value="ALL">Todos</option>
            <option value="IMAGE">Imagen</option>
            <option value="VIDEO">Video</option>
            <option value="MEME">Meme</option>
            <option value="NONE">Sin medio</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Coincidencia</span>
          <select name="searchType" className="input" defaultValue="KEYWORD_UNORDERED">
            <option value="KEYWORD_UNORDERED">Palabras</option>
            <option value="KEYWORD_EXACT_PHRASE">Frase exacta</option>
          </select>
        </label>
      </div>
      <fieldset className="md:col-span-2">
        <legend className="label">Plataformas (opcional)</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {PLATFORMS.map(([v, l]) => (
            <label key={v} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={platforms.includes(v)}
                onChange={(e) => setPlatforms((p) => (e.target.checked ? [...p, v] : p.filter((x) => x !== v)))}
              />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3 md:col-span-2">
        <button className="btn-primary" disabled={busy || disabled} type="submit">
          {busy ? "Guardando…" : "Agregar búsqueda monitoreada"}
        </button>
        <Msg message={message} />
      </div>
    </form>
  );
}
