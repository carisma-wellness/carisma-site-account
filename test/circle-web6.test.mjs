import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLARE, gemMats, glareMats, readJewelPalette } from "../dist/jewel/engine.js";
import { GEM_IDENTITY, hydrateJewels } from "../dist/jewel/index.js";
import { jewelSlotHTML } from "../dist/index.js";

/**
 * WEB-6 (21 Nov 2026, CEO, the Platinum ladder): the kit's live jewel wears the "lighter" stones of the design kit
 * (`circle-motif-3d-2026-11-17/src/engine.js` CC.PAL + GLARE), keys unchanged — key `sapphire` is Level 4 shown
 * "Diamond" (turquoise glare), key `diamond` is Level 5 shown "Platinum" (violet glare); Pearl is cut like every
 * stone. C4a: a jewel under 44 px is never live.
 */

const KIT = new URL("../../../Docs/circle-motif-3d-2026-11-17/src/engine.js", import.meta.url);

test("the stones are the design kit's CC.PAL (21 Nov): hi / mid / lo by data key, a sheen on every light stone", () => {
  const p = readJewelPalette(); // no document here: the numeric fallbacks are the palette
  const hex = (n) => `#${n.toString(16).padStart(6, "0").toUpperCase()}`;
  const got = Object.fromEntries(Object.entries(p.gems).map(([k, t]) => [k, [hex(t.hi), hex(t.mid), hex(t.lo), t.sheen === undefined ? null : hex(t.sheen)]]));
  assert.deepEqual(got, {
    rose: ["#FCEFEC", "#EBC5BE", "#D39A91", null],
    pearl: ["#FFFFFF", "#F4F3F1", "#D9E6F2", "#BFEFE4"],
    ruby: ["#FFFFFF", "#F0D2DA", "#B0124A", "#E8336F"],
    sapphire: ["#FFFFFF", "#E2F1F3", "#36B8C8", "#4FD0E0"],
    diamond: ["#FFFFFF", "#F1EEF7", "#A88BE8", "#B58CFF"],
  });
  // The same numbers as the design kit's own file (read when the vault is beside the worktree; skipped otherwise).
  let src = "";
  try {
    src = readFileSync(KIT, "utf8");
  } catch {
    return;
  }
  for (const [name, row] of [["Pearl", got.pearl], ["Ruby", got.ruby], ["Sapphire", got.sapphire], ["Diamond", got.diamond]]) {
    assert.match(src, new RegExp(`name: "${name}", hi: "${row[0]}", mid: "${row[1]}", lo: "${row[2]}"`, "i"), name);
    assert.match(src, new RegExp(`sh: "${row[3]}"`, "i"), `${name} sheen`);
  }
  assert.match(src, /name: "Sapphire",[^}]*label: "Diamond"/, "key sapphire reads Diamond");
  assert.match(src, /name: "Diamond",[^}]*label: "Platinum"/, "key diamond reads Platinum");
});

test("stones 1-4 take the light-stone recipe (GLARE); Rose keeps the mirror recipe", () => {
  assert.deepEqual(Object.keys(GLARE).map(Number), [1, 2, 3, 4]);
  assert.equal(GEM_IDENTITY.sapphire, 3, "key sapphire = stone 3 (Level 4 Diamond, turquoise)");
  assert.equal(GEM_IDENTITY.diamond, 4, "key diamond = stone 4 (Level 5 Platinum, violet)");
  const tones = readJewelPalette().gems;
  for (const key of ["pearl", "ruby", "sapphire", "diamond"]) {
    const [inner, outer] = gemMats(GEM_IDENTITY[key], tones[key]);
    const r = GLARE[GEM_IDENTITY[key]];
    assert.equal(outer.sheen, 1, `${key}: a coloured sheen at the facet edges`);
    assert.equal(outer.sheenColor.getHex(), tones[key].sheen, key);
    assert.equal(outer.iridescence, 1, `${key}: thin-film fire`);
    assert.deepEqual(outer.iridescenceThicknessRange, r.film, key);
    assert.equal(outer.ior, r.ior, key);
    assert.equal(inner.emissive.getHex(), tones[key].lo, `${key}: the inner glow is the stone's -lo`);
    assert.equal(inner.color.getHex(), tones[key].mid, `${key}: the body is the stone's -mid`);
  }
  // NEGATIVE CONTROL: Rose is not a light stone — no sheen, no fire, the mirror recipe's IOR.
  const [, roseOuter] = gemMats(GEM_IDENTITY.rose, tones.rose);
  assert.equal(roseOuter.sheen, 0);
  assert.equal(roseOuter.iridescence, 0);
  assert.equal(roseOuter.ior, 1.77);
  // and the glare recipe with no sheen token falls back to the glow colour, never black
  const [, bare] = glareMats(GLARE[3], { hi: 0xffffff, mid: 0xe2f1f3, lo: 0x36b8c8 });
  assert.equal(bare.sheenColor.getHex(), 0x36b8c8);
});

test("Pearl is cut like every stone: the round pearl is gone from the kit", () => {
  const motif = readFileSync(new URL("../dist/jewel/motif.js", import.meta.url), "utf8");
  const engine = readFileSync(new URL("../dist/jewel/engine.js", import.meta.url), "utf8");
  assert.doesNotMatch(motif, /pearlMesh|state\.gem === "pearl"/);
  assert.doesNotMatch(engine, /export function pearlMesh/);
});

test("C4a: hydrateJewels never makes a jewel under 44 px live, even a host's own slot", () => {
  // A minimal DOM: two slots (43 px and 44 px). jewelSupported() is false without WebGL, so this only proves the
  // size gate through the slot list it would mount: run the gate's own rule on the kit's markup instead.
  const small = jewelSlotHTML({ gem: "ruby", progress: 0.3, height: 43, poster: "/circle/jewel/v1/ruby-small.webp" });
  const live = jewelSlotHTML({ gem: "ruby", progress: 0.3, height: 44, poster: "/circle/jewel/v1/ruby-small.webp" });
  assert.doesNotMatch(small, /\sdata-cw-jewel(\s|>)/, "under 44: no live slot in the markup");
  assert.match(live, /\sdata-cw-jewel\s/, "44: a live slot");
  const src = readFileSync(new URL("../dist/jewel/index.js", import.meta.url), "utf8");
  assert.match(src, /LIVE_JEWEL_FROM_PX = 44/);
  assert.match(src, /boxH < LIVE_JEWEL_FROM_PX\)\s*continue/, "a host slot under 44 px is skipped before any canvas is made");
  assert.equal(typeof hydrateJewels(null), "function");
});
