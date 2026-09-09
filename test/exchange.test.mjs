import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createAccountRoutes } from "../dist/index.js";
import { signService, randomToken } from "../dist/routes/pkce.js";

/*
 * WP-PKG-1 kit<->backend contract, asserted against the REAL WP-BE-3 identity backend
 * (identity.serviceAuth + identity.validation, measured 2026-09-09). These are the four
 * shapes the Spa BFF idpBridge.ts had to reconcile by hand; the package now emits them
 * itself so the other four sites inherit the correct contract instead of copying a bridge.
 */

const RP = "carisma-spa";
const SECRET = "primary-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
// The per-client service key is HEX (IDENTITY_CLIENT_SECRET). 32 bytes -> 64 hex chars.
const CLIENT_SECRET_HEX = crypto.randomBytes(32).toString("hex");
const KEY_VERSION = 3;
const API = "http://backend.local/api/v1";
const NOW_MS = 1_700_000_000_000;
const NOW_S = Math.floor(NOW_MS / 1000);

/** Independent re-implementation of the backend's canonical JSON (identity.serviceAuth). */
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
}

function cfg(fetchImpl) {
  return {
    rpId: RP,
    clientId: RP,
    clientSecret: CLIENT_SECRET_HEX,
    keyVersion: KEY_VERSION,
    identityOrigin: "http://account.localtest.me:3000",
    carismasoftApiUrl: API,
    sessionSecret: SECRET,
    allowedOrigins: ["http://localhost:3100"],
    cookieSecure: false,
    fetchImpl,
    now: () => NOW_MS,
  };
}

