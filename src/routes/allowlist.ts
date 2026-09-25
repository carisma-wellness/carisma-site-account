/**
 * The member-proxy allowlist. An ALLOWLIST, never a denylist: a path is proxyable
 * only if a rule here matches it, and everything else is refused with a 404 (not a
 * 403) so the proxy is not a readable map of the CarismaSoft API
 * (40-brand-website-integration.md sections 7.3, W-8; invariants W-24).
 *
 * The line this file draws
 * -----------------------
 * A member may READ their own record and ACT on things they own — a booking, a
 * membership, a balance. Those stay first-party, on the brand they are standing
 * on, because that is where the person is and the brand is half of what they
 * came for.
 *
 * A member may NOT, through a brand origin, change WHO THEY ARE or WHAT PAYS.
 * Credentials, the profile itself, session revoke, account deletion and the
 * stored card all belong to the identity origin, behind its own card and its own
 * Origin check. That split is the whole reason this file is an allowlist: the
 * FORBIDDEN_PATHS below are the named negative control, and allowlist.test.mjs
 * goes red the moment one of them becomes reachable.
 *
 * Why a booking cancel is allowed and a card change is not: cancelling is a
 * commercial act on a row the member owns, refusable and reversible by the desk.
 * Replacing the instrument that pays for everything is not — and a brand origin
 * is the wrong place to be asked for it.
 */

export interface AllowRule {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  /** Human label for the rule, surfaced by the boundary verifier (WP-PKG-2). */
  label: string;
  match: (path: string) => boolean;
}

/** `/client/booking/appointments/<id>` and nothing deeper. */
const APPT = "/client/booking/appointments";
const isApptSub = (p: string, suffix: string): boolean =>
  new RegExp(`^${APPT}/[^/]+/${suffix}$`).test(p);

/** Paths reachable through the member proxy. */
export const PROXY_ALLOWLIST: readonly AllowRule[] = [
  /* ── Booking: read ─────────────────────────────────────────────────── */
  { method: "POST", label: "member checkout", match: (p) => p === "/client/booking/checkout" },
  { method: "GET", label: "appointments list", match: (p) => p === APPT },
  { method: "GET", label: "appointment counts", match: (p) => p === `${APPT}/counts` },
  {
    method: "GET",
    label: "one appointment",
    match: (p) => new RegExp(`^${APPT}/[^/]+$`).test(p) && p !== `${APPT}/counts`,
  },
  { method: "GET", label: "visit history", match: (p) => p === "/client/booking/history" },
  // What a cancellation would cost, BEFORE the member commits to it. Reading
  // this is the only honest way to render a Cancel button on a brand site.
  { method: "GET", label: "cancellation preview", match: (p) => isApptSub(p, "cancellation-preview") },
  // The prefill behind "Book again" on a past visit.
  { method: "GET", label: "rebook prefill", match: (p) => isApptSub(p, "rebook") },

  /* ── Booking: the member acting on their own booking ───────────────── */
  // Turns the booking Confirmed on the HOD calendar. The cheapest no-show
  // reduction there is, and it was unreachable from any website.
  { method: "POST", label: "confirm attendance", match: (p) => isApptSub(p, "confirm") },
  { method: "PATCH", label: "reschedule", match: (p) => isApptSub(p, "reschedule") },
  { method: "DELETE", label: "cancel own appointment", match: (p) => new RegExp(`^${APPT}/[^/]+$`).test(p) },
  // Mints a Stripe Checkout session for an outstanding balance and hands back
  // its URL. The website redirects to it; nothing about the card touches a
  // brand origin.
  { method: "POST", label: "pay outstanding balance", match: (p) => isApptSub(p, "pay-balance") },
  { method: "POST", label: "settle outstanding balance", match: (p) => isApptSub(p, "balance-payment-intent") },
  { method: "POST", label: "verify balance payment", match: (p) => isApptSub(p, "verify-balance-payment") },
  { method: "POST", label: "member cancel/return", match: (p) => p === "/client/booking/abandon" },

  /* ── Availability, for the reschedule picker ───────────────────────── */
  { method: "GET", label: "slots", match: (p) => p === "/client/booking/slots" },
  { method: "GET", label: "next available", match: (p) => p === "/client/booking/next-available" },
  { method: "GET", label: "bookable staff", match: (p) => p === "/client/booking/staff" },

  /* ── The member's own record ───────────────────────────────────────── */
  { method: "GET", label: "profile (read only)", match: (p) => p === "/profile" },
  { method: "GET", label: "statement", match: (p) => p === "/client/account/statement" },
  { method: "GET", label: "documents", match: (p) => p === "/client/account/documents" },
  { method: "GET", label: "gift cards", match: (p) => p === "/client/gift-cards" },
  { method: "GET", label: "packages", match: (p) => p === "/client/packages" },
  // Pay a package's outstanding balance (hosted Stripe Checkout, amount minted
  // by the server). A package the member owns, like a booking's balance above.
  {
    method: "POST",
    label: "pay package balance",
    match: (p) => /^\/client\/packages\/[0-9a-fA-F-]{36}\/pay-balance$/.test(p),
  },
  // Back from that Checkout: settle it now rather than wait for the webhook.
  // The server re-reads the session on the package's own brand account.
  {
    method: "POST",
    label: "confirm package balance payment",
    match: (p) => /^\/client\/packages\/[0-9a-fA-F-]{36}\/pay-balance\/confirm$/.test(p),
  },
  { method: "GET", label: "account credit", match: (p) => p === "/client/credit-balance" },
  { method: "GET", label: "referrals", match: (p) => p === "/client/referrals/me" },
  { method: "GET", label: "loyalty", match: (p) => p === "/client/loyalty/me" },
  { method: "GET", label: "visits awaiting a rating", match: (p) => p === "/client/ratings/pending" },
  // `/pending` is the listing, not an appointment id — excluded so the rule
  // cannot be read as "POST anything under /ratings".
  {
    method: "POST",
    label: "rate a visit",
    match: (p) => /^\/client\/ratings\/[^/]+$/.test(p) && p !== "/client/ratings/pending",
  },

  /* ── Membership ────────────────────────────────────────────────────── */
  { method: "GET", label: "membership", match: (p) => p === "/client/membership" },
  { method: "GET", label: "membership invoices", match: (p) => p === "/client/membership/invoices" },
  { method: "GET", label: "membership ledger", match: (p) => /^\/client\/membership\/[^/]+\/ledger$/.test(p) },
  { method: "GET", label: "membership stored value", match: (p) => /^\/client\/membership\/[^/]+\/stored-value$/.test(p) },
  // Pause / resume / cancel are commercial acts on a subscription the member
  // owns — the same class as cancelling a booking. Changing the CARD is not,
  // and is forbidden below.
  { method: "POST", label: "pause membership", match: (p) => /^\/client\/membership\/[^/]+\/pause$/.test(p) },
  { method: "POST", label: "resume membership", match: (p) => /^\/client\/membership\/[^/]+\/resume$/.test(p) },
  { method: "POST", label: "cancel membership", match: (p) => /^\/client\/membership\/[^/]+\/cancel$/.test(p) },

  /* ── Wallet passes ─────────────────────────────────────────────────── */
  // Built long ago, deployed, and never called by a website.
  { method: "GET", label: "apple wallet pass", match: (p) => /^\/client\/wallet\/(appointments|memberships)\/[^/]+\/apple$/.test(p) },
  { method: "GET", label: "google wallet pass", match: (p) => /^\/client\/wallet\/(appointments|memberships)\/[^/]+\/google$/.test(p) },
  // Whether either pass can be issued at all. The credentials do not exist
  // yet, so the buttons render only when this answers true — a Wallet button
  // that 500s on the tap is the defect this read prevents. Exact path only.
  { method: "GET", label: "wallet pass availability", match: (p) => p === "/client/wallet/availability" },
];

