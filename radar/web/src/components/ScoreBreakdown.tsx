import { SCORE_DISCLAIMER, scoreTier } from "@/lib/scoring";
import type { ScoreSignal } from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";

export function ScoreBreakdown({ score, signals }: { score: number; signals: ScoreSignal[] }) {
  const tier = scoreTier(score);
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Puntuación de oportunidad</h2>
          <p className="text-xs text-soft">{tier.label} · orientativa</p>
        </div>
        <ScoreBadge score={score} size="lg" />
      </div>
      <ul className="mt-4 space-y-3">
        {signals.map((s) => (
          <li key={s.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="tabular-nums text-soft">
                {s.points.toLocaleString("es")} / {s.max}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (s.points / s.max) * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-text">{s.observed}</p>
            <p className="text-xs text-soft">{s.explanation}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-lg bg-amber-soft p-3 text-xs text-amber">{SCORE_DISCLAIMER}</p>
    </section>
  );
}
