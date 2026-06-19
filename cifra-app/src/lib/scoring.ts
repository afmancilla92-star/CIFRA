import { QUESTIONS, TOTAL_QUESTIONS } from "@/data/questions";
import type { Answer, Dimension, DimensionScores } from "@/lib/types";

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Convierte el número de aciertos en un puntaje estimado entre 80 y 145.
 * Curva lineal simple: cada acierto aporta una fracción proporcional
 * del rango total. No es un instrumento psicométrico validado.
 */
export function computeScore(answers: Answer[]): number {
  const correctCount = answers.filter((a) => a.correct).length;
  return clamp(Math.round(85 + (correctCount / TOTAL_QUESTIONS) * 60), 80, 145);
}

/**
 * Percentil ilustrativo asociado a un puntaje, en escalones.
 */
export function percentileForScore(score: number): number {
  if (score >= 140) return 99;
  if (score >= 130) return 97;
  if (score >= 120) return 91;
  if (score >= 112) return 80;
  if (score >= 105) return 64;
  if (score >= 100) return 50;
  if (score >= 92) return 32;
  return 16;
}

const DIMENSIONS: Dimension[] = ["logica", "patrones", "memoria", "espacial"];

/**
 * Calcula el puntaje (0-100) por cada una de las 5 dimensiones del radar:
 * las 4 dimensiones de contenido (según aciertos) + velocidad (según el
 * tiempo total invertido frente al tiempo sugerido por el banco).
 */
export function computeDimensionScores(answers: Answer[], totalElapsedMs: number): DimensionScores {
  const accumulator: Record<Dimension, { correct: number; total: number }> = {
    logica: { correct: 0, total: 0 },
    patrones: { correct: 0, total: 0 },
    memoria: { correct: 0, total: 0 },
    espacial: { correct: 0, total: 0 },
  };

  answers.forEach((a) => {
    const bucket = accumulator[a.dimension];
    bucket.total += 1;
    if (a.correct) bucket.correct += 1;
  });

  const recommendedTotalMs = QUESTIONS.reduce((sum, q) => sum + q.recommendedSeconds * 1000, 0);
  const speedScore = clamp(Math.round((recommendedTotalMs / Math.max(totalElapsedMs, 1)) * 62), 35, 99);

  const scoreFor = (d: Dimension) => {
    const { correct, total } = accumulator[d];
    return total > 0 ? Math.round((correct / total) * 100) : 70;
  };

  return {
    logica: scoreFor("logica"),
    patrones: scoreFor("patrones"),
    memoria: scoreFor("memoria"),
    espacial: scoreFor("espacial"),
    velocidad: speedScore,
  };
}

export function topAndGrowthDimensions(scores: DimensionScores) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return {
    strengths: sorted.slice(0, 2) as [string, number][],
    growth: sorted.slice(-2) as [string, number][],
  };
}

export { DIMENSIONS };
