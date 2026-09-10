import { unseal } from "../seal/index.js";
import { COOKIES, parseCookies } from "./cookies.js";
import { isAllowed, normalizePath } from "./allowlist.js";
import { originAllowed, json } from "./http.js";
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
export function makeProxy(cfg) {
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
        const reqBody = method === "GET" || method === "HEAD" ? undefined : await req.text();
        const headers = { authorization: `Bearer ${sess.at}` };
        if (reqBody != null && reqBody.length > 0)
            headers["content-type"] = "application/json";
        let upstreamRes;
        try {
            upstreamRes = await cfg.fetchImpl(cfg.carismasoftApiUrl + sub + url.search, {
                method,
                headers,
                body: reqBody,
            });
        }
        catch {
            return json({ error: "upstream_unreachable" }, 502);
        }
        const text = await upstreamRes.text();
        const outHeaders = new Headers({ "cache-control": "private, no-store" });
        const ct = upstreamRes.headers.get("content-type");
        if (ct)
            outHeaders.set("content-type", ct);
        // W-8: never replay an upstream Set-Cookie onto the brand origin.
        return new Response(text, { status: upstreamRes.status, headers: outHeaders });
    };
}
//# sourceMappingURL=proxy.js.map