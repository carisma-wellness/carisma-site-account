/**
 * Carisma Circle — the cross-brand loyalty programme, as the account area shows it.
 *
 * Pure: a model built from `GET /client/loyalty/me` (+ activity, + rewards) and
 * the HTML each surface needs. browser.ts only fetches and drops the strings in.
 *
 * THE ONE RULE: nothing renders unless the server said `enabled: true`. The
 * backend ships OFF (`LoyaltySettings.enabled = false`) and answers every client
 * read `{ enabled: false }` until the CEO turns it on; a 404 (an API that does
 * not have the route yet), a 5xx, a timeout or a body we do not understand all
 * read as "off" here. `readCircle` returns null for every one of them and every
 * builder returns "" for null — the account area then looks exactly as it did.
 *
 * Copy rules (Programme Bible v2, panel/sync-notes.md):
 *  - Euro first, points second ("€62.00 · 1,240 points"); credit always 2 decimals;
 *    level-spend euros whole, rounded UP, always with a verb.
 *  - Brands are named ("Carisma Spa, Aesthetics and Slimming"), never "house".
 *  - A level always carries its numeral and the five-step ladder.
 *  - "ready to use" only when the spendable balance is at least the minimum
 *    redemption (€5.00); otherwise "€1.75 more and you can use it".
 *  - Carisma Medical never shows any of it (`circleAllowedOn`).
 *  - Every personal figure carries `data-clarity-mask="True"`.
 */
import { escapeHtml } from "./html.js";
import { eur } from "./money.js";
import { unwrapEnvelope } from "./appointments.js";
export const CIRCLE_QC = "carisma-circle-20261115";
export const CIRCLE_HREF = "/account/rewards";
/**
 * The Carisma Circle terms, served by each Circle site at this path (W2, 15 Nov 2026).
 * Every "Terms" beside a credit sentence links here. A site that does not host
 * the page passes its own address (or `null` for no link) where the HTML builders take one.
 */
export const CIRCLE_TERMS_HREF = "/carisma-circle/terms";
/** Every brand a member can earn at and spend at, in customer words. */
export const CIRCLE_BRANDS = "Carisma Spa, Aesthetics and Slimming";
/** 20 points = €1, so a point is 5 cents (Bible pointValue). */
export const CENTS_PER_POINT = 5;
export const DEFAULT_MIN_REDEEM_POINTS = 100;
export const DEFAULT_MAX_SHARE_PCT = 50;
export const PROMISE_QUALIFIER = "Medical treatments prescribed or performed by a doctor, fees and tips don't earn credit. Gift cards earn for the person who uses them.";
export const EARN_TERMS_LINE = "No credit is given for reviews, ratings, follows, posts, tags or shares.";
/** The five levels, in order. Names and numerals are fixed by the Bible; thresholds are euros a calendar year. */
export const CIRCLE_LEVELS = [
    { key: "first_light", name: "First Light", numeral: "I", thresholdEur: 0 },
    { key: "sunrise", name: "Sunrise", numeral: "II", thresholdEur: 150 },
    { key: "golden_hour", name: "Golden Hour", numeral: "III", thresholdEur: 500 },
    { key: "moonlight", name: "Moonlight", numeral: "IV", thresholdEur: 1250 },
    { key: "starlight", name: "Starlight", numeral: "V", thresholdEur: 3000 },
];
/** The verb-gap only shows when one visit closes it (Bible tierRules.nudgeGapRule; €150 = the new-member figure). */
export const GAP_NUDGE_MAX_CENTS = 15_000;
const M = 'data-clarity-mask="True"';
const MALTA = "Europe/Malta";
/* ── Reading the wire ──────────────────────────────────────────────────── */
function obj(v) {
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
}
function int(v, fallback = 0) {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    return Number.isFinite(n) ? Math.round(n) : fallback;
}
function str(v) {
    return typeof v === "string" ? v : "";
}
/** True on every site that may show the Circle. Carisma Medical never does. */
export function circleAllowedOn(siteBrand = "") {
    return !/medical/i.test(siteBrand);
}
function levelFrom(raw) {
    const o = obj(raw);
    if (!o)
        return null;
    const key = str(o.key);
    const numeral = str(o.numeral);
    const i = CIRCLE_LEVELS.findIndex((l) => l.key === key || (numeral && l.numeral === numeral));
    if (i < 0)
        return null;
    const known = CIRCLE_LEVELS[i];
    return { key: known.key, name: str(o.name) || known.name, numeral: known.numeral, index: i };
}
/**
 * `/client/loyalty/me` → the model, or null when the programme is not live for
 * this member. Null for: `enabled` anything but `true`, no credit block, an
 * unknown level, a non-object body, an envelope around any of those.
 */
