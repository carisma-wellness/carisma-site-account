/**
 * The member's own profile photo in the header mark (CEO 2026-09-16).
 *
 * The photo is whatever CarismaSoft holds on the client record — the one the customer
 * uploaded in the Customer App, or the Google account picture the backend stores on a
 * first social sign-in when they have none. It reaches the browser ONLY through the
 * site's own `/api/auth/session`, which reads `/profile` server-side with the sealed
 * access token; no photo URL is ever put in a cookie (W-2 keeps the hints to
 * cw-signed-in + cw-initials, and a presigned S3 URL would rot inside a long-lived one).
 *
 * The initials chip stays the paint of record: it renders first, the photo is layered
 * over it when (and only when) a well-formed https URL arrives, and a broken image
 * falls straight back to the initials underneath. That keeps the mark one fixed box —
 * no layout shift, nothing to hydrate twice (4.1 / W-1).
 */
import { escapeHtml } from "./html.js";
/** Cache TTL for a fetched photo URL. Shorter than the backend's 1h presigned expiry. */
export const AVATAR_CACHE_TTL_MS = 30 * 60 * 1000;
/** sessionStorage key. Per tab, per origin: it holds a URL, never a token. */
export const AVATAR_CACHE_KEY = "cw-avatar";
/**
 * Accept only an absolute https URL. Anything else — `javascript:`, `data:`, a relative
 * path, a hostile string — is treated as absent, so a compromised upstream field can
 * paint no markup and fetch nothing. The length cap keeps a pathological presigned URL
 * out of storage.
 */
export function sanitizeAvatarUrl(raw) {
    if (typeof raw !== "string")
        return null;
    const url = raw.trim();
    if (!url || url.length > 2000)
        return null;
    if (!/^https:\/\/[^\s"'<>]+$/i.test(url))
        return null;
    return url;
}
/** Read `profile.avatarUrl` (or a raw `profilePicture`) out of a session/profile body. */
export function avatarUrlFromSession(body) {
    if (!body || typeof body !== "object")
        return null;
    const b = body;
    const profile = (b.profile && typeof b.profile === "object" ? b.profile : b);
    return sanitizeAvatarUrl(profile.avatarUrl ?? profile.profilePicture);
}
/**
 * The <img> layered over the initials. `data-clarity-mask` for the same reason the
 * initials carry it (W-25): Clarity records this DOM with no consent gate and a face is
 * the most personal thing on the page. `onerror` removes the node, revealing the chip.
 */
export function accountMarkPhotoHTML(url) {
    return (`<img class="carisma-account-mark__photo" data-carisma-account-photo ` +
        `data-clarity-mask="True" alt="" aria-hidden="true" referrerpolicy="no-referrer" ` +
        `src="${escapeHtml(url)}" onerror="this.remove()">`);
}
//# sourceMappingURL=avatar.js.map