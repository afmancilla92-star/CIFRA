/**
 * Normalización de destinos (landing pages) para agrupar anuncios que
 * llevan a la misma página aunque cambien los parámetros de seguimiento.
 */

const REDIRECT_HOSTS = new Set(["l.facebook.com", "lm.facebook.com", "l.instagram.com", "l.messenger.com"]);

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|gbraid$|wbraid$|ttclid$|msclkid$|mc_cid$|mc_eid$|_hsenc$|_hsmi$|campaign_id$|adset_id$|ad_id$|h_ad_id$|placement$|site_source_name$|fbc_id$|hsa_|ref_src$|igshid$|si$|_branch_match_id$|_ga$|_gl$|cid$|adid$|cmpid$|clickid$|sub_id|subid)/i;

const MESSAGING_HOSTS = ["wa.me", "api.whatsapp.com", "whatsapp.com", "m.me", "messenger.com", "t.me", "telegram.me"];
const SOCIAL_HOSTS = ["facebook.com", "fb.com", "fb.me", "instagram.com", "tiktok.com", "youtube.com", "youtu.be", "threads.net", "x.com", "twitter.com"];
const APP_HOSTS = ["apps.apple.com", "itunes.apple.com", "play.google.com"];

export type LandingKind = "web" | "messaging" | "social" | "app_store";

export interface Landing {
  /** Clave de agrupación: dominio + ruta, sin parámetros de seguimiento. */
  key: string;
  domain: string;
  /** URL limpia para mostrar / abrir. */
  url: string | null;
  kind: LandingKind;
  /** true si solo conocemos el dominio visible (caption), no la URL completa. */
  domainOnly: boolean;
}

function hostMatches(host: string, list: string[]) {
  return list.some((h) => host === h || host.endsWith(`.${h}`));
}

export function landingKind(domain: string): LandingKind {
  if (hostMatches(domain, MESSAGING_HOSTS)) return "messaging";
  if (hostMatches(domain, APP_HOSTS)) return "app_store";
  if (hostMatches(domain, SOCIAL_HOSTS)) return "social";
  return "web";
}

/** Desenvuelve redirecciones de Facebook/Instagram (l.facebook.com/l.php?u=...). */
export function unwrapRedirect(raw: string): string {
  let current = raw.trim();
  for (let i = 0; i < 3; i++) {
    let u: URL;
    try {
      u = new URL(current);
    } catch {
      return current;
    }
    if (REDIRECT_HOSTS.has(u.hostname) && u.searchParams.get("u")) {
      current = u.searchParams.get("u") as string;
      continue;
    }
    return current;
  }
  return current;
}

function cleanHost(host: string) {
  return host.toLowerCase().replace(/^www\d?\./, "").replace(/\.$/, "");
}

export function normalizeLanding(linkUrl: string | null | undefined, caption?: string | null): Landing | null {
  if (linkUrl && /^https?:\/\//i.test(linkUrl.trim())) {
    try {
      const u = new URL(unwrapRedirect(linkUrl));
      if (u.protocol === "http:" || u.protocol === "https:") {
        const domain = cleanHost(u.hostname);
        for (const name of Array.from(u.searchParams.keys())) {
          const value = u.searchParams.get(name) ?? "";
          // Parámetros de seguimiento y macros dinámicas sin resolver ({{ad.id}}).
          if (TRACKING_PARAM.test(name) || /\{\{.*\}\}/.test(value)) u.searchParams.delete(name);
        }
        u.hash = "";
        let pathname = u.pathname.replace(/\/(index\.(html?|php))?$/i, "").replace(/\/{2,}/g, "/");
        if (!pathname) pathname = "";
        const query = u.searchParams.toString();
        const url = `${u.protocol}//${u.hostname.toLowerCase()}${pathname || "/"}${query ? `?${query}` : ""}`;
        const kind = landingKind(domain);
        // Para mensajería la ruta suele ser el número/usuario: agrupa por destino completo.
        const key = `${domain}${pathname.toLowerCase()}`;
        return { key, domain, url, kind, domainOnly: false };
      }
    } catch {
      // cae al caption
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
