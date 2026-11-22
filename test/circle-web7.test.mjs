import { test } from "node:test";
import assert from "node:assert/strict";
import { ACCOUNT_CHROME_CSS } from "../dist/ui/index.js";
import { PORTAL_CIRCLE_CSS } from "../dist/ui/styles/index.js";

/**
 * WEB-7 (22 Nov 2026): on a phone the account overview's Circle block (`.cc-dash`) took its content's min width
 * (692 px in a 358 px column at 390), so /account scrolled sideways. Its one track is held to the column.
 */

const rule = (css, sel) => {
  const at = css.indexOf(`${sel} {`);
  assert.notEqual(at, -1, `${sel} is in the sheet`);
  return css.slice(at, css.indexOf("}", at) + 1);
};

test(".cc-dash has one column held to its box (minmax(0, 1fr)), in the kit sheet and the injected chrome", () => {
  for (const css of [PORTAL_CIRCLE_CSS, ACCOUNT_CHROME_CSS]) {
    const r = rule(css, ".carisma-portal .cc-dash");
    assert.match(r, /display: grid;/);
    assert.match(r, /grid-template-columns: minmax\(0, 1fr\);/);
    assert.match(r, /gap: 24px;/);
  }
});

test("NEGATIVE CONTROL: the check fails on the 21 Nov rule (no column template)", () => {
  const old = ".carisma-portal .cc-dash { display: grid; gap: 24px; }";
  assert.throws(() => assert.match(rule(old, ".carisma-portal .cc-dash"), /grid-template-columns: minmax\(0, 1fr\);/));
});

test("the panel and Credit & rewards top keep their own two columns, one on a phone (unchanged)", () => {
  assert.match(PORTAL_CIRCLE_CSS, /\.carisma-portal \.cc-dash__panel, \.carisma-portal \.cc-view__top \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/);
  assert.match(PORTAL_CIRCLE_CSS, /@media \(max-width: 760px\) \{\s*\.carisma-portal \.cc-dash__panel, \.carisma-portal \.cc-view__top \{ grid-template-columns: minmax\(0, 1fr\); \}/);
});