export function readCircle(body) {
    const o = obj(unwrapEnvelope(body));
    if (!o || o.enabled !== true)
        return null;
    const credit = obj(o.credit);
    if (!credit)
        return null;
    const level = levelFrom(o.level);
    if (!level)
        return null;
    const points = Math.max(0, int(credit.points));
    const creditCents = Math.max(0, int(credit.cents, points * CENTS_PER_POINT));
    const rules = obj(o.rules) ?? {};
    const minRedeemCents = Math.max(0, int(rules.minRedeemPoints, DEFAULT_MIN_REDEEM_POINTS)) * CENTS_PER_POINT;
    const maxSharePct = int(rules.maxSharePct, DEFAULT_MAX_SHARE_PCT) || DEFAULT_MAX_SHARE_PCT;
    const nl = obj(o.nextLevel);
    const nextBase = nl ? levelFrom(nl) : null;
    const nextLevel = nextBase && nextBase.index > level.index
        ? { ...nextBase, thresholdCents: Math.max(0, int(nl?.thresholdCents, CIRCLE_LEVELS[nextBase.index].thresholdEur * 100)) }
        : null;
    const exp = obj(o.expiring);
    const expCents = exp ? int(exp.cents, int(exp.points) * CENTS_PER_POINT) : 0;
    const nvc = obj(o.nextVisitCredit);
    const nvcCents = nvc ? int(nvc.cents, int(nvc.points) * CENTS_PER_POINT) : 0;
    const pass = obj(o.passport) ?? {};
    const passport = {
        spa: pass.spa === true,
        aesthetics: pass.aesthetics === true,
        slimming: pass.slimming === true,
        count: 0,
    };
    passport.count = [passport.spa, passport.aesthetics, passport.slimming].filter(Boolean).length;
    const actions = (Array.isArray(o.actions) ? o.actions : [])
        .map(obj)
        .filter((a) => Boolean(a && str(a.key) && str(a.label)))
        .map((a) => {
        const pts = Math.max(0, int(a.points));
        return { key: str(a.key), label: str(a.label), points: pts, cents: pts * CENTS_PER_POINT, done: a.done === true };
    });
    const summary = obj(o.actionsSummary);
    const actionsDone = summary ? int(summary.done) : actions.filter((a) => a.done).length;
    const actionsLeftCents = summary
        ? int(summary.leftCents, int(summary.leftPoints) * CENTS_PER_POINT)
        : actions.filter((a) => !a.done).reduce((s, a) => s + a.cents, 0);
    return {
        creditCents,
        points,
        minRedeemCents,
        ready: creditCents >= minRedeemCents && creditCents > 0,
        toReadyCents: Math.max(0, minRedeemCents - creditCents),
        maxSharePct,
        level,
        nextLevel,
        spendThisYearCents: Math.max(0, int(o.spendThisYearCents)),
        headStartCents: Math.max(0, int(o.headStartCents)),
        toNextLevelCents: Math.max(0, int(o.toNextLevelCents)),
        pendingCents: Math.max(0, int(obj(o.pending)?.cents)),
        expiring: exp && expCents > 0 && str(exp.date) ? { cents: expCents, date: str(exp.date) } : null,
        nextVisitCredit: nvc && nvcCents > 0 ? { cents: nvcCents, useBy: str(nvc.useBy) } : null,
        passport,
        actions,
        actionsDone,
        actionsLeftCents: Math.max(0, actionsLeftCents),
    };
}
/* ── Copy ──────────────────────────────────────────────────────────────── */
/** "€62.00" — credit is always two decimals. */
export function creditText(cents) {
    return eur((Number.isFinite(cents) ? cents : 0) / 100);
}
/** "1,240 points" / "1 point". */
export function pointsText(points) {
    const n = Math.round(Number.isFinite(points) ? points : 0);
    return `${n.toLocaleString("en-GB")} point${Math.abs(n) === 1 ? "" : "s"}`;
}
/** "€40" — level-spend euros are whole and rounded UP (never undersell a gap). */
export function wholeEuroUp(cents) {
    const whole = Math.ceil(Math.max(0, cents) / 100);
    return `€${whole.toLocaleString("en-GB")}`;
}
/** "III Golden Hour" — a level never appears without its numeral. */
export function levelText(l) {
    return `${l.numeral} ${l.name}`;
}
function maltaShort(iso) {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms))
        return "";
    try {
        return new Intl.DateTimeFormat("en-GB", { timeZone: MALTA, day: "numeric", month: "short" }).format(new Date(ms));
    }
    catch {
        return "";
    }
}
/** "€20.00 of it until 7 Dec" — the soonest use-by, so nothing lapses unseen. "" when none. */
export function useByText(m) {
    if (!m.expiring)
        return "";
    const d = maltaShort(m.expiring.date);
    return d ? `${creditText(m.expiring.cents)} of it until ${d}` : "";
}
/** "€62.00 ready to use", or below the minimum "€3.25 Carisma credit · €1.75 more and you can use it". */
export function readyText(m) {
    if (m.ready)
        return `${creditText(m.creditCents)} ready to use`;
    if (m.creditCents <= 0)
        return "";
    return `${creditText(m.creditCents)} Carisma credit · ${creditText(m.toReadyCents)} more and you can use it`;
}
/**
 * "Spend €40 more this year to reach Moonlight" — only when one visit closes
 * the gap (≤ €150); otherwise "" and the bar alone tells the story.
 */
