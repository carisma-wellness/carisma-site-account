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
}
/** Map the /api/auth/session?include=upcoming body to the panel view model. */
export declare function buildPanelModel(session: unknown): PanelModel;
/** Render the settled panel. Every personal string carries the recorder mask. */
export declare function accountPanelHTML(model: PanelModel): string;
//# sourceMappingURL=panel.d.ts.map