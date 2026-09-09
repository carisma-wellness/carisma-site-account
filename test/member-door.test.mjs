import { test } from "node:test";
import assert from "node:assert/strict";
import { memberDoor } from "../dist/index.js";

const cfg = {
  accountLogin: false,
  brandName: "Carisma Spa",
  phoneHref: "tel:+35621234567",
  phoneLabel: "+356 2123 4567",
  whatsappHref: "https://wa.me/35699000000",
  whatsappLabel: "WhatsApp",
};

test("ACCOUNT_LOGIN off renders the fallback page, never a 404 or a redirect", () => {
  const res = memberDoor(cfg, "/anything");
  assert.equal(res.kind, "fallback");
  assert.equal(res.status, 200);
  assert.match(res.html, /opening soon/i);
  assert.match(res.html, /Carisma Spa/);
  assert.match(res.html, /wa\.me\/35699000000/);
  assert.match(res.html, /tel:\+35621234567/);
});

test("ACCOUNT_LOGIN on 307s to the door with a validated next", () => {
  const res = memberDoor({ ...cfg, accountLogin: true }, "/book?resume=booking");
  assert.equal(res.kind, "redirect");
  assert.equal(res.status, 307);
  assert.equal(res.location, "/api/auth/start?next=%2Fbook%3Fresume%3Dbooking");
});

test("a hostile next is neutralised to / before the redirect", () => {
  const res = memberDoor({ ...cfg, accountLogin: true }, "https://evil.com/steal");
  assert.equal(res.location, "/api/auth/start?next=%2F");
});

test("the fallback escapes the brand name", () => {
  const res = memberDoor({ accountLogin: false, brandName: '<script>x</script>' }, null);
  assert.doesNotMatch(res.html, /<script>x<\/script>/);
  assert.match(res.html, /&lt;script&gt;/);
});
