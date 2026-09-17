import { test } from "node:test";
import assert from "node:assert/strict";
import { mountAccountPanel, hydrateAccountMark } from "../dist/index.js";

function fakeEl(id = "", extra = {}) {
  const attrs = { ...(id ? { id } : {}), ...extra };
  const el = {
    innerHTML: "",
    setAttribute(k, v) {
      attrs[k] = v;
    },
    getAttribute(k) {
      return k in attrs ? attrs[k] : null;
    },
    removeAttribute(k) {
      delete attrs[k];
    },
    closest(sel) {
      if (sel.startsWith("[") && sel.endsWith("]")) {
        const name = sel.slice(1, -1).split("=")[0];
        if (name in attrs) return el;
      }
      if (sel.startsWith("[") && extra.closestMark && sel.includes("data-carisma-account-mark")) {
        return extra.closestMark;
      }
      return nameIn(sel, attrs) ? el : null;
    },
  };
  return el;
}

function nameIn(sel, attrs) {
  const m = sel.match(/^\[([a-zA-Z0-9-]+)\]$/);
  return m ? m[1] in attrs : false;
}

function fakeDoc() {
  const els = {};
  const listeners = [];
  const mark = fakeEl("", { "data-carisma-account-mark": "", "data-cw-session": "in", href: "/account" });
  mark.closest = (sel) => (sel.includes("data-carisma-account-mark") ? mark : null);
  const doc = {
    cookie: "cw-signed-in=1; cw-initials=JD",
    addEventListener(type, handler) {
      listeners.push({ type, handler });
    },
    querySelectorAll(sel) {
      return sel.includes("data-carisma-account-mark") ? [mark] : [];
    },
    getElementById(id) {
      return els[id] || null;
    },
    createElement(tag) {
      return fakeEl();
    },
    body: {
      appendChild(el) {
        const id = el.getAttribute("id");
        if (id) els[id] = el;
      },
    },
    head: { appendChild() {} },
    listeners,
    mark,
    els,
  };
  return doc;
}

test("clicking the signed-in mark preventDefault and opens a panel with Sign out", async () => {
  const doc = fakeDoc();
  const calls = [];
  mountAccountPanel(doc, {
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          signedIn: true,
          initials: "JD",
          profile: { firstName: "Jane", lastName: "Doe", emailMasked: "j***@gmail.com" },
          upcoming: [],
        }),
      };
    },
    navigate: () => {},
  });
  assert.ok(doc.getElementById("carisma-account-panel"), "mount is created if the page omitted it");
  const click = doc.listeners.find((l) => l.type === "click");
  let prevented = false;
  await new Promise((resolve) => {
    const orig = click.handler;
    click.handler({
      target: doc.mark,
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      defaultPrevented: false,
      preventDefault() {
        prevented = true;
      },
      stopPropagation() {},
    });
    setTimeout(resolve, 20);
  });
  assert.equal(prevented, true);
  assert.equal(calls[0], "/api/auth/session?include=upcoming");
  const html = doc.getElementById("carisma-account-panel").innerHTML;
  assert.match(html, /data-carisma-signout/);
  assert.match(html, /My account/);
});

test("a failed session read still opens Sign out (never a dead hash)", async () => {
  const doc = fakeDoc();
  mountAccountPanel(doc, {
    fetchImpl: async () => {
      throw new Error("offline");
    },
    navigate: () => {},
  });
  const click = doc.listeners.find((l) => l.type === "click");
  click.handler({
    target: doc.mark,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    preventDefault() {},
    stopPropagation() {},
  });
  await new Promise((r) => setTimeout(r, 20));
  assert.match(doc.getElementById("carisma-account-panel").innerHTML, /data-carisma-signout/);
});

test("Sign out POSTs /api/auth/logout and navigates home", async () => {
  const doc = fakeDoc();
  const posts = [];
  const nav = [];
  const signBtn = fakeEl("", { "data-carisma-signout": "" });
  mountAccountPanel(doc, {
    fetchImpl: async (url, init) => {
      posts.push({ url, method: init?.method, body: init?.body });
      return { ok: true, status: 204, json: async () => ({}), headers: { get: () => null } };
    },
    navigate: (u) => nav.push(u),
  });
  const click = doc.listeners.find((l) => l.type === "click");
  click.handler({
    target: signBtn,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    preventDefault() {},
    stopPropagation() {},
  });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(posts[0].url, "/api/auth/logout");
  assert.equal(posts[0].method, "POST");
  assert.equal(posts[0].body, "{}");
  assert.equal(nav[0], "/");
});

test("createElement is called as a method (Chrome rejects an unbound alias)", () => {
  const doc = fakeDoc();
  const orig = doc.createElement;
  doc.createElement = function createElement(tag) {
    if (this !== doc) throw new TypeError("Illegal invocation");
    return orig.call(this, tag);
  };
  mountAccountPanel(doc, {
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => null }),
    navigate: () => {},
  });
  assert.ok(doc.getElementById("carisma-account-panel"), "mount is created without Illegal invocation");
  assert.ok(doc.getElementById("carisma-account-backdrop"), "backdrop is created without Illegal invocation");
});

test("hydrateAccountMark is still a no-op for guests", () => {
  const el = fakeEl("", { "data-cw-session": "out", href: "/member" });
  el.innerHTML = "guest";
  hydrateAccountMark(el, "");
  assert.equal(el.getAttribute("data-cw-session"), "out");
  assert.equal(el.innerHTML, "guest");
});
