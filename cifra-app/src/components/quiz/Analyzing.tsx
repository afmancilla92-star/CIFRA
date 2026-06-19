"use client";

import { useEffect, useState } from "react";

const LABELS = [
  "Calculando precisión por categoría",
  "Cruzando velocidad y exactitud",
  "Comparando contra la curva general",
  "Generando tu perfil",
];

interface AnalyzingProps {
  onDone: () => void;
}

export function Analyzing({ onDone }: AnalyzingProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setStep((s) => Math.min(s + 1, LABELS.length - 1));
    }, 650);
    const doneTimer = window.setTimeout(onDone, 2700);
    return () => {
      window.clearInterval(stepTimer);
      window.clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 animate-pulse rounded-full border-[3px] border-petrol" />
        <h2 className="my-2 mt-[26px] font-display text-[22px] font-bold text-text">Procesando tu resultado</h2>
        <p className="font-mono min-h-[18px] text-[12.5px] text-text-soft">{LABELS[step]}…</p>
      </div>
    </div>
  );
}
