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
/** The proxy reads a section needs, in a fixed order `bodyFor` relies on. */
export declare function requestsFor(view: PortalView): string[];
/** What a section's failed read is called in the error block ("We couldn't load your …"). */
export declare function subjectFor(view: PortalView): string;
/**
 * The one informative line under a record section's title. Empty when the
 * section has nothing worth saying before its own body says it.
 */
export declare function ledeFor(view: PortalView): string;
/** The page heading for a section. */
export declare function titleFor(view: PortalView, greeting: string): string;
/**
 * Render a section from the answers to `requestsFor(view)`, in order.
 *
 * A `null` answer means the read failed or was refused. Every builder treats
 * that as "nothing here", so one dead endpoint costs its own block and never
 * the page: a member whose gift-card read 500s still sees their packages and
 * their credit.
 */
export declare function bodyFor(view: PortalView, answers: unknown[]): string;
/**
 * `/account/bookings/<id>` → the id. Anything else → null.
 *
 * Kept here rather than in the page files because five sites would otherwise
 * each write their own, and the one that got it wrong would render the
 * bookings LIST at a detail URL with no error anywhere.
 */
export declare function bookingIdFromPath(pathname: string): string | null;
//# sourceMappingURL=portalData.d.ts.map