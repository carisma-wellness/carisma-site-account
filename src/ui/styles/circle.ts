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

/* ── The five-step ladder (numerals always) ──────────────────────────── */
.carisma-portal .cw-ladder { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; list-style: none; }
.carisma-portal .cw-ladder__step {
  display: grid;
  place-items: center;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--cw-account-line);
  color: var(--cw-account-muted);
  font-family: var(--cw-account-display-font);
  font-size: 13px;
  line-height: 1;
}
.carisma-portal .cw-ladder__step.is-past { background: var(--cw-account-accent-soft); color: var(--cw-account-accent-text); border-color: transparent; }
.carisma-portal .cw-ladder__step.is-on { background: var(--cw-account-accent-fill); color: var(--cw-account-accent-ink); border-color: transparent; }

/* ── Level bar: Welcome start + spent this year ──────────────────────── */
.carisma-portal .cw-circle-bar { display: flex; height: 8px; border-radius: 999px; background: var(--cw-account-line); overflow: hidden; }
.carisma-portal .cw-circle-bar__head { display: block; height: 100%; background: var(--cw-account-accent-soft); }
.carisma-portal .cw-circle-bar__fill { display: block; height: 100%; background: var(--cw-account-accent); }
.carisma-portal .cw-circle__bar-meta { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }

/* ── Overview card set ───────────────────────────────────────────────── */
.carisma-portal .cw-circle-ov { display: grid; gap: 16px; }
.carisma-portal .cw-circle-ov__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.carisma-portal .cw-circle-ov__credit, .carisma-portal .cw-circle-ov__level { display: grid; gap: 10px; align-content: start; }
.carisma-portal .cw-circle__earn { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; font-size: 15px; line-height: 22px; }

/* ── Credit & rewards page ───────────────────────────────────────────── */
.carisma-portal .cw-circle { gap: 40px; }
.carisma-portal .cw-circle-hero .cw-actions { margin-top: 12px; }
.carisma-portal .cw-circle-level { display: grid; gap: 12px; }
.carisma-portal .cw-circle-earn__sum { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
.carisma-portal .cw-circle-earn__list, .carisma-portal .cw-circle-act, .carisma-portal .cw-circle-shop__list, .carisma-portal .cw-circle-pass__list { list-style: none; display: grid; }
.carisma-portal .cw-circle-earn__row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  border-top: 1px solid var(--cw-account-line);
}
.carisma-portal .cw-circle-earn__tick {
  display: grid; place-items: center; width: 24px; height: 24px; border-radius: 999px;
  border: 1px solid var(--cw-account-line-strong); color: var(--cw-account-accent-ink);
}
.carisma-portal .cw-circle-earn__row.is-done .cw-circle-earn__tick { background: var(--cw-account-accent-fill); border-color: transparent; }
.carisma-portal .cw-circle-earn__row.is-done .cw-circle-earn__label { color: var(--cw-account-muted); }
.carisma-portal .cw-circle-earn__amt { font-weight: 500; font-variant-numeric: tabular-nums; color: var(--cw-account-accent-text); }
.carisma-portal .cw-circle-earn .cw-fine, .carisma-portal .cw-circle-shop .cw-fine { margin-top: 12px; }

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

.carisma-portal .cw-circle-shop__group { display: grid; gap: 10px; }
.carisma-portal .cw-circle-shop__group + .cw-circle-shop__group { margin-top: 20px; }
.carisma-portal .cw-circle-shop__list { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.carisma-portal .cw-circle-shop__item {
  display: grid; gap: 6px; align-content: start; padding: 16px 18px;
  background: var(--cw-account-surface); border: 1px solid var(--cw-account-line); border-radius: var(--cw-account-radius);
}
.carisma-portal .cw-circle-shop__item.is-yours { border-color: var(--cw-account-line-strong); }
.carisma-portal .cw-circle-shop__name { font-size: 16px; line-height: 22px; font-weight: 500; }
.carisma-portal .cw-circle-shop__disc { font-size: 13px; line-height: 18px; color: var(--cw-account-accent-text); }
.carisma-portal .cw-circle-shop__price { display: grid; font-size: 15px; line-height: 22px; font-variant-numeric: tabular-nums; }
.carisma-portal .cw-circle-shop__value { font-size: 12px; line-height: 16px; color: var(--cw-account-muted); }
.carisma-portal .cw-circle-shop__note { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }

.carisma-portal .cw-circle-pass__list { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.carisma-portal .cw-circle-pass__stamp {
  display: grid; gap: 2px; padding: 14px; text-align: center;
  border: 1px dashed var(--cw-account-line-strong); border-radius: var(--cw-account-radius);
}
.carisma-portal .cw-circle-pass__stamp.is-on { border-style: solid; background: var(--cw-account-accent-soft); }
.carisma-portal .cw-circle-pass__name { font-family: var(--cw-account-display-font); font-size: 16px; color: var(--cw-account-display-ink); }
.carisma-portal .cw-circle-pass__state { font-size: 12px; color: var(--cw-account-muted); }
.carisma-portal .cw-circle-pass .cw-circle__line { margin-top: 12px; }

/* ── Wallet line ─────────────────────────────────────────────────────── */
.carisma-portal .cw-strip__note { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }

@media (max-width: 720px) {
  .carisma-portal .cw-circle-ov__grid { grid-template-columns: minmax(0, 1fr); }
  .carisma-portal .cw-circle__value { font-size: 34px; }
  .carisma-portal .cw-circle-pass__list { gap: 8px; }
}
`;

/**
 * The header-panel row. The panel sheet (chromeCss.ts) is not under
 * `.carisma-portal`, so these rules are scoped to `.carisma-panel__circle`.
 */
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
`;
