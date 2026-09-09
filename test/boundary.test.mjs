import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("verify-account-boundary passes on the clean tree (exit 0)", () => {
  const r = spawnSync("node", ["scripts/verify-account-boundary.mjs"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Only src\/urls\.ts builds an identity-origin URL/);
});
