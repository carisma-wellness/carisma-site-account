import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBrandLink } from "../dist/index.js";

const base = {
  href: "https://www.carismaslimming.com/packages?ref=x",
  brand: "carisma-slimming",
  signedIn: true,
  targetBlank: false,
  modified: false,
  defaultPrevented: false,
};

test("a signed-in click on a marked cross-brand link is carried through the other door", () => {
  assert.equal(
    resolveBrandLink(base),
    "https://www.carismaslimming.com/api/auth/start?next=%2Fpackages%3Fref%3Dx",
  );
});

test("a cold arrival (signed out) is never rewritten (W-3)", () => {
  assert.equal(resolveBrandLink({ ...base, signedIn: false }), null);
});

test("a Medical host is never rewritten, whatever the attributes say (W-24)", () => {
  assert.equal(
    resolveBrandLink({ ...base, href: "https://www.carismamedical.com/member", brand: "carisma-slimming" }),
    null,
  );
  assert.equal(
    resolveBrandLink({ ...base, href: "https://my.carismamedical.com/x", brand: "anything" }),
    null,
  );
});

test("modified / new-tab / already-handled clicks fall through to the browser", () => {
  assert.equal(resolveBrandLink({ ...base, modified: true }), null);
  assert.equal(resolveBrandLink({ ...base, targetBlank: true }), null);
  assert.equal(resolveBrandLink({ ...base, defaultPrevented: true }), null);
});

test("an unmarked link, and a same-site relative link, are left alone", () => {
  assert.equal(resolveBrandLink({ ...base, brand: null }), null);
  assert.equal(resolveBrandLink({ ...base, href: "/packages" }), null);
});
