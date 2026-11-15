export declare const COMFORT_KEYS: readonly ["pressure", "oils", "music", "roomTemperature"];
export type ComfortKey = (typeof COMFORT_KEYS)[number];
export declare const COMFORT_LABELS: Record<ComfortKey, string>;
export interface CircleComfort {
    values: Record<ComfortKey, string | null>;
    choices: Record<ComfortKey, Array<{
        value: string;
        label: string;
    }>>;
}
/**
 * GET/PUT /client/loyalty/comfort → the model, or null (off, a member who left,
 * garbage). Fixed choices only: a value the server did not list is shown as unset.
 */
export declare function readCircleComfort(body: unknown): CircleComfort | null;
export declare const MONTHS: string[];
export interface CircleBirthday {
    birthday: {
        day: number;
        month: number;
    } | null;
    /** 'YYYY-MM-DD' while a saved birthday cannot be changed yet. */
    lockedUntil: string | null;
    editable: boolean;
    /** Day + month of the date of birth already on file (no birthday saved yet). */
    prefill: {
        day: number;
        month: number;
    } | null;
}
export declare function readCircleBirthday(body: unknown): CircleBirthday | null;
/** "15 March" — never a year. */
export declare function birthdayText(b: {
    day: number;
    month: number;
}): string;
/** 'YYYY-MM-DD' → "14 November 2027" (a calendar day, no time zone maths). */
export declare function calendarDayText(ymd: string): string;
/** The Bible's consent text for the service opt-in (ways to earn: `whatsapp`), word for word. */
export declare const WHATSAPP_UPDATES_SENTENCE = "Send my booking updates and Carisma credit receipts on WhatsApp from Carisma Spa, Carisma Aesthetics and Carisma Slimming. No offers. Reply STOP to end.";
export interface CircleWhatsapp {
    left: boolean;
    optedIn: boolean;
    hasPhone: boolean;
    phoneLast4: string | null;
}
/**
 * GET/PUT /client/loyalty/whatsapp-updates → the model, or null. Fail-closed on
 * the wording: the box is drawn only when the server records EXACTLY the
 * sentence this page shows, so what a member ticks is what is on file.
 */
export declare function readCircleWhatsapp(body: unknown): CircleWhatsapp | null;
export declare function profileErrorText(code: string, body?: unknown): string;
export type ProfileMsg = {
    text: string;
    tone: "ok" | "bad";
} | null | undefined;
export declare function comfortHTML(c: CircleComfort | null, msg?: ProfileMsg, busy?: boolean): string;
export declare function birthdayHTML(b: CircleBirthday | null, msg?: ProfileMsg, busy?: boolean): string;
export declare function whatsappUpdatesHTML(w: CircleWhatsapp | null, msg?: ProfileMsg, busy?: boolean): string;
export interface CircleDetailsInput {
    comfort: CircleComfort | null;
    birthday: CircleBirthday | null;
    whatsapp: CircleWhatsapp | null;
    msgs?: {
        comfort?: ProfileMsg;
        birthday?: ProfileMsg;
        whatsapp?: ProfileMsg;
    };
    busy?: "comfort" | "birthday" | "whatsapp" | null;
}
/** The Circle part of Details. "" when nothing answered live. */
export declare function circleDetailsHTML(input: CircleDetailsInput): string;
/** "Still to do: add your birthday · choose your room preferences". "" when nothing (known) is missing. */
export declare function profileMissingText(missing: readonly string[] | undefined): string;
//# sourceMappingURL=circleProfile.d.ts.map