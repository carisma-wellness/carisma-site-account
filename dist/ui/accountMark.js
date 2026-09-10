/**
 * The header account mark — three states, one DOM box, no layout shift (4.1).
 *
 * THE CLOUDFRONT RULE (W-1). accountMarkServerHTML() is what a brand site renders on
 * the server. It is the guest silhouette for EVERY visitor — it does not read a
 * cookie, so the page HTML is byte-identical signed in or out and CloudFront can
 * cache one document for a year. The signed-in appearance is produced AFTER hydration
 * from the host hint cookie (accountMarkState → hydrateAccountMark in browser.ts):
 * React flushes the effect after paint, so a member genuinely sees the guest glyph
 * for the hydration window and then the chip. That is the accepted cost of W-1, the
 * same behaviour that already ships on carismamedical.com.
 */
import { readInitialsHint, readSignedInHint } from "./hint.js";
import { GUEST_GLYPH_SVG, SIGNED_GLYPH_SVG, escapeHtml } from "./html.js";
export const MEMBER_HREF = "/member";
export const PANEL_HREF = "#account-panel";
/** The hydration hook + the QC stamp the boundary/QC scripts and tests look for. */
export const ACCOUNT_MARK_ATTR = "data-carisma-account-mark";
export const ACCOUNT_MARK_QC = "account-mark-20260908";
/** The post-mount decision, derived from the host cookie alone. */
export function accountMarkState(cookie) {
    const signedIn = readSignedInHint(cookie);
    const initials = signedIn ? readInitialsHint(cookie) : "";
    return {
        signedIn,
        initials,
        href: signedIn ? PANEL_HREF : MEMBER_HREF,
        ariaLabel: signedIn ? "Your account" : "Account",
        session: signedIn ? "in" : "out",
    };
}
/**
 * The byte-identical server markup — always the guest state. This is the only HTML
 * CloudFront ever holds for the mark, so it must never branch on a cookie.
 */
export function accountMarkServerHTML(opts = {}) {
    const cls = ["carisma-account-mark", opts.className].filter(Boolean).join(" ");
    const label = opts.label
        ? `<span class="carisma-account-mark__label">${escapeHtml(opts.label)}</span>`
        : "";
    return (`<a class="${escapeHtml(cls)}" ${ACCOUNT_MARK_ATTR} data-cw-nav="account" ` +
        `data-cw-session="out" data-cw-qc="${ACCOUNT_MARK_QC}" href="${MEMBER_HREF}" ` +
        `aria-label="Account">${GUEST_GLYPH_SVG}${label}</a>`);
}
/**
 * The inner markup for the signed-in chip, swapped in during hydration. The initials
 * carry data-clarity-mask="True" (W-25): Microsoft Clarity records this DOM with no
 * consent gate, and a rendered name is neither a number nor an address, so it is not
 * masked by Clarity's default mode.
 */
export function accountMarkSignedInHTML(initials) {
    const ini = /^[A-Za-z]{1,2}$/.test(initials) ? initials.toUpperCase() : "";
    if (!ini)
        return SIGNED_GLYPH_SVG;
    return (`<span class="carisma-account-mark__initials" data-clarity-mask="True" ` +
        `aria-hidden="true">${ini}</span>`);
}
//# sourceMappingURL=accountMark.js.map