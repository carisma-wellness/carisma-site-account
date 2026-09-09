# @carisma/site-account

The shared BFF + sealed-cookie kit that turns a Carisma brand website into a relying
party of the unified member-login identity origin (`account.carismasoft.com`). One
factory call per site mounts every `app/api/auth/**` route; the sealed `cw_session`
cookie keeps CarismaSoft tokens off the brand origin's JavaScript entirely.

> Local-first programme. This repo has **no remote** and nothing here deploys until the
> single cutover (see `12-Tech/Docs/unified-member-login-2026-09-08/build/00-LOCAL-FIRST-CHARTER.md`).
> WP-PKG-1 scope only: the seal, `createAccountRoutes()`, the proxy allowlist, single-flight
> refresh. UI (`AccountMark`, `AccountPanel`) and the Step-3 booking kit arrive in WP-PKG-2..4.

## What it exports

```ts
import { createAccountRoutes, seal, unseal, isAllowed } from "@carisma/site-account";

const routes = createAccountRoutes({
  rpId: "carisma-spa",
  clientId: "carisma-spa",
  clientSecret: process.env.IDENTITY_CLIENT_SECRET!,
  identityOrigin: process.env.IDENTITY_ORIGIN!,       // account origin
  carismasoftApiUrl: process.env.CARISMASOFT_API_URL!, // .../api/v1
  sessionSecret: process.env.SITE_SESSION_SECRET!,
  sessionSecretPrev: process.env.SITE_SESSION_SECRET_PREV, // rotation grace key
  allowedOrigins: ["https://www.carismaspa.com"],
});
// app/api/auth/session/route.ts       -> export const GET = routes.session
// app/api/auth/proxy/[...path]/route.ts-> export const { GET, POST, PATCH, DELETE } = wrap(routes.proxy)
// app/api/auth/start/route.ts         -> export const GET = routes.start
// app/api/auth/callback/route.ts      -> export const GET = routes.callback
// app/api/auth/logout/route.ts        -> export const POST = routes.logout
```

## The seal (`src/seal`)

`cw_session` = `k1:<b64url(iv12)>.<b64url(ct)>.<b64url(tag16)>`, AES-256-GCM, AAD
`cw_session|<rpId>|v1`. Decryption tries `SITE_SESSION_SECRET`, then `SITE_SESSION_SECRET_PREV`
when present — the two-secret window that makes a key rotation a two-deploy operation
instead of a mass sign-out. `unseal()` returns `null` for anything not authenticated.

## The proxy allowlist (`src/routes/allowlist.ts`)

An **allowlist**: a path is proxyable only if a rule matches; everything else is `404`
(never `403`), so the proxy is not a readable map of the API. Account-destroying acts
(`/auth/change-password`, `DELETE /profile`, session revoke) are not on it and never can be.

## The session rule

`GET /api/auth/session` answers `{signedIn:false}` + `private, no-store` on a cold read
with no network call. **Only a `401` from the backend clears the sealed cookie** — a `5xx`
or a connection error leaves the session intact (failure never signs anyone out).

## Local dev / verification

```
npm run build          # tsc -> dist/
node --test test/*.test.mjs
npm run pack:local     # -> ./.pack/carisma-site-account-<version>.tgz
node scripts/dev-demo-server.mjs   # mounts the routes on http://localhost:4321
```
