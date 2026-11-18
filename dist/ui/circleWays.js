/**
 * Carisma Circle v2 — Ways to earn (surfaces §1.3 B; carisma-circle-v2-20261117).
 *
 * Rows come ONLY from the member read's `actions[]` (never typed): verified
 * email, first sign-in to the app, Instagram per brand (only the brands the
 * server lists, each with its own profile URL), first purchase at a first /
 * second / third brand. Money earns too, and a public review, rating, post,
 * tag or share never does (the footnote).
 *
 * The Instagram row is a plain link to the brand's profile, so it works
 * signed out and without JavaScript. Signed in and live, browser.ts fires the
 * award (`POST /client/loyalty/actions/instagram {brandId}`, once per brand per
 * page) on the same tap and lets the link open Instagram (honour system: the
 * points are awarded on the tap that opens the profile).
 */
import { escapeHtml } from "./html.js";
import { M, REVIEWS_FOOTNOTE, brandsLine, countWord, creditPointsText, creditText, pointsText, } from "./circleCore.js";
const TICK = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
const BRAND_BONUS_KEYS = new Set(["first_house", "second_house", "full_circle"]);
/** "+€2.50 · 50 points" — one figure, euro first, never broken inside (board 10's `fig`). */
export function actionValueText(a) {
    return `+${creditPointsText(a.cents, a.points)}`;
}
/** "3 of 6 done · €30.00 more to earn". "" when the server sent no actions. */
export function waysSummaryText(m) {
    if (!m.actionsOf)
        return "";
    const left = Math.round((m.actionsLeftPoints * 100) / m.pointsPerEuro);
    return `${m.actionsDone} of ${m.actionsOf} done` + (left > 0 ? ` · ${creditText(left)} more to earn` : "");
}
/** The Instagram tap target: the brand's own profile, in a new tab; browser.ts adds the award. */
export function instagramLinkHTML(a, label = "Follow") {
    return (`<a class="cc-ig" href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer"` +
        ` data-cw-circle-ig="${escapeHtml(a.brandId)}">${escapeHtml(label)}</a>`);
}
function hintFor(a, m) {
    if (a.done)
        return "";
    if (a.key === "verified_email")
        return "Sign in with your email";
    if (BRAND_BONUS_KEYS.has(a.key) && m.brandBonusMinCents > 0) {
        return `A first purchase of ${creditText(m.brandBonusMinCents)} or more`;
    }
    return "";
}
function rowHTML(a, m) {
    const hint = hintFor(a, m);
    const right = a.done
        ? `<span class="cc-way__done">${TICK}Done</span>`
        : a.key === "instagram"
            ? instagramLinkHTML(a)
            : "";
    return (`<li class="cc-way${a.done ? " is-done" : ""}" data-cw-circle-way="${escapeHtml(a.id)}">` +
        `<span class="cc-way__text"><b>${escapeHtml(a.label)}</b>` +
        `<span ${M}>${escapeHtml(a.done ? pointsText(a.points) : actionValueText(a))}${hint ? ` · ${escapeHtml(hint)}` : ""}</span></span>` +
        right +
        `</li>`);
}
/** The Ways to earn section. "" when the member read is null. */
export function circleWaysHTML(m, opts = {}) {
    if (!m)
        return "";
    const sum = waysSummaryText(m);
    const line = brandsLine(m.brands);
    const rows = m.actions.map((a) => rowHTML(a, m)).join("");
    return (`<section class="cw-section cw-rise cc-ways" aria-labelledby="cw-circle-earn-title" data-cw-circle="earn">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-earn-title">${escapeHtml(opts.title ?? "Ways to earn")}</h2>` +
        (sum ? `<p class="cc-ways__sum" ${M}>${escapeHtml(sum)}</p>` : "") +
        `</div>` +
        (rows ? `<ul class="cc-ways__list" role="list">${rows}</ul>` : "") +
        // Counsel's "on eligible treatments" (surface-consistency rows 18/21); the footnote is v2's (follows now earn).
        `<p class="cw-fine">${escapeHtml(`Every €1 you pay on eligible treatments${line ? ` at ${line}` : ""} earns credit too. ${REVIEWS_FOOTNOTE}`)}</p>` +
        `</section>`);
}
/** "Friday" for a visit's start, in Malta; "" when unreadable. */
function maltaWeekday(iso) {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms))
        return "";
    try {
        return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", weekday: "long" }).format(new Date(ms));
    }
    catch {
        return "";
    }
}
function earnCardHTML(c) {
    return (`<li class="cc-earn-card${c.wide ? " wide" : ""}" data-cw-circle-way="${escapeHtml(c.id)}">` +
        `<p class="cc-earn-card__t">${escapeHtml(c.title)}</p>` +
        `<p class="cc-earn-card__fig" ${M}>${escapeHtml(c.figure)}</p>` +
        (c.sub ? `<p class="cc-earn-card__s" ${M}>${escapeHtml(c.sub)}</p>` : "") +
        (c.action ?? "") +
        `</li>`);
}
/**
 * The account overview's "More ways to earn" (ADDENDUM KIT-2, board 10): a card each, ONE figure each, every figure
 * the server's. In the board's order: "Book your next visit before you leave" (only from `/me.rebookNext`, BE-k),
 * "Spa products" (only with the public status's retail boost and Carisma Spa switched on), the brand bonuses
 * (Full Circle; X10 drops them while one house is on), "Refer a friend" (only while `/me.referral` pays her in
 * points, X8/BE-j: never a typed 2,000), "Follow … on Instagram" (from `/me.actions`), then any other open action.
 * "" when there is nothing to earn.
 */