export function gapText(m, cap = GAP_NUDGE_MAX_CENTS) {
    if (!m.nextLevel || m.toNextLevelCents <= 0 || m.toNextLevelCents > cap)
        return "";
    return `Spend ${wholeEuroUp(m.toNextLevelCents)} more this year to reach ${m.nextLevel.name}`;
}
/** "2 of 5 done · €29.00 more to earn". */
export function waysToEarnText(m) {
    const of = m.actions.length || 5;
    return `${m.actionsDone} of ${of} done · ${creditText(m.actionsLeftCents)} more to earn`;
}
/** Progress toward the next level, 0..100, including the Welcome start segment. */
export function levelProgress(m) {
    if (!m.nextLevel || m.nextLevel.thresholdCents <= 0)
        return { spentPct: 100, headStartPct: 0 };
    const t = m.nextLevel.thresholdCents;
    const head = Math.min(m.headStartCents, t);
    const spent = Math.min(m.spendThisYearCents, t - head);
    const pct = (n) => Math.max(0, Math.min(100, Math.round((n / t) * 1000) / 10));
    return { spentPct: pct(spent), headStartPct: pct(head) };
}
/* ── Shared pieces ─────────────────────────────────────────────────────── */
/** The five-step ladder, current step marked. Numerals always shown. */
export function ladderHTML(level, cls = "cw-ladder") {
    const steps = CIRCLE_LEVELS.map((l, i) => {
        const state = i < level.index ? " is-past" : i === level.index ? " is-on" : "";
        return `<li class="${cls}__step${state}"${i === level.index ? ' aria-current="step"' : ""}><span class="${cls}__num">${l.numeral}</span></li>`;
    }).join("");
    return (`<ol class="${cls}" aria-label="${escapeHtml(`Level ${level.numeral} of V: ${level.name}`)}">${steps}</ol>`);
}
const COIN = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"></circle><circle cx="12" cy="12" r="4.5"></circle></svg>';
const TICK = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
const ARROW = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
/* ── Header panel row ──────────────────────────────────────────────────── */
/**
 * The header-panel row: "€62.00 ready to use", points and the soonest use-by,
 * the level with its ladder, the verb-gap when one visit closes it. One link
 * to Credit & rewards. "" when the model is null.
 */
