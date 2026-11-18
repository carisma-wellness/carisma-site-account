/**
 * A tiny tree DOM for the kit's browser tests (no dependency): parses and serialises the kit's OWN HTML strings,
 * answers the selectors browser.ts uses (tag, .class, [attr], [attr="v"], descendant chains), and supports
 * innerHTML get/set, insertAdjacentHTML, attributes, closest and click listeners. Not a browser: no layout, no
 * scripts, entities stay as written. Not a test file (node --test runs test/*.test.mjs only).
 */
const VOID = new Set(["img", "input", "br", "hr", "meta", "link", "source", "wbr"]);
const TOKEN = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
const ATTR = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

class TextNode {
  constructor(text) {
    this.text = text;
    this.parent = null;
  }
}

function parseAttrs(raw) {
  const out = {};
  for (const m of (raw || "").matchAll(ATTR)) out[m[1]] = m[2] ?? m[3] ?? m[4] ?? null;
  return out;
}

export function parse(html) {
  const root = new El("#root");
  const stack = [root];
  for (const m of String(html ?? "").matchAll(TOKEN)) {
    const top = stack[stack.length - 1];
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) {
      const at = stack.map((e) => e.tag).lastIndexOf(m[1].toLowerCase());
      if (at > 0) stack.length = at;
      continue;
    }
    if (m[2]) {
      const el = new El(m[2].toLowerCase(), parseAttrs(m[3]));
      el.parent = top === root ? null : top;
      top.children.push(el);
      if (!VOID.has(el.tag) && m[4] !== "/") stack.push(el);
      continue;
    }
    const t = new TextNode(m[5]);
    t.parent = top === root ? null : top;
    top.children.push(t);
  }
  return root.children;
}

function serialize(node) {
  if (node instanceof TextNode) return node.text;
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => (v === null ? ` ${k}` : ` ${k}="${String(v).replace(/"/g, "&quot;")}"`))
    .join("");
  if (VOID.has(node.tag)) return `<${node.tag}${attrs}>`;
  return `<${node.tag}${attrs}>${node.children.map(serialize).join("")}</${node.tag}>`;
}

function compound(sel) {
  const tag = /^[a-zA-Z][\w-]*/.exec(sel)?.[0]?.toLowerCase() ?? null;
  const classes = [...sel.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
  const attrs = [...sel.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)].map((m) => ({ name: m[1], value: m[2] }));
  return (el) =>
    el instanceof El &&
    (!tag || el.tag === tag) &&
    classes.every((c) => (el.attrs.class ?? "").split(/\s+/).includes(c)) &&
    attrs.every((a) => a.name in el.attrs && (a.value === undefined || el.attrs[a.name] === a.value));
}

function matcher(selector) {
  const groups = selector.split(",").map((g) => g.trim().split(/\s+/).map(compound));
  return (el, scope) =>
    groups.some((chain) => {
      if (!chain[chain.length - 1](el)) return false;
      let i = chain.length - 2;
      let up = el.parent;
      while (i >= 0 && up && up !== scope) {
        if (chain[i](up)) i--;
        up = up.parent;
      }
      return i < 0;
    });
}

export class El {
  constructor(tag = "div", attrs = {}) {
    this.tag = tag;
    this.attrs = attrs;
    this.children = [];
    this.parent = null;
    this.listeners = {};
    this.style = {};
  }
  get innerHTML() {
    return this.children.map(serialize).join("");
  }
  set innerHTML(html) {
    this.children = parse(html);
    for (const c of this.children) c.parent = this;
  }
  get outerHTML() {
    return serialize(this);
  }
  get textContent() {
    return this.innerHTML.replace(/<[^>]*>/g, "");
  }
  set textContent(t) {
    const n = new TextNode(String(t));
    n.parent = this;
    this.children = [n];
  }
  getAttribute(n) {
    return n in this.attrs ? (this.attrs[n] ?? "") : null;
  }
  setAttribute(n, v) {
    this.attrs[n] = String(v);
  }
  removeAttribute(n) {
    delete this.attrs[n];
  }
  hasAttribute(n) {
    return n in this.attrs;
  }
  appendChild(el) {
    el.parent = this;
    this.children.push(el);
    return el;
  }
  addEventListener(t, h) {
    (this.listeners[t] ??= []).push(h);
  }
  dispatch(t, ev) {
    for (const h of this.listeners[t] ?? []) h(ev);
  }
  *descendants() {
    for (const c of this.children) {
      if (c instanceof El) {
        yield c;
        yield* c.descendants();
      }
    }
  }
  querySelectorAll(sel) {
    const m = matcher(sel);
    return [...this.descendants()].filter((d) => m(d, this));
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] ?? null;
  }
  closest(sel) {
    const m = matcher(sel);
    for (let e = this; e; e = e.parent) if (m(e, null)) return e;
    return null;
  }
  insertAdjacentHTML(where, html) {
    const nodes = parse(html);
    if (where === "beforeend") {
      for (const n of nodes) this.appendChild(n);
      return;
    }
    if (where === "afterbegin") {
      for (const n of nodes) n.parent = this;
      this.children.unshift(...nodes);
      return;
    }
    const p = this.parent;
    if (!p) return;
    const at = p.children.indexOf(this) + (where === "afterend" ? 1 : 0);
    for (const n of nodes) n.parent = p;
    p.children.splice(at, 0, ...nodes);
  }
  remove() {
    const p = this.parent;
    if (p) p.children.splice(p.children.indexOf(this), 1);
    this.parent = null;
  }
}

/** A document with a body, getElementById over the whole tree, and document-level click listeners. */
export function miniDocument({ cookie = "cw-signed-in=1", host = "www.carismaspa.com", pathname = "/" } = {}) {
  const body = new El("body");
  const head = new El("head");
  const listeners = {};
  const doc = {
    cookie,
    body,
    head,
    location: { pathname, host, origin: `https://${host}`, search: "" },
    createElement: (tag) => new El(tag),
    getElementById: (id) => [body, ...body.descendants()].find((e) => e.attrs.id === id) ?? null,
    querySelectorAll: (sel) => body.querySelectorAll(sel),
    querySelector: (sel) => body.querySelector(sel),
    addEventListener(t, h) {
      (listeners[t] ??= []).push(h);
    },
    click(target) {
      const ev = {
        target,
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        stopPropagation() {},
      };
      for (let e = target; e; e = e.parent) e.dispatch?.("click", ev);
      for (const h of listeners.click ?? []) h(ev);
      return ev;
    },
  };
  return doc;
}
