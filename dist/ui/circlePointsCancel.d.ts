export interface CirclePointsBooking {
    appointmentId: string;
    spendId: string;
    kind: "POINTS" | "SPA_DAY";
    points: number;
    status: string;
    /** The server's verdict as of the read; null when it sent none (never guessed). */
    ifCancelledNow: "RETURN" | "LOSE" | null;
    /** Points Carisma keeps on a cancel now (R2.4); 0 when none or not sent. */
    keepsPoints: number;
    /** The free-cancel deadline (ISO), or "". */
    freeCancelUntil: string;
}
/** `GET /client/loyalty/points-bookings` → its items, or null (off, left, 404, garbage). */
export declare function readPointsBookings(body: unknown): CirclePointsBooking[] | null;
export interface PointsCancelLine {
    /** true: everything paid with points comes back; false: some or all of it is lost; null: not known. */
    back: boolean | null;
    /** The sentences, in reading order (none when the verdict is not known). */
    lines: string[];
    /** The points lost when known (the sheet's figure), else null. */
    lostPoints: number | null;
    /** The server's free-cancel deadline for a "come back" verdict (ISO), else "". */
    until: string;
    /** The read itself failed (Circle live): we do not even know whether points paid this booking. */
    failed?: boolean;
}
/** A points booking whose verdict is not known (the server sent no `ifCancelledNow`). */
export declare const POINTS_CANCEL_UNKNOWN: Readonly<PointsCancelLine>;
/** Circle is live but the points read gave no answer: whether points paid this booking is not known. */
export declare const POINTS_CANCEL_NOT_READ: Readonly<PointsCancelLine>;
/**
 * The line for ONE booking, or null when no live (BOOKED) spend paid it — the money words then stand as they are.
 * `nowMs` is the moment the words are drawn: a "come back" verdict is never repeated after its own deadline.
 */
export declare function pointsCancelLine(items: readonly CirclePointsBooking[] | null | undefined, appointmentId: string, nowMs?: number): PointsCancelLine | null;
//# sourceMappingURL=circlePointsCancel.d.ts.map