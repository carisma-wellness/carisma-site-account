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
export type { AccountMarkState, AccountMarkOptions } from "./accountMark.js";
export { HINT_SIGNED_IN, HINT_INITIALS, readSignedInHint, readInitialsHint } from "./hint.js";
export { GUEST_GLYPH_SVG, SIGNED_GLYPH_SVG, escapeHtml } from "./html.js";
export { memberDoor, memberFallbackHTML } from "./memberDoor.js";
export type { MemberDoorConfig, MemberDoorResult } from "./memberDoor.js";
export { buildPanelModel, accountPanelHTML, ACCOUNT_HOME_HREF, ACCOUNT_BOOKINGS_HREF, ACCOUNT_DETAILS_HREF, PANEL_QC, } from "./panel.js";
export type { PanelModel, PanelVisit } from "./panel.js";
export { buildPortalModel, accountPortalHTML, portalShellHTML, bookingDetailHref, PORTAL_QC, PORTAL_SECTIONS, } from "./portal.js";
export type { PortalModel, PortalView } from "./portal.js";
export { requestsFor, titleFor, ledeFor, bodyFor, bookingIdFromPath } from "./portalData.js";
export { buildBookingDetailModel, bookingDetailHTML, readActions, statusLabel, BOOKING_DETAIL_QC, } from "./bookingDetail.js";
export type { BookingDetailModel, BookingActions, BookingServiceLine } from "./bookingDetail.js";
export { buildWalletModel, walletHTML, buildStatementModel, statementHTML, buildDocumentsModel, documentsHTML, buildMembershipModel, membershipHTML, walletTotal, walletSources, documentTitle, monthOf, MEMBER_RECORDS_QC, } from "./records.js";
export type { WalletModel, StatementModel, MembershipModel, DocumentView, GiftCardView, PackageView, StatementLineView, RecordsContext, } from "./records.js";
export { eur, longDate, timeOfDay, shortWhen, plainDate, whenRange, untilPhrase } from "./money.js";
export { venueLocalToUtcIso, venueDateString, buildSlotsModel, reschedulePickerHTML, RESCHEDULE_QC, } from "./reschedule.js";
export type { SlotsModel, SlotView } from "./reschedule.js";
export { confirmCall, cancelCall, cancellationPreviewCall, rescheduleCall, payBalanceCall, slotsCall, membershipCall, readCancellationPreview, cancelQuestion, needsPreview, messageFromError, } from "./portalActions.js";
export type { ProxyCall, CancellationPreview, PortalActionName } from "./portalActions.js";
export { extractAppointmentList, formatWhen, isMedicalAppointment } from "./appointments.js";
export { ACCOUNT_CHROME_CSS, ACCOUNT_CHROME_STYLE_ID } from "./chromeCss.js";
export { resolveBrandLink, installBrandLinkInterceptor } from "./linkInterceptor.js";
export type { BrandLinkInput, InterceptorOptions } from "./linkInterceptor.js";
export { hydrateAccountMark, hydrateAccountMarks, mountAccountPanel, mountAccountPortal, hydrateAll, loadAccountMarkPhoto, accountMarkPhotoUrl, paymentReturnNote, } from "./browser.js";
export type { HydrateOptions, FetchLike, StorageLike } from "./browser.js";
export { AVATAR_CACHE_KEY, AVATAR_CACHE_TTL_MS, sanitizeAvatarUrl, avatarUrlFromSession, accountMarkPhotoHTML, } from "./avatar.js";
export type { MinimalDocument, MinimalElement, MinimalAnchor, MinimalMouseEvent } from "./dom.js";
export { ssoProbeDecision, runSsoProbe, earlySsoProbeScript, isPaidLanding, SSO_PROBE_SKIP_PREFIXES, SSO_PAID_LANDING_PREFIXES, SSO_PROBE_TTL_SECONDS, PAID_CLICK_PARAM, } from "./ssoProbe.js";
export type { SsoProbeTrigger, SsoProbeAction, SsoProbeEnv } from "./ssoProbe.js";
//# sourceMappingURL=index.d.ts.map