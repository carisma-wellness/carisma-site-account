/**
 * The account side panel (design section 5). Opened on a click, never on page load:
 * the header renders from the hint cookie, and the panel makes the ONE authenticated
 * read (GET /api/auth/session?include=upcoming) when the person opens it (W-3, W-16).
 *
 * Hub links are same-origin /account pages on this brand site — the person is already
 * signed in here, so they do not go through /api/auth/start, and they never land on
 * the HOD /users dashboard (which 404s on a brand origin).
 */
import { escapeHtml } from "./html.js";
import { extractAppointmentList, formatWhen, isMedicalAppointment } from "./appointments.js";
import { CIRCLE_HREF, circlePanelStateHTML, countWord, readCircleSummaryState, } from "./circle.js";
export const ACCOUNT_HOME_HREF = "/account";
export const ACCOUNT_BOOKINGS_HREF = "/account/bookings";
export const ACCOUNT_DETAILS_HREF = "/account/details";
export const PANEL_QC = "account-panel-20260917";
/** The panel model's Circle part as one state (null = nothing to draw). */
export function panelCircleState(model) {
    if (model.circle)
        return { kind: "live", summary: model.circle };
    if (model.circleLeft)
        return { kind: "left", left: model.circleLeft };
    if (model.circleMinor)
        return { kind: "minor", minAge: model.circleMinor.minAge };
    return null;
}
/** The panel's one read. With Circle on, the session route folds the member's loyalty answer in (no second call). */
export const PANEL_SESSION_URL = "/api/auth/session?include=upcoming";
export const PANEL_SESSION_URL_CIRCLE = "/api/auth/session?include=upcoming,loyalty";
function pick(row, path) {
    let cur = row;
    for (const key of path) {
        if (cur && typeof cur === "object")
            cur = cur[key];
        else
            return "";
    }
    return typeof cur === "string" ? cur : "";
}
function firstService(row) {
    const card = typeof row.primaryServiceName === "string" ? row.primaryServiceName : "";
    if (direct(card))
        return card;
    const named = pick(row, ["service", "name"]);
    if (direct(named))
        return named;
    const participants = row.participants;
    const services = participants?.[0]?.services;
    const svc = services?.[0]?.service;
    return typeof svc?.name === "string" ? svc.name : "";
}
function direct(s) {
    return s.trim();
}
function mapVisit(row) {
    const brand = (typeof row.brandName === "string" && row.brandName) ||
        pick(row, ["brand", "name"]) ||
        pick(row, ["brandLocation", "brand", "name"]);
    const venue = (typeof row.locationName === "string" && row.locationName) ||
        pick(row, ["location", "name"]) ||
        pick(row, ["brandLocation", "location", "name"]);
    const rawWhen = pick(row, ["startTime"]) || pick(row, ["startsAt"]) || "";
    return {
        brand,
        service: firstService(row),
        venue,
        when: formatWhen(rawWhen),
        manageHref: ACCOUNT_BOOKINGS_HREF,
    };
}
function upcomingFrom(session) {
    if (Array.isArray(session.upcoming))
        return session.upcoming;
    return extractAppointmentList(session.upcoming);
}
function circleOf(loyalty) {
    const st = readCircleSummaryState(loyalty);
    return {
        circle: st?.kind === "live" ? st.summary : null,
        circleLeft: st?.kind === "left" ? st.left : null,
        circleMinor: st?.kind === "minor" ? { minAge: st.minAge } : null,
    };
}
/** Map the /api/auth/session?include=upcoming body to the panel view model. */
export function buildPanelModel(session) {
    const s = (session && typeof session === "object" ? session : {});
    const profile = (s.profile && typeof s.profile === "object" ? s.profile : {});
    const firstName = String(profile.firstName ?? "");
    const lastName = String(profile.lastName ?? "");
    const emailMasked = String(profile.emailMasked ?? "");
    const name = `${firstName} ${lastName}`.trim() || emailMasked.split("@")[0] || "";
    const initials = String(s.initials ?? profile.initials ?? "");
    const rows = upcomingFrom(s)
        .filter((r) => r && typeof r === "object" && !isMedicalAppointment(r))
        .slice(0, 3);
    const visits = rows.map(mapVisit);
    return {
        name,
        emailMasked,
        initials,
        visits,
        hub: {
            home: ACCOUNT_HOME_HREF,
            appointments: ACCOUNT_BOOKINGS_HREF,
            details: ACCOUNT_DETAILS_HREF,
        },
        state: visits.length ? "settled" : "empty",
        ...circleOf(s.loyalty),
        circleEligibleAll: rows.every((r) => r.circleEligible === true),
    };
}
const M = 'data-clarity-mask="True"';
/**
 * Render the settled panel. Every personal string carries the recorder mask.
 * `circle` = what the menu's Circle block may add once the member read and the
 * featured read answer (the unlock line, the "Yours now" row, posters).
 * `places` (ADDENDUM KIT-6, each default true): `menu: false` leaves the Circle
 * Card out of the menu, `rewards: false` the "Credit & rewards" link.
 */
