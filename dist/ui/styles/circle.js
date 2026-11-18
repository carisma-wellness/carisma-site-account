/**
 * Carisma Circle: the Overview card set, the Credit & rewards page, the
 * wallet line. Same contract as every portal sheet: each rule starts
 * `.carisma-portal` and reads only `var(--cw-account-*)` (no raw colour —
 * test/portal-wave1.test.mjs reads PORTAL_RULES_CSS for hex and rgba).
 *
 * A Circle slot is drawn `hidden` and stays out of the layout until
 * browser.ts fills it, so a site whose member read answers enabled:false
 * renders pixel-for-pixel what it rendered before.
 */
export const PORTAL_CIRCLE_CSS = `
/* ── Slots: nothing until filled ─────────────────────────────────────── */
.carisma-portal .cw-circle-slot[hidden], .carisma-portal [data-cw-circle-rail][hidden] { display: none !important; }
.carisma-portal .cw-circle-slot { display: contents; }

/* ── Shared figures ───────────────────────────────────────────────────── */
.carisma-portal .cw-circle__value {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  font-size: 40px;
  line-height: 1.05;
  color: var(--cw-account-display-ink);
  font-variant-numeric: lining-nums tabular-nums;
}
.carisma-portal .cw-circle__points { font-size: 14px; line-height: 20px; color: var(--cw-account-accent-text); font-weight: 500; }
.carisma-portal .cw-circle__line { font-size: 15px; line-height: 22px; color: var(--cw-account-ink); }
.carisma-portal .cw-circle__rule { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
.carisma-portal .cw-circle__level {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  text-transform: var(--cw-account-display-case);
  letter-spacing: var(--cw-account-display-tracking);
  font-size: 24px;
  line-height: 30px;
  color: var(--cw-account-display-ink);
}

/* ── Overview card set ───────────────────────────────────────────────── */
.carisma-portal .cw-circle-ov { display: grid; gap: 16px; }

/* ── Credit & rewards page ───────────────────────────────────────────── */
.carisma-portal .cw-circle { gap: 40px; }
.carisma-portal .cw-circle-act { list-style: none; display: grid; }

.carisma-portal .cw-circle-act__row {
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  padding: 14px 0; border-top: 1px solid var(--cw-account-line);
}
.carisma-portal .cw-circle-act__text { min-width: 0; display: grid; gap: 2px; }
.carisma-portal .cw-circle-act__label { font-size: 15px; line-height: 22px; overflow-wrap: anywhere; }
.carisma-portal .cw-circle-act__meta { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
.carisma-portal .cw-circle-act__amt { display: grid; justify-items: end; font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; }
.carisma-portal .cw-circle-act__amt--in { color: var(--cw-account-ok-text); }
.carisma-portal .cw-circle-act__amt--out { color: var(--cw-account-ink); }
.carisma-portal .cw-circle-act__pts { font-size: 12px; line-height: 16px; font-weight: 400; color: var(--cw-account-muted); }
.carisma-portal .cw-circle-act + .cw-btn { margin-top: 12px; }

/* ── A member who left (W3): the date, what rejoining means, Rejoin ──── */
.carisma-portal .cw-circle-left { display: grid; gap: 10px; align-content: start; }
.carisma-portal .cw-circle-left .cw-actions { margin-top: 6px; }
.carisma-portal .cw-circle-left-wrap { display: grid; }

/* ── Offers and reminders (W3): two boxes, three brands ──────────────── */
.carisma-portal .cw-circle-prefs__card { display: grid; gap: 14px; }
.carisma-portal .cw-circle-prefs__row { display: grid; grid-template-columns: 22px minmax(0, 1fr); align-items: start; gap: 12px; }
.carisma-portal .cw-circle-prefs__box {
  width: 20px; height: 20px; margin: 1px 0 0; accent-color: var(--cw-account-accent);
  cursor: pointer;
}
.carisma-portal .cw-circle-prefs__box:focus-visible { outline: 2px solid var(--cw-account-focus); outline-offset: 2px; }
.carisma-portal .cw-circle-prefs__box[disabled] { cursor: progress; opacity: 0.6; }
.carisma-portal .cw-circle-prefs__label { font-size: 15px; line-height: 22px; color: var(--cw-account-ink); cursor: pointer; }
.carisma-portal .cw-circle-prefs__note { margin: -6px 0 0 34px; font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
.carisma-portal .cw-circle-prefs__msg { font-size: 14px; line-height: 20px; min-height: 0; }
.carisma-portal .cw-circle-prefs__msg:empty { display: none; }
.carisma-portal .cw-circle-prefs__msg--ok { color: var(--cw-account-ok-text); }
.carisma-portal .cw-circle-prefs__msg--bad { color: var(--cw-account-bad-text); }

/* ── Leave Carisma Circle (W3): quiet, at the very foot ──────────────── */
.carisma-portal .cw-circle-leave { display: grid; gap: 6px; justify-items: start; padding-top: 24px; border-top: 1px solid var(--cw-account-line); }
.carisma-portal .cw-circle-leave__btn { color: var(--cw-account-bad-text); }

/* ── Circle profile in Details (W4): comfort, birthday, WhatsApp updates ── */
.carisma-portal .cw-circle-profile { display: grid; gap: 40px; margin-top: 40px; }
.carisma-portal .cw-circle-profile__card { display: grid; gap: 16px; }
.carisma-portal .cw-comfort__group { display: grid; gap: 8px; border: 0; margin: 0; padding: 0; min-width: 0; }
.carisma-portal .cw-comfort__opts { display: flex; flex-wrap: wrap; gap: 8px; }
.carisma-portal .cw-comfort__opt { position: relative; display: inline-flex; }
.carisma-portal .cw-comfort__radio { position: absolute; opacity: 0; width: 1px; height: 1px; margin: 0; }
.carisma-portal .cw-comfort__chip {
  display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px;
  border: 1px solid var(--cw-account-line-strong); border-radius: 999px;
  font-size: 14px; line-height: 20px; color: var(--cw-account-ink); background: var(--cw-account-surface);
  cursor: pointer;
}
.carisma-portal .cw-comfort__radio:checked + .cw-comfort__chip {
  background: var(--cw-account-accent-fill); color: var(--cw-account-accent-ink); border-color: transparent;
}
.carisma-portal .cw-comfort__radio:focus-visible + .cw-comfort__chip { outline: 2px solid var(--cw-account-focus); outline-offset: 2px; }
.carisma-portal .cw-comfort__radio[disabled] + .cw-comfort__chip { cursor: progress; opacity: 0.6; }
.carisma-portal .cw-bday__row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.carisma-portal .cw-bday__select {
  min-height: 44px; padding: 0 12px; border: 1px solid var(--cw-account-line-strong); border-radius: var(--cw-account-radius-control);
  background: var(--cw-account-surface); color: var(--cw-account-ink); font: inherit; font-size: 15px;
}
.carisma-portal .cw-bday__select:focus-visible { outline: 2px solid var(--cw-account-focus); outline-offset: 2px; }
.carisma-portal .cw-circle-earn__missing { display: block; margin-top: 2px; font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }

/* ── Wallet line ─────────────────────────────────────────────────────── */
.carisma-portal .cw-strip__note { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }

@media (max-width: 720px) {
    .carisma-portal .cw-circle__value { font-size: 34px; }
}

/* ── Circle v2: the account dashboard and the Credit & rewards top ───── */
.carisma-portal .cc-dash { display: grid; gap: 24px; }
.carisma-portal .cc-dash__panel, .carisma-portal .cc-view__top { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; align-items: start; }
.carisma-portal .cc-dash__level, .carisma-portal .cc-view__track { display: grid; align-content: start; row-gap: 16px; padding: 24px;
  border: 1px solid var(--cw-account-line); border-radius: var(--cw-account-radius); background: var(--cw-account-surface); }
@media (max-width: 760px) {
  .carisma-portal .cc-dash__panel, .carisma-portal .cc-view__top { grid-template-columns: minmax(0, 1fr); }
  .carisma-portal .cc-hero > .cc-bal { font-size: 40px; line-height: 46px; }
}
${circlePartsCSS(".carisma-portal")}`;
/**
 * The header-panel row. The panel sheet (chromeCss.ts) is not under
 * `.carisma-portal`, so these rules are scoped to `.carisma-panel__circle`.
 */
