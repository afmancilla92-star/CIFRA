"use client";

import { Msg, useAction } from "./useAction";

export function ImportForm() {
  const { call, busy, message, setMessage } = useAction();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    if (!file || !file.size) return setMessage({ ok: false, text: "Elige un archivo JSON." });
    if (file.size > 15_000_000) return setMessage({ ok: false, text: "El archivo supera 15 MB." });
    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      return setMessage({ ok: false, text: "El archivo no es JSON válido." });
    }
    const countries = String(fd.get("countries") ?? "")
      .split(/[\s,;]+/)
      .filter(Boolean);
    const data = await call("/api/admin/import", { payload, countries });
    if (data)
      setMessage({
        ok: true,
        text: `Importado (${String(data.kind)}): ${data.created} nuevos, ${data.updated} actualizados, ${data.skipped} omitidos${Number(data.ignored) ? `, ${data.ignored} registros no reconocidos` : ""}.`,
      });
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="min-w-[220px] flex-1">
        <span className="label">Archivo JSON</span>
        <input type="file" name="file" accept="application/json,.json" className="input" />
      </label>
      <label>
        <span className="label">Países de la consulta</span>
        <input name="countries" className="input" placeholder="ES, PT" />
      </label>
      <button className="btn-primary" disabled={busy} type="submit">
        {busy ? "Importando…" : "Importar"}
      </button>
      <div className="w-full">
        <Msg message={message} />
      </div>
    </form>
  );
}
