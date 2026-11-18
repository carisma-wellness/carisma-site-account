/**
 * Carisma Circle v2 — what her points buy (BE-2 §3.2: the featured services,
 * a DISPLAY, not a catalogue; carisma-circle-v2-20261117).
 *
 * `GET /client/loyalty/rewards` (signed in, with `affordable`) and
 * `GET /public/loyalty/featured?brandSlug=…` (signed out, no `affordable`)
 * share one item shape: the service, its lowest venue price in cents and in
 * points (price × 20, computed by the server from the live price). Nothing is
 * typed here. The site may pass a photo and a booking link per service id
 * (`art`), because the kit does not know the site's pages; without them a
 * card is drawn with words only.
 *
 * Taken at the till or paid at checkout: "Pay with points" pays ONE whole
 * treatment at its full price (BE-2 §1.2).
 */
import { escapeHtml } from "./html.js";
import { unwrapEnvelope } from "./appointments.js";
import { M, creditText, int, obj, pointsEuroText, pointsText, str } from "./circleCore.js";
/**
 * Under the reward cards: counsel's corrected sentence (surface-consistency row 26), word for word, as the v1
 * kit shipped it under its old name. Still true in v2: a reward is one whole treatment, paid in full, and at
 * the desk it is the card in the Carisma app. A rewrite needs counsel's OK first.
 */
export const REWARDS_FOOT = "Rewards are paid in full with credit: show your card in the Carisma app at the desk. Prices include VAT.";
function httpsOrEmpty(v) {
    return /^https:\/\//i.test(v) ? v : "";
}
/** The card's photo: the site's art map, then the host callback, then the API's `imageUrl`. */
function photoOf(r, art, photo) {
    const fromArt = art?.[r.serviceId]?.img;
    if (fromArt)
        return { src: fromArt, alt: "" };
    try {
        const p = photo?.(r);
        if (p && typeof p.src === "string" && p.src)
            return { src: p.src, alt: typeof p.alt === "string" ? p.alt : "" };
    }
    catch {
        /* a host callback that throws costs only its photo */
    }
    return r.imageUrl ? { src: r.imageUrl, alt: "" } : null;
}
/** Either read → the items, or null (off, 404, garbage). Carisma Medical is dropped if it ever came. */
export function readCircleRewards(body) {
    const o = obj(unwrapEnvelope(body));
    if (!o || o.enabled !== true || !Array.isArray(o.items))
        return null;
    return o.items
        .map(obj)
        .filter((r) => Boolean(r && str(r.serviceId) && str(r.name)))
        .filter((r) => str(obj(r.brand)?.house) !== "medical")
        .map((r) => {
        const b = obj(r.brand) ?? {};
        return {
            brandName: str(b.name),
            brandSlug: str(b.slug),
            house: str(b.house),
            serviceId: str(r.serviceId),
            serviceOptionId: str(r.serviceOptionId),
            name: str(r.name),
            durationMinutes: Math.max(0, int(r.durationMinutes)),
            fromCents: Math.max(0, int(r.fromCents)),
            fromPoints: Math.max(0, int(r.fromPoints)),
            affordable: typeof r.affordable === "boolean" ? r.affordable : null,
            imageUrl: httpsOrEmpty(str(r.imageUrl)),
        };
    })
        .filter((r) => r.fromPoints > 0);
}
/** "Anti-Stress Massage, 55 min" (the duration only when the name does not already say it). */
export function rewardTitle(r) {
    if (!r.durationMinutes || /\bmin/i.test(r.name))
        return r.name;
    return `${r.name}, ${r.durationMinutes} min`;
}
/**
 * Yours now (the best her points pay for today: the server's `affordable`),
 * Next up (the nearest she cannot yet pay), One day (the one to aim for).
 */
