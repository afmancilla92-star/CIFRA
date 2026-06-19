import { Eyebrow } from "@/components/ui/Eyebrow";

const STEPS = [
  { n: "01", title: "Resuelve 25 retos", text: "De fáciles a exigentes — lógica, patrones, memoria y visión espacial." },
  { n: "02", title: "Procesamos tu patrón cognitivo", text: "Cruzamos precisión y velocidad por categoría para construir tu perfil." },
  { n: "03", title: "Recibes tu resultado comparado", text: "Un puntaje, un percentil y tus fortalezas frente al promedio general." },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-[1120px] px-6 py-16">
        <Eyebrow>CÓMO FUNCIONA</Eyebrow>
        <h2 className="my-2.5 mb-9 font-display text-[30px] font-extrabold tracking-tight text-text">
          Tres pasos, un resultado claro.
        </h2>
        <div className="grid gap-7 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="font-mono text-[13px] font-bold text-petrol">{s.n}</span>
              <h3 className="mb-1.5 mt-2 font-display text-[17.5px] font-bold text-text">{s.title}</h3>
              <p className="text-sm leading-relaxed text-text-soft">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
