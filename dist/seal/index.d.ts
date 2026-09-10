export declare const SEAL_KEY_ID = "k1";
export declare const SEAL_VERSION = "v1";
export interface SessionPlaintext {
    v: 1;
    sid: string;
    uid: string;
    at: string;
    atExp: number;
    rt: string;
    initials?: string;
    keep?: boolean;
    iat: number;
    [k: string]: unknown;
}
export interface UnsealKeys {
    primary: string;
    prev?: string;
}
/** Seal a payload under the primary secret. Always emits a `k1:` token. */
export declare function seal(payload: unknown, secret: string, rpId: string): string;
/**
 * Unseal a token. Returns the parsed payload, or `null` for anything that is not a
 * well-formed token that authenticates under one of the supplied secrets. A `null`
 * return is the ONLY signal: a garbage string, a truncated blob, a wrong-rpId AAD,
 * a tampered ciphertext and a wrong key are all indistinguishable and all rejected.
 */
export declare function unseal<T = SessionPlaintext>(token: string | undefined | null, keys: UnsealKeys, rpId: string): T | null;
//# sourceMappingURL=index.d.ts.map