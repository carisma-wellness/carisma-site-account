import { seal, unseal } from "../seal/index.js";
import { COOKIES, parseCookies, serializeCookie, clearCookie } from "./cookies.js";
import { maskProfile } from "./profile.js";
import { appendSetSession, hintCookieOptions, json, unwrapEnvelope } from "./http.js";
import { pkcePair, randomToken, safeNext, signService } from "./pkce.js";
import { buildAuthorizeUrl, buildSeedUrl, callbackRedirectUri } from "../urls.js";
import { upstream } from "./upstream.js";
/**
 * The OIDC errors only a prompt=none request can produce. A callback carrying one of
 * these came from a silent check even if its transaction cookie was lost, so it must
 * never render an error page: the visitor did not ask to sign in.
 */
const SILENT_ERRORS = new Set(["login_required", "temporarily_unavailable", "interaction_required"]);
/** Mint state + PKCE, seal the transaction, and build the /authorize URL. One place. */
function beginAuthorize(cfg, origin, opts) {
    // 32 bytes -> 43 base64url chars. The identity origin's validateAuthorizeParams
    // requires BASE64URL_43 and bounces a shorter state (randomToken(24) is 32 chars)
    // straight back to the callback as error=invalid_request, so the card never loads.
    const state = randomToken(32);
    const { verifier, challenge } = pkcePair();
    const txn = { v: 1, state, verifier, next: opts.next, keep: opts.keep };
    if (opts.prompt === "none")
        txn.silent = true;
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
/** A silent check has run in this browser session; the client helper will not start another. */
function probedCookie(cfg) {
    return serializeCookie(COOKIES.ssoProbed, "1", hintCookieOptions(cfg));
}
function redirectUri(_cfg, origin) {
    return callbackRedirectUri(origin);
}
/**
 * GET /api/auth/start — mint state + PKCE, seal cw_txn (Path=/api/auth, 10 min),
 * 302 to the identity origin's /authorize. Never carries an email.
 */
export function makeStart(cfg) {
    return async function start(req) {
        const url = new URL(req.url);
        const origin = url.origin;
        const next = safeNext(url.searchParams.get("next"), "/");
        const raw = url.searchParams.get("prompt");
        const prompt = raw === "create" ? "create" : raw === "none" ? "none" : "login";
        const keep = url.searchParams.get("keep") === "1";
        const { txnCookie, authUrl } = beginAuthorize(cfg, origin, { next, prompt, keep });
        const headers = new Headers({ "cache-control": "private, no-store", location: authUrl });
        headers.append("set-cookie", txnCookie);
        // Belt and braces: the browser helper stamps this before it navigates, but a
        // silent start reached any other way must not be able to loop either.
        if (prompt === "none")
            headers.append("set-cookie", probedCookie(cfg));
        return new Response(null, { status: 302, headers });
    };
}
/** Exchange an authorization code at POST /auth/token (service-authenticated). */
async function exchangeCode(cfg, code, verifier, origin) {
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
    }
    catch {
        /* a relative carismasoftApiUrl (tests): fall back to the sub-path */
    }
    const svc = signService({
        clientId: cfg.clientId,
        serviceKeyHex: cfg.clientSecret,
        keyVersion: cfg.keyVersion,
        method: "POST",
        pathWithQuery,
        body,
        clientIp: "127.0.0.1",
        ts: Math.floor(cfg.now() / 1000),
    });
    try {
        const res = await cfg.fetchImpl(fullUrl, {
            method: "POST",
            headers: { "content-type": "application/json", ...svc },
            body,
        });
        const text = await res.text();
        let parsed = null;
        try {
            parsed = JSON.parse(text);
        }
        catch {
            /* non-JSON */
        }
        // {success,data,message} -> data; sessionFromExchange reads user/tokens flat.
        return { status: res.status, body: unwrapEnvelope(parsed) };
    }
    catch {
        return { status: 0, body: null };
    }
}
function sessionFromExchange(cfg, exchangeBody, keep) {
    const b = (exchangeBody && typeof exchangeBody === "object" ? exchangeBody : {});
    const tokens = (b.tokens ?? b);
    const user = (b.user ?? b.profile ?? {});
    const at = (tokens.accessToken ?? tokens.access_token);
    const rt = (tokens.refreshToken ?? tokens.refresh_token);
    const atExp = (tokens.atExp ?? tokens.accessTokenExpiresAt ?? tokens.exp);
    const sid = (tokens.sid ?? b.sid ?? randomToken(12));
    if (!at || !rt)
        return null;
    const masked = maskProfile(user);
    const sealed = seal({
        v: 1,
        sid,
        uid: String(user.id ?? user.uid ?? ""),
        at,
        atExp: typeof atExp === "number" ? atExp : Math.floor(cfg.now() / 1000) + 900,
        rt,
        initials: masked.initials,
        keep,
        iat: Math.floor(cfg.now() / 1000),
    }, cfg.sessionSecret, cfg.rpId);
    return { sealed, initials: masked.initials, keep };
}
/**
 * GET /api/auth/callback — unseal+clear cw_txn, compare state, exchange the code,
 * seal cw_session, stamp the hints, 302 to the validated next.
 * Contract-first against WP-BE-3; the round-trip is live-proved at wave close.
 */
