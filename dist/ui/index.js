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
export { buildPanelModel, accountPanelHTML, ACCOUNT_HOME_HREF, ACCOUNT_BOOKINGS_HREF, ACCOUNT_DETAILS_HREF, PANEL_QC, } from "./panel.js";
export { buildPortalModel, accountPortalHTML, portalShellHTML, bookingDetailHref, PORTAL_QC, PORTAL_SECTIONS, sectionsFor, } from "./portal.js";
export { requestsFor, subjectFor, titleFor, ledeFor, bodyFor, bookingIdFromPath } from "./portalData.js";
export { buildBookingDetailModel, bookingDetailHTML, bookingViewParts, bookingSkeletonHTML, bookingPrimary, bookingTreatment, isActiveBooking, dueLabel, policyLead, rebookHref, readActions, statusLabel, BOOKING_DETAIL_QC, } from "./bookingDetail.js";
export { addDays, daysBetween, dateWords, instantWords, clockOf, buildDayStrip, timeOptions, dayPart, groupTimes, dialogFrameHTML, rescheduleSubline, dayChipsHTML, rescheduleTimesHTML, reviewBarHTML, rescheduleDialogHTML, packageBookDialogHTML, packageBookBarHTML, packageBookSubline, cancelTitle, cancelBodyHTML, cancelFootHTML, cancelDialogHTML, } from "./dialogs.js";
export { buildIcs, icsUtc, icsEscape, icsFold, icsFileName, icsLocation, stripVenuePrefix } from "./ics.js";
export { buildWalletModel, packageActions, venuesFor, bookableTreatments, walletHTML, buildStatementModel, statementHTML, buildDocumentsModel, documentsHTML, buildMembershipModel, membershipHTML, walletTotal, walletElsewhere, walletSources, documentTitle, monthOf, MEMBER_RECORDS_QC, buildReferModel, referHTML, referShareText, referFamily, } from "./records.js";
export { eur, longDate, timeOfDay, shortWhen, plainDate, whenRange, untilPhrase } from "./money.js";
export { venueLocalToUtcIso, venueDateString, buildSlotsModel, reschedulePickerHTML, RESCHEDULE_QC, } from "./reschedule.js";
export { confirmCall, cancelCall, cancellationPreviewCall, rescheduleCall, payBalanceCall, packagePayCall, packageBookCall, packagePayConfirmCall, packageReturnFrom, readCheckoutUrl, readBookedAppointmentId, packageBookFailureMessage, isTakenTimeRefusal, slotsCall, membershipCall, readCancellationPreview, cancelQuestion, cancelSummary, needsPreview, messageFromError, walletAvailabilityCall, walletPassCall, readWalletAvailability, } from "./portalActions.js";
export { extractAppointmentList, formatWhen, isMedicalAppointment } from "./appointments.js";
export { ACCOUNT_CHROME_CSS, ACCOUNT_CHROME_STYLE_ID } from "./chromeCss.js";
export { resolveBrandLink, installBrandLinkInterceptor } from "./linkInterceptor.js";
export { hydrateAccountMark, hydrateAccountMarks, mountAccountPanel, mountAccountPortal, hydrateAll, loadAccountMarkPhoto, accountMarkPhotoUrl, paymentReturnNote, } from "./browser.js";
export { AVATAR_CACHE_KEY, AVATAR_CACHE_TTL_MS, sanitizeAvatarUrl, avatarUrlFromSession, accountMarkPhotoHTML, } from "./avatar.js";
export { ssoProbeDecision, runSsoProbe, earlySsoProbeScript, isPaidLanding, SSO_PROBE_SKIP_PREFIXES, SSO_PAID_LANDING_PREFIXES, SSO_PROBE_TTL_SECONDS, PAID_CLICK_PARAM, } from "./ssoProbe.js";
//# sourceMappingURL=index.js.map