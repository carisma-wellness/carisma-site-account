import { type CircleLeftModel, type CircleModel } from "./circle.js";
export declare const ACCOUNT_HOME_HREF = "/account";
export declare const ACCOUNT_BOOKINGS_HREF = "/account/bookings";
export declare const ACCOUNT_DETAILS_HREF = "/account/details";
export declare const PANEL_QC = "account-panel-20260917";
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
    hub: {
        home: string;
        appointments: string;
        details: string;
    };
    state: "settled" | "empty";
    /**
     * Carisma Circle, when the session read carried `loyalty` (asked for with
     * `include=upcoming,loyalty`) AND it said enabled:true. Null otherwise —
     * and a null draws nothing, so the panel is exactly what it was.
     */
    circle: CircleModel | null;
    /** A member who left Carisma Circle (B3b): the date and Rejoin only. Null otherwise. */
    circleLeft: CircleLeftModel | null;
}
/** The panel's one read. With Circle on, the session route folds the member's loyalty answer in (no second call). */
export declare const PANEL_SESSION_URL = "/api/auth/session?include=upcoming";
export declare const PANEL_SESSION_URL_CIRCLE = "/api/auth/session?include=upcoming,loyalty";
/** Map the /api/auth/session?include=upcoming body to the panel view model. */
export declare function buildPanelModel(session: unknown): PanelModel;
/** Render the settled panel. Every personal string carries the recorder mask. */
export declare function accountPanelHTML(model: PanelModel): string;
//# sourceMappingURL=panel.d.ts.map