import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createAccountRoutes, seal, inlineSessionCookies } from "../dist/index.js";
import { ssoProbeDecision, runSsoProbe } from "../dist/ui/index.js";
import { randomToken } from "../dist/routes/pkce.js";

/*
 * Cross-brand single sign-on (2026-09-16). The identity origin now crosses a signed-in
 * person straight through /authorize and answers prompt=none with login_required. These
 * tests pin the brand half: the silent start, the quiet return, the seed door that
 * reports an in-pop-up sign-in, and the browser rule for WHEN to check at all.
 */

const RP = "carisma-slimming";
const SECRET = "primary-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const API = "http://backend.local/api/v1";
const IDP = "http://account.localtest.me:3000";
const SITE = "http://localhost:3100";
const NOW_MS = 1_700_000_000_000;
const NOW_S = Math.floor(NOW_MS / 1000);

function routes(fetchImpl = async () => new Response("{}", { status: 500 })) {
  return createAccountRoutes({
    rpId: RP,
    clientId: RP,
    clientSecret: crypto.randomBytes(32).toString("hex"),
    keyVersion: 1,
    identityOrigin: IDP,
    carismasoftApiUrl: API,
    sessionSecret: SECRET,
    allowedOrigins: [SITE],
    cookieSecure: false,
    fetchImpl,
    now: () => NOW_MS,
  });
}

const setCookies = (res) => res.headers.getSetCookie();
const cookieNamed = (res, name) => setCookies(res).find((c) => c.startsWith(`${name}=`));
const isCleared = (res, name) => /Max-Age=0/.test(cookieNamed(res, name) ?? "");
const valueOf = (c) => c.split(";")[0].split("=").slice(1).join("=");

function sessionCookie(over = {}) {
  const s = seal(
    { v: 1, sid: "sid1", uid: "u1", at: "AT-OLD", atExp: NOW_S + 3600, rt: "RT", initials: "MG", keep: true, iat: NOW_S, ...over },
    SECRET,
    RP,
  );
  return `cw_session=${encodeURIComponent(s)}`;
}

/* ── start ─────────────────────────────────────────────────────────────── */

test("start with prompt=none asks /authorize silently and marks the browser as probed", async () => {
  const res = await routes().start(new Request(`${SITE}/api/auth/start?prompt=none&next=/weight-loss`));
  assert.equal(res.status, 302);
  const loc = new URL(res.headers.get("location"));
  assert.equal(loc.origin + loc.pathname, `${IDP}/authorize`);
  assert.equal(loc.searchParams.get("prompt"), "none");
  assert.ok(cookieNamed(res, "cw_txn"));
  assert.match(cookieNamed(res, "cw-sso-probed"), /^cw-sso-probed=1/);
  assert.doesNotMatch(cookieNamed(res, "cw-sso-probed"), /HttpOnly/);
});

test("start keeps login as the default and never marks an interactive start as probed", async () => {
  const res = await routes().start(new Request(`${SITE}/api/auth/start?prompt=bogus`));
  assert.equal(new URL(res.headers.get("location")).searchParams.get("prompt"), "login");
  assert.equal(cookieNamed(res, "cw-sso-probed"), undefined);
});

/* ── callback: the quiet return ────────────────────────────────────────── */

async function silentTxn(next = "/weight-loss") {
  const r = routes();
  const start = await r.start(new Request(`${SITE}/api/auth/start?prompt=none&next=${encodeURIComponent(next)}`));
  const state = new URL(start.headers.get("location")).searchParams.get("state");
  return { r, state, txn: valueOf(cookieNamed(start, "cw_txn")) };
}

