import { seal, unseal } from "../seal/index.js";
import { COOKIES, parseCookies } from "./cookies.js";
import { isAllowed, normalizePath } from "./allowlist.js";
import { originAllowed, json, jsonClearing, appendSetSession, shouldClearSession } from "./http.js";
import { visitorIp as edgeVisitorIp } from "./pkce.js";
/**
 * Circle v2 (the WEB review's token finding): the doors that may be the FIRST signed-in call of a page that never
 * reads /api/auth/session — the pay step's points row (/me, previews, redeem, release) and the points booking on
 * the guest door. Access tokens last 15 minutes; a member who opened /book/checkout 20 minutes after her last
 * session read would otherwise send an expired bearer: no points row, a "Sign in to pay with points" while
 * signed in, and a release that cannot hand her points back. On these doors the proxy renews a token that is
 * within 60 s of expiry first (the session route's single-flight refresher and the same rules: a dead refresh
 * token signs out, a transient failure keeps the old token and clears nothing) and reseals the cookie on its
 * answer. Every other door is forwarded exactly as before.
 */
function refreshesFirst(method, sub) {
    return sub.startsWith("/client/loyalty/") || BOOKING_DOORS.has(`${method} ${sub}`);
}
/**
 * The member's consent doors: "Offers and reminders" (Carisma Circle W3,
 * marketing) and WhatsApp booking updates (W4, service). The backend records
 * each consent with its user agent, so the member's own browser travels with it.
 */
const CONSENT_DOORS = new Set(["PATCH /client/loyalty/preferences", "PUT /client/loyalty/whatsapp-updates"]);
/**
 * Circle v2 (the WEB fix): a member's booking that carries a points or free Spa
 * day code goes to the guest door through this proxy, so it carries her bearer.
 * The guest door reads the VISITOR's browser from `X-Client-User-Agent` /
 * `X-Client-IP` (a server's fetch is not the customer), and limits per shopper
 * on the forwarded address, so this one door forwards both. The address is the
 * one the site's own edge proved (CloudFront's viewer address, else the hop our
 * edge appended: the same rule as the token exchange), or the host's
 * `visitorIp` hook when it gives one; an unknown address is never sent.
 */
const BOOKING_DOORS = new Set(["POST /client/booking/guest/checkout"]);
const IP_SHAPE = /^[0-9a-fA-F:.]{3,45}$/;
/**
 * POST|GET|PATCH|DELETE /api/auth/proxy/[...path]
 *
 * The member proxy. A path is forwarded to the CarismaSoft API ONLY when the
 * allowlist matches; everything else answers 404 without reaching the backend, so
 * the proxy is not a readable map of the API (W-8). The bearer is attached
 * server-side from the sealed cookie; an upstream Set-Cookie is never replayed onto
 * the brand origin; the response carries the upstream status and body verbatim with
 * only content-type forwarded.
 */
export function makeProxy(cfg, refresh) {
    return async function proxy(req) {
        const url = new URL(req.url);
        let sub = url.pathname;
        if (sub.startsWith(cfg.proxyBasePath)) {
            sub = sub.slice(cfg.proxyBasePath.length) || "/";
        }
        sub = normalizePath(sub);
        const method = req.method.toUpperCase();
        if (!isAllowed(method, sub)) {
            // 404, never 403: a refused path must not confirm the API's shape.
            return json({ error: "not_found" }, 404);
        }
        // State-changing requests must originate from the site's own host (W-7).
        if (method !== "GET" && !originAllowed(req, cfg)) {
            return json({ error: "forbidden_origin" }, 403);
        }
        const cookies = parseCookies(req);
        const sess = unseal(cookies[COOKIES.session], cfg.unsealKeys, cfg.rpId);
        if (!sess) {
            return json({ signedIn: false }, 401);
        }
        let at = sess.at;
        let resealed = null;
        if (refresh && refreshesFirst(method, sub) && typeof sess.atExp === "number" && sess.atExp - cfg.now() / 1000 < 60) {
            const r = await refresh(sess.sid, sess.rt);
            // The refresh token is dead: signed out, exactly as the session route answers it (cookie and hints cleared).
            if (shouldClearSession(r.status))
                return jsonClearing({ signedIn: false }, cfg, 401);
            if (r.status === 200 && r.tokens) {
                at = r.tokens.accessToken;
                resealed = seal({ ...sess, at, atExp: r.tokens.atExp, rt: r.tokens.refreshToken ?? sess.rt }, cfg.sessionSecret, cfg.rpId);
            }
            // Transient (0 / 5xx): the old token goes; nothing is cleared (W-9: a failure never signs out).
        }
        const reqBody = method === "GET" || method === "HEAD" ? undefined : await req.text();
        const headers = { authorization: `Bearer ${at}` };
        if (reqBody != null && reqBody.length > 0)
            headers["content-type"] = "application/json";
        // A consent write records its proof (wording, time, user agent) at the
        // backend: send the member's own browser, not this server's fetch client.
        // Only on the one consent door; every other call is unchanged.
        if (CONSENT_DOORS.has(`${method} ${sub}`)) {
            const ua = req.headers.get("user-agent");
            if (ua)
                headers["user-agent"] = ua.slice(0, 512);
        }
        if (BOOKING_DOORS.has(`${method} ${sub}`)) {
            const ua = req.headers.get("user-agent");
            if (ua)
                headers["x-client-user-agent"] = ua.slice(0, 512);
            let ip = null;
            try {
                ip = cfg.visitorIp ? cfg.visitorIp(req) : edgeVisitorIp(req);
            }
            catch {
                ip = null;
            }
            if (ip === "127.0.0.1")
                ip = null;
            if (ip && IP_SHAPE.test(ip)) {
                headers["x-client-ip"] = ip;
                headers["x-forwarded-for"] = ip;
            }
        }
        let upstreamRes;
        try {
            upstreamRes = await cfg.fetchImpl(cfg.carismasoftApiUrl + sub + url.search, {
                method,
                headers,
                body: reqBody,
            });
        }
        catch {
            if (!resealed)
                return json({ error: "upstream_unreachable" }, 502);
            // A renewed token is kept even when the API did not answer: the old refresh token may already be rotated.
            const h = new Headers({ "content-type": "application/json", "cache-control": "private, no-store" });
            appendSetSession(h, cfg, resealed, sess.initials, Boolean(sess.keep));
            return new Response(JSON.stringify({ error: "upstream_unreachable" }), { status: 502, headers: h });
        }
        const text = await upstreamRes.text();
        const outHeaders = new Headers({ "cache-control": "private, no-store" });
        const ct = upstreamRes.headers.get("content-type");
        if (ct)
            outHeaders.set("content-type", ct);
        // W-8: never replay an upstream Set-Cookie onto the brand origin. Our OWN reseal (a renewed token) rides along.
        if (resealed)
            appendSetSession(outHeaders, cfg, resealed, sess.initials, Boolean(sess.keep));
        return new Response(text, { status: upstreamRes.status, headers: outHeaders });
    };
}
//# sourceMappingURL=proxy.js.map