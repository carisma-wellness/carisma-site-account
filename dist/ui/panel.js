/**
 * The account side panel (design section 5). Opened on a click, never on page load:
 * the header renders from the hint cookie, and the panel makes the ONE authenticated
 * read (GET /api/auth/session?include=upcoming) when the person opens it (W-3, W-16).
 *
 * This module is the pure part: buildPanelModel maps the session response to a view
 * model, and accountPanelHTML renders it. Both apply the rules that bind the panel:
 *   - every personal string carries data-clarity-mask="True" (W-25);
 *   - this brand's rows only, and a belt-and-braces exclusion of any Medical row on
 *     top of the repository-level guarantee (W-15) — if the server exclusion ever
 *     regresses, the brand name is the thing that would print "Carisma Medical" on a
 *     spa page, so the panel refuses it a second time here;
 *   - hub links are built through the site's own door (urls.ts) so the person arrives
 *     signed in; the brand sites never rebuild cancel/reschedule/pay UI.
 */
import { hubStartUrl, startUrl } from "../urls.js";
import { escapeHtml } from "./html.js";
/** A row is Medical if its brand slug or name says so. Belt over the server exclusion. */
function isMedical(row) {
    const brand = (row.brand ?? row.brandLocation?.brand ?? {});
    const slug = String(brand.slug ?? row.brandSlug ?? "").toLowerCase();
    const name = String(brand.name ?? "").toLowerCase();
    return slug === "carisma-medical" || slug === "medical" || name.includes("medical");
}
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
    const direct = pick(row, ["service", "name"]);
    if (direct)
        return direct;
    const participants = row.participants;
    const services = participants?.[0]?.services;
    const svc = services?.[0]?.service;
    return typeof svc?.name === "string" ? svc.name : "";
}
function mapVisit(row) {
    const brand = pick(row, ["brand", "name"]) || pick(row, ["brandLocation", "brand", "name"]);
    const venue = pick(row, ["location", "name"]) || pick(row, ["brandLocation", "location", "name"]);
    const when = pick(row, ["startTime"]) || pick(row, ["startsAt"]) || "";
    const id = String(row.id ?? row.appointmentId ?? "");
    return {
        brand,
        service: firstService(row),
        venue,
        when,
        manageHref: id ? hubStartUrl(`/users/appointments/${id}`) : hubStartUrl("/users/appointments"),
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
    const rawUpcoming = Array.isArray(s.upcoming) ? s.upcoming : [];
    const visits = rawUpcoming
        .filter((r) => r && typeof r === "object" && !isMedical(r))
        .slice(0, 3)
        .map(mapVisit);
    return {
        name,
        emailMasked,
        initials,
        visits,
        hub: {
            appointments: startUrl("/users/appointments"),
            giftCards: startUrl("/users/gift-cards"),
            details: startUrl("/users/profile"),
        },
        state: visits.length ? "settled" : "empty",
    };
}
const M = 'data-clarity-mask="True"';
/** Render the settled panel. Every personal string carries the recorder mask. */
export function accountPanelHTML(model) {
    const header = `<header class="carisma-panel__header">` +
        `<span class="carisma-panel__initials" ${M} aria-hidden="true">${escapeHtml(model.initials)}</span>` +
        `<span class="carisma-panel__name" ${M}>${escapeHtml(model.name)}</span>` +
        `<span class="carisma-panel__email" ${M}>${escapeHtml(model.emailMasked)}</span>` +
        `</header>`;
    const rows = model.state === "empty"
        ? `<p class="carisma-panel__empty">You have no upcoming visits.</p>` +
            `<a class="carisma-panel__book" href="/member">Book a treatment</a>`
        : model.visits
            .map((v) => `<article class="carisma-panel__visit" ${M}>` +
            `<span class="carisma-panel__brand">${escapeHtml(v.brand)}</span>` +
            `<span class="carisma-panel__when">${escapeHtml(v.when)}</span>` +
            `<span class="carisma-panel__service">${escapeHtml(v.service)}</span>` +
            `<span class="carisma-panel__venue">${escapeHtml(v.venue)}</span>` +
            `<a class="carisma-panel__manage" href="${escapeHtml(v.manageHref)}">Manage</a>` +
            `</article>`)
            .join("");
    const links = `<nav class="carisma-panel__links">` +
        `<a href="${escapeHtml(model.hub.appointments)}">All my bookings</a>` +
        `<a href="${escapeHtml(model.hub.giftCards)}">Gift cards</a>` +
        `<a href="${escapeHtml(model.hub.details)}">My details</a>` +
        `</nav>`;
    const footer = `<footer class="carisma-panel__footer">` +
        `<button type="button" data-carisma-signout>Sign out</button>` +
        `<button type="button" data-carisma-signout-all>Sign out everywhere</button>` +
        `</footer>`;
    return `<section class="carisma-panel" role="dialog" aria-label="Your account">${header}<div class="carisma-panel__visits">${rows}</div>${links}${footer}</section>`;
}
//# sourceMappingURL=panel.js.map