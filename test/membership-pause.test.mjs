import { test } from "node:test";
import assert from "node:assert/strict";
import { mountAccountPortal } from "../dist/ui/index.js";

/**
 * Pausing takes a paid membership off, the same class of act as cancelling a
 * booking, so it asks first. It used to pause on a single tap. Resuming gives
 * something back and still acts immediately — that is the negative control:
 * if both asked, or neither did, one of these two tests fails.
 */
function harness() {
  const calls = { inserted: [], shown: 0, posts: [] };
  const handlers = [];
  const dialog = {
    innerHTML: "", attrs: {},
    setAttribute(n, v) { this.attrs[n] = v; }, getAttribute(n) { return this.attrs[n] ?? null; },
    addEventListener() {}, showModal() { calls.shown++; }, close() {}, remove() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
  };
  let inserted = false;
  const host = {
    insertAdjacentHTML(_w, html) { calls.inserted.push(html); inserted = true; },
    querySelectorAll(sel) { return sel === "dialog.cw-dialog" && inserted ? [dialog] : []; },
    querySelector() { return null; },
  };
  const mount = {
    innerHTML: "", setAttribute() {}, getAttribute() { return null; },
    addEventListener(t, h) { if (t === "click") handlers.push(h); },
    querySelector(sel) { return sel === ".carisma-portal" ? host : null; },
    querySelectorAll() { return []; },
  };
  const doc = {
    cookie: "cw-signed-in=1",
    location: { pathname: "/account/membership", host: "www.pulsewellness.com", origin: "https://www.pulsewellness.com", search: "" },
    getElementById: (id) => (id === "carisma-account-portal" ? mount : null),
    querySelectorAll: () => [], addEventListener() {},
  };
  const json = (data) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
  const fetchImpl = (url, init = {}) => {
    if (init.method && init.method !== "GET") calls.posts.push(url);
    if (url.startsWith("/api/auth/session")) return json({ signedIn: true, profile: { firstName: "Jane" } });
    return json({ success: true, data: [{ id: "m1", status: "ACTIVE", price: 49, membership: { name: "Gold" } }] });
  };
  const click = (verb) => {
    const btn = {
      attrs: { "data-cw-action": `membership-${verb}`, "data-cw-membership": "m1" },
      getAttribute(n) { return this.attrs[n] ?? null; }, setAttribute() {}, focus() {},
      closest(sel) { return sel.startsWith("[data-cw-action^='membership-']") ? this : null; },
      innerHTML: verb,
    };
    for (const h of handlers) h({ target: btn, preventDefault() {}, stopPropagation() {} });
  };
  return { doc, calls, fetchImpl, click };
}

const settle = () => new Promise((r) => setTimeout(r, 20));

test("Pause asks first, and sends nothing until the member confirms", async () => {
  const h = harness();
  mountAccountPortal(h.doc, { view: "membership", fetchImpl: h.fetchImpl, navigate() {} });
  await settle();
  h.click("pause");
  await settle();
  assert.equal(h.calls.shown, 1, "a sheet opened");
  assert.match(h.calls.inserted.join(""), /Pause your membership\?/);
  assert.match(h.calls.inserted.join(""), /Keep my membership/);
  assert.deepEqual(h.calls.posts, [], "no pause was sent on the first tap");
});

test("NEGATIVE CONTROL: Resume acts on the tap, with no sheet", async () => {
  const h = harness();
  mountAccountPortal(h.doc, { view: "membership", fetchImpl: h.fetchImpl, navigate() {} });
  await settle();
  h.click("resume");
  await settle();
  assert.equal(h.calls.shown, 0);
  assert.ok(h.calls.posts.some((u) => /\/client\/membership\/m1\/resume$/.test(u)), "resume was sent");
});
