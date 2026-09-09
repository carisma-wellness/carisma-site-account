import { test } from "node:test";
import assert from "node:assert/strict";
import { seal, unseal, SEAL_KEY_ID } from "../dist/index.js";

const RP = "carisma-spa";
const K1 = "primary-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const KPREV = "previous-secret-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const payload = { v: 1, sid: "s1", uid: "u1", at: "AT", atExp: 111, rt: "RT", initials: "JD", keep: true, iat: 1 };

test("seal emits a k1: token and round-trips under the primary key", () => {
  const token = seal(payload, K1, RP);
  assert.ok(token.startsWith(`${SEAL_KEY_ID}:`), "token carries the k1: key-id prefix");
  const out = unseal(token, { primary: K1 }, RP);
  assert.deepEqual(out, payload);
});

test("round-trips under _PREV after a rotation (sealed with old, unsealed with primary=new,prev=old)", () => {
  // Simulate: a cookie was sealed before rotation with what is now SITE_SESSION_SECRET_PREV.
  const oldCookie = seal(payload, KPREV, RP);
  // After rotation the primary is the new secret and prev is the old one.
  const out = unseal(oldCookie, { primary: K1, prev: KPREV }, RP);
  assert.deepEqual(out, payload, "the grace key decrypts a cookie sealed before rotation");
});

test("a cookie sealed with the OLD key is rejected once the grace key is dropped", () => {
  const oldCookie = seal(payload, KPREV, RP);
  const out = unseal(oldCookie, { primary: K1 }, RP); // no prev -> grace window closed
  assert.equal(out, null);
});

test("an unsealed / garbage cookie is rejected", () => {
  for (const bad of ["", "not-a-token", "k1:garbage", "k1:aaa.bbb", "k2:" + seal(payload, K1, RP).slice(3), "plainvalue"]) {
    assert.equal(unseal(bad, { primary: K1, prev: KPREV }, RP), null, `rejected: ${bad}`);
  }
});

test("a cookie sealed for another rpId is rejected (AAD binds the relying party)", () => {
  const token = seal(payload, K1, "carisma-aesthetics");
  assert.equal(unseal(token, { primary: K1 }, RP), null);
});

test("a tampered ciphertext is rejected (GCM auth tag)", () => {
  const token = seal(payload, K1, RP);
  const [head, iv, ct, tag] = [token.split(":")[0], ...token.split(":")[1].split(".")];
  // Flip a bit in the actual ciphertext BYTES, not a base64url character. A base64url
  // char can carry don't-care trailing bits (here ct is 97 bytes, 97 % 3 == 1, so the
  // final char has only 2 significant bits), making a char swap a silent no-op ~26% of
  // seals and this gate flaky. A byte-level flip always alters the ciphertext, so GCM
  // must reject it on every run.
  const bytes = Buffer.from(ct, "base64url");
  bytes[0] ^= 0xff;
  const flipped = bytes.toString("base64url");
  assert.notEqual(flipped, ct, "the tamper must actually change the ciphertext");
  assert.equal(unseal(`${head}:${iv}.${flipped}.${tag}`, { primary: K1 }, RP), null);
});
