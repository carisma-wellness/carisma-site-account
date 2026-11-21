/**
 * Carisma Circle v2 — the member's perks this year (BE-2 §5/§6
 * `GET /client/loyalty/perks`; surfaces §1.3 E; carisma-circle-v2-20261117).
 *
 * Drawn only from the read: free Spa days ("1 free Spa day this year · 1 left"
 * + Book it), early access ONLY when there is something upcoming (R5.7), and
 * no deposit on treatments that earn points only when active (D7: an online
 * booking still takes its payment; terms v2 §8 limits both perks to treatments
 * that earn points). The perks are not in the public
 * terms yet; they render only from the API (launch gate, surfaces §10).
 */
import { escapeHtml } from "./html.js";
import { unwrapEnvelope } from "./appointments.js";
import { M, NO_DEPOSIT_TEXT, earlyAccessText, int, maltaWhen, obj, str } from "./circleCore.js";
/** `GET /client/loyalty/perks` → the model, or null (off, left, 404, garbage). */
export function readCirclePerks(body) {
    const o = obj(unwrapEnvelope(body));
    if (!o || o.enabled !== true || o.left === true || o.minor === true)
        return null;
    const sd = obj(o.spaDays);
    const nd = obj(o.noDeposit) ?? {};
    const ea = obj(o.earlyAccess) ?? {};
    const from = obj(nd.fromLevel);
    const entitlement = sd ? Math.max(0, int(sd.entitlement)) : 0;
    return {
        year: int(o.year),
        spaDays: sd && entitlement > 0
            ? {
                entitlement,
                used: Math.max(0, int(sd.used)),
                left: Math.max(0, int(sd.left)),
                serviceIds: (Array.isArray(sd.serviceIds) ? sd.serviceIds : []).filter((x) => typeof x === "string" && x.length > 0),
                resetsOn: str(sd.resetsOn),
            }
            : null,
        noDeposit: { active: nd.active === true, fromLabel: from ? str(from.label) || `Level ${int(from.number)} · ${str(from.name)}` : "" },
        earlyAccess: {
            hours: Math.max(0, int(ea.hours)),
            upcoming: (Array.isArray(ea.upcoming) ? ea.upcoming : [])
                .map(obj)
                .filter((u) => Boolean(u && str(u.name) && str(u.opensAtForYou)))
                .map((u) => ({
                kind: str(u.kind),
                id: str(u.id),
                name: str(u.name),
                brandSlug: str(obj(u.brand)?.slug),
                opensAt: str(u.opensAt),
                opensAtForYou: str(u.opensAtForYou),
            })),
        },
    };
}
/** "1 free Spa day this year · 1 left" / "2 free Spa days this year · 1 left". "" when none. */
export function spaDaysText(p) {
    if (!p.spaDays)
        return "";
    const n = p.spaDays.entitlement;
    return `${n} free Spa day${n === 1 ? "" : "s"} this year · ${p.spaDays.left} left`;
}
/**
 * The perks block. "" when nothing in the read is worth a line. `spaDayHref` = where "Book it" goes.
 *
 * `live` is her own `/me.perks.live` (ADDENDUM X2 / BE-i): a row is drawn only while ITS perk is switched on —
 * the Spa days with `spaDays`, the early-access line with `earlyAccess` (and something upcoming, R5.7), no deposit
 * with `noDeposit`. Without `live` nothing is switched on, so nothing is drawn: the terms do not promise them yet.
 */
export function circlePerksHTML(p, opts = {}) {
    if (!p)
        return "";
    const live = opts.live ?? null;
    const rows = [];
    const spa = live?.spaDays === true ? spaDaysText(p) : "";
    if (spa) {
        rows.push(`<li class="cc-perk"><span ${M}>${escapeHtml(spa)}</span>` +
            (p.spaDays && p.spaDays.left > 0 && opts.spaDayHref
                ? `<a class="cw-link cc-link" href="${escapeHtml(opts.spaDayHref)}">Book it</a>`
                : "") +
            `</li>`);
    }
    if (live?.earlyAccess === true && p.earlyAccess.hours > 0 && p.earlyAccess.upcoming.length) {
        const items = p.earlyAccess.upcoming
            .map((u) => {
            const when = maltaWhen(u.opensAtForYou);
            return `<li>${escapeHtml(u.name)}${when ? ` · ${escapeHtml(`opens for you ${when}`)}` : ""}</li>`;
        })
            .join("");
        rows.push(`<li class="cc-perk cc-perk--early"><span>${escapeHtml(earlyAccessText(p.earlyAccess.hours))}</span>` +
            `<ul class="cc-perk__soon">${items}</ul></li>`);
    }
    if (live?.noDeposit === true && p.noDeposit.active)
        rows.push(`<li class="cc-perk"><span>${escapeHtml(NO_DEPOSIT_TEXT)}</span></li>`);
    if (!rows.length)
        return "";
    return (`<section class="cw-section cw-rise cc-perks" aria-labelledby="cw-circle-perks-title" data-cw-circle="perks">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-perks-title">Your perks this year</h2></div>` +
        `<ul class="cc-perks__list" role="list">${rows.join("")}</ul>` +
        `</section>`);
}
//# sourceMappingURL=circlePerks.js.map