export function circlePanelRowHTML(m) {
    if (!m)
        return "";
    const sub = [pointsText(m.points), useByText(m)].filter(Boolean).join(" · ");
    const gap = gapText(m);
    const value = readyText(m) || `${creditText(0)} Carisma credit`;
    return (`<a class="carisma-panel__circle" href="${CIRCLE_HREF}" data-cw-qc="${CIRCLE_QC}" data-cw-circle="panel">` +
        `<span class="carisma-panel__circle-label">Carisma credit</span>` +
        `<span class="carisma-panel__circle-value" ${M}>${escapeHtml(value)}</span>` +
        (sub ? `<span class="carisma-panel__circle-sub" ${M}>${escapeHtml(sub)}</span>` : "") +
        `<span class="carisma-panel__circle-level" ${M}>` +
        `<span class="carisma-panel__circle-chip">${escapeHtml(levelText(m.level))}</span>` +
        ladderHTML(m.level, "carisma-panel__ladder") +
        `</span>` +
        (gap ? `<span class="carisma-panel__circle-gap" ${M}>${escapeHtml(gap)}</span>` : "") +
        `<span class="carisma-panel__circle-more">Credit &amp; rewards</span>` +
        `</a>`);
}
/* ── Overview card ─────────────────────────────────────────────────────── */
/** The Overview card set: credit, level, ways to earn. "" when null. */
/** "Terms" as a link, or "" when the site has no terms page to point at. */
function termsLinkHTML(href, label = "Terms") {
    return href ? `<a class="cw-link" href="${escapeHtml(href)}" data-cw-circle-terms>${escapeHtml(label)}</a>` : "";
}
export function circleOverviewHTML(m, termsHref = CIRCLE_TERMS_HREF) {
    if (!m)
        return "";
    const terms = termsLinkHTML(termsHref);
    const useBy = useByText(m);
    const gap = gapText(m);
    const prog = levelProgress(m);
    const ready = readyText(m);
    return (`<section class="cw-circle-ov cw-rise" aria-labelledby="cw-circle-ov-title" data-cw-qc="${CIRCLE_QC}" data-cw-circle="overview">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-ov-title">Carisma Circle</h2>` +
        `<a class="cw-section__more" href="${CIRCLE_HREF}">Credit &amp; rewards${ARROW}</a></div>` +
        `<div class="cw-circle-ov__grid">` +
        // Credit
        `<div class="cw-card cw-circle-ov__credit">` +
        `<p class="cw-label">Carisma credit</p>` +
        `<p class="cw-circle__value" ${M}>${escapeHtml(creditText(m.creditCents))}</p>` +
        `<p class="cw-circle__points" ${M}>${escapeHtml(pointsText(m.points))}${m.ready ? " · ready now" : ""}</p>` +
        (!m.ready && ready ? `<p class="cw-circle__line" ${M}>${escapeHtml(ready)}</p>` : "") +
        (useBy ? `<p class="cw-circle__line" ${M}>${escapeHtml(useBy)}</p>` : "") +
        `<p class="cw-fine">On up to half of any booking at ${CIRCLE_BRANDS}.${terms ? ` ${terms}` : ""}</p>` +
        `</div>` +
        // Level
        `<div class="cw-card cw-circle-ov__level">` +
        `<p class="cw-label">Your level</p>` +
        `<p class="cw-circle__level" ${M}>${escapeHtml(levelText(m.level))}</p>` +
        ladderHTML(m.level) +
        levelBarHTML(m, prog) +
        (gap ? `<p class="cw-circle__line" ${M}>${escapeHtml(gap)}</p>` : "") +
        `</div>` +
        `</div>` +
        (m.actions.length
            ? `<p class="cw-circle__earn" ${M}><span class="cw-label">Ways to earn</span> ${escapeHtml(waysToEarnText(m))}</p>`
            : "") +
        `</section>`);
}
function levelBarHTML(m, prog = levelProgress(m)) {
    if (!m.nextLevel) {
        return `<p class="cw-circle__line" ${M}>${escapeHtml(`${wholeEuroUp(m.spendThisYearCents)} spent this year`)}</p>`;
    }
    const label = `${wholeEuroUp(m.spendThisYearCents)} of ${wholeEuroUp(m.nextLevel.thresholdCents)} spent this year`;
    return (`<div class="cw-circle-bar" role="img" aria-label="${escapeHtml(`${label}, toward ${levelText(m.nextLevel)}`)}">` +
        (prog.headStartPct > 0
            ? `<span class="cw-circle-bar__head" style="width:${prog.headStartPct}%"></span>`
            : "") +
        `<span class="cw-circle-bar__fill" style="width:${prog.spentPct}%"></span>` +
        `</div>` +
        `<p class="cw-circle__bar-meta" ${M}><span>${escapeHtml(label)}</span>` +
        `<span>${escapeHtml(levelText(m.nextLevel))}</span></p>` +
        (prog.headStartPct > 0 ? `<p class="cw-fine">Includes your Welcome start for the year you joined.</p>` : ""));
}
/* ── Wallet line ───────────────────────────────────────────────────────── */
/**
 * Carisma credit as its own line in the Wallet, NOT added to "Available to
 * spend" (it covers up to half of a booking, so summing it would overstate
 * what a member can pay with). "" when null.
 */
