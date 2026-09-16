import type { ResolvedConfig } from "./config.js";
import { seal, unseal } from "../seal/index.js";
import type { SessionPlaintext } from "../seal/index.js";
import { COOKIES, parseCookies, serializeCookie, clearCookie } from "./cookies.js";
import { maskProfile } from "./profile.js";
import { appendSetSession, hintCookieOptions, json, unwrapEnvelope } from "./http.js";
import { pkcePair, randomToken, safeNext, signService, visitorIp } from "./pkce.js";
import { buildAuthorizeUrl, buildSeedUrl, buildSignoutHopUrl, callbackRedirectUri } from "../urls.js";
import { upstream } from "./upstream.js";
import type { RefreshResult } from "./refresh.js";

interface TxnPlaintext {
  v: 1;
  state: string;
  verifier: string;
  next: string;
  keep: boolean;
  /** A prompt=none check. Its failure answer is a quiet return to `next`, never a page. */
  silent?: boolean;
  /**
   * A round trip whose only job was to change state AT the identity origin (report a
   * sign-in made here, or end the session there). The callback never exchanges a code
   * for it: this brand's own session is already the right one, and a code coming back
   * may belong to someone else entirely (a skipped seed crosses whoever the identity
   * origin still holds — on a shared laptop, the previous person).
   */
  noExchange?: boolean;
}

/**
 * The OIDC errors only a prompt=none request can produce. A callback carrying one of
 * these came from a silent check even if its transaction cookie was lost, so it must
 * never render an error page: the visitor did not ask to sign in.
 */
const SILENT_ERRORS = new Set(["login_required", "temporarily_unavailable", "interaction_required"]);

type Prompt = "login" | "create" | "none";

/** Mint state + PKCE, seal the transaction, and build the /authorize URL. One place. */
function beginAuthorize(
  cfg: ResolvedConfig,
  origin: string,
  opts: { next: string; prompt: Prompt; keep: boolean; noExchange?: boolean },
): { txnCookie: string; authUrl: string } {
  // 32 bytes -> 43 base64url chars. The identity origin's validateAuthorizeParams
  // requires BASE64URL_43 and bounces a shorter state (randomToken(24) is 32 chars)
  // straight back to the callback as error=invalid_request, so the card never loads.
  const state = randomToken(32);
  const { verifier, challenge } = pkcePair();
  const txn: TxnPlaintext = { v: 1, state, verifier, next: opts.next, keep: opts.keep };
  if (opts.prompt === "none") txn.silent = true;
  if (opts.noExchange) txn.noExchange = true;
  const sealedTxn = seal(txn, cfg.sessionSecret, cfg.rpId);
  // The identity-origin /authorize URL is assembled in urls.ts — the ONE place an
  // identity URL is built (scripts/verify-account-boundary.mjs enforces it).
  const authUrl = buildAuthorizeUrl(cfg, { origin, state, challenge, prompt: opts.prompt });
  const txnCookie = serializeCookie(COOKIES.txn, sealedTxn, {
    path: "/api/auth",
    maxAge: 600,
    httpOnly: true,
    secure: cfg.cookieSecure,
    sameSite: "Lax",
  });
  return { txnCookie, authUrl };
}

function quietReturn(location: string, extra: string[]): Response {
  const headers = new Headers({ "cache-control": "private, no-store", location });
  for (const c of extra) headers.append("set-cookie", c);
  return new Response(null, { status: 302, headers });
}

/** A silent check has run in this browser session; the client helper will not start another. */
function probedCookie(cfg: ResolvedConfig): string {
  return serializeCookie(COOKIES.ssoProbed, "1", hintCookieOptions(cfg));
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
    const raw = url.searchParams.get("prompt");
    const prompt: Prompt = raw === "create" ? "create" : raw === "none" ? "none" : "login";
    const keep = url.searchParams.get("keep") === "1";

    // Signed out on this brand: a silent start — typed, linked or scripted — must not
    // sign the person straight back in. Only a sign-in they start themselves may.
    if (prompt === "none" && parseCookies(req)[COOKIES.ssoOff] === "1") {
      return quietReturn(next, []);
    }

    const { txnCookie, authUrl } = beginAuthorize(cfg, origin, { next, prompt, keep });

    const headers = new Headers({ "cache-control": "private, no-store", location: authUrl });
    headers.append("set-cookie", txnCookie);
    // Belt and braces: the browser helper stamps this before it navigates, but a
    // silent start reached any other way must not be able to loop either.
    if (prompt === "none") headers.append("set-cookie", probedCookie(cfg));
    return new Response(null, { status: 302, headers });
  };
}

