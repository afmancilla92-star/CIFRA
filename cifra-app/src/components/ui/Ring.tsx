import type { ReactNode } from "react";
import { clamp } from "@/lib/scoring";

interface RingProps {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}

/**
 * Anillo de progreso — el elemento de marca de Cifra. Aparece en el logo,
 * en el mockup del hero, en la cuenta regresiva de memoria y en el
 * puntaje final, siempre representando "cuánto falta para completarse".
 */
export function Ring({ percent, size = 64, stroke = 6, color = "var(--petrol)", track = "var(--border)", children }: RingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamp(percent, 0, 100) / 100) * circumference;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute">{children}</div>
    </div>
  );
}
