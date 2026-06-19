"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "¿Cifra reemplaza una evaluación psicológica clínica?",
    a: "No. Cifra es una herramienta de autoconocimiento y entretenimiento educativo, no un instrumento de diagnóstico clínico ni psicométrico validado.",
  },
  { q: "¿Cuánto dura el test?", a: "Entre 10 y 15 minutos, dependiendo de tu ritmo en los 25 retos." },
  { q: "¿Necesito conocimientos previos?", a: "No. Los retos están diseñados para evaluar razonamiento puro, no conocimientos académicos." },
  { q: "¿Qué pasa con mis respuestas?", a: "Se usan únicamente para calcular tu resultado en esta sesión." },
  { q: "¿Qué incluye el informe completo?", a: "Tu puntaje detallado por categoría, comparación con el promedio general y recomendaciones de práctica." },
];

export function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto max-w-[760px] px-6 py-16">
        <Eyebrow>PREGUNTAS FRECUENTES</Eyebrow>
        <h2 className="my-2.5 mb-7 font-display text-[28px] font-extrabold tracking-tight text-text">Antes de empezar.</h2>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="border-b border-border">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between py-[18px] text-left"
              >
                <span className="text-[15px] font-semibold text-text">{f.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-text-soft transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${isOpen ? "max-h-[200px]" : "max-h-0"}`}>
                <p className="pb-[18px] text-sm leading-relaxed text-text-soft">{f.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
