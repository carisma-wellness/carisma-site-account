/**
 * The same-origin member portal at /account, /account/bookings, /account/details.
 * Medical stays on my.carismamedical.com; these pages are the salon-brand portal
 * (Spa, Aesthetics, Slimming, Pulse, Hair Clinic). Profile writes stay off the
 * brand proxy (W-24 / allowlist); this surface is read + sign-out.
 */
import { escapeHtml } from "./html.js";
import {
  extractAppointmentBucket,
  extractAppointmentList,
  formatWhen,
  isMedicalAppointment,
} from "./appointments.js";
import {
  ACCOUNT_BOOKINGS_HREF,
  ACCOUNT_DETAILS_HREF,
  ACCOUNT_HOME_HREF,
  buildPanelModel,
  type PanelModel,
  type PanelVisit,
} from "./panel.js";

export const PORTAL_QC = "account-portal-20260917";
export type PortalView =
  | "home"
  | "bookings"
  /** One booking, with its actions. The id comes from the URL, not the view. */
  | "booking"
  | "wallet"
  | "payments"
  | "documents"
  | "membership"
  | "details";

export interface PortalModel extends PanelModel {
  view: PortalView;
  phone: string;
  past: PanelVisit[];
}

/** `/account/bookings/<id>` — the local detail page, when the row has an id. */
export function bookingDetailHref(row: Record<string, unknown>): string {
  const id = String(row.id ?? row.appointmentId ?? "");
  return id ? `${ACCOUNT_BOOKINGS_HREF}/${encodeURIComponent(id)}` : ACCOUNT_BOOKINGS_HREF;
}

function mapCard(row: Record<string, unknown>): PanelVisit {
  const model = buildPanelModel({ upcoming: [row], profile: {}, initials: "" });
  const base =
    model.visits[0] ?? {
      brand: String(row.brandName ?? ""),
      service: String(row.primaryServiceName ?? ""),
      venue: String(row.locationName ?? ""),
      when: formatWhen(String(row.startTime ?? "")),
      manageHref: ACCOUNT_BOOKINGS_HREF,
    };
  // buildPanelModel points at the hub, which is right for the header panel on
  // a brand page and wrong here: inside the account area the member should
  // stay on the brand they are standing on, not be sent to another origin to
  // read their own booking.
  return { ...base, manageHref: bookingDetailHref(row) };
}

export function buildPortalModel(
  session: unknown,
  view: PortalView,
  extra?: { past?: unknown; upcomingOverride?: unknown },
): PortalModel {
  const base = buildPanelModel(session);
  const s = (session && typeof session === "object" ? session : {}) as Record<string, unknown>;
  const profile = (s.profile && typeof s.profile === "object" ? s.profile : {}) as Record<string, unknown>;
  const country = typeof profile.countryCode === "string" ? profile.countryCode : "";
  const phone = typeof profile.phone === "string" ? profile.phone : "";
  const upcomingSrc = extra?.upcomingOverride ?? s.upcoming;
  const upcoming = extractAppointmentList(upcomingSrc ?? s)
    .filter((r) => !isMedicalAppointment(r))
    .map(mapCard);
  const past = extractAppointmentBucket(extra?.past ?? s.past, "past")
    .filter((r) => !isMedicalAppointment(r))
    .map(mapCard);
  return {
    ...base,
    visits: upcoming.length ? upcoming : base.visits,
    state: upcoming.length || base.visits.length ? "settled" : base.state,
    view,
    phone: [country, phone].filter(Boolean).join(" ").trim(),
    past,
  };
}

/**
 * The section strip. One list, rendered on every account page, so a member
 * always knows what else is here — the old three-tab strip made the account
 * look like all there was.
 *
 * `booking` (the detail page) is deliberately absent: it is reached FROM
 * Bookings and highlights Bookings while you are on it, because it is a page
 * about one row, not a section of its own.
 */
export const PORTAL_SECTIONS: ReadonlyArray<{ id: PortalView; href: string; label: string }> = [
  { id: "home", href: ACCOUNT_HOME_HREF, label: "Overview" },
  { id: "bookings", href: ACCOUNT_BOOKINGS_HREF, label: "Bookings" },
  { id: "wallet", href: "/account/wallet", label: "Wallet" },
  { id: "membership", href: "/account/membership", label: "Membership" },
  { id: "payments", href: "/account/payments", label: "Payments" },
  { id: "documents", href: "/account/documents", label: "Documents" },
  { id: "details", href: ACCOUNT_DETAILS_HREF, label: "Details" },
];

