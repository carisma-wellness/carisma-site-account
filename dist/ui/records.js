/**
 * The member's record, as opposed to their diary: what they have already paid
 * for (gift cards, packages, account credit), what they still owe, what they
 * have signed, and what their membership costs.
 *
 * All of it existed in CarismaSoft and none of it was readable from a website.
 * A member with €85 of credit and four sessions left on a package had no way
 * to see either without ringing the desk, which is also how the desk found out
 * they had forgotten.
 *
 * Every builder here is pure: a wire body in, a view model out, no DOM and no
 * fetch. The wire shapes are defensive on purpose — these are five separate
 * CarismaSoft endpoints written at different times, and a missing field must
 * render as "—", never as NaN and never as a thrown page.
 */
import { escapeHtml } from "./html.js";
import { eur, plainDate } from "./money.js";
export const MEMBER_RECORDS_QC = "account-records-20260922";
const M = 'data-clarity-mask="True"';
/**
 * Step inside the house envelope.
 *
 * Keyed on `data` being PRESENT, not on `success === true`. The live routes all
 * send `{success:true,data}`, but a cached body, a proxy that replays only the
 * payload, or a route written before the helper existed sends the bare object —
 * and a strict check turns each of those into a silently empty section rather
 * than an error anyone would see.
 */