/** A backend /auth/token success in the house envelope {success,data,message}. */
function tokenEnvelope() {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Token exchanged",
      data: {
        user: { id: "u1", email: "jane.doe@gmail.com", firstName: "Jane", lastName: "Doe", emailVerified: true, role: "client", locale: null },
        tokens: { accessToken: "AT", refreshToken: "RT" },
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

/** Drive start()+callback() through the public factory, capturing the wire /auth/token call. */
async function runCallback(fetchImpl) {
  const routes = createAccountRoutes(cfg(fetchImpl));
  const startRes = await routes.start(new Request("http://localhost:3100/api/auth/start?next=/account"));
  const loc = new URL(startRes.headers.get("location"));
  const state = loc.searchParams.get("state");
  const setCookie = startRes.headers.getSetCookie().find((c) => c.startsWith("cw_txn="));
  const txnValue = setCookie.slice("cw_txn=".length).split(";")[0];
  const code = randomToken(32); // 43-char base64url, the shape the backend requires
  const cbReq = new Request(
    `http://localhost:3100/api/auth/callback?code=${code}&state=${encodeURIComponent(state)}`,
    { headers: { cookie: `cw_txn=${txnValue}` } },
  );
  const cbRes = await routes.callback(cbReq);
  return { state, startRes, cbRes };
}

test("signService emits the X-Carisma-* envelope the backend verifies, never x-service-*", () => {
  const body = JSON.stringify({ grantType: "authorization_code", code: "c", codeVerifier: "v", clientId: RP, redirectUri: "http://x/api/auth/callback" });
  const h = signService({
    clientId: RP,
    serviceKeyHex: CLIENT_SECRET_HEX,
    keyVersion: KEY_VERSION,
    method: "POST",
    pathWithQuery: "/api/v1/auth/token",
    body,
    clientIp: "127.0.0.1",
    ts: NOW_S,
    nonce: "n0",
  });
  // exactly the six headers requireServiceCaller reads, all present, correctly typed
  assert.equal(h["x-carisma-service"], RP);
  assert.equal(h["x-carisma-key-version"], "3");
  assert.equal(h["x-carisma-timestamp"], String(NOW_S));
  assert.equal(h["x-carisma-nonce"], "n0");
  assert.equal(h["x-carisma-client-ip"], "127.0.0.1");
  assert.match(h["x-carisma-signature"], /^v1=[0-9a-f]{64}$/);
  // the retired header set is gone
  assert.equal(h["x-service-id"], undefined);
  assert.equal(h["x-service-timestamp"], undefined);
  assert.equal(h["x-service-signature"], undefined);
  // the signature is HMAC over the exact backend signing string (independent recompute),
  // and the body hash is over stableStringify(parsedBody), not the raw string
  const bodyHash = crypto.createHash("sha256").update(stableStringify(JSON.parse(body)), "utf8").digest("hex");
  const signingString = ["v1", RP, "3", String(NOW_S), "n0", "POST", "/api/v1/auth/token", "127.0.0.1", bodyHash].join("\n");
  const expected = "v1=" + crypto.createHmac("sha256", Buffer.from(CLIENT_SECRET_HEX, "hex")).update(signingString).digest("hex");
  assert.equal(h["x-carisma-signature"], expected, "signature must verify under the backend contract");
});

test("start() mints a 43-char (32-byte base64url) state the origin accepts", async () => {
  const { state } = await runCallback(async () => tokenEnvelope());
  assert.equal(state.length, 43, "BASE64URL_43: a 24-byte (32-char) state is bounced by validateAuthorizeParams");
  assert.match(state, /^[A-Za-z0-9_-]{43}$/);
});

test("POST /auth/token body is camelCase and only the five keys Joi admits (unknown:false)", async () => {
  let sent = null;
  await runCallback(async (url, init) => {
    if (String(url).endsWith("/auth/token") && (init?.method || "").toUpperCase() === "POST") {
      sent = { url: String(url), headers: init.headers, body: init.body };
      return tokenEnvelope();
    }
    return new Response("{}", { status: 404 });
  });
  assert.ok(sent, "the exchange reached POST /auth/token");
  const b = JSON.parse(sent.body);
  assert.deepEqual(Object.keys(b).sort(), ["clientId", "code", "codeVerifier", "grantType", "redirectUri"]);
  assert.equal(b.grantType, "authorization_code");
  // the snake_case the kit used to send (400 VALIDATION_ERROR against unknown:false) is gone
  assert.equal(b.grant_type, undefined);
  assert.equal(b.code_verifier, undefined);
  assert.equal(b.client_id, undefined);
  assert.equal(b.redirect_uri, undefined);
});

test("POST /auth/token carries the X-Carisma-* envelope on the wire, signed over /api/v1/auth/token", async () => {
  let sent = null;
  await runCallback(async (url, init) => {
    if (String(url).endsWith("/auth/token") && (init?.method || "").toUpperCase() === "POST") {
      sent = { url: String(url), headers: init.headers, body: init.body };
      return tokenEnvelope();
    }
    return new Response("{}", { status: 404 });
  });
  const h = sent.headers;
  assert.equal(h["x-carisma-service"], RP);
  assert.equal(h["x-carisma-key-version"], "3");
  assert.equal(h["x-service-signature"], undefined);
  // recompute against the mounted path the backend sees as req.originalUrl
  const path = new URL(sent.url).pathname;
  assert.equal(path, "/api/v1/auth/token");
  const bodyHash = crypto.createHash("sha256").update(stableStringify(JSON.parse(sent.body)), "utf8").digest("hex");
  const signingString = ["v1", h["x-carisma-service"], h["x-carisma-key-version"], h["x-carisma-timestamp"], h["x-carisma-nonce"], "POST", path, h["x-carisma-client-ip"], bodyHash].join("\n");
  const expected = "v1=" + crypto.createHmac("sha256", Buffer.from(CLIENT_SECRET_HEX, "hex")).update(signingString).digest("hex");
  assert.equal(h["x-carisma-signature"], expected);
});

test("the {success,data} envelope is unwrapped so a session is established from data.tokens", async () => {
  const { cbRes } = await runCallback(async (url, init) => {
    if (String(url).endsWith("/auth/token") && (init?.method || "").toUpperCase() === "POST") return tokenEnvelope();
    return new Response("{}", { status: 404 });
  });
  // unwrap worked: sessionFromExchange found data.tokens.accessToken/refreshToken
  assert.equal(cbRes.status, 302, "302 to next means the session was established");
  assert.equal(cbRes.headers.get("location"), "/account");
  const setSession = cbRes.headers.getSetCookie().some((c) => c.startsWith("cw_session=") && !/Max-Age=0/.test(c));
  assert.ok(setSession, "cw_session is set from the unwrapped tokens");
});
