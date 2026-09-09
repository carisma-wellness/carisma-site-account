// Minimal harness that mounts createAccountRoutes() on Node http, so the package can
// be probed with a real HTTP request (charter Sec.5). NOT shipped in the package.
import http from "node:http";
import { createAccountRoutes } from "../dist/index.js";

const PORT = Number(process.env.PORT || 4321);
const routes = createAccountRoutes({
  rpId: process.env.RP_ID || "carisma-spa",
  clientId: process.env.RP_ID || "carisma-spa",
  clientSecret: process.env.CLIENT_SECRET || "local-dev-client-secret",
  identityOrigin: process.env.IDENTITY_ORIGIN || "http://account.localtest.me:3000",
  carismasoftApiUrl: process.env.CARISMASOFT_API_URL || "http://localhost:5001/api/v1",
  sessionSecret: process.env.SITE_SESSION_SECRET || "local-dev-session-secret-000000000000",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3100").split(","),
  cookieSecure: false,
});

const table = [
  ["/api/auth/session", routes.session],
  ["/api/auth/logout", routes.logout],
  ["/api/auth/start", routes.start],
  ["/api/auth/callback", routes.callback],
  ["/api/auth/establish", routes.establish],
];

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const url = `http://localhost:${PORT}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const request = new Request(url, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
  });

  const path = new URL(url).pathname;
  let handler = table.find(([p]) => path === p)?.[1];
  if (!handler && path.startsWith("/api/auth/proxy")) handler = routes.proxy;
  if (!handler) {
    res.writeHead(404, { "content-type": "application/json" });
    return res.end(JSON.stringify({ error: "no_route" }));
  }
  const response = await handler(request);
  const outHeaders = {};
  response.headers.forEach((v, k) => { if (k !== "set-cookie") outHeaders[k] = v; });
  const setCookies = response.headers.getSetCookie?.() || [];
  // Emit all Set-Cookie headers in writeHead itself. Appending them AFTER writeHead
  // throws ERR_HTTP_HEADERS_SENT and crashes the harness on every cookie-clearing
  // response (garbage cookie, 401), which is exactly the response the live probe needs.
  if (setCookies.length) outHeaders["set-cookie"] = setCookies;
  res.writeHead(response.status, outHeaders);
  const text = await response.text();
  res.end(text);
});

server.listen(PORT, () => console.log(`demo BFF on http://localhost:${PORT} -> ${process.env.CARISMASOFT_API_URL || "http://localhost:5001/api/v1"}`));
