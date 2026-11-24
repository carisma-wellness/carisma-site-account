/**
 * Refer a friend, the 24 Nov 2026 flow (12-Tech/Docs/refer-a-friend-flow-2026-11-24).
 *
 * ONE place for everything a brand site says or sends about a referral:
 *  - the brand keys (spa | aesthetics | slimming; Medical, Hair Clinic and Pulse never),
 *  - the link shape `<brand origin>/r/<CODE>`,
 *  - the share message (Mert, 24 Nov: a warm sentence with the link at the END, never a bare link;
 *    amounts from the API, never typed),
 *  - the email subject + body, the WhatsApp / text / email hrefs, the Remind note for a friend who
 *    joined and has not booked,
 *  - the friend's claim (POST /client/referrals/claim through the member proxy) and the signed-in
 *    friend's gift (`friendGift[brand]` on GET /client/referrals/me).
 *
 * Pure apart from `claimReferral` / `readFriendGift`, which take their fetch.
 * Marker: referral-flow-20261124
 */
export const REFERRAL_FLOW_MARKER = "referral-flow-20261124";
export const REFERRAL_BRANDS = ["spa", "aesthetics", "slimming"];
export const REFERRAL_BRAND_NAME = {
    spa: "Carisma Spa",
    aesthetics: "Carisma Aesthetics",
    slimming: "Carisma Slimming",
};
/** The public www origin of each brand: the link a friend opens. */
export const REFERRAL_BRAND_ORIGIN = {
    spa: "https://www.carismaspa.com",
    aesthetics: "https://www.carismaaesthetics.com",
    slimming: "https://www.carismaslimming.com",
};
/** A brand name, slug or host → its key, or null (Medical, Hair Clinic, Pulse, unknown). */
export function referralBrandKey(brand) {
    const k = String(brand || "").toLowerCase().trim();
    if (!k)
        return null;
    if (k.includes("medical") || k.includes("hair") || k.includes("pulse"))
        return null;
    if (k === "spa" || k.includes("carisma-spa") || k.includes("carismaspa") || k.includes("carisma spa"))
        return "spa";
    if (k.includes("aesthetic"))
        return "aesthetics";
    if (k.includes("slimming"))
        return "slimming";
    if (/\bspa\b/.test(k))
        return "spa";
    return null;
}
/** Crockford base32, 8 characters: the minted code (backend REFERRAL_CODE_SHAPE). */
const CODE_SHAPE = /^[0-9A-HJKMNP-TV-Z]{8}$/;
/** A code as the link carries it: upper-case, separators out, the forgiving O→0, I/L→1 reading. Null if not a code. */
export function referralLinkCode(raw) {
    if (!raw)
        return null;
    const s = String(raw)
        .trim()
        .toUpperCase()
        .replace(/[\s\-_.]/g, "")
        .replace(/[OIL]/g, (ch) => (ch === "O" ? "0" : "1"));
    return CODE_SHAPE.test(s) ? s : null;
}
/** `<brand origin>/r/<CODE>` — the one link shape (contract §5). */
export function referralLink(brand, code, origin) {
    const base = origin && /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin) ? origin : REFERRAL_BRAND_ORIGIN[brand];
    return `${base}/r/${encodeURIComponent(code)}`;
}
/** "https://www.carismaspa.com/r/X" → "carismaspa.com/r/X" (what the link card shows). */
export function referralLinkLabel(url) {
    return String(url || "").replace(/^https?:\/\/(www\.)?/i, "");
}
const posInt = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null);
/** Read any of the API's friend-offer shapes. Null when it says nothing we can word honestly. */
export function readFriendOffer(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const o = raw;
    const t = String(o.type || "").toUpperCase();
    const cents = posInt(o.valueCents) ?? posInt(o.cents);
    const pct = posInt(o.valuePercent) ?? posInt(o.percent);
    const min = posInt(o.minSpendCents);
    const max = posInt(o.maxDiscountCents);
    if ((t === "AMOUNT_OFF" || t === "FIXED" || t === "AMOUNT" || (!t && cents)) && cents) {
        return { type: "AMOUNT_OFF", valueCents: cents, valuePercent: null, minSpendCents: min, maxDiscountCents: null };
    }
    if ((t === "PERCENT_OFF" || t === "PERCENT" || t === "PERCENTAGE" || (!t && pct)) && pct && pct <= 100) {
        return { type: "PERCENT_OFF", valueCents: null, valuePercent: pct, minSpendCents: min, maxDiscountCents: max };
    }
    return null;
}
/** €20, €20.50 — whole euros without the cents. */
export function euroShort(cents) {
    const e = cents / 100;
    return Number.isInteger(e) ? `€${e}` : `€${e.toFixed(2)}`;
}
/** "€20 off" / "10% off". Null without an offer. */
export function offerHeadline(o) {
    if (!o)
        return null;
    if (o.type === "AMOUNT_OFF" && o.valueCents)
        return `${euroShort(o.valueCents)} off`;
    if (o.type === "PERCENT_OFF" && o.valuePercent)
        return `${o.valuePercent}% off`;
    return null;
}
/** "€20" — the amount alone, for "Claim my €20". Null for a percentage or none. */
export function offerAmount(o) {
    return o && o.type === "AMOUNT_OFF" && o.valueCents ? euroShort(o.valueCents) : null;
}
/**
 * "I've been going to Carisma Spa and I think you'd love it. Here's €20 off your first visit
 * (anything from €50) with my link: https://www.carismaspa.com/r/NPAAD04J"
 * The link is ALWAYS last; the amount and the minimum come from the API or are left out.
 */
