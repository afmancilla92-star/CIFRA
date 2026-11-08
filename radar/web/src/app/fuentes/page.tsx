import { headers } from "next/headers";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { ImportForm } from "@/components/admin/ImportForm";
import { MaintenanceActions } from "@/components/admin/MaintenanceActions";
import { ManualForm } from "@/components/admin/ManualForm";
import { SecretField } from "@/components/admin/SecretField";
import { WatchActions } from "@/components/admin/WatchActions";
import { WatchForm } from "@/components/admin/WatchForm";
import { config } from "@/lib/config";
import { all, json } from "@/lib/db/client";
import { SOURCE_LABELS, fmtNum, timeAgo } from "@/lib/format";
import { getOverview } from "@/lib/queries";
import { apiCoverageWarning } from "@/lib/sources/meta-api";
import { listWatchQueries } from "@/lib/sync";

export const dynamic = "force-dynamic";

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex gap-3">
      {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-good" /> : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-soft" />}
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-soft">{detail}</p>
      </div>
    </li>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="text-sm text-soft">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default async function SourcesPage() {
  const [overview, watches, logs] = await Promise.all([
    getOverview(),
    listWatchQueries(),
    all<Record<string, unknown>>("SELECT * FROM ingest_log ORDER BY id DESC LIMIT 15"),
  ]);
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const platformUrl = `${proto}://${host}`;
  const prod = process.env.NODE_ENV === "production";
  const adminLocked = prod && !config.appPassword;
  const canShowSecrets = !prod || Boolean(config.appPassword);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fuentes y administración</h1>
        <p className="text-sm text-soft">
          De dónde salen los anuncios del radar. La exploración muestra {fmtNum(overview.ads)} anuncios reales
          {overview.manual ? ` (más ${fmtNum(overview.manual)} de carga manual, ocultos por defecto)` : ""}.
        </p>
      </div>

      {adminLocked ? (
        <p className="rounded-lg bg-amber-soft p-3 text-sm text-amber">
          La administración está bloqueada: define APP_PASSWORD (y SESSION_SECRET) en el entorno de producción para habilitarla.
        </p>
      ) : !config.appPassword ? (
        <p className="rounded-lg bg-amber-soft p-3 text-sm text-amber">Modo local sin contraseña. Define APP_PASSWORD antes de publicar la plataforma.</p>
      ) : null}

      <Section title="Estado de las fuentes">
        <ul className="grid gap-4 md:grid-cols-2">
          <Status
            ok={Boolean(config.ingestToken)}
            label="Extensión de Chrome (principal)"
            detail={
              config.ingestToken
                ? "Lista para recibir capturas de la Biblioteca de Anuncios de cualquier país."
                : "Define INGEST_TOKEN para que la extensión pueda enviar anuncios."
            }
          />
          <Status
            ok={Boolean(config.metaToken)}
            label={`Meta Ad Library API (${config.metaVersion})`}
            detail={
              config.metaToken
                ? `Token configurado · hasta ${config.metaMaxPages} páginas por búsqueda. Solo anuncios comerciales que llegaron a la UE.`
                : "Define META_ACCESS_TOKEN (app con acceso a la Ad Library API y verificación de identidad)."
            }
          />
          <Status
            ok={Boolean(config.cronSecret)}
            label="Sincronización automática"
            detail={config.cronSecret ? "El cron diario ejecuta las búsquedas, recalcula puntuaciones y aplica la retención." : "Define CRON_SECRET para habilitar /api/cron/sync."}
          />
          <Status
            ok={Boolean(config.anthropicKey)}
            label="Clasificación de nichos con IA (opcional)"
            detail={config.anthropicKey ? `Activa con ${config.aiModel}. Las reglas siguen siendo la base.` : "Sin ANTHROPIC_API_KEY se usan solo reglas por palabras clave."}
          />
        </ul>
        <p className="text-xs text-soft">
          Retención: los anuncios no favoritos que no se vuelven a ver en {config.retentionDays} días se eliminan. Las creatividades nunca se descargan: se guardan solo sus enlaces originales, que Meta hace expirar.
        </p>
      </Section>

      <Section
        title="Extensión de Chrome"
        description="Puente entre lo que consultas en la Biblioteca de Anuncios y esta plataforma. Captura solo lo que tú cargas en pantalla y solo cuando pulsas «Enviar»."
      >
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>
            En Chrome abre <span className="font-mono">chrome://extensions</span>, activa el «Modo desarrollador» y usa «Cargar descomprimida» con la carpeta{" "}
            <span className="font-mono">radar/extension</span> del repositorio.
          </li>
          <li>Haz clic en el ícono de Cifra Radar → «Conexión con la plataforma» y pega la URL y el token de abajo.</li>
          <li>
            Abre la{" "}
            <a className="text-accent hover:underline" href="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&media_type=all" target="_blank" rel="noopener noreferrer">
              Biblioteca de Anuncios
            </a>
            , busca por palabra clave, país o anunciante y desplázate para cargar resultados.
          </li>
          <li>Pulsa «Enviar a Cifra Radar» en el panel flotante. Los anuncios aparecen en Explorar al instante.</li>
        </ol>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <span className="label">URL de la plataforma</span>
            <input readOnly value={platformUrl} className="input font-mono text-xs" />
          </div>
          {config.ingestToken && canShowSecrets ? <SecretField label="Token de la extensión (INGEST_TOKEN)" value={config.ingestToken} /> : null}
        </div>
      </Section>

      <Section
        title="Búsquedas monitoreadas (API oficial)"
        description="El cron consulta estas búsquedas en la Ad Library API. Fuera de la UE la API solo devuelve anuncios políticos o sociales: para esos países usa la extensión."
      >
        <WatchForm disabled={adminLocked} />
        {watches.length ? (
          <ul className="divide-y divide-border">
            {watches.map((w) => {
              const warn = apiCoverageWarning(w.countries);
              return (
                <li key={w.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-[220px] flex-1">
                    <p className="font-semibold">
                      {w.label} {!w.enabled ? <span className="chip">pausada</span> : null}
                    </p>
                    <p className="text-sm text-soft">
                      {w.searchTerms ? `«${w.searchTerms}»` : `Páginas: ${w.pageIds.join(", ")}`} · {w.countries.join(", ")} · {w.activeStatus === "ACTIVE" ? "activos" : "todos"}
                      {w.platforms.length ? ` · ${w.platforms.join(", ")}` : ""}
                    </p>
                    {warn ? <p className="text-xs text-amber">{warn}</p> : null}
                    <p className="text-xs text-soft">
                      Última ejecución {timeAgo(w.lastRunAt)}
                      {w.lastMessage ? ` · ${w.lastStatus === "error" ? "Error: " : ""}${w.lastMessage}` : ""}
                    </p>
                  </div>
                  <WatchActions id={w.id} enabled={w.enabled} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-soft">Aún no hay búsquedas monitoreadas.</p>
        )}
      </Section>

      <Section title="Importar resultados" description="JSON de la Ad Library API (respuesta con «data») o exportación de la extensión («nodes»). Máximo 15 MB.">
        <ImportForm />
      </Section>

      <Section title="Mantenimiento">
        <MaintenanceActions aiEnabled={Boolean(config.anthropicKey)} />
      </Section>

      <Section title="Últimas ingestas">
        {logs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-soft">
                <tr>
                  <th className="py-2 pr-4">Cuándo</th>
                  <th className="py-2 pr-4">Fuente</th>
                  <th className="py-2 pr-4">Recibidos</th>
                  <th className="py-2 pr-4">Nuevos</th>
                  <th className="py-2 pr-4">Actualizados</th>
                  <th className="py-2 pr-4">Omitidos</th>
                  <th className="py-2">Contexto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((l) => {
                  const ctx = json<Record<string, unknown>>(l.context, {});
                  const label = [ctx.label, ctx.q ? `«${String(ctx.q)}»` : null, ctx.country, ctx.kind].filter(Boolean).join(" · ");
                  return (
                    <tr key={String(l.id)}>
                      <td className="py-2 pr-4 whitespace-nowrap">{timeAgo(String(l.created_at))}</td>
                      <td className="py-2 pr-4">{SOURCE_LABELS[String(l.source)] ?? String(l.source)}</td>
                      <td className="py-2 pr-4 tabular-nums">{fmtNum(Number(l.received))}</td>
                      <td className="py-2 pr-4 tabular-nums">{fmtNum(Number(l.created))}</td>
                      <td className="py-2 pr-4 tabular-nums">{fmtNum(Number(l.updated))}</td>
                      <td className="py-2 pr-4 tabular-nums">{fmtNum(Number(l.skipped))}</td>
                      <td className="py-2 text-soft">{label || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-soft">Todavía no se recibió ninguna captura.</p>
        )}
      </Section>

      <details className="card p-5">
        <summary className="cursor-pointer text-lg font-semibold">Carga manual (solo pruebas y mantenimiento)</summary>
        <p className="mt-2 text-sm text-soft">
          No es el mecanismo de funcionamiento: los anuncios cargados así quedan marcados y no aparecen en Explorar salvo que actives «Incluir carga manual».
        </p>
        <div className="mt-4">
          <ManualForm />
        </div>
      </details>
    </div>
  );
}
