/**
 * One booking, and the two sheets that act on it.
 *
 * Page (DESIGN-SPEC "Booking detail"): the shell's h1 is the treatment; the
 * back link and brand label ride above it. Hero lockup + facts on the left,
 * money + actions in a sticky 280px column on a desk; one stacked column on
 * a phone with the single primary pinned in a blurred bottom bar (the only
 * blur in the portal).
 *
 * Sheets: native <dialog>, appended INSIDE .carisma-portal so the brand tokens
 * reach it by inheritance even in the top layer. A bottom sheet under 600px,
 * a 520px card above. Every colour below is a var(--cw-account-*) token; the
 * scrim alone falls back to a neutral black, because it must darken a light
 * brand and a dark one alike and no brand token does both.
 */
export const PORTAL_BOOKING_CSS = `
/* ── Page header: back link + brand label above the treatment ────────── */
.carisma-portal[data-cw-portal="booking"] .cw-head { gap: 8px; margin-bottom: 28px; }
.carisma-portal[data-cw-portal="booking"] .cw-lede {
  order: -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 16px;
  margin: -10px 0 0 -8px;
}
.carisma-portal .cw-back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 44px;
  padding: 0 8px 0 2px;
  border-radius: var(--cw-account-radius-control);
  font-size: 14px;
  font-weight: 500;
  color: var(--cw-account-accent-text);
}
.carisma-portal .cw-back svg { transition: transform 220ms var(--cw-ease); }
.carisma-portal .cw-back:hover svg { transform: translateX(-2px); }
.carisma-portal .cw-back:hover span { text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 1px; }
.carisma-portal .cw-bk-brand { color: var(--cw-account-accent-text); }

/* ── Layout ──────────────────────────────────────────────────────────── */
.carisma-portal .cw-bk { display: flex; flex-direction: column; gap: 40px; }
.carisma-portal .cw-bk__main { display: grid; gap: 28px; align-content: start; min-width: 0; }
/* Opacity only: a transform animation (even one that has finished and fills)
   makes this column the containing block of the phone's fixed CTA bar, which
   then rides inside the column instead of on the viewport's bottom edge. */
.carisma-portal .cw-bk__side { display: grid; gap: 20px; align-content: start; min-width: 0; animation: cw-fade-in 480ms var(--cw-ease) 60ms both; }

/* ── Hero lockup ─────────────────────────────────────────────────────── */
.carisma-portal .cw-bk-hero { display: grid; gap: 4px; }
.carisma-portal .cw-bk-hero__day {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  text-transform: var(--cw-account-display-case);
  letter-spacing: var(--cw-account-display-tracking);
  font-size: 22px;
  line-height: 28px;
  color: var(--cw-account-display-ink);
  text-wrap: balance;
}
.carisma-portal .cw-bk-hero__time { font-size: 17px; line-height: 24px; color: var(--cw-account-ink); font-variant-numeric: tabular-nums lining-nums; }
.carisma-portal .cw-bk-hero__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-top: 12px; }
.carisma-portal .cw-bk-hero__rel { font-size: 14px; line-height: 20px; font-weight: 500; color: var(--cw-account-accent-text); }

/* ── Facts ───────────────────────────────────────────────────────────── */
.carisma-portal .cw-bk-facts { border-top: 1px solid var(--cw-account-line); }
.carisma-portal .cw-bk-facts .cw-fact { grid-template-columns: 104px minmax(0, 1fr); padding: 16px 0; }
.carisma-portal .cw-bk-where { display: grid; gap: 2px; justify-items: start; }
.carisma-portal .cw-bk-where__venue { font-size: 16px; line-height: 24px; color: var(--cw-account-ink); }
.carisma-portal .cw-bk-where__addr { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
.carisma-portal .cw-bk-where__map {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 44px;
  margin: -4px 0 -12px;
  font-size: 14px;
  font-weight: 500;
}
.carisma-portal .cw-bk-skel-facts { display: grid; gap: 18px; padding-top: 20px; }

/* ── Money card ──────────────────────────────────────────────────────── */
.carisma-portal .cw-bk-money { display: grid; gap: 14px; padding: 22px 24px 24px; box-shadow: var(--cw-account-shadow); }
.carisma-portal .cw-bk-money__rows { display: grid; gap: 8px; }
.carisma-portal .cw-bk-money__row { display: flex; justify-content: space-between; gap: 16px; font-size: 15px; line-height: 22px; }
.carisma-portal .cw-bk-money__row.is-muted { color: var(--cw-account-muted); }
.carisma-portal .cw-bk-money__due {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--cw-account-line);
}
.carisma-portal .cw-bk-money__due.is-alone { padding-top: 0; border-top: 0; }
.carisma-portal .cw-bk-money__due-label { font-size: 15px; line-height: 22px; font-weight: 500; color: var(--cw-account-ink); }
.carisma-portal .cw-bk-money__due-amount,
.carisma-portal .cw-bk-money__paid-amount {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  letter-spacing: 0;
  font-size: 24px;
  line-height: 28px;
  color: var(--cw-account-warn-text);
  font-variant-numeric: tabular-nums lining-nums;
}
.carisma-portal .cw-bk-money__paid { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.carisma-portal .cw-bk-money__paid-label { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
.carisma-portal .cw-bk-money__paid-amount { color: var(--cw-account-ink); margin-top: 2px; }
.carisma-portal .cw-bk-money__vat { margin-top: -6px; }
.carisma-portal .cw-bk-money__free { font-size: 15px; line-height: 22px; color: var(--cw-account-muted); }
.carisma-portal .cw-bk-money .cw-bk-cta { margin-top: 4px; }
.carisma-portal .cw-bk-cta .cw-btn { width: 100%; }

/* ── Actions ─────────────────────────────────────────────────────────── */
.carisma-portal .cw-bk-actions { display: grid; gap: 12px; }
.carisma-portal .cw-bk-actions__more { display: grid; gap: 10px; }
.carisma-portal .cw-bk-actions__more .cw-btn { width: 100%; }
.carisma-portal .cw-bk-actions .cw-reason { font-size: 14px; line-height: 20px; margin-top: 2px; }
.carisma-portal .cw-bk-deadline { color: var(--cw-account-ink); }
.carisma-portal .cw-bk-quiet { display: flex; flex-direction: column; align-items: flex-start; margin-top: 4px; }
.carisma-portal .cw-bk-quiet__item { justify-content: flex-start; gap: 10px; padding: 0 2px; }
.carisma-portal .cw-bk-quiet__item svg { opacity: 0.85; }
.carisma-portal .cw-bk-quiet__cancel { margin-top: 24px; }
.carisma-portal .cw-bk-quiet__item:first-child.cw-bk-quiet__cancel { margin-top: 0; }

/* ── Policy ──────────────────────────────────────────────────────────── */
.carisma-portal .cw-bk-policy { gap: 10px; }
.carisma-portal .cw-bk-policy__lead { font-size: 16px; line-height: 24px; font-weight: 500; color: var(--cw-account-ink); }
.carisma-portal .cw-bk-policy__text { font-size: 15px; line-height: 23px; color: var(--cw-account-muted); }

@media (min-width: 1024px) {
  .carisma-portal .cw-bk {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    column-gap: 48px;
    row-gap: 48px;
    align-items: start;
  }
  .carisma-portal .cw-bk__main { grid-column: 1; grid-row: 1; }
  .carisma-portal .cw-bk__side { grid-column: 2; grid-row: 1 / span 2; position: sticky; top: 112px; }
  .carisma-portal .cw-bk-policy { grid-column: 1; grid-row: 2; }
}

/* A phone: the ONE primary rides in a bar pinned to the bottom edge. */
@media (max-width: 1023.98px) {
  .carisma-portal .cw-bk.has-cta { padding-bottom: 76px; }
  .carisma-portal .cw-bk-cta {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 60;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    background: color-mix(in srgb, var(--cw-account-ground) 92%, transparent);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--cw-account-line);
    animation: cw-dock-in 420ms var(--cw-ease) both;
  }
  .carisma-portal .cw-bk-cta .cw-btn { display: flex; max-width: 560px; margin: 0 auto; }
  .carisma-portal .cw-bk-money .cw-bk-cta { margin: 0; }
  .carisma-portal[data-cw-portal="booking"] .cw-status { bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
}
@keyframes cw-dock-in { from { transform: translateY(100%); } to { transform: none; } }

/* ── Toast action ("Update your calendar") ───────────────────────────── */
.carisma-portal .cw-toast { align-items: center; }
.carisma-portal .cw-toast__text { flex: 1 1 auto; min-width: 0; }
.carisma-portal .cw-toast__action {
  flex: none;
  min-height: 44px;
  margin: -12px -6px -12px 0;
  padding: 0 6px;
  border: 0;
  background: none;
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
  cursor: pointer;
  white-space: nowrap;
}
.carisma-portal button.cw-link {
  display: inline-block;
  padding: 12px 0;
  margin: -12px 0;
  border: 0;
  background: none;
  font-weight: 500;
  cursor: pointer;
}

/* ── Dialog frame ────────────────────────────────────────────────────── */
.carisma-portal .cw-dialog {
  box-sizing: border-box;
  width: min(520px, calc(100vw - 32px));
  max-width: none;
  max-height: min(760px, calc(100vh - 48px));
  margin: auto;
  padding: 0;
  border: 1px solid var(--cw-account-line);
  border-radius: var(--cw-account-radius);
  background: var(--cw-account-surface);
  color: var(--cw-account-ink);
  font-family: var(--cw-account-body-font);
  font-size: 16px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums lining-nums;
  box-shadow: 0 24px 60px -28px color-mix(in srgb, var(--cw-account-scrim, black) 55%, transparent);
  overflow: hidden;
  overscroll-behavior: contain;
}
.carisma-portal .cw-dialog[open] {
  display: flex;
  flex-direction: column;
  animation: cw-dialog-in 260ms var(--cw-ease) both;
}
.carisma-portal .cw-dialog::backdrop {
  background: color-mix(in srgb, var(--cw-account-scrim, black) 44%, transparent);
  animation: cw-fade-in 240ms var(--cw-ease) both;
}
@keyframes cw-dialog-in { from { opacity: 0.001; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes cw-sheet-in { from { transform: translateY(100%); } to { transform: none; } }
@keyframes cw-fade-in { from { opacity: 0; } to { opacity: 1; } }
/* A fixed height on a desk: choosing a time reveals the review bar INSIDE
   the sheet instead of growing it — a centred dialog that grows jumps up. */
@media (min-width: 600px) {
  .carisma-portal :is(.cw-dialog--reschedule, .cw-dialog--package-book) { height: min(680px, calc(100vh - 48px)); }
}
/* Rows are their content's height. The body scrolls; without this a row that
   is itself a scroller (the day strip: overflow-x) has a min-height of 0 and
   the grid squeezes it — and the rows after it — once the sheet is taller
   than the screen, which a package's treatment + venue choices make it. */
.carisma-portal :is(.cw-dialog--reschedule, .cw-dialog--package-book) .cw-dialog__body { grid-auto-rows: max-content; }
.carisma-portal .cw-dialog__grab { display: none; }
.carisma-portal .cw-dialog__head { display: flex; align-items: flex-start; gap: 12px; padding: 24px 24px 18px; }
.carisma-portal .cw-dialog__heading { display: grid; gap: 6px; flex: 1 1 auto; min-width: 0; }
.carisma-portal .cw-dialog__title { overflow-wrap: anywhere; }
.carisma-portal .cw-dialog__sub { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
.carisma-portal .cw-dialog__close {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -10px -12px 0 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--cw-account-muted);
  cursor: pointer;
  transition: background-color 160ms var(--cw-ease), color 160ms var(--cw-ease);
}
.carisma-portal .cw-dialog__close:hover { background: var(--cw-account-accent-soft); color: var(--cw-account-ink); }
.carisma-portal .cw-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: grid;
  gap: 20px;
  align-content: start;
  padding: 2px 24px 24px;
}
.carisma-portal .cw-dialog__foot {
  flex: none;
  padding: 16px 24px calc(16px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--cw-account-line);
  background: var(--cw-account-surface);
}
.carisma-portal .cw-dialog__foot:empty { display: none; }
.carisma-portal .cw-dialog__foot[data-open] { animation: cw-rise 280ms var(--cw-ease) both; }

/* ── Reschedule: days ────────────────────────────────────────────────── */
.carisma-portal .cw-rs-days {
  display: flex;
  gap: 8px;
  margin: 0 -24px;
  padding: 2px 24px 6px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding: 0 24px;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(to right, transparent 0, black 20px, black calc(100% - 36px), transparent);
  mask-image: linear-gradient(to right, transparent 0, black 20px, black calc(100% - 36px), transparent);
}
.carisma-portal .cw-rs-days::-webkit-scrollbar { display: none; }
.carisma-portal .cw-rs-day {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 64px;
  height: 72px;
  padding: 0;
  border: 1px solid var(--cw-account-line);
  border-radius: var(--cw-account-radius-control);
  background: var(--cw-account-surface);
  color: var(--cw-account-ink);
  cursor: pointer;
  scroll-snap-align: start;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 160ms var(--cw-ease), background-color 160ms var(--cw-ease), box-shadow 160ms var(--cw-ease), transform 140ms var(--cw-ease);
}
.carisma-portal .cw-rs-day:active { transform: scale(0.97); }
.carisma-portal :is(.cw-rs-day__wk, .cw-rs-day__mon) {
  font-family: var(--cw-account-label-font);
  font-size: 9.5px;
  line-height: 1;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cw-account-muted);
}
.carisma-portal .cw-rs-day__num {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  font-size: 20px;
  line-height: 1;
  color: var(--cw-account-display-ink);
}
.carisma-portal .cw-rs-day.is-current::after {
  content: "";
  position: absolute;
  top: 7px;
  right: 7px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--cw-account-accent);
}
.carisma-portal .cw-rs-day[aria-pressed="true"] {
  background: var(--cw-account-accent-soft);
  border-color: var(--cw-account-accent);
  box-shadow: inset 0 0 0 0.5px var(--cw-account-accent);
}
.carisma-portal .cw-rs-day[aria-pressed="true"] :is(.cw-rs-day__wk, .cw-rs-day__mon) { color: var(--cw-account-accent-text); }
.carisma-portal .cw-rs-other { display: grid; gap: 8px; justify-items: start; margin-top: -12px; }
.carisma-portal .cw-rs-other__toggle { font-size: 14px; }
.carisma-portal .cw-rs-other__field { display: grid; gap: 6px; }
.carisma-portal .cw-rs-other__field[hidden] { display: none; }
.carisma-portal .cw-rs-other__input {
  min-height: 48px;
  min-width: 200px;
  padding: 0 14px;
  border: 1px solid var(--cw-account-line-strong);
  border-radius: var(--cw-account-radius-control);
  background: var(--cw-account-surface);
  color: var(--cw-account-ink);
  font-size: 16px;
}

/* ── Reschedule: times ───────────────────────────────────────────────── */
.carisma-portal .cw-rs-times { display: grid; gap: 18px; min-height: 104px; align-content: start; }
.carisma-portal .cw-rs-group { display: grid; gap: 8px; }
.carisma-portal .cw-rs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; }
.carisma-portal .cw-rs-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 48px;
  padding: 0 8px;
  border: 1px solid var(--cw-account-line);
  border-radius: var(--cw-account-radius-control);
  background: var(--cw-account-surface);
  color: var(--cw-account-ink);
  font-size: 15px;
  font-weight: 500;
  font-variant-numeric: tabular-nums lining-nums;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 140ms var(--cw-ease), border-color 140ms var(--cw-ease), color 140ms var(--cw-ease), transform 140ms var(--cw-ease);
}
.carisma-portal .cw-rs-time:active { transform: scale(0.97); }
.carisma-portal .cw-rs-time[aria-pressed="true"] {
  background: var(--cw-account-accent-fill);
  border-color: transparent;
  color: var(--cw-account-accent-ink);
}
.carisma-portal .cw-rs-time.is-current {
  cursor: default;
  border-style: dashed;
  border-color: var(--cw-account-line-strong);
  background: var(--cw-account-surface-2);
  color: var(--cw-account-muted);
}
.carisma-portal .cw-rs-time__tag {
  font-family: var(--cw-account-label-font);
  font-size: 9px;
  line-height: 1;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.carisma-portal .cw-rs-time.is-current .cw-rs-time__clock { font-size: 13px; line-height: 1.1; }
.carisma-portal .cw-rs-skel { height: 48px; border-radius: var(--cw-account-radius-control); }
.carisma-portal .cw-rs-skel--day { flex: none; width: 64px; height: 72px; }
.carisma-portal .cw-rs-none {
  display: grid;
  justify-items: start;
  gap: 8px;
  padding: 20px;
  border-radius: var(--cw-account-radius-control);
  background: var(--cw-account-surface-2);
}
.carisma-portal .cw-rs-none__title { font-size: 16px; line-height: 24px; font-weight: 500; color: var(--cw-account-ink); }
.carisma-portal .cw-rs-none__text { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
.carisma-portal .cw-rs-none__text a { color: var(--cw-account-accent-text); text-decoration: underline; text-underline-offset: 3px; }
.carisma-portal .cw-rs-none .cw-btn { margin-top: 6px; }
.carisma-portal .cw-rs-alert {
  padding: 12px 14px;
  border-radius: var(--cw-account-radius-control);
  background: var(--cw-account-bad-soft);
  color: var(--cw-account-bad-text);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  animation: cw-rise 280ms var(--cw-ease) both;
}
.carisma-portal .cw-rs-note { margin-top: -4px; }

/* ── Reschedule: review bar ──────────────────────────────────────────── */
.carisma-portal .cw-rs-review { display: grid; gap: 14px; }
.carisma-portal .cw-rs-change { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; font-size: 15px; line-height: 22px; }
.carisma-portal .cw-rs-change__old {
  color: var(--cw-account-muted);
  text-decoration: line-through;
  text-decoration-thickness: 1px;
  text-decoration-color: color-mix(in srgb, var(--cw-account-muted) 70%, transparent);
}
.carisma-portal .cw-rs-change__arrow { color: var(--cw-account-accent-text); }
.carisma-portal .cw-rs-change__new { font-weight: 600; color: var(--cw-account-ink); }
.carisma-portal .cw-rs-review__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; }
.carisma-portal .cw-rs-review__actions .cw-btn--primary { flex: 1 1 200px; }

/* ── Cancel sheet ────────────────────────────────────────────────────── */
.carisma-portal .cw-dialog--cancel .cw-dialog__body { gap: 16px; }
.carisma-portal .cw-cx-swap {
  padding: 4px 16px;
  border-radius: var(--cw-account-radius-control);
  background: var(--cw-account-accent-soft);
  font-size: 15px;
  line-height: 22px;
  color: var(--cw-account-ink);
}
.carisma-portal .cw-cx-summary {
  display: grid;
  gap: 6px;
  padding: 18px 20px;
  border-radius: var(--cw-account-radius-control);
  background: var(--cw-account-surface-2);
}
.carisma-portal .cw-cx-summary--warn { background: var(--cw-account-warn-soft); }
.carisma-portal .cw-cx-summary--warn .cw-label { color: var(--cw-account-warn-text); }
.carisma-portal .cw-cx-summary--ok { background: var(--cw-account-ok-soft); }
.carisma-portal .cw-cx-summary--ok .cw-label { color: var(--cw-account-ok-text); }
.carisma-portal .cw-cx-summary__amount {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  font-size: 30px;
  line-height: 34px;
  color: var(--cw-account-display-ink);
}
.carisma-portal .cw-cx-line { font-size: 15px; line-height: 22px; color: var(--cw-account-ink); }
.carisma-portal .cw-cx-policy { max-width: 60ch; }
.carisma-portal .cw-cx-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; }
.carisma-portal .cw-cx-actions .cw-btn--primary { flex: 1 1 200px; }

/* ── A phone: the sheet rises from the bottom edge ───────────────────── */
@media (max-width: 599.98px) {
  .carisma-portal .cw-dialog {
    width: 100%;
    max-height: 88vh;
    max-height: 88dvh;
    margin: auto 0 0;
    border-width: 1px 0 0;
    border-radius: 16px 16px 0 0;
  }
  .carisma-portal .cw-dialog[open] { animation: cw-sheet-in 380ms cubic-bezier(0.32, 0.72, 0, 1) both; }
  .carisma-portal .cw-dialog__grab {
    display: block;
    flex: none;
    width: 36px;
    height: 4px;
    margin: 8px auto 0;
    border-radius: 2px;
    background: var(--cw-account-line-strong);
    opacity: 0.45;
  }
  .carisma-portal .cw-dialog__head { padding: 14px 16px 16px 20px; }
  .carisma-portal .cw-dialog__body { padding: 2px 20px 20px; }
  .carisma-portal .cw-dialog__foot { padding: 14px 20px calc(14px + env(safe-area-inset-bottom, 0px)); }
  .carisma-portal .cw-rs-days { margin: 0 -20px; padding: 2px 20px 6px; scroll-padding: 0 20px; }
  .carisma-portal :is(.cw-rs-review__actions, .cw-cx-actions) { flex-direction: column; align-items: stretch; gap: 4px; }
  .carisma-portal :is(.cw-rs-review__actions, .cw-cx-actions) .cw-btn--primary { flex: none; width: 100%; }
  .carisma-portal :is(.cw-rs-review__actions, .cw-cx-actions) :is(.cw-btn--quiet, .cw-btn--danger) { align-self: center; }
}
`;
//# sourceMappingURL=booking.js.map