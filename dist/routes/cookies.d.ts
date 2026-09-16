/**
 * Cookie names and (de)serialisation for the brand-site BFF.
 *
 * cw_session  httpOnly sealed session (the seal module)                Path=/
 * cw_txn      httpOnly sealed authorize transaction                    Path=/api/auth
 * cw-signed-in / cw-initials  readable hints the header reads post-mount  Path=/
 * cw-known       readable, 180 days: "this browser has signed in on THIS brand before".
 *                One bit, no identity. It is what lets a returner be checked on page
 *                load while cold (ad) traffic is never redirected anywhere.
 * cw-sso-probed  readable, browser-session: a silent check already ran here. Stops a loop.
 * cw-sso-seed    readable, session-length: signed in HERE by the in-pop-up door, and the
 *                identity origin has not been told yet. One attempt, then it is gone.
 * cw-sso-off     readable, 30 days: the person signed out on this brand. No silent check
 *                may sign them straight back in until they sign in again themselves.
 *
 * Every cookie is host-only (no Domain — see WP-MED-1's host-only requirement),
 * SameSite=Lax, and Secure UNLESS cookieSecure is false (local http origins cannot
 * receive a Secure cookie, so local bring-up sets it false; production leaves it on).
 */
export declare const COOKIES: {
    readonly session: "cw_session";
    readonly txn: "cw_txn";
    readonly hintSignedIn: "cw-signed-in";
    readonly hintInitials: "cw-initials";
    readonly known: "cw-known";
    readonly ssoProbed: "cw-sso-probed";
    readonly ssoSeed: "cw-sso-seed";
    readonly ssoOff: "cw-sso-off";
};
export declare const THIRTY_DAYS_SECONDS: number;
export declare const KNOWN_MAX_AGE_SECONDS: number;
export interface CookieOptions {
    path?: string;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Lax" | "Strict" | "None";
}
/** Parse the request Cookie header into a map. Last value wins on a duplicate name. */
export declare function parseCookies(req: Request): Record<string, string>;
export declare function serializeCookie(name: string, value: string, opts?: CookieOptions): string;
/** A cookie that expires immediately (Max-Age=0). Used to clear on 401 / logout. */
export declare function clearCookie(name: string, opts?: CookieOptions): string;
/**
 * The extra Set-Cookie values a site must write when it establishes a session
 * WITHOUT the identity origin (the in-pop-up sign-in): cw-known (so this browser is
 * checked on its next visit), cw-sso-seed (so the next page tells the identity origin
 * once, and the other brands can find the session), and a cleared cw-sso-off.
 */
export declare function inlineSessionCookies(opts: {
    secure: boolean;
    keep: boolean;
}): string[];
//# sourceMappingURL=cookies.d.ts.map