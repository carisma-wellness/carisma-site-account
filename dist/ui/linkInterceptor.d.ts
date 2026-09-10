import type { MinimalDocument } from "./dom.js";
export interface BrandLinkInput {
    /** the anchor's href (absolute cross-brand URL, or a relative same-site path) */
    href: string | null | undefined;
    /** the data-carisma-brand attribute value (present = a marked cross-brand link) */
    brand: string | null | undefined;
    /** is THIS site signed in (from the host hint cookie) */
    signedIn: boolean;
    /** anchor target="_blank" */
    targetBlank?: boolean;
    /** a modified click (middle/right button, or meta/ctrl/shift/alt held) */
    modified?: boolean;
    /** the event already had preventDefault called */
    defaultPrevented?: boolean;
}
/**
 * Returns the URL to navigate to instead, or null to let the browser proceed
 * untouched. Null on every guard: signed out, unmarked, modified, new-tab,
 * already-handled, unparseable, same-site-relative, or a Medical host.
 */
export declare function resolveBrandLink(input: BrandLinkInput): string | null;
export interface InterceptorOptions {
    getCookie: () => string;
    navigate: (url: string) => void;
}
/** Wire one capture-phase click listener that carries marked cross-brand links. */
export declare function installBrandLinkInterceptor(doc: MinimalDocument, opts: InterceptorOptions): () => void;
//# sourceMappingURL=linkInterceptor.d.ts.map