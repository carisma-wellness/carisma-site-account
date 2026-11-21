import { test } from "node:test";
import assert from "./fixtures/plain-assert.mjs";
import { asGemKey, circleMarkSVG, jewelSlotHTML, jewelStillHTML, LIVE_JEWEL_FROM_PX, progressFraction, CIRCLE_GEM_KEYS, circleChipHTML, readCircleSummary } from "../dist/index.js";
import { SUMMARY } from "./fixtures/circle-v2.mjs";

/** The flat mark (under 40 px) and the jewel slot: gem by KEY, colours of the material, a fixed box. */

test("asGemKey: the five stones by key; a v1 key, a number or anything else is null", () => {
  assert.deepEqual([...CIRCLE_GEM_KEYS], ["pearl", "rose", "ruby", "sapphire", "diamond"]);
  for (const k of CIRCLE_GEM_KEYS) assert.equal(asGemKey(k), k);
  for (const bad of ["first_light", "golden_hour", "Ruby", 1, 3, null, undefined, ""]) assert.equal(asGemKey(bad), null, String(bad));
});

test("the mark draws the gem's flat colour by key, a gold rim, and the ring to the next level", () => {
  // 21 Nov (CEO, the Platinum ladder, the "lighter" stones; the desk's flat marks): keys unchanged, sapphire = Level 4
  // Diamond (turquoise), diamond = Level 5 Platinum (violet).
  const flat = { pearl: "#ECEFEA", rose: "#E0B4AC", ruby: "#E0798E", sapphire: "#BFE6EA", diamond: "#E2D8F4" };
  for (const [gem, hex] of Object.entries(flat)) {
    const svg = circleMarkSVG(gem, 0.5, 24);
    assert.match(svg, new RegExp(`r="5\\.5" fill="${hex}"`), gem);
    assert.match(svg, /stroke="#8A6A1C"/, "gold rim");
    assert.match(svg, /aria-hidden="true"/);
  }
  const c = 2 * Math.PI * 8;
  assert.match(circleMarkSVG("ruby", 0.42, 24), new RegExp(`stroke-dasharray="${(c * 0.42).toFixed(2)} ${c.toFixed(2)}"`));
  assert.doesNotMatch(circleMarkSVG("ruby", 0, 24), /stroke-dasharray/, "no beads yet: no gold arc");
  assert.match(circleMarkSVG("diamond", 1, 24), new RegExp(`stroke-dasharray="${c.toFixed(2)} ${c.toFixed(2)}"`), "top level: the ring is closed");
  assert.match(circleMarkSVG("pearl", 0, 24, 'Level 1 · "Pearl"'), /role="img" aria-label="Level 1 · &quot;Pearl&quot;"/);
  assert.equal(progressFraction(4200), 0.42);
  assert.equal(progressFraction(-5), 0);
  assert.equal(progressFraction(20000), 1);
  assert.equal(progressFraction("x"), 0);
});

