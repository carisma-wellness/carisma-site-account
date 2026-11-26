import { test } from "node:test";
import assert from "node:assert/strict";
import { markTabScroll, ACCOUNT_CHROME_CSS } from "../dist/ui/index.js";
import { PORTAL_SHELL_CSS } from "../dist/ui/styles/shell.js";

/** QC-CEO-1126 UX-15: the phone's account tab row shows it scrolls (fade + chevron on the edge with more tabs). */

function fakeMount({ scrollWidth, clientWidth, scrollLeft }) {
  const attrs = new Map();
  const listeners = {};
  const rail = {
    setAttribute: (k, v) => attrs.set(k, v),
    removeAttribute: (k) => attrs.delete(k),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
  };
  const nav = { scrollWidth, clientWidth, scrollLeft, addEventListener: (t, f) => (listeners[t] = f) };
  const mount = { innerHTML: "", querySelector: (sel) => (sel === ".cw-nav" ? nav : sel === ".cw-rail" ? rail : null) };
  return { mount, nav, attrs, listeners };
}

test("a row wider than the phone marks the end; scrolling marks the start; a row that fits marks nothing", () => {
  const a = fakeMount({ scrollWidth: 700, clientWidth: 390, scrollLeft: 0 });
  markTabScroll(a.mount);
  assert.ok(a.attrs.has("data-cw-more-end"));
  assert.ok(!a.attrs.has("data-cw-more-start"));
  a.nav.scrollLeft = 120;
  a.listeners.scroll();
  assert.ok(a.attrs.has("data-cw-more-start") && a.attrs.has("data-cw-more-end"));
  a.nav.scrollLeft = 310;
  a.listeners.scroll();
  assert.ok(a.attrs.has("data-cw-more-start") && !a.attrs.has("data-cw-more-end"));
  const b = fakeMount({ scrollWidth: 390, clientWidth: 390, scrollLeft: 0 });
  markTabScroll(b.mount);
  assert.equal(b.attrs.size, 0);
});

test("the styles fade the marked edge and draw a chevron there", () => {
  for (const css of [PORTAL_SHELL_CSS]) {
    assert.match(css, /\.cw-rail\[data-cw-more-end\] \.cw-nav/);
    assert.match(css, /\.cw-rail\[data-cw-more-start\] \.cw-nav/);
    assert.match(css, /\.cw-rail\[data-cw-more-end\]::after/);
  }
  assert.equal(typeof ACCOUNT_CHROME_CSS, "string");
});
