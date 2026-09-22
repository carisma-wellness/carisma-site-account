/**
 * Booking cards and the Overview composition.
 *
 * Card anatomy (DESIGN-SPEC "Bookings list"): grid `56px 1fr auto` — a date
 * tile, the treatment as a stretched link to its page, the status chip top
 * right, and the server's actions bottom right as REAL separate targets above
 * the stretched link. Below 600px the chip drops under the meta line and the
 * actions go full width, so nothing crowds a thumb.
 */
export const PORTAL_LISTS_CSS = `
.carisma-portal .cw-list { display: grid; gap: 12px; }

/* ── Date tile ───────────────────────────────────────────────────────── */
.carisma-portal .cw-date {
  width: 56px;
  height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-radius: var(--cw-account-radius-control);
  background: var(--cw-account-accent-soft);
  color: var(--cw-account-accent-text);
  text-align: center;
  flex: none;
}
.carisma-portal .cw-date__wk,
.carisma-portal .cw-date__mon {
  font-family: var(--cw-account-label-font);
  font-size: 9.5px;
  line-height: 1;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.carisma-portal .cw-date__day {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  font-size: 26px;
  line-height: 1;
  color: var(--cw-account-display-ink);
  font-variant-numeric: lining-nums tabular-nums;
}
.carisma-portal .cw-date--lg { width: 72px; height: 84px; gap: 5px; }
.carisma-portal .cw-date--lg .cw-date__day { font-size: 34px; }
.carisma-portal .cw-date--lg :is(.cw-date__wk, .cw-date__mon) { font-size: 10.5px; }
.carisma-portal .cw-date--past { background: var(--cw-account-surface-2); color: var(--cw-account-muted); }
.carisma-portal .cw-date--past .cw-date__day { color: var(--cw-account-muted); }

/* ── Booking card ────────────────────────────────────────────────────── */
.carisma-portal .cw-appt {
  position: relative;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  column-gap: 20px;
  row-gap: 14px;
  align-items: center;
  padding: 20px 24px;
  background: var(--cw-account-surface);
  border: 1px solid var(--cw-account-line);
  border-radius: var(--cw-account-radius);
  transition: border-color 200ms var(--cw-ease), box-shadow 260ms var(--cw-ease), transform 260ms var(--cw-ease);
}
.carisma-portal .cw-appt:hover {
  border-color: color-mix(in srgb, var(--cw-account-line-strong) 55%, var(--cw-account-line));
  box-shadow: 0 8px 24px -18px color-mix(in srgb, var(--cw-account-ink) 70%, transparent);
}
.carisma-portal .cw-appt > .cw-date { grid-column: 1; grid-row: 1; }
.carisma-portal .cw-appt__main { grid-column: 2; grid-row: 1; display: grid; gap: 3px; min-width: 0; }
.carisma-portal .cw-appt__brand { color: var(--cw-account-accent-text); }
.carisma-portal .cw-appt__title {
  font-size: 17px;
  line-height: 24px;
  font-weight: 500;
  color: var(--cw-account-ink);
  overflow-wrap: anywhere;
}
.carisma-portal .cw-appt__link { color: inherit; outline: none; }
.carisma-portal .cw-appt__link::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border-radius: var(--cw-account-radius);
}
.carisma-portal .cw-appt__link:focus-visible::after { outline: 2px solid var(--cw-account-focus); outline-offset: 3px; }
.carisma-portal .cw-appt__meta { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
.carisma-portal .cw-appt__side {
  grid-column: 3;
  grid-row: 1;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}
.carisma-portal .cw-appt__actions { position: relative; z-index: 1; flex-wrap: nowrap; gap: 10px; }
.carisma-portal .cw-appt__foot { grid-column: 2 / 4; grid-row: 2; }
.carisma-portal .cw-appt--past .cw-appt__title { color: var(--cw-account-ink); }

/* The server's reason, when the door is closed. */
.carisma-portal .cw-reason {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 60ch;
  font-size: 13px;
  line-height: 19px;
  color: var(--cw-account-muted);
}
.carisma-portal .cw-reason svg { margin-top: 1px; color: var(--cw-account-muted); }
.carisma-portal .cw-reason a {
  color: var(--cw-account-accent-text);
  text-decoration: underline;
  text-underline-offset: 3px;
  white-space: nowrap;
}

/* ── Overview: the next visit ────────────────────────────────────────── */
.carisma-portal .cw-next {
  position: relative;
  display: grid;
  gap: 24px;
  padding: 28px 32px 32px;
  border-radius: var(--cw-account-radius);
  border: 1px solid var(--cw-account-line);
  background:
    radial-gradient(120% 150% at 100% 0%, var(--cw-account-accent-soft) 0%, transparent 52%),
    var(--cw-account-surface);
  box-shadow: var(--cw-account-shadow);
  overflow: hidden;
}
.carisma-portal .cw-next__top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.carisma-portal .cw-next__row { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 24px; align-items: center; }
.carisma-portal .cw-next__text { display: grid; gap: 6px; min-width: 0; }
.carisma-portal .cw-next__title {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  text-transform: var(--cw-account-display-case);
  letter-spacing: var(--cw-account-display-tracking);
  font-size: 26px;
  line-height: 32px;
  color: var(--cw-account-display-ink);
  text-wrap: balance;
}
.carisma-portal .cw-next__title .cw-next__link { color: inherit; text-decoration: none; }
.carisma-portal .cw-next__title .cw-next__link:hover { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 5px; }
.carisma-portal .cw-next__when { font-size: 15px; line-height: 22px; color: var(--cw-account-ink); }
.carisma-portal .cw-next__where { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
.carisma-portal .cw-next__rel { font-size: 14px; line-height: 20px; color: var(--cw-account-accent-text); font-weight: 500; }
.carisma-portal .cw-next .cw-reason { font-size: 14px; line-height: 20px; }

/* ── Overview: needs you ─────────────────────────────────────────────── */
.carisma-portal .cw-needs {
  padding: 4px 24px;
  border-radius: var(--cw-account-radius);
  border: 1px solid var(--cw-account-line);
  background: var(--cw-account-surface);
}
.carisma-portal .cw-need {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  min-height: 76px;
  padding: 14px 0;
}
.carisma-portal .cw-need + .cw-need { border-top: 1px solid var(--cw-account-line); }
.carisma-portal .cw-need__icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--cw-account-warn-soft);
  color: var(--cw-account-warn-text);
}
.carisma-portal .cw-need__icon--calm { background: var(--cw-account-accent-soft); color: var(--cw-account-accent-text); }
.carisma-portal .cw-need__text { display: grid; gap: 2px; min-width: 0; }
.carisma-portal .cw-need__title { font-size: 15px; line-height: 22px; font-weight: 500; color: var(--cw-account-ink); }
.carisma-portal .cw-need__sub { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }

/* ── Overview: wallet strip ──────────────────────────────────────────── */
.carisma-portal .cw-strip {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  min-height: 76px;
  padding: 16px 24px;
  border-radius: var(--cw-account-radius);
  background: var(--cw-account-card-bg);
  color: var(--cw-account-card-ink);
  transition: transform 260ms var(--cw-ease), box-shadow 260ms var(--cw-ease);
}
.carisma-portal .cw-strip:hover { transform: translateY(-1px); box-shadow: 0 14px 30px -18px color-mix(in srgb, var(--cw-account-ink) 80%, transparent); }
.carisma-portal .cw-strip__icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--cw-account-card-ink) 30%, transparent);
}
.carisma-portal .cw-strip__text { display: grid; gap: 2px; min-width: 0; }
.carisma-portal .cw-strip__label {
  font-family: var(--cw-account-label-font);
  font-size: 10.5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--cw-account-label-tracking);
  opacity: 0.8;
}
.carisma-portal .cw-strip__value { font-size: 15px; line-height: 22px; }
.carisma-portal .cw-strip__arrow { transition: transform 260ms var(--cw-ease); }
.carisma-portal .cw-strip:hover .cw-strip__arrow { transform: translateX(3px); }

/* ── Phones ──────────────────────────────────────────────────────────── */
@media (max-width: 599.98px) {
  .carisma-portal .cw-appt {
    grid-template-columns: 52px minmax(0, 1fr);
    column-gap: 16px;
    row-gap: 12px;
    align-items: start;
    padding: 16px;
  }
  .carisma-portal .cw-appt > .cw-date { width: 52px; height: 60px; grid-row: 1 / span 2; }
  .carisma-portal .cw-appt__side { display: contents; }
  .carisma-portal .cw-appt__chip { grid-column: 2; grid-row: 2; justify-self: start; }
  .carisma-portal .cw-appt__foot { grid-column: 1 / -1; grid-row: auto; }
  .carisma-portal .cw-appt__actions { grid-column: 1 / -1; grid-row: auto; width: 100%; }
  .carisma-portal .cw-appt__actions .cw-btn { flex: 1 1 0; }
  .carisma-portal .cw-next { padding: 20px 20px 24px; gap: 20px; }
  .carisma-portal .cw-next__row { grid-template-columns: 64px minmax(0, 1fr); gap: 16px; align-items: start; }
  .carisma-portal .cw-next .cw-date--lg { width: 64px; height: 76px; }
  .carisma-portal .cw-next .cw-date--lg .cw-date__day { font-size: 30px; }
  .carisma-portal .cw-next__title { font-size: 22px; line-height: 28px; }
  .carisma-portal .cw-next .cw-actions { flex-direction: column; align-items: stretch; gap: 8px; }
  .carisma-portal .cw-next .cw-actions .cw-btn { width: 100%; }
  .carisma-portal .cw-needs { padding: 0 16px; }
  .carisma-portal .cw-need { grid-template-columns: 32px minmax(0, 1fr); gap: 12px; }
  .carisma-portal .cw-need__icon { width: 32px; height: 32px; }
  .carisma-portal .cw-need .cw-btn { grid-column: 2; justify-self: start; }
  .carisma-portal .cw-strip { padding: 16px 18px; gap: 14px; }
}
`;
