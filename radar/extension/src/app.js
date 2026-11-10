// Archivo generado por radar/web/scripts/build-extension.mjs — no editar a mano.
"use strict";
(() => {
  // src/lib/dates.ts
  var DAY = 864e5;
  function toIsoDate(d) {
    return d.toISOString().slice(0, 10);
  }
  function parseDateValue(value) {
    if (value === null || value === void 0 || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      const ms = value < 1e12 ? value * 1e3 : value;
      return toIsoDate(new Date(ms));
    }
    if (typeof value === "string") {
      const s = value.trim();
      if (/^\d{9,13}$/.test(s)) return parseDateValue(Number(s));
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return toIsoDate(d);
    }
    return null;
  }
  var MONTHS = {
    // español
    ene: 1,
    enero: 1,
    feb: 2,
    febrero: 2,
    mar: 3,
    marzo: 3,
    abr: 4,
    abril: 4,
    may: 5,
    mayo: 5,
    jun: 6,
    junio: 6,
    jul: 7,
    julio: 7,
    ago: 8,
    agosto: 8,
    sep: 9,
    sept: 9,
    septiembre: 9,
    set: 9,
    setiembre: 9,
    oct: 10,
    octubre: 10,
    nov: 11,
    noviembre: 11,
    dic: 12,
    diciembre: 12,
    // portugués
    fev: 2,
    fevereiro: 2,
    marco: 3,
    mai: 5,
    maio: 5,
    junho: 6,
    julho: 7,
    setembro: 9,
    out: 10,
    outubro: 10,
    novembro: 11,
    dez: 12,
    dezembro: 12,
    janeiro: 1,
    jan: 1,
    // inglés
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    june: 6,
    july: 7,
    aug: 8,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    dec: 12,
    december: 12
  };
  function parseLibraryDateText(text) {
    const t = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\./g, " ");
    let m = t.match(/(\d{1,2})\s+(?:de\s+)?([a-z]{3,10})\s+(?:de\s+)?(\d{4})/);
    if (m) {
      const month = MONTHS[m[2]];
      if (month) return iso(Number(m[3]), month, Number(m[1]));
    }
    m = t.match(/([a-z]{3,10})\s+(\d{1,2}),?\s+(\d{4})/);
    if (m) {
      const month = MONTHS[m[1]];
      if (month) return iso(Number(m[3]), month, Number(m[2]));
    }
    m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return iso(Number(m[3]), Number(m[2]), Number(m[1]));
    return null;
  }
  function iso(y, mo, d) {
    if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  function daysActive(startDate, opts) {
    if (!startDate) return null;
    const start = Date.parse(`${startDate}T00:00:00Z`);
    if (Number.isNaN(start)) return null;
    const now = opts.now ?? /* @__PURE__ */ new Date();
    let end = now.getTime();
    if (!opts.isActive) {
      const stop = opts.stopDate ? Date.parse(`${opts.stopDate}T00:00:00Z`) : NaN;
      const seen = opts.lastSeenAt ? Date.parse(opts.lastSeenAt) : NaN;
      if (!Number.isNaN(stop)) end = stop;
      else if (!Number.isNaN(seen)) end = seen;
    }
    return Math.max(0, Math.floor((end - start) / DAY));
  }
  function isoWeekKey(date) {
    const d = /* @__PURE__ */ new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / DAY - 3 + (firstThursday.getUTCDay() + 6) % 7) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  // src/lib/format.ts
  var dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  var numFmt = new Intl.NumberFormat("es");
  function fmtDate(iso2) {
    if (!iso2) return "—";
    const d = new Date(iso2.length === 10 ? `${iso2}T00:00:00Z` : iso2);
    return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
  }
  function fmtNum(n) {
    return n === null || n === void 0 ? "—" : numFmt.format(n);
  }
  function fmtDays(n) {
    if (n === null || n === void 0) return "—";
    if (n === 0) return "Hoy";
    return `${numFmt.format(n)} ${n === 1 ? "día" : "días"}`;
  }
  function timeAgo(iso2, now = /* @__PURE__ */ new Date()) {
    if (!iso2) return "nunca";
    const diff = now.getTime() - new Date(iso2).getTime();
    const m = Math.round(diff / 6e4);
    if (m < 1) return "hace instantes";
    if (m < 60) return `hace ${m} min`;
    const h2 = Math.round(m / 60);
    if (h2 < 24) return `hace ${h2} h`;
    const d = Math.round(h2 / 24);
    return `hace ${d} ${d === 1 ? "día" : "días"}`;
  }
  var PLATFORM_LABELS = {
    facebook: { short: "FB", label: "Facebook" },
    instagram: { short: "IG", label: "Instagram" },
    messenger: { short: "MSG", label: "Messenger" },
    audience_network: { short: "AN", label: "Audience Network" },
    whatsapp: { short: "WA", label: "WhatsApp" },
    threads: { short: "TH", label: "Threads" }
  };
  var FORMAT_LABELS = {
    image: "Imagen",
    video: "Video",
    carousel: "Carrusel",
    dco: "Dinámico",
    text: "Solo texto",
    unknown: "Sin creatividad"
  };
  function libraryPageUrl(pageId) {
    return /^\d+$/.test(pageId) ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=${pageId}` : null;
  }

  // src/lib/lang.ts
  var STOPWORDS = {
    es: ["el", "la", "los", "las", "de", "del", "que", "y", "en", "un", "una", "para", "con", "por", "tu", "tus", "es", "mas", "nuestro", "nuestra", "ahora", "aqui", "hoy", "envio", "compra", "gratis", "solo", "cuando", "como", "pero", "muy", "sin", "lo"],
    pt: ["o", "a", "os", "as", "de", "do", "da", "dos", "das", "que", "e", "em", "um", "uma", "para", "com", "por", "voce", "seu", "sua", "mais", "agora", "aqui", "hoje", "frete", "nao", "sao", "esta", "muito", "sem", "compre", "nosso"],
    en: ["the", "and", "of", "to", "in", "for", "with", "you", "your", "is", "on", "our", "now", "get", "this", "that", "free", "shop", "today", "are", "it", "at", "from", "new", "more", "only"],
    fr: ["le", "la", "les", "de", "des", "du", "et", "en", "un", "une", "pour", "avec", "vous", "votre", "est", "sur", "nos", "plus", "maintenant", "livraison", "gratuite", "aujourd", "dans", "pas"],
    it: ["il", "lo", "la", "gli", "le", "di", "del", "della", "che", "e", "per", "con", "un", "una", "tuo", "tua", "piu", "ora", "spedizione", "gratuita", "oggi", "sono", "non", "nel"],
    de: ["der", "die", "das", "und", "zu", "mit", "fur", "ist", "ein", "eine", "dein", "deine", "jetzt", "auf", "nicht", "sie", "wir", "versand", "kostenlos", "heute", "bei", "auch", "noch"]
  };
  var LANGUAGE_NAMES = {
    es: "Español",
    pt: "Portugués",
    en: "Inglés",
    fr: "Francés",
    it: "Italiano",
    de: "Alemán"
  };
  function detectLanguage(text) {
    if (!text) return null;
    const words = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
    if (words.length < 4) return null;
    let best = null;
    let bestScore = 0;
    let second = 0;
    for (const [lang, list] of Object.entries(STOPWORDS)) {
      const set = new Set(list);
      const score = words.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0);
      if (score > bestScore) {
        second = bestScore;
        bestScore = score;
        best = lang;
      } else if (score > second) {
        second = score;
      }
    }
    if (bestScore < 2 || bestScore - second < 1) return null;
    return best;
  }

  // src/lib/niche/catalog.ts
  var NICHES = [
    {
      id: "salud",
      label: "Salud y bienestar",
      strong: ["suplemento", "suplementos", "colageno", "vitamina", "vitaminas", "probiotico", "dolor articular", "articulaciones", "menopausia", "diabetes", "presion arterial", "colesterol", "insomnio", "ansiedad", "digestion", "intestino", "detox", "adelgazar", "bajar de peso", "perder peso", "emagrecer", "weight loss", "supplement", "gut health", "nutricionista", "clinica", "odontologia", "dentista"],
      weak: ["salud", "saude", "health", "bienestar", "bem estar", "wellness", "natural", "energia", "inflamacion", "medico", "doctor", "terapia", "fisioterapia", "sueno", "dormir"],
      categories: ["health", "medical", "doctor", "hospital", "dentist", "nutrition", "pharmacy", "salud"]
    },
    {
      id: "belleza",
      label: "Belleza y cuidado personal",
      strong: ["serum", "skincare", "skin care", "crema facial", "antiarrugas", "arrugas", "manchas", "acne", "maquillaje", "maquiagem", "makeup", "cabello", "caida del cabello", "shampoo", "champu", "pestanas", "unas", "perfume", "fragancia", "depilacion", "protector solar", "rutina facial", "cosmetico", "cosmeticos", "labial"],
      weak: ["belleza", "beleza", "beauty", "piel", "pele", "skin", "rostro", "glow", "hidratacion", "cuidado personal", "spa", "estetica", "salon"],
      categories: ["beauty", "cosmetic", "skin care", "hair salon", "barber", "spa", "perfume"]
    },
    {
      id: "moda",
      label: "Moda y calzado",
      strong: ["vestido", "vestidos", "zapatillas", "sneakers", "calzado", "zapatos", "jeans", "remera", "camiseta", "camisa", "blusa", "lenceria", "ropa interior", "bikini", "traje de bano", "chaqueta", "campera", "moda", "fashion", "outfit", "coleccion", "colecao", "talles", "tallas", "bolsos", "carteras", "tenis", "sandalias", "chanclas", "pantuflas", "slippers", "botas", "botines", "mocasines", "tacones", "shoes", "sandals", "dress", "apparel", "leggins", "pijama", "pijamas", "sudadera", "buzo", "hoodie", "pantalones", "pantalon", "falda", "faldas", "conjunto", "conjuntos", "camisetas", "ropa deportiva", "shorts", "medias"],
      weak: ["ropa", "roupa", "clothing", "estilo", "look", "tendencia", "temporada", "prenda", "nueva coleccion", "boutique"],
      categories: ["clothing", "fashion", "shoe", "apparel", "boutique", "ropa"]
    },
    {
      id: "joyeria",
      label: "Joyería, relojes y accesorios",
      strong: ["joyeria", "joias", "jewelry", "anillo", "anillos", "collar", "collares", "aretes", "pendientes", "pulsera", "pulseras", "reloj", "relojes", "watch", "plata 925", "oro 18k", "acero quirurgico", "lentes de sol", "gafas"],
      weak: ["accesorios", "acessorios", "accessories", "dije", "joya"],
      categories: ["jewelry", "watch", "accessories", "eyewear"]
    },
    {
      id: "fitness",
      label: "Fitness y deporte",
      strong: ["gimnasio", "gym", "entrenamiento", "treino", "workout", "rutina de ejercicios", "musculo", "masa muscular", "proteina", "whey", "creatina", "pilates", "yoga", "crossfit", "running", "abdominales", "gluteos", "entrenador personal", "personal trainer"],
      weak: ["fitness", "deporte", "esporte", "sport", "ejercicio", "exercicio", "cardio", "atleta", "bicicleta", "futbol"],
      categories: ["gym", "fitness", "sports", "athlete", "yoga"]
    },
    {
      id: "educacion",
      label: "Educación y cursos",
      strong: ["curso", "cursos", "masterclass", "clase gratis", "aula gratuita", "certificado", "certificacion", "diplomado", "maestria", "universidad", "ingles", "aprende", "aprender", "aprenda", "capacitacion", "formacion", "bootcamp", "webinar", "mentoria", "taller", "workshop", "inscripciones", "matriculas", "beca"],
      weak: ["educacion", "educacao", "education", "estudiar", "estudar", "alumnos", "escuela", "academia", "online course", "clases", "profesor"],
      categories: ["education", "school", "college", "university", "tutor", "educational"]
    },
    {
      id: "negocios",
      label: "Negocios y marketing digital",
      strong: ["emprendedor", "emprendedores", "emprender", "ecommerce", "e commerce", "tienda online", "dropshipping", "marketing digital", "trafico pago", "facebook ads", "meta ads", "embudo", "ventas online", "vender por internet", "agencia de marketing", "infoproducto", "afiliados", "lanzamiento", "clientes potenciales", "leads", "escalar tu negocio", "negocio digital"],
      weak: ["negocio", "negocios", "business", "empresa", "marketing", "ventas", "vendas", "facturar", "ingresos", "estrategia", "marca personal", "freelance"],
      categories: ["marketing", "advertising", "consulting", "business"]
    },
    {
      id: "finanzas",
      label: "Finanzas e inversiones",
      strong: ["invertir", "inversion", "investir", "investimento", "trading", "forex", "criptomonedas", "cripto", "bitcoin", "acciones", "bolsa de valores", "prestamo", "prestamos", "credito", "tarjeta de credito", "seguro de vida", "seguros", "hipoteca", "ahorro", "billetera", "fintech", "cuenta digital", "rendimiento"],
      weak: ["finanzas", "financas", "finance", "dinero", "dinheiro", "money", "banco", "pagos", "libertad financiera", "renta pasiva"],
      categories: ["finance", "bank", "insurance", "financial", "investing", "cryptocurrency"]
    },
    {
      id: "inmobiliaria",
      label: "Inmobiliaria",
      strong: ["departamento", "departamentos", "apartamento", "apartamentos", "casa en venta", "venta de casas", "alquiler", "arriendo", "inmobiliaria", "imobiliaria", "real estate", "lotes", "terrenos", "preventa", "condominio", "bienes raices", "propiedad", "propiedades", "ambientes"],
      weak: ["casa propia", "hogar propio", "credito hipotecario", "metros cuadrados", "m2", "entrega inmediata"],
      categories: ["real estate", "property", "apartment", "inmobiliaria"]
    },
    {
      id: "tecnologia",
      label: "Tecnología y gadgets",
      strong: ["smartphone", "celular", "iphone", "android", "auriculares", "audifonos", "fone de ouvido", "smartwatch", "laptop", "notebook", "computadora", "tablet", "gadget", "cargador", "bluetooth", "parlante", "camara de seguridad", "drone", "consola", "software", "saas", "inteligencia artificial", "ia ", "chatgpt", "app para"],
      weak: ["tecnologia", "technology", "tech", "digital", "wifi", "inteligente", "electronica", "pantalla", "bateria"],
      categories: ["electronics", "software", "computer", "technology", "internet company", "app page"]
    },
    {
      id: "hogar",
      label: "Hogar y decoración",
      strong: ["decoracion", "decoracao", "home decor", "muebles", "moveis", "furniture", "colchon", "colchones", "sabanas", "cocina", "utensilios", "organizador", "iluminacion", "lampara", "alfombra", "cortinas", "jardin", "limpieza", "aspiradora", "electrodomesticos", "freidora", "sofa"],
      weak: ["hogar", "casa", "home", "living", "dormitorio", "bano", "ambiente"],
      categories: ["home decor", "furniture", "home improvement", "kitchen", "household", "garden"]
    },
    {
      id: "mascotas",
      label: "Mascotas",
      strong: ["perro", "perros", "gato", "gatos", "cachorro", "mascota", "mascotas", "pet shop", "veterinaria", "veterinario", "alimento para perros", "racao", "dog", "cat", "pets", "arnes", "collar para perro", "arena para gatos"],
      weak: ["peludo", "peludos", "animal", "animales", "adiestramiento"],
      categories: ["pet", "veterinarian", "animal"]
    },
    {
      id: "alimentacion",
      label: "Alimentación y bebidas",
      strong: ["restaurante", "delivery", "pizza", "hamburguesa", "sushi", "cafe", "cerveza", "vino", "vinos", "receta", "recetas", "comida", "alimentos", "snack", "chocolate", "panaderia", "pasteleria", "menu", "almuerzo", "cena", "bebida", "gourmet", "organico", "vegano", "mani", "crema de mani", "mantequilla de mani", "galletas", "granola", "cereal", "helado", "postre", "postres", "salsa", "arepas", "empanadas", "jugo", "jugos"],
      weak: ["sabor", "delicioso", "rico", "hambre", "food", "comer", "cocinar", "platos"],
      categories: ["restaurant", "food", "beverage", "bakery", "cafe", "grocery", "winery", "brewery"]
    },
    {
      id: "viajes",
      label: "Viajes y turismo",
      strong: ["vuelos", "pasajes", "passagens", "hotel", "hoteles", "resort", "paquetes turisticos", "vacaciones", "ferias", "travel", "crucero", "all inclusive", "todo incluido", "agencia de viajes", "excursion", "tour", "hospedaje", "airbnb", "destino"],
      weak: ["viaje", "viajar", "viagem", "turismo", "playa", "praia", "aventura", "escapada"],
      categories: ["travel", "hotel", "tour", "airline", "tourism"]
    },
    {
      id: "automotriz",
      label: "Automotriz y movilidad",
      strong: ["auto", "autos", "carro", "carros", "coche", "vehiculo", "vehiculos", "camioneta", "suv", "concesionario", "concesionaria", "0km", "0 km", "test drive", "neumaticos", "llantas", "repuestos", "taller mecanico", "moto", "motos", "motocicleta", "scooter electrico"],
      weak: ["manejar", "conducir", "motor", "financiacion", "kilometros", "seminuevo", "usados"],
      categories: ["automotive", "car dealership", "motorcycle", "vehicle", "auto"]
    },
    {
      id: "bebes",
      label: "Bebés y maternidad",
      strong: ["bebe", "bebes", "embarazo", "embarazada", "gestante", "lactancia", "maternidad", "panales", "fraldas", "recien nacido", "baby", "mama primeriza", "cochecito", "carriola", "juguetes", "infantil", "ninos", "criancas"],
      weak: ["hijos", "hijo", "mamas", "maes", "familia", "crianza"],
      categories: ["baby", "kids", "children", "toy", "maternity"]
    },
    {
      id: "apps_juegos",
      label: "Apps y juegos",
      strong: ["descarga la app", "descargar", "baixe", "download", "app store", "google play", "juego", "jogo", "game", "gaming", "jugar", "casino", "apuestas", "slots", "bonus de bienvenida"],
      weak: ["aplicacion", "aplicativo", "app", "nivel", "jugadores", "online"],
      categories: ["app page", "video game", "games", "gaming", "casino"]
    },
    {
      id: "desarrollo_personal",
      label: "Desarrollo personal y espiritualidad",
      strong: ["autoestima", "mentalidad", "mindset", "coaching", "coach", "proposito de vida", "manifestar", "ley de atraccion", "meditacion", "espiritualidad", "tarot", "astrologia", "horoscopo", "energia espiritual", "sanacion", "constelaciones", "relaciones de pareja", "reconquistar"],
      weak: ["transformacion", "crecimiento personal", "abundancia", "sanar", "felicidad", "emociones"],
      categories: ["coach", "spiritual", "religious", "astrologist", "life coach", "psychologist"]
    },
    {
      id: "servicios",
      label: "Servicios profesionales",
      strong: ["abogado", "abogados", "advogado", "estudio juridico", "contador", "contabilidad", "impuestos", "asesoria", "consultoria", "seguro", "plomero", "electricista", "mudanzas", "fletes", "limpieza de oficinas", "agencia", "estudio contable", "arquitecto", "remodelacion", "reformas", "energia solar", "paneles solares"],
      weak: ["servicio", "servicios", "servicos", "services", "presupuesto", "cotiza", "cotizacion", "profesionales", "atencion"],
      categories: ["lawyer", "legal", "accountant", "contractor", "service", "consulting", "plumber", "electrician", "solar"]
    },
    {
      id: "eventos",
      label: "Eventos y entretenimiento",
      strong: ["entradas", "ingressos", "tickets", "concierto", "show", "festival", "evento", "eventos", "teatro", "cine", "estreno", "streaming", "serie", "pelicula", "conferencia", "congreso", "expo"],
      weak: ["entretenimiento", "musica", "en vivo", "ao vivo", "live", "noche"],
      categories: ["event", "musician", "band", "concert", "entertainment", "movie", "tv"]
    }
  ];
  var NICHE_LABELS = Object.fromEntries(NICHES.map((n) => [n.id, n.label]));
  function nicheLabel(id) {
    if (!id) return "Sin clasificar";
    return NICHE_LABELS[id] ?? id;
  }

  // src/lib/scoring.ts
  var clamp01 = (x) => Math.max(0, Math.min(1, x));
  var round1 = (x) => Math.round(x * 10) / 10;
  var plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  function computeScore(i) {
    const signals = [];
    const d = i.daysActive ?? 0;
    signals.push({
      key: "longevity",
      label: "Días activos",
      max: 25,
      points: round1(25 * clamp01(Math.log(1 + d) / Math.log(1 + 90))),
      observed: i.daysActive === null ? "Fecha de inicio desconocida" : plural(d, "día", "días"),
      explanation: "Cuanto más tiempo mantiene el anunciante un anuncio en circulación, mayor es la señal de continuidad. Alcanza el máximo a los 90 días."
    });
    const variants = Math.max(i.collationCount ?? 1, i.sameMessageCount + 1, 1);
    signals.push({
      key: "variants",
      label: "Variantes del anuncio",
      max: 15,
      points: round1(15 * clamp01(Math.log(variants) / Math.log(10))),
      observed: plural(variants, "versión", "versiones"),
      explanation: "Cantidad de anuncios que usan la misma creatividad y texto (dato de la Biblioteca) o el mismo mensaje. Duplicar un anuncio suele hacerse para ampliar su alcance."
    });
    const n = Math.max(0, i.advertiserActiveAds);
    signals.push({
      key: "advertiser_volume",
      label: "Anuncios activos del anunciante",
      max: 15,
      points: round1(15 * clamp01(n <= 1 ? 0 : Math.log(n) / Math.log(30))),
      observed: plural(n, "anuncio activo", "anuncios activos"),
      explanation: "Anuncios activos de la misma página registrados en la plataforma. Muchos anuncios simultáneos indican una inversión sostenida en publicidad."
    });
    const msgPts = 6 * clamp01(i.sameMessageCount / 4);
    const offerPts = i.offers.length ? 4 * clamp01(i.offerRepeatCount / 4) : 0;
    const repParts = [];
    repParts.push(plural(i.sameMessageCount, "anuncio más con el mismo mensaje", "anuncios más con el mismo mensaje"));
    if (i.offers.length) repParts.push(`oferta (${i.offers.join(", ")}) repetida en ${i.offerRepeatCount}`);
    signals.push({
      key: "message_repetition",
      label: "Repetición de ofertas y mensajes",
      max: 10,
      points: round1(msgPts + offerPts),
      observed: repParts.join(" · "),
      explanation: "Cuando el anunciante repite el mismo mensaje u oferta en varios anuncios, ese ángulo comercial forma parte central de su estrategia."
    });
    const c = Math.max(1, i.distinctCreatives);
    const f = Math.max(1, i.distinctFormats);
    signals.push({
      key: "creative_diversity",
      label: "Diversidad de creatividades",
      max: 10,
      points: round1(6 * clamp01((c - 1) / 5) + 4 * clamp01((f - 1) / 2)),
      observed: `${plural(c, "creatividad", "creatividades")} · ${plural(f, "formato", "formatos")}`,
      explanation: "Creatividades y formatos distintos que el anunciante usa hacia el mismo destino. Probar variaciones es típico de campañas que se optimizan activamente."
    });
    let landingPts = 0;
    let landingObs = "Sin destino identificado";
    if (i.landingKind === "web") {
      landingPts = i.landingDomainOnly ? 3.5 : 5;
      landingObs = i.landingDomainOnly ? "Dominio visible (sin URL completa)" : "Landing page identificada";
    } else if (i.landingKind === "app_store") {
      landingPts = 3;
      landingObs = "Tienda de aplicaciones";
    } else if (i.landingKind) {
      landingPts = 1.5;
      landingObs = i.landingKind === "messaging" ? "Mensajería (WhatsApp/Messenger)" : "Red social";
    }
    signals.push({
      key: "landing",
      label: "Landing page disponible",
      max: 5,
      points: landingPts,
      observed: landingObs,
      explanation: "Un destino web identificable permite analizar la oferta completa y agrupar todos los anuncios que llevan a la misma página."
    });
    const w = Math.max(0, i.launchWeeks);
    signals.push({
      key: "continuity",
      label: "Continuidad de la campaña",
      max: 10,
      points: round1((i.isActive ? 4 : 0) + 6 * clamp01((w - 1) / 5)),
      observed: `${i.isActive ? "Sigue activo" : "Ya no circula"} · lanzamientos en ${plural(w, "semana", "semanas")} distintas`,
      explanation: "Si el anunciante sigue lanzando anuncios hacia el mismo destino en semanas distintas, la campaña tiene continuidad en el tiempo."
    });
    const rank = i.impressionRank && i.impressionRank > 0 ? Math.round(i.impressionRank) : null;
    const rankPts = !rank ? 0 : rank === 1 ? 10 : rank <= 3 ? 9 : rank <= 10 ? 7.5 : rank <= 30 ? 5.5 : rank <= 60 ? 3.5 : 1.5;
    signals.push({
      key: "impressions",
      label: "Más visto (ranking de Meta)",
      max: 10,
      points: rankPts,
      observed: rank ? `Top #${rank} en impresiones${i.impressionQuery ? ` para «${i.impressionQuery}»` : ""}` : "Sin ranking de impresiones (búscalo desde el radar para obtenerlo)",
      explanation: "Posición del anuncio cuando la Biblioteca ordena la búsqueda por impresiones totales. Meta solo publica el orden, no cifras de vistas ni de ventas."
    });
    const score = Math.round(signals.reduce((s, x) => s + x.points, 0));
    return { score: Math.max(0, Math.min(100, score)), signals };
  }
  function scoreTier(score) {
    if (score >= 70) return { label: "Señales altas", tone: "high" };
    if (score >= 40) return { label: "Señales moderadas", tone: "mid" };
    return { label: "Señales bajas", tone: "low" };
  }
  var SCORE_DISCLAIMER = "Puntuación orientativa basada solo en señales públicas observables (tiempo activo, copias, volumen, repetición, diversidad, destino, continuidad y ranking de impresiones de Meta). No mide ventas, conversiones ni rentabilidad, y no indica que un anuncio sea ganador.";

  // src/lib/sources/countries.ts
  var COUNTRY_NAMES = {
    AR: "Argentina",
    BO: "Bolivia",
    BR: "Brasil",
    CL: "Chile",
    CO: "Colombia",
    CR: "Costa Rica",
    CU: "Cuba",
    DO: "Rep. Dominicana",
    EC: "Ecuador",
    SV: "El Salvador",
    GT: "Guatemala",
    HN: "Honduras",
    MX: "México",
    NI: "Nicaragua",
    PA: "Panamá",
    PY: "Paraguay",
    PE: "Perú",
    PR: "Puerto Rico",
    UY: "Uruguay",
    VE: "Venezuela",
    US: "Estados Unidos",
    CA: "Canadá",
    ES: "España",
    PT: "Portugal",
    FR: "Francia",
    IT: "Italia",
    DE: "Alemania",
    GB: "Reino Unido",
    IE: "Irlanda",
    NL: "Países Bajos",
    BE: "Bélgica",
    AT: "Austria",
    PL: "Polonia",
    SE: "Suecia",
    DK: "Dinamarca",
    FI: "Finlandia",
    GR: "Grecia",
    CZ: "Chequia",
    RO: "Rumania",
    HU: "Hungría",
    BG: "Bulgaria",
    HR: "Croacia",
    SK: "Eslovaquia",
    SI: "Eslovenia",
    LT: "Lituania",
    LV: "Letonia",
    EE: "Estonia",
    LU: "Luxemburgo",
    MT: "Malta",
    CY: "Chipre",
    AU: "Australia",
    NZ: "Nueva Zelanda",
    IN: "India",
    ZA: "Sudáfrica",
    AE: "Emiratos Árabes",
    CH: "Suiza",
    NO: "Noruega",
    JP: "Japón"
  };
  function countryName(code) {
    return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
  }

  // src/lib/text.ts
  function normalizeText(input) {
    if (!input) return "";
    return input.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^\p{L}\p{N}%$€£]+/gu, " ").replace(/\s+/g, " ").trim();
  }
  function messageHash(body, title) {
    const text = normalizeText(`${body ?? ""} ${title ?? ""}`);
    if (text.length < 12) return null;
    return fnv1a64(text);
  }
  function fnv1a64(input) {
    let h2 = BigInt("0xcbf29ce484222325");
    const prime = BigInt("0x100000001b3");
    const mask = BigInt("0xffffffffffffffff");
    for (const byte of new TextEncoder().encode(input)) {
      h2 ^= BigInt(byte);
      h2 = h2 * prime & mask;
    }
    return h2.toString(16).padStart(16, "0");
  }
  var OFFER_PATTERNS = [
    ["Descuento", /\b\d{1,2}\s?%\s?(off|de descuento|dto|desconto|descuento)?|\bdescuento|\bdesconto|\bsale\b|\brebaja|\boferta|\bpromo(cion|cao)?\b/],
    ["Envío gratis", /\benvio(s)? gratis|\bfrete gratis|\bfree shipping|\benvio sin costo/],
    ["2x1 / combo", /\b2\s?x\s?1\b|\b3\s?x\s?2\b|\bcombo|\bkit\b|\bpack\b|\blleva \d|\bcompra \d/],
    ["Gratis / regalo", /\bgratis\b|\bfree\b|\bregalo|\bbrinde|\bobsequio|\bde regalo/],
    ["Cuotas / pago", /\bcuotas|\bsin interes|\bparcelas|\bsem juros|\bmeses sin intereses|\bcontra ?entrega|\bpago contra/],
    ["Tiempo limitado", /\bsolo hoy|\bultimas? (unidades|horas)|\btiempo limitado|\bpor tiempo|\blimited time|\bhoy\b.*\bultimo|\bblack friday|\bcyber|\bhot sale|\bultimos dias/],
    ["Garantía", /\bgarantia|\bguarantee|\bdevolucion|\breembolso|\bmoney back/],
    ["Cupón", /\bcupon|\bcupom|\bcoupon|\bcodigo\b|\bcode\b/],
    ["Prueba gratis", /\bprueba gratis|\bfree trial|\bteste gratis|\bclase gratis|\bmuestra gratis/]
  ];
  function detectOffers(...parts) {
    const text = normalizeText(parts.filter(Boolean).join(" "));
    if (!text) return [];
    return OFFER_PATTERNS.filter(([, re]) => re.test(text)).map(([label]) => label);
  }
  function truncate(text, max) {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
  }

  // src/ext/discovery.ts
  var DEFAULT_QUERIES = [
    "suplementos",
    "skincare",
    "ropa mujer",
    "zapatillas",
    "relojes",
    "curso online",
    "emprendedores",
    "audífonos",
    "decoración hogar",
    "perros",
    "envío gratis",
    "pago contra entrega"
  ];
  var DISCOVERY_COUNTRIES = ["CO", "MX", "AR", "CL", "PE", "EC", "VE", "GT", "DO", "BO", "PY", "UY", "CR", "PA", "ES", "US", "BR"];
  var MAX_PER_HOUR = 30;
  var GAP_MS = 6e3;
  var JOB_TIMEOUT_MS = 9e4;
  function librarySearchUrl(q, country) {
    const p = new URLSearchParams({
      active_status: "active",
      ad_type: "all",
      country,
      q,
      search_type: "keyword_unordered",
      media_type: "all",
      "sort_data[mode]": "total_impressions",
      "sort_data[direction]": "desc"
    });
    return `https://www.facebook.com/ads/library/?${p.toString()}`;
  }
  async function recentSearches() {
    const { searchLog = [] } = await chrome.storage.local.get("searchLog");
    const hourAgo = Date.now() - 36e5;
    return searchLog.filter((t) => t > hourAgo);
  }
  async function searchesLeft() {
    return Math.max(0, MAX_PER_HOUR - (await recentSearches()).length);
  }
  async function noteSearch() {
    const log = await recentSearches();
    log.push(Date.now());
    await chrome.storage.local.set({ searchLog: log });
  }
  function blockedMessage(reason) {
    if (reason === "login") return "La Biblioteca pidió iniciar sesión. Abre facebook.com, inicia sesión tú mismo y vuelve a intentarlo.";
    if (reason === "rate_limit")
      return "Meta limitó temporalmente las búsquedas desde tu navegador. Se detuvo para proteger tu cuenta: vuelve a intentarlo en una hora.";
    return reason ? `Búsqueda detenida: ${reason}` : "";
  }
  async function runSearchJob(q, country, scrolls = 2) {
    await noteSearch();
    const tab = await chrome.tabs.create({ url: librarySearchUrl(q, country), active: false });
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const key = `job:${tab.id}`;
    await chrome.storage.session.set({ [key]: { id: jobId, q, country, scrolls } });
    return new Promise((resolve) => {
      let finished = false;
      const finish = (r) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        chrome.runtime.onMessage.removeListener(onMsg);
        chrome.tabs.onRemoved.removeListener(onRemoved);
        chrome.storage.session.remove(key).catch(() => {
        });
        chrome.tabs.remove(tab.id).catch(() => {
        });
        resolve({ q, detected: 0, created: 0, updated: 0, blocked: null, error: null, ...r });
      };
      const onMsg = (msg) => {
        if (msg && msg.type === "radar:jobDone" && msg.jobId === jobId) {
          finish({
            detected: Number(msg.detected) || 0,
            created: Number(msg.created) || 0,
            updated: Number(msg.updated) || 0,
            blocked: msg.blocked || null,
            limited: Boolean(msg.limited),
            error: msg.error || null
          });
        }
      };
      const onRemoved = (id) => {
        if (id === tab.id) finish({ error: "La pestaña de búsqueda se cerró antes de terminar." });
      };
      const timer = setTimeout(() => finish({ error: "La Biblioteca tardó demasiado en responder." }), JOB_TIMEOUT_MS);
      chrome.runtime.onMessage.addListener(onMsg);
      chrome.tabs.onRemoved.addListener(onRemoved);
    });
  }
  async function runDiscovery(queries, country, onProgress, isCancelled) {
    const list = Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean))).slice(0, MAX_PER_HOUR);
    const p = { running: true, done: 0, total: list.length, current: null, created: 0, updated: 0, detected: 0, message: "" };
    for (let i = 0; i < list.length; i++) {
      if (isCancelled()) {
        p.message = "Búsqueda detenida.";
        break;
      }
      if (await searchesLeft() <= 0) {
        p.message = `Llegaste al límite de ${MAX_PER_HOUR} búsquedas por hora. Continúa más tarde.`;
        break;
      }
      p.current = list[i];
      onProgress({ ...p });
      const r = await runSearchJob(list[i], country, 3);
      p.done++;
      p.created += r.created;
      p.updated += r.updated;
      p.detected += r.detected;
      if (r.blocked) {
        p.message = blockedMessage(r.blocked);
        break;
      }
      if (r.error && !r.detected) p.message = `«${r.q}»: ${r.error}`;
      onProgress({ ...p });
      const gap = r.limited ? GAP_MS * 3 : GAP_MS;
      if (i < list.length - 1 && !isCancelled()) await new Promise((res) => setTimeout(res, gap));
    }
    p.running = false;
    p.current = null;
    if (!p.message) p.message = `Listo: ${p.created} anuncios nuevos y ${p.updated} actualizados en ${p.done} búsquedas.`;
    onProgress({ ...p });
    return p;
  }

  // src/lib/landing.ts
  var REDIRECT_HOSTS = /* @__PURE__ */ new Set(["l.facebook.com", "lm.facebook.com", "l.instagram.com", "l.messenger.com"]);
  var TRACKING_PARAM = /^(utm_|fbclid$|gclid$|gbraid$|wbraid$|ttclid$|msclkid$|mc_cid$|mc_eid$|_hsenc$|_hsmi$|campaign_id$|adset_id$|ad_id$|h_ad_id$|placement$|site_source_name$|fbc_id$|hsa_|ref_src$|igshid$|si$|_branch_match_id$|_ga$|_gl$|cid$|adid$|cmpid$|clickid$|sub_id|subid)/i;
  var MESSAGING_HOSTS = ["wa.me", "api.whatsapp.com", "whatsapp.com", "m.me", "messenger.com", "t.me", "telegram.me"];
  var SOCIAL_HOSTS = ["facebook.com", "fb.com", "fb.me", "instagram.com", "tiktok.com", "youtube.com", "youtu.be", "threads.net", "x.com", "twitter.com"];
  var APP_HOSTS = ["apps.apple.com", "itunes.apple.com", "play.google.com"];
  var IDENTITY_PARAMS = [
    ["api.whatsapp.com", "phone"],
    ["whatsapp.com", "phone"],
    ["play.google.com", "id"],
    ["facebook.com", "id"]
  ];
  function hostMatches(host, list) {
    return list.some((h2) => host === h2 || host.endsWith(`.${h2}`));
  }
  function landingKind(domain) {
    if (hostMatches(domain, MESSAGING_HOSTS)) return "messaging";
    if (hostMatches(domain, APP_HOSTS)) return "app_store";
    if (hostMatches(domain, SOCIAL_HOSTS)) return "social";
    return "web";
  }
  function unwrapRedirect(raw) {
    let current = raw.trim();
    for (let i = 0; i < 3; i++) {
      let u;
      try {
        u = new URL(current);
      } catch {
        return current;
      }
      if (REDIRECT_HOSTS.has(u.hostname) && u.searchParams.get("u")) {
        current = u.searchParams.get("u");
        continue;
      }
      return current;
    }
    return current;
  }
  function cleanHost(host) {
    return host.toLowerCase().replace(/^www\d?\./, "").replace(/\.$/, "");
  }
  function normalizeLanding(linkUrl, caption) {
    if (linkUrl && /^https?:\/\//i.test(linkUrl.trim())) {
      try {
        const u = new URL(unwrapRedirect(linkUrl));
        if (u.protocol === "http:" || u.protocol === "https:") {
          const domain = cleanHost(u.hostname);
          for (const name of Array.from(u.searchParams.keys())) {
            const value = u.searchParams.get(name) ?? "";
            if (TRACKING_PARAM.test(name) || /\{\{.*\}\}/.test(value)) u.searchParams.delete(name);
          }
          u.hash = "";
          let pathname = u.pathname.replace(/\/(index\.(html?|php))?$/i, "").replace(/\/{2,}/g, "/");
          if (!pathname) pathname = "";
          const query = u.searchParams.toString();
          const url = `${u.protocol}//${u.hostname.toLowerCase()}${pathname || "/"}${query ? `?${query}` : ""}`;
          const kind = landingKind(domain);
          let identity = "";
          for (const [host, param] of IDENTITY_PARAMS) {
            if (domain === host || domain.endsWith(`.${host}`)) {
              const v = u.searchParams.get(param);
              if (v) identity = `?${param}=${param === "phone" ? v.replace(/\D/g, "") : v.toLowerCase()}`;
            }
          }
          const key = `${domain}${pathname.toLowerCase()}${identity}`;
          return { key, domain, url, kind, domainOnly: false };
        }
      } catch {
      }
    }
    if (caption) {
      const c = caption.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[\s/]/)[0] ?? "";
      if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(c)) {
        const domain = cleanHost(c);
        return { key: domain, domain, url: null, kind: landingKind(domain), domainOnly: true };
      }
    }
    return null;
  }

  // src/lib/advertiser-stats.ts
  var NO_LANDING = "__sin_destino__";
  function computeAdvertiserStats(rows, now = /* @__PURE__ */ new Date()) {
    const active = rows.filter((r) => r.isActive);
    const hashCounts = /* @__PURE__ */ new Map();
    const offerCounts = /* @__PURE__ */ new Map();
    const groups = /* @__PURE__ */ new Map();
    for (const r of rows) {
      if (r.messageHash) hashCounts.set(r.messageHash, (hashCounts.get(r.messageHash) ?? 0) + 1);
      for (const o of r.offers) offerCounts.set(o, (offerCounts.get(o) ?? 0) + 1);
      const g = r.landingKey ?? NO_LANDING;
      groups.set(g, [...groups.get(g) ?? [], r]);
    }
    const groupStats = /* @__PURE__ */ new Map();
    for (const [key, list] of Array.from(groups.entries())) {
      const creatives = new Set(list.map((r) => r.messageHash ?? r.media[0]?.url ?? r.id));
      const formats = new Set(list.map((r) => r.format).filter((f) => f !== "unknown"));
      const weeks = new Set(list.map((r) => r.startDate ? isoWeekKey(r.startDate) : null).filter(Boolean));
      groupStats.set(key, { creatives: creatives.size, formats: Math.max(1, formats.size), weeks: weeks.size });
    }
    const perAd = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const offerRepeat = r.offers.length ? Math.max(...r.offers.map((o) => (offerCounts.get(o) ?? 1) - 1)) : 0;
      const g = groupStats.get(r.landingKey ?? NO_LANDING);
      const result = computeScore({
        daysActive: daysActive(r.startDate, { isActive: r.isActive, stopDate: r.stopDate, lastSeenAt: r.lastSeenAt, now }),
        isActive: r.isActive,
        collationCount: r.collationCount,
        sameMessageCount: r.messageHash ? (hashCounts.get(r.messageHash) ?? 1) - 1 : 0,
        offers: r.offers,
        offerRepeatCount: offerRepeat,
        advertiserActiveAds: active.length,
        distinctCreatives: r.landingKey ? g.creatives : 1,
        distinctFormats: r.landingKey ? g.formats : 1,
        landingKind: r.landingDomain ? landingKind(r.landingDomain) : null,
        landingDomainOnly: !r.linkUrl,
        launchWeeks: r.landingKey ? g.weeks : r.startDate ? 1 : 0,
        impressionRank: r.impressionRank ?? null,
        impressionQuery: r.impressionQuery ?? null
      });
      perAd.set(r.id, { score: result.score, signals: result.signals });
    }
    const nicheCounts = /* @__PURE__ */ new Map();
    for (const r of rows) if (r.niche) nicheCounts.set(r.niche, (nicheCounts.get(r.niche) ?? 0) + 1);
    const mainNiche = Array.from(nicheCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      perAd,
      totalAds: rows.length,
      activeAds: active.length,
      landingCount: new Set(rows.map((r) => r.landingKey).filter(Boolean)).size,
      mainNiche
    };
  }

  // src/lib/niche/rules.ts
  function countTerm(haystack, term) {
    const t = normalizeText(term);
    if (!t) return 0;
    const re = new RegExp(`(?:^| )${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?= |$)`, "g");
    return (haystack.match(re) ?? []).length;
  }
  function classifyByRules(input) {
    const text = ` ${normalizeText(
      [input.title, input.body, input.linkDescription, input.pageName, (input.caption ?? "").replace(/\./g, " ")].filter(Boolean).join(" ")
    )} `;
    const cats = normalizeText((input.categories ?? []).join(" | "));
    let best = null;
    let total = 0;
    for (const n of NICHES) {
      let score = 0;
      const terms = [];
      for (const term of n.strong) {
        const c = countTerm(text, term);
        if (c) {
          score += 2 * Math.min(c, 3);
          terms.push(term);
        }
      }
      for (const term of n.weak) {
        const c = countTerm(text, term);
        if (c) {
          score += Math.min(c, 3);
          terms.push(term);
        }
      }
      for (const cat of n.categories ?? []) {
        if (cats && cats.includes(normalizeText(cat))) {
          score += 4;
          terms.push(`categoría: ${cat}`);
        }
      }
      total += score;
      if (score > 0 && (!best || score > best.score)) best = { id: n.id, score, terms };
    }
    if (!best || best.score < 2) return { niche: null, confidence: 0, terms: [] };
    const share = best.score / total;
    const volume = Math.min(1, best.score / 8);
    const confidence = Math.round(share * volume * 100) / 100;
    return { niche: best.id, confidence, terms: best.terms.slice(0, 8) };
  }

  // src/lib/merge.ts
  var ID_RE = /^[A-Za-z0-9_-]{3,64}$/;
  var union = (a, b) => Array.from(/* @__PURE__ */ new Set([...a, ...b]));
  var pick = (next, prev) => next !== null && next !== void 0 && next !== "" ? next : prev ?? null;
  var minDate = (a, b) => !a ? b : !b ? a : a < b ? a : b;
  function mediaExpiry(media) {
    let min = null;
    for (const m of media) {
      for (const url of [m.url, m.preview]) {
        if (!url) continue;
        const match = url.match(/[?&]oe=([0-9A-Fa-f]{6,10})/);
        if (match) {
          const t = parseInt(match[1], 16) * 1e3;
          if (Number.isFinite(t) && (min === null || t < min)) min = t;
        }
      }
    }
    return min ? new Date(min).toISOString() : null;
  }
  function inferFormat(ad) {
    if (ad.format && ad.format !== "unknown") return ad.format;
    if (ad.media.length > 1) return "carousel";
    if (ad.media[0]?.type === "video") return "video";
    if (ad.media[0]?.type === "image") return "image";
    return "unknown";
  }
  function prepareBatch(input) {
    const errors = [];
    let skipped = 0;
    const byId = /* @__PURE__ */ new Map();
    for (const ad of input) {
      if (!ad || !ad.id || !ID_RE.test(ad.id)) {
        skipped++;
        if (errors.length < 20) errors.push(`ID inválido: ${String(ad?.id ?? "")}`);
        continue;
      }
      if (!ad.pageId || !ad.pageName) {
        skipped++;
        if (errors.length < 20) errors.push(`Anuncio ${ad.id} sin anunciante identificado`);
        continue;
      }
      const prev = byId.get(ad.id);
      if (!prev || prev.partial && !ad.partial || ad.media.length > prev.media.length) byId.set(ad.id, ad);
    }
    return { ads: Array.from(byId.values()), skipped, errors };
  }
  function mergeAd(existing, ad, ctx) {
    const countries = (ad.countries.length ? ad.countries : ctx.queryCountries ?? []).map((c) => c.toUpperCase());
    const weak = Boolean(ad.partial && existing && !existing.partial);
    const e = existing;
    const pageName = weak ? e.pageName : ad.pageName;
    const isActive = ad.isActive ?? (e ? e.isActive : true);
    const body = weak ? e.body : pick(ad.body, e?.body);
    const title = weak ? e.title : pick(ad.title, e?.title);
    const linkDescription = weak ? e.linkDescription : pick(ad.linkDescription, e?.linkDescription);
    const caption = pick(weak ? null : ad.caption, e?.caption);
    const linkUrlRaw = pick(weak ? null : ad.linkUrl, e?.linkUrl);
    const media = ad.media.length && !weak ? ad.media : e?.media ?? ad.media;
    const sources = union(e?.sources ?? [], [ctx.source]);
    const partial = e ? e.partial && Boolean(ad.partial) : Boolean(ad.partial);
    const languages = union(e?.languages ?? [], ad.languages.map((l) => l.toLowerCase()));
    let format = inferFormat({ format: weak ? e.format ?? "unknown" : ad.format, media });
    if (format === "unknown" && !media.length && body && !partial && sources.includes("extension")) format = "text";
    const landing = normalizeLanding(linkUrlRaw, caption);
    const hash = messageHash(body, title);
    const offers = detectOffers(body, title, linkDescription);
    const language = languages[0] ?? detectLanguage([body, title, linkDescription].filter(Boolean).join(" "));
    let niche = e?.niche ?? null;
    let nicheConfidence = e?.nicheConfidence ?? null;
    let nicheSource = e?.nicheSource ?? null;
    let nicheTerms = e?.nicheTerms ?? [];
    const keepNiche = e && (e.nicheSource === "ai" || e.nicheSource === "manual") && e.messageHash === hash;
    if (!keepNiche) {
      const r = classifyByRules({
        body,
        title,
        linkDescription,
        caption: landing?.domain ?? caption,
        pageName,
        categories: ad.advertiser?.categories
      });
      niche = r.niche;
      nicheConfidence = r.confidence;
      nicheSource = r.niche ? "rules" : null;
      nicheTerms = r.terms;
    }
    const record = {
      id: ad.id,
      pageId: ad.pageId,
      pageName,
      isActive,
      startDate: minDate(ad.startDate, e?.startDate ?? null),
      stopDate: ad.isActive === true ? null : pick(ad.stopDate, e?.stopDate),
      platforms: ad.platforms.length && !weak ? ad.platforms : e?.platforms ?? ad.platforms,
      languages,
      countries: union(e?.countries ?? [], countries),
      language: language ?? null,
      body,
      title,
      linkDescription,
      caption,
      ctaText: pick(weak ? null : ad.ctaText, e?.ctaText),
      linkUrl: landing?.url ?? null,
      landingKey: landing?.key ?? null,
      landingDomain: landing?.domain ?? null,
      format,
      media,
      mediaExpiresAt: mediaExpiry(media),
      collationId: pick(ad.collationId, e?.collationId),
      collationCount: pick(ad.collationCount, e?.collationCount),
      messageHash: hash,
      offers,
      niche,
      nicheConfidence,
      nicheSource,
      nicheTerms,
      euTotalReach: pick(ad.euTotalReach, e?.euTotalReach),
      sources,
      queries: union(e?.queries ?? [], ctx.query?.trim() ? [ctx.query.trim().toLowerCase().slice(0, 80)] : []).slice(-20),
      ...bestRank(e, ctx, countries),
      isManual: e ? e.isManual && ctx.source === "manual" : ctx.source === "manual",
      partial,
      score: e?.score ?? 0,
      scoreBreakdown: e?.scoreBreakdown ?? [],
      firstSeenAt: e?.firstSeenAt ?? ctx.now,
      lastSeenAt: ctx.now,
      updatedAt: ctx.now
    };
    return { record, weak };
  }
  function bestRank(e, ctx, countries) {
    const prev = {
      impressionRank: e?.impressionRank ?? null,
      impressionQuery: e?.impressionQuery ?? null,
      impressionCountry: e?.impressionCountry ?? null,
      impressionAt: e?.impressionAt ?? null
    };
    const rank = ctx.rank && ctx.rank > 0 ? Math.round(ctx.rank) : null;
    if (!rank) return prev;
    const next = {
      impressionRank: rank,
      impressionQuery: ctx.query?.trim().toLowerCase().slice(0, 80) ?? null,
      impressionCountry: countries[0] ?? null,
      impressionAt: ctx.now
    };
    const stale = !prev.impressionAt || Date.parse(ctx.now) - Date.parse(prev.impressionAt) > 30 * 864e5;
    if (!prev.impressionRank || stale || prev.impressionQuery === next.impressionQuery || rank < prev.impressionRank) return next;
    return prev;
  }
  function mergeAdvertiser(existing, ad, record, weak, now) {
    const adv = ad.advertiser ?? {};
    return {
      pageId: ad.pageId,
      name: weak && existing ? existing.name : record.pageName,
      pageUrl: adv.pageUrl ?? existing?.pageUrl ?? null,
      avatarUrl: adv.avatarUrl ?? existing?.avatarUrl ?? null,
      likes: adv.likes ?? existing?.likes ?? null,
      categories: adv.categories?.length ? adv.categories : existing?.categories ?? [],
      mainNiche: existing?.mainNiche ?? null,
      totalAds: existing?.totalAds ?? 0,
      activeAds: existing?.activeAds ?? 0,
      landingCount: existing?.landingCount ?? 0,
      firstSeenAt: existing?.firstSeenAt ?? now,
      lastSeenAt: now
    };
  }

  // src/lib/sources/meta-api.ts
  var PLATFORM_MAP = {
    FACEBOOK: "facebook",
    INSTAGRAM: "instagram",
    MESSENGER: "messenger",
    AUDIENCE_NETWORK: "audience_network",
    WHATSAPP: "whatsapp",
    THREADS: "threads"
  };
  function mapPlatforms(list) {
    if (!Array.isArray(list)) return [];
    const out = /* @__PURE__ */ new Set();
    for (const p of list) {
      const m = PLATFORM_MAP[String(p).toUpperCase()];
      if (m) out.add(m);
    }
    return Array.from(out);
  }
  var first = (list) => Array.isArray(list) ? list.find((x) => typeof x === "string" && x.trim()) ?? null : null;
  function mapArchivedAd(ad, ctx) {
    if (!ad || !ad.id || !ad.page_id) return null;
    const today = toIsoDate(ctx.now ?? /* @__PURE__ */ new Date());
    const start = parseDateValue(ad.ad_delivery_start_time) ?? parseDateValue(ad.ad_creation_time);
    const stop = parseDateValue(ad.ad_delivery_stop_time);
    const isActive = ctx.activeStatus === "ACTIVE" ? true : !stop || stop >= today;
    const bodies = (ad.ad_creative_bodies ?? []).filter(Boolean);
    const titles = (ad.ad_creative_link_titles ?? []).filter(Boolean);
    const format = bodies.length > 1 || titles.length > 1 ? "dco" : "unknown";
    const reach = ad.eu_total_reach === void 0 ? null : Number(ad.eu_total_reach);
    return {
      id: String(ad.id),
      pageId: String(ad.page_id),
      pageName: ad.page_name?.trim() || "Anunciante sin nombre",
      isActive,
      startDate: start,
      stopDate: isActive ? null : stop,
      platforms: mapPlatforms(ad.publisher_platforms),
      languages: (ad.languages ?? []).map((l) => String(l).toLowerCase()),
      countries: ctx.countries.map((c) => c.toUpperCase()),
      body: first(bodies),
      title: first(titles),
      linkDescription: first(ad.ad_creative_link_descriptions),
      caption: first(ad.ad_creative_link_captions),
      ctaText: null,
      linkUrl: null,
      // la API no expone la URL de destino, solo el dominio visible (caption)
      format,
      media: [],
      collationId: null,
      collationCount: null,
      euTotalReach: reach !== null && Number.isFinite(reach) ? reach : null
    };
  }

  // src/lib/sources/library-page.ts
  var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
  var str = (v) => typeof v === "string" && v.trim() ? v.trim() : null;
  var num = (v) => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  };
  function stripHtml(html) {
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
  }
  function textOf(v) {
    if (typeof v === "string") return str(v);
    if (isObj(v)) {
      if (typeof v.text === "string") return str(v.text);
      const markup = v.markup;
      if (isObj(markup) && typeof markup.__html === "string") return str(stripHtml(markup.__html));
    }
    return null;
  }
  function cleanTemplate(s) {
    if (!s) return s;
    const out = s.replace(/\{\{[^{}]{1,80}\}\}/g, "").replace(/[ \t]{2,}/g, " ").replace(/^\s+|\s+$/g, "");
    return out ? out : null;
  }
  function collectMedia(snapshot) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const push = (m) => {
      if (!m || !/^https:\/\//.test(m.url) || seen.has(m.url)) return;
      seen.add(m.url);
      out.push(m);
    };
    const fromVideo = (v) => {
      const url = str(v.video_hd_url) ?? str(v.video_sd_url) ?? str(v.watermarked_video_hd_url) ?? str(v.watermarked_video_sd_url);
      return url ? { type: "video", url, preview: str(v.video_preview_image_url) } : null;
    };
    const fromImage = (v) => {
      const url = str(v.original_image_url) ?? str(v.resized_image_url) ?? str(v.watermarked_resized_image_url);
      return url ? { type: "image", url, preview: str(v.resized_image_url) } : null;
    };
    for (const key of ["videos", "extra_videos"]) {
      const list = snapshot[key];
      if (Array.isArray(list)) list.filter(isObj).forEach((v) => push(fromVideo(v)));
    }
    for (const key of ["images", "extra_images"]) {
      const list = snapshot[key];
      if (Array.isArray(list)) list.filter(isObj).forEach((v) => push(fromImage(v)));
    }
    const cards = snapshot.cards;
    if (Array.isArray(cards)) {
      for (const c of cards.filter(isObj)) push(fromVideo(c) ?? fromImage(c));
    }
    return out.slice(0, 12);
  }
  var FORMAT_MAP = {
    IMAGE: "image",
    VIDEO: "video",
    CAROUSEL: "carousel",
    MULTI_IMAGES: "carousel",
    MULTI_VIDEOS: "carousel",
    MULTI_MEDIUM: "carousel",
    DPA: "carousel",
    DCO: "dco",
    TEXT: "text"
  };
  function mapLibraryNode(node, ctx) {
    if (!isObj(node)) return null;
    const id = str(node.ad_archive_id) ?? (num(node.ad_archive_id) !== null ? String(node.ad_archive_id) : null);
    if (!id) return null;
    const snapshot = isObj(node.snapshot) ? node.snapshot : {};
    const pageId = str(node.page_id) ?? (num(node.page_id) !== null ? String(node.page_id) : null) ?? str(snapshot.page_id) ?? ctx.pageId ?? null;
    const pageName = str(node.page_name) ?? str(snapshot.page_name);
    if (!pageId || !pageName) return null;
    const cards = Array.isArray(snapshot.cards) ? snapshot.cards.filter(isObj) : [];
    const firstCard = cards[0] ?? {};
    const body = cleanTemplate(textOf(snapshot.body)) ?? cleanTemplate(textOf(firstCard.body));
    const title = cleanTemplate(str(snapshot.title)) ?? cleanTemplate(str(firstCard.title));
    const linkUrlRaw = str(snapshot.link_url) ?? str(firstCard.link_url);
    const media = collectMedia(snapshot);
    const displayFormat = str(snapshot.display_format)?.toUpperCase() ?? "";
    let format = FORMAT_MAP[displayFormat] ?? "unknown";
    if (format === "unknown") format = media.length > 1 ? "carousel" : media[0]?.type ?? (body ? "text" : "unknown");
    const isActive = typeof node.is_active === "boolean" ? node.is_active : null;
    const categories = Array.isArray(snapshot.page_categories) ? snapshot.page_categories.map((c) => isObj(c) ? str(c.name) : str(c)).filter((c) => Boolean(c)) : [];
    const reached = Array.isArray(node.reached_countries) ? node.reached_countries.map(String) : [];
    return {
      id,
      pageId,
      pageName,
      isActive,
      startDate: parseDateValue(node.start_date),
      stopDate: isActive ? null : parseDateValue(node.end_date),
      platforms: mapPlatforms(node.publisher_platform ?? node.publisher_platforms),
      languages: [],
      countries: reached.length ? reached : ctx.countries,
      body,
      title,
      linkDescription: cleanTemplate(str(snapshot.link_description)) ?? cleanTemplate(str(firstCard.link_description)),
      caption: str(snapshot.caption) ?? str(firstCard.caption),
      ctaText: str(snapshot.cta_text) ?? str(firstCard.cta_text),
      linkUrl: linkUrlRaw ? unwrapRedirect(linkUrlRaw) : null,
      format,
      media,
      collationId: str(node.collation_id) ?? (num(node.collation_id) !== null ? String(node.collation_id) : null),
      collationCount: num(node.collation_count),
      euTotalReach: null,
      advertiser: {
        pageUrl: str(snapshot.page_profile_uri),
        avatarUrl: str(snapshot.page_profile_picture_url),
        likes: num(snapshot.page_like_count),
        categories
      }
    };
  }
  var STATUS_ACTIVE = /^(activo|active|ativo|attivo|actif)$/i;
  var STATUS_INACTIVE = /^(inactivo|inactive|inativo|non attivo|inactif)$/i;
  var SPONSORED = /^(patrocinado|sponsored|sponsorisé|sponsorizzato|gesponsert)$/i;
  var NOISE = /^(identificador de la biblioteca|library id|id da biblioteca|plataformas|platforms|ver detalles del anuncio|see ad details|ver detalhes do anúncio|ver resumen|see summary details|abrir menú desplegable|open drop-down menu|este anuncio tiene varias versiones|this ad has multiple versions)/i;
  function mapDomCard(card2, ctx) {
    if (!card2 || !/^\d{6,25}$/.test(card2.libraryId ?? "")) return null;
    const lines = (card2.text ?? "").split(/\n+/).map((l) => l.trim()).filter(Boolean).slice(0, 80);
    let isActive = null;
    let startDate = null;
    let stopDate = null;
    let collationCount = null;
    let sponsoredIdx = -1;
    lines.forEach((line, i) => {
      if (STATUS_ACTIVE.test(line)) isActive = true;
      else if (STATUS_INACTIVE.test(line)) isActive = false;
      if (SPONSORED.test(line) && sponsoredIdx < 0) sponsoredIdx = i;
      const coll = line.match(/^(\d+)\s+(anuncios|ads|anúncios)\b/i);
      if (coll) collationCount = Number(coll[1]);
      if (!startDate && /\d{4}/.test(line) && !/^\d+$/.test(line)) {
        const parts = line.split(/\s[-–]\s/);
        const s = parseLibraryDateText(parts[0] ?? line);
        if (s) {
          startDate = s;
          if (parts[1]) stopDate = parseLibraryDateText(parts[1]);
        }
      }
    });
    const pageName = card2.pageName?.trim() || (sponsoredIdx > 0 ? lines[sponsoredIdx - 1] : null) || null;
    const bodyLines = sponsoredIdx >= 0 ? lines.slice(sponsoredIdx + 1).filter((l) => !NOISE.test(l) && !STATUS_ACTIVE.test(l) && !STATUS_INACTIVE.test(l)) : [];
    const captionIdx = bodyLines.findIndex((l) => /^[A-Z0-9-]+(\.[A-Z0-9-]+)+$/.test(l));
    const body = (captionIdx >= 0 ? bodyLines.slice(0, captionIdx) : bodyLines.slice(0, 6)).join("\n").slice(0, 3e3) || null;
    const caption = captionIdx >= 0 ? bodyLines[captionIdx] ?? null : null;
    const title = captionIdx >= 0 ? bodyLines[captionIdx + 1] ?? null : null;
    const ctaText = captionIdx >= 0 ? bodyLines[captionIdx + 3] ?? bodyLines[captionIdx + 2] ?? null : null;
    const outbound = (card2.links ?? []).map((l) => unwrapRedirect(l)).find((l) => /^https?:\/\//.test(l) && !/facebook\.com|instagram\.com|fbcdn\.net/.test(l)) ?? null;
    const media = [
      ...(card2.videos ?? []).filter((v) => /^https:\/\//.test(v.src)).map((v) => ({ type: "video", url: v.src, preview: v.poster ?? null })),
      ...(card2.images ?? []).filter((src) => /^https:\/\//.test(src)).map((src) => ({ type: "image", url: src }))
    ].slice(0, 8);
    const pageId = ctx.pageId ?? (pageName ? `nombre:${pageName.toLowerCase().replace(/\s+/g, "-").slice(0, 50)}` : null);
    if (!pageId || !pageName) return null;
    const active = isActive;
    return {
      id: card2.libraryId,
      pageId,
      pageName,
      isActive: active,
      startDate,
      stopDate: active ? null : stopDate,
      platforms: [],
      languages: [],
      countries: ctx.countries,
      body,
      title,
      linkDescription: null,
      caption,
      ctaText,
      linkUrl: outbound,
      format: media.length > 1 ? "carousel" : media[0]?.type ?? "unknown",
      media,
      collationId: null,
      collationCount,
      euTotalReach: null,
      advertiser: { pageUrl: card2.pageUrl ?? null },
      partial: true
    };
  }

  // src/ext/store.ts
  var DB_NAME = "cifra-radar";
  var DB_VERSION = 1;
  var RETENTION_DAYS = 180;
  function req(r) {
    return new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  function done(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  function isAdLibraryUrl(raw) {
    try {
      const u = new URL(raw);
      return u.protocol === "https:" && /(^|\.)facebook\.com$/.test(u.hostname) && u.pathname.startsWith("/ads/library");
    } catch {
      return false;
    }
  }
  function mapExtensionPayload(p) {
    const country = p.query?.country?.toUpperCase();
    const countries = country && country !== "ALL" && /^[A-Z]{2}$/.test(country) ? [country] : [];
    const pageId = p.query?.pageId && /^\d{3,25}$/.test(p.query.pageId) ? p.query.pageId : null;
    const ctx = { countries, pageId };
    const ads = [];
    for (const n of (p.nodes ?? []).slice(0, 1500)) {
      const m = mapLibraryNode(n, ctx);
      if (m) ads.push(m);
    }
    const seen = new Set(ads.map((a) => a.id));
    for (const c of (p.domCards ?? []).slice(0, 500)) {
      if (!c || seen.has(c.libraryId)) continue;
      const m = mapDomCard(c, ctx);
      if (m) ads.push(m);
    }
    return { ads, countries };
  }
  function sanitizeRanks(r) {
    const out = {};
    for (const [id, n] of Object.entries(r).slice(0, 3e3)) if (/^\d{5,25}$/.test(id) && Number.isFinite(n) && n > 0) out[id] = Math.round(n);
    return out;
  }
  var LocalStore = class _LocalStore {
    constructor(idb) {
      this.idb = idb;
    }
    static async open(factory = indexedDB) {
      const r = factory.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains("ads")) d.createObjectStore("ads", { keyPath: "id" }).createIndex("pageId", "pageId");
        if (!d.objectStoreNames.contains("advertisers")) d.createObjectStore("advertisers", { keyPath: "pageId" });
        if (!d.objectStoreNames.contains("favorites")) d.createObjectStore("favorites", { keyPath: "adId" });
        if (!d.objectStoreNames.contains("log")) d.createObjectStore("log", { keyPath: "id", autoIncrement: true });
      };
      return new _LocalStore(await req(r));
    }
    close() {
      this.idb.close();
    }
    async get(store, key) {
      const tx = this.idb.transaction(store, "readonly");
      return await req(tx.objectStore(store).get(key)) ?? null;
    }
    async getAll(store) {
      const tx = this.idb.transaction(store, "readonly");
      return await req(tx.objectStore(store).getAll());
    }
    async allAds() {
      return this.getAll("ads");
    }
    async allAdvertisers() {
      return this.getAll("advertisers");
    }
    async favorites() {
      return new Map((await this.getAll("favorites")).map((f) => [f.adId, f]));
    }
    async log(limit = 20) {
      return (await this.getAll("log")).slice(-limit).reverse();
    }
    async setFavorite(adId, on, note = null) {
      const tx = this.idb.transaction("favorites", "readwrite");
      if (on) tx.objectStore("favorites").put({ adId, note, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
      else tx.objectStore("favorites").delete(adId);
      await done(tx);
    }
    async ingest(input, opts) {
      const now = (opts.now ?? /* @__PURE__ */ new Date()).toISOString();
      const batch = prepareBatch(input);
      const result = { received: input.length, created: 0, updated: 0, skipped: batch.skipped, errors: batch.errors, ids: [] };
      const touched = /* @__PURE__ */ new Set();
      for (const ad of batch.ads) {
        const existing = await this.get("ads", ad.id);
        const { record, weak } = mergeAd(existing, ad, {
          source: opts.source,
          queryCountries: opts.queryCountries,
          query: opts.query,
          rank: opts.ranks?.[ad.id] ?? null,
          now
        });
        const advExisting = await this.get("advertisers", ad.pageId);
        const adv = mergeAdvertiser(advExisting, ad, record, weak, now);
        const tx2 = this.idb.transaction(["ads", "advertisers"], "readwrite");
        tx2.objectStore("ads").put(record);
        tx2.objectStore("advertisers").put(adv);
        await done(tx2);
        if (existing) result.updated++;
        else result.created++;
        result.ids.push(ad.id);
        touched.add(ad.pageId);
        if (existing && existing.pageId !== ad.pageId) touched.add(existing.pageId);
      }
      await this.recompute(Array.from(touched), opts.now);
      const tx = this.idb.transaction("log", "readwrite");
      tx.objectStore("log").add({
        source: opts.source,
        createdAt: now,
        received: result.received,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        context: opts.context ?? {}
      });
      await done(tx);
      return result;
    }
    async ingestExtensionPayload(p) {
      if (!isAdLibraryUrl(p.pageUrl)) throw new Error("Solo se aceptan capturas hechas en facebook.com/ads/library.");
      const { ads, countries } = mapExtensionPayload(p);
      return this.ingest(ads, {
        source: "extension",
        queryCountries: countries,
        query: p.query?.q ?? null,
        ranks: p.query?.sort === "total_impressions" && p.ranks ? sanitizeRanks(p.ranks) : void 0,
        context: { q: p.query?.q ?? null, country: countries[0] ?? null }
      });
    }
    /** Recalcula puntuación y agregados de los anunciantes indicados (o de todos). */
    async recompute(pageIds, now = /* @__PURE__ */ new Date()) {
      const ads = await this.allAds();
      const byPage = /* @__PURE__ */ new Map();
      for (const a of ads) byPage.set(a.pageId, [...byPage.get(a.pageId) ?? [], a]);
      const targets = pageIds ?? Array.from(byPage.keys());
      for (const pageId of targets) {
        const list = byPage.get(pageId) ?? [];
        const tx = this.idb.transaction(["ads", "advertisers"], "readwrite");
        const advStore = tx.objectStore("advertisers");
        if (!list.length) {
          advStore.delete(pageId);
          await done(tx);
          continue;
        }
        const stats = computeAdvertiserStats(list, now);
        for (const a of list) {
          const s = stats.perAd.get(a.id);
          if (s) tx.objectStore("ads").put({ ...a, score: s.score, scoreBreakdown: s.signals });
        }
        const adv = await req(advStore.get(pageId));
        if (adv) {
          advStore.put({ ...adv, totalAds: stats.totalAds, activeAds: stats.activeAds, landingCount: stats.landingCount, mainNiche: stats.mainNiche });
        }
        await done(tx);
      }
      return targets.length;
    }
    /**
     * Vuelve a calcular landing page y nicho (por reglas) de los anuncios ya
     * guardados, para aplicar mejoras de versiones nuevas sin recapturar.
     */
    async reindex() {
      const ads = await this.allAds();
      const advs = new Map((await this.allAdvertisers()).map((a) => [a.pageId, a]));
      const tx = this.idb.transaction("ads", "readwrite");
      for (const a of ads) {
        const landing = normalizeLanding(a.linkUrl, a.caption);
        const next = {
          ...a,
          body: cleanTemplate(a.body),
          title: cleanTemplate(a.title),
          linkDescription: cleanTemplate(a.linkDescription),
          landingKey: landing?.key ?? null,
          landingDomain: landing?.domain ?? null,
          linkUrl: landing?.url ?? null
        };
        if (a.nicheSource !== "ai" && a.nicheSource !== "manual") {
          const r = classifyByRules({
            body: next.body,
            title: next.title,
            linkDescription: next.linkDescription,
            caption: landing?.domain ?? a.caption,
            pageName: a.pageName,
            categories: advs.get(a.pageId)?.categories
          });
          next.niche = r.niche;
          next.nicheConfidence = r.confidence;
          next.nicheSource = r.niche ? "rules" : null;
          next.nicheTerms = r.terms;
        }
        tx.objectStore("ads").put(next);
      }
      await done(tx);
      await this.recompute();
      return ads.length;
    }
    /** Retención: borra anuncios no favoritos que no se ven hace más de `days` días. */
    async purge(days = RETENTION_DAYS, now = /* @__PURE__ */ new Date()) {
      const cutoff = new Date(now.getTime() - days * 864e5).toISOString();
      const favs = await this.favorites();
      const stale = (await this.allAds()).filter((a) => a.lastSeenAt < cutoff && !favs.has(a.id));
      if (!stale.length) return 0;
      const tx = this.idb.transaction("ads", "readwrite");
      for (const a of stale) tx.objectStore("ads").delete(a.id);
      await done(tx);
      await this.recompute(Array.from(new Set(stale.map((a) => a.pageId))), now);
      return stale.length;
    }
    async clear() {
      const tx = this.idb.transaction(["ads", "advertisers", "favorites", "log"], "readwrite");
      for (const s of ["ads", "advertisers", "favorites", "log"]) tx.objectStore(s).clear();
      await done(tx);
    }
    async exportAll() {
      return {
        format: "cifra-radar",
        version: 1,
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        ads: await this.allAds(),
        advertisers: await this.allAdvertisers(),
        favorites: Array.from((await this.favorites()).values())
      };
    }
    /**
     * Importa un respaldo de Cifra Radar o una respuesta de la Ad Library API
     * ({ data: [...] }). Devuelve cuántos anuncios se cargaron.
     */
    async importFile(json, countries = []) {
      const obj = json;
      if (obj && obj.format === "cifra-radar" && Array.isArray(obj.ads)) {
        const tx = this.idb.transaction(["ads", "advertisers", "favorites"], "readwrite");
        for (const a of obj.ads) if (a && typeof a.id === "string" && typeof a.pageId === "string") tx.objectStore("ads").put(a);
        for (const a of obj.advertisers ?? []) if (a && typeof a.pageId === "string") tx.objectStore("advertisers").put(a);
        for (const f of obj.favorites ?? []) if (f && typeof f.adId === "string") tx.objectStore("favorites").put(f);
        await done(tx);
        await this.recompute();
        return { kind: "Respaldo de Cifra Radar", count: obj.ads.length };
      }
      const items = Array.isArray(json) ? json : Array.isArray(obj?.data) ? obj.data : Array.isArray(obj?.nodes) ? obj.nodes : [];
      const ads = [];
      for (const it of items.slice(0, 5e3)) {
        if (!it || typeof it !== "object") continue;
        const m = "ad_archive_id" in it ? mapLibraryNode(it, { countries }) : mapArchivedAd(it, { countries });
        if (m) ads.push(m);
      }
      const r = await this.ingest(ads, { source: "import", queryCountries: countries, context: { kind: "archivo" } });
      return { kind: "Resultados de la Biblioteca / API", count: r.created + r.updated };
    }
  };

  // src/ext/app.ts
  var SAFE_URL = /^(https?:|chrome-extension:|(?![a-z][a-z0-9+.-]*:))/i;
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs ?? {})) {
      if (v === null || v === void 0 || v === false) continue;
      if (typeof v === "function") el.addEventListener(k.replace(/^on/, ""), v);
      else if ((k === "href" || k === "src" || k === "poster") && !SAFE_URL.test(String(v).replace(/[\u0000-\u0020\u007f]/g, ""))) continue;
      else if (k === "class") el.className = String(v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    const add = (c) => {
      if (c === null || c === void 0 || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    };
    children.forEach(add);
    return el;
  }
  var LIBRARY_HOME = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&media_type=all";
  var state = {
    store: null,
    ads: [],
    advertisers: /* @__PURE__ */ new Map(),
    favorites: /* @__PURE__ */ new Map(),
    log: [],
    tab: "discover",
    country: "CO",
    queries: DEFAULT_QUERIES.join("\n"),
    searchLeft: MAX_PER_HOUR,
    disc: null,
    cancel: false,
    live: { q: "", running: false, message: "" },
    limit: 60,
    f: {
      q: "",
      status: "active",
      niche: "",
      country: "",
      platform: "",
      format: "",
      offer: "",
      minDays: "",
      minScore: "",
      pageId: "",
      landing: "",
      query: "",
      sort: "longest"
    },
    advQuery: "",
    landingQuery: ""
  };
  var SORTS = {
    longest: { label: "Más días activos", fn: (a, b) => (b.days ?? -1) - (a.days ?? -1) || b.score - a.score },
    score: { label: "Mayor puntuación", fn: (a, b) => b.score - a.score || (b.days ?? -1) - (a.days ?? -1) },
    newest: { label: "Más recientes", fn: (a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "") },
    variants: { label: "Más variantes", fn: (a, b) => (b.collationCount ?? 1) - (a.collationCount ?? 1) || b.score - a.score },
    advertiser: { label: "Anunciantes con más anuncios", fn: (a, b) => b.advActive - a.advActive || b.score - a.score },
    seen: { label: "Vistos recientemente", fn: (a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt) },
    views: {
      label: "Más vistos (ranking de Meta)",
      fn: (a, b) => (a.impressionRank ?? 1e9) - (b.impressionRank ?? 1e9) || b.score - a.score
    }
  };
  async function load() {
    const store = state.store;
    const [ads, advs, favs, log] = await Promise.all([store.allAds(), store.allAdvertisers(), store.favorites(), store.log(15)]);
    state.advertisers = new Map(advs.map((a) => [a.pageId, a]));
    state.favorites = favs;
    state.log = log;
    state.ads = ads.map((a) => {
      const adv = state.advertisers.get(a.pageId);
      return {
        ...a,
        days: daysActive(a.startDate, { isActive: a.isActive, stopDate: a.stopDate, lastSeenAt: a.lastSeenAt }),
        fav: favs.has(a.id),
        advActive: adv?.activeAds ?? 0,
        avatar: adv?.avatarUrl ?? null,
        search: normalizeText([a.pageName, a.title, a.body, a.linkDescription, a.caption, a.landingKey].filter(Boolean).join(" "))
      };
    });
    render();
  }
  function filtered() {
    const f = state.f;
    const terms = normalizeText(f.q).split(" ").filter((t) => t.length >= 2);
    const minDays = Number(f.minDays) || 0;
    const minScore = Number(f.minScore) || 0;
    return state.ads.filter((a) => {
      if (a.isManual) return false;
      if (f.status === "active" && !a.isActive) return false;
      if (f.status === "inactive" && a.isActive) return false;
      if (f.niche && (f.niche === "none" ? a.niche : a.niche !== f.niche)) return false;
      if (f.country && !a.countries.includes(f.country)) return false;
      if (f.platform && !a.platforms.includes(f.platform)) return false;
      if (f.format && a.format !== f.format) return false;
      if (f.offer && !a.offers.includes(f.offer)) return false;
      if (minDays && (a.days ?? 0) < minDays) return false;
      if (minScore && a.score < minScore) return false;
      if (f.pageId && a.pageId !== f.pageId) return false;
      if (f.landing && a.landingKey !== f.landing) return false;
      if (f.query && !(a.queries ?? []).includes(f.query)) return false;
      return terms.every((t) => a.search.includes(t));
    }).sort(SORTS[f.sort]?.fn ?? SORTS.longest.fn);
  }
  function facet(values) {
    const m = /* @__PURE__ */ new Map();
    for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }
  function avatar(name, url, size = 32) {
    return url ? h("img", { class: "avatar", src: url, alt: "", width: size, height: size, referrerpolicy: "no-referrer", style: `width:${size}px;height:${size}px` }) : h("span", { class: "avatar avatar-letter", style: `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px` }, name.trim().charAt(0).toUpperCase() || "?");
  }
  function scoreBadge(score, big = false) {
    const tier = scoreTier(score);
    return h("span", { class: `score score-${tier.tone}${big ? " score-big" : ""}`, title: `Puntuación orientativa: ${tier.label}` }, String(score), h("small", null, "/100"));
  }
  function mediaThumb(media, libraryUrl2) {
    const first2 = media[0];
    const src = first2 ? first2.type === "video" ? first2.preview : first2.url : null;
    const placeholder = () => h("div", { class: "thumb thumb-empty" }, first2 ? "La creatividad expiró: ábrela en la Biblioteca." : "Creatividad disponible en la Biblioteca");
    if (!first2 || !src) return placeholder();
    const img = h("img", { src, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
    img.addEventListener("error", () => wrap.replaceWith(placeholder()));
    const wrap = h(
      "div",
      { class: "thumb" },
      img,
      first2.type === "video" ? h("span", { class: "thumb-tag" }, "▶ Video") : null,
      media.length > 1 ? h("span", { class: "thumb-tag thumb-tag-right" }, `${media.length} piezas`) : null
    );
    void libraryUrl2;
    return wrap;
  }
  function favButton(ad, compact = true) {
    const btn = h("button", { class: `fav${ad.fav ? " on" : ""}${compact ? "" : " btn"}`, title: ad.fav ? "Quitar de favoritos" : "Guardar en favoritos", "aria-pressed": String(ad.fav) }, ad.fav ? "★" : "☆", compact ? null : ad.fav ? " En favoritos" : " Favorito");
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await state.store.setFavorite(ad.id, !ad.fav);
      await load();
      if (document.querySelector(".modal")) openDetail(ad.id);
    });
    return btn;
  }
  var libraryUrl = (id) => `https://www.facebook.com/ads/library/?id=${encodeURIComponent(id)}`;
  function chip(text, cls = "") {
    return h("span", { class: `chip ${cls}` }, text);
  }
  function card(ad) {
    return h(
      "article",
      { class: "card ad", onclick: () => openDetail(ad.id) },
      h(
        "div",
        { class: "ad-head" },
        avatar(ad.pageName, ad.avatar),
        h(
          "div",
          { class: "ad-head-text" },
          h("a", { href: "#", class: "strong", onclick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            filterBy({ pageId: ad.pageId });
          } }, ad.pageName),
          h("small", null, `${ad.advActive} ${ad.advActive === 1 ? "anuncio activo" : "anuncios activos"}`)
        ),
        favButton(ad)
      ),
      mediaThumb(ad.media, libraryUrl(ad.id)),
      h(
        "div",
        { class: "ad-body" },
        h(
          "div",
          { class: "row between" },
          h("div", null, h("div", { class: "days" }, fmtDays(ad.days)), h("small", null, `${ad.isActive ? "activo" : "circuló"} · desde ${fmtDate(ad.startDate)}`)),
          scoreBadge(ad.score)
        ),
        ad.title ? h("p", { class: "strong" }, truncate(ad.title, 90)) : null,
        h("p", { class: "muted clamp" }, ad.body ? truncate(ad.body, 260) : "Sin texto disponible."),
        h(
          "div",
          { class: "chips" },
          ad.niche ? chip(nicheLabel(ad.niche), "chip-accent") : null,
          chip(FORMAT_LABELS[ad.format] ?? ad.format),
          ad.impressionRank && ad.impressionRank <= 30 ? chip(`Top #${ad.impressionRank} vistos`, "chip-hot") : null,
          (ad.collationCount ?? 1) > 1 ? chip(`${ad.collationCount} copias activas`, "chip-strong") : null,
          ad.platforms.map((p) => chip(PLATFORM_LABELS[p]?.short ?? p)),
          ad.countries.slice(0, 3).map((c) => chip(c)),
          ad.partial ? chip("Parcial", "chip-warn") : null
        ),
        ad.landingKey ? h("a", { href: "#", class: "landing", onclick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          filterBy({ landing: ad.landingKey });
        } }, `→ ${ad.landingKey}`) : h("small", { class: "muted" }, "Sin landing identificada")
      )
    );
  }
  function filterBy(patch) {
    state.f = { ...state.f, pageId: "", landing: "", query: "", ...patch, status: patch.pageId || patch.landing || patch.query ? "all" : state.f.status };
    state.tab = "ads";
    state.limit = 60;
    closeDetail();
    render();
    window.scrollTo({ top: 0 });
  }
  function select(label, value, options, onChange, any = "Todos") {
    const s = h("select", null, h("option", { value: "" }, any), options.map(([v, l]) => h("option", { value: v, selected: v === value }, l)));
    s.value = value;
    s.addEventListener("change", () => onChange(s.value));
    return h("label", { class: "field" }, h("span", null, label), s);
  }
  function emptyState() {
    return h(
      "section",
      { class: "card empty" },
      h("h2", null, "Tu radar está vacío"),
      h("p", { class: "muted" }, "Cifra Radar guarda anuncios reales de la Biblioteca de Anuncios de Meta. Nunca muestra anuncios inventados."),
      h("p", null, "Ve a «Descubrir» y pulsa «Llenar mi radar»: Cifra Radar buscará por ti en la Biblioteca de Anuncios y categorizará lo que encuentre."),
      h(
        "div",
        { class: "row wrap center-row" },
        h("button", { class: "btn btn-primary", onclick: () => {
          state.tab = "discover";
          render();
        } }, "Ir a Descubrir"),
        h("a", { class: "btn", href: LIBRARY_HOME, target: "_blank", rel: "noopener" }, "Abrir la Biblioteca de Anuncios")
      ),
      h("p", { class: "muted small" }, "También puedes buscar tú en la Biblioteca y pulsar «Guardar en Cifra Radar» en el panel de abajo a la derecha.")
    );
  }
  function adsView() {
    if (!state.ads.filter((a) => !a.isManual).length) return emptyState();
    const f = state.f;
    const list = filtered();
    const base = state.ads.filter((a) => !a.isManual);
    const set = (k) => (v) => {
      state.f = { ...state.f, [k]: v };
      state.limit = 60;
      render();
    };
    const search = h("input", { type: "search", placeholder: "Busca por texto, producto, anunciante o dominio…", value: f.q, class: "search" });
    let timer;
    search.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        state.f.q = search.value;
        state.limit = 60;
        renderResults();
      }, 200);
    });
    const filters = h(
      "div",
      { class: "filters" },
      select("Estado", f.status === "active" ? "" : f.status, [["all", "Activos e inactivos"], ["inactive", "Inactivos"]], (v) => set("status")(v || "active"), "Activos"),
      select("Nicho", f.niche, facet(base.map((a) => a.niche ?? "none")).map(([v, n]) => [v, `${nicheLabel(v === "none" ? null : v)} (${n})`]), set("niche")),
      select("País", f.country, facet(base.flatMap((a) => a.countries)).map(([v, n]) => [v, `${countryName(v)} (${n})`]), set("country")),
      select("Plataforma", f.platform, facet(base.flatMap((a) => a.platforms)).map(([v, n]) => [v, `${PLATFORM_LABELS[v]?.label ?? v} (${n})`]), set("platform")),
      select("Formato", f.format, facet(base.map((a) => a.format)).map(([v, n]) => [v, `${FORMAT_LABELS[v] ?? v} (${n})`]), set("format")),
      select("Oferta", f.offer, facet(base.flatMap((a) => a.offers)).map(([v, n]) => [v, `${v} (${n})`]), set("offer"), "Cualquiera"),
      select("Días activos", f.minDays, [7, 14, 30, 60, 90, 180].map((d) => [String(d), `${d}+ días`]), set("minDays"), "Cualquiera"),
      select("Puntuación", f.minScore, [40, 55, 70, 85].map((d) => [String(d), `${d}+`]), set("minScore"), "Cualquiera"),
      select("Búsqueda", f.query, facet(base.flatMap((a) => a.queries ?? [])).map(([v, n]) => [v, `«${v}» (${n})`]), set("query"), "Todas")
    );
    const sort = select("Ordenar", f.sort, Object.entries(SORTS).map(([k, s]) => [k, s.label]), set("sort"), "—");
    const active = f.pageId || f.landing || f.query;
    return h(
      "div",
      null,
      h("div", { class: "toolbar" }, search, sort),
      filters,
      active ? h(
        "p",
        { class: "muted" },
        f.pageId ? `Anunciante: ${state.advertisers.get(f.pageId)?.name ?? f.pageId}. ` : "",
        f.landing ? `Landing: ${f.landing}. ` : "",
        f.query ? `Búsqueda: «${f.query}». ` : "",
        h("a", { href: "#", onclick: (e) => {
          e.preventDefault();
          state.f = { ...state.f, pageId: "", landing: "", query: "" };
          render();
        } }, "Quitar")
      ) : null,
      h("div", { id: "results" }, resultsBlock(list))
    );
  }
  function resultsBlock(list) {
    const shown = list.slice(0, state.limit);
    return h(
      "div",
      null,
      h("p", { class: "muted" }, `${fmtNum(list.length)} ${list.length === 1 ? "anuncio" : "anuncios"} · ${SORTS[state.f.sort]?.label.toLowerCase()}`),
      shown.length ? h("div", { class: "grid" }, shown.map(card)) : h("div", { class: "card empty" }, "Ningún anuncio coincide con estos filtros."),
      list.length > shown.length ? h("button", { class: "btn more", onclick: () => {
        state.limit += 60;
        renderResults();
      } }, `Mostrar más (${fmtNum(list.length - shown.length)} restantes)`) : null
    );
  }
  function renderResults() {
    const box = document.getElementById("results");
    if (box) box.replaceChildren(resultsBlock(filtered()));
  }
  function advertisersView() {
    const rows = Array.from(state.advertisers.values()).filter((a) => !state.advQuery || normalizeText(a.name).includes(normalizeText(state.advQuery))).map((a) => {
      const ads = state.ads.filter((x) => x.pageId === a.pageId && x.isActive);
      const oldest = ads.reduce((m, x) => x.days !== null && (m === null || x.days > m) ? x.days : m, null);
      const avg = ads.length ? Math.round(ads.reduce((s, x) => s + x.score, 0) / ads.length) : 0;
      return { a, oldest, avg };
    }).sort((x, y) => y.a.activeAds - x.a.activeAds || (y.oldest ?? 0) - (x.oldest ?? 0));
    const q = h("input", { type: "search", class: "search", placeholder: "Buscar anunciante", value: state.advQuery });
    q.addEventListener("change", () => {
      state.advQuery = q.value;
      render();
    });
    return h(
      "div",
      null,
      h("div", { class: "toolbar" }, q),
      h("p", { class: "muted" }, `${fmtNum(rows.length)} anunciantes, ordenados por anuncios activos al mismo tiempo.`),
      h(
        "div",
        { class: "card list" },
        rows.map(
          ({ a, oldest, avg }) => h(
            "div",
            { class: "list-row", onclick: () => filterBy({ pageId: a.pageId }) },
            avatar(a.name, a.avatarUrl, 40),
            h("div", { class: "grow" }, h("div", { class: "strong" }, a.name), h("small", { class: "muted" }, nicheLabel(a.mainNiche))),
            h("div", { class: "stat" }, h("b", null, fmtNum(a.activeAds)), h("small", null, "activos")),
            h("div", { class: "stat" }, h("b", null, fmtNum(a.landingCount)), h("small", null, a.landingCount === 1 ? "landing" : "landings")),
            h("div", { class: "stat" }, h("b", null, fmtDays(oldest)), h("small", null, "más antiguo")),
            scoreBadge(avg),
            libraryPageUrl(a.pageId) ? h("a", { href: libraryPageUrl(a.pageId), target: "_blank", rel: "noopener", class: "btn small", onclick: (e) => e.stopPropagation() }, "Biblioteca ↗") : null
          )
        )
      )
    );
  }
  function landingsView() {
    const groups = /* @__PURE__ */ new Map();
    for (const a of state.ads) if (a.landingKey && !a.isManual) groups.set(a.landingKey, [...groups.get(a.landingKey) ?? [], a]);
    const rows = Array.from(groups.entries()).filter(([k, list]) => !state.landingQuery || k.includes(state.landingQuery.toLowerCase()) || list.some((a) => normalizeText(a.pageName).includes(normalizeText(state.landingQuery)))).map(([key, list]) => ({
      key,
      list,
      active: list.filter((a) => a.isActive).length,
      advertisers: Array.from(new Set(list.map((a) => a.pageName))),
      maxDays: list.reduce((m, a) => a.days !== null && (m === null || a.days > m) ? a.days : m, null),
      best: Math.max(...list.map((a) => a.score)),
      url: list.find((a) => a.linkUrl)?.linkUrl ?? null,
      sample: list.find((a) => a.media.length) ?? list[0]
    })).sort((a, b) => b.list.length - a.list.length || b.active - a.active);
    const q = h("input", { type: "search", class: "search", placeholder: "Dominio, ruta o anunciante", value: state.landingQuery });
    q.addEventListener("change", () => {
      state.landingQuery = q.value;
      render();
    });
    return h(
      "div",
      null,
      h("div", { class: "toolbar" }, q),
      h("p", { class: "muted" }, "Anuncios agrupados por la página a la que dirigen, sin parámetros de seguimiento."),
      h(
        "div",
        { class: "grid grid-wide" },
        rows.map(
          (g) => h(
            "article",
            { class: "card landing-card", onclick: () => filterBy({ landing: g.key }) },
            h("div", { class: "landing-thumb" }, mediaThumb(g.sample.media, libraryUrl(g.sample.id))),
            h(
              "div",
              { class: "grow" },
              h("div", { class: "strong break" }, g.key),
              h("small", { class: "muted" }, g.advertisers.slice(0, 4).join(", ")),
              h(
                "div",
                { class: "chips" },
                chip(`${g.list.length} anuncios`),
                chip(`${g.active} activos`),
                chip(`${g.advertisers.length} ${g.advertisers.length === 1 ? "anunciante" : "anunciantes"}`),
                chip(`máx. ${fmtDays(g.maxDays)}`),
                scoreBadge(g.best)
              ),
              g.url ? h("a", { href: g.url, target: "_blank", rel: "noopener noreferrer nofollow", class: "small-link", onclick: (e) => e.stopPropagation() }, "Abrir landing ↗") : null
            )
          )
        )
      ),
      rows.length ? null : h("div", { class: "card empty" }, "Aún no hay landing pages identificadas.")
    );
  }
  function favoritesView() {
    const list = state.ads.filter((a) => a.fav).sort(SORTS.longest.fn);
    return h(
      "div",
      null,
      h("p", { class: "muted" }, `${fmtNum(list.length)} anuncios guardados. Los favoritos no se borran por la retención.`),
      list.length ? h("div", { class: "grid" }, list.map(card)) : h("div", { class: "card empty" }, "Usa la estrella de cualquier anuncio para guardarlo aquí.")
    );
  }
  function dataView() {
    const total = state.ads.length;
    const active = state.ads.filter((a) => a.isActive).length;
    const msg = h("p", { class: "muted", id: "data-msg" });
    const say = (t) => msg.textContent = t;
    const file = h("input", { type: "file", accept: "application/json,.json" });
    file.addEventListener("change", async () => {
      const f = file.files?.[0];
      if (!f) return;
      try {
        const r = await state.store.importFile(JSON.parse(await f.text()));
        say(`Importado (${r.kind}): ${fmtNum(r.count)} anuncios.`);
        await load();
      } catch (e) {
        say(`No se pudo importar: ${e.message}`);
      }
    });
    return h(
      "div",
      { class: "stack" },
      h(
        "section",
        { class: "card pad" },
        h("h2", null, "Tus datos"),
        h("p", null, `${fmtNum(total)} anuncios (${fmtNum(active)} activos) de ${fmtNum(state.advertisers.size)} anunciantes, guardados solo en este Chrome.`),
        h(
          "p",
          { class: "muted" },
          `Las creatividades no se descargan: se guardan sus enlaces originales, que Meta hace expirar. Los anuncios no favoritos que no se vuelven a ver en ${RETENTION_DAYS} días se borran solos.`
        ),
        h(
          "div",
          { class: "row wrap" },
          h("button", {
            class: "btn btn-primary",
            onclick: async () => {
              const data = await state.store.exportAll();
              const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
              const a = h("a", { href: url, download: `cifra-radar-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json` });
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 2e3);
              say("Respaldo descargado. Puedes importarlo en otro Chrome o en la plataforma web.");
            }
          }, "Descargar respaldo (JSON)"),
          h("label", { class: "btn" }, "Importar archivo JSON", file),
          h("button", { class: "btn", onclick: async () => {
            const n = await state.store.recompute();
            say(`Puntuaciones recalculadas para ${n} anunciantes.`);
            await load();
          } }, "Recalcular puntuaciones"),
          h("button", {
            class: "btn danger",
            onclick: async () => {
              if (!confirm("¿Borrar todos los anuncios, anunciantes y favoritos guardados en este Chrome?")) return;
              await state.store.clear();
              say("Datos borrados.");
              await load();
            }
          }, "Borrar todo")
        ),
        msg
      ),
      h(
        "section",
        { class: "card pad" },
        h("h2", null, "Últimas capturas"),
        state.log.length ? h(
          "table",
          null,
          h("thead", null, h("tr", null, ["Cuándo", "Búsqueda", "Recibidos", "Nuevos", "Actualizados"].map((t) => h("th", null, t)))),
          h(
            "tbody",
            null,
            state.log.map(
              (l) => h(
                "tr",
                null,
                h("td", null, timeAgo(l.createdAt)),
                h("td", null, [l.context.q ? `«${String(l.context.q)}»` : "", l.context.country ? ` · ${String(l.context.country)}` : ""].join("") || "—"),
                h("td", null, fmtNum(l.received)),
                h("td", null, fmtNum(l.created)),
                h("td", null, fmtNum(l.updated))
              )
            )
          )
        ) : h("p", { class: "muted" }, "Todavía no hay capturas.")
      ),
      h("p", { class: "muted small" }, SCORE_DISCLAIMER)
    );
  }
  function countrySelect() {
    const s = h(
      "select",
      { class: "inline-select", "aria-label": "País" },
      DISCOVERY_COUNTRIES.map((c) => h("option", { value: c, selected: c === state.country }, countryName(c)))
    );
    s.value = state.country;
    s.addEventListener("change", () => {
      state.country = s.value;
      chrome.storage.local.set({ discoveryCountry: s.value }).catch(() => {
      });
    });
    return s;
  }
  async function startLiveSearch(q) {
    q = q.trim();
    if (!q || state.live.running || state.disc?.running) return;
    if (await searchesLeft() <= 0) {
      state.live.message = `Llegaste al límite de ${MAX_PER_HOUR} búsquedas por hora. Continúa más tarde.`;
      render();
      return;
    }
    state.live = { q, running: true, message: `Buscando «${q}» en la Biblioteca de ${countryName(state.country)}…` };
    render();
    const r = await runSearchJob(q, state.country, 3);
    await load();
    state.live = {
      q,
      running: false,
      message: r.blocked ? blockedMessage(r.blocked) : r.detected ? `«${q}»: ${r.created} nuevos y ${r.updated} actualizados.` : `«${q}»: ${r.error ?? "no se encontraron anuncios"}.`
    };
    state.searchLeft = await searchesLeft();
    if (r.detected && !r.blocked) filterBy({ query: q.toLowerCase() });
    else render();
  }
  async function startDiscovery() {
    if (state.disc?.running || state.live.running) return;
    const queries = state.queries.split(/\n+/).map((x) => x.trim()).filter(Boolean);
    chrome.storage.local.set({ discoveryQueries: queries }).catch(() => {
    });
    state.cancel = false;
    await runDiscovery(
      queries,
      state.country,
      async (p) => {
        state.disc = p;
        state.searchLeft = await searchesLeft();
        await load();
      },
      () => state.cancel
    );
    try {
      localStorage.setItem("cifra-last-discovery", (/* @__PURE__ */ new Date()).toISOString());
    } catch {
    }
    await load();
  }
  function nicheCards() {
    const base = state.ads.filter((a) => !a.isManual && a.isActive);
    const groups = /* @__PURE__ */ new Map();
    for (const a of base) groups.set(a.niche ?? "none", [...groups.get(a.niche ?? "none") ?? [], a]);
    const list = Array.from(groups.entries()).sort((a, b) => a[0] === "none" ? 1 : b[0] === "none" ? -1 : b[1].length - a[1].length);
    return h(
      "div",
      { class: "niche-grid" },
      list.map(([niche, ads]) => {
        const top = [...ads].sort(SORTS.score.fn);
        const thumbs = top.filter((a) => a.media[0]).slice(0, 3);
        return h(
          "article",
          { class: "card niche-card", onclick: () => filterBy({ niche }) },
          h("div", { class: "niche-thumbs" }, thumbs.map((a) => mediaThumb(a.media, libraryUrl(a.id)))),
          h(
            "div",
            { class: "niche-body" },
            h("div", { class: "strong" }, nicheLabel(niche === "none" ? null : niche)),
            h("small", { class: "muted" }, `${fmtNum(ads.length)} anuncios activos · ${fmtNum(new Set(ads.map((a) => a.pageId)).size)} anunciantes`)
          )
        );
      })
    );
  }
  function row(title, list, more) {
    if (!list.length) return null;
    return h(
      "section",
      { class: "stack" },
      h("div", { class: "row between" }, h("h2", null, title), h("a", { href: "#", onclick: (e) => {
        e.preventDefault();
        more();
      } }, "Ver todos →")),
      h("div", { class: "grid" }, list.map(card))
    );
  }
  function discoverView() {
    const active = state.ads.filter((a) => !a.isManual && a.isActive);
    const busy = Boolean(state.disc?.running || state.live.running);
    const liveInput = h("input", { type: "search", class: "search", placeholder: "Palabra clave: producto, marca, oferta…", value: state.live.q });
    liveInput.addEventListener("input", () => state.live.q = liveInput.value);
    liveInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void startLiveSearch(liveInput.value);
    });
    const queries = h("textarea", { class: "queries", rows: 6, "aria-label": "Búsquedas" }, state.queries);
    queries.addEventListener("input", () => state.queries = queries.value);
    const d = state.disc;
    let last = null;
    try {
      last = localStorage.getItem("cifra-last-discovery");
    } catch {
    }
    const pct = d && d.total ? Math.round(d.done / d.total * 100) : 0;
    return h(
      "div",
      { class: "stack" },
      h(
        "section",
        { class: "hero card pad" },
        h("h1", null, "Anuncios que están escalando"),
        h(
          "p",
          { class: "muted" },
          active.length ? `${fmtNum(active.length)} anuncios activos de ${fmtNum(new Set(active.map((a) => a.pageId)).size)} anunciantes, categorizados por nicho.` : "Llena tu radar con un clic: Cifra Radar busca por ti en la Biblioteca de Anuncios de Meta y categoriza lo que encuentra."
        ),
        h(
          "div",
          { class: "toolbar" },
          liveInput,
          countrySelect(),
          h("button", { class: "btn btn-primary", disabled: busy, onclick: () => void startLiveSearch(liveInput.value) }, state.live.running ? "Buscando…" : "Buscar en la Biblioteca")
        ),
        state.live.message ? h("p", { class: "muted" }, state.live.message) : null
      ),
      h(
        "section",
        { class: "card pad" },
        h(
          "div",
          { class: "row between wrap" },
          h(
            "div",
            null,
            h("h2", null, "Llenar mi radar"),
            h("small", { class: "muted" }, `Una búsqueda por línea en ${countryName(state.country)}. ${last ? `Última actualización: ${timeAgo(last)}.` : "Aún no lo has llenado."}`)
          ),
          d?.running ? h("button", { class: "btn danger", onclick: () => {
            state.cancel = true;
          } }, "Detener") : h("button", { class: "btn btn-primary", disabled: busy, onclick: () => void startDiscovery() }, active.length ? "Actualizar mi radar" : "Llenar mi radar ahora")
        ),
        d ? h(
          "div",
          { class: "progress" },
          h("div", { class: "bar" }, h("i", { style: `width:${d.running ? Math.max(4, pct) : 100}%` })),
          h(
            "p",
            { class: "muted" },
            d.running ? `Buscando «${d.current ?? ""}» (${d.done + 1} de ${d.total}) · ${fmtNum(d.created)} anuncios nuevos hasta ahora` : d.message
          )
        ) : null,
        h("details", null, h("summary", null, "Editar búsquedas"), queries),
        h(
          "p",
          { class: "muted small" },
          `Cada búsqueda abre la Biblioteca en una pestaña de fondo de tu Chrome, ordenada por impresiones totales (los más vistos primero), guarda lo que carga y la cierra. Máximo ${MAX_PER_HOUR} búsquedas por hora (te quedan ${state.searchLeft}). Si Meta limita el acceso o pide iniciar sesión, se detiene sola. Meta no publica ventas: los «más vistos» salen de su propio orden por impresiones.`
        )
      ),
      active.length ? h("section", { class: "stack" }, h("h2", null, "Categorías"), nicheCards()) : null,
      row(
        "Más vistos según Meta",
        [...active].filter((a) => a.impressionRank).sort(SORTS.views.fn).slice(0, 8),
        () => {
          state.f = { ...state.f, sort: "views" };
          filterBy({});
        }
      ),
      row("Escalando ahora", [...active].sort(SORTS.score.fn).slice(0, 8), () => {
        state.f = { ...state.f, sort: "score" };
        filterBy({});
      }),
      row("Más copias activas", [...active].filter((a) => (a.collationCount ?? 1) > 1).sort(SORTS.variants.fn).slice(0, 8), () => {
        state.f = { ...state.f, sort: "variants" };
        filterBy({});
      }),
      row("Más tiempo activos", [...active].sort(SORTS.longest.fn).slice(0, 8), () => {
        state.f = { ...state.f, sort: "longest" };
        filterBy({});
      })
    );
  }
  function closeDetail() {
    document.querySelector(".modal")?.remove();
    document.body.classList.remove("no-scroll");
  }
  function fact(label, value) {
    return h("div", { class: "fact" }, h("dt", null, label), h("dd", null, value));
  }
  function openDetail(id) {
    const ad = state.ads.find((a) => a.id === id);
    if (!ad) return;
    closeDetail();
    const gallery = ad.media.length ? h(
      "div",
      { class: ad.media.length > 1 ? "gallery two" : "gallery" },
      ad.media.map(
        (m) => m.type === "video" ? h("video", { src: m.url, poster: m.preview ?? void 0, controls: true, preload: "none" }) : h("img", { src: m.url, alt: "", referrerpolicy: "no-referrer" })
      )
    ) : h("div", { class: "thumb thumb-empty" }, "Sin creatividad guardada: ábrelo en la Biblioteca para verla.");
    const tier = scoreTier(ad.score);
    const modal = h(
      "div",
      { class: "modal", onclick: (e) => {
        if (e.target === modal) closeDetail();
      } },
      h(
        "div",
        { class: "modal-box", role: "dialog", "aria-modal": "true" },
        h(
          "header",
          { class: "row between modal-head" },
          h("div", { class: "row" }, avatar(ad.pageName, ad.avatar, 40), h("div", null, h("div", { class: "strong big" }, ad.pageName), h("small", { class: "muted mono" }, `ID ${ad.id}`))),
          h("button", { class: "btn small", onclick: closeDetail, "aria-label": "Cerrar" }, "✕")
        ),
        h(
          "div",
          { class: "row wrap" },
          favButton(ad, false),
          h("a", { class: "btn", href: libraryUrl(ad.id), target: "_blank", rel: "noopener" }, "Ver en la Biblioteca ↗"),
          h("button", { class: "btn", onclick: () => filterBy({ pageId: ad.pageId }) }, "Más de este anunciante"),
          ad.landingKey ? h("button", { class: "btn", onclick: () => filterBy({ landing: ad.landingKey }) }, "Misma landing page") : null
        ),
        ad.partial ? h("p", { class: "warn" }, "Datos parciales leídos de la tarjeta visible. Vuelve a guardarlo desde la Biblioteca para completarlo.") : null,
        h(
          "div",
          { class: "detail" },
          h(
            "div",
            { class: "stack" },
            gallery,
            h(
              "section",
              { class: "card pad" },
              ad.title ? h("h3", null, ad.title) : null,
              h("p", { class: "pre" }, ad.body ?? "La fuente no entregó texto para este anuncio."),
              ad.linkDescription ? h("p", { class: "muted" }, ad.linkDescription) : null,
              h("div", { class: "chips" }, ad.ctaText ? chip(`Botón: ${ad.ctaText}`) : null, ad.offers.map((o) => chip(o, "chip-warn"))),
              ad.linkUrl ? h("p", null, "Destino: ", h("a", { href: ad.linkUrl, target: "_blank", rel: "noopener noreferrer nofollow", class: "break" }, ad.linkUrl)) : ad.landingDomain ? h("p", { class: "muted" }, `Destino: ${ad.landingDomain} (dominio visible)`) : null
            )
          ),
          h(
            "div",
            { class: "stack" },
            h(
              "section",
              { class: "card pad" },
              h("div", { class: "row between" }, h("div", null, h("div", { class: "strong" }, "Puntuación de oportunidad"), h("small", { class: "muted" }, `${tier.label} · orientativa`)), scoreBadge(ad.score, true)),
              h(
                "ul",
                { class: "signals" },
                ad.scoreBreakdown.map(
                  (s) => h(
                    "li",
                    null,
                    h("div", { class: "row between" }, h("span", { class: "strong" }, s.label), h("span", { class: "muted" }, `${s.points} / ${s.max}`)),
                    h("div", { class: "bar" }, h("i", { style: `width:${Math.min(100, s.points / s.max * 100)}%` })),
                    h("small", null, s.observed),
                    h("small", { class: "muted block" }, s.explanation)
                  )
                )
              ),
              h("p", { class: "warn" }, SCORE_DISCLAIMER)
            ),
            h(
              "section",
              { class: "card pad" },
              h(
                "dl",
                { class: "facts" },
                fact("Estado", ad.isActive ? "Activo" : "Inactivo"),
                fact("Empezó a circular", fmtDate(ad.startDate)),
                !ad.isActive && ad.stopDate ? fact("Dejó de circular", fmtDate(ad.stopDate)) : null,
                fact("Días activo", fmtDays(ad.days)),
                fact("Plataformas", ad.platforms.map((p) => PLATFORM_LABELS[p]?.label ?? p).join(", ") || "—"),
                fact("Países", ad.countries.map(countryName).join(", ") || "—"),
                fact("Idioma", ad.language ? LANGUAGE_NAMES[ad.language] ?? ad.language.toUpperCase() : "—"),
                fact("Formato", FORMAT_LABELS[ad.format] ?? ad.format),
                fact("Copias activas", ad.collationCount ? `${ad.collationCount} anuncios con esta creatividad` : "—"),
                ad.queries?.length ? fact("Encontrado en búsquedas", ad.queries.join(", ")) : null,
                ad.impressionRank ? fact(
                  "Ranking de impresiones",
                  `#${ad.impressionRank} en «${ad.impressionQuery ?? ""}»${ad.impressionCountry ? ` (${countryName(ad.impressionCountry)})` : ""} · ${timeAgo(ad.impressionAt)}`
                ) : null,
                fact("Nicho", `${nicheLabel(ad.niche)}${ad.nicheConfidence ? ` · ${Math.round(ad.nicheConfidence * 100)}%` : ""}`),
                ad.nicheTerms.length ? fact("Señales del nicho", ad.nicheTerms.slice(0, 5).join(", ")) : null,
                fact("Primera vez visto", fmtDate(ad.firstSeenAt)),
                fact("Última verificación", timeAgo(ad.lastSeenAt))
              )
            )
          )
        )
      )
    );
    document.body.append(modal);
    document.body.classList.add("no-scroll");
  }
  var TABS = [
    ["discover", "Descubrir"],
    ["ads", "Anuncios"],
    ["advertisers", "Anunciantes"],
    ["landings", "Landing pages"],
    ["favorites", "Favoritos"],
    ["data", "Datos"]
  ];
  function render() {
    const root = document.getElementById("app");
    const total = state.ads.filter((a) => !a.isManual);
    const view = state.tab === "discover" ? discoverView() : state.tab === "ads" ? adsView() : state.tab === "advertisers" ? advertisersView() : state.tab === "landings" ? landingsView() : state.tab === "favorites" ? favoritesView() : dataView();
    root.replaceChildren(
      h(
        "header",
        { class: "top" },
        h("div", { class: "brand" }, h("img", { src: "icons/icon48.png", alt: "", width: 28, height: 28 }), h("span", null, "Cifra ", h("b", null, "Radar"))),
        h(
          "nav",
          null,
          TABS.map(
            ([t, label]) => h(
              "button",
              { class: `tab${state.tab === t ? " active" : ""}`, onclick: () => {
                state.tab = t;
                render();
              } },
              label,
              t === "favorites" && state.favorites.size ? h("span", { class: "count" }, String(state.favorites.size)) : null
            )
          )
        ),
        h("div", { class: "muted small top-stats" }, `${fmtNum(total.filter((a) => a.isActive).length)} activos · ${fmtNum(state.advertisers.size)} anunciantes`)
      ),
      h("main", null, view),
      h("footer", { class: "muted small" }, "Datos públicos de la Biblioteca de Anuncios de Meta, guardados solo en tu navegador. Las puntuaciones son orientativas y no reflejan ventas ni rentabilidad.")
    );
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetail();
  });
  (async () => {
    state.store = await LocalStore.open();
    const DATA_VERSION = "3";
    try {
      if (localStorage.getItem("cifra-data-version") !== DATA_VERSION) {
        await state.store.reindex();
        localStorage.setItem("cifra-data-version", DATA_VERSION);
      }
    } catch {
    }
    try {
      const saved = await chrome.storage.local.get(["discoveryCountry", "discoveryQueries"]);
      if (saved.discoveryCountry) state.country = saved.discoveryCountry;
      if (Array.isArray(saved.discoveryQueries) && saved.discoveryQueries.length) state.queries = saved.discoveryQueries.join("\n");
      state.searchLeft = await searchesLeft();
    } catch {
    }
    await state.store.purge();
    await state.store.recompute();
    await load();
    try {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.type === "radar:updated") void load();
      });
    } catch {
    }
  })();
})();
