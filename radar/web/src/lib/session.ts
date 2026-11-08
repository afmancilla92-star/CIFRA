/** Sesión firmada con HMAC (Web Crypto: funciona en middleware edge y en Node). */
export const SESSION_COOKIE = "radar_session";
const MAX_AGE_S = 60 * 60 * 24 * 30;

function secret(): string | null {
  return process.env.SESSION_SECRET || process.env.APP_PASSWORD || null;
}

async function hmac(data: string, key: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(now = Date.now()) {
  const key = secret();
  if (!key) throw new Error("APP_PASSWORD no configurada");
  const exp = Math.floor(now / 1000) + MAX_AGE_S;
  return { token: `${exp}.${await hmac(`v1:${exp}`, key)}`, maxAge: MAX_AGE_S };
}

export async function verifySessionToken(token: string | undefined | null, now = Date.now()) {
  const key = secret();
  if (!key || !token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp * 1000 < now) return false;
  const expected = await hmac(`v1:${exp}`, key);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
