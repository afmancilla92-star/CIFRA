import { Chrome, DatabaseZap, PlugZap } from "lucide-react";

/** Sin anuncios todavía: guía para conectar fuentes reales (nunca se muestran datos inventados). */
export function EmptyState({ metaConfigured, extensionConfigured }: { metaConfigured: boolean; extensionConfigured: boolean }) {
  return (
    <section className="card mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold tracking-tight">Todavía no hay anuncios en tu radar</h1>
      <p className="mt-2 text-soft">
        Cifra Radar solo muestra anuncios reales obtenidos de la Biblioteca de Anuncios de Meta. Conecta al menos una fuente y aparecerán aquí,
        listos para filtrar y ordenar por antigüedad.
      </p>
      <ol className="mt-6 space-y-4">
        <li className="flex gap-3">
          <Chrome className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="font-semibold">
              Extensión de Chrome {extensionConfigured ? <span className="chip ml-1 text-good">token listo</span> : <span className="chip ml-1">falta INGEST_TOKEN</span>}
            </p>
            <p className="text-sm text-soft">
              Instálala, busca en la Biblioteca de Anuncios (cualquier país) y pulsa «Enviar a Cifra Radar». Es la vía para anuncios comerciales fuera de la UE.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <PlugZap className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="font-semibold">
              API oficial de Meta {metaConfigured ? <span className="chip ml-1 text-good">token listo</span> : <span className="chip ml-1">falta META_ACCESS_TOKEN</span>}
            </p>
            <p className="text-sm text-soft">
              Crea búsquedas monitoreadas (palabras clave o páginas + países). El cron las consulta a diario. Cubre anuncios comerciales que llegaron a la UE.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="font-semibold">Importar resultados</p>
            <p className="text-sm text-soft">Sube un JSON exportado de la Ad Library API para cargarlo de una vez.</p>
          </div>
        </li>
      </ol>
      <a href="/fuentes" className="btn-primary mt-6">
        Configurar fuentes
      </a>
    </section>
  );
}
