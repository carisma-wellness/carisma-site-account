/**
 * @carisma/site-account/ui — the account UI surface (WP-PKG-2).
 *
 * Pure, framework-agnostic pieces: the header AccountMark (server HTML + post-mount
 * state), the AccountPanel (view model + HTML), the /member door with its fallback,
 * the host hint readers, and the cross-brand link interceptor. The browser adapter
 * (hydrateAll) is the only DOM-touching code and imports no server module, so it ships
 * into a site's client bundle safely. All identity URLs come from ../urls.js.
 */
export {
  MEMBER_HREF,
  PANEL_HREF,
  ACCOUNT_MARK_ATTR,
  ACCOUNT_MARK_QC,
  accountMarkState,
  accountMarkServerHTML,
  accountMarkSignedInHTML,
} from "./accountMark.js";
export type { AccountMarkState, AccountMarkOptions } from "./accountMark.js";

export { HINT_SIGNED_IN, HINT_INITIALS, readSignedInHint, readInitialsHint } from "./hint.js";
export { GUEST_GLYPH_SVG, SIGNED_GLYPH_SVG, escapeHtml } from "./html.js";

export { memberDoor, memberFallbackHTML } from "./memberDoor.js";
export type { MemberDoorConfig, MemberDoorResult } from "./memberDoor.js";

export { buildPanelModel, accountPanelHTML } from "./panel.js";
export type { PanelModel, PanelVisit } from "./panel.js";

export { resolveBrandLink, installBrandLinkInterceptor } from "./linkInterceptor.js";
export type { BrandLinkInput, InterceptorOptions } from "./linkInterceptor.js";

export {
  hydrateAccountMark,
  hydrateAccountMarks,
  mountAccountPanel,
  hydrateAll,
  loadAccountMarkPhoto,
  accountMarkPhotoUrl,
} from "./browser.js";
export type { HydrateOptions, FetchLike, StorageLike } from "./browser.js";

export {
  AVATAR_CACHE_KEY,
  AVATAR_CACHE_TTL_MS,
  sanitizeAvatarUrl,
  avatarUrlFromSession,
  accountMarkPhotoHTML,
} from "./avatar.js";

export type { MinimalDocument, MinimalElement, MinimalAnchor, MinimalMouseEvent } from "./dom.js";

export {
  ssoProbeDecision,
  runSsoProbe,
  earlySsoProbeScript,
  isPaidLanding,
  SSO_PROBE_SKIP_PREFIXES,
  SSO_PAID_LANDING_PREFIXES,
  SSO_PROBE_TTL_SECONDS,
  PAID_CLICK_PARAM,
} from "./ssoProbe.js";
export type { SsoProbeTrigger, SsoProbeAction, SsoProbeEnv } from "./ssoProbe.js";
