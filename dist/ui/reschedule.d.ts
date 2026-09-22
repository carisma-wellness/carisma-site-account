export declare const RESCHEDULE_QC = "account-reschedule-20260922";
/**
 * "2026-09-24" + "15:00" in `timeZone` → the UTC instant, as an ISO string.
 *
 * Two passes. The first guesses the instant by reading the wall clock as if it
 * were UTC and subtracting the offset; the second re-measures the offset AT
 * that guess and corrects it. One pass is wrong for any booking within an hour
 * of a DST change — which in Malta is a real Sunday morning in March and
 * October, and a treatment booked an hour out is a customer standing outside a
 * locked door.
 */
export declare function venueLocalToUtcIso(dateStr: string, timeStr: string, timeZone: string): string | null;
/** "2026-09-24" for a Date, in the venue's zone — never toISOString().slice(). */
export declare function venueDateString(at: Date, timeZone: string): string;
export interface SlotView {
    time: string;
    available: boolean;
}
export interface SlotsModel {
    date: string;
    timeZone: string;
    slots: SlotView[];
    /** The server's own suggestion when this day is full. */
    nextAvailableDate: string | null;
    /** False when the venue does not offer this treatment at all. */
    offeredHere: boolean;
}
export declare function buildSlotsModel(body: unknown, fallbackDate: string): SlotsModel;
/** The picker body. The host wraps it in a dialog and binds the clicks. */
export declare function reschedulePickerHTML(m: SlotsModel, opts: {
    minDate: string;
}): string;
//# sourceMappingURL=reschedule.d.ts.map