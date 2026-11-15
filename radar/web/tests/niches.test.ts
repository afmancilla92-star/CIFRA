import { describe, expect, it } from "vitest";
import { NICHES } from "@/lib/niche/catalog";
import { classifyByRules } from "@/lib/niche/rules";

// Un anuncio típico por nicho: debe quedar en su nicho como principal.
const SAMPLES: Record<string, string> = {
  salud: "Alivia el dolor articular y la inflamación con este tratamiento natural. Agenda con nuestro médico.",
  salud_mental: "Terapia online para la ansiedad y el estrés. Habla hoy con un psicólogo.",
  educacion: "Inscripciones abiertas: pregrado y maestría en nuestra universidad. Becas disponibles.",
  cursos: "Curso online con certificado: aprende desde casa, a tu ritmo, con acceso de por vida.",
  fitness: "Rutina de ejercicios en casa: gana masa muscular con tu entrenador personal.",
  nutricion: "Plan de alimentación para bajar de peso sin dietas extremas. Recetas saludables cada semana.",
  desarrollo_personal: "Cambia tus hábitos y tu mentalidad: un programa de crecimiento personal.",
  crianza: "Guía para mamá primeriza: lactancia, sueño del bebé y rabietas.",
  suplementos: "Colágeno hidrolizado con vitamina C y magnesio. Cápsulas para 30 días.",
  espiritualidad: "Lectura de tarot y carta astral. Aprende a meditar y manifestar abundancia.",
  productividad: "Vence la procrastinación: plantilla de Notion y planificador para tu rutina diaria.",
  religion: "Devocional diario: un versículo de la Biblia y una oración para tu día.",
  belleza: "Sérum antiarrugas y crema facial: tu rutina de skincare en 3 pasos.",
  marketing: "Aprende marketing digital: Facebook Ads, embudos y copywriting para tu marca.",
  relaciones: "Cómo reconquistar a tu ex pareja y sanar tu relación. Guía para tu matrimonio.",
  ia: "Domina ChatGPT y la inteligencia artificial: prompts y agentes de IA para tu trabajo.",
  finanzas: "Sal de deudas y ordena tus finanzas personales. Préstamos de libre inversión.",
  gastronomia: "Recetas fáciles para el almuerzo: aprende a cocinar con nuestro chef.",
  emprendimiento: "Emprende tu negocio propio y genera ingresos extra trabajando desde casa.",
  software: "Software contable con facturación electrónica. Prueba gratis el CRM para tu empresa.",
  idiomas: "Aprender inglés es fácil: clases de inglés con profesor nativo y práctica de conversación.",
  hogar: "Muebles y decoración para tu sala: sofá, lámparas y alfombras con descuento.",
  empleo: "Estamos contratando: vacantes abiertas. Envía tu hoja de vida y postúlate hoy.",
  mascotas: "Alimento para perros y gatos. Arnés antitirones para tu mascota.",
  musica: "Clases de guitarra y piano online. Aprende a cantar desde cero.",
  coaching: "Mentoría 1 a 1: agenda una llamada gratuita con tu coach.",
  contenido: "Conviértete en creador de contenido: aprende a editar videos y monetizar tus reels.",
  diseno: "Curso de diseño gráfico con Canva y Photoshop. Aprende ilustración y caligrafía.",
  gaming: "Nueva consola PlayStation y los mejores videojuegos del año.",
  ecommerce: "Aprende dropshipping y monta tu tienda online en Shopify con productos ganadores.",
  seguros: "Seguro de vida y póliza de salud para tu familia. Cotiza con nuestra aseguradora.",
  moda: "Nueva colección: vestidos, blusas y jeans para esta temporada.",
  inversiones: "Aprende a invertir en la bolsa de valores: ETF, dividendos y renta pasiva.",
  ventas: "Técnicas de venta para cerrar ventas por WhatsApp y manejar objeciones.",
  fotografia: "Curso de fotografía: domina tu cámara, Lightroom y la edición de fotos.",
  trading: "Señales de trading en forex y criptomonedas. Aprende análisis técnico.",
  eventos: "Concierto en vivo este sábado: boletas disponibles para el festival.",
  legal: "Abogados expertos en migración: visa americana, ciudadanía y trámites.",
  viajes: "Vuelos y hoteles todo incluido: paquetes turísticos para tus vacaciones.",
  inmobiliaria: "Apartamentos en venta: proyecto de vivienda con arriendo y lotes campestres.",
  leads: "Solicita información y déjanos tus datos: un asesor te contactará. Cotiza gratis.",
  tecnologia: "Audífonos bluetooth y smartwatch con cargador inalámbrico para tu celular.",
  automotriz: "Camionetas y SUV 0km en nuestro concesionario. Agenda tu test drive.",
  alimentos: "Snacks saludables: granola, galletas y bebidas listas para tu merienda.",
  servicios: "Electricista y plomero a domicilio. Remodelación e instalación de paneles solares.",
};

describe("nichos", () => {
  it("hay un ejemplo por cada nicho", () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(NICHES.map((n) => n.id).sort());
  });

  it.each(Object.entries(SAMPLES))("%s", (id, body) => {
    const r = classifyByRules({ body });
    expect(r.niches, `${id}: ${JSON.stringify(r)}`).toContain(id);
  });

  // Casos vistos en anuncios reales de catálogos de tiendas (marketplaces):
  // el título es el producto y el texto es una promoción genérica de la app.
  const promoApp = "【Solo nuevos usuarios app】¡Descarga la app hoy y aprovecha ofertas exclusivas!";
  it.each([
    [{ title: "Vestido de tirantes para verano, adecuado para fiestas, citas y vacaciones", body: promoApp }, "moda"],
    [{ title: "Zapatillas de Running para Mujer", body: "¡Exclusivo para nuestros usuarios frecuentes! Compra más y ahorra más" }, "moda"],
    [{ title: "Funda para Teléfono compatible con iPhone 15, cubierta para cámara", body: promoApp }, "tecnologia"],
    [{ title: "Cojines para sillas de comedor, juego de 6", body: "Compra más y ahorra más con nuestros descuentos" }, "hogar"],
    [{ title: "Portatarjetas de crédito de cuero sintético", body: "¡Ahorra cada día con nuestros descuentos!" }, "moda"],
    [{ title: "Elegant Women's Suit Set, Perfect For Commuting And Dating, Tweed Blazer + Skirt", body: "Descarga la aplicación" }, "moda"],
    [{ title: "Nueva mochila escolar para mujer, mochila de negocios para laptop", body: "Compra más y ahorra más" }, "moda"],
    [{ title: "Botas color café para hombre", body: "Envío a domicilio. Pago seguro con tarjeta de crédito o en cuotas." }, "moda"],
  ])("producto de tienda %#", (input, niche) => {
    const r = classifyByRules(input);
    expect(r.niche, JSON.stringify(r)).toBe(niche);
    for (const wrong of ["software", "finanzas", "relaciones", "gaming", "viajes", "seguros", "alimentos", "gastronomia", "fotografia"]) {
      expect(r.niches, JSON.stringify(r)).not.toContain(wrong);
    }
  });

  it("una palabra genérica repetida no define el nicho", () => {
    expect(classifyByRules({ body: "Descarga la app. La app es gratis. Abre la app." }).niche).toBeNull();
    expect(classifyByRules({ body: "Compra unas zapatillas y unas medias" }).niches).not.toContain("belleza");
    expect(classifyByRules({ body: "Uñas acrílicas y manicure a domicilio" }).niche).toBe("belleza");
  });
});
