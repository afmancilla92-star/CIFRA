import { Quote } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface Testimonial {
  name: string;
  city: string;
  text: string;
}

const TESTIMONIALS: Testimonial[] = [
  { name: "Marcela R.", city: "Cali", text: "No esperaba que un test tan corto me diera tanta claridad sobre dónde soy fuerte y dónde no." },
  { name: "Esteban G.", city: "Bogotá", text: "Las preguntas se sienten distintas a lo típico — no son las mismas de siempre." },
  { name: "Daniela P.", city: "Medellín", text: "El resultado comparado contra el promedio fue lo que más me gustó. Se siente serio." },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-[1120px] px-6 py-16">
      <Eyebrow>LO QUE DICEN</Eyebrow>
      <h2 className="my-2.5 mb-8 font-display text-[28px] font-extrabold tracking-tight text-text">
        Personas que ya midieron su patrón.
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="rounded-2xl border border-border bg-surface p-[22px]">
            <Quote size={18} className="mb-2.5 text-violet" />
            <p className="mb-4 text-sm leading-relaxed text-text">{t.text}</p>
            <div className="flex items-center gap-2.5">
              <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-gradient-to-br from-petrol to-violet text-xs font-bold text-white">
                {t.name.split(" ")[0]?.[0]}
                {t.city[0]}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-text">{t.name}</div>
                <div className="text-xs text-text-soft">{t.city}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3.5 text-[11.5px] text-text-soft">
        Testimonios ilustrativos de plantilla — reemplázalos por casos reales antes de publicar.
      </p>
    </section>
  );
}
