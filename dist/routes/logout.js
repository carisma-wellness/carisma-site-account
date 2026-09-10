import { unseal } from "../seal/index.js";
import { COOKIES, parseCookies } from "./cookies.js";
import { upstream } from "./upstream.js";
import { appendClearSession, originAllowed, json } from "./http.js";
import { buildLogoutUrl } from "../urls.js";
/**
 * POST /api/auth/logout {everywhere?: true}
 * Revokes this session upstream, then clears cw_session and both hints locally.
 * everywhere:true 303s to the identity origin's /logout confirm page (ADR 4.8).
 * Logout is a first-class BFF route, not a proxied path — it is not on the allowlist.
 */
export function makeLogout(cfg) {
    return async function logout(req) {
        if (!originAllowed(req, cfg)) {
            return json({ error: "forbidden_origin" }, 403);
        }
        let everywhere = false;
        try {
            const body = (await req.json());
            everywhere = Boolean(body?.everywhere);
        }
        catch {
            /* empty body is fine */
        }
        const cookies = parseCookies(req);
        const sess = unseal(cookies[COOKIES.session], cfg.unsealKeys, cfg.rpId);
        if (sess) {
            // Best-effort upstream revoke; a failure still clears the local cookie.
            await upstream(cfg, everywhere ? "/auth/logout-all" : "/auth/logout", "POST", sess.at, JSON.stringify({}));
        }
        const headers = new Headers({ "cache-control": "private, no-store" });
        appendClearSession(headers, cfg);
        // The identity-origin /logout URL (and the presence check) live in urls.ts — the
        // one builder — so this route never names identityOrigin (boundary-enforced).
        const logoutUrl = everywhere ? buildLogoutUrl(cfg) : null;
        if (logoutUrl) {
            headers.set("location", logoutUrl);
            return new Response(null, { status: 303, headers });
        }
        return new Response(null, { status: 204, headers });
    };
}
//# sourceMappingURL=logout.js.map