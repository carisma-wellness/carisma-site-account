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
import {
  CIRCLE_HREF,
  circlePanelStateHTML,
  readCircleSummaryState,
  type CircleLeftModel,
  type CircleSummary,
  type CircleSummaryState,
  type PanelCircleExtras,
} from "./circle.js";

export const ACCOUNT_HOME_HREF = "/account";
export const ACCOUNT_BOOKINGS_HREF = "/account/bookings";
export const ACCOUNT_DETAILS_HREF = "/account/details";
export const PANEL_QC = "account-panel-20260917";

export interface PanelVisit {
  brand: string;
  service: string;
  venue: string;
  when: string;
  manageHref: string;
}

export interface PanelModel {
  name: string;
  emailMasked: string;
  initials: string;
  visits: PanelVisit[];
  hub: { home: string; appointments: string; details: string };
  state: "settled" | "empty";
  /**
   * Carisma Circle v2, when the session read carried `loyalty` (asked for with
   * `include=upcoming,loyalty`; the session folds `/client/loyalty/summary`, the
   * read-model row) AND it said enabled:true. Null otherwise — and a null
   * draws nothing, so the panel is exactly what it was.
   */
  circle: CircleSummary | null;
  /** A member who left Carisma Circle (B3b): the date and Rejoin only. Null otherwise. */
  circleLeft: CircleLeftModel | null;
  /** Under the minimum age (R5.4): one line only. Null otherwise. */
  circleMinor: { minAge: number | null } | null;
}

/** The panel model's Circle part as one state (null = nothing to draw). */
export function panelCircleState(model: PanelModel): CircleSummaryState | null {
  if (model.circle) return { kind: "live", summary: model.circle };
  if (model.circleLeft) return { kind: "left", left: model.circleLeft };
  if (model.circleMinor) return { kind: "minor", minAge: model.circleMinor.minAge };
  return null;
}

/** The panel's one read. With Circle on, the session route folds the member's loyalty answer in (no second call). */
export const PANEL_SESSION_URL = "/api/auth/session?include=upcoming";
export const PANEL_SESSION_URL_CIRCLE = "/api/auth/session?include=upcoming,loyalty";

function pick(row: Record<string, unknown>, path: string[]): string {
  let cur: unknown = row;
  for (const key of path) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[key];
    else return "";
  }
  return typeof cur === "string" ? cur : "";
}

function firstService(row: Record<string, unknown>): string {
  const card = typeof row.primaryServiceName === "string" ? row.primaryServiceName : "";
  if (direct(card)) return card;
  const named = pick(row, ["service", "name"]);
  if (direct(named)) return named;
  const participants = row.participants as Array<Record<string, unknown>> | undefined;
  const services = participants?.[0]?.services as Array<Record<string, unknown>> | undefined;
  const svc = services?.[0]?.service as Record<string, unknown> | undefined;
  return typeof svc?.name === "string" ? svc.name : "";
}

function direct(s: string): string {
  return s.trim();
}

function mapVisit(row: Record<string, unknown>): PanelVisit {
  const brand =
    (typeof row.brandName === "string" && row.brandName) ||
    pick(row, ["brand", "name"]) ||
    pick(row, ["brandLocation", "brand", "name"]);
  const venue =
    (typeof row.locationName === "string" && row.locationName) ||
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

function upcomingFrom(session: Record<string, unknown>): Array<Record<string, unknown>> {
  if (Array.isArray(session.upcoming)) return session.upcoming as Array<Record<string, unknown>>;
  return extractAppointmentList(session.upcoming);
}

function circleOf(loyalty: unknown): Pick<PanelModel, "circle" | "circleLeft" | "circleMinor"> {
  const st = readCircleSummaryState(loyalty);
  return {
    circle: st?.kind === "live" ? st.summary : null,
    circleLeft: st?.kind === "left" ? st.left : null,
    circleMinor: st?.kind === "minor" ? { minAge: st.minAge } : null,
  };
}

/** Map the /api/auth/session?include=upcoming body to the panel view model. */
export function buildPanelModel(session: unknown): PanelModel {
  const s = (session && typeof session === "object" ? session : {}) as Record<string, unknown>;
  const profile = (s.profile && typeof s.profile === "object" ? s.profile : {}) as Record<string, unknown>;
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
    ...circleOf(s.loyalty),
  };
}

const M = 'data-clarity-mask="True"';

/**
 * Render the settled panel. Every personal string carries the recorder mask.
 * `circle` = what the menu's Circle block may add once the member read and the
 * featured read answer (the unlock line, the "Yours now" row, posters).
 */
export function accountPanelHTML(model: PanelModel, circle: PanelCircleExtras = {}): string {
  const header =
    `<header class="carisma-panel__header">` +
    `<span class="carisma-panel__initials" ${M} aria-hidden="true">${escapeHtml(model.initials)}</span>` +
    `<span class="carisma-panel__name" ${M}>${escapeHtml(model.name || "Your account")}</span>` +
    `<span class="carisma-panel__email" ${M}>${escapeHtml(model.emailMasked)}</span>` +
    `</header>` +
    `<button type="button" class="carisma-panel__close" data-carisma-panel-close aria-label="Close">×</button>`;

  const rows =
    model.state === "empty"
      ? `<p class="carisma-panel__empty">You have no upcoming visits.</p>` +
        `<a class="carisma-panel__book" href="/">Book a treatment</a>`
      : model.visits
          .map(
            (v) =>
              `<article class="carisma-panel__visit" ${M}>` +
              `<span class="carisma-panel__when">${escapeHtml(v.when)}</span>` +
              `<span class="carisma-panel__service">${escapeHtml(v.service)}</span>` +
              `<span class="carisma-panel__venue">${escapeHtml(v.venue)}</span>` +
              `<span class="carisma-panel__brand">${escapeHtml(v.brand)}</span>` +
              `<a class="carisma-panel__manage" href="${escapeHtml(v.manageHref)}">View booking</a>` +
              `</article>`,
          )
          .join("");

  const links =
    `<nav class="carisma-panel__links">` +
    `<a href="${escapeHtml(model.hub.home)}">My account</a>` +
    `<a href="${escapeHtml(model.hub.appointments)}">My bookings</a>` +
    (model.circle || model.circleLeft ? `<a href="${CIRCLE_HREF}">Credit &amp; rewards</a>` : "") +
    `<a href="${escapeHtml(model.hub.details)}">My details</a>` +
    `</nav>`;

  const footer =
    `<footer class="carisma-panel__footer">` +
    `<button type="button" data-carisma-signout>Sign out</button>` +
    `<button type="button" data-carisma-signout-all>Sign out of every Carisma site</button>` +
    `</footer>`;

  return (
    `<section class="carisma-panel" role="dialog" aria-modal="true" aria-label="Your account" data-cw-qc="${PANEL_QC}">` +
    `${header}${panelCircleSlotHTML(model, circle)}<div class="carisma-panel__visits">${rows}</div>${links}${footer}</section>`
  );
}

/** The menu's Circle block in its own slot, so browser.ts can redraw it when the extra reads answer. "" when off. */
export function panelCircleSlotHTML(model: PanelModel, circle: PanelCircleExtras = {}): string {
  const html = circlePanelStateHTML(panelCircleState(model), circle);
  return html ? `<div class="carisma-panel__circle-slot" data-cw-circle-slot="menu">${html}</div>` : "";
}