/** Exchange an authorization code at POST /auth/token (service-authenticated). */
async function exchangeCode(cfg: ResolvedConfig, code: string, verifier: string, origin: string, clientIp: string) {
  const path = "/auth/token";
  // camelCase, and ONLY the five keys tokenExchangeSchema admits — the backend's Joi
  // schema is `.unknown(false)`, so a snake_case body (or one extra key) is a 400
  // VALIDATION_ERROR before the exchange runs.
  const body = JSON.stringify({
    grantType: "authorization_code",
    code,
    codeVerifier: verifier,
    clientId: cfg.clientId,
    redirectUri: redirectUri(cfg, origin),
  });
  const fullUrl = cfg.carismasoftApiUrl + path;
  // The backend signs+verifies over req.originalUrl, which carries the /api/v1 mount
  // baked into carismasoftApiUrl. Sign that exact pathname, never the bare /auth/token.
  let pathWithQuery = path;
  try {
    const u = new URL(fullUrl);
    pathWithQuery = u.pathname + u.search;
  } catch {
    /* a relative carismasoftApiUrl (tests): fall back to the sub-path */
  }
  const svc = signService({
    clientId: cfg.clientId,
    serviceKeyHex: cfg.clientSecret,
    keyVersion: cfg.keyVersion,
    method: "POST",
    pathWithQuery,
    body,
    clientIp,
    ts: Math.floor(cfg.now() / 1000),
  });
  try {
    const res = await cfg.fetchImpl(fullUrl, {
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
    // {success,data,message} -> data; sessionFromExchange reads user/tokens flat.
    return { status: res.status, body: unwrapEnvelope(parsed) };
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

    const txn = unseal<TxnPlaintext>(parseCookies(req)[COOKIES.txn], cfg.unsealKeys, cfg.rpId);

    // A silent check that found nobody (or could not tell). Go back to where the
    // visitor was, quietly. `next` is only trusted from the sealed transaction whose
    // state matches; anything else goes home. Never an error page: they did not ask.
    const error = url.searchParams.get("error");
    if (error) {
      const matched = !!txn && !!state && txn.state === state;
      if ((matched && txn!.silent) || SILENT_ERRORS.has(error)) {
        const headers = new Headers({
          "cache-control": "private, no-store",
          location: matched ? safeNext(txn!.next, "/") : "/",
        });
        headers.append("set-cookie", clearTxn);
        headers.append("set-cookie", probedCookie(cfg));
        return new Response(null, { status: 302, headers });
      }
      return fail();
    }

    if (!code || !state) return fail();
    if (!txn || txn.state !== state) return fail();

    const quiet = () => quietReturn(safeNext(txn.next, "/"), [clearTxn, probedCookie(cfg)]);

    // A round trip that only changed state at the identity origin. Never exchange.
    if (txn.noExchange) return quiet();

    // A silent check never REPLACES a session this brand already holds: the code may
    // belong to a different person (whoever the identity origin remembers).
    if (txn.silent && unseal<SessionPlaintext>(parseCookies(req)[COOKIES.session], cfg.unsealKeys, cfg.rpId)) {
      return quiet();
    }

    const ex = await exchangeCode(cfg, code, txn.verifier, origin, visitorIp(req));
    // A silent check that cannot finish returns quietly; the visitor never asked.
    if (ex.status !== 200) return txn.silent ? quiet() : fail();

    const established = sessionFromExchange(cfg, ex.body, txn.keep);
    if (!established) return txn.silent ? quiet() : fail();

    const headers = new Headers({ "cache-control": "private, no-store", location: safeNext(txn.next, "/") });
    headers.append("set-cookie", clearTxn);
    appendSetSession(headers, cfg, established.sealed, established.initials, established.keep);
    // This session came THROUGH the identity origin, so it already knows: nothing to seed.
    headers.append("set-cookie", clearCookie(COOKIES.ssoSeed, hintCookieOptions(cfg)));
    // A sign-in the person started lifts an earlier "signed out here" block. A silent
    // one cannot reach this line while the block is set (start refuses it).
    if (!txn.silent) headers.append("set-cookie", clearCookie(COOKIES.ssoOff, hintCookieOptions(cfg)));
    else headers.append("set-cookie", probedCookie(cfg));
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
    const ex = await exchangeCode(cfg, payload.code, txn.verifier, new URL(req.url).origin, visitorIp(req));
    if (ex.status !== 200) return json({ error: "exchange_failed" }, 401);
    const established = sessionFromExchange(cfg, ex.body, txn.keep);
    if (!established) return json({ error: "bad_exchange_body" }, 502);
    const headers = new Headers({ "content-type": "application/json", "cache-control": "private, no-store" });
    appendSetSession(headers, cfg, established.sealed, established.initials, established.keep);
    headers.append("set-cookie", clearCookie(COOKIES.ssoSeed, hintCookieOptions(cfg)));
    headers.append("set-cookie", clearCookie(COOKIES.ssoOff, hintCookieOptions(cfg)));
    return new Response(JSON.stringify({ signedIn: true }), { status: 200, headers });
  };
}

/**
 * GET /api/auth/seed?next=… — tell the identity origin about a sign-in that happened
 * on this brand WITHOUT it (the booking pop-up signs in server-side, so the identity
 * origin never saw it and no other brand could find it).
 *
 * The person's own bearer mints a single-use, 90-second crossing token for this
 * brand's audience; the browser carries it to the identity origin's /sso/seed, which
 * redeems it into its own session and continues to /authorize with prompt=none; that
 * crosses straight back here through the ordinary callback. No token ever touches the
 * browser except the opaque crossing token, which is spent on arrival.
 *
 * ONE attempt: cw-sso-seed is cleared on every path, success or not, so a backend
 * that refuses cannot turn every page view into a redirect. Every failure goes
 * quietly back to `next`.
 */
export function makeSeed(cfg: ResolvedConfig, refresh: (sid: string, rt: string) => Promise<RefreshResult>) {
  return async function seed(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const origin = url.origin;
    const next = safeNext(url.searchParams.get("next"), "/");
    const headers = new Headers({ "cache-control": "private, no-store" });
    headers.append("set-cookie", clearCookie(COOKIES.ssoSeed, hintCookieOptions(cfg)));
    const go = (location: string) => {
      headers.set("location", location);
      return new Response(null, { status: 302, headers });
    };

    const sess = unseal<SessionPlaintext>(parseCookies(req)[COOKIES.session], cfg.unsealKeys, cfg.rpId);
    if (!sess) return go(next);

    let at = sess.at;
    if (typeof sess.atExp !== "number" || sess.atExp - cfg.now() / 1000 < 60) {
      const r = await refresh(sess.sid, sess.rt);
      if (r.status !== 200 || !r.tokens) return go(next);
      at = r.tokens.accessToken;
      const sealed = seal(
        { ...sess, at, atExp: r.tokens.atExp, rt: r.tokens.refreshToken ?? sess.rt },
        cfg.sessionSecret,
        cfg.rpId,
      );
      appendSetSession(headers, cfg, sealed, sess.initials, Boolean(sess.keep));
    }

    const minted = await upstream(cfg, "/auth/handoff", "POST", at, JSON.stringify({ audience: cfg.clientId }));
    const body = unwrapEnvelope(minted.body) as { token?: unknown } | null;
    const token = body && typeof body.token === "string" ? body.token : "";
    if ((minted.status !== 201 && minted.status !== 200) || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      return go(next);
    }

    const { txnCookie, authUrl } = beginAuthorize(cfg, origin, {
      next,
      prompt: "none",
      keep: Boolean(sess.keep),
      noExchange: true,
    });
    headers.append("set-cookie", txnCookie);
    return go(buildSeedUrl(cfg, { token, audience: cfg.clientId, continueTo: authUrl, keep: Boolean(sess.keep) }));
  };
}

/**
 * GET /api/auth/signout-hop?next=… — after a sign-out on THIS brand, end the session
 * the identity origin still holds, so the next person on this browser is not silently
 * signed in as this one on another brand. Run once, on the page load after the
 * sign-out (the browser helper reads cw-sso-signout). The identity origin clears its
 * cookie and continues through /authorize?prompt=none back to the callback, which never
 * exchanges for this transaction. Every failure returns quietly.
 */
export function makeSignoutHop(cfg: ResolvedConfig) {
  return async function signoutHop(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const next = safeNext(url.searchParams.get("next"), "/");
    const clearFlag = clearCookie(COOKIES.ssoSignout, hintCookieOptions(cfg));
    const { txnCookie, authUrl } = beginAuthorize(cfg, url.origin, {
      next,
      prompt: "none",
      keep: false,
      noExchange: true,
    });
    const target = buildSignoutHopUrl(cfg, { audience: cfg.clientId, continueTo: authUrl });
    if (!target) return quietReturn(next, [clearFlag]);
    return quietReturn(target, [clearFlag, txnCookie]);
  };
}
