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
import { M, REVIEWS_FOOTNOTE, brandsLine, creditText, pointsText, } from "./circleCore.js";
const TICK = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
const BRAND_BONUS_KEYS = new Set(["first_house", "second_house", "full_circle"]);
/** "+€2.50 · 50 points". */
export function actionValueText(a) {
    return `+${creditText(a.cents)} · ${pointsText(a.points)}`;
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
/**
 * The account overview's "More ways to earn": one card per open action, ONE
 * figure each (board 10), Instagram cards carry the Follow link. "" when
 * everything is done or nothing was sent.
 */
export function circleWaysCardsHTML(m) {
    if (!m)
        return "";
    const open = m.actions.filter((a) => !a.done);
    if (!open.length)
        return "";
    const cards = open
        .map((a) => `<li class="cc-earn-card" data-cw-circle-way="${escapeHtml(a.id)}">` +
        `<p class="cc-earn-card__fig" ${M}>${escapeHtml(`+${creditText(a.cents)}`)}</p>` +
        `<p class="cc-earn-card__t">${escapeHtml(a.label)}</p>` +
        `<p class="cc-earn-card__s" ${M}>${escapeHtml(pointsText(a.points))}${hintFor(a, m) ? ` · ${escapeHtml(hintFor(a, m))}` : ""}</p>` +
        (a.key === "instagram" ? instagramLinkHTML(a) : "") +
        `</li>`)
        .join("");
    return (`<section class="cw-section cw-rise cc-earn" aria-labelledby="cw-circle-more-title" data-cw-circle="earn-cards">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-more-title">More ways to earn</h2></div>` +
        `<ul class="cc-earn__grid" role="list">${cards}</ul>` +
        `<p class="cw-fine">${escapeHtml(REVIEWS_FOOTNOTE)}</p>` +
        `</section>`);
}
//# sourceMappingURL=circleWays.js.map