test("login_required on a silent check returns to where the visitor was — no error page", async () => {
  const { r, state, txn } = await silentTxn("/packages/fat-freezing?x=1");
  const res = await r.callback(
    new Request(`${SITE}/api/auth/callback?error=login_required&state=${state}`, { headers: { cookie: `cw_txn=${txn}` } }),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/packages/fat-freezing?x=1");
  assert.ok(isCleared(res, "cw_txn"));
  assert.ok(cookieNamed(res, "cw-sso-probed"));
  assert.equal(cookieNamed(res, "cw_session"), undefined);
});

test("temporarily_unavailable is a quiet return too, and signs nobody out", async () => {
  const { r, state, txn } = await silentTxn();
  const res = await r.callback(
    new Request(`${SITE}/api/auth/callback?error=temporarily_unavailable&state=${state}`, {
      headers: { cookie: `cw_txn=${txn}; ${sessionCookie()}` },
    }),
  );
  assert.equal(res.status, 302);
  assert.equal(cookieNamed(res, "cw_session"), undefined, "an outage must never clear a session");
});

test("a silent error with a lost transaction goes home, never to an error page", async () => {
  const res = await routes().callback(new Request(`${SITE}/api/auth/callback?error=login_required&state=zzz`));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/");
});

test("a silent error with a MISMATCHED state goes home, not to the sealed next", async () => {
  const { r, txn } = await silentTxn("/somewhere-private");
  const res = await r.callback(
    new Request(`${SITE}/api/auth/callback?error=login_required&state=${randomToken(32)}`, { headers: { cookie: `cw_txn=${txn}` } }),
  );
  assert.equal(res.headers.get("location"), "/");
});

test("an error on an INTERACTIVE sign-in still renders the static error page (unchanged)", async () => {
  const r = routes();
  const start = await r.start(new Request(`${SITE}/api/auth/start?next=/x`));
  const state = new URL(start.headers.get("location")).searchParams.get("state");
  const txn = valueOf(cookieNamed(start, "cw_txn"));
  const res = await r.callback(
    new Request(`${SITE}/api/auth/callback?error=access_denied&state=${state}`, { headers: { cookie: `cw_txn=${txn}` } }),
  );
  assert.equal(res.status, 400);
  assert.equal(res.headers.get("location"), null);
});

const tokenOk = () =>
  new Response(
    JSON.stringify({ success: true, data: { user: { id: "u1", firstName: "Mert", lastName: "Gulen" }, tokens: { accessToken: "AT", refreshToken: "RT" } } }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

/** start → callback with a code, through one factory; returns the exchange calls. */
async function roundTrip({ prompt = "login", fetchImpl = async () => tokenOk(), cookie = "", headers = {} } = {}) {
  const calls = [];
  const r = routes(async (url, init) => {
    calls.push({ url, init });
    return fetchImpl(url, init);
  });
  const start = await r.start(new Request(`${SITE}/api/auth/start?prompt=${prompt}&next=/x`));
  const state = new URL(start.headers.get("location")).searchParams.get("state");
  const txn = valueOf(cookieNamed(start, "cw_txn"));
  const res = await r.callback(
    new Request(`${SITE}/api/auth/callback?code=${randomToken(32)}&state=${state}`, {
      headers: { cookie: [`cw_txn=${txn}`, cookie].filter(Boolean).join("; "), ...headers },
    }),
  );
  return { res, calls };
}

test("an interactive sign-in stamps cw-known, clears cw-sso-seed and lifts cw-sso-off", async () => {
  const { res } = await roundTrip();
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/x");
  assert.ok(cookieNamed(res, "cw_session"));
  assert.match(cookieNamed(res, "cw-known"), /^cw-known=1;.*Max-Age=15552000/);
  assert.ok(isCleared(res, "cw-sso-seed"));
  assert.ok(isCleared(res, "cw-sso-off"));
});

test("a silent crossing signs in but never lifts a sign-out block", async () => {
  const { res } = await roundTrip({ prompt: "none" });
  assert.ok(cookieNamed(res, "cw_session"));
  assert.equal(cookieNamed(res, "cw-sso-off"), undefined);
  assert.ok(cookieNamed(res, "cw-sso-probed"));
});

test("a silent crossing NEVER replaces a session this brand already holds (the code may be someone else's)", async () => {
  const { res, calls } = await roundTrip({ prompt: "none", cookie: sessionCookie() });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/x");
  assert.equal(cookieNamed(res, "cw_session"), undefined, "the existing session is untouched");
  assert.equal(calls.length, 0, "no code exchanged");
});

test("a silent crossing whose exchange fails returns quietly — no error page", async () => {
  const { res } = await roundTrip({
    prompt: "none",
    fetchImpl: async () => new Response(JSON.stringify({ success: false, code: "RATE_LIMITED" }), { status: 429 }),
  });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/x");
  assert.equal(cookieNamed(res, "cw_session"), undefined);
});

test("an INTERACTIVE exchange failure still renders the static error page", async () => {
  const { res } = await roundTrip({ fetchImpl: async () => new Response("{}", { status: 429 }) });
  assert.equal(res.status, 400);
});

test("the exchange is signed with the visitor's IP, not a shared placeholder", async () => {
  const cf = await roundTrip({ headers: { "cloudfront-viewer-address": "203.0.113.9:41234", "x-forwarded-for": "10.0.0.1" } });
  assert.equal(cf.calls[0].init.headers["x-carisma-client-ip"], "203.0.113.9");
  const xff = await roundTrip({ headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1" } });
  assert.equal(xff.calls[0].init.headers["x-carisma-client-ip"], "198.51.100.7");
  const v6 = await roundTrip({ headers: { "cloudfront-viewer-address": "2001:db8::1:443" } });
  assert.equal(v6.calls[0].init.headers["x-carisma-client-ip"], "2001:db8::1");
  const junk = await roundTrip({ headers: { "x-forwarded-for": "<script>" } });
  assert.equal(junk.calls[0].init.headers["x-carisma-client-ip"], "127.0.0.1");
});

test("a silent start is refused after a sign-out here, however it is reached", async () => {
  const res = await routes().start(
    new Request(`${SITE}/api/auth/start?prompt=none&next=/x`, { headers: { cookie: "cw-sso-off=1" } }),
  );
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/x");
  assert.equal(cookieNamed(res, "cw_txn"), undefined);
});

test("an interactive start is NOT refused after a sign-out here", async () => {
  const res = await routes().start(new Request(`${SITE}/api/auth/start?next=/x`, { headers: { cookie: "cw-sso-off=1" } }));
  assert.equal(new URL(res.headers.get("location")).pathname, "/authorize");
});

/* ── logout ────────────────────────────────────────────────────────────── */

test("a sign-out here blocks the silent check from signing the person straight back in", async () => {
  const r = routes(async () => new Response("{}", { status: 200 }));
  const res = await r.logout(
    new Request(`${SITE}/api/auth/logout`, { method: "POST", headers: { origin: SITE, cookie: sessionCookie() }, body: "{}" }),
  );
  assert.match(cookieNamed(res, "cw-sso-off"), /^cw-sso-off=1;.*Max-Age=2592000/);
  assert.ok(isCleared(res, "cw_session"));
  assert.ok(isCleared(res, "cw-sso-seed"));
  assert.match(cookieNamed(res, "cw-sso-signout"), /^cw-sso-signout=1;/, "the next page ends the identity origin's session");
});

test("sign out everywhere goes to the identity origin itself, so no hop is scheduled", async () => {
  const r = routes(async () => new Response("{}", { status: 200 }));
  const res = await r.logout(
    new Request(`${SITE}/api/auth/logout`, {
      method: "POST",
      headers: { origin: SITE, cookie: sessionCookie() },
      body: JSON.stringify({ everywhere: true }),
    }),
  );
  assert.equal(res.status, 303);
  assert.equal(cookieNamed(res, "cw-sso-signout"), undefined);
});

test("a sign-out with no session schedules no hop", async () => {
  const r = routes(async () => new Response("{}", { status: 200 }));
  const res = await r.logout(new Request(`${SITE}/api/auth/logout`, { method: "POST", headers: { origin: SITE }, body: "{}" }));
  assert.equal(cookieNamed(res, "cw-sso-signout"), undefined);
});

test("signout-hop sends the browser to /sso/signout, and its return is never exchanged", async () => {
  const calls = [];
  const r = routes(async (url, init) => {
    calls.push(url);
    return tokenOk();
  });
  const hop = await r.signoutHop(new Request(`${SITE}/api/auth/signout-hop?next=/after`));
  const loc = new URL(hop.headers.get("location"));
  assert.equal(loc.origin + loc.pathname, `${IDP}/sso/signout`);
  assert.equal(loc.searchParams.get("aud"), RP);
  const cont = new URL(loc.searchParams.get("continue"), IDP);
  assert.equal(cont.pathname, "/authorize");
  assert.equal(cont.searchParams.get("prompt"), "none");
  assert.ok(isCleared(hop, "cw-sso-signout"), "one attempt");

  // Even if a code comes back (someone else is signed in there), nothing is exchanged.
  const cb = await r.callback(
    new Request(`${SITE}/api/auth/callback?code=${randomToken(32)}&state=${cont.searchParams.get("state")}`, {
      headers: { cookie: `cw_txn=${valueOf(cookieNamed(hop, "cw_txn"))}` },
    }),
  );
  assert.equal(cb.status, 302);
  assert.equal(cb.headers.get("location"), "/after");
  assert.equal(cookieNamed(cb, "cw_session"), undefined);
  assert.equal(calls.length, 0);
});

/* ── seed door ─────────────────────────────────────────────────────────── */

const jwt = (payload) =>
  `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;
const NEW_AT = jwt({ id: "u1", sessionId: "sid1", exp: NOW_S + 900 });

function handoffBackend({ status = 201, token = randomToken(32), refresh } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith("/auth/refresh")) {
      // The live backend's shape: enveloped, and no expiry field (auth.service refreshToken).
      return new Response(JSON.stringify(refresh ?? { success: true, data: { accessToken: NEW_AT, refreshToken: "RT2" } }), {
        status: refresh === null ? 401 : 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: status < 300, data: { token, expiresAt: "x" } }), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  return { calls, fetchImpl, token };
}

test("seed: mints a handoff with the person's own bearer and sends them to /sso/seed", async () => {
  const be = handoffBackend();
  const res = await routes(be.fetchImpl).seed(
    new Request(`${SITE}/api/auth/seed?next=/book/something`, { headers: { cookie: sessionCookie() } }),
  );
  assert.equal(res.status, 302);
  const call = be.calls.find((c) => c.url === `${API}/auth/handoff`);
  assert.ok(call, "handoff minted");
  assert.equal(call.init.headers.authorization, "Bearer AT-OLD");
  assert.deepEqual(JSON.parse(call.init.body), { audience: RP });

  const loc = new URL(res.headers.get("location"));
  assert.equal(loc.origin + loc.pathname, `${IDP}/sso/seed`);
  assert.equal(loc.searchParams.get("token"), be.token);
  assert.equal(loc.searchParams.get("aud"), RP);
  assert.equal(loc.searchParams.get("keep"), "1", "a keep session asks the identity origin to keep it too");
  const cont = loc.searchParams.get("continue");
  assert.match(cont, /^\/authorize\?/, "continue is a same-origin PATH, never a host");
  const authorize = new URL(cont, IDP);
  assert.equal(authorize.searchParams.get("prompt"), "none");
  assert.equal(authorize.searchParams.get("client_id"), RP);
  assert.equal(authorize.searchParams.get("redirect_uri"), `${SITE}/api/auth/callback`);
  assert.ok(cookieNamed(res, "cw_txn"), "the transaction the crossing will return to");
  assert.ok(isCleared(res, "cw-sso-seed"), "one attempt only");
});

test("seed: the transaction it seals returns quietly to next through the callback", async () => {
  const be = handoffBackend();
  const r = routes(be.fetchImpl);
  const res = await r.seed(new Request(`${SITE}/api/auth/seed?next=/after`, { headers: { cookie: sessionCookie() } }));
  const cont = new URL(new URL(res.headers.get("location")).searchParams.get("continue"), IDP);
  const cb = await r.callback(
    new Request(`${SITE}/api/auth/callback?error=login_required&state=${cont.searchParams.get("state")}`, {
      headers: { cookie: `cw_txn=${valueOf(cookieNamed(res, "cw_txn"))}` },
    }),
  );
  assert.equal(cb.status, 302);
  assert.equal(cb.headers.get("location"), "/after");
});

test("seed: a code coming back is NEVER exchanged — the brand session stays the person who signed in here", async () => {
  const be = handoffBackend();
  const r = routes(be.fetchImpl);
  const res = await r.seed(new Request(`${SITE}/api/auth/seed?next=/after`, { headers: { cookie: sessionCookie() } }));
  const cont = new URL(new URL(res.headers.get("location")).searchParams.get("continue"), IDP);
  const before = be.calls.length;
  // A skipped seed crosses whoever the identity origin still holds — e.g. the previous
  // person on a shared laptop. That code must be ignored.
  const cb = await r.callback(
    new Request(`${SITE}/api/auth/callback?code=${randomToken(32)}&state=${cont.searchParams.get("state")}`, {
      headers: { cookie: `cw_txn=${valueOf(cookieNamed(res, "cw_txn"))}; ${sessionCookie()}` },
    }),
  );
  assert.equal(cb.status, 302);
  assert.equal(cb.headers.get("location"), "/after");
  assert.equal(cookieNamed(cb, "cw_session"), undefined);
  assert.equal(be.calls.length, before, "no exchange");
});

test("seed: next is carried into the transaction and validated", async () => {
  const be = handoffBackend();
  const r = routes(be.fetchImpl);
  const res = await r.seed(new Request(`${SITE}/api/auth/seed?next=//evil.example`, { headers: { cookie: sessionCookie() } }));
  const cont = new URL(new URL(res.headers.get("location")).searchParams.get("continue"), IDP);
  const cb = await r.callback(
    new Request(`${SITE}/api/auth/callback?error=login_required&state=${cont.searchParams.get("state")}`, {
      headers: { cookie: `cw_txn=${valueOf(cookieNamed(res, "cw_txn"))}` },
    }),
  );
  assert.equal(cb.headers.get("location"), "/");
});

test("seed: a session-only sign-in does not ask the identity origin to keep it", async () => {
  const be = handoffBackend();
  const res = await routes(be.fetchImpl).seed(
    new Request(`${SITE}/api/auth/seed?next=/x`, { headers: { cookie: sessionCookie({ keep: false }) } }),
  );
  assert.equal(new URL(res.headers.get("location")).searchParams.get("keep"), null);
});

test("seed: no session goes quietly back to next and clears the flag", async () => {
  const be = handoffBackend();
  const res = await routes(be.fetchImpl).seed(new Request(`${SITE}/api/auth/seed?next=/x`));
  assert.equal(res.headers.get("location"), "/x");
  assert.ok(isCleared(res, "cw-sso-seed"));
  assert.equal(be.calls.length, 0);
});

test("seed: a refused handoff goes quietly back to next and clears the flag", async () => {
  const be = handoffBackend({ status: 400 });
  const res = await routes(be.fetchImpl).seed(new Request(`${SITE}/api/auth/seed?next=/x`, { headers: { cookie: sessionCookie() } }));
  assert.equal(res.headers.get("location"), "/x");
  assert.ok(isCleared(res, "cw-sso-seed"));
  assert.equal(cookieNamed(res, "cw_txn"), undefined);
});

test("seed: a malformed token is never forwarded", async () => {
  const be = handoffBackend({ token: "short" });
  const res = await routes(be.fetchImpl).seed(new Request(`${SITE}/api/auth/seed?next=/x`, { headers: { cookie: sessionCookie() } }));
  assert.equal(res.headers.get("location"), "/x");
});

test("seed: a stale access token is refreshed first and the handoff uses the new one", async () => {
  const be = handoffBackend();
  const res = await routes(be.fetchImpl).seed(
    new Request(`${SITE}/api/auth/seed?next=/x`, { headers: { cookie: sessionCookie({ atExp: NOW_S - 10 }) } }),
  );
  const call = be.calls.find((c) => c.url === `${API}/auth/handoff`);
  assert.equal(call.init.headers.authorization, `Bearer ${NEW_AT}`);
  assert.ok(cookieNamed(res, "cw_session"), "the refreshed session is re-sealed");
});

test("seed: a dead refresh token goes back to next without minting", async () => {
  const be = handoffBackend({ refresh: null });
  const res = await routes(be.fetchImpl).seed(
    new Request(`${SITE}/api/auth/seed?next=/x`, { headers: { cookie: sessionCookie({ atExp: NOW_S - 10 }) } }),
  );
  assert.equal(res.headers.get("location"), "/x");
  assert.equal(be.calls.some((c) => c.url.endsWith("/auth/handoff")), false);
});

test("seed: next is validated like every other door", async () => {
  const be = handoffBackend();
  const res = await routes(be.fetchImpl).seed(new Request(`${SITE}/api/auth/seed?next=//evil.example`));
  assert.equal(res.headers.get("location"), "/");
});

/* ── session route against the live refresh reply ───────────────────────── */

test("the session route renews against the live refresh reply (enveloped, no expiry field)", async () => {
  const be = handoffBackend();
  const fetchImpl = async (url, init) => {
    if (url.endsWith("/profile")) {
      return new Response(JSON.stringify({ success: true, data: { id: "u1", firstName: "Mert", lastName: "Gulen", email: "m@x.com" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return be.fetchImpl(url, init);
  };
  const res = await routes(fetchImpl).session(
    new Request(`${SITE}/api/auth/session`, { headers: { cookie: `${sessionCookie({ atExp: NOW_S - 5 })}; cw-sso-off=1` } }),
  );
  const body = await res.json();
  assert.equal(body.signedIn, true);
  assert.ok(cookieNamed(res, "cw_session"), "renewed and re-sealed");
  assert.equal(cookieNamed(res, "cw-sso-off"), undefined, "a refresh must not lift a sign-out block");
});

/* ── inline sign-in cookies ────────────────────────────────────────────── */

test("inlineSessionCookies marks the browser known, schedules one seed, lifts sign-out block", () => {
  const out = inlineSessionCookies({ secure: true, keep: true });
  assert.match(out.find((c) => c.startsWith("cw-known=")), /Max-Age=15552000.*Secure/);
  assert.match(out.find((c) => c.startsWith("cw-sso-seed=1")), /Max-Age=2592000/);
  assert.match(out.find((c) => c.startsWith("cw-sso-off=")), /Max-Age=0/);
  for (const c of out) assert.doesNotMatch(c, /HttpOnly/, "the browser helper must be able to read these");
  const session = inlineSessionCookies({ secure: false, keep: false });
  assert.doesNotMatch(session.find((c) => c.startsWith("cw-sso-seed=1")), /Max-Age/);
});

/* ── the browser rule ──────────────────────────────────────────────────── */

const decide = (cookie, trigger = "load", path = "/", userAgent = "Mozilla/5.0 Safari") =>
  ssoProbeDecision({ cookie, trigger, path, userAgent });

test("cold traffic is never redirected on page load", () => {
  assert.equal(decide(""), null);
  assert.equal(decide("_ga=1; utm=x"), null);
});

test("a returner who is not signed in here is checked on page load", () => {
  assert.equal(decide("cw-known=1"), "probe");
});

test("anyone opening booking is checked, known or not", () => {
  assert.equal(decide("", "interaction"), "probe");
});

test("one check per browser session", () => {
  assert.equal(decide("cw-known=1; cw-sso-probed=1"), null);
  assert.equal(decide("cw-sso-probed=1", "interaction"), null);
});

test("a person signed in here is left alone, unless the identity origin still needs telling", () => {
  assert.equal(decide("cw-signed-in=1; cw-known=1"), null);
  assert.equal(decide("cw-signed-in=1; cw-sso-seed=1"), "seed");
  assert.equal(decide("cw-signed-in=1; cw-sso-seed=1; cw-sso-probed=1"), "seed", "the probe guard does not block the seed");
});

test("signed out on this brand means no silent sign-in, whatever else is set", () => {
  assert.equal(decide("cw-known=1; cw-sso-off=1"), null);
  assert.equal(decide("cw-sso-off=1", "interaction"), null);
});

test("finishing a sign-out outranks everything, on page load only", () => {
  assert.equal(decide("cw-sso-signout=1; cw-sso-off=1"), "signout");
  assert.equal(decide("cw-sso-signout=1; cw-signed-in=1; cw-sso-seed=1"), "signout");
  assert.equal(decide("cw-sso-signout=1", "interaction"), null);
  assert.equal(decide("cw-sso-signout=1", "load", "/book/confirmed"), null);
});

test("never during payment, never on the API, never for crawlers", () => {
  assert.equal(decide("cw-known=1", "load", "/book/confirmed"), null);
  assert.equal(decide("cw-known=1", "load", "/book/checkout"), null);
  assert.equal(decide("cw-known=1", "load", "/api/auth/callback"), null);
  assert.equal(decide("cw-known=1", "load", "/", "Mozilla/5.0 (compatible; Googlebot/2.1)"), null);
  assert.equal(decide("cw-known=1", "load", "/booking"), "probe", "a prefix is a path segment family, /book/ only");
});

test("a lookalike cookie name does not count", () => {
  assert.equal(decide("xcw-known=1"), null);
  assert.equal(decide("cw-known=0"), null);
});

/** A tiny cookie jar with document.cookie semantics. */
function fakeEnv({ path = "/weight-loss", search = "?a=1", cookie = "", blockCookies = false } = {}) {
  const jar = new Map();
  for (const part of cookie.split(";").map((s) => s.trim()).filter(Boolean)) {
    const [k, v] = part.split("=");
    jar.set(k, v);
  }
  const assigned = [];
  return {
    assigned,
    env: {
      document: {
        get cookie() {
          return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
        },
        set cookie(line) {
          if (blockCookies) return;
          const [pair, ...attrs] = line.split(";").map((s) => s.trim());
          const [k, v] = pair.split("=");
          if (attrs.some((a) => /^Max-Age=0$/i.test(a))) jar.delete(k);
          else jar.set(k, v);
        },
      },
      location: { pathname: path, search, protocol: "https:", assign: (u) => assigned.push(u) },
      navigator: { userAgent: "Mozilla/5.0 Safari" },
    },
  };
}

test("runSsoProbe writes the guard BEFORE navigating to the silent start", () => {
  const f = fakeEnv({ cookie: "cw-known=1" });
  assert.equal(runSsoProbe(f.env, "load"), true);
  assert.match(f.env.document.cookie, /cw-sso-probed=1/);
  assert.deepEqual(f.assigned, ["/api/auth/start?next=%2Fweight-loss%3Fa%3D1&prompt=none"]);
  // The page came back: nothing happens a second time.
  assert.equal(runSsoProbe(f.env, "load"), false);
  assert.equal(f.assigned.length, 1);
});

test("runSsoProbe with cookies blocked never navigates (it could never stop)", () => {
  const f = fakeEnv({ cookie: "cw-known=1", blockCookies: true });
  assert.equal(runSsoProbe(f.env, "load"), false);
  assert.deepEqual(f.assigned, []);
});

test("runSsoProbe deletes the seed flag before going to the seed door", () => {
  const f = fakeEnv({ cookie: "cw-signed-in=1; cw-sso-seed=1" });
  assert.equal(runSsoProbe(f.env, "load", { next: "/x" }), true);
  assert.doesNotMatch(f.env.document.cookie, /cw-sso-seed/);
  assert.deepEqual(f.assigned, ["/api/auth/seed?next=%2Fx"]);
  assert.equal(runSsoProbe(f.env, "load"), false, "one seed attempt");
});

test("runSsoProbe deletes the sign-out flag before going to the sign-out hop", () => {
  const f = fakeEnv({ cookie: "cw-sso-signout=1; cw-sso-off=1", path: "/", search: "" });
  assert.equal(runSsoProbe(f.env, "load"), true);
  assert.doesNotMatch(f.env.document.cookie, /cw-sso-signout/);
  assert.deepEqual(f.assigned, ["/api/auth/signout-hop?next=%2F"]);
  assert.equal(runSsoProbe(f.env, "load"), false);
});

test("runSsoProbe is a no-op without a window (server render)", () => {
  assert.equal(runSsoProbe(undefined, "load"), false);
});
