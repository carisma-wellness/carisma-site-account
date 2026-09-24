import { type PanelModel, type PanelVisit } from "./panel.js";
import { type BookingActions } from "./bookingDetail.js";
import type { WalletModel } from "./records.js";
export declare const PORTAL_QC = "account-portal-20260917";
export type PortalView = "home" | "bookings"
/** One booking, with its actions. The id comes from the URL, not the view. */
 | "booking" | "wallet" | "payments" | "documents" | "membership" | "refer" | "details";
/** What a read came back as. `failed` is never shown as `empty`. */
export type LoadState = "ok" | "empty" | "failed";
export type ChipTone = "ok" | "warn" | "bad" | "neutral";
export interface ApptCard {
    id: string;
    href: string;
    service: string;
    brand: string;
    /** True only when the booking belongs to a different brand than this site. */
    showBrand: boolean;
    venue: string;
    startIso: string;
    /** NaN when the start is not a parseable instant (an older fixture). */
    startMs: number;
    tile: {
        wk: string;
        day: string;
        mon: string;
    } | null;
    /** "10:00" or "10:00 – 11:00"; the raw start string when unparseable. */
    clock: string;
    /** "Thursday 24 September" */
    longDay: string;
    /** "Thu 24 Sept" */
    shortDay: string;
    status: string;
    chip: {
        label: string;
        tone: ChipTone;
    } | null;
    upcoming: boolean;
    /** The server's block, all-false when the row carried none. */
    actions: BookingActions;
    due: number;
}
/** "+35627802062" → "+356 2780 2062"; anything else unchanged. */
export declare function formatPhone(raw: string): string;
/** The server's sentence, escaped, with every phone number made a tel: link. */
export declare function linkifyPhones(text: string): string;
/** One wire row → one card. Service/brand/venue come through the panel mapper, which knows every live shape. */
export declare function buildApptCard(row: Record<string, unknown>, bucket: "upcoming" | "past", siteBrand?: string): ApptCard;
/**
 * Upcoming soonest-first, past latest-first. An unparseable start sorts last
 * in both, so a malformed row never displaces a real next visit.
 */
export declare function buildApptCards(body: unknown, bucket: "upcoming" | "past", siteBrand?: string): ApptCard[];
/** The booking card used on Bookings and in Overview's "Also coming up". */
export declare function apptCardHTML(c: ApptCard): string;
export interface PortalModel extends PanelModel {
    view: PortalView;
    phone: string;
    past: PanelVisit[];
    firstName: string;
    /** This site's brand name, when the host said so. Decides the brand label on a card. */
    siteBrand: string;
    /** Where "book" goes on this brand. */
    bookHref: string;
    /** A phone for the error block, when the host gave one. */
    contactPhone: string;
    upcomingCards: ApptCard[];
    pastCards: ApptCard[];
    upcomingState: LoadState;
    pastState: LoadState;
    wallet: WalletModel | null;
    now: Date;
}
/** `/account/bookings/<id>` — the local detail page, when the row has an id. */
export declare function bookingDetailHref(row: Record<string, unknown>): string;
export interface PortalExtra {
    past?: unknown;
    upcomingOverride?: unknown;
    upcomingState?: LoadState;
    pastState?: LoadState;
    wallet?: WalletModel | null;
    siteBrand?: string;
    bookHref?: string;
    contactPhone?: string;
    now?: Date;
}
export declare function buildPortalModel(session: unknown, view: PortalView, extra?: PortalExtra): PortalModel;
/**
 * Every section, in rail order. `booking` (the detail page) is deliberately
 * absent: it is reached FROM Bookings and highlights Bookings while you are on it.
 */
export declare const PORTAL_SECTIONS: ReadonlyArray<{
    id: PortalView;
    href: string;
    label: string;
    group: string;
    /**
     * Only on these sites (by brand name). Refer a friend runs on the voucher
     * brands alone: Pulse has no voucher rail and Medical is excluded, and a rail
     * link to a page a site never built is a dead link on every page.
     */
    sites?: readonly string[];
}>;
/** The sections this site's rail shows. A section limited to some sites still shows on its own page. */
export declare function sectionsFor(view: PortalView, siteBrand?: string): typeof PORTAL_SECTIONS;
/**
 * The chrome every section shares: rail (or tabs), the page header, one
 * persistent status region, the body the caller built, and sign-out OUTSIDE
 * the content — at the rail's foot on a desk, the page's foot on a phone.
 *
 * Exported so browser.ts can render a section whose data comes from its own
 * endpoint without that endpoint's shape having to reach PortalModel.
 */
export declare function portalShellHTML(opts: {
    view: PortalView;
    title: string;
    emailMasked: string;
    body: string;
    lede?: string;
    /** Display name for the rail; falls back to "Your account". */
    memberName?: string;
    /** True while the body is a skeleton. */
    busy?: boolean;
    /** This site's brand name, which decides the site-limited rail rows. */
    siteBrand?: string;
}): string;
/** The failed-read block. Never the empty state: "you have no bookings" is a lie when we could not ask. */
export declare function errorBlockHTML(what: string, phone?: string): string;
/** The skeleton for a view, painted before any read returns. */
export declare function skeletonHTML(view: PortalView): string;
/** The door to this brand's own booking, worded for the brand. */
export declare function bookCtaLabel(siteBrand: string): string;
/** "Good evening" on the Malta clock, never the handset's. */
export declare function greetingFor(now?: Date): string;
interface NeedRow {
    card: ApptCard;
    title: string;
    sub: string;
    action: string;
    label: string;
    calm: boolean;
}
/**
 * "Needs you": things the member can settle right now, one action each, at
 * most three. Every row exists because the SERVER put a capability on the
 * booking; the clock only decides whether a deadline is near enough to mention.
 */
export declare function needsYou(m: PortalModel, excludeId?: string): NeedRow[];
/** "€85.00 credit · 2 gift cards · 4 of 6 sessions left" — or "" when there is no value. */
export declare function walletSummary(w: WalletModel | null): string;
export declare function overviewBodyHTML(m: PortalModel): string;
export declare function bookingsBodyHTML(m: PortalModel): string;
export declare function detailsBodyHTML(m: PortalModel): string;
export declare function portalTitle(m: PortalModel): string;
export declare function accountPortalHTML(model: PortalModel): string;
export {};
//# sourceMappingURL=portal.d.ts.map