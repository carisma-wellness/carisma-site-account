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
export const ACCOUNT_HOME_HREF = "/account";
export const ACCOUNT_BOOKINGS_HREF = "/account/bookings";
export const ACCOUNT_DETAILS_HREF = "/account/details";
export const PANEL_QC = "account-panel-20260917";
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
/** Map the /api/auth/session?include=upcoming body to the panel view model. */
export function buildPanelModel(session) {
    const s = (session && typeof session === "object" ? session : {});
    const profile = (s.profile && typeof s.profile === "object" ? s.profile : {});
    const firstName = String(profile.firstName ?? "");
    const lastName = String(profile.lastName ?? "");
    const emailMasked = String(profile.emailMasked ?? "");
    const name = `${firstName} ${lastName}`.trim() || emailMasked.split("@")[0] || "";
    const initials = String(s.initials ?? profile.initials ?? "");
    const visits = upcomingFrom(s)
        .filter((r) => r && typeof r === "object" && !isMedicalAppointment(r))
        .slice(0, 3)
        .map(mapVisit);
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
    };
}
const M = 'data-clarity-mask="True"';
/** Render the settled panel. Every personal string carries the recorder mask. */
export function accountPanelHTML(model) {
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
        `<a href="${escapeHtml(model.hub.details)}">My details</a>` +
        `</nav>`;
    const footer = `<footer class="carisma-panel__footer">` +
        `<button type="button" data-carisma-signout>Sign out</button>` +
        `<button type="button" data-carisma-signout-all>Sign out of every Carisma site</button>` +
        `</footer>`;
    return (`<section class="carisma-panel" role="dialog" aria-modal="true" aria-label="Your account" data-cw-qc="${PANEL_QC}">` +
        `${header}<div class="carisma-panel__visits">${rows}</div>${links}${footer}</section>`);
}
//# sourceMappingURL=panel.js.map