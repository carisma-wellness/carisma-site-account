/**
 * Member-account design lab.
 *
 *   node lab/server.mjs            → http://localhost:4411
 *
 * Renders the REAL kit (dist/ui) inside each brand's REAL header, stylesheets
 * and fonts, proxied from the live site — so a critic sees what a member sees,
 * including the brand's global h1 rules that leak into the portal. No sign-in,
 * no live customer data: every API answer comes from lab/fixtures.js.
 *
 * Pages:  /                         gallery of every view × state × brand
 *         /p?brand=slimming&view=booking&id=u1&state=full
 *         /p?...&open=reschedule    opens the reschedule picker after mount
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.LAB_PORT || 4411);
const BRANDS = {
  spa: "https://3k7frbpgpp.eu-central-1.awsapprunner.com",
  aesthetics: "https://www.carismaaesthetics.com",
  slimming: "https://www.carismaslimming.com",
  "hair-clinic": "https://www.carismahairclinic.com",
  pulse: "https://www.pulsewellness.com",
};
const shells = new Map();

/** The brand's own <html>/<body> classes, stylesheets and header, once per run. */
async function shell(brand) {
  if (shells.has(brand)) return shells.get(brand);
  const origin = BRANDS[brand];
  // The homepage, and only if it answered 200 — Hair Clinic's /gifts is a 404
  // page, and a 404 shell rendered the wrong brand's header in the first pass.
  const r = await fetch(origin + "/", { redirect: "follow" });
  if (!r.ok) throw new Error(`${brand} shell answered ${r.status}`);
  const html = await r.text();
  const css = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const fonts = [...html.matchAll(/<link[^>]+rel="preload"[^>]*href="([^"]+\.woff2)"[^>]*>/g)].map((m) => m[1]);
  const htmlClass = (/<html[^>]*class="([^"]*)"/.exec(html) || [])[1] || "";
  const bodyClass = (/<body[^>]*class="([^"]*)"/.exec(html) || [])[1] || "";
  const hs = html.indexOf("<header");
  const he = hs >= 0 ? html.indexOf("</header>", hs) : -1;
  const header = hs >= 0 && he > hs ? html.slice(hs, he + 9) : "";
  const s = { css, fonts, htmlClass, bodyClass, header };
  shells.set(brand, s);
  return s;
}

/** Root-relative /_next/* requests (fonts inside brand CSS) go back to the brand in the Referer. */
let lastBrand = "slimming";
function brandFromReferer(req) {
  const ref = req.headers.referer || "";
  const direct = /[?&]brand=([a-z-]+)/.exec(ref);
  if (direct && BRANDS[direct[1]]) { lastBrand = direct[1]; return direct[1]; }
  const m = /[?&]brand=([a-z-]+)/.exec(ref) || /\/b\/([a-z-]+)\//.exec(ref);
  return m && BRANDS[m[1]] ? m[1] : lastBrand;
}

async function proxy(res, url) {
  const r = await fetch(url);
  const body = Buffer.from(await r.arrayBuffer());
  res.writeHead(r.status, { "content-type": r.headers.get("content-type") || "application/octet-stream", "cache-control": "max-age=3600" });
  res.end(body);
}

const VIEWS = [
  ["home", "Overview", {}],
  ["bookings", "Bookings", {}],
  ["booking", "Booking · 3 days out, paid", { id: "u1" }],
  ["booking", "Booking · balance due, window closing", { id: "u2" }],
  ["booking", "Booking · inside 24h", { id: "u3" }],
  ["booking", "Booking · free consultation", { id: "u4" }],
  ["booking", "Booking · completed", { id: "p1" }],
  ["booking", "Booking · missed, fee owed", { id: "p3" }],
  ["booking", "Booking · reschedule picker open", { id: "u1", open: "reschedule" }],
  ["booking", "Booking · not found", { id: "gone" }],
  ["wallet", "Wallet", {}],
  ["membership", "Membership · active", {}],
  ["membership", "Membership · paused", { state: "paused" }],
  ["payments", "Payments", {}],
  ["documents", "Documents", {}],
  ["details", "Details", {}],
  ["home", "Overview · new member (empty)", { state: "empty" }],
  ["bookings", "Bookings · empty", { state: "empty" }],
  ["wallet", "Wallet · empty", { state: "empty" }],
  ["documents", "Documents · empty", { state: "empty" }],
];

