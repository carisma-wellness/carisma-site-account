/**
 * Cookie names and (de)serialisation for the brand-site BFF.
 *
 * cw_session  httpOnly sealed session (the seal module)                Path=/
 * cw_txn      httpOnly sealed authorize transaction                    Path=/api/auth
 * cw-signed-in / cw-initials  readable hints the header reads post-mount  Path=/
 *
 * Every cookie is host-only (no Domain — see WP-MED-1's host-only requirement),
 * SameSite=Lax, and Secure UNLESS cookieSecure is false (local http origins cannot
 * receive a Secure cookie, so local bring-up sets it false; production leaves it on).
 */
export const COOKIES = {
    session: "cw_session",
    txn: "cw_txn",
    hintSignedIn: "cw-signed-in",
    hintInitials: "cw-initials",
};
export const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
/** Parse the request Cookie header into a map. Last value wins on a duplicate name. */
export function parseCookies(req) {
    const raw = req.headers.get("cookie") || "";
    const out = {};
    for (const part of raw.split(";")) {
        const i = part.indexOf("=");
        if (i < 0)
            continue;
        const k = part.slice(0, i).trim();
        if (!k)
            continue;
        const v = part.slice(i + 1).trim();
        try {
            out[k] = decodeURIComponent(v);
        }
        catch {
            out[k] = v;
        }
    }
    return out;
}
export function serializeCookie(name, value, opts = {}) {
    const segs = [`${name}=${encodeURIComponent(value)}`];
    segs.push(`Path=${opts.path ?? "/"}`);
    if (typeof opts.maxAge === "number")
        segs.push(`Max-Age=${Math.floor(opts.maxAge)}`);
    segs.push(`SameSite=${opts.sameSite ?? "Lax"}`);
    if (opts.httpOnly !== false)
        segs.push("HttpOnly");
    if (opts.secure !== false)
        segs.push("Secure");
    return segs.join("; ");
}
/** A cookie that expires immediately (Max-Age=0). Used to clear on 401 / logout. */
export function clearCookie(name, opts = {}) {
    return serializeCookie(name, "", { ...opts, maxAge: 0 });
}
//# sourceMappingURL=cookies.js.map