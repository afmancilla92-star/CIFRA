"use client";

import { useMemo } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { Brain, Eye, Layers, RotateCw, Sparkles, Target, Zap, ArrowRight, type LucideIcon } from "lucide-react";
import { TOTAL_QUESTIONS } from "@/data/questions";
import { computeScore, percentileForScore, computeDimensionScores, topAndGrowthDimensions } from "@/lib/scoring";
import { DIMENSION_LABELS, DIMENSION_COPY } from "@/lib/content";
import type { Answer, RadarDimension } from "@/lib/types";
import { Ring } from "@/components/ui/Ring";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface ResultsScreenProps {
  answers: Answer[];
  totalElapsedMs: number;
  onUnlock: () => void;
}

interface Badge {
  icon: LucideIcon;
  label: string;
}

export function ResultsScreen({ answers, totalElapsedMs, onUnlock }: ResultsScreenProps) {
  const correctCount = answers.filter((a) => a.correct).length;
  const score = computeScore(answers);
  const percentile = percentileForScore(score);

  const dims = useMemo(() => computeDimensionScores(answers, totalElapsedMs), [answers, totalElapsedMs]);
  const radarData = (Object.keys(dims) as RadarDimension[]).map((k) => ({ subject: DIMENSION_LABELS[k], value: dims[k] }));
  const { strengths, growth } = topAndGrowthDimensions(dims);

  const badges: Badge[] = [];
  if (dims.velocidad >= 80) badges.push({ icon: Zap, label: "Procesamiento ágil" });
  if (dims.patrones >= 80) badges.push({ icon: Eye, label: "Lector de patrones" });
  if (dims.logica >= 80) badges.push({ icon: Brain, label: "Razonamiento sólido" });
  if (dims.memoria >= 80) badges.push({ icon: Layers, label: "Memoria activa" });
  if (dims.espacial >= 80) badges.push({ icon: RotateCw, label: "Visión espacial fuerte" });
  if (badges.length === 0) badges.push({ icon: Target, label: "Perfil equilibrado" });

  return (
    <div className="min-h-screen px-6 pb-20 pt-12">
      <div className="mx-auto max-w-[720px]">
        <div className="mb-9 animate-fade-up text-center">
          <Eyebrow>TU RESULTADO</Eyebrow>
          <div className="my-5 flex justify-center">
            <Ring percent={Math.max(8, Math.min(100, ((score - 80) / 65) * 100))} size={150} stroke={10}>
              <div className="text-center">
                <div className="font-display text-[42px] font-extrabold leading-none">{score}</div>
                <div className="font-mono text-[10.5px] uppercase text-text-soft">Puntaje Cifra</div>
              </div>
            </Ring>
          </div>
          <p className="text-[15px] text-text">
            Estás por encima del <strong>{percentile}%</strong> de las personas evaluadas hasta ahora.
          </p>
          <p className="mt-1.5 text-xs text-text-soft">
            Respondiste correctamente {correctCount} de {TOTAL_QUESTIONS} retos.
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-border bg-surface p-6">
          <h3 className="mb-3.5 font-display text-base font-bold text-text">Tu perfil por dimensión</h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--text-soft)", fontSize: 11.5 }} />
                <Radar dataKey="value" stroke="var(--petrol)" fill="var(--petrol)" fillOpacity={0.32} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-5 grid gap-3">
          {badges.slice(0, 3).map((b) => (
            <div key={b.label} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
              <div className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-amber-soft text-amber">
                <b.icon size={17} />
              </div>
              <span className="text-sm font-semibold text-text">{b.label}</span>
            </div>
          ))}
        </div>

        <div className="mb-7 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h4 className="font-mono mb-2.5 text-[11.5px] uppercase text-jade">Fortalezas</h4>
            {strengths.map(([key]) => (
              <p key={key} className="mb-2 text-[13.5px] leading-relaxed">
                <strong>{DIMENSION_LABELS[key as RadarDimension]}.</strong> {DIMENSION_COPY[key as RadarDimension].strength}
              </p>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h4 className="font-mono mb-2.5 text-[11.5px] uppercase text-amber">Áreas de mejora</h4>
            {growth.map(([key]) => (
              <p key={key} className="mb-2 text-[13.5px] leading-relaxed">
                <strong>{DIMENSION_LABELS[key as RadarDimension]}.</strong> {DIMENSION_COPY[key as RadarDimension].growth}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] bg-petrol p-[26px] text-center shadow-soft dark:shadow-soft-dark">
          <Sparkles size={20} className="mx-auto mb-2 text-white" />
          <h3 className="mb-2 font-display text-[19px] font-bold text-white">Esto es solo el resumen.</h3>
          <p className="mx-auto mb-[18px] max-w-[420px] text-[13.5px] text-white/85">
            Tu informe completo desglosa cada uno de los 25 retos, tu tiempo por categoría y un plan de práctica de 14 días.
          </p>
          <button
            type="button"
            onClick={onUnlock}
            className="inline-flex items-center gap-2 rounded-[13px] bg-white px-6 py-[13px] text-[14.5px] font-bold text-petrol transition-transform hover:-translate-y-px"
          >
            Ver informe completo <ArrowRight size={16} />
          </button>
        </div>

        <p className="mt-[18px] text-center text-[11px] text-text-soft">
          Resultado con fines de autoconocimiento y entretenimiento educativo. No constituye un diagnóstico clínico ni un
          test psicométrico validado.
        </p>
      </div>
    </div>
  );
}
