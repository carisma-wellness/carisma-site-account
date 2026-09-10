import type { MinimalDocument, MinimalElement } from "./dom.js";
/** Upgrade one guest chip to its signed-in appearance from the host cookie. */
export declare function hydrateAccountMark(el: MinimalElement, cookie: string): void;
/** Hydrate every account mark in the document from the current cookie. */
export declare function hydrateAccountMarks(doc: MinimalDocument): void;
export interface FetchLike {
    (url: string, init?: {
        credentials?: string;
    }): Promise<{
        ok: boolean;
        status: number;
        json(): Promise<unknown>;
    }>;
}
export interface HydrateOptions {
    /** how the interceptor navigates (default: no-op; the bootstrap passes location) */
    navigate?: (url: string) => void;
    /** how the panel reads its one authenticated session (the bootstrap passes fetch) */
    fetchImpl?: FetchLike;
    /** id of the element the settled panel HTML is written into (default carisma-account-panel) */
    panelMountId?: string;
}
/**
 * Mount the panel: on a click of a signed-in mark, make the ONE authenticated read and
 * render. Kept defensive — a failed read never signs anyone out (W-9): the panel simply
 * does not populate. The real cancel/reschedule estate lives on the hub.
 */
export declare function mountAccountPanel(doc: MinimalDocument, opts?: HydrateOptions): void;
/** Wire everything the account UI needs after hydration. */
export declare function hydrateAll(doc: MinimalDocument, opts?: HydrateOptions): void;
//# sourceMappingURL=browser.d.ts.map