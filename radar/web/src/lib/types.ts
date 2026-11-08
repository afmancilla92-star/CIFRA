export type SourceKind = "meta_api" | "extension" | "import" | "manual";

export type AdFormat = "image" | "video" | "carousel" | "dco" | "text" | "unknown";

export type Platform =
  | "facebook"
  | "instagram"
  | "messenger"
  | "audience_network"
  | "whatsapp"
  | "threads";

export interface MediaItem {
  type: "image" | "video";
  url: string;
  /** Miniatura / poster cuando existe. */
  preview?: string | null;
}

/**
 * Anuncio normalizado, independiente de la fuente. Todas las fuentes
 * (API oficial, extensión, importación, carga manual) se traducen a esto
 * antes de entrar al pipeline de ingesta.
 */
export interface RawAd {
  /** Identificador de la Biblioteca de Anuncios (ad_archive_id). */
  id: string;
  pageId: string;
  pageName: string;
  isActive: boolean | null;
  /** Fecha ISO (YYYY-MM-DD) en que empezó a circular. */
  startDate: string | null;
  stopDate: string | null;
  platforms: Platform[];
  /** Códigos ISO 639-1 informados por la fuente. */
  languages: string[];
  /** Códigos ISO 3166-1 alfa-2 donde se mostró / se consultó. */
  countries: string[];
  body: string | null;
  title: string | null;
  linkDescription: string | null;
  /** Dominio visible bajo el anuncio (p. ej. "TIENDA.COM"). */
  caption: string | null;
  ctaText: string | null;
  linkUrl: string | null;
  format: AdFormat;
  media: MediaItem[];
  collationId: string | null;
  /** "N anuncios usan esta creatividad y este texto". */
  collationCount: number | null;
  euTotalReach: number | null;
  advertiser?: {
    pageUrl?: string | null;
    avatarUrl?: string | null;
    likes?: number | null;
    categories?: string[];
  };
  /** Datos incompletos (p. ej. lectura de la tarjeta visible sin JSON). */
  partial?: boolean;
}

export interface ScoreSignal {
  key:
    | "longevity"
    | "variants"
    | "advertiser_volume"
    | "message_repetition"
    | "creative_diversity"
    | "landing"
    | "continuity";
  label: string;
  points: number;
  max: number;
  /** Valor observado, legible ("43 días", "7 anuncios activos"). */
  observed: string;
  explanation: string;
}

export interface AdView {
  id: string;
  pageId: string;
  pageName: string;
  isActive: boolean;
  startDate: string | null;
  stopDate: string | null;
  daysActive: number | null;
  platforms: Platform[];
  languages: string[];
  countries: string[];
  language: string | null;
  body: string | null;
  title: string | null;
  linkDescription: string | null;
  caption: string | null;
  ctaText: string | null;
  linkUrl: string | null;
  landingKey: string | null;
  landingDomain: string | null;
  format: AdFormat;
  media: MediaItem[];
  mediaExpiresAt: string | null;
  collationCount: number | null;
  offers: string[];
  niche: string | null;
  nicheConfidence: number | null;
  nicheSource: string | null;
  nicheTerms: string[];
  euTotalReach: number | null;
  sources: SourceKind[];
  isManual: boolean;
  partial: boolean;
  score: number;
  scoreBreakdown: ScoreSignal[];
  firstSeenAt: string;
  lastSeenAt: string;
  isFavorite: boolean;
  favoriteNote: string | null;
  advertiserActiveAds: number;
  advertiserAvatar: string | null;
  libraryUrl: string;
}
