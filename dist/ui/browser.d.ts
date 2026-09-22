import { type PortalView } from "./portal.js";
import type { MinimalDocument, MinimalElement } from "./dom.js";
/** The photo the marks are currently painted with (exported for tests/hosts). */
export declare function accountMarkPhotoUrl(): string | null;
/** Upgrade one guest chip to its signed-in appearance from the host cookie. */
export declare function hydrateAccountMark(el: MinimalElement, cookie: string): void;
/** Hydrate every account mark in the document from the current cookie. */
export declare function hydrateAccountMarks(doc: MinimalDocument): void;
/** The tiny slice of sessionStorage this uses; a host passes the real one. */
export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
/**
 * Put the member's own photo on the mark (CEO 2026-09-16).
 *
 * Only for a browser the hint cookie already calls signed in — a guest makes no
 * request, so the CloudFront-cached document stays free of member traffic (W-1). The
 * URL is read from the site's own `/api/auth/session`, cached per tab for
 * AVATAR_CACHE_TTL_MS so one photo costs one request however many pages are walked,
 * and every failure is silent: no photo simply means the initials chip, and nothing
 * here can sign anybody out (W-9).
 */
export declare function loadAccountMarkPhoto(doc: MinimalDocument, fetchImpl?: FetchLike, storage?: StorageLike | null): Promise<void>;
export interface FetchLike {
    (url: string, init?: {
        credentials?: string;
        method?: string;
        headers?: Record<string, string> | {
            get?(name: string): string | null;
        };
        body?: string;
        redirect?: string;
    }): Promise<{
        ok: boolean;
        status: number;
        json(): Promise<unknown>;
        headers?: {
            get(name: string): string | null;
        };
    }>;
}
export interface HydrateOptions {
    /** how the interceptor navigates (default: no-op; the bootstrap passes location) */
    navigate?: (url: string) => void;
    /** how the panel reads its one authenticated session (the bootstrap passes fetch) */
    fetchImpl?: FetchLike;
    /** id of the element the settled panel HTML is written into (default carisma-account-panel) */
    panelMountId?: string;
    /** where the member's photo URL is cached for the tab (the bootstrap passes sessionStorage) */
    storage?: StorageLike | null;
}
/**
 * Mount the panel: on a click of a signed-in mark, make the ONE authenticated read
 * and open the dialog. A failed read still opens the panel with Sign out (the CEO
 * must be able to leave) — it never signs anyone out by itself (W-9).
 */
export declare function mountAccountPanel(doc: MinimalDocument, opts?: HydrateOptions): void;
/**
 * Mount one account page.
 *
 * Three shapes of page, one mount:
 *   · `booking` — ONE booking, read from `/account/bookings/<id>`, with the
 *     server's capability block deciding every button;
 *   · a data section (wallet / payments / documents / membership) — the paths
 *     portalData names, rendered by the builder it names;
 *   · home / bookings / details — the original model-driven views.
 *
 * Nothing here decides what a member may do. That arrived with the appointment.
 */
export declare function mountAccountPortal(doc: MinimalDocument, opts?: HydrateOptions & {
    view?: PortalView;
    portalMountId?: string;
    path?: string;
}): void;
/** Wire everything the account UI needs after hydration. */
export declare function hydrateAll(doc: MinimalDocument, opts?: HydrateOptions): void;
//# sourceMappingURL=browser.d.ts.map