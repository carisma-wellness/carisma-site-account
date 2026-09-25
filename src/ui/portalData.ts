/**
 * What each account section needs, and what it renders — decided here, away
 * from the DOM, so both halves are testable without a browser.
 *
 * `requestsFor` names the proxy paths a section reads. `bodyFor` turns the
 * answers into HTML. browser.ts does nothing but fetch the first list and hand
 * the results to the second, which means adding a section is two entries here
 * and a three-line page file in each site — not a change to the mount code.
 *
 * Every path goes through `/api/auth/proxy/…`, which is allowlisted server-side
 * (routes/allowlist.ts). A path added here and not there is refused with a 404
 * and the section renders its empty state, never a broken page.
 */
import type { PortalView } from "./portal.js";
import {
  buildWalletModel,
  walletHTML,
  buildStatementModel,
  statementHTML,
  buildDocumentsModel,
  documentsHTML,
  buildMembershipModel,
  membershipHTML,
  buildReferModel,
  referHTML,
  type RecordsContext,
} from "./records.js";

const PROXY = "/api/auth/proxy";

/** The proxy reads a section needs, in a fixed order `bodyFor` relies on. */
export function requestsFor(view: PortalView): string[] {
  switch (view) {
    case "wallet":
      return [`${PROXY}/client/gift-cards`, `${PROXY}/client/packages`, `${PROXY}/client/credit-balance`];
    case "payments":
      return [`${PROXY}/client/account/statement`];
    case "documents":
      return [`${PROXY}/client/account/documents`];
    case "membership":
      return [`${PROXY}/client/membership`];
    case "refer":
      return [`${PROXY}/client/referrals/me`];
    case "bookings":
      return [
        `${PROXY}/client/booking/appointments?filter=upcoming&limit=50`,
        `${PROXY}/client/booking/appointments?filter=past&limit=50`,
      ];
    // Overview reads the SAME appointment list as Bookings, because only that
    // list carries each booking's `actions` block — `session.upcoming` does
    // not, and a card built from it could never offer Reschedule. Past is
    // read for one reason: a missed-visit fee is something that needs you.
    // The wallet three feed the strip, which only appears when there is value.
    case "home":
      return [
        `${PROXY}/client/booking/appointments?filter=upcoming&limit=50`,
        `${PROXY}/client/booking/appointments?filter=past&limit=20`,
        `${PROXY}/client/gift-cards`,
        `${PROXY}/client/packages`,
        `${PROXY}/client/credit-balance`,
      ];
    default:
      return [];
  }
}

/** What a section's failed read is called in the error block ("We couldn't load your …"). */
export function subjectFor(view: PortalView): string {
  switch (view) {
    case "home":
    case "bookings":
    case "booking":
      return "bookings";
    case "wallet":
      return "wallet";
    case "payments":
      return "payments";
    case "documents":
      return "documents";
    case "membership":
      return "membership";
    case "refer":
      return "referrals";
    default:
      return "details";
  }
}

/**
 * The one informative line under a record section's title. Empty when the
 * section has nothing worth saying before its own body says it.
 */
export function ledeFor(view: PortalView): string {
  switch (view) {
    // Wallet, Payments and Membership open on a hero that says the one
    // thing a lede would (what you can spend / what you owe / your plan).
    // Documents: its rows (or its empty sentence) already say what it holds.
    case "wallet":
    case "payments":
    case "documents":
      return "";
    case "membership":
      return "";
    default:
      return "";
  }
}

/** The page heading for a section. */
export function titleFor(view: PortalView, greeting: string): string {
  switch (view) {
    case "bookings":
      return "Your bookings";
    case "wallet":
      return "Your wallet";
    case "payments":
      return "Your payments";
    case "documents":
      return "Your documents";
    case "membership":
      return "Your membership";
    case "details":
      return "Your details";
    case "refer":
      return "Refer a friend";
    default:
      return greeting;
  }
}

/**
 * Render a section from the answers to `requestsFor(view)`, in order.
 *
 * A `null` answer means the read failed or was refused. Every builder treats
 * that as "nothing here", so one dead endpoint costs its own block and never
 * the page: a member whose gift-card read 500s still sees their packages and
 * their credit.
 *
 * `ctx` is optional page context (the member's first name for the membership
 * card, the brand phone for "speak to the team", the site's brand for the
 * wallet's "Available to spend"). Without it every view still renders; those
 * touches simply do not appear, and the wallet counts every gift card.
 */
export function bodyFor(view: PortalView, answers: unknown[], ctx: RecordsContext = {}): string {
  switch (view) {
    case "wallet":
      return walletHTML(
        buildWalletModel({ giftCards: answers[0], packages: answers[1], credit: answers[2] }),
        ctx,
      );
    case "payments":
      return statementHTML(buildStatementModel(answers[0]));
    case "documents":
      return documentsHTML(buildDocumentsModel(answers[0]));
    case "membership":
      return membershipHTML(buildMembershipModel(answers[0]), ctx);
    case "refer":
      return referHTML(buildReferModel(answers[0], ctx));
    default:
      return "";
  }
}

/**
 * `/account/bookings/<id>` → the id. Anything else → null.
 *
 * Kept here rather than in the page files because five sites would otherwise
 * each write their own, and the one that got it wrong would render the
 * bookings LIST at a detail URL with no error anywhere.
 */
export function bookingIdFromPath(pathname: string): string | null {
  const m = /^\/account\/bookings\/([^/?#]+)\/?$/.exec(pathname || "");
  if (!m) return null;
  try {
    const id = decodeURIComponent(m[1]);
    return id && id !== "counts" ? id : null;
  } catch {
    return null;
  }
}