test("a jewel slot is plain HTML with a fixed box (0.84 × height) and its flat mark until the live jewel draws", () => {
  const s = jewelSlotHTML({ gem: "sapphire", progress: 0.25, height: 96 });
  assert.match(s, /^<span class="cc-jw" data-cw-jewel data-gem="sapphire" data-p="0\.250" data-k="small" style="display:inline-grid;place-items:center;position:relative;[^"]*width:81px;height:96px" aria-hidden="true">/);
  // Self-contained: the mark sits in the slot's own grid cell (a host page without the kit's CSS lays it out the same).
  assert.match(s, /<span class="cc-jw__mark" style="grid-area:1\/1;/);
  assert.match(s, /class="cc-jw__mark" style="[^"]*"><svg class="cc-mark" data-cc-gem="sapphire"/);
  assert.match(jewelSlotHTML({ gem: "ruby", progress: 0.4, height: 240 }), /data-k="full" style="[^"]*width:202px;height:240px"/, "Hero size = the full jewel");
  assert.match(jewelSlotHTML({ gem: "ruby", progress: 1, height: 56, kind: "icon" }), /data-k="icon"/);
  const poster = jewelSlotHTML({ gem: "pearl", progress: 0, height: 128, poster: "/circle/jewel/v1/pearl-small.webp" });
  assert.match(poster, /<img class="cc-jw__poster" src="\/circle\/jewel\/v1\/pearl-small\.webp" alt="" width="108" height="128"/);
  // C4a (CEO 20 Nov): under 44 px a jewel is the still image, never a live slot.
  assert.equal(LIVE_JEWEL_FROM_PX, 44);
  assert.doesNotMatch(jewelSlotHTML({ gem: "rose", progress: 0, height: 43, poster: "/circle/jewel/v1/rose-small.webp" }), /data-cw-jewel(?!-still)/);
  assert.match(jewelSlotHTML({ gem: "rose", progress: 0, height: 43, poster: "/circle/jewel/v1/rose-small.webp" }), /data-cw-jewel-still[^>]*width:36px;height:43px[^>]*><img class="cc-jw__poster" src="\/circle\/jewel\/v1\/rose-icon\.webp"/);
  assert.match(jewelSlotHTML({ gem: "rose", progress: 0, height: 44 }), /data-cw-jewel data-gem="rose"[^>]*height:44px/, "44 px and up: the live slot");
});

test("C4a: the still jewel under 44 px is the level icon poster in a fixed box, never hydrated; no poster = the flat mark", () => {
  const still = jewelStillHTML({ gem: "sapphire", height: 30, poster: "/circle/jewel/v1/sapphire-small.webp" });
  assert.match(still, /^<span class="cc-jw cc-jw--still" data-cw-jewel-still data-gem="sapphire" aria-hidden="true" style="[^"]*width:25px;height:30px">/);
  assert.match(still, /<img class="cc-jw__poster" src="\/circle\/jewel\/v1\/sapphire-icon\.webp" alt="" width="25" height="30"/);
  assert.doesNotMatch(still, /data-cw-jewel(?!-still)|<canvas|data-p=/, "no live slot: nothing to hydrate");
  assert.match(jewelStillHTML({ gem: "diamond", height: 34, poster: "/circle/jewel/v1/diamond-full.webp" }), /diamond-icon\.webp/);
  assert.match(jewelStillHTML({ gem: "ruby", height: 24, poster: "/x/ruby-icon.webp", label: 'Level 3 · "Ruby"' }), /role="img" aria-label="Level 3 · &quot;Ruby&quot;"/);
  assert.match(jewelStillHTML({ gem: "ruby", height: 24, progress: 0.5 }), /^<svg class="cc-mark" data-cc-gem="ruby" width="24"/, "no poster: the flat mark");
});

test("the header chip is the still jewel (C4a, W-9) and the balance — never a jewel slot (three.js stays off every page)", () => {
  const poster = (gem, kind) => `/circle/jewel/v1/${gem}-${kind}.webp`;
  const still = circleChipHTML(readCircleSummary(SUMMARY), { poster });
  assert.match(still, /<span class="cc-chip__mark"><span class="cc-jw cc-jw--still" data-cw-jewel-still data-gem="ruby"[^>]*width:20px;height:24px"><img class="cc-jw__poster" src="\/circle\/jewel\/v1\/ruby-icon\.webp"/);
  assert.doesNotMatch(still, /data-cw-jewel(?!-still)/);
  // A host without posters keeps the flat mark.
  const chip = circleChipHTML(readCircleSummary(SUMMARY));
  assert.match(chip, /<svg class="cc-mark" data-cc-gem="ruby" width="24" height="24"/);
  assert.match(chip, /<span class="cc-chip__bal">€72\.40<\/span>/);
  // ADDENDUM X11 (`CK.chip`'s aria): the spoken label carries the balance too.
  assert.match(chip, /Carisma credit €72\.40, Level 3 · Ruby/);
  assert.doesNotMatch(chip, /data-cw-jewel/);
  assert.equal(circleChipHTML(null), "");
});
