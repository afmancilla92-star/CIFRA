import type { RadarDimension } from "@/lib/types";

export const DIMENSION_LABELS: Record<RadarDimension, string> = {
  logica: "Lógica",
  patrones: "Patrones",
  memoria: "Memoria",
  espacial: "Visión espacial",
  velocidad: "Velocidad",
};

export const DIMENSION_COPY: Record<RadarDimension, { strength: string; growth: string }> = {
  logica: {
    strength: "Construyes conclusiones sólidas a partir de premisas, incluso cuando la información es parcial.",
    growth: "Practicar problemas con varias premisas encadenadas puede afinar aún más tu precisión deductiva.",
  },
  patrones: {
    strength: "Detectas regularidades y relaciones ocultas con rapidez, una habilidad clave en análisis de datos.",
    growth: "Ejercicios con matrices de dos variables simultáneas pueden llevar este punto fuerte más lejos.",
  },
  memoria: {
    strength: "Retienes y manipulas información temporal con buena fidelidad bajo presión de tiempo.",
    growth: "Técnicas de fragmentación (chunking) pueden ampliar tu capacidad de retención activa.",
  },
  espacial: {
    strength: "Visualizas transformaciones y rotaciones de objetos con claridad mental.",
    growth: "Practicar plegado de figuras 3D en la mente refuerza este tipo de razonamiento.",
  },
  velocidad: {
    strength: "Procesas la información con agilidad sin sacrificar precisión.",
    growth: "Bajar el ritmo en los reactivos más densos puede mejorar tu tasa de acierto sin perder fluidez.",
  },
};
