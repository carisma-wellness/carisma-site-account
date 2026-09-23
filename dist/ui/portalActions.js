const PROXY = "/api/auth/proxy";
/* ── The requests ──────────────────────────────────────────────────────── */
export const confirmCall = (id) => ({
    path: `${PROXY}/client/booking/appointments/${encodeURIComponent(id)}/confirm`,
    method: "POST",
});
export const cancellationPreviewCall = (id) => ({
    path: `${PROXY}/client/booking/appointments/${encodeURIComponent(id)}/cancellation-preview`,
    method: "GET",
});
/**
 * `acceptFee` is the member's answer to the preview, not a default.
 *
 * The server refuses a fee-bearing cancel with 409 FEE_CONSENT_REQUIRED unless
 * it is set, which is the behaviour we want: if this flag were ever sent
 * without asking, the refusal that protects the member would be gone and the
 * card would be charged on a single tap.
 */
export const cancelCall = (id, acceptFee) => ({
    path: `${PROXY}/client/booking/appointments/${encodeURIComponent(id)}`,
    method: "DELETE",
    body: { acceptFee },
});
export const rescheduleCall = (id, startTimeIso) => ({
    path: `${PROXY}/client/booking/appointments/${encodeURIComponent(id)}/reschedule`,
    method: "PATCH",
    body: { startTime: startTimeIso },
});
/**
 * Settle an outstanding balance.
 *
 * `returnOrigin` is this brand site, so Stripe sends the member back to the
 * booking they paid for rather than to the CarismaSoft app host. The server
 * looks it up in its registered-origin map and takes the host from THAT, so
 * this is a request for a destination, never an instruction — and a site that
 * is not registered simply lands on the old default.
 */
export const payBalanceCall = (id, returnOrigin) => ({
    path: `${PROXY}/client/booking/appointments/${encodeURIComponent(id)}/pay-balance`,
    method: "POST",
    body: returnOrigin ? { returnOrigin } : {},
});
export const slotsCall = (opts) => {
    const q = new URLSearchParams();
    q.set("brandLocationId", opts.brandLocationId);
    q.set("date", opts.date);
    if (opts.serviceId)
        q.set("serviceId", opts.serviceId);
    if (opts.durationMins)
        q.set("durationMins", String(opts.durationMins));
    return { path: `${PROXY}/client/booking/slots?${q.toString()}`, method: "GET" };
};
export const membershipCall = (id, verb) => ({
    path: `${PROXY}/client/membership/${encodeURIComponent(id)}/${verb}`,
    method: "POST",
});
export function readCancellationPreview(body) {
    const envelope = body && typeof body === "object" ? body : {};
    const inner = ("data" in envelope && envelope.data !== null && typeof envelope.data === "object"
        ? envelope.data
        : envelope);
    const o = inner && typeof inner === "object" ? inner : {};
    const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    return {
        kind: typeof o.kind === "string" ? o.kind : "",
        feeAmount: n(o.feeAmount),
        forfeitAmount: n(o.forfeitAmount),
        chargeAmount: n(o.chargeAmount),
        cardLast4: typeof o.cardLast4 === "string" ? o.cardLast4 : null,
        policyText: typeof o.policyText === "string" ? o.policyText : "",
    };
}
const money = (n) => {
    try {
        return new Intl.NumberFormat("en-MT", { style: "currency", currency: "EUR" }).format(n);
    }
    catch {
        return `€${n.toFixed(2)}`;
    }
};
/**
 * The question put to the member before a cancellation.
 *
 * Every figure comes from the server's preview. Nothing here computes a fee,
 * a percentage or a deposit — the till's arithmetic and this sentence must be
 * the same arithmetic, and the only way to guarantee that is not to do it
 * twice. `autoCharge` is true on every Carisma brand, so when a card is on
 * file the money really does move: the sentence says so in those words.
 */
export function cancelQuestion(p) {
    const lines = ["Cancel this booking?"];
    if (p.chargeAmount > 0) {
        lines.push(p.cardLast4
            ? `We'll charge ${money(p.chargeAmount)} to the card ending ${p.cardLast4}.`
            : `A charge of ${money(p.chargeAmount)} applies.`);
    }
    if (p.forfeitAmount > 0) {
        lines.push(`${money(p.forfeitAmount)} of what you've already paid is kept.`);
    }
    if (p.chargeAmount <= 0 && p.forfeitAmount <= 0) {
        lines.push("There's nothing to pay.");
    }
    if (p.policyText)
        lines.push(p.policyText);
    return lines.join("\n\n");
}
/**
 * Whether we must read the preview before asking.
 *
 * `cancelIsFree` is the server's own verdict and it is the only input: asking
 * the member to wait for a network call to be told "this is free" is a worse
 * page, and guessing that a late cancel is free is a charge they did not agree
 * to. When `actions` is missing entirely we read the preview — the cautious
 * side of an unknown.
 */
