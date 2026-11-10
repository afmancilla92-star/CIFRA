"use client";

import { Msg, useAction } from "./useAction";

const ACTIONS = [
  { action: "sync", label: "Ejecutar búsquedas ahora", hint: "Consulta la API oficial con todas las búsquedas activas." },
  { action: "recompute", label: "Recalcular puntuaciones", hint: "Actualiza días activos y señales de todos los anuncios." },
  { action: "ai", label: "Clasificar nichos con IA", hint: "Solo anuncios sin nicho claro por reglas (requiere ANTHROPIC_API_KEY)." },
  { action: "purge", label: "Aplicar retención", hint: "Elimina anuncios no favoritos que no se ven hace RETENTION_DAYS días." },
] as const;

export function MaintenanceActions({ aiEnabled }: { aiEnabled: boolean }) {
  const { call, busy, message, setMessage } = useAction();
  async function run(action: string) {
    const data = await call("/api/admin/maintenance", { action });
    if (data?.message) setMessage({ ok: true, text: String(data.message) });
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {ACTIONS.map((a) => (
          <button key={a.action} className="btn-ghost h-auto flex-col items-start py-3 text-left" disabled={busy || (a.action === "ai" && !aiEnabled)} onClick={() => run(a.action)}>
            <span>{a.label}</span>
            <span className="text-xs font-normal text-soft">{a.hint}</span>
          </button>
        ))}
      </div>
      {busy ? <p className="text-sm text-soft">Procesando…</p> : <Msg message={message} />}
    </div>
  );
}
