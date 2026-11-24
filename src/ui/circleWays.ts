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
import {
  M,
  NB,
  REVIEWS_FOOTNOTE,
  brandsLine,
  countWord,
  creditPointsText,
  creditText,
  pointsText,
  type CircleAction,
  type CircleModel,
} from "./circleCore.js";

const TICK =
  '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';

const BRAND_BONUS_KEYS = new Set(["first_house", "second_house", "full_circle"]);

/** "+€2.50 · 50 points" — one figure, euro first, never broken inside (board 10's `fig`). */
export function actionValueText(a: { cents: number; points: number }): string {
  return `+${creditPointsText(a.cents, a.points)}`;
}

/** "3 of 6 done · €30.00 more to earn". "" when the server sent no actions. */
export function waysSummaryText(m: CircleModel): string {
  if (!m.actionsOf) return "";
  const left = Math.round((m.actionsLeftPoints * 100) / m.pointsPerEuro);
  return `${m.actionsDone} of ${m.actionsOf} done` + (left > 0 ? ` · ${creditText(left)} more to earn` : "");
}

/** The Instagram tap target: the brand's own profile, in a new tab; browser.ts adds the award. */
export function instagramLinkHTML(a: CircleAction, label = "Follow"): string {
  return (
    `<a class="cc-ig" href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer"` +
    ` data-cw-circle-ig="${escapeHtml(a.brandId)}">${escapeHtml(label)}</a>`
  );
}

function hintFor(a: CircleAction, m: CircleModel): string {
  if (a.done) return "";
  if (a.key === "verified_email") return "Sign in with your email";
  if (BRAND_BONUS_KEYS.has(a.key) && m.brandBonusMinCents > 0) {
    return `A first purchase of ${creditText(m.brandBonusMinCents)} or more`;
  }
  return "";
}

function rowHTML(a: CircleAction, m: CircleModel): string {
  const hint = hintFor(a, m);
  const right = a.done
    ? `<span class="cc-way__done">${TICK}Done</span>`
    : a.key === "instagram"
      ? instagramLinkHTML(a)
      : "";
  return (
    `<li class="cc-way${a.done ? " is-done" : ""}" data-cw-circle-way="${escapeHtml(a.id)}">` +
    `<span class="cc-way__text"><b>${escapeHtml(a.label)}</b>` +
    `<span ${M}>${escapeHtml(a.done ? pointsText(a.points) : actionValueText(a))}${hint ? ` · ${escapeHtml(hint)}` : ""}</span></span>` +
    right +
    `</li>`
  );
}

/** The Ways to earn section. "" when the member read is null. */
export function circleWaysHTML(m: CircleModel | null, opts: { title?: string } = {}): string {
  if (!m) return "";
  const sum = waysSummaryText(m);
  const line = brandsLine(m.brands);
  const rows = m.actions.map((a) => rowHTML(a, m)).join("");
  return (
    `<section class="cw-section cw-rise cc-ways" aria-labelledby="cw-circle-earn-title" data-cw-circle="earn">` +
    `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-earn-title">${escapeHtml(opts.title ?? "Ways to earn")}</h2>` +
    (sum ? `<p class="cc-ways__sum" ${M}>${escapeHtml(sum)}</p>` : "") +
    `</div>` +
    (rows ? `<ul class="cc-ways__list" role="list">${rows}</ul>` : "") +
    // Counsel's "on eligible treatments" (surface-consistency rows 18/21); the footnote is v2's (follows now earn).
    `<p class="cw-fine">${escapeHtml(`Every €1 you pay on eligible treatments${line ? ` at ${line}` : ""} earns credit too. ${REVIEWS_FOOTNOTE}`)}</p>` +
    `</section>`
  );
}

/** "Friday" for a visit's start, in Malta; "" when unreadable. */
function maltaWeekday(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", weekday: "long" }).format(new Date(ms));
  } catch {
    return "";
  }
}

/** Board 10's line icons, one per card, in the site's gold ink (decorative). */
const ICON = {
  rebook:
    '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"></rect><path d="M16 2.5v4M8 2.5v4M3 10h18M12 13v5M9.5 15.5h5"></path></svg>',
  bag: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.2 8h13.6l-.9 12.5H6.1z"></path><path d="M9 8V6.6a3 3 0 0 1 6 0V8"></path></svg>',
  pin: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s-6.5-5.9-6.5-11a6.5 6.5 0 0 1 13 0c0 5.1-6.5 11-6.5 11z"></path><circle cx="12" cy="10.4" r="2.4"></circle></svg>',
  friend:
    '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.5" cy="8" r="3.6"></circle><path d="M3 20v-.8a5.7 5.7 0 0 1 5.7-5.7h1.6a5.7 5.7 0 0 1 5.7 5.7v.8M19 8.5v5M16.5 11h5"></path></svg>',
  insta:
    '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"></rect><circle cx="12" cy="12" r="3.8"></circle><path d="M16.9 7.1h.01"></path></svg>',
  star: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"></path></svg>',
};

interface EarnCard {
  id: string;
  title: string;
  icon: string;
  /** The ONE figure: its bold lead ("+€5.95") and the rest (" · 119 points"), as board 10 writes it. */
  bold: string;
  rest?: string;
  sub: string;
  wide?: boolean;
  /** The card's own text action. */
  action?: string;
}

/** "+€5.95 · 119 points": the euro lead in bold, the points after it, never broken inside. */
function money(lead: string, cents: number, points: number): { bold: string; rest: string } {
  return { bold: `${lead}${creditText(cents)}`, rest: `${NB}·${NB}${pointsText(points)}` };
}