function nav(view: PortalView): string {
  const current: PortalView = view === "booking" ? "bookings" : view;
  return (
    `<nav class="carisma-portal__nav">` +
    PORTAL_SECTIONS.map(
      (s) =>
        `<a href="${s.href}"${current === s.id ? ' aria-current="page"' : ""}>${s.label}</a>`,
    ).join("") +
    `</nav>`
  );
}

/**
 * The chrome every section shares: eyebrow, title, masked email, the strip,
 * a body the caller built, and the sign-out row.
 *
 * Exported so browser.ts can render a section whose data comes from its own
 * endpoint without that endpoint's shape having to reach PortalModel. Adding a
 * section is then a fetch and a body builder, not a change to a shared model.
 */
export function portalShellHTML(opts: {
  view: PortalView;
  title: string;
  emailMasked: string;
  body: string;
}): string {
  const M = 'data-clarity-mask="True"';
  return (
    `<main class="carisma-portal" data-cw-qc="${PORTAL_QC}" data-cw-portal="${escapeHtml(opts.view)}">` +
    `<p class="carisma-portal__eyebrow">Carisma</p>` +
    `<h1 class="carisma-portal__title" ${M}>${escapeHtml(opts.title)}</h1>` +
    `<p class="carisma-portal__lede" ${M}>${escapeHtml(opts.emailMasked)}</p>` +
    nav(opts.view) +
    opts.body +
    signOutRow() +
    `</main>`
  );
}

function visitArticle(v: PanelVisit): string {
  const M = 'data-clarity-mask="True"';
  const body =
    `<article class="carisma-portal__card" ${M}>` +
    `<span class="carisma-portal__label">${escapeHtml(v.when)}</span>` +
    `<span class="carisma-portal__value">${escapeHtml(v.service)}</span>` +
    `<span class="carisma-portal__lede" style="margin:0">${escapeHtml([v.venue, v.brand].filter(Boolean).join(" · "))}</span>` +
    `</article>`;
  // The whole card is the target. A member who wants to move a booking taps
  // the booking — not a "Manage" word beside it.
  return v.manageHref
    ? `<a class="carisma-portal__cardlink" href="${escapeHtml(v.manageHref)}">${body}</a>`
    : body;
}

function signOutRow(): string {
  return (
    `<div class="carisma-portal__signout">` +
    `<button type="button" data-carisma-signout>Sign out</button>` +
    `<button type="button" data-carisma-signout-all>Sign out of every Carisma site</button>` +
    `</div>`
  );
}

export function accountPortalHTML(model: PortalModel): string {
  const M = 'data-clarity-mask="True"';
  const greeting = model.name ? `Hello, ${model.name}` : "Your account";
  const title =
    model.view === "bookings" ? "Your bookings" : model.view === "details" ? "Your details" : greeting;

  let body = "";
  if (model.view === "details") {
    body =
      `<div class="carisma-portal__card">` +
      `<span class="carisma-portal__label">Name</span>` +
      `<span class="carisma-portal__value" ${M}>${escapeHtml(model.name || "—")}</span></div>` +
      `<div class="carisma-portal__card">` +
      `<span class="carisma-portal__label">Email</span>` +
      `<span class="carisma-portal__value" ${M}>${escapeHtml(model.emailMasked || "—")}</span></div>` +
      `<div class="carisma-portal__card">` +
      `<span class="carisma-portal__label">Mobile</span>` +
      `<span class="carisma-portal__value" ${M}>${escapeHtml(model.phone || "—")}</span></div>` +
      `<p class="carisma-portal__empty">To change these, ask the team at the desk — this page is your record, not a form.</p>`;
  } else if (model.view === "bookings") {
    const upcoming = model.visits.length
      ? `<h2 class="carisma-portal__eyebrow">Upcoming</h2>${model.visits.map(visitArticle).join("")}`
      : `<p class="carisma-portal__empty">You have no upcoming visits. <a href="/">Book a treatment</a></p>`;
    const past = model.past.length
      ? `<h2 class="carisma-portal__eyebrow" style="margin-top:28px">Past</h2>${model.past.map(visitArticle).join("")}`
      : "";
    body = upcoming + past;
  } else {
    body =
      (model.visits.length
        ? `<h2 class="carisma-portal__eyebrow">Coming up</h2>${model.visits.map(visitArticle).join("")}`
        : `<p class="carisma-portal__empty">You have no upcoming visits. <a href="/">Book a treatment</a></p>`) +
      `<p style="margin-top:20px"><a href="${ACCOUNT_BOOKINGS_HREF}">See all bookings</a></p>`;
  }

  return portalShellHTML({ view: model.view, title, emailMasked: model.emailMasked, body });
}
