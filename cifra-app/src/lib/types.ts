export type Dimension = "logica" | "patrones" | "memoria" | "espacial";

export type RadarDimension = Dimension | "velocidad";

export type Difficulty = "Fácil" | "Medio" | "Difícil";

export type QuestionType = "standard" | "matrix" | "memory" | "rotate";

export interface RotateOption {
  rot: number;
  flip?: boolean;
}

export interface BaseQuestion {
  id: number;
  category: string;
  dimension: Dimension;
  difficulty: Difficulty;
  type: QuestionType;
  prompt: string;
  explanation: string;
  recommendedSeconds: number;
}

export interface StandardQuestion extends BaseQuestion {
  type: "standard";
  options: string[];
  correct: number;
  visualSequence?: string[];
}

export interface MatrixQuestion extends BaseQuestion {
  type: "matrix";
  grid: (string | null)[];
  options: string[];
  correct: number;
}

export interface MemoryQuestion extends BaseQuestion {
  type: "memory";
  sequence: string[];
  memorizeSeconds: number;
  options: string[];
  correct: number;
}

export interface RotateQuestion extends BaseQuestion {
  type: "rotate";
  baseRotation: number;
  options: RotateOption[];
  correct: number;
}

export type Question = StandardQuestion | MatrixQuestion | MemoryQuestion | RotateQuestion;

export interface Answer {
  questionId: number;
  correct: boolean;
  dimension: Dimension;
  elapsedMs: number;
}

export type DimensionScores = Record<RadarDimension, number>;
