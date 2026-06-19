import { Brain, Eye, Layers, Zap, type LucideIcon } from "lucide-react";

interface Benefit {
  icon: LucideIcon;
  title: string;
  text: string;
}

const BENEFITS: Benefit[] = [
  { icon: Brain, title: "Razonamiento lógico", text: "Mide cómo enlazas premisas y llegas a conclusiones válidas." },
  { icon: Eye, title: "Percepción de patrones", text: "Evalúa tu capacidad de detectar reglas ocultas en secuencias y matrices." },
  { icon: Layers, title: "Memoria de trabajo", text: "Pone a prueba cuánta información retienes y manipulas en segundos." },
  { icon: Zap, title: "Velocidad de procesamiento", text: "Cruza precisión y tiempo de respuesta para un perfil más completo." },
];

export function Benefits() {
  return (
    <section className="mx-auto max-w-[1120px] px-6 pb-16 pt-10">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {BENEFITS.map((b) => (
          <div key={b.title} className="rounded-2xl border border-border bg-surface p-[22px] transition-all hover:-translate-y-0.5 hover:shadow-soft dark:hover:shadow-soft-dark">
            <div className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-petrol-soft text-petrol">
              <b.icon size={19} />
            </div>
            <h3 className="mb-1.5 mt-3.5 font-display text-base font-bold text-text">{b.title}</h3>
            <p className="text-[13.5px] leading-relaxed text-text-soft">{b.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
