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

const MALTA = "Europe/Malta";

/** €120.00 — always two places, always the euro sign, never a net figure. */
export function eur(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat("en-MT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `€${safe.toFixed(2)}`;
  }
}

function intl(raw: string, opts: Intl.DateTimeFormatOptions): string {
  if (!raw) return "";
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return raw;
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: MALTA, ...opts }).format(new Date(ms));
  } catch {
    return raw;
  }
}

/** "Tuesday 22 September" */
export function longDate(raw: string): string {
  return intl(raw, { weekday: "long", day: "numeric", month: "long" });
}

/** "15:00" */
export function timeOfDay(raw: string): string {
  return intl(raw, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "Tue 22 Sept, 15:00" — the list row. */
export function shortWhen(raw: string): string {
  return intl(raw, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "22 Sept 2026" — a receipt, an expiry, a purchase date. */
export function plainDate(raw: string): string {
  return intl(raw, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * "Tuesday 22 September · 15:00 – 15:45". End time is optional: a gift card
 * has no end, and a booking whose end is missing should still show its start
 * rather than an en-dash hanging off nothing.
 */
export function whenRange(startRaw: string, endRaw?: string | null): string {
  const date = longDate(startRaw);
  const from = timeOfDay(startRaw);
  if (!date && !from) return "";
  const to = endRaw ? timeOfDay(endRaw) : "";
  const clock = to ? `${from} – ${to}` : from;
  return [date, clock].filter(Boolean).join(" · ");
}

/**
 * "in 3 days" / "tomorrow" / "in 4 hours" — relative to now, in whole units,
 * for a deadline the member is deciding against. Returns "" for anything past,
 * because a closed door is explained by its own sentence, not by a countdown.
 *
 * Deliberately NOT a live countdown and deliberately not phrased with urgency:
 * this is a fact about a policy, not a nudge.
 */
export function untilPhrase(raw: string, now: Date = new Date()): string {
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return "";
  const diff = ms - now.getTime();
  if (diff <= 0) return "";
  const hours = diff / 3_600_000;
  if (hours < 1) return "in under an hour";
  if (hours < 24) {
    const h = Math.round(hours);
    return `in ${h} hour${h === 1 ? "" : "s"}`;
  }
  const days = Math.round(hours / 24);
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