export function referralShareMessage(i) {
    const name = i.brandName || REFERRAL_BRAND_NAME[i.brand];
    const head = offerHeadline(i.offer);
    const min = i.offer?.minSpendCents ? ` (anything from ${euroShort(i.offer.minSpendCents)})` : "";
    const gift = head ? `Here's ${head} your first visit${min}` : "Here's a gift for your first visit";
    return `I've been going to ${name} and I think you'd love it. ${gift} with my link: ${i.link}`;
}
/** Subject: "€20 off your first visit at Carisma Spa". */
export function referralEmailSubject(i) {
    const name = i.brandName || REFERRAL_BRAND_NAME[i.brand];
    const head = offerHeadline(i.offer);
    return head ? `${head} your first visit at ${name}` : `A gift for your first visit at ${name}`;
}
export function referralEmailBody(i) {
    return `Hi,\n\n${referralShareMessage(i)}\n\nIt's saved for you when you open the link, and it comes off when you pay.\n`;
}
export function whatsappHref(text) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
export function smsHref(text) {
    // `sms:?&body=` opens Messages with the body on iOS and Android alike.
    return `sms:?&body=${encodeURIComponent(text)}`;
}
export function mailtoHref(subject, body) {
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
/** The note the SHARER sends a friend who joined and has not booked (Carisma never messages the friend). */
export function referralRemindMessage(i) {
    const name = i.brandName || REFERRAL_BRAND_NAME[i.brand];
    const hi = i.friendFirstName ? `Hi ${i.friendFirstName}, ` : "Hi, ";
    const head = offerHeadline(i.offer);
    const min = i.offer?.minSpendCents ? ` Book anything from ${euroShort(i.offer.minSpendCents)} and it comes off when you pay.` : " It comes off when you pay.";
    const gift = head ? `your ${head} your first visit at ${name} is waiting in your account.` : `your gift for your first visit at ${name} is waiting in your account.`;
    return `${hi}just a reminder: ${gift}${min} ${i.link}`;
}
const PROXY = "/api/auth/proxy";
function unwrapData(body) {
    if (body && typeof body === "object" && !Array.isArray(body)) {
        const o = body;
        if ("data" in o && o.data !== null && typeof o.data === "object")
            return o.data;
    }
    return body;
}
function readGift(raw, fallbackBrand) {
    if (!raw || typeof raw !== "object")
        return null;
    const g = raw;
    const code = referralLinkCode(typeof g.code === "string" ? g.code : null);
    if (!code)
        return null;
    const brand = referralBrandKey(typeof g.brand === "string" ? g.brand : "") ?? fallbackBrand;
    const first = typeof g.referrerFirstName === "string" ? g.referrerFirstName.trim() : "";
    const exp = typeof g.expiresAt === "string" ? g.expiresAt : null;
    if (exp && Number.isFinite(Date.parse(exp)) && Date.parse(exp) < Date.now())
        return null;
    return { code, brand, referrerFirstName: first || null, offer: readFriendOffer(g), expiresAt: exp };
}
/** A claim answer body → state + gift. Null for anything not understood (treated as silence). */
export function readClaimAnswer(body, brand) {
    const o = unwrapData(body);
    if (!o || typeof o !== "object")
        return null;
    const s = String(o.state || "").toUpperCase();
    if (s !== "READY" && s !== "OWN_LINK" && s !== "NOT_NEW" && s !== "NOT_FOUND")
        return null;
    return { state: s, gift: s === "READY" ? readGift(o.gift, brand) : null };
}
/**
 * Save the friend's gift to the signed-in account (POST /client/referrals/claim through the member proxy).
 * Never throws: an older API (404), a refusal or a network error answers null and the caller stays silent;
 * the code is still applied as a normal promo code at the pay step.
 */
export async function claimReferral(fetchImpl, code, brand) {
    try {
        const res = await fetchImpl(`${PROXY}/client/referrals/claim`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({ code, brand }),
        });
        if (!res.ok)
            return null;
        return readClaimAnswer(await res.json().catch(() => null), brand);
    }
    catch {
        return null;
    }
}
/** `friendGift[brand]` from a GET /client/referrals/me body, or null. */
export function friendGiftFrom(body, brand) {
    const o = unwrapData(body);
    if (!o || typeof o !== "object")
        return null;
    const map = o.friendGift;
    if (!map || typeof map !== "object")
        return null;
    return readGift(map[brand], brand);
}
/** The signed-in member's own code (GET /client/referrals/me `code`), upper-cased, or null. */
export function ownCodeFrom(body) {
    const o = unwrapData(body);
    return o && typeof o === "object" ? referralLinkCode(typeof o.code === "string" ? o.code : null) : null;
}
/** Read GET /client/referrals/me through the member proxy. Null when signed out, refused or unreachable. */
export async function readMyReferrals(fetchImpl) {
    try {
        const res = await fetchImpl(`${PROXY}/client/referrals/me`, {
            credentials: "same-origin",
            headers: { accept: "application/json" },
            cache: "no-store",
        });
        if (!res.ok)
            return null;
        return await res.json().catch(() => null);
    }
    catch {
        return null;
    }
}
/** What the friend is told after a claim, per state (WebFriendJoin / landing states). */
export function claimStateText(a, brandName) {
    switch (a.state) {
        case "READY": {
            const who = a.gift?.referrerFirstName ? `${a.gift.referrerFirstName}'s` : "Your";
            const head = offerHeadline(a.gift?.offer ?? null);
            return {
                title: `${who} ${head ? `${head.replace(/ off$/, "")} gift` : "gift"} is saved to your account`,
                line: "It's applied for you when you pay.",
            };
        }
        case "OWN_LINK":
            return { title: "This is your own link", line: "Share it with friends: their gift is waiting when they book." };
        case "NOT_NEW":
            return { title: `You're already a ${brandName} client`, line: "This gift is for people new to us. Thank you for coming back." };
        default:
            return { title: "This link isn't active", line: "You can still book as usual." };
    }
}
//# sourceMappingURL=referral.js.map