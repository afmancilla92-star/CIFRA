import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { HeroMockup } from "@/components/landing/HeroMockup";

export function Hero() {
  return (
    <section className="mx-auto max-w-[1120px] px-6 pb-14 pt-[72px]">
      <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-fade-up">
          <Eyebrow>EVALUACIÓN COGNITIVA · 10-15 MINUTOS</Eyebrow>
          <h1 className="my-4 font-display text-[clamp(34px,5vw,54px)] font-extrabold leading-[1.05] tracking-tight text-text">
            Tu mente resuelve patrones todo el día. Hoy vas a verlo con números.
          </h1>
          <p className="mb-7 max-w-[480px] text-lg leading-relaxed text-text-soft">
            Cifra es una evaluación rigurosa de razonamiento, memoria de trabajo y percepción de patrones —
            diseñada para mostrarte, con datos, cómo procesas la información.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/test"
              className="inline-flex items-center gap-2 rounded-[13px] bg-petrol px-[26px] py-[15px] text-[15.5px] font-semibold text-white transition-transform hover:-translate-y-px"
            >
              Comenzar mi evaluación <ArrowRight size={17} />
            </Link>
            <span className="flex items-center gap-1.5 text-[13.5px] text-text-soft">
              <Clock size={14} /> 25 retos · sin registro previo
            </span>
          </div>
        </div>
        <div className="flex animate-fade-up justify-center [animation-delay:120ms]">
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}
