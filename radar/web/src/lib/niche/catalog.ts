/**
 * Catálogo de nichos. Las palabras clave están normalizadas (minúsculas, sin
 * tildes) en español, portugués e inglés. "strong" pesa el doble.
 */
export interface NicheDef {
  id: string;
  label: string;
  strong: string[];
  weak: string[];
  /** Coincidencias con categorías de página de Meta (p. ej. "Health/beauty"). */
  categories?: string[];
}

export const NICHES: NicheDef[] = [
  {
    id: "salud",
    label: "Salud y bienestar",
    strong: ["suplemento", "suplementos", "colageno", "vitamina", "vitaminas", "probiotico", "dolor articular", "articulaciones", "menopausia", "diabetes", "presion arterial", "colesterol", "insomnio", "ansiedad", "digestion", "intestino", "detox", "adelgazar", "bajar de peso", "perder peso", "emagrecer", "weight loss", "supplement", "gut health", "nutricionista", "clinica", "odontologia", "dentista"],
    weak: ["salud", "saude", "health", "bienestar", "bem estar", "wellness", "natural", "energia", "inflamacion", "medico", "doctor", "terapia", "fisioterapia", "sueno", "dormir"],
    categories: ["health", "medical", "doctor", "hospital", "dentist", "nutrition", "pharmacy", "salud"],
  },
  {
    id: "belleza",
    label: "Belleza y cuidado personal",
    strong: ["serum", "skincare", "skin care", "crema facial", "antiarrugas", "arrugas", "manchas", "acne", "maquillaje", "maquiagem", "makeup", "cabello", "caida del cabello", "shampoo", "champu", "pestanas", "unas", "perfume", "fragancia", "depilacion", "protector solar", "rutina facial", "cosmetico", "cosmeticos", "labial"],
    weak: ["belleza", "beleza", "beauty", "piel", "pele", "skin", "rostro", "glow", "hidratacion", "cuidado personal", "spa", "estetica", "salon"],
    categories: ["beauty", "cosmetic", "skin care", "hair salon", "barber", "spa", "perfume"],
  },
  {
    id: "moda",
    label: "Moda y calzado",
    strong: ["vestido", "vestidos", "zapatillas", "sneakers", "calzado", "zapatos", "jeans", "remera", "camiseta", "camisa", "blusa", "lenceria", "ropa interior", "bikini", "traje de bano", "chaqueta", "campera", "moda", "fashion", "outfit", "coleccion", "colecao", "talles", "tallas", "bolsos", "carteras", "tenis", "sandalias", "chanclas", "pantuflas", "slippers", "botas", "botines", "mocasines", "tacones", "shoes", "sandals", "dress", "apparel", "leggins", "pijama", "pijamas", "sudadera", "buzo", "hoodie"],
    weak: ["ropa", "roupa", "clothing", "estilo", "look", "tendencia", "temporada", "prenda", "nueva coleccion", "boutique"],
    categories: ["clothing", "fashion", "shoe", "apparel", "boutique", "ropa"],
  },
  {
    id: "joyeria",
    label: "Joyería, relojes y accesorios",
    strong: ["joyeria", "joias", "jewelry", "anillo", "anillos", "collar", "collares", "aretes", "pendientes", "pulsera", "pulseras", "reloj", "relojes", "watch", "plata 925", "oro 18k", "acero quirurgico", "lentes de sol", "gafas"],
    weak: ["accesorios", "acessorios", "accessories", "dije", "joya"],
    categories: ["jewelry", "watch", "accessories", "eyewear"],
  },
  {
    id: "fitness",
    label: "Fitness y deporte",
    strong: ["gimnasio", "gym", "entrenamiento", "treino", "workout", "rutina de ejercicios", "musculo", "masa muscular", "proteina", "whey", "creatina", "pilates", "yoga", "crossfit", "running", "abdominales", "gluteos", "entrenador personal", "personal trainer"],
    weak: ["fitness", "deporte", "esporte", "sport", "ejercicio", "exercicio", "cardio", "atleta", "bicicleta", "futbol"],
    categories: ["gym", "fitness", "sports", "athlete", "yoga"],
  },
  {
    id: "educacion",
    label: "Educación y cursos",
    strong: ["curso", "cursos", "masterclass", "clase gratis", "aula gratuita", "certificado", "certificacion", "diplomado", "maestria", "universidad", "ingles", "aprende", "aprender", "aprenda", "capacitacion", "formacion", "bootcamp", "webinar", "mentoria", "taller", "workshop", "inscripciones", "matriculas", "beca"],
    weak: ["educacion", "educacao", "education", "estudiar", "estudar", "alumnos", "escuela", "academia", "online course", "clases", "profesor"],
    categories: ["education", "school", "college", "university", "tutor", "educational"],
  },
  {
    id: "negocios",
    label: "Negocios y marketing digital",
    strong: ["emprendedor", "emprendedores", "emprender", "ecommerce", "e commerce", "tienda online", "dropshipping", "marketing digital", "trafico pago", "facebook ads", "meta ads", "embudo", "ventas online", "vender por internet", "agencia de marketing", "infoproducto", "afiliados", "lanzamiento", "clientes potenciales", "leads", "escalar tu negocio", "negocio digital"],
    weak: ["negocio", "negocios", "business", "empresa", "marketing", "ventas", "vendas", "facturar", "ingresos", "estrategia", "marca personal", "freelance"],
    categories: ["marketing", "advertising", "consulting", "business"],
  },
  {
    id: "finanzas",
    label: "Finanzas e inversiones",
    strong: ["invertir", "inversion", "investir", "investimento", "trading", "forex", "criptomonedas", "cripto", "bitcoin", "acciones", "bolsa de valores", "prestamo", "prestamos", "credito", "tarjeta de credito", "seguro de vida", "seguros", "hipoteca", "ahorro", "billetera", "fintech", "cuenta digital", "rendimiento"],
    weak: ["finanzas", "financas", "finance", "dinero", "dinheiro", "money", "banco", "pagos", "libertad financiera", "renta pasiva"],
    categories: ["finance", "bank", "insurance", "financial", "investing", "cryptocurrency"],
  },
  {
    id: "inmobiliaria",
    label: "Inmobiliaria",
    strong: ["departamento", "departamentos", "apartamento", "apartamentos", "casa en venta", "venta de casas", "alquiler", "arriendo", "inmobiliaria", "imobiliaria", "real estate", "lotes", "terrenos", "preventa", "condominio", "bienes raices", "propiedad", "propiedades", "ambientes"],
    weak: ["casa propia", "hogar propio", "credito hipotecario", "metros cuadrados", "m2", "entrega inmediata"],
    categories: ["real estate", "property", "apartment", "inmobiliaria"],
  },
  {
    id: "tecnologia",
    label: "Tecnología y gadgets",
    strong: ["smartphone", "celular", "iphone", "android", "auriculares", "audifonos", "fone de ouvido", "smartwatch", "laptop", "notebook", "computadora", "tablet", "gadget", "cargador", "bluetooth", "parlante", "camara de seguridad", "drone", "consola", "software", "saas", "inteligencia artificial", "ia ", "chatgpt", "app para"],
    weak: ["tecnologia", "technology", "tech", "digital", "wifi", "inteligente", "electronica", "pantalla", "bateria"],
    categories: ["electronics", "software", "computer", "technology", "internet company", "app page"],
  },
  {
    id: "hogar",
    label: "Hogar y decoración",
    strong: ["decoracion", "decoracao", "home decor", "muebles", "moveis", "furniture", "colchon", "colchones", "sabanas", "cocina", "utensilios", "organizador", "iluminacion", "lampara", "alfombra", "cortinas", "jardin", "limpieza", "aspiradora", "electrodomesticos", "freidora", "sofa"],
    weak: ["hogar", "casa", "home", "living", "dormitorio", "bano", "ambiente"],
    categories: ["home decor", "furniture", "home improvement", "kitchen", "household", "garden"],
  },
  {
    id: "mascotas",
    label: "Mascotas",
    strong: ["perro", "perros", "gato", "gatos", "cachorro", "mascota", "mascotas", "pet shop", "veterinaria", "veterinario", "alimento para perros", "racao", "dog", "cat", "pets", "arnes", "collar para perro", "arena para gatos"],
    weak: ["peludo", "peludos", "animal", "animales", "adiestramiento"],
    categories: ["pet", "veterinarian", "animal"],
  },
  {
    id: "alimentacion",
    label: "Alimentación y bebidas",
    strong: ["restaurante", "delivery", "pizza", "hamburguesa", "sushi", "cafe", "cerveza", "vino", "vinos", "receta", "recetas", "comida", "alimentos", "snack", "chocolate", "panaderia", "pasteleria", "menu", "almuerzo", "cena", "bebida", "gourmet", "organico", "vegano"],
    weak: ["sabor", "delicioso", "rico", "hambre", "food", "comer", "cocinar", "platos"],
    categories: ["restaurant", "food", "beverage", "bakery", "cafe", "grocery", "winery", "brewery"],
  },
  {
    id: "viajes",
    label: "Viajes y turismo",
    strong: ["vuelos", "pasajes", "passagens", "hotel", "hoteles", "resort", "paquetes turisticos", "vacaciones", "ferias", "travel", "crucero", "all inclusive", "todo incluido", "agencia de viajes", "excursion", "tour", "hospedaje", "airbnb", "destino"],
    weak: ["viaje", "viajar", "viagem", "turismo", "playa", "praia", "aventura", "escapada"],
    categories: ["travel", "hotel", "tour", "airline", "tourism"],
  },
  {
    id: "automotriz",
    label: "Automotriz y movilidad",
    strong: ["auto", "autos", "carro", "carros", "coche", "vehiculo", "vehiculos", "camioneta", "suv", "concesionario", "concesionaria", "0km", "0 km", "test drive", "neumaticos", "llantas", "repuestos", "taller mecanico", "moto", "motos", "motocicleta", "scooter electrico"],
    weak: ["manejar", "conducir", "motor", "financiacion", "kilometros", "seminuevo", "usados"],
    categories: ["automotive", "car dealership", "motorcycle", "vehicle", "auto"],
  },
  {
    id: "bebes",
    label: "Bebés y maternidad",
    strong: ["bebe", "bebes", "embarazo", "embarazada", "gestante", "lactancia", "maternidad", "panales", "fraldas", "recien nacido", "baby", "mama primeriza", "cochecito", "carriola", "juguetes", "infantil", "ninos", "criancas"],
    weak: ["hijos", "hijo", "mamas", "maes", "familia", "crianza"],
    categories: ["baby", "kids", "children", "toy", "maternity"],
  },
  {
    id: "apps_juegos",
    label: "Apps y juegos",
    strong: ["descarga la app", "descargar", "baixe", "download", "app store", "google play", "juego", "jogo", "game", "gaming", "jugar", "casino", "apuestas", "slots", "bonus de bienvenida"],
    weak: ["aplicacion", "aplicativo", "app", "nivel", "jugadores", "online"],
    categories: ["app page", "video game", "games", "gaming", "casino"],
  },
  {
    id: "desarrollo_personal",
    label: "Desarrollo personal y espiritualidad",
    strong: ["autoestima", "mentalidad", "mindset", "coaching", "coach", "proposito de vida", "manifestar", "ley de atraccion", "meditacion", "espiritualidad", "tarot", "astrologia", "horoscopo", "energia espiritual", "sanacion", "constelaciones", "relaciones de pareja", "reconquistar"],
    weak: ["transformacion", "crecimiento personal", "abundancia", "sanar", "felicidad", "emociones"],
    categories: ["coach", "spiritual", "religious", "astrologist", "life coach", "psychologist"],
  },
  {
    id: "servicios",
    label: "Servicios profesionales",
    strong: ["abogado", "abogados", "advogado", "estudio juridico", "contador", "contabilidad", "impuestos", "asesoria", "consultoria", "seguro", "plomero", "electricista", "mudanzas", "fletes", "limpieza de oficinas", "agencia", "estudio contable", "arquitecto", "remodelacion", "reformas", "energia solar", "paneles solares"],
    weak: ["servicio", "servicios", "servicos", "services", "presupuesto", "cotiza", "cotizacion", "profesionales", "atencion"],
    categories: ["lawyer", "legal", "accountant", "contractor", "service", "consulting", "plumber", "electrician", "solar"],
  },
  {
    id: "eventos",
    label: "Eventos y entretenimiento",
    strong: ["entradas", "ingressos", "tickets", "concierto", "show", "festival", "evento", "eventos", "teatro", "cine", "estreno", "streaming", "serie", "pelicula", "conferencia", "congreso", "expo"],
    weak: ["entretenimiento", "musica", "en vivo", "ao vivo", "live", "noche"],
    categories: ["event", "musician", "band", "concert", "entertainment", "movie", "tv"],
  },
];

export const NICHE_LABELS: Record<string, string> = Object.fromEntries(NICHES.map((n) => [n.id, n.label]));

export function nicheLabel(id: string | null | undefined): string {
  if (!id) return "Sin clasificar";
  return NICHE_LABELS[id] ?? id;
}
