#!/usr/bin/env node
/* ──────────────────────────────────────────────────────────────────────────
   scripts/verify-account-boundary.mjs — prove the identity origin is assembled
   in exactly ONE place.

   WHY A SCRIPT AND NOT A COMMENT. Medical defect 5 was two hand-coded sign-in
   paths in one repo: the second one drifted, and nothing failed to say so.
   `lib/account/urls.ts` (here src/urls.ts) is the single builder of an
   identity-origin URL; every other file must go through it. This file is what
   keeps that true after the next person, who will be under deadline and will
   have a very good reason to "just build the URL right here".

   Mirrors telehealth-mt scripts/verify-portal-boundary.mjs@33c86ac.
   Run: node scripts/verify-account-boundary.mjs   (0 = boundary holds, 1 = not).

   TWO gates, and BOTH must be able to fail (charter Sec.5):
     A. No file outside the sanctioned set assembles an identity-origin URL —
        it names `identityOrigin` in executable code, or hard-codes an identity
        host. Sabotage: hand-build an identity URL elsewhere -> this goes red.
     B. src/urls.ts still EXPORTS the sanctioned builders, and their consumers
        still import them. Sabotage: rename an export -> B reports ZERO matches
        as a FAILURE, never a silent pass (a substring/prefix guard would let a
        rename through; this one asserts the exact export exists).
   ────────────────────────────────────────────────────────────────────────── */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const failures = [];
const lines = [];

function check(name, fn) {
  try {
    fn();
    lines.push(`  ok    ${name}`);
  } catch (err) {
    lines.push(`  FAIL  ${name}`);
    failures.push(`${name}\n        ${err.message}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

/** Strip comments before matching, so PROSE that merely names a symbol while
 *  EXPLAINING the boundary is not flagged (the exact fix Medical made 2026-08-19:
 *  matching prose trains people to delete the explanation, not fix the code). */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

/** Every .ts file under src/, repo-relative. */
function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(join(ROOT, dir));
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = join(dir, entry);
      if (statSync(join(ROOT, rel)).isDirectory()) {
        if (entry === "node_modules" || entry === "dist") continue;
        walk(rel);
      } else if (/\.ts$/.test(entry) && !/\.d\.ts$/.test(entry)) {
        out.push(rel);
      }
    }
  };
  walk("src");
  return out;
}

/* The one builder, and the value-holder that feeds it. Everyone else is fenced. */
const URLS_FILE = join("src", "urls.ts");
const CONFIG_FILE = join("src", "routes", "config.ts"); // declares/normalises the field only

/* Identity hosts a rogue file might hard-code instead of going through urls.ts. */
const IDENTITY_HOST_RE = /account(-stage)?\.carismasoft\.com|account\.localtest\.me/;

/* ── Gate A: only src/urls.ts assembles an identity-origin URL ───────────── */

check("only src/urls.ts assembles an identity-origin URL", () => {
  const offenders = [];
  for (const file of sourceFiles()) {
    if (file === URLS_FILE || file === CONFIG_FILE) continue;
    const code = stripComments(read(file));
    if (/\bidentityOrigin\b/.test(code)) {
      offenders.push(`${relative(".", file)} (names identityOrigin in code)`);
    } else if (IDENTITY_HOST_RE.test(code)) {
      offenders.push(`${relative(".", file)} (hard-codes an identity host)`);
    }
  }
  assert(
    offenders.length === 0,
    `these build an identity URL outside src/urls.ts — route them through it:\n        ${offenders.join(
      "\n        ",
    )}`,
  );
});

/* ── Gate B: src/urls.ts exports the sanctioned builders, and they are used ─ */

/* name -> the consumer that must still import it. If a builder is renamed in
   urls.ts, its `export function <name>` disappears and this gate reports ZERO
   matches as a FAILURE. It also confirms the consumer still wires it, so a
   builder cannot be quietly orphaned. */
const SANCTIONED_BUILDERS = [
  { name: "buildAuthorizeUrl", consumer: join("src", "routes", "authorize.ts") },
  { name: "buildLogoutUrl", consumer: join("src", "routes", "logout.ts") },
];

check("src/urls.ts exports the sanctioned identity-URL builders (rename-proof)", () => {
  const urls = read(URLS_FILE);
  for (const { name, consumer } of SANCTIONED_BUILDERS) {
    const exportRe = new RegExp(`export\\s+function\\s+${name}\\b`);
    assert(
      exportRe.test(urls),
      `src/urls.ts no longer exports \`${name}\` — zero matches. An identity-URL builder ` +
        `was renamed or removed; every consumer that imported it is now hand-building the URL.`,
    );
    const consumerSrc = read(consumer);
    const importRe = new RegExp(`\\b${name}\\b`);
    assert(
      importRe.test(consumerSrc),
      `${relative(".", consumer)} no longer references \`${name}\` from urls.ts — the builder ` +
        `is orphaned, which means the URL is being assembled somewhere else.`,
    );
  }
});

/* ── Report ──────────────────────────────────────────────────────────────── */

console.log("\nAccount boundary verification\n");
lines.forEach((l) => console.log(l));

if (failures.length) {
  console.error(`\n${failures.length} FAILURE(S):\n`);
  failures.forEach((f) => console.error(`  · ${f}\n`));
  console.error(
    "An identity-origin URL must be built in src/urls.ts alone. Fix the code, not this file.\n",
  );
  process.exit(1);
}
console.log("\nAll checks passed. Only src/urls.ts builds an identity-origin URL.\n");