export function needsPreview(actions) {
    return actions?.cancelIsFree !== true;
}
/* ── What we say when it fails ─────────────────────────────────────────── */
/**
 * The server's own sentence, or a safe one.
 *
 * CarismaSoft's client errors are written for customers — "This appointment
 * can only be rescheduled online at least 24 hours in advance. Please contact
 * us directly." — so showing them beats inventing a generic apology. What we
 * never show is a status code, a field path or a Joi message.
 */
export function messageFromError(body, status, fallback) {
    const envelope = body && typeof body === "object" ? body : {};
    const msg = envelope.message ?? envelope.error?.message;
    if (typeof msg === "string" && msg && !/^[A-Z_]+$/.test(msg) && !msg.includes('"'))
        return msg;
    if (status === 409)
        return "That time has just been taken. Please pick another.";
    if (status === 401 || status === 403)
        return "Please sign in again to change this booking.";
    return fallback;
}
/**
 * What the cancel sheet says. `preview` is the server's
 * `cancellation-preview`; `free` is `actions.cancelIsFree`. When `free` is
 * true we never read the preview (the server has already said so), and when
 * the preview could not be read we say so instead of implying it is free.
 */
export function cancelSummary(preview, free, fallbackPolicy = "") {
    const policyText = (preview && preview.policyText) || fallbackPolicy || "";
    if (free && !preview) {
        return {
            headline: "Free to cancel",
            amount: null,
            tone: "ok",
            lines: ["There's nothing to pay."],
            policyText,
            confirmLabel: "Cancel booking",
            acceptFee: false,
        };
    }
    if (!preview) {
        return {
            headline: null,
            amount: null,
            tone: "neutral",
            lines: ["We couldn't check whether a fee applies just now. If one does, we'll ask you before anything is charged."],
            policyText,
            confirmLabel: "Cancel booking",
            acceptFee: false,
        };
    }
    const lines = [];
    if (preview.chargeAmount > 0) {
        lines.push(preview.cardLast4
            ? `We'll charge ${money(preview.chargeAmount)} to the card ending ${preview.cardLast4}.`
            : `A charge of ${money(preview.chargeAmount)} applies.`);
    }
    if (preview.forfeitAmount > 0)
        lines.push(`${money(preview.forfeitAmount)} of what you've already paid is kept.`);
    if (preview.chargeAmount <= 0 && preview.forfeitAmount <= 0) {
        return {
            headline: "Free to cancel",
            amount: null,
            tone: "ok",
            lines: ["There's nothing to pay."],
            policyText,
            confirmLabel: "Cancel booking",
            acceptFee: false,
        };
    }
    return {
        headline: preview.chargeAmount > 0 ? "Cancellation fee" : "Kept from what you've paid",
        amount: money(preview.chargeAmount > 0 ? preview.chargeAmount : preview.forfeitAmount),
        tone: "warn",
        lines,
        policyText,
        confirmLabel: preview.chargeAmount > 0 ? `Cancel booking and pay ${money(preview.chargeAmount)}` : "Cancel booking",
        acceptFee: true,
    };
}
/* ── Wallet passes ─────────────────────────────────────────────────────── */
export const walletAvailabilityCall = () => ({
    path: `${PROXY}/client/wallet/availability`,
    method: "GET",
});
/** Answers `{ url }` — a signed pass download (Apple) or a save link (Google). */
export const walletPassCall = (id, which) => ({
    path: `${PROXY}/client/wallet/appointments/${encodeURIComponent(id)}/${which}`,
    method: "GET",
});
/** `{ apple, google }` from the availability read; anything else is "no". */
export function readWalletAvailability(body) {
    const envelope = body && typeof body === "object" ? body : {};
    const inner = ("data" in envelope && envelope.data !== null && typeof envelope.data === "object" ? envelope.data : envelope);
    return { apple: inner?.apple === true, google: inner?.google === true };
}
//# sourceMappingURL=portalActions.js.map