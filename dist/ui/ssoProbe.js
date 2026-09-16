/**
 * The browser half of cross-brand single sign-on: decide whether THIS page view should
 * ask the identity origin who the visitor is, and if so, go.
 *
 * The rules are the CEO's (2026-09-16, "lazily, plus remember returners"):
 *   · cold traffic is never redirected — no cw-known, and the trigger is a page load ⇒ nothing;
 *   · a returner (cw-known) who is not signed in here is checked once, on load;
 *   · anyone who opens booking (trigger "interaction") is checked once, before they type;
 *   · a person signed in HERE by the booking pop-up is carried to the identity origin once
 *     (cw-sso-seed), so the other brands can find them;
 *   · a person who signed out on this brand (cw-sso-off) is never silently signed back in.
 *
 * Every check is a top-level navigation. The identity origin is a different registrable
 * domain from every brand, and a hidden iframe or a credentialed fetch would depend on
 * third-party cookies — blocked in Safari and Firefox — so it would work for some people
 * and not others. A redirect works for everyone.
 *
 * Loop safety lives HERE, before the navigation, not only on the server: cw-sso-probed is
 * written first (one silent check per browser session) and cw-sso-seed is deleted first
 * (one seed attempt), so a server that answers badly still cannot bounce anyone twice.
 */
import { seedDoorUrl, silentStartUrl } from "../urls.js";
const has = (cookie, name, value = "1") => new RegExp(`(?:^|;\\s*)${name}=${value}(?:;|$)`).test(cookie);
/** Paths where a page-load redirect would disturb a payment in progress. */
export const SSO_PROBE_SKIP_PREFIXES = ["/api/", "/book/checkout", "/book/confirmed"];
const BOT_UA = /bot|crawl|spider|slurp|preview|lighthouse|headless(?!chrome)/i;
/** Pure decision, unit-tested. No DOM. */
export function ssoProbeDecision(input) {
    const { cookie, trigger, path } = input;
    if (input.userAgent && BOT_UA.test(input.userAgent))
        return null;
    if (SSO_PROBE_SKIP_PREFIXES.some((p) => path.startsWith(p)))
        return null;
    if (has(cookie, "cw-sso-off"))
        return null;
    if (has(cookie, "cw-signed-in")) {
        return has(cookie, "cw-sso-seed") ? "seed" : null;
    }
    if (has(cookie, "cw-sso-probed"))
        return null;
    if (trigger === "load" && !has(cookie, "cw-known"))
        return null;
    return "probe";
}
/**
 * Run the check. Pass `window` (it satisfies SsoProbeEnv). Returns true when the page is
 * navigating away — the caller should stop what it was about to do (for booking,
 * snapshot first so the pop-up can resume on return).
 */
export function runSsoProbe(env, trigger, opts = {}) {
    if (!env || !env.document || !env.location)
        return false;
    const doc = env.document;
    const loc = env.location;
    const action = ssoProbeDecision({
        cookie: doc.cookie || "",
        trigger,
        path: loc.pathname,
        userAgent: env.navigator?.userAgent ?? "",
    });
    if (!action)
        return false;
    const next = opts.next ?? `${loc.pathname}${loc.search}`;
    const secure = loc.protocol === "https:" ? "; Secure" : "";
    try {
        if (action === "probe") {
            doc.cookie = `cw-sso-probed=1; Path=/; SameSite=Lax${secure}`;
            if (!has(doc.cookie, "cw-sso-probed"))
                return false; // cookies blocked: never loop
            loc.assign(silentStartUrl(next));
        }
        else {
            doc.cookie = `cw-sso-seed=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
            if (has(doc.cookie, "cw-sso-seed"))
                return false;
            loc.assign(seedDoorUrl(next));
        }
    }
    catch {
        return false;
    }
    return true;
}
//# sourceMappingURL=ssoProbe.js.map