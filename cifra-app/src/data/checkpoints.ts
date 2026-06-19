export interface QuizCheckpoint {
  afterQuestion: number;
  eyebrow: string;
  title: string;
  text: string;
}

export const CHECKPOINTS: QuizCheckpoint[] = [
  {
    afterQuestion: 7,
    eyebrow: "PRIMERA PARADA",
    title: "Vas muy bien.",
    text: "Completaste la primera tanda de retos. Lo que sigue sube un poco el nivel — tómate tu tiempo.",
  },
  {
    afterQuestion: 14,
    eyebrow: "MITAD DEL CAMINO",
    title: "Justo a la mitad.",
    text: "Tu enfoque hasta acá se nota. Quedan 11 retos, cada vez un poco más interesantes.",
  },
  {
    afterQuestion: 21,
    eyebrow: "RECTA FINAL",
    title: "Esto ya casi termina.",
    text: "Quedan los retos más exigentes de todos — y ya superaste la parte más larga del camino.",
  },
];