export function circleWalletLineHTML(m) {
    if (!m)
        return "";
    const text = [`${creditText(m.creditCents)} · ${pointsText(m.points)}`, useByText(m)].filter(Boolean).join(" · ");
    return (`<a class="cw-strip cw-rise cw-circle-strip" href="${CIRCLE_HREF}" data-cw-qc="${CIRCLE_QC}" data-cw-circle="wallet">` +
        `<span class="cw-strip__icon">${COIN}</span>` +
        `<span class="cw-strip__text"><span class="cw-strip__label">Carisma credit</span>` +
        `<span class="cw-strip__value" ${M}>${escapeHtml(text)}</span>` +
        `<span class="cw-strip__note">Up to half of any booking at ${CIRCLE_BRANDS}</span></span>` +
        `<span class="cw-strip__arrow" aria-hidden="true">${ARROW}</span></a>`);
}
export function readCircleActivity(body) {
    const o = obj(unwrapEnvelope(body));
    if (!o || o.enabled !== true || !Array.isArray(o.items))
        return null;
    const items = o.items
        .map(obj)
        .filter((r) => Boolean(r && str(r.id)))
        .map((r) => {
        const pts = int(r.points);
        return {
            id: str(r.id),
            at: str(r.at),
            brand: str(obj(r.brand)?.name),
            label: str(r.label) || "Carisma credit",
            points: pts,
            cents: int(r.cents, pts * CENTS_PER_POINT),
            status: str(r.status),
            expiresAt: str(r.expiresAt) || null,
        };
    });
    return { items, nextCursor: str(o.nextCursor) || null };
}
const STATUS_WORD = {
    received: "Received",
    reversed: "Removed",
    expired: "Expired",
    spent: "Spent",
    returned: "Returned",
    adjusted: "Adjusted",
};
function signed(cents) {
    return `${cents < 0 ? "−" : "+"}${creditText(Math.abs(cents))}`;
}
function maltaDay(iso) {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms))
        return "";
    try {
        return new Intl.DateTimeFormat("en-GB", { timeZone: MALTA, day: "numeric", month: "short", year: "numeric" }).format(new Date(ms));
    }
    catch {
        return "";
    }
}
export function circleActivityRowsHTML(items) {
    return items
        .map((it) => {
        const tone = it.cents < 0 || it.status === "spent" || it.status === "reversed" || it.status === "expired" ? "out" : "in";
        const meta = [maltaDay(it.at), it.brand, STATUS_WORD[it.status] || ""].filter(Boolean).join(" · ");
        const exp = it.expiresAt && it.cents > 0 && it.status === "received" ? `Use by ${maltaDay(it.expiresAt)}` : "";
        return (`<li class="cw-circle-act__row" data-cw-act="${escapeHtml(it.id)}">` +
            `<div class="cw-circle-act__text"><p class="cw-circle-act__label" ${M}>${escapeHtml(it.label)}</p>` +
            `<p class="cw-circle-act__meta" ${M}>${escapeHtml([meta, exp].filter(Boolean).join(" · "))}</p></div>` +
            `<p class="cw-circle-act__amt cw-circle-act__amt--${tone}" ${M}>${escapeHtml(signed(it.cents))}` +
            `<span class="cw-circle-act__pts">${escapeHtml(pointsText(Math.abs(it.points)))}</span></p>` +
            `</li>`);
    })
        .join("");
}
export function readCircleRewards(body) {
    const o = obj(unwrapEnvelope(body));
    if (!o || o.enabled !== true || !Array.isArray(o.items))
        return null;
    return o.items
        .map(obj)
        .filter((r) => Boolean(r && str(r.id) && str(r.name)))
        .map((r) => {
        const dp = r.discoveryPoints === null || r.discoveryPoints === undefined ? null : int(r.discoveryPoints);
        return {
            id: str(r.id),
            brand: str(obj(r.brand)?.name),
            name: str(r.name),
            points: Math.max(0, int(r.points)),
            valueCents: Math.max(0, int(r.valueCents)),
            levelLock: str(r.levelLock),
            discovery: r.discovery === true,
            discoveryPoints: dp !== null && dp > 0 ? dp : null,
            affordable: r.affordable === true,
        };
    });
}
/** "Yours now" (all affordable, server order) then at most two "Next up", nearest first. */
export function shopGroups(items) {
    const now = items.filter((r) => r.affordable);
    const next = items
        .filter((r) => !r.affordable)
        .sort((a, b) => (a.discoveryPoints ?? a.points) - (b.discoveryPoints ?? b.points))
        .slice(0, 2);
    return { now, next };
}
function rewardHTML(r, m, yours) {
    const cost = r.discoveryPoints ?? r.points;
    const costCents = cost * CENTS_PER_POINT;
    const lockLevel = r.levelLock ? CIRCLE_LEVELS.find((l) => l.key === r.levelLock) : undefined;
    const locked = lockLevel ? CIRCLE_LEVELS.indexOf(lockLevel) > m.level.index : false;
    const gapCents = Math.max(0, costCents - m.creditCents);
    const note = locked && lockLevel
        ? `Unlocks at ${levelText(lockLevel)}`
        : yours
            ? "Pay in full with credit"
            : `${creditText(gapCents)} more credit and it's yours`;
    return (`<li class="cw-circle-shop__item${yours ? " is-yours" : ""}">` +
        (r.brand ? `<p class="cw-label">${escapeHtml(r.brand)}</p>` : "") +
        `<p class="cw-circle-shop__name">${escapeHtml(r.name)}</p>` +
        (r.discovery && r.discoveryPoints && r.brand
            ? `<p class="cw-circle-shop__disc">${escapeHtml(`Fewer points: your first reward at ${r.brand}`)}</p>`
            : "") +
        `<p class="cw-circle-shop__price">${escapeHtml(`${creditText(costCents)} · ${pointsText(cost)}`)}` +
        // The menu price only when it says something the cost does not (a discovery
        // price, a reward worth more than its points).
        (r.valueCents > costCents ? `<span class="cw-circle-shop__value">${escapeHtml(`${creditText(r.valueCents)} on the menu`)}</span>` : "") +
        `</p>` +
        `<p class="cw-circle-shop__note" ${M}>${escapeHtml(note)}</p>` +
        `</li>`);
}
export function circleShopHTML(items, m) {
    if (!items || !items.length)
        return "";
    const { now, next } = shopGroups(items);
    if (!now.length && !next.length)
        return "";
    const group = (title, list, yours) => list.length
        ? `<div class="cw-circle-shop__group"><h3 class="cw-label">${title}</h3>` +
            `<ul class="cw-circle-shop__list" role="list">${list.map((r) => rewardHTML(r, m, yours)).join("")}</ul></div>`
        : "";
    return (`<section class="cw-section cw-rise cw-circle-shop" aria-labelledby="cw-circle-shop-title" data-cw-circle="shop">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-shop-title">Spend your credit</h2></div>` +
        group("Yours now", now, true) +
        group("Next up", next, false) +
        `<p class="cw-fine">Rewards are paid in full with credit: tell the desk when you arrive. Prices include VAT.</p>` +
        `</section>`);
}
function waysToEarnHTML(m) {
    if (!m.actions.length)
        return "";
    const rows = m.actions
        .map((a) => `<li class="cw-circle-earn__row${a.done ? " is-done" : ""}">` +
        `<span class="cw-circle-earn__tick" aria-hidden="true">${a.done ? TICK : ""}</span>` +
        `<span class="cw-circle-earn__label">${escapeHtml(a.label)}</span>` +
        `<span class="cw-circle-earn__amt">${a.done ? "Done" : escapeHtml(creditText(a.cents))}</span>` +
        `</li>`)
        .join("");
    return (`<section class="cw-section cw-rise cw-circle-earn" aria-labelledby="cw-circle-earn-title" data-cw-circle="earn">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-earn-title">Ways to earn</h2>` +
        `<p class="cw-circle-earn__sum" ${M}>${escapeHtml(waysToEarnText(m))}</p></div>` +
        `<ul class="cw-circle-earn__list" role="list" ${M}>${rows}</ul>` +
        `<p class="cw-fine">Every €1 you pay at ${CIRCLE_BRANDS} earns credit too. ${escapeHtml(EARN_TERMS_LINE)}</p>` +
        `</section>`);
}
function passportHTML(m) {
    const p = m.passport;
    const stamp = (name, on) => `<li class="cw-circle-pass__stamp${on ? " is-on" : ""}"><span class="cw-circle-pass__name">${name}</span>` +
        `<span class="cw-circle-pass__state">${on ? "Visited" : "Not yet"}</span></li>`;
    const missing = [p.spa ? "" : "Carisma Spa", p.aesthetics ? "" : "Carisma Aesthetics", p.slimming ? "" : "Carisma Slimming"].filter(Boolean);
    const line = p.count >= 3
        ? "Full Circle: you've visited all three Carisma brands."
        : missing.length === 1
            ? `${p.count} of 3 Carisma brands · ${missing[0]} completes your Full Circle`
            : `${p.count} of 3 Carisma brands`;
    return (`<section class="cw-section cw-rise cw-circle-pass" aria-labelledby="cw-circle-pass-title" data-cw-circle="passport">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-pass-title">Your Full Circle</h2></div>` +
        `<ul class="cw-circle-pass__list" role="list" ${M}>${stamp("Spa", p.spa)}${stamp("Aesthetics", p.aesthetics)}${stamp("Slimming", p.slimming)}</ul>` +
        `<p class="cw-circle__line" ${M}>${escapeHtml(line)}</p>` +
        `</section>`);
}
export function circleActivityHTML(m, activity) {
    const pending = m.pendingCents > 0
        ? `<p class="cw-circle__line" ${M}>${escapeHtml(`On its way: ${creditText(m.pendingCents)} when you pay`)}</p>`
        : "";
    const list = activity && activity.items.length
        ? `<ul class="cw-circle-act" role="list" data-cw-circle-activity>${circleActivityRowsHTML(activity.items)}</ul>` +
            (activity.nextCursor
                ? `<button type="button" class="cw-btn cw-btn--secondary cw-btn--sm" data-cw-circle-more="${escapeHtml(activity.nextCursor)}">Show more</button>`
                : "")
        : activity
            ? `<p class="cw-muted">Your credit activity will show here after your first paid visit.</p>`
            : "";
    if (!pending && !list)
        return "";
    return (`<section class="cw-section cw-rise" aria-labelledby="cw-circle-act-title" data-cw-circle="activity">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-act-title">Activity</h2></div>` +
        pending +
        list +
        `</section>`);
}
/** The whole Credit & rewards page body. "" when the member read is null. */
export function circleViewHTML(input) {
    if (!input)
        return "";
    const m = input.me;
    const terms = termsLinkHTML(input.termsHref === undefined ? CIRCLE_TERMS_HREF : input.termsHref, "Terms of Carisma Circle");
    const useBy = useByText(m);
    const gap = gapText(m);
    const ready = readyText(m);
    const nvc = m.nextVisitCredit && m.nextVisitCredit.useBy
        ? `Includes ${creditText(m.nextVisitCredit.cents)} next-visit credit, use by ${maltaShort(m.nextVisitCredit.useBy)}`
        : "";
    const hero = `<section class="cw-balance cw-circle-hero cw-rise" aria-label="Carisma credit" data-cw-circle="balance">` +
        `<p class="cw-label">Carisma credit</p>` +
        `<p class="cw-balance__value" ${M}>${escapeHtml(creditText(m.creditCents))}</p>` +
        `<p class="cw-balance__sources" ${M}>${escapeHtml([pointsText(m.points), m.ready ? "ready to use" : ""].filter(Boolean).join(" · "))}</p>` +
        (!m.ready && ready ? `<p class="cw-circle__line" ${M}>${escapeHtml(ready)}</p>` : "") +
        (useBy ? `<p class="cw-circle__line" ${M}>${escapeHtml(useBy)}</p>` : "") +
        (nvc ? `<p class="cw-circle__line" ${M}>${escapeHtml(nvc)}</p>` : "") +
        `<p class="cw-circle__rule">At checkout: up to half of any booking at ${CIRCLE_BRANDS}, from ${escapeHtml(creditText(m.minRedeemCents))}.</p>` +
        (input.bookHref
            ? `<div class="cw-actions"><a class="cw-btn cw-btn--primary" href="${escapeHtml(input.bookHref)}">Book and use it</a></div>`
            : "") +
        `</section>`;
    const level = `<section class="cw-card cw-rise cw-circle-level" aria-labelledby="cw-circle-level-title" data-cw-circle="level">` +
        `<p class="cw-label" id="cw-circle-level-title">Your level</p>` +
        `<p class="cw-circle__level" ${M}>${escapeHtml(levelText(m.level))}</p>` +
        ladderHTML(m.level) +
        levelBarHTML(m) +
        (gap ? `<p class="cw-circle__line" ${M}>${escapeHtml(gap)}</p>` : "") +
        `<p class="cw-fine">Your level counts what you pay at ${CIRCLE_BRANDS} in a calendar year. It lasts the rest of the year you reach it and all of the next.</p>` +
        `</section>`;
    return (`<div class="cw-rec cw-circle" data-cw-qc="${CIRCLE_QC}">` +
        hero +
        level +
        waysToEarnHTML(m) +
        circleActivityHTML(m, input.activity) +
        circleShopHTML(input.rewards, m) +
        passportHTML(m) +
        `<p class="cw-fine cw-prose">${escapeHtml(PROMISE_QUALIFIER)}${terms ? ` ${terms}` : ""}</p>` +
        `</div>`);
}
const NONE = { kind: "none", hero: "", sentence: "", conditions: [], quiet: "" };
/**
 * The Bible's render rule (storeCredit.renderRule), in one place for every
 * site: the hero and "You can use it already" only when this bill gave credit,
 * the spendable balance is at least €5.00 and there is no excluded line;
 * otherwise the one quiet line; an excluded line shows nothing here. With the
 * balance unknown, "You can use it already" is said only when THIS bill alone
 * reaches the minimum (then the balance does too), and the figure is the
 * bill's — never a balance we were not given.
 */
