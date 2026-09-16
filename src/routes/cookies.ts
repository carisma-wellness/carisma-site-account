/**
 * Cookie names and (de)serialisation for the brand-site BFF.
 *
 * cw_session  httpOnly sealed session (the seal module)                Path=/
 * cw_txn      httpOnly sealed authorize transaction                    Path=/api/auth
 * cw-signed-in / cw-initials  readable hints the header reads post-mount  Path=/
 * cw-known       readable, 180 days: "this browser has signed in on THIS brand before".
 *                One bit, no identity. It is what lets a returner be checked on page
 *                load while cold (ad) traffic is never redirected anywhere.
 * cw-sso-probed  readable, browser-session: a silent check already ran here. Stops a loop.
 * cw-sso-seed    readable, session-length: signed in HERE by the in-pop-up door, and the
 *                identity origin has not been told yet. One attempt, then it is gone.
 * cw-sso-off     readable, 30 days: the person signed out on this brand. No silent check
 *                may sign them straight back in until they sign in again themselves.
 * cw-sso-signout readable, browser-session: signed out here; the next page load ends the
 *                identity origin's session too (one attempt).
 *
 * Every cookie is host-only (no Domain — see WP-MED-1's host-only requirement),
 * SameSite=Lax, and Secure UNLESS cookieSecure is false (local http origins cannot
 * receive a Secure cookie, so local bring-up sets it false; production leaves it on).
 */
export const COOKIES = {
  session: "cw_session",
  txn: "cw_txn",
  hintSignedIn: "cw-signed-in",
  hintInitials: "cw-initials",
  known: "cw-known",
  ssoProbed: "cw-sso-probed",
  ssoSeed: "cw-sso-seed",
  ssoOff: "cw-sso-off",
  ssoSignout: "cw-sso-signout",
} as const;

export const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
export const KNOWN_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export interface CookieOptions {
  path?: string;
  maxAge?: number; // seconds; omit for a session cookie
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
}

/** Parse the request Cookie header into a map. Last value wins on a duplicate name. */
export function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.get("cookie") || "";
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    const v = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const segs = [`${name}=${encodeURIComponent(value)}`];
  segs.push(`Path=${opts.path ?? "/"}`);
  if (typeof opts.maxAge === "number") segs.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  segs.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  if (opts.httpOnly !== false) segs.push("HttpOnly");
  if (opts.secure !== false) segs.push("Secure");
  return segs.join("; ");
}

/** A cookie that expires immediately (Max-Age=0). Used to clear on 401 / logout. */
export function clearCookie(name: string, opts: CookieOptions = {}): string {
  return serializeCookie(name, "", { ...opts, maxAge: 0 });
}

/**
 * The extra Set-Cookie values a site must write when it establishes a session
 * WITHOUT the identity origin (the in-pop-up sign-in): cw-known (so this browser is
 * checked on its next visit), cw-sso-seed (so the next page tells the identity origin
 * once, and the other brands can find the session), and a cleared cw-sso-off.
 */
export function inlineSessionCookies(opts: { secure: boolean; keep: boolean }): string[] {
  const base: CookieOptions = { path: "/", secure: opts.secure, sameSite: "Lax", httpOnly: false };
  return [
    serializeCookie(COOKIES.known, "1", { ...base, maxAge: KNOWN_MAX_AGE_SECONDS }),
    serializeCookie(COOKIES.ssoSeed, "1", { ...base, maxAge: opts.keep ? THIRTY_DAYS_SECONDS : undefined }),
    clearCookie(COOKIES.ssoOff, base),
  ];
}
