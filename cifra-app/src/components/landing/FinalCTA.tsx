import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-[1120px] px-6 py-[72px]">
      <div className="rounded-[22px] bg-petrol px-8 py-12 text-center shadow-soft dark:shadow-soft-dark">
        <h2 className="mb-2.5 font-display text-[28px] font-extrabold tracking-tight text-white">
          ¿Listo para ver tu patrón cognitivo?
        </h2>
        <p className="mb-6 text-[15px] text-white/85">10-15 minutos. 25 retos. Un resultado que puedes guardar.</p>
        <Link
          href="/test"
          className="inline-flex items-center gap-2 rounded-[13px] bg-white px-6 py-[13px] text-[14.5px] font-bold text-petrol transition-transform hover:-translate-y-px"
        >
          Comenzar ahora <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}
