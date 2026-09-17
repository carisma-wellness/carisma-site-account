import { type PanelModel, type PanelVisit } from "./panel.js";
export declare const PORTAL_QC = "account-portal-20260917";
export type PortalView = "home" | "bookings" | "details";
export interface PortalModel extends PanelModel {
    view: PortalView;
    phone: string;
    past: PanelVisit[];
}
export declare function buildPortalModel(session: unknown, view: PortalView, extra?: {
    past?: unknown;
    upcomingOverride?: unknown;
}): PortalModel;
export declare function accountPortalHTML(model: PortalModel): string;
//# sourceMappingURL=portal.d.ts.map