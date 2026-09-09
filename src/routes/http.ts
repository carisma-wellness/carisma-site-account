import { COOKIES, clearCookie, serializeCookie, THIRTY_DAYS_SECONDS, type CookieOptions } from "./cookies.js";
import type { ResolvedConfig } from "./config.js";

export const NO_STORE_HEADERS: Record<string, string> = {
  "content-type": "application/json",
  "cache-control": "private, no-store",
};

export function json(body: unknown, status = 200, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...NO_STORE_HEADERS, ...(extra ?? {}) } });
}

/**
 * Unwrap the CarismaSoft house envelope {success:true,data,message} to its flat `data`.
 * EVERY backend reply is enveloped (shared/utils/apiResponse.successResponse), while the
 * session/exchange builders read tokens and profile fields FLAT — so a token exchange
 * finds no session and /profile renders a card with an empty name unless the reply is
 * unwrapped here. A non-enveloped body, an error body {success:false}, or an array
 * (never a house envelope) passes through untouched.
 */
export function unwrapEnvelope(body: unknown): unknown {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const o = body as Record<string, unknown>;
    if (o.success === true && "data" in o) return o.data;
  }
  return body;
}

/**
 * THE load-bearing predicate. The session/proxy layer clears the sealed cookie and
 * the hints only when this returns true. It returns true for EXACTLY one status: 401.
 *
 * NEGATIVE CONTROL (charter Sec.5): widen this to `status === 401 || status >= 500`
 * and session.test.mjs "a 500 must NOT clear the cookie" goes red. A gate that
 * cannot fail is not a gate — this is the one line the sabotage flips.
 */
export function shouldClearSession(status: number): boolean {
  return status === 401;
}

function baseCookieOpts(cfg: ResolvedConfig): CookieOptions {
  return { path: "/", secure: cfg.cookieSecure, sameSite: "Lax" };
}

/** Append Set-Cookie headers that clear cw_session and both hints. */
export function appendClearSession(headers: Headers, cfg: ResolvedConfig): void {
  headers.append("set-cookie", clearCookie(COOKIES.session, { ...baseCookieOpts(cfg), httpOnly: true }));
  headers.append("set-cookie", clearCookie(COOKIES.hintSignedIn, { ...baseCookieOpts(cfg), httpOnly: false }));
  headers.append("set-cookie", clearCookie(COOKIES.hintInitials, { ...baseCookieOpts(cfg), httpOnly: false }));
}

/** A signed-out JSON response that also clears the sealed cookie and the hints. */
export function jsonClearing(body: unknown, cfg: ResolvedConfig, status = 200): Response {
  const headers = new Headers(NO_STORE_HEADERS);
  appendClearSession(headers, cfg);
  return new Response(JSON.stringify(body), { status, headers });
}

/** Append Set-Cookie headers that establish the sealed session + readable hints. */
export function appendSetSession(
  headers: Headers,
  cfg: ResolvedConfig,
  sealed: string,
  initials: string | undefined,
  keep: boolean,
): void {
  const maxAge = keep ? THIRTY_DAYS_SECONDS : undefined;
  headers.append(
    "set-cookie",
    serializeCookie(COOKIES.session, sealed, { ...baseCookieOpts(cfg), httpOnly: true, maxAge }),
  );
  headers.append(
    "set-cookie",
    serializeCookie(COOKIES.hintSignedIn, "1", { ...baseCookieOpts(cfg), httpOnly: false, maxAge }),
  );
  if (initials) {
    headers.append(
      "set-cookie",
      serializeCookie(COOKIES.hintInitials, initials, { ...baseCookieOpts(cfg), httpOnly: false, maxAge }),
    );
  }
}

/** Origin check for state-changing BFF routes (W-7). */
export function originAllowed(req: Request, cfg: ResolvedConfig): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return cfg.allowedOrigins.includes(origin);
}
