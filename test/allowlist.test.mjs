import { test } from "node:test";
import assert from "node:assert/strict";
import { createAccountRoutes, seal, isAllowed, FORBIDDEN_PATHS, PROXY_ALLOWLIST } from "../dist/index.js";

const RP = "carisma-spa";
const SECRET = "primary-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const API = "http://backend.local/api/v1";
const NOW_S = 1_700_000_000;

function cfg(fetchImpl) {
  return {
    rpId: RP, clientId: RP, clientSecret: "cs",
    identityOrigin: "http://account.localtest.me:3000",
    carismasoftApiUrl: API, sessionSecret: SECRET,
    allowedOrigins: ["http://localhost:3100"],
    cookieSecure: false, fetchImpl, now: () => NOW_S * 1000,
  };
}
const cookie = () => seal({ v: 1, sid: "s", uid: "u", at: "ACCESS", atExp: NOW_S + 99999, rt: "R", initials: "JD", iat: NOW_S }, SECRET, RP);

function proxyReq(method, sub, { withCookie = true, origin = "http://localhost:3100", body } = {}) {
  const headers = new Headers();
  if (withCookie) headers.set("cookie", `cw_session=${cookie()}`);
  if (method !== "GET") headers.set("origin", origin);
  if (body) headers.set("content-type", "application/json");
  return new Request(`http://localhost:3100/api/auth/proxy${sub}`, { method, headers, body });
}

test("an allowlisted GET reaches the backend with the bearer attached, no upstream Set-Cookie replayed", async () => {
  let seen = null;
  const fetchImpl = async (url, init) => {
    seen = { url, auth: init.headers.authorization };
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json", "set-cookie": "evil=1" } });
  };
  const routes = createAccountRoutes(cfg(fetchImpl));
  const res = await routes.proxy(proxyReq("GET", "/profile"));
  assert.equal(res.status, 200);
  assert.equal(seen.url, `${API}/profile`);
  assert.equal(seen.auth, "Bearer ACCESS");
  assert.equal(res.headers.getSetCookie().length, 0, "W-8: an upstream Set-Cookie is never replayed");
});

test("every FORBIDDEN path answers 404 and NEVER reaches the backend", async () => {
  for (const f of FORBIDDEN_PATHS) {
    let called = 0;
    const routes = createAccountRoutes(cfg(async () => { called++; return new Response("{}", { status: 200 }); }));
    const res = await routes.proxy(proxyReq(f.method, f.path));
    assert.equal(res.status, 404, `${f.method} ${f.path} must be 404 (not 403): ${f.why}`);
    assert.equal(called, 0, `${f.method} ${f.path} must never reach the backend`);
    assert.equal(isAllowed(f.method, f.path), false, `isAllowed(${f.method} ${f.path}) must be false`);
  }
});

test("the three named account-destroying acts are refused (change-password, DELETE profile, session revoke)", () => {
  assert.equal(isAllowed("POST", "/auth/change-password"), false);
  assert.equal(isAllowed("DELETE", "/profile"), false);
  assert.equal(isAllowed("DELETE", "/auth/sessions/abc"), false);
});

test("isAllowed matches the intended read paths and member writes only", () => {
  assert.equal(isAllowed("GET", "/profile"), true);
  assert.equal(isAllowed("GET", "/client/booking/appointments"), true);
  assert.equal(isAllowed("GET", "/client/booking/appointments/counts"), true);
  assert.equal(isAllowed("GET", "/client/booking/appointments/abc123"), true);
  assert.equal(isAllowed("POST", "/client/booking/checkout"), true);
  assert.equal(isAllowed("POST", "/client/booking/abandon"), true);
  // method matters: a write verb on a read path is refused
  assert.equal(isAllowed("PUT", "/profile"), false);
  assert.equal(isAllowed("POST", "/profile"), false);
  assert.equal(isAllowed("GET", "/client/booking/checkout"), false);
});

test("a state-changing proxy call without a matching Origin is refused 403", async () => {
  const routes = createAccountRoutes(cfg(async () => new Response("{}", { status: 200 })));
  const res = await routes.proxy(proxyReq("POST", "/client/booking/abandon", { origin: "http://evil.example", body: "{}" }));
  assert.equal(res.status, 403);
});

test("the allowlist contains no account-destroying or profile-write rule", () => {
  // The LABEL only. This used to test `${method} ${label}`, which meant the
  // word "DELETE" in a method tripped the /delete/i guard — so the day a
  // legitimate DELETE arrived (a member cancelling their own booking) the
  // assertion failed for a reason it was never about. The guard is about what
  // a rule DOES, and the method is not the label.
  const labels = PROXY_ALLOWLIST.map((r) => r.label);
  assert.equal(
    labels.some((l) => /change.?password|delete account|logout.?all|revoke|session/i.test(l)),
    false,
    labels.join(", "),
  );
});

test("every DELETE rule is scoped to one appointment and nothing else", () => {
  // The real guard behind the one above: a DELETE is only ever acceptable on a
  // row the member owns. This is the assertion that would catch `DELETE
  // /profile` being added with an innocent label.
  const deletes = PROXY_ALLOWLIST.filter((r) => r.method === "DELETE");
  assert.ok(deletes.length > 0, "the member can cancel their own booking");
  for (const rule of deletes) {
    assert.equal(rule.match("/client/booking/appointments/abc123"), true, rule.label);
    for (const forbidden of ["/profile", "/auth/sessions/abc123", "/client/gift-cards/abc123", "/client/membership/abc123"]) {
      assert.equal(rule.match(forbidden), false, `${rule.label} must not match ${forbidden}`);
    }
  }
});

test("the new member reads and writes are all reachable, and their siblings are not", () => {
  // A rule that silently stops matching is worse than a missing one: the
  // section renders its empty state and nothing anywhere says why.
  const allowed = [
    ["GET", "/client/account/statement"],
    ["GET", "/client/account/documents"],
    ["GET", "/client/gift-cards"],
    ["GET", "/client/packages"],
    ["GET", "/client/credit-balance"],
    ["GET", "/client/booking/slots"],
    ["GET", "/client/booking/appointments/abc123/cancellation-preview"],
    ["POST", "/client/booking/appointments/abc123/confirm"],
    ["PATCH", "/client/booking/appointments/abc123/reschedule"],
    ["POST", "/client/booking/appointments/abc123/pay-balance"],
    ["GET", "/client/wallet/appointments/abc123/apple"],
    ["POST", "/client/membership/abc123/pause"],
  ];
  for (const [m, p] of allowed) assert.equal(isAllowed(m, p), true, `${m} ${p} should be allowed`);

  const refused = [
    // The card, and taking a new subscription. Identity-origin work.
    ["POST", "/client/membership/abc123/payment-method"],
    ["POST", "/client/membership/setup-intent"],
    ["POST", "/client/membership/subscribe"],
    // Medical, at both of its doors.
    ["GET", "/client/medical/my-care"],
    ["GET", "/client/medical/records"],
    // The staff twins of the two new member reads.
    ["GET", "/hod/clients/abc123/account"],
    ["GET", "/hod/clients/abc123/documents"],
    // A listing is not an appointment id.
    ["POST", "/client/ratings/pending"],
    // Read-only paths must not become writable by changing the verb.
    ["POST", "/client/account/statement"],
    ["DELETE", "/client/gift-cards/abc123"],
  ];
  for (const [m, p] of refused) assert.equal(isAllowed(m, p), false, `${m} ${p} must be refused`);
});