export function rewardGroups(items, balancePoints) {
    const yours = items.filter((r) => r.affordable === true).sort((a, b) => b.fromPoints - a.fromPoints);
    const ahead = items
        .filter((r) => r.affordable !== true && r.fromPoints > Math.max(0, balancePoints))
        .sort((a, b) => a.fromPoints - b.fromPoints);
    const next = ahead[0] ?? null;
    const dream = ahead.length > 1 ? ahead[ahead.length - 1] : null;
    return { now: yours[0] ?? null, next, dream };
}
/** R5.3 on the pay step: "€38.00 more and your points pay for Anti-Stress Massage, 55 min". "" when none. */
export function nextRewardText(items, balancePoints, pointsPerEuro) {
    if (!items || !items.length)
        return "";
    const { next } = rewardGroups(items, balancePoints);
    if (!next)
        return "";
    const gap = next.fromPoints - Math.max(0, balancePoints);
    return gap > 0 ? `${pointsEuroText(gap, pointsPerEuro)} more and your points pay for ${rewardTitle(next)}` : "";
}
function priceLine(r) {
    return `${creditText(r.fromCents)} · ${pointsText(r.fromPoints)}`;
}
function cardHTML(eyebrow, r, line, on, art, photo) {
    const a = art?.[r.serviceId];
    const tag = a?.href ? "a" : "div";
    const href = a?.href ? ` href="${escapeHtml(a.href)}"` : "";
    const img = photoOf(r, art, photo);
    return (`<li class="cc-reward${on ? " on" : ""}${img ? " has-photo" : ""}">` +
        `<${tag} class="cc-reward__in"${href}>` +
        (img ? `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" loading="lazy" decoding="async">` : "") +
        `<span class="cc-reward__t"><span class="cc-eyebrow">${escapeHtml(eyebrow)}</span>` +
        `<b>${escapeHtml(rewardTitle(r))}</b><span ${M}>${escapeHtml(line)}</span></span>` +
        `</${tag}></li>`);
}
/**
 * The photo cards: Yours now / Next up / One day. `balancePoints` = her
 * balance (the gap lines); for a visitor pass null (public featured: each card
 * shows its price only). "" when there is nothing to show.
 */
export function circleRewardsHTML(items, balancePoints, opts = {}) {
    if (!items || !items.length)
        return "";
    // The rate comes from the caller's API answer; pointsEuroText keeps the 20-points fallback in one place.
    const ppe = opts.pointsPerEuro && opts.pointsPerEuro > 0 ? opts.pointsPerEuro : 0;
    let cards = "";
    if (balancePoints === null) {
        cards = items
            .slice(0, 3)
            .map((r) => cardHTML(r.brandName || "Carisma Circle", r, priceLine(r), false, opts.art, opts.photo))
            .join("");
    }
    else {
        const g = rewardGroups(items, balancePoints);
        const gap = (r) => `${pointsEuroText(r.fromPoints - Math.max(0, balancePoints), ppe)} more credit`;
        cards =
            (g.now ? cardHTML("Yours now", g.now, priceLine(g.now), true, opts.art, opts.photo) : "") +
                (g.next ? cardHTML("Next up", g.next, gap(g.next), false, opts.art, opts.photo) : "") +
                (g.dream ? cardHTML("One day", g.dream, gap(g.dream), false, opts.art, opts.photo) : "");
    }
    if (!cards)
        return "";
    return (`<section class="cw-section cw-rise cc-rewards-sec" aria-labelledby="cw-circle-rewards-title" data-cw-circle="rewards">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-rewards-title">${escapeHtml(opts.title ?? "What your credit buys")}</h2></div>` +
        `<ul class="cc cc-rewards${opts.scroll ? " scroll" : ""}" role="list">${cards}</ul>` +
        // Counsel's point (row 26): at the desk it is the card in the Carisma app.
        `<p class="cw-fine">${escapeHtml(opts.foot ?? REWARDS_FOOT)}</p>` +
        `</section>`);
}
/** The account menu's "Yours now" row: the treatment's photo, its name, what it costs. "" when nothing is affordable. */
export function circleNowRowHTML(items, art, photo) {
    if (!items || !items.length)
        return "";
    const { now } = rewardGroups(items, 0);
    if (!now)
        return "";
    const a = art?.[now.serviceId];
    const tag = a?.href ? "a" : "div";
    const img = photoOf(now, art, photo);
    return (`<${tag} class="cc cc-now"${a?.href ? ` href="${escapeHtml(a.href)}"` : ""} data-cw-circle="now">` +
        (img ? `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" loading="lazy" decoding="async">` : "") +
        `<span><i class="cc-eyebrow">Yours now</i><b>${escapeHtml(rewardTitle(now))}</b>` +
        `<small ${M}>${escapeHtml(priceLine(now))}</small></span></${tag}>`);
}
//# sourceMappingURL=circleFeatured.js.map