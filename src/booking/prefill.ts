/**
 * src/booking/prefill.ts — build a full GuestDetails from a member profile, and
 * the E.164 split the wire needs (8.4 prefill mapping; W-18).
 *
 * The kit carries a single `phone` string; the backend wants `countryCode` and
 * the national number apart (W-18: a Maltese-less number without the split
 * yields a NULL phone key). So the member confirm card joins them for the kit
 * and this file splits them back for the wire — the same round trip Medical's
 * fromE164 does (lib/booking/country-codes.ts:292@87e2670), reimplemented with
 * no dependency because this package ships to five forks.
 */
import type { GuestDetails, MemberProfile } from "./types.js";

/** Join a country prefix and a national number into one E.164-ish string. */
export function joinE164(countryCode: string, national: string): string {
  const cc = (countryCode ?? "").trim();
  const n = (national ?? "").trim();
  if (!cc) return n;
  if (!n) return "";
  return `${cc}${n}`;
}

/**
 * Split an E.164-ish string back into `{ countryCode, phone }`. Accepts a
 * leading `+` prefix of 1-3 digits; anything without a `+` is treated as a bare
 * national number with an empty country code (the caller supplies the default).
 */
export function splitE164(
  value: string,
  fallbackCountryCode = "",
): { countryCode: string; phone: string } {
  const v = (value ?? "").trim();
  if (!v) return { countryCode: fallbackCountryCode, phone: "" };
  const m = /^(\+\d{1,3})(.*)$/.exec(v);
  if (m) {
    const cc = m[1] ?? "";
    const rest = (m[2] ?? "").replace(/[^\d]/g, "");
    return { countryCode: cc, phone: rest };
  }
  return { countryCode: fallbackCountryCode, phone: v.replace(/[^\d]/g, "") };
}

/** A member profile has a usable phone only when both halves are present (8.4). */
export function profileHasPhone(profile: MemberProfile): boolean {
  return Boolean((profile.countryCode ?? "").trim()) && Boolean((profile.phone ?? "").trim());
}

/** A member profile has a usable name only when both halves are present (8.4). */
export function profileHasName(profile: MemberProfile): boolean {
  return Boolean((profile.firstName ?? "").trim()) && Boolean((profile.lastName ?? "").trim());
}

/**
 * Build the full GuestDetails the member "Continue" dispatches through
 * SUBMIT_DETAILS (8.2, W-10). `dob`, `gender`, `locale`, `profilePicture` are
 * NOT copied — the half of Medical's returning-member form this design refuses
 * (account.ts:452-468@33c86ac). The phone is the joined E.164 string, exactly
 * what the guest form would have produced, so PayStep and buildCheckoutPayload
 * need no member-specific branch.
 */
export function guestFromProfile(profile: MemberProfile): GuestDetails {
  return {
    firstName: (profile.firstName ?? "").trim(),
    lastName: (profile.lastName ?? "").trim(),
    email: (profile.email ?? "").trim(),
    phone: joinE164(profile.countryCode ?? "", profile.phone ?? ""),
  };
}