export function creditMoment(input) {
    if (!input)
        return NONE;
    const earned = Math.round(Number(input.earnedCents) || 0);
    if (earned <= 0 || input.hasExcludedLine === true)
        return NONE;
    const known = typeof input.balanceCents === "number" && Number.isFinite(input.balanceCents);
    const balance = known ? Math.round(input.balanceCents) : null;
    const min = input.minRedeemCents ?? DEFAULT_MIN_REDEEM_POINTS * CENTS_PER_POINT;
    const ready = balance !== null ? balance >= min : earned >= min;
    if (ready) {
        const d = input.useBy && input.useBy.cents > 0 ? maltaShort(input.useBy.date) : "";
        return {
            kind: balance !== null ? "hero" : "received",
            hero: balance !== null ? `${creditText(balance)} ready to use` : creditText(earned),
            sentence: `You've just received ${creditText(earned)} in Carisma credit, usable at ${CIRCLE_BRANDS}. You can use it already.`,
            conditions: [
                "On up to half of any other booking",
                ...(d && input.useBy ? [`${creditText(input.useBy.cents)} of it until ${d}`] : []),
                "Comes off if this booking is cancelled",
            ],
            quiet: "",
        };
    }
    return {
        kind: "quiet",
        hero: "",
        sentence: "",
        conditions: [],
        quiet: balance !== null
            ? `${creditText(earned)} added to your Carisma credit · ${creditText(Math.max(0, min - balance))} more and you can use it.`
            : `${creditText(earned)} added to your Carisma credit.`,
    };
}
/** The pay-step disclosure (Bible storeCredit.payStepDisclosure), word for word. */
export const PAY_STEP_DISCLOSURE = "If you cancel, the credit this booking gives you is removed; if you've already used it, its value comes off your refund.";
/**
 * "You'll receive €X in Carisma credit" for a pre-payment line, from the euros
 * a booking will charge on eligible lines and the member's level multiplier.
 * floor(euros × multiplier) points, 20 points = €1 (Bible amountRule). Returns
 * "" below one point. `from` prefixes "from" for a price that is a floor.
 */
export function earnLine(eligibleCents, multiplier = 1, from = false) {
    const pts = earnPoints(eligibleCents, multiplier);
    if (pts <= 0)
        return "";
    return `You'll receive ${from ? "from " : ""}${creditText(pts * CENTS_PER_POINT)} in Carisma credit`;
}
/** floor(eligible euros × multiplier) points — whole euros paid, VAT-inclusive. */
export function earnPoints(eligibleCents, multiplier = 1) {
    const euros = Math.max(0, Number(eligibleCents) || 0) / 100;
    const m = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
    return Math.floor(euros * m + 1e-9);
}
//# sourceMappingURL=circle.js.map