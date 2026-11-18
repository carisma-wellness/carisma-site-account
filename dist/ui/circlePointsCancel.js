/**
 * Carisma Circle v2 — what cancelling a booking does to the points (or the free Spa day) that paid for it
 * (carisma-circle-v2-20261117; BE-2 §6 `GET /client/loyalty/points-bookings`, the R2.4 verdicts; surfaces §1.1,
 * the APP's cancel line). Pure.
 *
 * A booking paid with points is €0 to the money engine, so the cancellation preview says "Free to cancel" while a
 * late cancellation loses every point on it (BRIEF §2, `spend.lateCancelKeepBp` 10000 = all). The booking page and
 * its cancel sheet therefore take the server's own points verdict and, beside points, never claim a cancel is free:
 *
 *   in time   "Cancel now and your 2,180 points come back."
 *   late      "Cancelling now loses the 2,180 points on this booking."   (`keepsPoints`, the server's share)
 *   stale     a "come back" verdict read before its `freeCancelUntil`, shown after it: "Cancelling now loses the
 *             points on this booking." (no figure: how many is the server's late-cancel share, re-read at the sheet)
 *   Spa day   "Cancel now and your free Spa day comes back." / "Cancelling now counts as using your free Spa day."
 *   unknown   the server sent no `ifCancelledNow` (R2.16(g): it omits rather than guesses), or the read failed while
 *             Circle is live: no sentence, and no "Free to cancel" claim either.
 *
 * Only a BOOKED spend counts: HELD has no booking yet; USED, RETURNED and FORFEITED are settled.
 */
import { unwrapEnvelope } from "./appointments.js";
import { int, obj, pointsText, str } from "./circleCore.js";
/** `GET /client/loyalty/points-bookings` → its items, or null (off, left, 404, garbage). */
export function readPointsBookings(body) {
    const o = obj(unwrapEnvelope(body));
    if (!o || o.enabled !== true || !Array.isArray(o.items))
        return null;
    const out = [];
    for (const raw of o.items) {
        const i = obj(raw);
        if (!i || !str(i.appointmentId) || !str(i.spendId))
            continue;
        const verdict = i.ifCancelledNow === "RETURN" || i.ifCancelledNow === "LOSE" ? i.ifCancelledNow : null;
        const until = str(i.freeCancelUntil);
        out.push({
            appointmentId: str(i.appointmentId),
            spendId: str(i.spendId),
            kind: i.kind === "SPA_DAY" ? "SPA_DAY" : "POINTS",
            points: Math.max(0, int(i.points)),
            status: str(i.status).toUpperCase(),
            ifCancelledNow: verdict,
            keepsPoints: Math.max(0, int(i.keepsPoints)),
            freeCancelUntil: until && Number.isFinite(Date.parse(until)) ? until : "",
        });
    }
    return out;
}
/** A points booking whose verdict is not known (the server sent no `ifCancelledNow`). */
export const POINTS_CANCEL_UNKNOWN = Object.freeze({ back: null, lines: [], lostPoints: null, until: "" });
/** Circle is live but the points read gave no answer: whether points paid this booking is not known. */
export const POINTS_CANCEL_NOT_READ = Object.freeze({ back: null, lines: [], lostPoints: null, until: "", failed: true });
const comeBack = (n) => (n === 1 ? "comes back" : "come back");
/**
 * The line for ONE booking, or null when no live (BOOKED) spend paid it — the money words then stand as they are.
 * `nowMs` is the moment the words are drawn: a "come back" verdict is never repeated after its own deadline.
 */
export function pointsCancelLine(items, appointmentId, nowMs = Date.now()) {
    const mine = (items ?? []).filter((i) => i.appointmentId === appointmentId && i.status === "BOOKED");
    if (!mine.length)
        return null;
    if (mine.some((i) => i.ifCancelledNow === null))
        return { ...POINTS_CANCEL_UNKNOWN, lines: [] };
    const passed = (i) => i.freeCancelUntil !== "" && Date.parse(i.freeCancelUntil) <= nowMs;
    const late = (i) => i.ifCancelledNow === "LOSE" || passed(i);
    const lines = [];
    let back = true;
    let lostPoints = null;
    const points = mine.filter((i) => i.kind === "POINTS" && i.points > 0);
    if (points.length) {
        const total = points.reduce((s, i) => s + i.points, 0);
        if (points.some(late)) {
            back = false;
            if (points.some((i) => i.ifCancelledNow === "RETURN")) {
                // Read in time, drawn after the deadline: it loses them; how many is the server's share (re-read at the sheet).
                lines.push("Cancelling now loses the points on this booking.");
            }
            else {
                const kept = points.reduce((s, i) => s + (i.keepsPoints > 0 ? Math.min(i.keepsPoints, i.points) : i.points), 0);
                lostPoints = kept;
                lines.push(kept < total
                    ? `Cancelling now loses ${kept.toLocaleString("en-GB")} of the ${pointsText(total)} on this booking. The rest ${comeBack(total - kept)}.`
                    : `Cancelling now loses the ${pointsText(total)} on this booking.`);
            }
        }
        else {
            lines.push(`Cancel now and your ${pointsText(total)} ${comeBack(total)}.`);
        }
    }
    const spaDays = mine.filter((i) => i.kind === "SPA_DAY");
    if (spaDays.length) {
        if (spaDays.some(late)) {
            back = false;
            lines.push(spaDays.length > 1 ? "Cancelling now counts as using your free Spa days." : "Cancelling now counts as using your free Spa day.");
        }
        else {
            lines.push(spaDays.length > 1 ? "Cancel now and your free Spa days come back." : "Cancel now and your free Spa day comes back.");
        }
    }
    if (!lines.length)
        return null;
    const deadlines = mine
        .filter((i) => i.ifCancelledNow === "RETURN" && i.freeCancelUntil)
        .map((i) => Date.parse(i.freeCancelUntil))
        .filter((ms) => Number.isFinite(ms));
    const until = back && deadlines.length ? new Date(Math.min(...deadlines)).toISOString() : "";
    return { back, lines, lostPoints, until };
}
//# sourceMappingURL=circlePointsCancel.js.map