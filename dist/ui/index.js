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
export { buildPanelModel, accountPanelHTML, ACCOUNT_HOME_HREF, ACCOUNT_BOOKINGS_HREF, ACCOUNT_DETAILS_HREF, PANEL_QC, PANEL_SESSION_URL, PANEL_SESSION_URL_CIRCLE, 
// ADDENDUM KIT-1: board 11's account rows under her Circle Card.
panelCircleRowsHTML, panelRewardsSubText, } from "./panel.js";
// Carisma Circle v2 (carisma-circle-v2-20261117): the model, the words and the HTML; the jewel lives in `./jewel`.
export { CIRCLE_V2_QC, CIRCLE_QC, CIRCLE_HREF, CIRCLE_TERMS_HREF, CENTS_PER_POINT, PROMISE_QUALIFIER, REVIEWS_FOOTNOTE, EARN_TERMS_LINE, ON_HOLD_TEXT, PAY_STEP_DISCLOSURE, CONDITIONS_EARNED, 
// ADDENDUM X8 / X11: the design's no-break spaces, the Terms joiner, the figure pair, the short credit moment.
NB, TERMS_JOIN, nbWords, creditPointsText, ENDING_SOON_DAYS, maltaDaysUntil, 
// ADDENDUM BE-c / BE-j / BE-k readers and the member line (KIT-2), the chip's spoken label.
levelOnItsWayFrom, referralFrom, rebookNextFrom, circleOnItsWayText, circleMemberLineText, circleMemberLineHTML, circleChipLabel, rewardPriceText, circleAllowedOn, 
// ADDENDUM X2 / BE-i: which level perks are switched on.
PERKS_NOT_LIVE, perksLiveFrom, readCircle, readCircleState, readCircleLeft, readCircleSummary, readCircleSummaryState, readCircleStatus, readCircleActivity, readCircleRewards, readCirclePerks, circleSummaryOf, creditText, pointsText, pointsEuroText, wholeEuroUp, wholeEuroDown, rateText, memberRate, brandsLine, conditionsText, readingText, levelSentenceText, endsText, datedText, expiringText, countWord, maltaDayWeek, pausedText, minorText, ageLineText, gainText, onTheWayText, paidWithPointsText, earnsText, actionText, rejoinNoteText, signInLineText, maltaDayShort, maltaDayLong, maltaWhen, termsLinkHTML, withTermsHTML, asGemKey, circleMarkSVG, jewelSlotHTML, progressFraction, CIRCLE_GEM_KEYS, circleTrackHTML, paidLineText, unlocksList, benefitsList, unlockLineText, nextPerksOf, ownPerksOf, circleWaysHTML, circleWaysCardsHTML, instagramLinkHTML, actionValueText, waysSummaryText, circlePerksHTML, spaDaysText, circleRewardsHTML, circleNowRowHTML, nextRewardText, rewardGroups, rewardTitle, circleChipHTML, circlePanelRowHTML, circlePanelStateHTML, circlePanelMinorHTML, circleHeroHTML, circleLadderHTML, circleOverviewHTML, circleOverviewMinorHTML, circleWalletLineHTML, 
// Circle v2 (ADDENDUM KIT-4): the Circle card in Apple / Google Wallet.
circleWalletPlatform, readCircleWalletAvailability, circleCardBlockHTML, CIRCLE_CARD_LINE, circleActivityHTML, circleActivityRowsHTML, circleViewHTML, circleMinorViewHTML, creditMoment, earnPoints, 
// W3 (loyaltyCircleW31115): a member who left, Leave Carisma Circle, Offers and reminders.
readRejoined, leftText, REJOIN_NOTE, REJOIN_LABEL, circlePanelLeftHTML, circleOverviewLeftHTML, circleLeftViewHTML, readLeavePreview, leaveSheetBodyHTML, leaveSheetFootHTML, OFFERS_EMAIL_SENTENCE, OFFERS_WHATSAPP_SENTENCE, readCirclePrefs, offersState, offersErrorText, offersSavedText, circlePrefsHTML, circlePrefsSlotHTML, } from "./circle.js";
// W4 (loyaltyCircleW41115): the member's Circle profile in Details (backend B4).
export { COMFORT_KEYS, COMFORT_LABELS, MONTHS, WHATSAPP_UPDATES_SENTENCE, readCircleComfort, readCircleBirthday, readCircleWhatsapp, birthdayText, calendarDayText, profileErrorText, profileMissingText, comfortHTML, birthdayHTML, whatsappUpdatesHTML, circleDetailsHTML, profileSectionHTML, profileMissingInDetails, } from "./circleProfile.js";
export { buildPortalModel, accountPortalHTML, portalShellHTML, bookingDetailHref, PORTAL_QC, PORTAL_SECTIONS, sectionsFor, } from "./portal.js";
export { requestsFor, subjectFor, titleFor, ledeFor, bodyFor, bookingIdFromPath } from "./portalData.js";
export { buildBookingDetailModel, bookingDetailHTML, bookingViewParts, bookingSkeletonHTML, bookingPrimary, bookingTreatment, isActiveBooking, dueLabel, policyLead, rebookHref, readActions, statusLabel, BOOKING_DETAIL_QC, } from "./bookingDetail.js";
export { addDays, daysBetween, dateWords, instantWords, clockOf, buildDayStrip, timeOptions, dayPart, groupTimes, dialogFrameHTML, rescheduleSubline, dayChipsHTML, rescheduleTimesHTML, reviewBarHTML, rescheduleDialogHTML, packageBookDialogHTML, packageBookBarHTML, packageBookSubline, cancelTitle, cancelBodyHTML, cancelFootHTML, cancelDialogHTML, } from "./dialogs.js";
export { buildIcs, icsUtc, icsEscape, icsFold, icsFileName, icsLocation, stripVenuePrefix } from "./ics.js";
export { buildWalletModel, packageActions, venuesFor, bookableTreatments, walletHTML, buildStatementModel, statementHTML, statementPayTarget, buildDocumentsModel, documentsHTML, buildMembershipModel, membershipHTML, walletTotal, walletElsewhere, walletSources, documentTitle, monthOf, MEMBER_RECORDS_QC, buildReferModel, referHTML, referShareText, referFamily, } from "./records.js";
export { eur, longDate, timeOfDay, shortWhen, plainDate, whenRange, untilPhrase } from "./money.js";
export { venueLocalToUtcIso, venueDateString, buildSlotsModel, reschedulePickerHTML, RESCHEDULE_QC, } from "./reschedule.js";
export { confirmCall, cancelCall, cancellationPreviewCall, rescheduleCall, payBalanceCall, packagePayCall, packageBookCall, packagePayConfirmCall, packageReturnFrom, invoicePayCall, invoicePayConfirmCall, invoiceReturnFrom, statementPayFailureMessage, readCheckoutUrl, readBookedAppointmentId, packageBookFailureMessage, isTakenTimeRefusal, slotsCall, membershipCall, circleLeavePreviewCall, circleLeaveCall, circleRejoinCall, circleOffersCall, circleComfortReadCall, circleBirthdayReadCall, circleWhatsappReadCall, circleComfortCall, circleBirthdayCall, circleWhatsappCall, readCancellationPreview, cancelQuestion, cancelSummary, needsPreview, messageFromError, walletAvailabilityCall, walletPassCall, readWalletAvailability, circleWalletCardCall, circlePointsBookingsCall, POINTS_NOT_CHECKED, POINTS_NOT_READ, } from "./portalActions.js";
// Circle v2: what cancelling does to the points (or free Spa day) that paid a booking (BE-2 points-bookings).
export { readPointsBookings, pointsCancelLine, circleSaysOff, POINTS_CANCEL_UNKNOWN, POINTS_CANCEL_NOT_READ } from "./circlePointsCancel.js";
export { extractAppointmentList, formatWhen, isMedicalAppointment } from "./appointments.js";
export { ACCOUNT_CHROME_CSS, ACCOUNT_CHROME_STYLE_ID } from "./chromeCss.js";
// Circle v2: the parts CSS under any scope, so a site's own Circle blocks (pay step, thank-you, programme page) draw
// the same parts as the account (token-only; the tokens arrive with ACCOUNT_CHROME_CSS or the site's own sheet).
export { circlePartsCSS } from "./styles/circle.js";
export { resolveBrandLink, installBrandLinkInterceptor } from "./linkInterceptor.js";
export { hydrateAccountMark, hydrateAccountMarks, mountAccountPanel, mountAccountPortal, hydrateAll, loadAccountMarkPhoto, accountMarkPhotoUrl, paymentReturnNote, 
// ADDENDUM KIT-6: the clinic host options' two readers.
circleOnFor, circlePlacesOf, } from "./browser.js";
export { AVATAR_CACHE_KEY, AVATAR_CACHE_TTL_MS, sanitizeAvatarUrl, avatarUrlFromSession, accountMarkPhotoHTML, } from "./avatar.js";
export { ssoProbeDecision, runSsoProbe, earlySsoProbeScript, isPaidLanding, SSO_PROBE_SKIP_PREFIXES, SSO_PAID_LANDING_PREFIXES, SSO_PROBE_TTL_SECONDS, PAID_CLICK_PARAM, } from "./ssoProbe.js";
//# sourceMappingURL=index.js.map