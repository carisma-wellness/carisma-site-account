/**
 * Minimal structural DOM interfaces so this package stays dependency-free and needs
 * neither the TypeScript "DOM" lib (which collides with @types/node's fetch/Response)
 * nor React. The browser entry (browser.ts) is handed the real `document` by the
 * site's untyped bootstrap; it only ever touches the members declared here, which the
 * real DOM satisfies structurally. Tests pass a tiny fake object with the same shape.
 */
export interface MinimalElement {
    innerHTML: string;
    setAttribute(name: string, value: string): void;
    getAttribute(name: string): string | null;
    closest?(selector: string): MinimalElement | null;
}
export interface MinimalAnchor extends MinimalElement {
    /** anchors carry target="_blank" for new-tab links, which the interceptor skips */
    getAttribute(name: string): string | null;
}
export interface MinimalMouseEvent {
    defaultPrevented: boolean;
    button: number;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    target: MinimalElement | null;
    preventDefault(): void;
    stopPropagation(): void;
}
export interface MinimalDocument {
    cookie: string;
    addEventListener(type: string, handler: (e: MinimalMouseEvent) => void, capture?: boolean): void;
    querySelectorAll(selector: string): ArrayLike<MinimalElement>;
    getElementById(id: string): MinimalElement | null;
}
//# sourceMappingURL=dom.d.ts.map