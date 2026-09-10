/** Join a country prefix and a national number into one E.164-ish string. */
export function joinE164(countryCode, national) {
    const cc = (countryCode ?? "").trim();
    const n = (national ?? "").trim();
    if (!cc)
        return n;
    if (!n)
        return "";
    return `${cc}${n}`;
}
/**
 * Split an E.164-ish string back into `{ countryCode, phone }`. Accepts a
 * leading `+` prefix of 1-3 digits; anything without a `+` is treated as a bare
 * national number with an empty country code (the caller supplies the default).
 */
export function splitE164(value, fallbackCountryCode = "") {
    const v = (value ?? "").trim();
    if (!v)
        return { countryCode: fallbackCountryCode, phone: "" };
    const m = /^(\+\d{1,3})(.*)$/.exec(v);
    if (m) {
        const cc = m[1] ?? "";
        const rest = (m[2] ?? "").replace(/[^\d]/g, "");
        return { countryCode: cc, phone: rest };
    }
    return { countryCode: fallbackCountryCode, phone: v.replace(/[^\d]/g, "") };
}
/** A member profile has a usable phone only when both halves are present (8.4). */
export function profileHasPhone(profile) {
    return Boolean((profile.countryCode ?? "").trim()) && Boolean((profile.phone ?? "").trim());
}
/** A member profile has a usable name only when both halves are present (8.4). */
export function profileHasName(profile) {
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
export function guestFromProfile(profile) {
    return {
        firstName: (profile.firstName ?? "").trim(),
        lastName: (profile.lastName ?? "").trim(),
        email: (profile.email ?? "").trim(),
        phone: joinE164(profile.countryCode ?? "", profile.phone ?? ""),
    };
}
//# sourceMappingURL=prefill.js.map