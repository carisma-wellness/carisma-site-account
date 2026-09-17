/**
 * The member's own photo on the header mark (CEO 2026-09-16).
 *
 * The properties that matter, each with its negative control:
 *  - only an absolute https URL is ever painted or stored;
 *  - the initials chip stays underneath, so a broken photo is not an empty circle;
 *  - a GUEST makes no session request (the CloudFront-cached document must stay free
 *    of member traffic, W-1) — the negative control for the fetch;
 *  - a re-applied hydrate keeps the photo (the host header re-commits its server glyph);
 *  - a failing or malformed read leaves the mark signed in with initials (W-9).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accountMarkSignedInHTML,
  sanitizeAvatarUrl,
  avatarUrlFromSession,
  maskProfile,
  hydrateAccountMark,
  loadAccountMarkPhoto,
  accountMarkPhotoUrl,
  AVATAR_CACHE_KEY,
} from "../dist/index.js";

const PHOTO = "https://cdn.example.com/clients/abc/photo.jpg";

/** The smallest element the kit's dom.ts contract needs. */
function el(attrs = {}) {
  return {
    attrs: { ...attrs },
    innerHTML: "",
    getAttribute(k) { return this.attrs[k] ?? null; },
    setAttribute(k, v) { this.attrs[k] = v; },
  };
}
function doc(cookie, marks) {
  return {
    cookie,
    querySelectorAll() { return marks; },
    getElementById() { return null; },
    addEventListener() {},
  };
}
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    map: m,
  };
}
function fetchOnce(body, { ok = true } = {}) {
  const calls = [];
  const impl = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) });
  };
  impl.calls = calls;
  return impl;
}

test("only an absolute https URL survives sanitising", () => {
  assert.equal(sanitizeAvatarUrl(PHOTO), PHOTO);
  assert.equal(sanitizeAvatarUrl("http://cdn.example.com/a.jpg"), null); // not https
  assert.equal(sanitizeAvatarUrl("javascript:alert(1)"), null);
  assert.equal(sanitizeAvatarUrl("data:image/png;base64,AAAA"), null);
  assert.equal(sanitizeAvatarUrl("/clients/abc/photo.jpg"), null); // relative
  assert.equal(sanitizeAvatarUrl('https://x/a.jpg" onerror="alert(1)'), null);
  assert.equal(sanitizeAvatarUrl("https://x/" + "a".repeat(2100)), null);
  assert.equal(sanitizeAvatarUrl(null), null);
});

test("maskProfile carries profilePicture as avatarUrl, and refuses a non-https one", () => {
  const p = maskProfile({ firstName: "Mert", lastName: "Gulen", email: "m@x.com", profilePicture: PHOTO });
  assert.equal(p.avatarUrl, PHOTO);
  assert.equal(p.initials, "MG"); // the fallback paint is still produced
  assert.equal(maskProfile({ profilePicture: "javascript:alert(1)" }).avatarUrl, null);
  assert.equal(maskProfile({ firstName: "A" }).avatarUrl, null);
});

test("the photo is layered OVER the initials, never instead of them", () => {
  const html = accountMarkSignedInHTML("MG", PHOTO);
  assert.match(html, /carisma-account-mark__initials/); // fallback present underneath
  assert.match(html, /<img class="carisma-account-mark__photo"/);
  assert.match(html, /data-clarity-mask="True"/); // a face is not recorded by Clarity (W-25)
  assert.match(html, /onerror="this.remove\(\)"/); // broken image reveals the initials
  // a hostile URL paints no image at all
  assert.doesNotMatch(accountMarkSignedInHTML("MG", "javascript:alert(1)"), /<img/);
  // and with no photo the markup is exactly what shipped before
  assert.equal(accountMarkSignedInHTML("MG"), accountMarkSignedInHTML("MG", null));
});

test("avatarUrlFromSession reads the session body, flat or nested", () => {
  assert.equal(avatarUrlFromSession({ signedIn: true, profile: { avatarUrl: PHOTO } }), PHOTO);
  assert.equal(avatarUrlFromSession({ profilePicture: PHOTO }), PHOTO);
  assert.equal(avatarUrlFromSession({ signedIn: true, profile: {} }), null);
  assert.equal(avatarUrlFromSession(null), null);
});

test("a GUEST never asks the server for a photo (W-1 negative control)", async () => {
  const f = fetchOnce({ profile: { avatarUrl: PHOTO } });
  await loadAccountMarkPhoto(doc("foo=1", [el()]), f, memStorage());
  assert.equal(f.calls.length, 0);
  assert.equal(accountMarkPhotoUrl(), null);
});

test("a signed-in browser fetches once, paints the photo, and keeps it across re-hydrates", async () => {
  const mark = el({ "data-cw-session": "out" });
  const cookie = "cw-signed-in=1; cw-initials=MG";
  const store = memStorage();
  const f = fetchOnce({ signedIn: true, profile: { avatarUrl: PHOTO } });

  await loadAccountMarkPhoto(doc(cookie, [mark]), f, store);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, "/api/auth/session");
  assert.equal(f.calls[0].init.credentials, "same-origin");
  assert.match(mark.innerHTML, /<img class="carisma-account-mark__photo"/);
  assert.equal(mark.getAttribute("data-cw-session"), "in");

  // the host header re-commits the server glyph and re-applies: the photo survives
  mark.innerHTML = "";
  hydrateAccountMark(mark, cookie);
  assert.match(mark.innerHTML, /<img class="carisma-account-mark__photo"/);

  // a second page in the same tab is served from the cache, with no request
  const f2 = fetchOnce({ signedIn: true, profile: { avatarUrl: PHOTO } });
  const mark2 = el();
  await loadAccountMarkPhoto(doc(cookie, [mark2]), f2, store);
  assert.equal(f2.calls.length, 0);
  assert.match(mark2.innerHTML, /<img/);
  assert.match(store.map.get(AVATAR_CACHE_KEY), /photo\.jpg/);
});

test("a stale cache entry is discarded rather than painted", async () => {
  const store = memStorage();
  store.setItem(AVATAR_CACHE_KEY, JSON.stringify({ url: PHOTO, at: Date.now() - 60 * 60 * 1000 }));
  const f = fetchOnce({ signedIn: true, profile: {} });
  const mark = el();
  await loadAccountMarkPhoto(doc("cw-signed-in=1; cw-initials=MG", [mark]), f, store);
  assert.equal(f.calls.length, 1); // it went back to the server instead of trusting it
  assert.equal(accountMarkPhotoUrl(), null);
});

test("a failed or photoless read leaves the initials chip, and never signs anyone out", async () => {
  const cookie = "cw-signed-in=1; cw-initials=MG";
  const mark = el();
  const bad = () => Promise.reject(new Error("offline"));
  await loadAccountMarkPhoto(doc(cookie, [mark]), bad, memStorage());
  hydrateAccountMark(mark, cookie);
  assert.match(mark.innerHTML, /carisma-account-mark__initials/);
  assert.doesNotMatch(mark.innerHTML, /<img/);
  assert.equal(mark.getAttribute("data-cw-session"), "in"); // still signed in
});
