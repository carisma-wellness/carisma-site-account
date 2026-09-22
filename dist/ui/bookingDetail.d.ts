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
export declare function bookingDetailHTML(m: BookingDetailModel): string;
//# sourceMappingURL=bookingDetail.d.ts.map