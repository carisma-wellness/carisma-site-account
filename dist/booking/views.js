/**
 * src/booking/views.ts — the three Step 3 screens as framework-agnostic HTML.
 *
 * Same discipline as ui/panel.ts: string builders, no React, every personal
 * string carries the recorder mask (W-25), every identity href comes from
 * ../urls.ts (never assembled here, so verify-account-boundary.mjs stays green),
 * and the container carries the QC marker the deploy-verify grep looks for
 * (section 14: `step3-account-20260908`, chunk-only — a signed-in Step-3 branch
 * never appears in server HTML by design).
 *
 * State A  the three doors (signed out, ACCOUNT_LOGIN on)
 * State B  the member confirm card (signed in)
 * guest    today's DetailsStep — the SITE owns the form fields; this file only
 *          supplies the corrected marketing tick (unticked, brand-named, 8.6)
 */
import { escapeHtml } from "../ui/html.js";
import { startUrl } from "../urls.js";
/** The QC marker on the Step 3 container (14.2). Chunk-only, never in HTML. */
export const STEP3_QC = "step3-account-20260908";
const M = 'data-clarity-mask="True"';
/** Data attributes the site's browser wiring binds its dispatches to. */
export const STEP3_ATTR = {
    account: "data-carisma-continue-account",
    create: "data-carisma-create-account",
    guest: "data-carisma-book-as-guest",
    memberContinue: "data-carisma-member-continue",
    editDetails: "data-carisma-edit-details",
    signOutLocal: "data-carisma-signout-local",
};
/**
 * State A. The door SET and COPY are fixed by ADR invariant 27; the primary tap
 * carries prompt=login and the secondary prompt=create, and neither ever carries
 * an email address (8.1). "Book as a guest" is a button, not a link: it swaps the
 * guest form in place with no navigation (W-12), so the site's wiring dispatches
 * OPEN_GUEST_DOOR on it.
 */
export function step3DoorsHTML(opts) {
    const guestEnabled = opts.guestEnabled ?? true;
    const loginHref = escapeHtml(startUrl(opts.next, "login"));
    const createHref = escapeHtml(startUrl(opts.next, "create"));
    const guestDoor = guestEnabled
        ? `<hr class="carisma-step3__divider" aria-hidden="true" />` +
            `<button type="button" class="carisma-step3__guest-link" ${STEP3_ATTR.guest}>Book as a guest</button>` +
            `<p class="carisma-step3__guest-note">We will use your details to confirm this appointment and send your receipt.</p>`
        : "";
    return (`<section class="carisma-step3 carisma-step3--doors" data-cw-qc="${STEP3_QC}" data-cw-step3-view="doors">` +
        `<h2 class="carisma-step3__heading">Your details</h2>` +
        `<p class="carisma-step3__lede">Sign in and we will fill this in for you.</p>` +
        `<a class="carisma-step3__door carisma-step3__door--primary" ${STEP3_ATTR.account} href="${loginHref}">Continue with your Carisma account</a>` +
        `<a class="carisma-step3__door carisma-step3__door--secondary" ${STEP3_ATTR.create} href="${createHref}">Create an account</a>` +
        guestDoor +
        `</section>`);
}
/**
 * State B. One Continue, which dispatches SUBMIT_DETAILS with a full GuestDetails
 * built from the profile (8.2, W-10). No marketing tick — the account already
 * carries a per-brand preference (8.6, W-17). Every personal line is masked; the
 * couples second-guest fieldset and the notes box are the SITE's, appended after.
 */
export function step3ConfirmHTML(model) {
    const canContinue = model.canContinue ?? true;
    const phoneLine = model.phoneDisplay
        ? `<span class="carisma-step3__confirm-phone" ${M}>${escapeHtml(model.phoneDisplay)}</span>`
        : `<span class="carisma-step3__confirm-phone-missing">We need a mobile number to confirm this appointment.</span>`;
    return (`<section class="carisma-step3 carisma-step3--confirm" data-cw-qc="${STEP3_QC}" data-cw-step3-view="${model.editing ? "confirm-edit" : "confirm"}">` +
        `<h2 class="carisma-step3__heading">Your details</h2>` +
        `<div class="carisma-step3__confirm-card">` +
        `<span class="carisma-step3__confirm-name" ${M}>Booking as ${escapeHtml(model.name)}</span>` +
        `<span class="carisma-step3__confirm-email" ${M}>${escapeHtml(model.emailMasked)}</span>` +
        phoneLine +
        `<div class="carisma-step3__confirm-actions">` +
        `<button type="button" class="carisma-step3__edit" ${STEP3_ATTR.editDetails}>Edit details</button>` +
        `<button type="button" class="carisma-step3__notyou" ${STEP3_ATTR.signOutLocal}>Not you?</button>` +
        `</div>` +
        `</div>` +
        `<button type="button" class="carisma-step3__pay" ${STEP3_ATTR.memberContinue}${canContinue ? "" : " disabled aria-disabled=\"true\""}>Continue to payment</button>` +
        `</section>`);
}
/* ── The corrected marketing tick, for the guest form (8.6) ─────────────── */
/**
 * The consent tick HTML for the guest door. Renders ONLY when the field is shown
 * (a member gets nothing). Never pre-ticked, named for this brand — the three
 * defects 8.6 closes. Returns "" when hidden so a member checkout carries no tick.
 */
export function marketingTickHTML(field) {
    if (!field.shown)
        return "";
    return (`<label class="carisma-step3__consent">` +
        `<input type="checkbox" name="marketingConsent" value="1"${field.checked ? " checked" : ""} data-carisma-marketing-consent />` +
        `<span>${escapeHtml(field.label)}</span>` +
        `</label>`);
}
//# sourceMappingURL=views.js.map