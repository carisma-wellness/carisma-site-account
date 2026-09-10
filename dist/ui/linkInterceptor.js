/**
 * The cross-brand link interceptor (ADR invariant 31, design 13.2).
 *
 * A signed-in person who clicks a Carisma link that is marked `data-carisma-brand`
 * is carried to that brand silently, because the click is their own presence act.
 * The rewrite target is the OTHER brand's own /api/auth/start?next=<path>, built in
 * urls.ts. Two hard rules:
 *   - a COLD arrival (signed out on this site) is never rewritten — no site is probed
 *     without a click (W-3);
 *   - a Medical host is NEVER rewritten, whatever the attributes say (W-24).
 *
 * The decision is a pure function (resolveBrandLink) so it is fully unit-testable;
 * installBrandLinkInterceptor wires it as one capture-phase listener, the same style
 * as spa BookingLauncher.tsx:253-296@87e2670 (capture phase so it beats Next's client
 * navigation; new-tab / modified / already-handled clicks fall through to the browser).
 */
import { brandStartUrl } from "../urls.js";
import { readSignedInHint } from "./hint.js";
/** Any host under carismamedical.com (apex or subdomain). Never carried. */
const MEDICAL_HOST_RE = /(^|\.)carismamedical\.com$/i;
/**
 * Returns the URL to navigate to instead, or null to let the browser proceed
 * untouched. Null on every guard: signed out, unmarked, modified, new-tab,
 * already-handled, unparseable, same-site-relative, or a Medical host.
 */
export function resolveBrandLink(input) {
    if (!input.signedIn)
        return null;
    if (input.defaultPrevented || input.modified || input.targetBlank)
        return null;
    if (!input.brand)
        return null;
    if (typeof input.href !== "string" || input.href.length === 0)
        return null;
    let url;
    try {
        url = new URL(input.href, "https://carisma-same-site.invalid");
    }
    catch {
        return null;
    }
    // Relative / same-site links resolve against the placeholder and need no carrying.
    if (url.hostname === "carisma-same-site.invalid")
        return null;
    // A Medical host is never rewritten, regardless of data-carisma-brand.
    if (MEDICAL_HOST_RE.test(url.hostname))
        return null;
    const next = `${url.pathname}${url.search}` || "/";
    return brandStartUrl(url.origin, next);
}
/** Wire one capture-phase click listener that carries marked cross-brand links. */
export function installBrandLinkInterceptor(doc, opts) {
    const onClick = (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
        }
        const target = e.target;
        const anchor = target && typeof target.closest === "function"
            ? target.closest("a[data-carisma-brand]")
            : null;
        if (!anchor)
            return;
        const rewritten = resolveBrandLink({
            href: anchor.getAttribute("href"),
            brand: anchor.getAttribute("data-carisma-brand"),
            signedIn: readSignedInHint(opts.getCookie()),
            targetBlank: anchor.getAttribute("target") === "_blank",
            modified: false,
            defaultPrevented: false,
        });
        if (!rewritten)
            return;
        e.preventDefault();
        e.stopPropagation();
        opts.navigate(rewritten);
    };
    doc.addEventListener("click", onClick, true);
    return () => {
        // best-effort teardown; browsers expose removeEventListener with the same shape
        const anyDoc = doc;
        anyDoc.removeEventListener?.("click", onClick, true);
    };
}
//# sourceMappingURL=linkInterceptor.js.map