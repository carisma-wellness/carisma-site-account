import type { SlotsModel } from "./reschedule.js";
import type { CancelSummary } from "./portalActions.js";
/** "2026-09-30" + 2 → "2026-10-02". Calendar arithmetic on noon UTC, so no DST edge can move it. */
export declare function addDays(dateStr: string, n: number): string;
/** Days from `a` to `b` (both YYYY-MM-DD). */
export declare function daysBetween(a: string, b: string): number;
export type DateStyle = "wk" | "wkLong" | "short" | "shortMonth" | "long";
/**
 * A calendar date in words. `short` "Thu 24", `shortMonth` "Sat 26 Sept",
 * `long` "Friday 25 September", `wkLong` "Thursday". Never ISO: a member
 * should never read "2026-09-26" on a button.
 */
export declare function dateWords(dateStr: string, style: DateStyle): string;
/** An instant in words, on the Malta clock. `short` "Sat 26 Sept, 10:00", `long` "Saturday 26 September, 10:00". */
export declare function instantWords(iso: string, style?: "short" | "long", timeZone?: string): string;
/** "10:00" on the venue clock. */
export declare function clockOf(iso: string, timeZone?: string): string;
export interface DayChip {
    date: string;
    wk: string;
    day: string;
    mon: string;
    /** The day the booking is on now. Dotted, never pre-selected by accident. */
    isCurrent: boolean;
    /** "Saturday 26 September" for the accessible name. */
    long: string;
}
/**
 * `count` consecutive days from `start`. The strip opens on the BOOKING's day,
 * not today: someone moving a Saturday massage is thinking about that
 * weekend, and a strip starting on a Tuesday makes them scroll to find it.
 */
export declare function buildDayStrip(start: string, count: number, currentDate: string): DayChip[];
export interface TimeOption {
    time: string;
    /** The booking's own slot: shown, disabled, labelled "Current". */
    current: boolean;
}
/**
 * The times worth showing on a day: every FREE slot, plus the booking's own
 * slot when this is its day (the server reports it as taken — by this very
 * booking — and a member who cannot see their current time loses their place).
 */
export declare function timeOptions(slots: SlotsModel, currentDate: string, currentTime: string): TimeOption[];
export type DayPart = "Morning" | "Afternoon" | "Evening";
export declare function dayPart(time: string): DayPart;
/** Morning / Afternoon / Evening, but only when there are more than 8 times — fewer read fine as one row. */
export declare function groupTimes(options: TimeOption[]): Array<{
    label: DayPart | null;
    options: TimeOption[];
}>;
export declare function dialogFrameHTML(opts: {
    kind: "reschedule" | "cancel" | "package-book";
    title: string;
    sub?: string;
    body: string;
    foot?: string;
}): string;
export interface RescheduleContext {
    treatment: string;
    venue: string;
    /** The booking's start, UTC. */
    startIso: string;
    /** The first day chip (YYYY-MM-DD). */
    stripStart: string;
    /** The booking's own day on the venue clock. */
    currentDate: string;
    /** The earliest date the native picker may offer (today, venue clock). */
    minDate: string;
}
/** "Couples Full Body Massage · Hugo's Hotel · now Sat 26 Sept, 10:00" (escaped). */
export declare function rescheduleSubline(treatment: string, venue: string, startIso: string): string;
export declare function dayChipsHTML(days: DayChip[], selected: string): string;
export declare function timesSkeletonHTML(): string;
export interface TimesState {
    /** The day being shown. */
    date: string;
    phase: "loading" | "ready" | "failed";
    slots?: SlotsModel | null;
    currentDate: string;
    currentTime: string;
    selected: string | null;
    /** A refusal from the server, shown beside the times (role=alert). */
    alert?: string | null;
    /** Times the server just refused, hidden until the day is re-read. */
    taken?: string[];
}
export declare function rescheduleTimesHTML(s: TimesState): string;
/** The review bar: the change in words, and the only button that moves anything. */
export declare function reviewBarHTML(oldLabel: string, newLabel: string, busy?: boolean): string;
export declare function rescheduleDialogHTML(ctx: RescheduleContext | null, days: DayChip[], selected: string): string;
/** "Cancel Thursday's Lipocavitation?" */
export declare function cancelTitle(startIso: string, treatment: string): string;
export declare function cancelBodyHTML(s: CancelSummary | null, canReschedule: boolean, alert?: string | null): string;
export declare function cancelFootHTML(s: CancelSummary | null, busy?: boolean): string;
export declare function cancelDialogHTML(opts: {
    startIso: string;
    treatment: string;
    summary: CancelSummary | null;
    canReschedule: boolean;
}): string;
export interface PackageBookChoice {
    key: string;
    label: string;
}
export interface PackageBookContext {
    packageName: string;
    /** Where it can be used. More than one → the member picks. */
    venues: PackageBookChoice[];
    venueKey: string;
    /** What it can be booked for. More than one → the member picks. */
    treatments: PackageBookChoice[];
    treatmentKey: string;
    stripStart: string;
    minDate: string;
}
/** "Lipocavitation · Carisma Slimming St Julian's" (escaped). */
export declare function packageBookSubline(ctx: PackageBookContext): string;
export declare function packageBookDialogHTML(ctx: PackageBookContext | null, days: DayChip[], selected: string): string;
/** The review bar for a package session: when, and the one button that books. */
export declare function packageBookBarHTML(whenLabel: string, busy?: boolean): string;
//# sourceMappingURL=dialogs.d.ts.map