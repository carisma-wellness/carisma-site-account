import type { CancellationPreview } from "./portalActions.js";
export declare const BOOKING_DETAIL_QC = "account-booking-detail-20260922";
/** Mirrors the backend's AppointmentActions. Every field optional on the wire. */
export interface BookingActions {
    canConfirm: boolean;
    canReschedule: boolean;
    rescheduleClosesAt: string | null;
    canCancel: boolean;
    cancelIsFree: boolean;
    freeCancelEndsAt: string | null;
    canPayBalance: boolean;
    balanceDue: number;
    canRebook: boolean;
    reason: string | null;
}
export interface BookingServiceLine {
    /** The catalogue id. What /booking/slots qualifies its staff pool by. */
    serviceId: string | null;
    name: string;
    optionName: string | null;
    price: number;
    durationMins: number | null;
    staffName: string | null;
}
export interface BookingDetailModel {
    id: string;
    found: boolean;
    status: string;
    /** "Booked" / "Confirmed" / "Reserved — payment pending" … */
    statusLabel: string;
    brand: string;
    venue: string;
    address: string;
    mapHref: string | null;
    when: string;
    services: BookingServiceLine[];
    staffName: string | null;
    total: number;
    paid: number;
    due: number;
    actions: BookingActions;
    /** The brand's own policy sentence, verbatim from CarismaSoft. */
    policyText: string;
    bookingRef: string | null;
    isMedical: boolean;
    /**
     * The three fields a reschedule picker cannot work without: the (brand,
     * venue) pair, the treatment, and how long it takes. Null on an older
     * backend, and `openReschedule` refuses rather than asking for availability
     * it cannot describe.
     */
    brandLocationId: string | null;
    serviceId: string | null;
    durationMins: number | null;
    walletAppleHref: string;
    walletGoogleHref: string;
    /** The booking's start and end, UTC ISO, as the server sent them. */
    startIso: string;
    endIso: string;
    /** Minutes on the clock (end − start), else the ticket's own duration. */
    minutes: number | null;
}
/**
 * The words a member reads for a machine status.
 *
 * PENDING is the one that matters: it is an unpaid hold created by a checkout
 * that never settled, and calling it "Booked" tells someone they have an
 * appointment they do not have.
 */
export declare function statusLabel(status: string): string;
/** Read the `actions` block, defaulting every capability to OFF when absent. */
export declare function readActions(raw: unknown): BookingActions;
export declare function buildBookingDetailModel(body: unknown, id: string): BookingDetailModel;
export declare function isActiveBooking(m: Pick<BookingDetailModel, "status">): boolean;
export interface BookingRenderOptions {
    /** This site's brand; the brand label shows only when the booking is another brand's. */
    siteBrand?: string;
    now?: Date;
    /** `/client/wallet/availability`. Absent = neither wallet is offered. */
    wallet?: {
        apple: boolean;
        google: boolean;
    } | null;
    /** The server's cancellation preview, when it was read for the policy line. */
    preview?: CancellationPreview | null;
    /** This brand's booking door, for "Book again". */
    bookHref?: string;
}
export type BookingPrimary = "pay" | "reschedule" | "confirm" | "rebook" | null;
/**
 * The ONE primary: Pay > Reschedule > Confirm > Book again, from the server's
 * capabilities alone. Money owed outranks everything; moving is the CEO's ask.
 */
export declare function bookingPrimary(m: BookingDetailModel): BookingPrimary;
/** "Book again" goes to the treatment when we know it, on this brand's door. */
export declare function rebookHref(bookHref: string | undefined, serviceId: string | null): string;
/** What a balance is called, by what the visit became. */
export declare function dueLabel(status: string): string;
/** The treatment, for page titles and dialog titles. */
export declare function bookingTreatment(m: BookingDetailModel): string;
/** The policy line that leads "Changing this booking" — server figures only. */
export declare function policyLead(m: BookingDetailModel, preview?: CancellationPreview | null): string;
export interface BookingViewParts {
    title: string;
    lede: string;
    body: string;
}
/**
 * The page, in the three pieces the shell takes. The shell's own h1 IS the
 * treatment — so "focus the h1 after a change" lands on the right words.
 */
export declare function bookingViewParts(m: BookingDetailModel, o?: BookingRenderOptions): BookingViewParts;
/** The skeleton for one booking: the lockup, the facts and the money card, in place. */
export declare function bookingSkeletonHTML(): string;
/** The whole page, in the portal shell. Kept for hosts and tests that render it server-side. */
export declare function bookingDetailHTML(m: BookingDetailModel, o?: BookingRenderOptions, shell?: {
    emailMasked?: string;
    memberName?: string;
}): string;
//# sourceMappingURL=bookingDetail.d.ts.map