export function circleWaysCardsHTML(m, opts = {}) {
    if (!m)
        return "";
    const cards = [];
    if (m.rebookNext) {
        const day = maltaWeekday(m.rebookNext.startAt);
        cards.push({
            id: "rebook",
            title: "Book your next visit before you leave",
            figure: `+${creditPointsText(m.rebookNext.cents, m.rebookNext.points)}`,
            sub: day ? `on ${day}’s visit` : "",
        });
    }
    const spa = m.brands.find((b) => b.house === "spa");
    const boost = Math.round(Number(opts.retailBoostPct) || 0);
    if (spa && boost > 0) {
        cards.push({ id: "retail", title: "Spa products", figure: `${boost}% more points`, sub: `on the products you buy at ${spa.name}` });
    }
    const open = m.actions.filter((a) => !a.done);
    const bonus = open.filter((a) => BRAND_BONUS_KEYS.has(a.key));
    const insta = open.filter((a) => a.key === "instagram");
    const rest = open.filter((a) => !BRAND_BONUS_KEYS.has(a.key) && a.key !== "instagram");
    for (const a of bonus) {
        const passport = (a.key === "second_house" || a.key === "full_circle") && m.brands.length >= 2
            ? `Full Circle: ${m.passport.count} of ${m.brands.length} Carisma brands`
            : "";
        cards.push({ id: a.id, title: a.label, figure: actionValueText(a), sub: passport || hintFor(a, m) });
    }
    if (m.referral) {
        const r = m.referral;
        cards.push({
            id: "referral",
            title: "Refer a friend",
            figure: `Up to ${creditPointsText(r.upToCents, r.upToPoints)}`,
            sub: `for your first ${countWord(r.ladder.length)} friend${r.ladder.length === 1 ? "" : "s"}`,
            wide: true,
            action: r.link ? `<button type="button" class="cc-ig" data-cw-circle-copy="${escapeHtml(r.link)}">Copy my link</button>` : "",
        });
    }
    for (const a of insta) {
        cards.push({
            id: a.id,
            title: a.label,
            figure: actionValueText(a),
            sub: "when you tap Follow, once for each Carisma brand",
            wide: true,
            action: instagramLinkHTML(a),
        });
    }
    for (const a of rest)
        cards.push({ id: a.id, title: a.label, figure: actionValueText(a), sub: hintFor(a, m) });
    if (!cards.length)
        return "";
    return (`<section class="cw-section cw-rise cc-earn" aria-labelledby="cw-circle-more-title" data-cw-circle="earn-cards">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-more-title">More ways to earn</h2></div>` +
        `<ul class="cc-earn__grid" role="list">${cards.map(earnCardHTML).join("")}</ul>` +
        `<p class="cw-fine">${escapeHtml(REVIEWS_FOOTNOTE)}</p>` +
        `<p class="cw-circle-prefs__msg" role="status" aria-live="polite" data-cw-circle-copy-msg></p>` +
        `</section>`);
}
//# sourceMappingURL=circleWays.js.map