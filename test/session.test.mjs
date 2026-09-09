import { test } from "node:test";
import assert from "node:assert/strict";
import { createAccountRoutes, seal } from "../dist/index.js";

const RP = "carisma-spa";
const SECRET = "primary-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const API = "http://backend.local/api/v1";
const NOW_MS = 1_700_000_000_000;
const NOW_S = Math.floor(NOW_MS / 1000);

function baseCfg(fetchImpl) {
  return {
    rpId: RP,
    clientId: RP,
    clientSecret: "cs",
    identityOrigin: "http://account.localtest.me:3000",
    carismasoftApiUrl: API,
    sessionSecret: SECRET,
    allowedOrigins: ["http://localhost:3100"],
    cookieSecure: false,
    fetchImpl,
    now: () => NOW_MS,
  };
}

function sessionCookie({ atExp = NOW_S + 100000, sid = "sid-1" } = {}) {
  return seal(
    { v: 1, sid, uid: "u1", at: "ACCESS", atExp, rt: "REFRESH", initials: "JD", keep: false, iat: NOW_S },
    SECRET,
    RP,
  );
}

function req(cookie) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `cw_session=${cookie}`);
  return new Request("http://localhost:3100/api/auth/session", { headers });
}

function clearsSession(res) {
  return res.headers.getSetCookie().some((c) => c.startsWith("cw_session=") && /Max-Age=0/.test(c));
}

const okProfile = () =>
  new Response(JSON.stringify({ firstName: "Jane", lastName: "Doe", email: "jane.doe@gmail.com", countryCode: "+356", phone: "99000000" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

test("no cookie -> {signedIn:false} with cache-control private, no-store, no upstream call", async () => {
  let called = 0;
  const routes = createAccountRoutes(baseCfg(async () => { called++; return okProfile(); }));
  const res = await routes.session(req(null));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await res.json(), { signedIn: false });
  assert.equal(called, 0, "no network call on a cold session read");
});

test("unsealable cookie -> {signedIn:false} and the junk cookie is cleared", async () => {
  const routes = createAccountRoutes(baseCfg(async () => okProfile()));
  const res = await routes.session(req("k1:not.a.realtoken"));
  assert.deepEqual(await res.json(), { signedIn: false });
  assert.ok(clearsSession(res));
});

test("valid cookie + backend 200 -> signedIn:true, email masked, full address never in body", async () => {
  const routes = createAccountRoutes(baseCfg(async () => okProfile()));
  const res = await routes.session(req(sessionCookie()));
  const raw = await res.text();
  const body = JSON.parse(raw);
  assert.equal(body.signedIn, true);
  assert.equal(body.profile.emailMasked, "j***@gmail.com");
  assert.equal(raw.includes("jane.doe@gmail.com"), false, "the full email never reaches the browser");
});

test("backend 401 -> the sealed cookie and hints are cleared", async () => {
  const routes = createAccountRoutes(baseCfg(async () => new Response("{}", { status: 401, headers: { "content-type": "application/json" } })));
  const res = await routes.session(req(sessionCookie()));
  assert.deepEqual(await res.json(), { signedIn: false });
  assert.ok(clearsSession(res), "a 401 clears cw_session");
});

test("ONLY-401-CLEARS: backend 500 must NOT clear the cookie (session survives)", async () => {
  const routes = createAccountRoutes(baseCfg(async () => new Response("upstream boom", { status: 500 })));
  const res = await routes.session(req(sessionCookie()));
  const body = await res.json();
  assert.equal(body.signedIn, true, "a 5xx leaves the person signed in from the seal");
  assert.equal(clearsSession(res), false, "a 500 must NOT clear cw_session");
});

test("ONLY-401-CLEARS: a connection error must NOT clear the cookie", async () => {
  const routes = createAccountRoutes(baseCfg(async () => { throw new Error("ECONNREFUSED"); }));
  const res = await routes.session(req(sessionCookie()));
  const body = await res.json();
  assert.equal(body.signedIn, true);
  assert.equal(clearsSession(res), false, "a network error must NOT clear cw_session");
});

test("single-flight refresh: two concurrent near-expiry reads make exactly ONE POST /auth/refresh", async () => {
  let refreshCount = 0;
  let profileCount = 0;
  const fetchImpl = async (url, init) => {
    const method = (init?.method || "GET").toUpperCase();
    if (url.includes("/auth/refresh") && method === "POST") {
      refreshCount++;
      await new Promise((r) => setTimeout(r, 20)); // hold both callers in-flight
      return new Response(JSON.stringify({ accessToken: "NEW", refreshToken: "NEWRT", atExp: NOW_S + 900 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/profile")) {
      profileCount++;
      return okProfile();
    }
    return new Response("{}", { status: 404 });
  };
  const routes = createAccountRoutes(baseCfg(fetchImpl));
  const cookie = sessionCookie({ atExp: NOW_S + 10 }); // within the 60s refresh window, same sid
  const [a, b] = await Promise.all([routes.session(req(cookie)), routes.session(req(cookie))]);
  assert.equal((await a.json()).signedIn, true);
  assert.equal((await b.json()).signedIn, true);
  assert.equal(refreshCount, 1, "single-flight collapsed two refreshes into one");
  assert.equal(profileCount, 2, "each request still reads its own profile");
});
