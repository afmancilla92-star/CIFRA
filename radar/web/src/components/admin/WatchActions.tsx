"use client";

import { Msg, useAction } from "./useAction";

export function WatchActions({ id, enabled }: { id: number; enabled: boolean }) {
  const { call, busy, message, setMessage } = useAction();
  async function run() {
    const data = await call(`/api/admin/watch/${id}`, { action: "run" });
    const o = data?.outcome as { status: string; message: string } | undefined;
    if (o) setMessage({ ok: o.status === "ok", text: o.message });
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button className="btn-primary px-2 py-1 text-xs" disabled={busy} onClick={run}>
          {busy ? "…" : "Ejecutar"}
        </button>
        <button className="btn-ghost px-2 py-1 text-xs" disabled={busy} onClick={() => call(`/api/admin/watch/${id}`, { action: enabled ? "disable" : "enable" })}>
          {enabled ? "Pausar" : "Activar"}
        </button>
        <button
          className="btn-ghost px-2 py-1 text-xs text-bad"
          disabled={busy}
          onClick={() => {
            if (confirm("¿Eliminar esta búsqueda monitoreada? Los anuncios ya obtenidos se conservan.")) call(`/api/admin/watch/${id}`, undefined, "DELETE");
          }}
        >
          Eliminar
        </button>
      </div>
      <Msg message={message} />
    </div>
  );
}