export function accountPanelHTML(model, circle = {}, places = {}) {
    // KIT-6 `circleListing: "strict"`: no Circle Card beside a listed visit the server did not mark eligible.
    const menu = places.menu !== false && (places.listing !== "strict" || model.circleEligibleAll);
    const rewards = places.rewards !== false;
    // ADDENDUM KIT-1 (board 11): with her live Circle Card in the menu, the menu is the board's — the Card, then the
    // rows with their subtitles, then Sign out. Off, left, under 18 or the Card not shown here: today's panel, byte for byte.
    const live = menu && Boolean(model.circle);
    const header = `<header class="carisma-panel__header">` +
        `<span class="carisma-panel__initials" ${M} aria-hidden="true">${escapeHtml(model.initials)}</span>` +
        `<span class="carisma-panel__name" ${M}>${escapeHtml(model.name || "Your account")}</span>` +
        `<span class="carisma-panel__email" ${M}>${escapeHtml(model.emailMasked)}</span>` +
        `</header>` +
        `<button type="button" class="carisma-panel__close" data-carisma-panel-close aria-label="Close">×</button>`;
    const rows = model.state === "empty"
        ? `<p class="carisma-panel__empty">You have no upcoming visits.</p>` +
            `<a class="carisma-panel__book" href="/">Book a treatment</a>`
        : model.visits
            .map((v) => `<article class="carisma-panel__visit" ${M}>` +
            `<span class="carisma-panel__when">${escapeHtml(v.when)}</span>` +
            `<span class="carisma-panel__service">${escapeHtml(v.service)}</span>` +
            `<span class="carisma-panel__venue">${escapeHtml(v.venue)}</span>` +
            `<span class="carisma-panel__brand">${escapeHtml(v.brand)}</span>` +
            `<a class="carisma-panel__manage" href="${escapeHtml(v.manageHref)}">View booking</a>` +
            `</article>`)
            .join("");
    const links = `<nav class="carisma-panel__links">` +
        `<a href="${escapeHtml(model.hub.home)}">My account</a>` +
        `<a href="${escapeHtml(model.hub.appointments)}">My bookings</a>` +
        (rewards && (model.circle || model.circleLeft) ? `<a href="${CIRCLE_HREF}">Credit &amp; rewards</a>` : "") +
        `<a href="${escapeHtml(model.hub.details)}">My details</a>` +
        `</nav>`;
    const footer = `<footer class="carisma-panel__footer">` +
        `<button type="button" data-carisma-signout>Sign out</button>` +
        `<button type="button" data-carisma-signout-all>Sign out of every Carisma site</button>` +
        `</footer>`;
    if (live) {
        return (`<section class="carisma-panel carisma-panel--circle" role="dialog" aria-modal="true" aria-label="Your account and Carisma credit" data-cw-qc="${PANEL_QC}">` +
            `${header}${panelCircleSlotHTML(model, circle)}${panelCircleRowsHTML(model, rewards)}${footer}</section>`);
    }
    return (`<section class="carisma-panel" role="dialog" aria-modal="true" aria-label="Your account" data-cw-qc="${PANEL_QC}">` +
        `${header}${menu ? panelCircleSlotHTML(model, circle) : ""}<div class="carisma-panel__visits">${rows}</div>${links}${footer}</section>`);
}
const CHEVRON = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>';
/**
 * Board 11's account rows, each with its subtitle: "Overview"; "Bookings" with her next visit ("Fri 20 Nov, 15:00");
 * "Credit and rewards" with what it holds — "Activity, ways to earn, all five levels", the count from the API's
 * levels (browser.ts fills it once the public status answers; never a typed "five"); "Details" kept.
 */
export function panelCircleRowsHTML(model, rewards = true) {
    const next = model.visits[0]?.when ?? "";
    const row = (href, title, sub, attrs = "") => `<li><a href="${escapeHtml(href)}"${attrs}><b>${title}</b>${sub}${CHEVRON}</a></li>`;
    return (`<ul class="carisma-panel__rows" data-cw-circle="menu-rows">` +
        row(model.hub.home, "Overview", "") +
        row(model.hub.appointments, "Bookings", next ? `<small ${M}>${escapeHtml(next)}</small>` : "") +
        (rewards ? row(CIRCLE_HREF, "Credit and rewards", `<small data-cw-circle-levels-sub hidden></small>`) : "") +
        row(model.hub.details, "Details", "") +
        `</ul>`);
}
/** The Credit and rewards row's subtitle once the level count is known: "Activity, ways to earn, all five levels". */
export function panelRewardsSubText(levelCount) {
    return levelCount > 0 ? `Activity, ways to earn, all ${countWord(levelCount)} levels` : "";
}
/** The menu's Circle block in its own slot, so browser.ts can redraw it when the extra reads answer. "" when off. */
export function panelCircleSlotHTML(model, circle = {}) {
    const html = circlePanelStateHTML(panelCircleState(model), circle);
    return html ? `<div class="carisma-panel__circle-slot" data-cw-circle-slot="menu">${html}</div>` : "";
}
//# sourceMappingURL=panel.js.map