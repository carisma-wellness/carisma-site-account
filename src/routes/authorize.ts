import type { ResolvedConfig } from "./config.js";
import { seal, unseal } from "../seal/index.js";
import { COOKIES, parseCookies, serializeCookie, clearCookie } from "./cookies.js";
import { maskProfile } from "./profile.js";
import { appendSetSession, json } from "./http.js";
import { pkcePair, randomToken, safeNext, signService } from "./pkce.js";
import { buildAuthorizeUrl, callbackRedirectUri } from "../urls.js";

interface TxnPlaintext {
  v: 1;
  state: string;
  verifier: string;
  next: string;
  keep: boolean;
}

function redirectUri(_cfg: ResolvedConfig, origin: string): string {
  return callbackRedirectUri(origin);
}

/**
 * GET /api/auth/start — mint state + PKCE, seal cw_txn (Path=/api/auth, 10 min),
 * 302 to the identity origin's /authorize. Never carries an email.
 */
export function makeStart(cfg: ResolvedConfig) {
  return async function start(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const origin = url.origin;
    const next = safeNext(url.searchParams.get("next"), "/");
    const prompt = url.searchParams.get("prompt") === "create" ? "create" : "login";
    const keep = url.searchParams.get("keep") === "1";

    const state = randomToken(24);
    const { verifier, challenge } = pkcePair();
    const txn: TxnPlaintext = { v: 1, state, verifier, next, keep };
    const sealedTxn = seal(txn, cfg.sessionSecret, cfg.rpId);

    // The identity-origin /authorize URL is assembled in urls.ts — the ONE place an
    // identity URL is built (scripts/verify-account-boundary.mjs enforces it).
    const authUrl = buildAuthorizeUrl(cfg, { origin, state, challenge, prompt });

    const headers = new Headers({ "cache-control": "private, no-store", location: authUrl });
    headers.append(
      "set-cookie",
      serializeCookie(COOKIES.txn, sealedTxn, {
        path: "/api/auth",
        maxAge: 600,
        httpOnly: true,
        secure: cfg.cookieSecure,
        sameSite: "Lax",
      }),
    );
    return new Response(null, { status: 302, headers });
  };
}

/** Exchange an authorization code at POST /auth/token (service-authenticated). */
async function exchangeCode(cfg: ResolvedConfig, code: string, verifier: string, origin: string) {
  const path = "/auth/token";
  const body = JSON.stringify({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    client_id: cfg.clientId,
    redirect_uri: redirectUri(cfg, origin),
  });
  const ts = Math.floor(cfg.now() / 1000);
  const svc = signService(cfg.clientId, cfg.clientSecret, "POST", path, body, ts);
  try {
    const res = await cfg.fetchImpl(cfg.carismasoftApiUrl + path, {
      method: "POST",
      headers: { "content-type": "application/json", ...svc },
      body,
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* non-JSON */
    }
    return { status: res.status, body: parsed };
  } catch {
    return { status: 0, body: null };
  }
}

function sessionFromExchange(cfg: ResolvedConfig, exchangeBody: unknown, keep: boolean) {
  const b = (exchangeBody && typeof exchangeBody === "object" ? exchangeBody : {}) as Record<string, unknown>;
  const tokens = (b.tokens ?? b) as Record<string, unknown>;
  const user = (b.user ?? b.profile ?? {}) as Record<string, unknown>;
  const at = (tokens.accessToken ?? tokens.access_token) as string | undefined;
  const rt = (tokens.refreshToken ?? tokens.refresh_token) as string | undefined;
  const atExp = (tokens.atExp ?? tokens.accessTokenExpiresAt ?? tokens.exp) as number | undefined;
  const sid = (tokens.sid ?? b.sid ?? randomToken(12)) as string;
  if (!at || !rt) return null;
  const masked = maskProfile(user);
  const sealed = seal(
    {
      v: 1,
      sid,
      uid: String(user.id ?? user.uid ?? ""),
      at,
      atExp: typeof atExp === "number" ? atExp : Math.floor(cfg.now() / 1000) + 900,
      rt,
      initials: masked.initials,
      keep,
      iat: Math.floor(cfg.now() / 1000),
    },
    cfg.sessionSecret,
    cfg.rpId,
  );
  return { sealed, initials: masked.initials, keep };
}

/**
 * GET /api/auth/callback — unseal+clear cw_txn, compare state, exchange the code,
 * seal cw_session, stamp the hints, 302 to the validated next.
 * Contract-first against WP-BE-3; the round-trip is live-proved at wave close.
 */
export function makeCallback(cfg: ResolvedConfig) {
  return async function callback(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const origin = url.origin;
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const clearTxn = clearCookie(COOKIES.txn, {
      path: "/api/auth",
      httpOnly: true,
      secure: cfg.cookieSecure,
      sameSite: "Lax",
    });
    const fail = () => {
      const h = new Headers({ "cache-control": "private, no-store", "content-type": "text/html; charset=utf-8" });
      h.append("set-cookie", clearTxn);
      // A wrong client_id / bad state renders a static error page and never redirects.
      return new Response(
        "<!doctype html><meta charset=utf-8><title>Sign-in error</title><p>Sign-in could not be completed.</p>",
        { status: 400, headers: h },
      );
    };

    if (!code || !state) return fail();
    const txn = unseal<TxnPlaintext>(parseCookies(req)[COOKIES.txn], cfg.unsealKeys, cfg.rpId);
    if (!txn || txn.state !== state) return fail();

    const ex = await exchangeCode(cfg, code, txn.verifier, origin);
    if (ex.status !== 200) return fail();

    const established = sessionFromExchange(cfg, ex.body, txn.keep);
    if (!established) return fail();

    const headers = new Headers({ "cache-control": "private, no-store", location: safeNext(txn.next, "/") });
    headers.append("set-cookie", clearTxn);
    appendSetSession(headers, cfg, established.sealed, established.initials, established.keep);
    return new Response(null, { status: 302, headers });
  };
}

/** POST /api/auth/establish — the popup path: same exchange without leaving the page. */
export function makeEstablish(cfg: ResolvedConfig) {
  return async function establish(req: Request): Promise<Response> {
    let payload: { code?: string; state?: string } = {};
    try {
      payload = (await req.json()) as { code?: string; state?: string };
    } catch {
      return json({ error: "bad_request" }, 400);
    }
    const txn = unseal<TxnPlaintext>(parseCookies(req)[COOKIES.txn], cfg.unsealKeys, cfg.rpId);
    if (!payload.code || !payload.state || !txn || txn.state !== payload.state) {
      return json({ error: "state_mismatch" }, 400);
    }
    const ex = await exchangeCode(cfg, payload.code, txn.verifier, new URL(req.url).origin);
    if (ex.status !== 200) return json({ error: "exchange_failed" }, 401);
    const established = sessionFromExchange(cfg, ex.body, txn.keep);
    if (!established) return json({ error: "bad_exchange_body" }, 502);
    const headers = new Headers({ "content-type": "application/json", "cache-control": "private, no-store" });
    appendSetSession(headers, cfg, established.sealed, established.initials, established.keep);
    return new Response(JSON.stringify({ signedIn: true }), { status: 200, headers });
  };
}
