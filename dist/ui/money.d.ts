/**
 * Money and dates, formatted once for every brand.
 *
 * Two house rules are baked in here so no surface has to remember them:
 *
 *  1. **Every Carisma price is VAT-INCLUSIVE.** Nothing in this file adds tax,
 *     derives tax, or shows a net figure. A number that arrives from the
 *     catalogue or an appointment is the number the member pays. (Additive VAT
 *     once charged €118 for a €100 massage; that is what this rule prevents.)
 *
 *  2. **Malta wall clock, always.** Dates render through Intl with an explicit
 *     Europe/Malta time zone. `toISOString().slice(0,10)` is a different day
 *     for anyone booked before 01:00 or 02:00 local, twice a year.
 */
/** €120.00 — always two places, always the euro sign, never a net figure. */
export declare function eur(amount: number | null | undefined): string;
/** "Tuesday 22 September" */
export declare function longDate(raw: string): string;
/** "15:00" */
export declare function timeOfDay(raw: string): string;
/** "Tue 22 Sept, 15:00" — the list row. */
export declare function shortWhen(raw: string): string;
/** "22 Sept 2026" — a receipt, an expiry, a purchase date. */
export declare function plainDate(raw: string): string;
/**
 * "Tuesday 22 September · 15:00 – 15:45". End time is optional: a gift card
 * has no end, and a booking whose end is missing should still show its start
 * rather than an en-dash hanging off nothing.
 */
export declare function whenRange(startRaw: string, endRaw?: string | null): string;
/**
 * "in 3 days" / "tomorrow" / "in 4 hours" — relative to now, in whole units,
 * for a deadline the member is deciding against. Returns "" for anything past,
 * because a closed door is explained by its own sentence, not by a countdown.
 *
 * Deliberately NOT a live countdown and deliberately not phrased with urgency:
 * this is a fact about a policy, not a nudge.
 */
export declare function untilPhrase(raw: string, now?: Date): string;
//# sourceMappingURL=money.d.ts.map