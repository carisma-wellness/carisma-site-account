/**
 * WP-PKG-2 local exit proof harness (charter Sec.5). Serves a tiny page that renders
 * the AccountMark with accountMarkServerHTML() and hydrates it in the real browser
 * from the host hint cookie. NOT shipped in the package.
 *
 *   GET /         the page. Renders the GUEST chip for every request — it never reads
 *                 the cookie — so the HTML is byte-identical signed in or out (W-1).
 *   GET /signin   Set-Cookie cw-signed-in=1; cw-initials=JD (readable, host-only), -> /
 *   GET /signout  clears the hints, -> /
 *   GET /dist/**  the built ESM, so the browser can import the real hydration code.
 *
 * The two proofs:
 *   1. byte-identical:  curl / with and without the Cookie header, diff -> empty.
 *   2. hydration:       agent-browser loads /signin then /, and the chip shows "JD"
 *                       with data-cw-session="in"; a fresh load of / shows the guest.
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname, normalize } from "node:path";
import { accountMarkServerHTML } from "../dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 4322);

/* The page. Fully static (no time, no nonce) so two responses are byte-identical.
   The mark is the guest chip in the server HTML; the inline module upgrades it. */
function pageHtml() {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>site-account demo</title></head>
<body>
<header id="site-header">${accountMarkServerHTML({ label: "Account" })}</header>
<div id="carisma-account-panel"></div>
<script type="module">
  import { hydrateAll } from "/dist/ui/browser.js";
  hydrateAll(document, {
    navigate: (url) => { window.location.href = url; },
    fetchImpl: (u, init) => fetch(u, init),
  });
</script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === "/") {
    // deliberately ignores the request cookie -> byte-identical for every visitor
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(pageHtml());
  }
  if (path === "/signin") {
    res.writeHead(302, {
      location: "/",
      "set-cookie": ["cw-signed-in=1; Path=/; SameSite=Lax", "cw-initials=JD; Path=/; SameSite=Lax"],
    });
    return res.end();
  }
  if (path === "/signout") {
    res.writeHead(302, {
      location: "/",
      "set-cookie": ["cw-signed-in=; Path=/; Max-Age=0", "cw-initials=; Path=/; Max-Age=0"],
    });
    return res.end();
  }
  if (path.startsWith("/dist/")) {
    const rel = normalize(path.slice(1)).replace(/^(\.\.[/\\])+/, "");
    try {
      const body = await readFile(join(ROOT, rel));
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      return res.end(body);
    } catch {
      res.writeHead(404).end("not found");
      return;
    }
  }
  res.writeHead(404, { "content-type": "text/plain" }).end("not found");
});

server.listen(PORT, () => console.log(`demo page on http://localhost:${PORT}`));