/**
 * Paths that MUST never be proxyable. Not consulted by isAllowed() at runtime — the
 * allowlist alone decides — but asserted refused by the test suite, and used as the
 * named negative control (add one to PROXY_ALLOWLIST and the suite fails).
 */
export const FORBIDDEN_PATHS: ReadonlyArray<{ method: string; path: string; why: string }> = [
  { method: "POST", path: "/auth/change-password", why: "credential change belongs on the identity origin" },
  { method: "POST", path: "/auth/logout-all", why: "global revoke belongs on the identity origin" },
  { method: "DELETE", path: "/profile", why: "account deletion belongs on the identity origin" },
  { method: "DELETE", path: "/auth/sessions/abc123", why: "session revoke belongs on the identity origin" },
  { method: "PUT", path: "/profile", why: "profile writes live on the hub" },
  { method: "PUT", path: "/profile/addresses", why: "profile writes live on the hub" },
  { method: "GET", path: "/client/medical/records", why: "Medical trust boundary (W-24)" },
  { method: "GET", path: "/client/medical/my-care", why: "Medical trust boundary (W-24)" },
  { method: "GET", path: "/hod/dashboard", why: "staff surface" },
  { method: "GET", path: "/hod/clients/abc123/account", why: "the staff twin of the member statement" },
  { method: "GET", path: "/hod/clients/abc123/documents", why: "the staff twin of the member documents" },
  { method: "GET", path: "/internal/auth/me", why: "internal surface" },
  { method: "GET", path: "/admin/users", why: "admin surface" },
  // The stored card. A member may pause, resume and cancel a membership from a
  // brand site; replacing the instrument that pays for it is identity-origin
  // work, and a brand origin must never be the thing that asks for it.
  { method: "POST", path: "/client/membership/abc123/payment-method", why: "the stored card belongs on the identity origin" },
  { method: "POST", path: "/client/membership/setup-intent", why: "card capture belongs on the identity origin" },
  { method: "POST", path: "/client/membership/subscribe", why: "taking a new subscription is a checkout, not an account read" },
  // Another member's rows. These are 404 at the backend too, but the proxy
  // must not be the thing that finds that out.
  { method: "GET", path: "/client/clients/abc123/credit-balance", why: "a member reads their own balance, never one by id" },
];

/** Normalise a proxy sub-path: strip query/hash, collapse to a leading-slash path. */
export function normalizePath(path: string): string {
  let p = path.split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = "/" + p;
  // collapse a trailing slash except for the root
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

/** True only when a rule matches this method+path exactly. */
export function isAllowed(method: string, path: string): boolean {
  const m = method.toUpperCase();
  const p = normalizePath(path);
  return PROXY_ALLOWLIST.some((rule) => rule.method === m && rule.match(p));
}
