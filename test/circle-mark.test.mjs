import { test } from "node:test";
import assert from "node:assert/strict";
import { asGemKey, circleMarkSVG, jewelSlotHTML, progressFraction, CIRCLE_GEM_KEYS, circleChipHTML, readCircleSummary } from "../dist/index.js";
import { SUMMARY } from "./fixtures/circle-v2.mjs";

/** The flat mark (under 40 px) and the jewel slot: gem by KEY, colours of the material, a fixed box. */

test("asGemKey: the five stones by key; a v1 key, a number or anything else is null", () => {
  assert.deepEqual([...CIRCLE_GEM_KEYS], ["pearl", "rose", "ruby", "sapphire", "diamond"]);
  for (const k of CIRCLE_GEM_KEYS) assert.equal(asGemKey(k), k);
  for (const bad of ["first_light", "golden_hour", "Ruby", 1, 3, null, undefined, ""]) assert.equal(asGemKey(bad), null, String(bad));
});

test("the mark draws the gem's flat colour by key, a gold rim, and the ring to the next level", () => {
  const flat = { pearl: "#E2DCD5", rose: "#E0B4AC", ruby: "#A8405A", sapphire: "#2F5199", diamond: "#C9D6E3" };
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
  assert.match(s, /^<span class="cc-jw" data-cw-jewel data-gem="sapphire" data-p="0\.250" data-k="small" style="width:81px;height:96px" aria-hidden="true">/);
  assert.match(s, /class="cc-jw__mark"><svg class="cc-mark" data-cc-gem="sapphire"/);
  assert.match(jewelSlotHTML({ gem: "ruby", progress: 0.4, height: 240 }), /data-k="full" style="width:202px;height:240px"/, "Hero size = the full jewel");
  assert.match(jewelSlotHTML({ gem: "ruby", progress: 1, height: 56, kind: "icon" }), /data-k="icon"/);
  const poster = jewelSlotHTML({ gem: "pearl", progress: 0, height: 128, poster: "/circle/jewel/v1/pearl-small.webp" });
  assert.match(poster, /<img class="cc-jw__poster" src="\/circle\/jewel\/v1\/pearl-small\.webp" alt="" width="108" height="128"/);
  assert.match(jewelSlotHTML({ gem: "rose", progress: 0, height: 10 }), /height:40px/, "never under 40 px: below that a page draws the mark itself");
});

test("the header chip is the flat mark and the balance — never a jewel slot (three.js stays off every page)", () => {
  const chip = circleChipHTML(readCircleSummary(SUMMARY));
  assert.match(chip, /<svg class="cc-mark" data-cc-gem="ruby" width="24" height="24"/);
  assert.match(chip, /<span class="cc-chip__bal">€72\.40<\/span>/);
  assert.match(chip, /Carisma credit, Level 3 · Ruby/);
  assert.doesNotMatch(chip, /data-cw-jewel/);
  assert.equal(circleChipHTML(null), "");
});
