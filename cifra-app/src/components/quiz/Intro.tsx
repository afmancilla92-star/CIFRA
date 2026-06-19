"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock, Layers, Target } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { BrainNetwork } from "@/components/ui/BrainNetwork";

const ITEMS = [
  { icon: Target, text: "25 retos organizados de menor a mayor dificultad — no hay calentamiento previo." },
  { icon: Clock, text: "Vas a necesitar entre 10 y 15 minutos de atención sostenida, sin distracciones." },
  { icon: Layers, text: "Cada reto trae 6 alternativas: lee todas antes de decidir." },
];

interface IntroProps {
  onBegin: () => void;
}

export function Intro({ onBegin }: IntroProps) {
  return (
    <div className="grid min-h-screen place-items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-[460px] text-center"
      >
        <Logo size={32} />
        <h1 className="my-1.5 mt-[22px] font-display text-[28px] font-extrabold tracking-tight text-text">
          Esto exige tu atención completa
        </h1>
        <p className="mb-[22px] text-[15px] text-text-soft">
          No hay respuestas con truco. Responde con la primera lectura que te parezca correcta.
        </p>

        <div className="mb-6 flex justify-center">
          <BrainNetwork size={170} />
        </div>

        <div className="mb-[30px] grid gap-3 text-left">
          {ITEMS.map((it) => (
            <div key={it.text} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
              <div className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[11px] bg-petrol-soft text-petrol">
                <it.icon size={17} />
              </div>
              <span className="text-[13.5px] text-text">{it.text}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onBegin}
          className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-petrol py-[15px] text-[15.5px] font-semibold text-white transition-transform hover:-translate-y-px"
        >
          Iniciar evaluación <ArrowRight size={17} />
        </button>
      </motion.div>
    </div>
  );
}
