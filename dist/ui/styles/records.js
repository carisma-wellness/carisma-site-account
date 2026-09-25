/**
 * Wallet, payments, membership and documents.
 *
 * Same contract as every portal sheet: each rule starts `.carisma-portal`,
 * reads only `var(--cw-account-*)` (card-bg / card-ink for the gift and
 * membership cards), and type sizes on headings go through the private
 * `--cw-h-*` properties so a site's `h2 { … !important }` cannot reach them.
 *
 * The two "objects" here — a gift card and the membership card — are the only
 * surfaces that use the brand's card ground. Everything else is the same
 * quiet surface + hairline system as the booking cards, so the four record
 * pages read as one family with Overview and Bookings.
 */
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
export const PORTAL_RECORDS_CSS = `
/* ── Record root ─────────────────────────────────────────────────────── */
/* browser.ts still wraps a record body in .cw-legacy; around a record root
   that wrapper steps out of the layout, so each block rises on its own. */
.carisma-portal .cw-legacy:has(> .cw-rec) { display: contents; }
.carisma-portal .cw-rec { display: flex; flex-direction: column; gap: 48px; min-width: 0; }
.carisma-portal .cw-rec > * { min-width: 0; }
.carisma-portal .cw-rec > .cw-rise:nth-child(2) { animation-delay: 60ms; }
.carisma-portal .cw-rec > .cw-rise:nth-child(3) { animation-delay: 120ms; }
.carisma-portal .cw-rec > .cw-rise:nth-child(n + 4) { animation-delay: 180ms; }

/* ── Wallet: the balance hero ────────────────────────────────────────── */
.carisma-portal .cw-balance { display: grid; gap: 8px; }
.carisma-portal .cw-balance__value {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  letter-spacing: 0;
  font-size: 44px;
  line-height: 1.05;
  color: var(--cw-account-display-ink);
  font-variant-numeric: lining-nums tabular-nums;
}
.carisma-portal .cw-balance__sources { font-size: 15px; line-height: 22px; color: var(--cw-account-muted); }

/* ── Wallet: gift cards, a rail that scrolls inside itself ───────────── */
.carisma-portal .cw-gifts {
  display: flex;
  gap: 16px;
  margin: -6px -6px 0;
  padding: 6px 6px 14px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: var(--cw-account-line) transparent;
  border-radius: var(--cw-account-radius);
}
.carisma-portal .cw-gifts:focus-visible { outline: 2px solid var(--cw-account-focus); outline-offset: 2px; }
.carisma-portal .cw-gift {
  position: relative;
  flex: 0 0 280px;
  width: 280px;
  aspect-ratio: 85.6 / 54;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px 20px 16px;
  border-radius: 14px;
  overflow: hidden;
  scroll-snap-align: start;
  color: var(--cw-account-card-ink);
  background:
    radial-gradient(90% 120% at 100% 0%, color-mix(in srgb, var(--cw-account-card-ink) 8%, transparent) 0%, transparent 55%),
    var(--cw-account-card-bg);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--cw-account-card-ink) 16%, transparent),
    var(--cw-account-shadow);
  transition: transform 320ms ${EASE}, box-shadow 320ms ${EASE};
}
.carisma-portal .cw-gift::after {
  content: "";
  position: absolute;
  right: -44px;
  top: -44px;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--cw-account-card-ink) 18%, transparent);
  pointer-events: none;
}
.carisma-portal .cw-gift:hover { transform: translateY(-2px); }
.carisma-portal .cw-gift--spent { opacity: 0.62; }
.carisma-portal .cw-gift__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; position: relative; z-index: 1; }
.carisma-portal .cw-gift__brand,
.carisma-portal .cw-gift__tag {
  font-family: var(--cw-account-label-font);
  font-size: 10.5px;
  line-height: 16px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--cw-account-label-tracking);
}
.carisma-portal .cw-gift__tag {
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--cw-account-card-ink) 45%, transparent);
}
.carisma-portal .cw-gift__from { font-size: 12.5px; line-height: 16px; max-width: 50%; text-align: right; overflow-wrap: anywhere; }
.carisma-portal .cw-gift__foot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: "bal code" "of of";
  align-items: baseline;
  gap: 6px 12px;
  position: relative;
  z-index: 1;
}
.carisma-portal .cw-gift__money { display: contents; }
.carisma-portal .cw-gift__balance { grid-area: bal; }
.carisma-portal .cw-gift__of { grid-area: of; opacity: 0.92; }
.carisma-portal .cw-gift__code { grid-area: code; }
.carisma-portal .cw-gift__balance {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  font-size: 28px;
  line-height: 1;
  font-variant-numeric: lining-nums tabular-nums;
}
.carisma-portal .cw-gift__of { font-size: 12.5px; line-height: 16px; }
.carisma-portal .cw-gift__code {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 16px;
  letter-spacing: 0.04em;
  white-space: nowrap;
  opacity: 0.92;
}

/* ── Wallet: packages ────────────────────────────────────────────────── */
.carisma-portal .cw-packs { display: grid; gap: 12px; }
.carisma-portal .cw-pack {
  display: grid;
  gap: 14px;
  padding: 22px 24px;
  background: var(--cw-account-surface);
  border: 1px solid var(--cw-account-line);
  border-radius: var(--cw-account-radius);
}
.carisma-portal .cw-pack__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.carisma-portal .cw-pack__name { font-size: 17px; line-height: 24px; font-weight: 500; color: var(--cw-account-ink); overflow-wrap: anywhere; }
.carisma-portal .cw-meter {
  display: grid;
  grid-template-columns: repeat(var(--cw-n, 1), minmax(0, 1fr));
  gap: 3px;
  height: 6px;
}
.carisma-portal .cw-meter__seg { border-radius: 999px; background: var(--cw-account-line); }
.carisma-portal .cw-meter__seg.is-on { background: var(--cw-account-accent); }
.carisma-portal .cw-meter--bar { display: block; border-radius: 999px; background: var(--cw-account-line); overflow: hidden; }
.carisma-portal .cw-meter__fill { display: block; height: 100%; border-radius: inherit; background: var(--cw-account-accent); }
.carisma-portal .cw-pack__meta { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
.carisma-portal .cw-pack__count { color: var(--cw-account-ink); font-weight: 500; }
.carisma-portal .cw-pack__due { font-size: 14px; line-height: 20px; font-weight: 500; color: var(--cw-account-warn-text); }
.carisma-portal .cw-pack__hint { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
.carisma-portal .cw-pack__actions { display: flex; flex-wrap: wrap; gap: 10px; }
.carisma-portal .cw-pack__actions:empty { display: none; }
.carisma-portal .cw-pack__actions .cw-btn { flex: 0 1 auto; }
.carisma-portal .cw-pack-venues { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }

/* ── Payments: owed / settled ────────────────────────────────────────── */
.carisma-portal :is(.cw-owed, .cw-settled) {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  padding: 24px 28px;
  border-radius: var(--cw-account-radius);
}
.carisma-portal .cw-owed { background: var(--cw-account-warn-soft); color: var(--cw-account-warn-text); }
.carisma-portal .cw-settled { background: var(--cw-account-ok-soft); color: var(--cw-account-ok-text); }
.carisma-portal :is(.cw-owed__icon, .cw-settled__icon) {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
}
.carisma-portal .cw-owed__text { display: grid; gap: 4px; }
.carisma-portal .cw-owed__line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; color: var(--cw-account-warn-text); }
.carisma-portal .cw-owed__word { font-size: 17px; line-height: 24px; font-weight: 500; }
.carisma-portal .cw-owed__value {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  font-size: 28px;
  line-height: 1.1;
  color: var(--cw-account-warn-text);
  font-variant-numeric: lining-nums tabular-nums;
}
.carisma-portal .cw-owed__sub { font-size: 14px; line-height: 20px; color: var(--cw-account-warn-text); }
.carisma-portal .cw-settled__title {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  font-size: 22px;
  line-height: 28px;
  color: var(--cw-account-ok-text);
}
.carisma-portal .cw-settled__sub { font-size: 14px; line-height: 20px; color: var(--cw-account-ok-text); margin-top: 2px; }

/* ── Payments: the ledger ────────────────────────────────────────────── */
.carisma-portal .cw-ledger {
  display: grid;
  padding: 0 24px;
  background: var(--cw-account-surface);
  border: 1px solid var(--cw-account-line);
  border-radius: var(--cw-account-radius);
}
.carisma-portal .cw-ledger__group { display: grid; gap: 10px; }
.carisma-portal .cw-ledger__group + .cw-ledger__group { margin-top: 20px; }
.carisma-portal .cw-ledger__row {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) auto;
  gap: 16px 8px;
  align-items: center;
  min-height: 72px;
  padding: 14px 0;
}
.carisma-portal .cw-ledger__row + .cw-ledger__row { border-top: 1px solid var(--cw-account-line); }
.carisma-portal .cw-ledger__row { position: relative; }
/* The title is a stretched link: the whole row opens the booking (a 44px+
   target), while Pay and Receipt sit above it as their own targets. */
.carisma-portal .cw-ledger__link { outline: none; }
.carisma-portal .cw-ledger__link::after { content: ""; position: absolute; inset: 0 -12px; border-radius: var(--cw-account-radius-control); }
.carisma-portal .cw-ledger__link:focus-visible::after { outline: 2px solid var(--cw-account-focus); outline-offset: 2px; }
.carisma-portal .cw-ledger__row:has(.cw-ledger__link:hover) .cw-ledger__link { text-decoration-color: currentColor; }
.carisma-portal .cw-ledger__end { position: relative; z-index: 1; }
.carisma-portal .cw-ledger__date { display: grid; justify-items: start; gap: 3px; }
.carisma-portal .cw-ledger__day {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  font-size: 17px;
  line-height: 1;
  color: var(--cw-account-display-ink);
  font-variant-numeric: lining-nums tabular-nums;
}
.carisma-portal .cw-ledger__mon {
  font-family: var(--cw-account-label-font);
  font-size: 10px;
  line-height: 1;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--cw-account-label-tracking);
  color: var(--cw-account-muted);
}
.carisma-portal .cw-ledger__main { display: grid; gap: 3px; min-width: 0; }
.carisma-portal .cw-ledger__title { font-size: 16px; line-height: 22px; font-weight: 500; color: var(--cw-account-ink); overflow-wrap: anywhere; }
.carisma-portal .cw-ledger__link {
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  text-decoration-color: transparent;
  transition: text-decoration-color 160ms ${EASE};
}
.carisma-portal .cw-ledger__link:hover { text-decoration-color: currentColor; }
.carisma-portal .cw-ledger__meta { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
.carisma-portal .cw-ledger__end { display: flex; align-items: center; justify-content: flex-end; gap: 20px; }
.carisma-portal .cw-ledger__amount {
  font-size: 16px;
  line-height: 22px;
  font-weight: 500;
  color: var(--cw-account-ink);
  font-variant-numeric: tabular-nums lining-nums;
  white-space: nowrap;
}
.carisma-portal .cw-ledger__row--due .cw-ledger__amount { color: var(--cw-account-warn-text); }
.carisma-portal .cw-ledger__month { padding-left: 2px; }
.carisma-portal :is(.cw-ledger__desk, .cw-doc__desk) { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); white-space: nowrap; }
.carisma-portal .cw-ledger__receipt { font-size: 14px; }

/* ── Documents ───────────────────────────────────────────────────────── */
.carisma-portal .cw-docs {
  display: grid;
  padding: 0 24px;
  background: var(--cw-account-surface);
  border: 1px solid var(--cw-account-line);
  border-radius: var(--cw-account-radius);
}
.carisma-portal .cw-doc {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  min-height: 72px;
  padding: 14px 0;
}
.carisma-portal .cw-doc + .cw-doc { border-top: 1px solid var(--cw-account-line); }
.carisma-portal .cw-doc__tile {
  position: relative;
  width: 40px;
  height: 48px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 7px;
  border-radius: 6px 12px 6px 6px;
  background: var(--cw-account-accent-soft);
  color: var(--cw-account-accent-text);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cw-account-accent-text) 18%, transparent);
  font-family: var(--cw-account-label-font);
  font-size: 9.5px;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.08em;
}
.carisma-portal .cw-doc__tile::before {
  content: "";
  position: absolute;
  top: 10px;
  left: 9px;
  right: 9px;
  height: 11px;
  border-top: 1px solid color-mix(in srgb, var(--cw-account-accent-text) 40%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--cw-account-accent-text) 40%, transparent);
}
.carisma-portal .cw-doc__main { display: grid; gap: 3px; min-width: 0; }
.carisma-portal .cw-doc__title { font-size: 16px; line-height: 22px; font-weight: 500; color: var(--cw-account-ink); overflow-wrap: anywhere; }
.carisma-portal .cw-doc__meta { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); }
.carisma-portal .cw-doc__open { white-space: nowrap; font-size: 15px; }

/* ── Membership: the card ────────────────────────────────────────────── */
.carisma-portal .cw-mcard {
  position: relative;
  width: 100%;
  max-width: 440px;
  aspect-ratio: 1.6;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px 28px 26px;
  border-radius: 16px;
  overflow: hidden;
  color: var(--cw-account-card-ink);
  background:
    radial-gradient(80% 110% at 100% 0%, color-mix(in srgb, var(--cw-account-card-ink) 8%, transparent) 0%, transparent 58%),
    var(--cw-account-card-bg);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--cw-account-card-ink) 16%, transparent),
    var(--cw-account-shadow);
}
.carisma-portal .cw-mcard::before,
.carisma-portal .cw-mcard::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--cw-account-card-ink) 16%, transparent);
  pointer-events: none;
}
.carisma-portal .cw-mcard::before { width: 260px; height: 260px; right: -110px; bottom: -130px; }
.carisma-portal .cw-mcard::after { width: 180px; height: 180px; right: -70px; bottom: -90px; }
.carisma-portal .cw-mcard__top { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: relative; z-index: 1; }
.carisma-portal .cw-mcard__label {
  font-family: var(--cw-account-label-font);
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--cw-account-label-tracking);
  overflow-wrap: anywhere;
}
.carisma-portal .cw-mcard__chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 24px;
  padding: 0 10px 0 9px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--cw-account-card-ink) 45%, transparent);
  color: var(--cw-account-card-ink);
  font-family: var(--cw-account-label-font);
  font-size: 10.5px;
  line-height: 1;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.carisma-portal .cw-mcard__chip::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.carisma-portal .cw-mcard__chip--neutral::before { background: transparent; border: 1px solid currentColor; }
.carisma-portal .cw-mcard__foot { display: grid; gap: 6px; position: relative; z-index: 1; }
.carisma-portal .cw-mcard__plan {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  text-transform: var(--cw-account-display-case);
  letter-spacing: var(--cw-account-display-tracking);
  font-size: 26px;
  line-height: 1.15;
  text-wrap: balance;
}
.carisma-portal .cw-mcard__price { font-size: 14px; line-height: 20px; opacity: 0.94; font-variant-numeric: tabular-nums lining-nums; }

/* ── Membership: facts, controls, the note ───────────────────────────── */
.carisma-portal .cw-mfacts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-radius: var(--cw-account-radius);
  border: 1px solid var(--cw-account-line);
  background: var(--cw-account-surface);
}
.carisma-portal .cw-mfact { display: grid; gap: 6px; padding: 20px 24px; min-width: 0; }
.carisma-portal .cw-mfact + .cw-mfact { border-left: 1px solid var(--cw-account-line); }
.carisma-portal .cw-mfact__label {
  font-family: var(--cw-account-label-font);
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--cw-account-label-tracking);
  color: var(--cw-account-muted);
}
.carisma-portal .cw-mfact__value {
  font-size: 20px;
  line-height: 28px;
  color: var(--cw-account-ink);
  font-variant-numeric: tabular-nums lining-nums;
  overflow-wrap: anywhere;
}
.carisma-portal .cw-mctl { display: grid; gap: 28px; }
.carisma-portal .cw-mctl__do { display: grid; justify-items: start; gap: 12px; }
.carisma-portal .cw-mctl__note { font-size: 13px; line-height: 19px; color: var(--cw-account-muted); max-width: 52ch; }
.carisma-portal .cw-mnote { font-size: 14px; line-height: 21px; color: var(--cw-account-muted); max-width: 60ch; text-wrap: pretty; }
.carisma-portal .cw-mnote a { white-space: nowrap; }

/* ── Refer a friend ──────────────────────────────────────────────────── */
/* One card: the deal (what the friend gets, what you get), then the code with
   its share row. The code is the object here, so it takes the display face. */
.carisma-portal .cw-refer {
  display: grid;
  gap: 24px;
  padding: 28px;
  background: var(--cw-account-surface);
  border: 1px solid var(--cw-account-line);
  border-radius: var(--cw-account-radius);
}
.carisma-portal .cw-refer__brand { color: var(--cw-account-muted); }
.carisma-portal .cw-refer__deal { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.carisma-portal .cw-refer__side { display: grid; gap: 6px; align-content: start; padding-right: 24px; min-width: 0; }
.carisma-portal .cw-refer__side + .cw-refer__side { padding: 0 0 0 24px; border-left: 1px solid var(--cw-account-line); }
.carisma-portal .cw-refer__big {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  font-size: 26px;
  line-height: 1.15;
  color: var(--cw-account-display-ink);
  font-variant-numeric: lining-nums tabular-nums;
  text-wrap: balance;
  overflow-wrap: anywhere;
}
.carisma-portal .cw-refer__small { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
.carisma-portal .cw-refer__codebox { display: grid; gap: 14px; padding-top: 24px; border-top: 1px solid var(--cw-account-line); }
.carisma-portal .cw-refer__code {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  font-size: 40px;
  line-height: 1.05;
  letter-spacing: 0.14em;
  color: var(--cw-account-display-ink);
  font-variant-numeric: lining-nums tabular-nums;
  user-select: all;
  overflow-wrap: anywhere;
}
.carisma-portal .cw-refer__share { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.carisma-portal .cw-refer__link { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); overflow-wrap: anywhere; }
/* Why the code cannot be shared here yet (canRefer false): said where Share would be. */
.carisma-portal .cw-refer__blocked { font-size: 15px; line-height: 22px; color: var(--cw-account-ink); max-width: 62ch; text-wrap: pretty; }
.carisma-portal .cw-doc__meta.cw-refer__blocked { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); }
.carisma-portal .cw-refer__terms { font-size: 14px; line-height: 21px; color: var(--cw-account-muted); max-width: 62ch; text-wrap: pretty; }
.carisma-portal .cw-refer__pending { font-size: 15px; line-height: 22px; font-weight: 500; color: var(--cw-account-ok-text); }
.carisma-portal .cw-refer__initial {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--cw-account-accent-soft);
  color: var(--cw-account-accent-text);
  font-family: var(--cw-account-display-font);
  font-size: 17px;
  line-height: 1;
}
.carisma-portal .cw-rec--refer .cw-section > .cw-mnote { margin-top: 10px; }

/* ── Phones ──────────────────────────────────────────────────────────── */
@media (max-width: 1023.98px) {
  .carisma-portal .cw-rec { gap: 40px; }
}
@media (max-width: 599.98px) {
  .carisma-portal .cw-balance__value { font-size: 36px; }
  .carisma-portal .cw-gift { flex-basis: 272px; width: 272px; }
  .carisma-portal .cw-pack { padding: 18px 16px; }
  .carisma-portal .cw-pack__actions .cw-btn { flex: 1 1 140px; }
  .carisma-portal :is(.cw-owed, .cw-settled) { grid-template-columns: 40px minmax(0, 1fr); gap: 16px; padding: 20px; }
  .carisma-portal :is(.cw-owed__icon, .cw-settled__icon) { width: 40px; height: 40px; }
  .carisma-portal .cw-owed__value { font-size: 26px; }
  .carisma-portal :is(.cw-ledger, .cw-docs) { padding: 0 16px; }
  .carisma-portal .cw-ledger__row { grid-template-columns: 44px minmax(0, 1fr) auto; gap: 12px 12px; align-items: start; }
  .carisma-portal .cw-ledger__date { padding-top: 2px; }
  .carisma-portal .cw-ledger__row--due { grid-template-columns: 44px minmax(0, 1fr); }
  .carisma-portal .cw-ledger__row--due .cw-ledger__end { grid-column: 1 / -1; }
  .carisma-portal .cw-ledger__row--due .cw-ledger__end:has(.cw-ledger__pay) .cw-ledger__amount { display: none; }
  .carisma-portal .cw-ledger__row--due .cw-ledger__pay { flex: 1 1 auto; }
  .carisma-portal .cw-ledger__row--due .cw-ledger__end:not(:has(.cw-ledger__pay)) { justify-content: space-between; }
  .carisma-portal .cw-ledger__end { flex-direction: row; gap: 12px; padding-top: 1px; }
  .carisma-portal .cw-ledger__row:not(.cw-ledger__row--due) .cw-ledger__end { flex-direction: column; align-items: flex-end; gap: 0; }
  .carisma-portal .cw-ledger__row:not(.cw-ledger__row--due) .cw-ledger__receipt { min-height: 36px; }
  .carisma-portal .cw-doc { gap: 14px; }
  .carisma-portal .cw-mcard { padding: 20px 22px 22px; }
  .carisma-portal .cw-mcard__plan { font-size: 24px; }
  .carisma-portal .cw-mfacts { grid-template-columns: minmax(0, 1fr); padding: 0 16px; }
  .carisma-portal .cw-mfact { grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; padding: 16px 0; }
  .carisma-portal .cw-mfact + .cw-mfact { border-left: 0; border-top: 1px solid var(--cw-account-line); }
  .carisma-portal .cw-mfact__value { font-size: 18px; text-align: right; }
  .carisma-portal .cw-mctl__do { justify-items: stretch; }
  .carisma-portal .cw-refer { padding: 20px; gap: 20px; }
  .carisma-portal .cw-refer__deal { grid-template-columns: minmax(0, 1fr); }
  .carisma-portal .cw-refer__side { padding: 0; }
  .carisma-portal .cw-refer__side + .cw-refer__side { padding: 18px 0 0; margin-top: 18px; border-left: 0; border-top: 1px solid var(--cw-account-line); }
  .carisma-portal .cw-refer__big { font-size: 22px; }
  .carisma-portal .cw-refer__code { font-size: 32px; }
  .carisma-portal .cw-refer__share > .cw-btn--primary { flex: 1 1 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .carisma-portal :is(.cw-gift, .cw-gift:hover) { transform: none; transition: none; }
  .carisma-portal .cw-gifts { scroll-behavior: auto; }
}
`;
//# sourceMappingURL=records.js.map