function q(o) { return new URLSearchParams(Object.entries(o).filter(([, v]) => v != null)).toString(); }

function gallery() {
  const rows = Object.keys(BRANDS).map((b) =>
    `<h2>${b}</h2><ul>` + VIEWS.map(([view, label, extra]) => `<li><a href="/p?${q({ brand: b, view, ...extra })}">${label}</a></li>`).join("") + "</ul>").join("");
  return `<!doctype html><meta charset="utf-8"><title>Member account lab</title><style>body{font:14px system-ui;margin:32px}ul{columns:3}</style><h1>Member account — design lab</h1>${rows}`;
}

async function page(params) {
  const brand = BRANDS[params.get("brand")] ? params.get("brand") : "slimming";
  const s = await shell(brand);
  const view = params.get("view") || "home";
  const id = params.get("id");
  const path = view === "booking" && id ? `/account/bookings/${id}` : view === "home" ? "/account" : `/account/${view}`;
  const links = s.css.map((h) => `<link rel="stylesheet" href="/b/${brand}${h.startsWith("/") ? h : new URL(h).pathname}">`).join("\n");
  const preloads = s.fonts.map((h) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="/b/${brand}${h.startsWith("/") ? h : new URL(h).pathname}">`).join("\n");
  return `<!doctype html>
<html lang="en" class="${s.htmlClass}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>lab · ${brand} · ${view}</title>
${preloads}
${links}
<link rel="stylesheet" href="/lab/brand-tokens.css">
</head>
<body class="${s.bodyClass}" data-lab-brand="${brand}">
${s.header}
<main><div class="cw-account-page"><div id="carisma-account-portal"></div></div></main>
<script type="module">
import { mountAccountPortal } from "/dist/ui/index.js";
import { fixtureFetch } from "/lab/fixtures.js";
document.cookie = "cw-signed-in=1; path=/";
document.cookie = "cw-initials=MG; path=/";
const state = ${JSON.stringify(params.get("state") || "full")};
mountAccountPortal(document, {
  view: ${JSON.stringify(view === "booking" ? "bookings" : view)},
  path: ${JSON.stringify(path)},
  fetchImpl: fixtureFetch(state),
  navigate: (u) => console.log("[lab navigate]", u),
  confirmImpl: (q) => { console.log("[lab confirm]", q); return false; },
});
if (${JSON.stringify(params.get("open") || "")} === "reschedule") {
  setTimeout(() => document.querySelector('[data-cw-action="reschedule"]')?.click(), 400);
}
</script></body></html>`;
}

const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".map": "application/json" };

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`);
    if (u.pathname === "/") { res.writeHead(200, { "content-type": "text/html" }); return res.end(gallery()); }
    if (u.pathname === "/p") { res.writeHead(200, { "content-type": "text/html" }); return res.end(await page(u.searchParams)); }
    const bm = /^\/b\/([a-z-]+)(\/.*)$/.exec(u.pathname);
    if (bm && BRANDS[bm[1]]) return proxy(res, BRANDS[bm[1]] + bm[2] + u.search);
    if (u.pathname.startsWith("/_next/") || u.pathname.startsWith("/fonts/") || u.pathname.startsWith("/assets/") || u.pathname.startsWith("/images/")) {
      const b = brandFromReferer(req) || "slimming";
      return proxy(res, BRANDS[b] + u.pathname + u.search);
    }
    if (u.pathname.startsWith("/dist/") || u.pathname.startsWith("/lab/")) {
      const file = join(ROOT, u.pathname);
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      return res.end(body);
    }
    // Anything else (logos, header images, icons) belongs to the brand whose
    // page asked for it.
    const b = brandFromReferer(req);
    if (b) return proxy(res, BRANDS[b] + u.pathname + u.search);
    res.writeHead(404); res.end("not found");
  } catch (e) {
    res.writeHead(500); res.end(String(e && e.stack || e));
  }
}).listen(PORT, () => console.log(`member-account lab on http://localhost:${PORT}`));