function unwrap(body) {
    if (body && typeof body === "object" && !Array.isArray(body)) {
        const o = body;
        if ("data" in o && o.data !== null && typeof o.data === "object")
            return o.data;
    }
    return body;
}
/** Rows out of any of the house shapes: `[]`, `{data:[]}`, `{items:[]}`. */
function rows(body) {
    const inner = unwrap(body);
    const pick = (v) => Array.isArray(v) ? v.filter((r) => Boolean(r) && typeof r === "object") : [];
    if (Array.isArray(inner))
        return pick(inner);
    if (inner && typeof inner === "object") {
        const o = inner;
        return pick(o.data).length ? pick(o.data) : pick(o.items);
    }
    return [];
}
function str(v) {
    return typeof v === "string" ? v : "";
}
function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
/** The first of several possible field names, for DTOs written years apart. */
function firstOf(o, keys) {
    for (const k of keys)
        if (o[k] !== undefined && o[k] !== null)
            return o[k];
    return undefined;
}
export function buildWalletModel(input) {
    const giftCards = rows(input.giftCards).map((g) => ({
        code: str(firstOf(g, ["code", "cardCode", "reference"])),
        balance: num(firstOf(g, ["balance", "remainingAmount", "currentBalance"])),
        originalValue: num(firstOf(g, ["originalValue", "initialAmount", "amount", "value"])),
        expiresAt: str(firstOf(g, ["expiresAt", "expiryDate", "validUntil"])) || null,
        from: str(firstOf(g, ["purchaserName", "senderName", "from"])) || null,
    }));
    const packages = rows(input.packages).map((p) => {
        const left = firstOf(p, ["sessionsRemaining", "remainingSessions", "sessionsLeft"]);
        const total = firstOf(p, ["sessionsTotal", "totalSessions", "sessions"]);
        return {
            name: str(firstOf(p, ["planNameSnapshot", "name", "planName"])) || "Package",
            sessionsLeft: left === undefined ? null : num(left),
            sessionsTotal: total === undefined ? null : num(total),
            expiresAt: str(firstOf(p, ["expiresAt", "expiryDate", "validUntil"])) || null,
            amountDue: num(firstOf(p, ["amountDue", "balanceDue"])),
        };
    });
    const creditRaw = unwrap(input.credit);
    const credit = creditRaw && typeof creditRaw === "object"
        ? num(firstOf(creditRaw, ["balance", "creditBalance", "amount"]))
        : num(creditRaw);
    return {
        giftCards,
        packages,
        credit,
        isEmpty: giftCards.length === 0 && packages.length === 0 && credit <= 0,
    };
}
function card(label, value, sub) {
    return (`<article class="carisma-portal__card" ${M}>` +
        `<span class="carisma-portal__label">${escapeHtml(label)}</span>` +
        `<span class="carisma-portal__value">${escapeHtml(value)}</span>` +
        (sub ? `<span class="carisma-portal__lede" style="margin:0">${escapeHtml(sub)}</span>` : "") +
        `</article>`);
}
export function walletHTML(m) {
    if (m.isEmpty) {
        return (`<p class="carisma-portal__empty">Nothing in your wallet yet — gift cards, treatment packages ` +
            `and account credit all appear here. <a href="/">Browse treatments</a></p>`);
    }
    const credit = m.credit > 0 ? `<h2 class="carisma-portal__eyebrow">Account credit</h2>${card("Available to spend", eur(m.credit))}` : "";
    const gifts = m.giftCards.length
        ? `<h2 class="carisma-portal__eyebrow" style="margin-top:28px">Gift cards</h2>` +
            m.giftCards
                .map((g) => card(g.code ? `Card ${g.code}` : "Gift card", eur(g.balance), [
                g.originalValue > g.balance ? `${eur(g.originalValue)} originally` : "",
                // Expiry is stated plainly rather than hidden. A member finding
                // out at the desk that a card expired last month is the outcome
                // this line exists to prevent — and it is not urgency copy, it
                // is a fact about the card.
                g.expiresAt ? `Valid until ${plainDate(g.expiresAt)}` : "",
                g.from ? `From ${g.from}` : "",
            ]
                .filter(Boolean)
                .join(" · ")))
                .join("")
        : "";
    const packs = m.packages.length
        ? `<h2 class="carisma-portal__eyebrow" style="margin-top:28px">Packages</h2>` +
            m.packages
                .map((p) => {
                const count = p.sessionsLeft !== null && p.sessionsTotal !== null
                    ? `${p.sessionsLeft} of ${p.sessionsTotal} left`
                    : p.sessionsLeft !== null
                        ? `${p.sessionsLeft} left`
                        : "—";
                return card(p.name, count, [
                    p.expiresAt ? `Valid until ${plainDate(p.expiresAt)}` : "",
                    p.amountDue > 0 ? `${eur(p.amountDue)} still to pay` : "",
                ]
                    .filter(Boolean)
                    .join(" · "));
            })
                .join("")
        : "";
    return credit + gifts + packs;
}
function statementLine(l) {
    return {
        description: str(l.description) || "Carisma",
        amountDue: num(l.amountDue),
        amountPaid: num(l.amountPaid),
        total: num(l.total),
        when: str(firstOf(l, ["dueAt", "occurredAt"])),
        appointmentId: str(l.appointmentId) || null,
    };
}
export function buildStatementModel(body) {
    const inner = unwrap(body);
    const o = (inner && typeof inner === "object" ? inner : {});
    return {
        totalDue: num(o.totalDue),
        due: rows(o.due).map(statementLine),
        history: rows(o.history).map(statementLine),
    };
}
export function statementHTML(m) {
    if (!m.due.length && !m.history.length) {
        return `<p class="carisma-portal__empty">Nothing on your account — no payments due, nothing outstanding.</p>`;
    }
    const line = (l, showDue) => {
        const amount = showDue ? eur(l.amountDue) : eur(l.amountPaid || l.total);
        const sub = [l.when ? plainDate(l.when) : "", showDue && l.amountPaid > 0 ? `${eur(l.amountPaid)} already paid` : ""]
            .filter(Boolean)
            .join(" · ");
        const body = card(l.description, amount, sub);
        return l.appointmentId
            ? `<a class="carisma-portal__cardlink" href="/account/bookings/${escapeHtml(l.appointmentId)}">${body}</a>`
            : body;
    };
    const due = m.due.length
        ? `<h2 class="carisma-portal__eyebrow">Due now · ${escapeHtml(eur(m.totalDue))}</h2>` +
            m.due.map((l) => line(l, true)).join("")
        : `<p class="carisma-portal__empty">Nothing due right now.</p>`;
    const history = m.history.length
        ? `<h2 class="carisma-portal__eyebrow" style="margin-top:28px">Paid</h2>` +
            m.history.map((l) => line(l, false)).join("")
        : "";
    return due + history;
}
export function buildDocumentsModel(body) {
    return rows(body).map((d) => ({
        id: str(d.id),
        name: str(d.name) || str(d.originalName) || "Document",
        caption: str(d.caption) || null,
        url: str(d.url) || null,
        uploadedAt: str(d.uploadedAt),
    }));
}
export function documentsHTML(docs) {
    if (!docs.length) {
        return `<p class="carisma-portal__empty">No documents yet. Consent forms you sign with us appear here.</p>`;
    }
    return docs
        .map((d) => {
        const sub = [d.caption, d.uploadedAt ? plainDate(d.uploadedAt) : ""].filter(Boolean).join(" · ");
        const body = card(d.name, d.url ? "Open" : "Ask at the desk", sub);
        // The link is a 5-minute presign minted for this read. `rel=noreferrer`
        // so the signature never travels in a Referer header.
        return d.url
            ? `<a class="carisma-portal__cardlink" href="${escapeHtml(d.url)}" rel="noreferrer" target="_blank">${body}</a>`
            : body;
    })
        .join("");
}
export function buildMembershipModel(body) {
    const inner = unwrap(body);
    const list = rows(body);
    const o = (list[0] ?? (inner && typeof inner === "object" ? inner : {}));
    const plan = (o.membership && typeof o.membership === "object" ? o.membership : {});
    const status = str(firstOf(o, ["status", "state"])).toUpperCase();
    const planName = str(firstOf(plan, ["name"])) || str(firstOf(o, ["planName", "planNameSnapshot"]));
    const hasMembership = Boolean(planName || status);
    return {
        hasMembership,
        planName: planName || "Membership",
        status,
        price: num(firstOf(o, ["price", "chosenAmount", "priceSnapshot", "monthlyAmount"])),
        nextChargeAt: str(firstOf(o, ["nextBillingAt", "nextChargeAt", "currentPeriodEnd"])) || null,
        storedValue: num(firstOf(o, ["storedValue", "balance", "creditBalance"])),
        id: str(o.id) || null,
        // Pause and resume are mutually exclusive, and both are refused outright
        // on a cancelled membership.
        canPause: hasMembership && status === "ACTIVE",
        canResume: hasMembership && (status === "PAUSED" || status === "SUSPENDED"),
    };
}
export function membershipHTML(m) {
    if (!m.hasMembership) {
        return (`<p class="carisma-portal__empty">You're not a member yet. ` +
            `<a href="/membership">See what membership includes</a></p>`);
    }
    const statusWord = m.status ? m.status.charAt(0) + m.status.slice(1).toLowerCase() : "";
    const facts = card("Plan", m.planName, statusWord) +
        (m.price > 0 ? card("Monthly", eur(m.price)) : "") +
        (m.nextChargeAt ? card("Next payment", plainDate(m.nextChargeAt)) : "") +
        (m.storedValue > 0 ? card("Membership balance", eur(m.storedValue)) : "");
    const btn = (action, label) => `<button type="button" class="carisma-portal__btn" data-cw-action="${action}" ` +
        `data-cw-membership="${escapeHtml(m.id ?? "")}">${escapeHtml(label)}</button>`;
    const controls = m.id && (m.canPause || m.canResume)
        ? `<section class="carisma-portal__block carisma-portal__actions">` +
            (m.canPause ? btn("membership-pause", "Pause membership") : "") +
            (m.canResume ? btn("membership-resume", "Resume membership") : "") +
            `</section>`
        : "";
    // Cancelling and changing the card are deliberately NOT buttons here. The
    // card is an identity-origin act (the brand proxy forbids it); cancelling a
    // membership is a conversation we would rather have than lose silently.
    const rest = `<p class="carisma-portal__note">To change the card that pays for this, or to cancel, ` +
        `<a href="/account/details">go to your details</a> or speak to the team.</p>`;
    return facts + controls + rest;
}
//# sourceMappingURL=records.js.map