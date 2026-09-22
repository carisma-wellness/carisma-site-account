/**
 * Moving a booking: the day, the free times, and the one conversion that has
 * to be right.
 *
 * CarismaSoft answers `GET /client/booking/slots` with times as **wall clock
 * in the venue's own zone** — `{ date: "2026-09-24", slots: [{ time: "15:00",
 * available: true }], timeZone: "Europe/Malta" }`. `PATCH /reschedule` wants
 * `startTime` as a **UTC instant**. Everything in this file exists to get
 * across that gap without a date library and without ever being an hour out.
 *
 * Why not reuse a site's booking flow? Because there are five of them, four
 * are byte-identical copies and the fifth has already drifted, and a reschedule
 * needs none of what they do — no service choice, no venue choice, no payment.
 * One picker here is one implementation for every brand, skinned by the same
 * `--cw-account-*` tokens as the rest of the account area.
 */
import { escapeHtml } from "./html.js";
export const RESCHEDULE_QC = "account-reschedule-20260922";
/**
 * How far ahead of `now` the venue's clock is, in ms, on a given instant.
 *
 * Formats the instant AS that zone, reads the fields back as if they were UTC,
 * and takes the difference. Standard, dependency-free, and correct across DST
 * because the offset is computed at the instant in question rather than today's.
 */
function zoneOffsetMs(at, timeZone) {
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }).formatToParts(at);
        const f = {};
        for (const p of parts)
            if (p.type !== "literal")
                f[p.type] = Number(p.value);
        // `hour` comes back as 24 at midnight under hour12:false in some engines.
        const asIfUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour % 24, f.minute, f.second);
        return asIfUtc - at.getTime();
    }
    catch {
        return 0;
    }
}
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
export function venueLocalToUtcIso(dateStr, timeStr, timeZone) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}/.test(timeStr))
        return null;
    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, mi] = timeStr.split(":").map(Number);
    // Date.UTC takes a 0-indexed month. Spreading a YYYY-MM-DD straight into it
    // is a one-month error that only shows on the 1st.
    const asIfUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
    if (!Number.isFinite(asIfUtc))
        return null;
    let instant = new Date(asIfUtc - zoneOffsetMs(new Date(asIfUtc), timeZone));
    instant = new Date(asIfUtc - zoneOffsetMs(instant, timeZone));
    return instant.toISOString();
}
/** "2026-09-24" for a Date, in the venue's zone — never toISOString().slice(). */
export function venueDateString(at, timeZone) {
    try {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(at);
        const f = {};
        for (const p of parts)
            if (p.type !== "literal")
                f[p.type] = p.value;
        return `${f.year}-${f.month}-${f.day}`;
    }
    catch {
        return "";
    }
}
export function buildSlotsModel(body, fallbackDate) {
    const envelope = body && typeof body === "object" ? body : {};
    // `data` present, not `success === true` — see records.ts's unwrap.
    const inner = ("data" in envelope && envelope.data !== null && typeof envelope.data === "object"
        ? envelope.data
        : envelope);
    const o = inner && typeof inner === "object" ? inner : {};
    const raw = Array.isArray(o.slots) ? o.slots : [];
    return {
        date: typeof o.date === "string" ? o.date : fallbackDate,
        // The venue's zone, from the venue. A handset's zone would offer slots an
        // hour out for anyone reading from abroad — which is most gift recipients.
        timeZone: typeof o.timeZone === "string" && o.timeZone ? o.timeZone : "Europe/Malta",
        slots: raw
            .filter((s) => s && typeof s.time === "string")
            .map((s) => ({ time: String(s.time), available: s.available !== false })),
        nextAvailableDate: typeof o.nextAvailableDate === "string" ? o.nextAvailableDate : null,
        // `serviceOfferedHere` is additive and absent on older servers. Absent is
        // "no opinion", which must read as offered — not as a withdrawn treatment.
        offeredHere: o.serviceOfferedHere !== false,
    };
}
/** The picker body. The host wraps it in a dialog and binds the clicks. */
export function reschedulePickerHTML(m, opts) {
    const free = m.slots.filter((s) => s.available);
    const times = !m.offeredHere
        ? `<p class="carisma-portal__empty">This treatment isn't offered at this venue any more. ` +
            `Please call us and we'll find you something.</p>`
        : free.length
            ? `<div class="carisma-reschedule__times">` +
                free
                    .map((s) => `<button type="button" class="carisma-reschedule__time" data-cw-slot="${escapeHtml(s.time)}">` +
                    `${escapeHtml(s.time)}</button>`)
                    .join("") +
                `</div>`
            : `<p class="carisma-portal__empty">Nothing free on this day.` +
                (m.nextAvailableDate
                    ? ` The next day with space is <button type="button" class="carisma-reschedule__jump" ` +
                        `data-cw-date="${escapeHtml(m.nextAvailableDate)}">${escapeHtml(m.nextAvailableDate)}</button>.`
                    : "") +
                `</p>`;
    return (`<section class="carisma-reschedule" data-cw-qc="${RESCHEDULE_QC}" data-cw-tz="${escapeHtml(m.timeZone)}">` +
        `<h2 class="carisma-portal__eyebrow">Pick a new time</h2>` +
        `<label class="carisma-reschedule__day">Day` +
        `<input type="date" data-cw-reschedule-date value="${escapeHtml(m.date)}" min="${escapeHtml(opts.minDate)}"></label>` +
        times +
        `<p class="carisma-portal__fine">Times are ${escapeHtml(m.timeZone.replace("Europe/", ""))} local. ` +
        `Same treatment, same venue — to change either of those, book again instead.</p>` +
        `</section>`);
}
//# sourceMappingURL=reschedule.js.map