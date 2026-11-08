"use client";

import { Msg, useAction } from "./useAction";

export function ManualForm() {
  const { call, busy, message, setMessage } = useAction();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const data = await call("/api/admin/manual", {
      libraryId: get("libraryId"),
      pageName: get("pageName"),
      pageId: get("pageId"),
      body: get("body") || null,
      title: get("title") || null,
      linkUrl: get("linkUrl"),
      startDate: get("startDate"),
      isActive: fd.get("isActive") === "on",
      platforms: fd.getAll("platforms").map(String),
      countries: get("countries").split(/[\s,;]+/).filter(Boolean),
      mediaUrl: get("mediaUrl"),
      mediaType: get("mediaType") || "image",
    });
    if (data) {
      form.reset();
      setMessage({ ok: true, text: "Anuncio guardado como carga manual (visible con el filtro «Incluir carga manual»)." });
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <label><span className="label">ID de biblioteca (si existe)</span><input name="libraryId" className="input" inputMode="numeric" /></label>
      <label><span className="label">Anunciante *</span><input name="pageName" required className="input" /></label>
      <label><span className="label">ID de página (opcional)</span><input name="pageId" className="input" inputMode="numeric" /></label>
      <label><span className="label">Fecha de inicio</span><input type="date" name="startDate" className="input" /></label>
      <label className="md:col-span-2"><span className="label">Texto</span><textarea name="body" rows={3} className="input" /></label>
      <label><span className="label">Título</span><input name="title" className="input" /></label>
      <label><span className="label">URL de destino</span><input type="url" name="linkUrl" className="input" /></label>
      <label><span className="label">URL de la creatividad</span><input type="url" name="mediaUrl" className="input" /></label>
      <label>
        <span className="label">Tipo</span>
        <select name="mediaType" className="input"><option value="image">Imagen</option><option value="video">Video</option></select>
      </label>
      <label><span className="label">Países</span><input name="countries" className="input" placeholder="CL, AR" /></label>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5"><input type="checkbox" name="isActive" defaultChecked /> Activo</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="platforms" value="facebook" /> Facebook</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="platforms" value="instagram" /> Instagram</label>
      </div>
      <div className="flex items-center gap-3 md:col-span-2">
        <button className="btn-ghost" disabled={busy} type="submit">{busy ? "Guardando…" : "Guardar carga manual"}</button>
        <Msg message={message} />
      </div>
    </form>
  );
}