function earnCardHTML(c: EarnCard): string {
  return (
    `<li class="cc-earn-card${c.wide ? " wide" : ""}" data-cw-circle-way="${escapeHtml(c.id)}">` +
    `<i class="cc-earn-card__ic">${c.icon}</i>` +
    `<p class="cc-earn-card__t">${escapeHtml(c.title)}</p>` +
    (c.action ?? "") +
    `<p class="cc-earn-card__fig" ${M}><b>${escapeHtml(c.bold)}</b>${escapeHtml(c.rest ?? "")}</p>` +
    (c.sub ? `<p class="cc-earn-card__s" ${M}>${escapeHtml(c.sub)}</p>` : "") +
    `</li>`
  );
}

/**
 * The account overview's "More ways to earn" (ADDENDUM KIT-2, board 10): a card each, ONE figure each, every figure
 * the server's. In the board's order: "Book your next visit before you leave" (only from `/me.rebookNext`, BE-k),
 * "Spa products" (only with the public status's retail boost and Carisma Spa switched on), the brand bonuses
 * (Full Circle; X10 drops them while one house is on), "Refer a friend" (only while `/me.referral` pays her in
 * points, X8/BE-j: never a typed 2,000), "Follow … on Instagram" (from `/me.actions`), then any other open action.
 * "" when there is nothing to earn.
 */
export function circleWaysCardsHTML(
  m: CircleModel | null,
  opts: {
    retailBoostPct?: number | null;
    /**
     * W-16 (Credit and rewards): counsel's money line ("Every €1 you pay on eligible treatments at Carisma Spa earns
     * credit too.", surface-consistency rows 18/21) before the reviews footnote, and the section drawn even when no
     * card is left (the line still holds). The Overview keeps the footnote alone (as built and reviewed).
     */
    moneyLine?: boolean;
  } = {},
): string {
  if (!m) return "";
  const cards: EarnCard[] = [];
  if (m.rebookNext) {
    const day = maltaWeekday(m.rebookNext.startAt);
    cards.push({
      id: "rebook",
      icon: ICON.rebook,
      title: "Book your next visit before you leave",
      ...money("+", m.rebookNext.cents, m.rebookNext.points),
      sub: day ? `on ${day}\u2019s visit` : "",
    });
  }
  const spa = m.brands.find((b) => b.house === "spa");
  const boost = Math.round(Number(opts.retailBoostPct) || 0);
  if (spa && boost > 0) {
    cards.push({ id: "retail", icon: ICON.bag, title: "Spa products", bold: `${boost}% more points`, sub: `on the products you buy at ${spa.name}` });
  }
  const open = m.actions.filter((a) => !a.done);
  const bonus = open.filter((a) => BRAND_BONUS_KEYS.has(a.key));
  const insta = open.filter((a) => a.key === "instagram");
  const rest = open.filter((a) => !BRAND_BONUS_KEYS.has(a.key) && a.key !== "instagram");
  for (const a of bonus) {
    const passport =
      (a.key === "second_house" || a.key === "full_circle") && m.brands.length >= 2
        ? `Full Circle: ${m.passport.count} of ${m.brands.length} Carisma brands`
        : "";
    cards.push({ id: a.id, icon: ICON.pin, title: a.label, ...money("+", a.cents, a.points), sub: passport || hintFor(a, m) });
  }
  if (m.referral) {
    const r = m.referral;
    cards.push({
      id: "referral",
      icon: ICON.friend,
      title: "Refer a friend",
      ...money("Up to ", r.upToCents, r.upToPoints),
      sub: `for your first ${countWord(r.ladder.length)} friend${r.ladder.length === 1 ? "" : "s"}`,
      wide: true,
      // Share opens Refer a friend (/refer): the warm message with the link, WhatsApp, email, text (referral-flow-20261124).
      // Copy my link stays for the bare URL.
      action:
        `<span class="cc-earn-card__act cc-earn-card__acts">` +
        `<a class="cc-earn-card__btn" href="/refer" data-cw-circle-share>Share</a>` +
        (r.link ? `<button type="button" class="cc-earn-card__btn" data-cw-circle-copy="${escapeHtml(r.link)}">Copy my link</button>` : "") +
        `</span>`,
    });
  }
  for (const a of insta) {
    cards.push({
      id: a.id,
      icon: ICON.insta,
      title: a.label,
      ...money("+", a.cents, a.points),
      sub: "when you tap Follow, once for each Carisma brand",
      wide: true,
      action: instagramLinkHTML(a).replace('class="cc-ig"', 'class="cc-ig cc-earn-card__act"'),
    });
  }
  for (const a of rest) cards.push({ id: a.id, icon: ICON.star, title: a.label, ...money("+", a.cents, a.points), sub: hintFor(a, m) });
  if (!cards.length && !opts.moneyLine) return "";
  const line = brandsLine(m.brands);
  const foot = opts.moneyLine ? `Every €1 you pay on eligible treatments${line ? ` at ${line}` : ""} earns credit too. ${REVIEWS_FOOTNOTE}` : REVIEWS_FOOTNOTE;
  return (
    `<section class="cw-section cw-rise cc-earn" aria-labelledby="cw-circle-more-title" data-cw-circle="earn-cards">` +
    `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-more-title">More ways to earn</h2></div>` +
    (cards.length ? `<ul class="cc-earn__grid" role="list">${cards.map(earnCardHTML).join("")}</ul>` : "") +
    `<p class="cw-fine">${escapeHtml(foot)}</p>` +
    `<p class="cw-circle-prefs__msg" role="status" aria-live="polite" data-cw-circle-copy-msg></p>` +
    `</section>`
  );
}
