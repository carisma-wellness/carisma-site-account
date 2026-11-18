import { type CircleLeftModel, type CircleSummary, type CircleSummaryState, type PanelCircleExtras } from "./circle.js";
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
     * Carisma Circle v2, when the session read carried `loyalty` (asked for with
     * `include=upcoming,loyalty`; the session folds `/client/loyalty/summary`, the
     * read-model row) AND it said enabled:true. Null otherwise — and a null
     * draws nothing, so the panel is exactly what it was.
     */
    circle: CircleSummary | null;
    /** A member who left Carisma Circle (B3b): the date and Rejoin only. Null otherwise. */
    circleLeft: CircleLeftModel | null;
    /** Under the minimum age (R5.4): one line only. Null otherwise. */
    circleMinor: {
        minAge: number | null;
    } | null;
    /**
     * ADDENDUM KIT-6 `circleListing: "strict"` (BE-g): every visit the menu lists carries `circleEligible === true`
     * (a missing flag is not eligible). True for an empty list. The kit's default ("any") never reads it.
     */
    circleEligibleAll: boolean;
}
/** The panel model's Circle part as one state (null = nothing to draw). */
export declare function panelCircleState(model: PanelModel): CircleSummaryState | null;
/** The panel's one read. With Circle on, the session route folds the member's loyalty answer in (no second call). */
export declare const PANEL_SESSION_URL = "/api/auth/session?include=upcoming";
export declare const PANEL_SESSION_URL_CIRCLE = "/api/auth/session?include=upcoming,loyalty";
/** Map the /api/auth/session?include=upcoming body to the panel view model. */
export declare function buildPanelModel(session: unknown): PanelModel;
/**
 * Render the settled panel. Every personal string carries the recorder mask.
 * `circle` = what the menu's Circle block may add once the member read and the
 * featured read answer (the unlock line, the "Yours now" row, posters).
 * `places` (ADDENDUM KIT-6, each default true): `menu: false` leaves the Circle
 * Card out of the menu, `rewards: false` the "Credit & rewards" link.
 */
export declare function accountPanelHTML(model: PanelModel, circle?: PanelCircleExtras, places?: {
    menu?: boolean;
    rewards?: boolean;
    listing?: "any" | "strict";
}): string;
/**
 * Board 11's account rows, each with its subtitle: "Overview"; "Bookings" with her next visit ("Fri 20 Nov, 15:00");
 * "Credit and rewards" with what it holds — "Activity, ways to earn, all five levels", the count from the API's
 * levels (browser.ts fills it once the public status answers; never a typed "five"); "Details" kept.
 */
export declare function panelCircleRowsHTML(model: PanelModel, rewards?: boolean): string;
/** The Credit and rewards row's subtitle once the level count is known: "Activity, ways to earn, all five levels". */
export declare function panelRewardsSubText(levelCount: number): string;
/** The menu's Circle block in its own slot, so browser.ts can redraw it when the extra reads answer. "" when off. */
export declare function panelCircleSlotHTML(model: PanelModel, circle?: PanelCircleExtras): string;
//# sourceMappingURL=panel.d.ts.map