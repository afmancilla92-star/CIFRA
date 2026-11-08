/** Estados miembro de la UE: la Ad Library API devuelve anuncios comerciales que llegaron a ellos. */
export const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

export const COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina", BO: "Bolivia", BR: "Brasil", CL: "Chile", CO: "Colombia", CR: "Costa Rica",
  CU: "Cuba", DO: "Rep. Dominicana", EC: "Ecuador", SV: "El Salvador", GT: "Guatemala",
  HN: "Honduras", MX: "México", NI: "Nicaragua", PA: "Panamá", PY: "Paraguay", PE: "Perú",
  PR: "Puerto Rico", UY: "Uruguay", VE: "Venezuela", US: "Estados Unidos", CA: "Canadá",
  ES: "España", PT: "Portugal", FR: "Francia", IT: "Italia", DE: "Alemania", GB: "Reino Unido",
  IE: "Irlanda", NL: "Países Bajos", BE: "Bélgica", AT: "Austria", PL: "Polonia", SE: "Suecia",
  DK: "Dinamarca", FI: "Finlandia", GR: "Grecia", CZ: "Chequia", RO: "Rumania", HU: "Hungría",
  BG: "Bulgaria", HR: "Croacia", SK: "Eslovaquia", SI: "Eslovenia", LT: "Lituania", LV: "Letonia",
  EE: "Estonia", LU: "Luxemburgo", MT: "Malta", CY: "Chipre", AU: "Australia", NZ: "Nueva Zelanda",
  IN: "India", ZA: "Sudáfrica", AE: "Emiratos Árabes", CH: "Suiza", NO: "Noruega", JP: "Japón",
};

export function countryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}
