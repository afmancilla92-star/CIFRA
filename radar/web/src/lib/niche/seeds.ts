/**
 * Palabras de búsqueda por nicho para el radar automático. Además de la
 * palabra principal del catálogo, cada nicho tiene alternativas: el radar va
 * rotando una por día para traer anuncios distintos sin hacer más búsquedas.
 */
import { NICHES } from "./catalog";

const ALT_SEEDS: Record<string, string[]> = {
  salud: ["dolor articular", "tratamiento natural"],
  salud_mental: ["terapia online", "estrés"],
  educacion: ["maestría", "becas"],
  cursos: ["masterclass", "certificado online"],
  fitness: ["entrenamiento en casa", "gimnasio"],
  nutricion: ["bajar de peso", "plan de alimentación"],
  desarrollo_personal: ["hábitos", "mentalidad"],
  crianza: ["bebé", "maternidad"],
  suplementos: ["colágeno", "proteína"],
  espiritualidad: ["tarot", "ley de atracción"],
  productividad: ["planner", "gestión del tiempo"],
  religion: ["oración", "devocional"],
  belleza: ["maquillaje", "cuidado del cabello"],
  marketing: ["facebook ads", "embudo de ventas"],
  relaciones: ["recuperar a tu ex", "matrimonio"],
  ia: ["chatgpt", "automatización con ia"],
  finanzas: ["préstamos", "educación financiera"],
  gastronomia: ["repostería", "curso de cocina"],
  emprendimiento: ["negocio propio", "ingresos extra"],
  software: ["crm", "facturación electrónica"],
  idiomas: ["curso de inglés", "aprender francés"],
  hogar: ["muebles", "organizador"],
  empleo: ["vacantes", "hoja de vida"],
  mascotas: ["gatos", "alimento para perros"],
  musica: ["clases de piano", "producción musical"],
  coaching: ["coaching", "consultoría"],
  contenido: ["editar videos", "monetizar"],
  diseno: ["canva", "ilustración"],
  gaming: ["videojuegos", "gamer"],
  ecommerce: ["dropshipping", "tienda online"],
  seguros: ["seguro de salud", "soat"],
  moda: ["zapatillas", "ropa hombre"],
  inversiones: ["fondos de inversión", "renta pasiva"],
  ventas: ["técnicas de venta", "ventas por whatsapp"],
  fotografia: ["curso de fotografía", "edición de video"],
  trading: ["forex", "criptomonedas"],
  eventos: ["festival", "boletas"],
  legal: ["visa americana", "abogados"],
  viajes: ["vuelos", "paquetes turísticos"],
  inmobiliaria: ["proyecto de vivienda", "arriendo"],
  leads: ["solicita información", "agenda tu cita"],
  tecnologia: ["smartwatch", "celulares"],
  automotriz: ["camionetas", "motos"],
  alimentos: ["café de especialidad", "bebidas"],
  servicios: ["remodelación", "paneles solares"],
};

/** Palabras de búsqueda de un nicho: la principal primero. */
export function nicheSeeds(id: string): string[] {
  const def = NICHES.find((n) => n.id === id);
  if (!def) return [];
  return Array.from(new Set([def.seed, ...(ALT_SEEDS[id] ?? [])]));
}
