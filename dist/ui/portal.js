/**
 * The same-origin member portal at /account, /account/bookings, /account/details.
 * Medical stays on my.carismamedical.com; these pages are the salon-brand portal
 * (Spa, Aesthetics, Slimming, Pulse, Hair Clinic). Profile writes stay off the
 * brand proxy (W-24 / allowlist); this surface is read + the member's own acts.
 *
 * THE RULE THAT SHAPES EVERY BUTTON: the server decides. A booking card offers
 * Reschedule only when the appointment's own `actions.canReschedule` is true,
 * Pay only when `actions.canPayBalance` is, and nothing at all when `actions`
 * is missing. No clock arithmetic here ever opens or closes a door.
 */
import { escapeHtml } from "./html.js";
import { extractAppointmentBucket, extractAppointmentList, formatWhen, isMedicalAppointment, } from "./appointments.js";
import { ACCOUNT_BOOKINGS_HREF, ACCOUNT_DETAILS_HREF, ACCOUNT_HOME_HREF, buildPanelModel, } from "./panel.js";
import { readActions, statusLabel } from "./bookingDetail.js";
import { eur, untilPhrase } from "./money.js";
export const PORTAL_QC = "account-portal-20260917";
const M = 'data-clarity-mask="True"';
const MALTA = "Europe/Malta";
function parts(ms, opts) {
    try {
        return new Intl.DateTimeFormat("en-GB", { timeZone: MALTA, ...opts }).format(new Date(ms));
    }
    catch {
        return "";
    }
}
function clockOf(ms) {
    return Number.isFinite(ms) ? parts(ms, { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
}
/** "+35627802062" → "+356 2780 2062"; anything else unchanged. */
export function formatPhone(raw) {
    const digits = raw.replace(/\s+/g, "");
    const mt = /^\+356(\d{4})(\d{4})$/.exec(digits);
    return mt ? `+356 ${mt[1]} ${mt[2]}` : raw.trim();
}
/** The server's sentence, escaped, with every phone number made a tel: link. */
export function linkifyPhones(text) {
    return escapeHtml(text).replace(/\+?\d[\d ]{6,}\d/g, (m) => {
        const tel = m.replace(/\s+/g, "");
        return `<a href="tel:${tel}">${escapeHtml(formatPhone(m))}</a>`;
    });
}
function brandKey(s) {
    return s.toLowerCase().replace(/carisma|wellness|club|[^a-z]/g, "");
}
function chipFor(status, upcoming, a, due) {
    if (status === "PENDING")
        return { label: statusLabel(status), tone: "warn" };
    if (upcoming && a.canPayBalance && due > 0)
        return { label: "Payment due", tone: "warn" };
    switch (status) {
        case "BOOKED":
        case "CONFIRMED":
            return { label: statusLabel(status), tone: "ok" };
        case "NO_SHOW":
            return { label: due > 0 ? "Fee owed" : statusLabel(status), tone: due > 0 ? "warn" : "bad" };
        case "CANCELLED":
        case "PAYMENT_FAILED":
            return { label: statusLabel(status), tone: "bad" };
        case "COMPLETED":
            return { label: statusLabel(status), tone: "neutral" };
        default:
            return status ? { label: statusLabel(status), tone: "neutral" } : null;
    }
}
/** One wire row → one card. Service/brand/venue come through the panel mapper, which knows every live shape. */
export function buildApptCard(row, bucket, siteBrand = "") {
    const visit = buildPanelModel({ upcoming: [row], profile: {}, initials: "" }).visits[0];
    const startIso = typeof row.startTime === "string" ? row.startTime : "";
    const endIso = typeof row.endTime === "string" ? row.endTime : "";
    const startMs = Date.parse(startIso);
    const endMs = Date.parse(endIso);
    const id = String(row.id ?? row.appointmentId ?? "");
    const actions = readActions(row.actions);
    const balance = row.balance && typeof row.balance === "object" ? row.balance : null;
    const due = actions.balanceDue > 0 ? actions.balanceDue : Number(balance?.amount ?? 0) || 0;
    const brand = visit?.brand || String(row.brandName ?? "");
    const status = typeof row.status === "string" ? row.status : "";
    const ok = Number.isFinite(startMs);
    const from = clockOf(startMs);
    const to = Number.isFinite(endMs) ? clockOf(endMs) : "";
    return {
        id,
        href: bookingDetailHref(row),
        service: visit?.service || String(row.primaryServiceName ?? "") || "Your booking",
        brand,
        showBrand: Boolean(brand) && (!siteBrand || brandKey(brand) !== brandKey(siteBrand)),
        venue: visit?.venue || String(row.locationName ?? ""),
        startIso,
        startMs,
        tile: ok
            ? {
                wk: parts(startMs, { weekday: "short" }),
                day: parts(startMs, { day: "numeric" }),
                mon: parts(startMs, { month: "short" }),
            }
            : null,
        clock: ok ? (to ? `${from} – ${to}` : from) : formatWhen(startIso),
        longDay: ok ? parts(startMs, { weekday: "long", day: "numeric", month: "long" }) : "",
        shortDay: ok ? parts(startMs, { weekday: "short", day: "numeric", month: "short" }) : "",
        status,
        chip: chipFor(status, bucket === "upcoming", actions, due),
        upcoming: bucket === "upcoming",
        actions,
        due,
    };
}
/**
 * Upcoming soonest-first, past latest-first. An unparseable start sorts last
 * in both, so a malformed row never displaces a real next visit.
 */
export function buildApptCards(body, bucket, siteBrand = "") {
    const rows = bucket === "upcoming" ? extractAppointmentList(body) : extractAppointmentBucket(body, "past").length
        ? extractAppointmentBucket(body, "past")
        : extractAppointmentList(body);
    const cards = rows.filter((r) => !isMedicalAppointment(r)).map((r) => buildApptCard(r, bucket, siteBrand));
    const key = (c) => (Number.isFinite(c.startMs) ? c.startMs : bucket === "upcoming" ? Infinity : -Infinity);
    return cards.sort((a, b) => (bucket === "upcoming" ? key(a) - key(b) : key(b) - key(a)));
}
const CLOCK_ICON = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle>' +
    '<path d="M12 7.5V12l3 2"></path></svg>';
const ARROW = '<svg class="cw-btn__arrow" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
function dateTile(c, large = false) {
    const cls = `cw-date${large ? " cw-date--lg" : ""}${c.upcoming ? "" : " cw-date--past"}`;
    if (!c.tile)
        return `<span class="${cls}" aria-hidden="true"><span class="cw-date__day">·</span></span>`;
    return (`<span class="${cls}" aria-hidden="true">` +
        `<span class="cw-date__wk">${escapeHtml(c.tile.wk)}</span>` +
        `<span class="cw-date__day">${escapeHtml(c.tile.day)}</span>` +
        `<span class="cw-date__mon">${escapeHtml(c.tile.mon)}</span></span>`);
}
function chipHTML(c, extraClass = "") {
    return c.chip
        ? `<span class="cw-chip cw-chip--${c.chip.tone}${extraClass ? " " + extraClass : ""}">${escapeHtml(c.chip.label)}</span>`
        : "";
}
function spoken(c) {
    return [c.service, c.longDay ? `on ${c.longDay}` : ""].filter(Boolean).join(" ");
}
/** The card's own buttons: from `actions`, and only from `actions`. */
function cardButtons(c, size = "sm", primaryFirst = false) {
    const a = c.actions;
    const cls = (primary) => `cw-btn ${primary ? "cw-btn--primary" : "cw-btn--secondary"}${size === "sm" ? " cw-btn--sm" : ""}`;
    const out = [];
    const id = escapeHtml(c.id);
    if (a.canPayBalance && c.due > 0) {
        out.push(`<button type="button" class="${cls(primaryFirst && out.length === 0)}" data-cw-action="pay" data-cw-appt="${id}" ` +
            `aria-label="${escapeHtml(`Pay ${eur(c.due)} for ${spoken(c)}`)}">Pay ${escapeHtml(eur(c.due))}</button>`);
    }
    if (c.upcoming && a.canReschedule) {
        out.push(`<button type="button" class="${cls(primaryFirst && out.length === 0)}" data-cw-action="reschedule" data-cw-appt="${id}" ` +
            `aria-label="${escapeHtml(`Reschedule ${spoken(c)}`)}">Reschedule</button>`);
    }
    return out;
}
function reasonHTML(c) {
    // Only for a visit still ahead: a past booking needs no explanation of why
    // it cannot be moved.
    if (!c.upcoming || c.actions.canReschedule || !c.actions.reason)
        return "";
    return `<p class="cw-reason">${CLOCK_ICON}<span>${linkifyPhones(c.actions.reason)}</span></p>`;
}
/** The booking card used on Bookings and in Overview's "Also coming up". */
export function apptCardHTML(c) {
    const buttons = cardButtons(c);
    const reason = reasonHTML(c);
    const meta = [c.clock, c.venue].filter(Boolean).join(" · ");
    const side = `<div class="cw-appt__side">` +
        chipHTML(c, "cw-appt__chip") +
        (buttons.length ? `<div class="cw-actions cw-appt__actions">${buttons.join("")}</div>` : "") +
        `</div>`;
    return (`<article class="cw-appt${c.upcoming ? "" : " cw-appt--past"}" data-cw-card="${escapeHtml(c.id)}">` +
        dateTile(c) +
        `<div class="cw-appt__main">` +
        (c.showBrand ? `<span class="cw-label cw-appt__brand" ${M}>${escapeHtml(c.brand)}</span>` : "") +
        `<h3 class="cw-appt__title" ${M}><a class="cw-appt__link" href="${escapeHtml(c.href)}">${escapeHtml(c.service)}` +
        (c.longDay ? `<span class="cw-vh">, ${escapeHtml(c.longDay)}</span>` : "") +
        `</a></h3>` +
        (meta ? `<p class="cw-appt__meta" ${M}>${escapeHtml(meta)}</p>` : "") +
        `</div>` +
        side +
        (reason ? `<div class="cw-appt__foot">${reason}</div>` : "") +
        `</article>`);
}
/** `/account/bookings/<id>` — the local detail page, when the row has an id. */
export function bookingDetailHref(row) {
    const id = String(row.id ?? row.appointmentId ?? "");
    return id ? `${ACCOUNT_BOOKINGS_HREF}/${encodeURIComponent(id)}` : ACCOUNT_BOOKINGS_HREF;
}
function mapCard(row) {
    const model = buildPanelModel({ upcoming: [row], profile: {}, initials: "" });
    const base = model.visits[0] ?? {
        brand: String(row.brandName ?? ""),
        service: String(row.primaryServiceName ?? ""),
        venue: String(row.locationName ?? ""),
        when: formatWhen(String(row.startTime ?? "")),
        manageHref: ACCOUNT_BOOKINGS_HREF,
    };
    return { ...base, manageHref: bookingDetailHref(row) };
}
export function buildPortalModel(session, view, extra = {}) {
    const base = buildPanelModel(session);
    const s = (session && typeof session === "object" ? session : {});
    const profile = (s.profile && typeof s.profile === "object" ? s.profile : {});
    const country = typeof profile.countryCode === "string" ? profile.countryCode : "";
    const phone = typeof profile.phone === "string" ? profile.phone : "";
    const upcomingSrc = extra.upcomingOverride ?? s.upcoming;
    const upcoming = extractAppointmentList(upcomingSrc ?? s)
        .filter((r) => !isMedicalAppointment(r))
        .map(mapCard);
    const past = extractAppointmentBucket(extra.past ?? s.past, "past")
        .filter((r) => !isMedicalAppointment(r))
        .map(mapCard);
    const siteBrand = extra.siteBrand ?? "";
    const upcomingCards = buildApptCards(upcomingSrc ?? s, "upcoming", siteBrand);
    const pastCards = extra.past === undefined ? [] : buildApptCards(extra.past, "past", siteBrand);
    const first = (typeof profile.firstName === "string" && profile.firstName.trim()) ||
        (base.name.includes("@") || base.name.includes("*") ? "" : base.name.split(/\s+/)[0] || "");
    return {
        ...base,
        visits: upcoming.length ? upcoming : base.visits,
        state: upcoming.length || base.visits.length ? "settled" : base.state,
        view,
        phone: [country, phone].filter(Boolean).join(" ").trim(),
        past,
        firstName: first,
        siteBrand,
        bookHref: extra.bookHref || "/",
        contactPhone: extra.contactPhone || "",
        upcomingCards,
        pastCards,
        upcomingState: extra.upcomingState ?? (upcomingCards.length ? "ok" : "empty"),
        pastState: extra.pastState ?? (pastCards.length ? "ok" : "empty"),
        wallet: extra.wallet ?? null,
        now: extra.now ?? new Date(),
        referRail: extra.referRail === true,
    };
}
/* ── Navigation ────────────────────────────────────────────────────────── */
/**
 * Every section, in rail order. `booking` (the detail page) is deliberately
 * absent: it is reached FROM Bookings and highlights Bookings while you are on it.
 */
export const PORTAL_SECTIONS = [
    { id: "home", href: ACCOUNT_HOME_HREF, label: "Overview", group: "Visits" },
    { id: "bookings", href: ACCOUNT_BOOKINGS_HREF, label: "Bookings", group: "Visits" },
    { id: "wallet", href: "/account/wallet", label: "Wallet", group: "Money" },
    { id: "payments", href: "/account/payments", label: "Payments", group: "Money" },
    { id: "membership", href: "/account/membership", label: "Membership", group: "Money" },
    {
        id: "refer",
        href: "/account/refer",
        label: "Refer a friend",
        group: "Money",
        sites: ["Carisma Aesthetics", "Carisma Hair Clinic", "Carisma Slimming", "Carisma Spa"],
        optIn: true,
    },
    { id: "documents", href: "/account/documents", label: "Documents", group: "You" },
    { id: "details", href: ACCOUNT_DETAILS_HREF, label: "Details", group: "You" },
];
/**
 * The sections this site's rail shows. An opt-in section is off everywhere
 * (its own page included) unless `referRail` is true. A section limited to
 * some sites still shows on its own page.
 */
export function sectionsFor(view, siteBrand = "", referRail = false) {
    return PORTAL_SECTIONS.filter((s) => (!s.optIn || referRail) && (!s.sites || s.id === view || s.sites.includes(siteBrand)));
}
function nav(view, siteBrand = "", referRail = false) {
    const current = view === "booking" ? "bookings" : view;
    const sections = sectionsFor(current, siteBrand, referRail);
    const groups = [];
    for (const s of sections)
        if (!groups.includes(s.group))
            groups.push(s.group);
    return (`<nav class="cw-nav" aria-label="Account">` +
        groups
            .map((g) => `<div class="cw-nav__group"><p class="cw-label cw-nav__label" aria-hidden="true">${g}</p>` +
            sections.filter((s) => s.group === g)
                .map((s) => `<a class="cw-nav__link" href="${s.href}"${current === s.id ? ' aria-current="page"' : ""}>${s.label}</a>`)
                .join("") +
            `</div>`)
            .join("") +
        `</nav>`);
}
function signOutLinks() {
    return (`<div class="cw-signout">` +
        `<button type="button" class="cw-btn cw-btn--quiet" data-carisma-signout>Sign out</button>` +
        `<button type="button" class="cw-btn cw-btn--quiet" data-carisma-signout-all>Sign out of every Carisma site</button>` +
        `</div>`);
}
/**
 * The chrome every section shares: rail (or tabs), the page header, one
 * persistent status region, the body the caller built, and sign-out OUTSIDE
 * the content — at the rail's foot on a desk, the page's foot on a phone.
 *
 * Exported so browser.ts can render a section whose data comes from its own
 * endpoint without that endpoint's shape having to reach PortalModel.
 */
export function portalShellHTML(opts) {
    const name = opts.memberName || "";
    const member = `<div class="cw-member">` +
        (name
            ? `<p class="cw-member__name" ${M}>${escapeHtml(name)}</p>`
            : `<span class="cw-skel cw-skel--line" style="width:60%;height:18px"></span>`) +
        (opts.emailMasked ? `<p class="cw-member__email" ${M}>${escapeHtml(opts.emailMasked)}</p>` : "") +
        `</div>`;
    const lede = opts.lede ? `<p class="cw-lede" ${M}>${opts.lede}</p>` : "";
    return (`<main class="carisma-portal" data-cw-qc="${PORTAL_QC}" data-cw-portal="${escapeHtml(opts.view)}">` +
        `<div class="cw-shell">` +
        `<aside class="cw-rail">${member}${nav(opts.view, opts.siteBrand, opts.referRail === true)}<div class="cw-rail__foot">${signOutLinks()}</div></aside>` +
        `<div class="cw-main">` +
        `<header class="cw-head"><h1 class="cw-title" tabindex="-1" ${M}>${escapeHtml(opts.title)}</h1>${lede}</header>` +
        `<div class="cw-body"${opts.busy ? ' aria-busy="true"' : ""}>${opts.body}</div>` +
        `<footer class="cw-foot">${signOutLinks()}</footer>` +
        `</div></div>` +
        `<div class="cw-status" role="status" aria-live="polite"></div>` +
        `</main>`);
}
/* ── Shared blocks ─────────────────────────────────────────────────────── */
/** The failed-read block. Never the empty state: "you have no bookings" is a lie when we could not ask. */
export function errorBlockHTML(what, phone = "") {
    const tel = phone.replace(/\s+/g, "");
    return (`<div class="cw-error cw-rise" role="alert">` +
        `<p class="cw-error__title">We couldn't load your ${escapeHtml(what)} just now.</p>` +
        `<p class="cw-error__text">Your ${escapeHtml(what)} ${what.endsWith("s") ? "are" : "is"} safe — this is on our side.</p>` +
        `<div class="cw-actions"><button type="button" class="cw-btn cw-btn--secondary cw-btn--sm" data-cw-retry>Try again</button>` +
        (tel ? `<a class="cw-btn cw-btn--quiet" href="tel:${escapeHtml(tel)}">Call ${escapeHtml(formatPhone(phone))}</a>` : "") +
        `</div></div>`);
}
/** The skeleton for a view, painted before any read returns. */
export function skeletonHTML(view) {
    const what = view === "home" || view === "bookings" || view === "booking"
        ? "your bookings"
        : view === "details"
            ? "your details"
            : view === "refer"
                ? "your referrals"
                : `your ${view}`;
    const card = (h) => `<span class="cw-skel cw-skel--card" style="height:${h}px"></span>`;
    const rows = view === "home"
        ? card(340) + `<div class="cw-list">${card(104)}${card(104)}</div>`
        : `<div class="cw-list">${card(104)}${card(104)}${card(104)}</div>`;
    return `<p class="cw-vh">Loading ${escapeHtml(what)}…</p>${rows}`;
}
const CALENDAR_ICON = '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"></rect>' +
    '<path d="M3.5 9.5h17M8 3v4M16 3v4M12 13v4M10 15h4"></path></svg>';
/** The door to this brand's own booking, worded for the brand. */
export function bookCtaLabel(siteBrand) {
    const k = brandKey(siteBrand);
    if (k.includes("slimming"))
        return "Book your free body analysis";
    if (k.includes("pulse"))
        return "Book a club tour";
    if (k.includes("spa"))
        return "Book a spa day";
    if (k.includes("aesthetics") || k.includes("hair"))
        return "Book a free consultation";
    return "Book a treatment";
}
function emptyVisitsHTML(m, title, text) {
    return (`<section class="cw-empty cw-rise">` +
        `<span class="cw-empty__icon">${CALENDAR_ICON}</span>` +
        `<h2 class="cw-t2">${escapeHtml(title)}</h2>` +
        `<p class="cw-empty__text">${escapeHtml(text)}</p>` +
        `<a class="cw-btn cw-btn--primary" href="${escapeHtml(m.bookHref)}">${escapeHtml(bookCtaLabel(m.siteBrand))}</a>` +
        `</section>`);
}
/* ── Overview ──────────────────────────────────────────────────────────── */
/** "Good evening" on the Malta clock, never the handset's. */
export function greetingFor(now = new Date()) {
    const h = Number(parts(now.getTime(), { hour: "2-digit", hour12: false }));
    if (!Number.isFinite(h))
        return "Hello";
    if (h >= 5 && h < 12)
        return "Good morning";
    if (h >= 12 && h < 18)
        return "Good afternoon";
    return "Good evening";
}
function nextVisitHTML(c, now) {
    const a = c.actions;
    // One primary: Pay > Reschedule > Confirm. The next one down is secondary.
    const buttons = [];
    if (a.canPayBalance && c.due > 0)
        buttons.push({ action: "pay", label: `Pay ${eur(c.due)}`, aria: `Pay ${eur(c.due)} for ${spoken(c)}` });
    if (a.canReschedule)
        buttons.push({ action: "reschedule", label: "Reschedule", aria: `Reschedule ${spoken(c)}` });
    if (a.canConfirm && c.status !== "CONFIRMED")
        buttons.push({ action: "confirm", label: "Confirm I'm coming", aria: `Confirm you're coming to ${spoken(c)}` });
    const btns = buttons
        .slice(0, 2)
        .map((b, i) => `<button type="button" class="cw-btn ${i === 0 ? "cw-btn--primary" : "cw-btn--secondary"}" data-cw-action="${b.action}" ` +
        `data-cw-appt="${escapeHtml(c.id)}" aria-label="${escapeHtml(b.aria)}">${escapeHtml(b.label)}</button>`)
        .join("");
    const details = `<a class="cw-btn cw-btn--quiet" href="${escapeHtml(c.href)}">View booking</a>`;
    const rel = c.upcoming && c.startIso ? untilPhrase(c.startIso, now) : "";
    const where = [c.venue, c.showBrand ? c.brand : ""].filter(Boolean).join(" · ");
    return (`<section class="cw-next cw-rise" aria-labelledby="cw-next-title">` +
        `<div class="cw-next__top"><h2 class="cw-label" id="cw-next-title">Your next visit</h2>${chipHTML(c)}</div>` +
        `<div class="cw-next__row">${dateTile(c, true)}<div class="cw-next__text">` +
        `<p class="cw-next__title" ${M}><a class="cw-next__link" href="${escapeHtml(c.href)}">${escapeHtml(c.service)}</a></p>` +
        (c.longDay ? `<p class="cw-next__when" ${M}>${escapeHtml(c.longDay)}</p>` : "") +
        `<p class="cw-next__where" ${M}>${escapeHtml([c.clock, where].filter(Boolean).join(" · "))}</p>` +
        (rel ? `<p class="cw-next__rel">${escapeHtml(rel.charAt(0).toUpperCase() + rel.slice(1))}</p>` : "") +
        `</div></div>` +
        reasonHTML(c) +
        `<div class="cw-actions">${btns}${details}</div>` +
        `</section>`);
}
const HOUR = 3_600_000;
/**
 * "Needs you": things the member can settle right now, one action each, at
 * most three. Every row exists because the SERVER put a capability on the
 * booking; the clock only decides whether a deadline is near enough to mention.
 */
export function needsYou(m, excludeId = "") {
    const now = m.now.getTime();
    const out = [];
    const cards = [...m.upcomingCards, ...m.pastCards];
    for (const c of cards) {
        if (c.id === excludeId)
            continue;
        const a = c.actions;
        const when = [c.shortDay, c.upcoming ? c.clock : ""].filter(Boolean).join(", ");
        if (a.canPayBalance && c.due > 0) {
            out.push({
                card: c,
                title: c.status === "NO_SHOW" ? `Missed-visit fee · ${eur(c.due)}` : `${eur(c.due)} to pay`,
                sub: [c.service, when].filter(Boolean).join(" · "),
                action: "pay",
                label: `Pay ${eur(c.due)}`,
                calm: false,
            });
            continue;
        }
        if (!c.upcoming)
            continue;
        const closes = a.rescheduleClosesAt ? Date.parse(a.rescheduleClosesAt) : NaN;
        if (a.canReschedule && Number.isFinite(closes) && closes - now > 0 && closes - now < 48 * HOUR) {
            out.push({
                card: c,
                title: `Online changes close ${untilPhrase(a.rescheduleClosesAt, m.now)}`,
                sub: [c.service, when].filter(Boolean).join(" · "),
                action: "reschedule",
                label: "Reschedule",
                calm: true,
            });
            continue;
        }
        if (a.canConfirm && c.status !== "CONFIRMED" && Number.isFinite(c.startMs) && c.startMs - now < 48 * HOUR) {
            out.push({
                card: c,
                title: "Let us know you're coming",
                sub: [c.service, when].filter(Boolean).join(" · "),
                action: "confirm",
                label: "Confirm",
                calm: true,
            });
        }
    }
    return out.slice(0, 3);
}
const DUE_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2.5"></rect><path d="M3 10.5h18M7 15h3"></path></svg>';
const TIME_ICON = CLOCK_ICON.replace('width="16" height="16"', 'width="18" height="18"').replace('stroke-width="1.25"', 'stroke-width="1.5"');
const WALLET_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"></path><rect x="4" y="8" width="16.5" height="11" rx="2.5"></rect>' +
    '<path d="M16 13.5h1.5"></path></svg>';
function needsHTML(rows) {
    if (!rows.length)
        return "";
    return (`<section class="cw-section cw-rise" aria-labelledby="cw-needs-title">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-needs-title">Needs you</h2></div>` +
        `<div class="cw-needs">` +
        rows
            .map((r) => `<div class="cw-need">` +
            `<span class="cw-need__icon${r.calm ? " cw-need__icon--calm" : ""}">${r.action === "pay" ? DUE_ICON : TIME_ICON}</span>` +
            `<div class="cw-need__text"><p class="cw-need__title" ${M}>${escapeHtml(r.title)}</p>` +
            `<p class="cw-need__sub" ${M}>${escapeHtml(r.sub)}</p></div>` +
            `<button type="button" class="cw-btn cw-btn--secondary cw-btn--sm" data-cw-action="${r.action}" ` +
            `data-cw-appt="${escapeHtml(r.card.id)}" aria-label="${escapeHtml(`${r.label} — ${spoken(r.card)}`)}">${escapeHtml(r.label)}</button>` +
            `</div>`)
            .join("") +
        `</div></section>`);
}
/** "€85.00 credit · 2 gift cards · 4 of 6 sessions left" — or "" when there is no value. */
export function walletSummary(w) {
    if (!w || w.isEmpty)
        return "";
    const bits = [];
    if (w.credit > 0)
        bits.push(`${eur(w.credit)} credit`);
    const live = w.giftCards.filter((g) => g.balance > 0);
    if (live.length)
        bits.push(`${live.length} gift card${live.length === 1 ? "" : "s"}`);
    const pack = w.packages.find((p) => p.sessionsLeft !== null && (p.sessionsLeft ?? 0) > 0);
    if (pack) {
        bits.push(pack.sessionsTotal !== null
            ? `${pack.sessionsLeft} of ${pack.sessionsTotal} sessions left`
            : `${pack.sessionsLeft} sessions left`);
    }
    return bits.join(" · ");
}
function walletStripHTML(w) {
    const text = walletSummary(w);
    if (!text)
        return "";
    return (`<a class="cw-strip cw-rise" href="/account/wallet">` +
        `<span class="cw-strip__icon">${WALLET_ICON}</span>` +
        `<span class="cw-strip__text"><span class="cw-strip__label">Your wallet</span>` +
        `<span class="cw-strip__value" ${M}>${escapeHtml(text)}</span></span>` +
        `<span class="cw-strip__arrow" aria-hidden="true">${ARROW.replace('class="cw-btn__arrow" ', "")}</span></a>`);
}
export function overviewBodyHTML(m) {
    if (m.upcomingState === "failed") {
        return errorBlockHTML("bookings", m.contactPhone) + needsHTML(needsYou(m)) + walletStripHTML(m.wallet);
    }
    const [next, ...rest] = m.upcomingCards;
    if (!next) {
        const needs = needsHTML(needsYou(m));
        return (emptyVisitsHTML(m, "Your next visit starts here.", "This is where your visits, gift cards and membership will live.") +
            needs +
            walletStripHTML(m.wallet));
    }
    const also = rest.slice(0, 2);
    const alsoHTML = also.length
        ? `<section class="cw-section cw-rise" aria-labelledby="cw-also-title">` +
            `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-also-title">Also coming up</h2>` +
            `<a class="cw-section__more" href="${ACCOUNT_BOOKINGS_HREF}">All bookings (${m.upcomingCards.length})${ARROW}</a></div>` +
            `<div class="cw-list">${also.map(apptCardHTML).join("")}</div></section>`
        : "";
    return nextVisitHTML(next, m.now) + needsHTML(needsYou(m, next.id)) + alsoHTML + walletStripHTML(m.wallet);
}
/* ── Bookings ──────────────────────────────────────────────────────────── */
export function bookingsBodyHTML(m) {
    const section = (id, title, cards, count = true) => `<section class="cw-section cw-rise" aria-labelledby="cw-${id}-title">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-${id}-title">${title}` +
        (count ? `<span class="cw-section__count">${cards.length}</span>` : "") +
        `</h2></div>` +
        `<div class="cw-list">${cards.map(apptCardHTML).join("")}</div></section>`;
    const upcoming = m.upcomingState === "failed"
        ? errorBlockHTML("bookings", m.contactPhone)
        : m.upcomingCards.length
            ? section("upcoming", "Upcoming", m.upcomingCards)
            : emptyVisitsHTML(m, "Nothing booked yet", "When you book, your visits appear here — with everything you can change.");
    const past = m.pastState === "failed"
        ? `<section class="cw-section"><div class="cw-section__head"><h2 class="cw-section__title">Past</h2></div>${errorBlockHTML("past visits", m.contactPhone)}</section>`
        : m.pastCards.length
            ? section("past", "Past", m.pastCards)
            : "";
    return upcoming + past;
}
/* ── Details ───────────────────────────────────────────────────────────── */
export function detailsBodyHTML(m) {
    const fact = (label, value) => `<div class="cw-fact"><dt class="cw-label">${label}</dt><dd class="cw-fact__value" ${M}>${escapeHtml(value || "—")}</dd></div>`;
    return (`<section class="cw-card cw-rise"><dl class="cw-facts">` +
        fact("Name", m.name) +
        fact("Mobile", m.phone) +
        fact("Email", m.emailMasked) +
        `</dl>` +
        `<p class="cw-fine cw-prose cw-details__note">To change these, ask the team at the desk — this page is your record, not a form.</p>` +
        `</section>`);
}
/* ── Titles and ledes ──────────────────────────────────────────────────── */
function nextLede(m) {
    const n = m.upcomingCards.length;
    const next = m.upcomingCards[0];
    if (m.upcomingState === "failed")
        return "";
    if (!n)
        return "Nothing booked yet.";
    return `${n} upcoming${next?.shortDay ? ` · next on <strong>${escapeHtml(next.shortDay)}</strong>` : ""}`;
}
export function portalTitle(m) {
    if (m.view === "bookings")
        return "Your bookings";
    if (m.view === "details")
        return "Your details";
    const greet = greetingFor(m.now);
    return m.firstName ? `${greet}, ${m.firstName}` : `${greet}`;
}
export function accountPortalHTML(model) {
    const view = model.view;
    let body = "";
    let lede = "";
    if (view === "details") {
        body = detailsBodyHTML(model);
    }
    else if (view === "bookings") {
        body = bookingsBodyHTML(model);
        lede = nextLede(model);
    }
    else {
        body = overviewBodyHTML(model);
        lede = nextLede(model);
    }
    return portalShellHTML({
        view,
        title: portalTitle(model),
        emailMasked: model.emailMasked,
        body,
        lede,
        memberName: model.firstName || model.name || "Your account",
        siteBrand: model.siteBrand,
        referRail: model.referRail,
    });
}
//# sourceMappingURL=portal.js.map