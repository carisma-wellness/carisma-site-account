/**
 * The browser entry — the only UI code that touches the DOM. It is handed the real
 * `document` (and fetch/navigate seams) by the site's untyped bootstrap, and it uses
 * only the structural members declared in dom.ts, so the package needs neither the
 * TypeScript "DOM" lib nor React. Every function here is a thin adapter over the pure
 * modules (accountMark, panel, linkInterceptor); the decisions live there and are
 * unit-tested without a DOM.
 *
 * This module imports NO server code (no seal, no node:crypto), so it is safe to ship
 * into the site's client bundle — which is where `cw-signed-in` must appear (WP-SPA-1a
 * chunk grep). It runs after hydration, reads the host hint cookie, and upgrades the
 * byte-identical guest chip to the signed-in chip (W-1: the server HTML never branched).
 */
import { accountMarkSignedInHTML, accountMarkState, ACCOUNT_MARK_ATTR } from "./accountMark.js";
import { buildPanelModel, accountPanelHTML } from "./panel.js";
import { installBrandLinkInterceptor } from "./linkInterceptor.js";
/** Upgrade one guest chip to its signed-in appearance from the host cookie. */
export function hydrateAccountMark(el, cookie) {
    const st = accountMarkState(cookie);
    // Signed out is a legitimate final state — the guest glyph the server already
    // rendered. Nothing changes, so there is no re-render and no flash (4.1 / W-1).
    if (!st.signedIn)
        return;
    el.setAttribute("data-cw-session", "in");
    el.setAttribute("aria-label", st.ariaLabel);
    el.setAttribute("href", st.href);
    if (st.initials)
        el.setAttribute("data-cw-initials", st.initials);
    el.innerHTML = accountMarkSignedInHTML(st.initials);
}
/** Hydrate every account mark in the document from the current cookie. */
export function hydrateAccountMarks(doc) {
    const cookie = doc.cookie || "";
    const marks = doc.querySelectorAll(`[${ACCOUNT_MARK_ATTR}]`);
    for (let i = 0; i < marks.length; i++)
        hydrateAccountMark(marks[i], cookie);
}
/**
 * Mount the panel: on a click of a signed-in mark, make the ONE authenticated read and
 * render. Kept defensive — a failed read never signs anyone out (W-9): the panel simply
 * does not populate. The real cancel/reschedule estate lives on the hub.
 */
export function mountAccountPanel(doc, opts = {}) {
    const fetchImpl = opts.fetchImpl;
    if (!fetchImpl)
        return;
    const mountId = opts.panelMountId || "carisma-account-panel";
    doc.addEventListener("click", (e) => {
        const t = e.target;
        const mark = t && typeof t.closest === "function" ? t.closest(`[${ACCOUNT_MARK_ATTR}]`) : null;
        if (!mark || mark.getAttribute("data-cw-session") !== "in")
            return;
        e.preventDefault();
        const mount = doc.getElementById(mountId);
        if (!mount)
            return;
        fetchImpl("/api/auth/session?include=upcoming", { credentials: "same-origin" })
            .then((r) => (r.ok ? r.json() : null))
            .then((body) => {
            if (!body)
                return;
            mount.innerHTML = accountPanelHTML(buildPanelModel(body));
        })
            .catch(() => {
            /* W-9: a failure never signs anyone out and never throws into the page */
        });
    }, false);
}
/** Wire everything the account UI needs after hydration. */
export function hydrateAll(doc, opts = {}) {
    hydrateAccountMarks(doc);
    installBrandLinkInterceptor(doc, {
        getCookie: () => doc.cookie || "",
        navigate: opts.navigate || (() => { }),
    });
    mountAccountPanel(doc, opts);
}
//# sourceMappingURL=browser.js.map