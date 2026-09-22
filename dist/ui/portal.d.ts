import { type PanelModel, type PanelVisit } from "./panel.js";
export declare const PORTAL_QC = "account-portal-20260917";
export type PortalView = "home" | "bookings"
/** One booking, with its actions. The id comes from the URL, not the view. */
 | "booking" | "wallet" | "payments" | "documents" | "membership" | "details";
export interface PortalModel extends PanelModel {
    view: PortalView;
    phone: string;
    past: PanelVisit[];
}
/** `/account/bookings/<id>` — the local detail page, when the row has an id. */
export declare function bookingDetailHref(row: Record<string, unknown>): string;
export declare function buildPortalModel(session: unknown, view: PortalView, extra?: {
    past?: unknown;
    upcomingOverride?: unknown;
}): PortalModel;
/**
 * The section strip. One list, rendered on every account page, so a member
 * always knows what else is here — the old three-tab strip made the account
 * look like all there was.
 *
 * `booking` (the detail page) is deliberately absent: it is reached FROM
 * Bookings and highlights Bookings while you are on it, because it is a page
 * about one row, not a section of its own.
 */
export declare const PORTAL_SECTIONS: ReadonlyArray<{
    id: PortalView;
    href: string;
    label: string;
}>;
/**
 * The chrome every section shares: eyebrow, title, masked email, the strip,
 * a body the caller built, and the sign-out row.
 *
 * Exported so browser.ts can render a section whose data comes from its own
 * endpoint without that endpoint's shape having to reach PortalModel. Adding a
 * section is then a fetch and a body builder, not a change to a shared model.
 */
export declare function portalShellHTML(opts: {
    view: PortalView;
    title: string;
    emailMasked: string;
    body: string;
}): string;
export declare function accountPortalHTML(model: PortalModel): string;
//# sourceMappingURL=portal.d.ts.map