export interface MemberDoorConfig {
    /** ACCOUNT_LOGIN === "on" */
    accountLogin: boolean;
    brandName: string;
    /** e.g. "tel:+35621234567" and its display label */
    phoneHref?: string;
    phoneLabel?: string;
    /** e.g. "https://wa.me/35699000000" and its display label */
    whatsappHref?: string;
    whatsappLabel?: string;
}
export type MemberDoorResult = {
    kind: "redirect";
    status: 307;
    location: string;
} | {
    kind: "fallback";
    status: 200;
    html: string;
};
export declare function memberDoor(cfg: MemberDoorConfig, next: string | null | undefined): MemberDoorResult;
/** The "opening soon" page. Never a 404. Points at the channel that always works. */
export declare function memberFallbackHTML(cfg: MemberDoorConfig): string;
//# sourceMappingURL=memberDoor.d.ts.map