/**
 * Circle v2 parts (carisma-circle-v2-20261117): the jewel slot, the level, the
 * balance, the reading, the track, the Hero, the ink pill, the reward photo
 * cards, the ladder, ways to earn, perks. One generator, every rule under the
 * caller's scope and token-only, so the portal, the header panel and a site's
 * own wrapper (the Spa's pay step, thank-you page, programme page) draw the
 * same parts from the same source.
 */
export function circlePartsCSS(scope) {
    const S = scope.trim();
    return `
/* the jewel slot: a fixed box (width 0.84 × height); the flat mark or poster shows until the first 3D frame */
${S} .cc-jw { position: relative; display: inline-grid; place-items: center; flex: none; vertical-align: middle; }
${S} .cc-jw > .cc-jw__mark, ${S} .cc-jw > .cc-jw__poster { grid-area: 1 / 1; display: grid; place-items: center; width: 100%; height: 100%; transition: opacity 240ms ease; }
${S} .cc-jw > .cc-jw__poster { object-fit: contain; }
${S} .cc-jw > .cc-jw__canvas { grid-area: 1 / 1; display: block; width: 100%; height: 100%; opacity: 0; transition: opacity 240ms ease; }
${S} .cc-jw[data-cw-jewel-live] > .cc-jw__canvas { opacity: 1; }
${S} .cc-jw[data-cw-jewel-live] > .cc-jw__mark, ${S} .cc-jw[data-cw-jewel-live] > .cc-jw__poster { opacity: 0; }
@media (prefers-reduced-motion: reduce) { ${S} .cc-jw > * { transition: none; } }
${S} .cc-mark { display: block; flex: none; }

/* words under the jewel, never on it */
${S} .cc-eyebrow { font-family: var(--cw-account-label-font); font-size: 12px; line-height: 16px; font-weight: 600; letter-spacing: var(--cw-account-label-tracking); text-transform: uppercase; color: var(--cw-account-muted); font-style: normal; }
${S} .cc-level { font-size: 16px; line-height: 22px; font-weight: 600; color: var(--cw-account-muted); }
${S} .cc-bal { font-family: var(--cw-account-display-font); font-weight: var(--cw-account-display-weight); color: var(--cw-account-display-ink); font-variant-numeric: lining-nums tabular-nums; white-space: nowrap; letter-spacing: 0.01em; }
${S} .cc-read { font-size: 15px; line-height: 22px; color: var(--cw-account-muted); }
${S} .cc-next { font-size: 16px; line-height: 24px; color: var(--cw-account-ink); }
${S} .cc-note { font-size: 14px; line-height: 20px; color: var(--cw-account-ink); }
/* ADDENDUM X4: the dated part of the balance, directly under it ("€20.00 of it until Mon 7 Dec"). */
${S} .cc-dated { font-size: 14px; line-height: 20px; color: var(--cw-account-ink); font-variant-numeric: lining-nums tabular-nums; }
${S} .cc-cond { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); max-width: 44ch; }
${S} .cc-link, ${S} .cc-cond a, ${S} .cc-read a { color: var(--cw-account-circle-link); text-decoration: underline; text-underline-offset: 2px; }
/* the ONE action: the ink pill (gold is a material, never a Circle button) */
${S} .cc-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 28px; border-radius: 999px; border: 0;
  background: var(--cw-account-circle-btn); color: var(--cw-account-circle-btn-ink); font-family: var(--cw-account-label-font); font-weight: 700;
  font-size: 13px; line-height: 1; letter-spacing: var(--cw-account-label-tracking); text-transform: uppercase; text-decoration: none; cursor: pointer; white-space: nowrap; }
${S} .cc-btn:hover { filter: brightness(1.18); }
${S} .cc-btn:focus-visible { outline: 2px solid var(--cw-account-focus); outline-offset: 3px; }
${S} .cc-plate { display: grid; place-items: center; background: linear-gradient(170deg, var(--cw-account-circle-ground-a), var(--cw-account-circle-ground-b)); }

/* the Hero: jewel 240, then the words in their fixed order */
${S} .cc-hero { display: grid; justify-items: center; text-align: center; padding: 24px 24px 28px; border-radius: var(--cw-account-radius);
  background: linear-gradient(170deg, var(--cw-account-circle-ground-a), var(--cw-account-circle-ground-b)); box-shadow: inset 0 0 0 1px var(--cw-account-line); }
${S} .cc-hero > .cc-level { margin-top: 20px; }
${S} .cc-hero > .cc-bal { font-size: 48px; line-height: 52px; margin-top: 4px; }
${S} .cc-hero > .cc-read { margin-top: 4px; }
${S} .cc-hero > .cc-note { margin-top: 4px; }
${S} .cc-hero > .cc-dated { margin-top: 2px; }
${S} .cc-hero > .cc-next { margin-top: 16px; max-width: 36ch; }
${S} .cc-hero > .cc-btn { margin-top: 24px; width: 100%; max-width: 320px; }
${S} .cc-hero > .cc-cond { margin-top: 12px; }

/* the level track: her jewel, the bar, the next stone */
${S} .cc-track { display: grid; row-gap: 10px; width: 100%; text-align: left; }
${S} .cc-track-h { font-size: 16px; line-height: 24px; font-weight: 600; color: var(--cw-account-ink); }
${S} .cc-track-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; column-gap: 12px; align-items: center; }
${S} .cc-track-row.top { grid-template-columns: auto minmax(0, 1fr); }
${S} .cc-bar { position: relative; top: -5px; height: 8px; border-radius: 4px; background: var(--cw-account-circle-track); overflow: hidden; }
${S} .cc-bar > i { position: absolute; left: 0; top: 0; bottom: 0; min-width: 8px; border-radius: 4px; background: linear-gradient(90deg, var(--cw-account-circle-gold-a), var(--cw-account-circle-gold-b)); }
${S} .cc-track-cap { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
${S} .cc-track-cap > span:last-child { text-align: right; white-space: nowrap; }
${S} .cc-track-line { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
${S} .cc-track.compact { row-gap: 8px; }
${S} .cc-track.compact .cc-track-h { font-size: 15px; line-height: 22px; }
${S} .cc-unlocks, ${S} .cc-gives { display: grid; row-gap: 8px; margin-top: 6px; }
${S} .cc-unlocks ul, ${S} .cc-gives ul { list-style: none; margin: 0; padding: 0; display: grid; row-gap: 6px; }
${S} .cc-unlocks li, ${S} .cc-gives li { position: relative; padding-left: 22px; font-size: 15px; line-height: 22px; color: var(--cw-account-ink); }
${S} .cc-unlocks li::before, ${S} .cc-gives li::before { content: ""; position: absolute; left: 3px; top: 7px; width: 8px; height: 8px; transform: rotate(45deg);
  background: linear-gradient(135deg, var(--cw-account-circle-gold-a), var(--cw-account-circle-gold-b)); }

/* what her points buy: photo cards */
${S} .cc-rewards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; list-style: none; margin: 0; padding: 0; }
${S} .cc-reward { border: 1px solid var(--cw-account-line); border-radius: var(--cw-account-radius); overflow: hidden; background: var(--cw-account-surface); }
${S} .cc-reward__in { display: grid; align-content: start; height: 100%; color: inherit; text-decoration: none; }
${S} .cc-reward__in > img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
${S} .cc-reward__t { display: grid; row-gap: 4px; padding: 14px 16px 16px; text-align: left; }
${S} .cc-reward__t b { font-size: 16px; line-height: 22px; font-weight: 600; color: var(--cw-account-ink); }
${S} .cc-reward__t > span:last-child { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
${S} .cc-reward.on .cc-eyebrow { color: var(--cw-account-circle-link); }
${S} .cc-rewards.scroll { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 240px; overflow-x: auto; scroll-snap-type: x mandatory; }
${S} .cc-now { display: grid; grid-template-columns: 56px minmax(0, 1fr); column-gap: 14px; align-items: center; padding: 10px 12px 10px 10px;
  border: 1px solid var(--cw-account-line); border-radius: 14px; color: var(--cw-account-ink); text-decoration: none; text-align: left; }
${S} .cc-now > img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; }
${S} .cc-now > span { display: grid; grid-column: 2; }
${S} .cc-now b { font-size: 15px; line-height: 20px; font-weight: 600; }
${S} .cc-now small { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }

/* the ladder: all five levels */
${S} .cc-ladder { list-style: none; margin: 0; padding: 0; display: grid; }
${S} .cc-rung { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; column-gap: 16px; align-items: center; min-height: 72px; padding: 0 12px; border-bottom: 1px solid var(--cw-account-line); }
${S} .cc-rung:last-child { border-bottom: 0; }
${S} .cc-rung__t b { display: block; font-size: 16px; line-height: 22px; font-weight: 600; color: var(--cw-account-ink); }
${S} .cc-rung__t span { display: block; font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
${S} .cc-rung.todo .cc-rung__t b { color: var(--cw-account-muted); }
${S} .cc-rung.you { background: var(--cw-account-circle-ground-a); border-radius: 14px; border-bottom-color: transparent; }
${S} .cc-you { font-size: 12px; line-height: 16px; font-weight: 600; color: var(--cw-account-circle-link); }

/* ways to earn, earn cards, perks, member number */
${S} .cc-ways__list, ${S} .cc-perks__list { list-style: none; margin: 0; padding: 0; display: grid; }
${S} .cc-way, ${S} .cc-perk { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; padding: 10px 0; border-bottom: 1px solid var(--cw-account-line); }
${S} .cc-way__text { display: grid; row-gap: 2px; }
${S} .cc-way__text b { font-size: 15px; line-height: 21px; font-weight: 600; color: var(--cw-account-ink); }
${S} .cc-way__text span { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
${S} .cc-way.is-done .cc-way__text b { color: var(--cw-account-muted); }
${S} .cc-way__done { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: var(--cw-account-ok-text); white-space: nowrap; }
${S} .cc-ig { display: inline-flex; align-items: center; min-height: 36px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--cw-account-line-strong);
  color: var(--cw-account-ink); font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap; }
${S} .cc-ig:focus-visible { outline: 2px solid var(--cw-account-focus); outline-offset: 2px; }
${S} .cc-perk { flex-wrap: wrap; font-size: 15px; line-height: 22px; color: var(--cw-account-ink); }
${S} .cc-perk__soon { flex-basis: 100%; margin: 4px 0 0; padding-left: 18px; font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
${S} .cc-earn__grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
${S} .cc-earn-card { display: grid; align-content: start; row-gap: 4px; padding: 16px; border: 1px solid var(--cw-account-line); border-radius: var(--cw-account-radius); background: var(--cw-account-surface); }
${S} .cc-earn-card__fig { font-family: var(--cw-account-display-font); font-size: 24px; line-height: 30px; color: var(--cw-account-display-ink); }
${S} .cc-earn-card__t { font-size: 15px; line-height: 21px; font-weight: 600; color: var(--cw-account-ink); }
${S} .cc-earn-card__s { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
${S} .cc-earn-card .cc-ig { justify-self: start; margin-top: 8px; }
${S} .cc-member__n { font-family: var(--cw-account-display-font); font-size: 22px; line-height: 28px; letter-spacing: 0.06em; color: var(--cw-account-display-ink); }

/* the header chip: the flat mark and the balance */
${S} .cc-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 15px; line-height: 1; font-weight: 500; color: var(--cw-account-ink); white-space: nowrap; font-variant-numeric: tabular-nums; }
`;
}
export const PANEL_CIRCLE_CSS = `
.carisma-panel__circle {
  display: grid;
  gap: 6px;
  margin: 0 0 12px;
  padding: 14px 16px;
  border: 1px solid var(--cw-account-line);
  border-radius: 16px;
  background: var(--cw-account-accent-soft);
  color: var(--cw-account-ink);
  text-decoration: none;
}
.carisma-panel__circle:hover { border-color: var(--cw-account-line-strong); }
.carisma-panel__circle-label { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--cw-account-accent-text); font-weight: 600; }
.carisma-panel__circle-value { font-size: 20px; line-height: 26px; font-weight: 600; font-variant-numeric: tabular-nums; }
.carisma-panel__circle-sub, .carisma-panel__circle-gap { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
.carisma-panel__circle-level { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 10px; }
.carisma-panel__circle-chip { font-size: 13px; font-weight: 600; color: var(--cw-account-accent-text); white-space: nowrap; }
.carisma-panel__ladder { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3px; list-style: none; margin: 0; padding: 0; }
.carisma-panel__ladder__step { height: 6px; border-radius: 999px; background: var(--cw-account-line); }
.carisma-panel__ladder__step.is-past, .carisma-panel__ladder__step.is-on { background: var(--cw-account-accent); }
.carisma-panel__ladder__num { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.carisma-panel__circle-more { font-size: 14px; font-weight: 600; color: var(--cw-account-accent); }
.carisma-panel__circle--left { background: var(--cw-account-surface); }
.carisma-panel__circle-left { font-size: 15px; line-height: 21px; font-weight: 600; }
.carisma-panel__circle-rejoin {
  justify-self: start;
  margin-top: 2px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--cw-account-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.carisma-panel__circle-rejoin[aria-disabled="true"] { cursor: progress; opacity: 0.7; }

/* ── Circle v2: the account menu block (board 11) ─────────────────────── */
.carisma-panel .cc-menu { display: grid; gap: 0; padding: 0; overflow: hidden; background: var(--cw-account-surface); border-radius: 16px; }
.carisma-panel .cc-menu__top { display: grid; grid-template-columns: 112px minmax(0, 1fr); align-items: stretch; border-bottom: 1px solid var(--cw-account-line); }
.carisma-panel .cc-menu__top > .cc-plate { padding: 12px 0; }
.carisma-panel .cc-menu__fig { display: grid; align-content: center; padding: 8px 16px; text-align: left; }
.carisma-panel .cc-menu__fig > .cc-bal { font-size: 28px; line-height: 32px; margin-top: 2px; }
.carisma-panel .cc-menu__fig > .cc-read { font-size: 14px; line-height: 20px; margin-top: 2px; }
.carisma-panel .cc-menu__fig > .cc-dated { font-size: 13px; line-height: 18px; margin-top: 2px; }
.carisma-panel .cc-menu__sec { padding: 14px 16px 0; }
.carisma-panel .carisma-panel__circle-slot .cw-circle-slot { display: block; padding: 12px 16px 0; }
.carisma-panel .carisma-panel__circle-slot .cw-circle-slot:empty { display: none; }
.carisma-panel .cc-menu__act { display: grid; justify-items: center; padding: 14px 16px 16px; }
.carisma-panel .cc-menu__act > .cc-btn { width: 100%; }
.carisma-panel .carisma-panel__circle-slot { margin: 0 0 12px; }
${circlePartsCSS(".carisma-panel")}`;
//# sourceMappingURL=circle.js.map