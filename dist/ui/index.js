/**
 * @carisma/site-account/ui — the account UI surface (WP-PKG-2).
 *
 * Pure, framework-agnostic pieces: the header AccountMark (server HTML + post-mount
 * state), the AccountPanel (view model + HTML), the /member door with its fallback,
 * the host hint readers, and the cross-brand link interceptor. The browser adapter
 * (hydrateAll) is the only DOM-touching code and imports no server module, so it ships
 * into a site's client bundle safely. All identity URLs come from ../urls.js.
 */
export { MEMBER_HREF, PANEL_HREF, ACCOUNT_MARK_ATTR, ACCOUNT_MARK_QC, accountMarkState, accountMarkServerHTML, accountMarkSignedInHTML, } from "./accountMark.js";
export { HINT_SIGNED_IN, HINT_INITIALS, readSignedInHint, readInitialsHint } from "./hint.js";
export { GUEST_GLYPH_SVG, SIGNED_GLYPH_SVG, escapeHtml } from "./html.js";
export { memberDoor, memberFallbackHTML } from "./memberDoor.js";
export { buildPanelModel, accountPanelHTML } from "./panel.js";
export { resolveBrandLink, installBrandLinkInterceptor } from "./linkInterceptor.js";
export { hydrateAccountMark, hydrateAccountMarks, mountAccountPanel, hydrateAll } from "./browser.js";
//# sourceMappingURL=index.js.map