/**
 * Paquete que usa la extensión (se compila a radar/extension/src/core.js).
 * Reúne la lógica compartida con la plataforma y el almacén local.
 */
export { LocalStore, mapExtensionPayload, isAdLibraryUrl, RETENTION_DAYS } from "./store";
export { daysActive } from "../lib/dates";
export { fmtDate, fmtDays, fmtNum, FORMAT_LABELS, PLATFORM_LABELS, SOURCE_LABELS, libraryPageUrl, timeAgo } from "../lib/format";
export { LANGUAGE_NAMES } from "../lib/lang";
export { NICHES, nicheLabel } from "../lib/niche/catalog";
export { SCORE_DISCLAIMER, scoreTier } from "../lib/scoring";
export { countryName } from "../lib/sources/countries";
export { normalizeText, truncate } from "../lib/text";