export function makeCallback(cfg) {
    return async function callback(req) {
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
            return new Response("<!doctype html><meta charset=utf-8><title>Sign-in error</title><p>Sign-in could not be completed.</p>", { status: 400, headers: h });
        };
        const txn = unseal(parseCookies(req)[COOKIES.txn], cfg.unsealKeys, cfg.rpId);
        // A silent check that found nobody (or could not tell). Go back to where the
        // visitor was, quietly. `next` is only trusted from the sealed transaction whose
        // state matches; anything else goes home. Never an error page: they did not ask.
        const error = url.searchParams.get("error");
        if (error) {
            const matched = !!txn && !!state && txn.state === state;
            if ((matched && txn.silent) || SILENT_ERRORS.has(error)) {
                const headers = new Headers({
                    "cache-control": "private, no-store",
                    location: matched ? safeNext(txn.next, "/") : "/",
                });
                headers.append("set-cookie", clearTxn);
                headers.append("set-cookie", probedCookie(cfg));
                return new Response(null, { status: 302, headers });
            }
            return fail();
        }
        if (!code || !state)
            return fail();
        if (!txn || txn.state !== state)
            return fail();
        const ex = await exchangeCode(cfg, code, txn.verifier, origin);
        if (ex.status !== 200)
            return fail();
        const established = sessionFromExchange(cfg, ex.body, txn.keep);
        if (!established)
            return fail();
        const headers = new Headers({ "cache-control": "private, no-store", location: safeNext(txn.next, "/") });
        headers.append("set-cookie", clearTxn);
        appendSetSession(headers, cfg, established.sealed, established.initials, established.keep);
        // This session came THROUGH the identity origin, so it already knows: nothing to seed.
        headers.append("set-cookie", clearCookie(COOKIES.ssoSeed, hintCookieOptions(cfg)));
        return new Response(null, { status: 302, headers });
    };
}
/** POST /api/auth/establish — the popup path: same exchange without leaving the page. */
export function makeEstablish(cfg) {
    return async function establish(req) {
        let payload = {};
        try {
            payload = (await req.json());
        }
        catch {
            return json({ error: "bad_request" }, 400);
        }
        const txn = unseal(parseCookies(req)[COOKIES.txn], cfg.unsealKeys, cfg.rpId);
        if (!payload.code || !payload.state || !txn || txn.state !== payload.state) {
            return json({ error: "state_mismatch" }, 400);
        }
        const ex = await exchangeCode(cfg, payload.code, txn.verifier, new URL(req.url).origin);
        if (ex.status !== 200)
            return json({ error: "exchange_failed" }, 401);
        const established = sessionFromExchange(cfg, ex.body, txn.keep);
        if (!established)
            return json({ error: "bad_exchange_body" }, 502);
        const headers = new Headers({ "content-type": "application/json", "cache-control": "private, no-store" });
        appendSetSession(headers, cfg, established.sealed, established.initials, established.keep);
        headers.append("set-cookie", clearCookie(COOKIES.ssoSeed, hintCookieOptions(cfg)));
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
export function makeSeed(cfg, refresh) {
    return async function seed(req) {
        const url = new URL(req.url);
        const origin = url.origin;
        const next = safeNext(url.searchParams.get("next"), "/");
        const headers = new Headers({ "cache-control": "private, no-store" });
        headers.append("set-cookie", clearCookie(COOKIES.ssoSeed, hintCookieOptions(cfg)));
        const go = (location) => {
            headers.set("location", location);
            return new Response(null, { status: 302, headers });
        };
        const sess = unseal(parseCookies(req)[COOKIES.session], cfg.unsealKeys, cfg.rpId);
        if (!sess)
            return go(next);
        let at = sess.at;
        if (typeof sess.atExp !== "number" || sess.atExp - cfg.now() / 1000 < 60) {
            const r = await refresh(sess.sid, sess.rt);
            if (r.status !== 200 || !r.tokens)
                return go(next);
            at = r.tokens.accessToken;
            const sealed = seal({ ...sess, at, atExp: r.tokens.atExp, rt: r.tokens.refreshToken ?? sess.rt }, cfg.sessionSecret, cfg.rpId);
            appendSetSession(headers, cfg, sealed, sess.initials, Boolean(sess.keep));
        }
        const minted = await upstream(cfg, "/auth/handoff", "POST", at, JSON.stringify({ audience: cfg.clientId }));
        const body = unwrapEnvelope(minted.body);
        const token = body && typeof body.token === "string" ? body.token : "";
        if ((minted.status !== 201 && minted.status !== 200) || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
            return go(next);
        }
        const { txnCookie, authUrl } = beginAuthorize(cfg, origin, {
            next,
            prompt: "none",
            keep: Boolean(sess.keep),
        });
        headers.append("set-cookie", txnCookie);
        return go(buildSeedUrl(cfg, { token, audience: cfg.clientId, continueTo: authUrl, keep: Boolean(sess.keep) }));
    };
}
//# sourceMappingURL=authorize.js.map