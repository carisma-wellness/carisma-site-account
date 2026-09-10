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
export declare const COOKIES: {
    readonly session: "cw_session";
    readonly txn: "cw_txn";
    readonly hintSignedIn: "cw-signed-in";
    readonly hintInitials: "cw-initials";
};
export declare const THIRTY_DAYS_SECONDS: number;
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
//# sourceMappingURL=cookies.d.ts.map