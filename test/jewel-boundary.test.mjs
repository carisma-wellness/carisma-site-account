import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

/**
 * The jewel's boundary (surfaces §3.3): `./ui` (imported by every page's header)
 * never imports three.js or the jewel; `./jewel` is a separate export that
 * does; the jewel chunk (engine + motif + rose, without three) fits 40 KB gzip.
 */

const root = new URL("../", import.meta.url);
function walk(dir) {
  return readdirSync(new URL(dir, root)).flatMap((f) => {
    const rel = `${dir}${f}`;
    return statSync(new URL(rel, root)).isDirectory() ? walk(`${rel}/`) : [rel];
  });
}

test("dist/ui/**/*.js never imports three.js or the jewel (static or dynamic)", () => {
  const files = walk("dist/ui/").filter((f) => f.endsWith(".js"));
  assert.ok(files.length > 20, "precondition: the built ui is there");
  for (const f of files) {
    const src = readFileSync(new URL(f, root), "utf8");
    assert.doesNotMatch(src, /from\s+["']three["']|import\(\s*["']three["']\s*\)|require\(\s*["']three["']\s*\)/, f);
    assert.doesNotMatch(src, /from\s+["'][./]*\/jewel\/|import\(\s*["'][./]*\/jewel\//, f);
  }
});

test("NEGATIVE CONTROL: dist/jewel does import three.js", () => {
  const engine = readFileSync(new URL("dist/jewel/engine.js", root), "utf8");
  const motif = readFileSync(new URL("dist/jewel/motif.js", root), "utf8");
  assert.match(engine, /from "three"/);
  assert.match(motif, /from "three"/);
  assert.match(readFileSync(new URL("dist/jewel/index.js", root), "utf8"), /from "\.\/engine\.js"/);
});

test("package.json: ./jewel is its own export; three is an OPTIONAL peer (sites without it never resolve it)", () => {
  const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  assert.deepEqual(pkg.exports["./jewel"], { types: "./dist/jewel/index.d.ts", import: "./dist/jewel/index.js" });
  assert.equal(pkg.peerDependenciesMeta.three.optional, true);
  assert.ok(pkg.peerDependencies.three);
  assert.equal("three" in (pkg.dependencies ?? {}), false, "never a hard dependency");
});

test("budget: the jewel chunk (engine + motif + rose + stage + index, without three) is at most 40 KB gzip", () => {
  const files = ["index", "engine", "motif", "rose", "stage"].map((n) => readFileSync(new URL(`dist/jewel/${n}.js`, root)));
  const gz = gzipSync(Buffer.concat(files), { level: 9 }).length;
  assert.ok(gz <= 40 * 1024, `${gz} bytes gzip`);
});

test("in a page with no DOM (a server render, Node) the jewel does nothing and throws nothing", async () => {
  const j = await import("../dist/jewel/index.js");
  assert.equal(j.CIRCLE_JEWEL_QC, "carisma-circle-v2-20261117");
  assert.equal(j.jewelSupported(), false);
  assert.equal(typeof j.hydrateJewels(null), "function");
  assert.equal(typeof j.hydrateJewels({ querySelectorAll: () => [] }), "function");
  assert.equal(j.prefersReducedMotion(), false);
  // The stone is the KEY: pearl is the dome (identity 1), rose the first rose cut (0).
  assert.deepEqual(j.GEM_IDENTITY, { rose: 0, pearl: 1, ruby: 2, sapphire: 3, diamond: 4 });
  assert.equal(j.isGemKey("pearl"), true);
  assert.equal(j.isGemKey("first_light"), false);
});
