/**
 * Minimal structural DOM interfaces so this package stays dependency-free and needs
 * neither the TypeScript "DOM" lib (which collides with @types/node's fetch/Response)
 * nor React. The browser entry (browser.ts) is handed the real `document` by the
 * site's untyped bootstrap; it only ever touches the members declared here, which the
 * real DOM satisfies structurally. Tests pass a tiny fake object with the same shape.
 */
export {};
//# sourceMappingURL=dom.js.map