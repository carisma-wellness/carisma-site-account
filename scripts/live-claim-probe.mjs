#!/usr/bin/env node
/* WP-PKG-3 live leg (BUILD_LOCAL_VERIFY_LATER): drive the PACKAGE'S OWN guest-claim
   client against the running local backend on :5001, reading the emailed code out
   of the .local-mail catcher. Proves: code -> claim -> signed in, with a wrong-code
   negative control. The Stripe hop is deferred (STRIPE_NOT_CONFIGURED by design).

   Run: node scripts/live-claim-probe.mjs   (needs backend :5001 + the passwordless
   guest fixture). It restores the fixture to passwordless via the caller's psql. */
import { readFileSync } from "node:fs";
import { makeGuestClaim } from "../dist/index.js";

const API = "http://localhost:5001/api/v1";
const MAIL = process.env.MAIL_LOG;
const EMAIL = "guest@localtest.me";
const PASSWORD = "ClaimDev!2026";

const claim = makeGuestClaim({ apiBaseUrl: API });

function newCodeSince(before) {
  const buf = readFileSync(MAIL);
  const appended = buf.subarray(before).toString("utf8");
  const codes = appended.match(/\b\d{6}\b/g) || [];
  return codes.length ? codes[codes.length - 1] : null;
}

const sizeBefore = readFileSync(MAIL).length;

const start = await claim.start({ via: "email", email: EMAIL });
console.log("start ->", JSON.stringify(start));
if (!start.ok) { console.error("FAIL: start not ok"); process.exit(1); }

await new Promise((r) => setTimeout(r, 1200));
const code = newCodeSince(sizeBefore);
console.log("code from .local-mail ->", code);
if (!code) { console.error("FAIL: no code in the mail catcher"); process.exit(1); }

// negative control first (does not consume the real code): a wrong code never signs in
const bad = await claim.finish({ via: "email", email: EMAIL, code: "000000", password: PASSWORD });
console.log("NEGATIVE CONTROL wrong-code finish ->", JSON.stringify(bad));
if (bad.signedIn !== false) { console.error("FAIL: a wrong code signed someone in"); process.exit(1); }

const fin = await claim.finish({ via: "email", email: EMAIL, code, password: PASSWORD });
const redacted = fin.signedIn
  ? { signedIn: true, user: fin.user, accessTokenPrefix: fin.tokens.accessToken.slice(0, 24) + "…", refreshTokenPrefix: fin.tokens.refreshToken.slice(0, 24) + "…" }
  : fin;
console.log("finish ->", JSON.stringify(redacted));
if (!fin.signedIn) { console.error("FAIL: real code did not sign in"); process.exit(1); }
console.log("PROBE PASS: guest claim signed in against :5001");
