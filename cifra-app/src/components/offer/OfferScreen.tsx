"use client";

import { Check, Lock, ShieldCheck } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Countdown } from "@/components/offer/Countdown";

const OFFER_ITEMS = [
  "Desglose de los 25 retos con tu respuesta y la explicación correcta",
  "Tiempo invertido por categoría comparado con el promedio",
  "Plan de práctica de 14 días enfocado en tus áreas de mejora",
  "Comparación histórica si repites la evaluación en el futuro",
];

interface OfferScreenProps {
  onBack: () => void;
  onCheckout: () => void;
}

export function OfferScreen({ onBack, onCheckout }: OfferScreenProps) {
  return (
    <div className="min-h-screen px-6 pb-20 pt-12">
      <div className="mx-auto max-w-[480px] animate-fade-up">
        <div className="mb-6 text-center">
          <Eyebrow>OFERTA POR TIEMPO LIMITADO</Eyebrow>
          <h2 className="my-1.5 font-display text-[26px] font-extrabold tracking-tight text-text">
            Desbloquea tu informe completo
          </h2>
          <p className="text-[13.5px] text-text-soft">
            Precio especial disponible por <Countdown />
          </p>
        </div>

        <div className="rounded-[22px] border border-border bg-surface p-[26px] shadow-soft dark:shadow-soft-dark">
          <div className="mb-1 flex items-baseline gap-2">
            <span className="font-display text-[34px] font-extrabold">$29.900</span>
            <span className="text-sm text-text-soft line-through">$69.900</span>
            <span className="text-xs font-bold text-jade">-57%</span>
          </div>
          <p className="mb-5 text-[12.5px] text-text-soft">Pago único · acceso inmediato</p>

          <div className="mb-[22px] grid gap-2.5">
            {OFFER_ITEMS.map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 flex-shrink-0 text-jade" />
                <span className="text-[13.5px] leading-relaxed">{item}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onCheckout}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-[13px] bg-petrol py-[15px] text-[15px] font-semibold text-white transition-transform hover:-translate-y-px"
          >
            <Lock size={15} /> Continuar al pago seguro
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-text-soft">
            <ShieldCheck size={14} /> Garantía de satisfacción de 7 días
          </div>
        </div>

        <button type="button" onClick={onBack} className="mx-auto mt-5 block text-[13px] text-text-soft">
          Volver al resultado
        </button>
      </div>
    </div>
  );
}
