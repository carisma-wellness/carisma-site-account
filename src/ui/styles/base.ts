/**
 * The portal's foundation: token fallbacks, the scoped type reset, and every
 * primitive a view is built from (buttons, chips, cards, focus, motion,
 * skeleton, toast, error block, empty state).
 *
 * THE CONTRACT. Every rule below reads `var(--cw-account-*)` and nothing else.
 * The only raw colours in the whole portal live in the `:root` block at the
 * top, as neutral AA-safe fallbacks for a site that has not set its brand
 * block yet. A brand sets its values on `.cw-account-page, #carisma-account-panel`
 * and every rule here follows (test/portal-css.test.mjs enforces it).
 *
 * THE SCOPE. Every brand site styles `h1…h6` globally (uppercase, heavy). That
 * leak is what made the old account title shout, so every rule is prefixed
 * `.carisma-portal`: the reset is (0,1,1) and beats a site's bare `h1`, and a
 * component rule is (0,2,0) and beats the reset.
 */

export const PORTAL_TOKENS_CSS = `
:root {
  --cw-account-ground: #ffffff;
  --cw-account-surface: #ffffff;
  --cw-account-surface-2: #f5f5f4;
  --cw-account-ink: #1c1917;
  --cw-account-display-ink: #1c1917;
  --cw-account-muted: #57534e;
  --cw-account-line: rgba(28, 25, 23, 0.12);
  --cw-account-line-strong: #78716c;
  --cw-account-accent: #8a6a1c;
  --cw-account-accent-text: #735914;
  --cw-account-accent-soft: rgba(138, 106, 28, 0.1);
  --cw-account-accent-fill: #292524;
  --cw-account-accent-ink: #ffffff;
  --cw-account-card-bg: #292524;
  --cw-account-card-ink: #fafaf9;
  --cw-account-focus: #1c1917;
  --cw-account-ok-soft: rgba(61, 90, 65, 0.12);
  --cw-account-ok-text: #3d5a41;
  --cw-account-warn-soft: rgba(176, 120, 20, 0.12);
  --cw-account-warn-text: #7a5210;
  --cw-account-bad-soft: rgba(160, 48, 36, 0.1);
  --cw-account-bad-text: #8c2a1f;
  --cw-account-display-font: Georgia, "Times New Roman", serif;
  --cw-account-display-weight: 400;
  --cw-account-display-case: none;
  --cw-account-display-tracking: 0;
  --cw-account-body-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --cw-account-label-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --cw-account-label-tracking: 0.12em;
  --cw-account-button-weight: 600;
  --cw-account-button-case: none;
  --cw-account-button-tracking: 0.02em;
  --cw-account-radius: 16px;
  --cw-account-radius-control: 12px;
  --cw-account-button-radius: 999px;
  --cw-account-shadow: 0 1px 2px rgba(28, 25, 23, 0.06);
}
`;

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export const PORTAL_BASE_CSS = `
/* ── Frame + scoped type ─────────────────────────────────────────────── */
.carisma-portal {
  --cw-ease: ${EASE};
  box-sizing: border-box;
  width: 100%;
  max-width: 1016px;
  margin: 0 auto;
  padding: 56px 24px 96px;
  color: var(--cw-account-ink);
  font-family: var(--cw-account-body-font);
  font-size: 16px;
  line-height: 1.5;
  font-weight: 400;
  text-align: left;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-variant-numeric: tabular-nums lining-nums;
}
.carisma-portal *, .carisma-portal *::before, .carisma-portal *::after { box-sizing: border-box; }
.carisma-portal :is(h1, h2, h3, h4, h5, h6, p, ul, ol, li, dl, dt, dd, figure, section, article, header, footer, nav, aside) {
  margin: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  text-transform: none;
  letter-spacing: normal;
  text-align: inherit;
  border: 0;
  background: none;
  list-style: none;
  box-shadow: none;
}
.carisma-portal :is(button, a, input) {
  font: inherit;
  color: inherit;
  text-transform: none;
  letter-spacing: normal;
}
.carisma-portal a { text-decoration: none; }

/* Headings, hardened. At least one brand ships \`h2 { font-size: … !important }\`
   on phones, which no ordinary selector can beat. So every portal heading
   takes its type from PRIVATE --cw-h-* properties under !important; the
   heading's own class sets those properties, and no site stylesheet can
   reach a name it has never heard of. */
.carisma-portal :is(h1, h2, h3, h4, h5, h6) {
  font-family: var(--cw-h-font, var(--cw-account-body-font)) !important;
  font-size: var(--cw-h-size, 16px) !important;
  line-height: var(--cw-h-lh, 24px) !important;
  font-weight: var(--cw-h-weight, 500) !important;
  font-style: normal !important;
  text-transform: var(--cw-h-case, none) !important;
  letter-spacing: var(--cw-h-track, normal) !important;
  color: var(--cw-h-color, var(--cw-account-ink)) !important;
}
.carisma-portal :is(.cw-title, .carisma-portal__title) {
  --cw-h-font: var(--cw-account-display-font);
  --cw-h-size: clamp(1.75rem, 1.1rem + 2.2vw, 2.5rem);
  --cw-h-lh: 1.15;
  --cw-h-weight: var(--cw-account-display-weight);
  --cw-h-case: var(--cw-account-display-case);
  --cw-h-track: var(--cw-account-display-tracking);
  --cw-h-color: var(--cw-account-display-ink);
}
.carisma-portal :is(.cw-t2, .carisma-portal__subtitle) {
  --cw-h-font: var(--cw-account-display-font);
  --cw-h-size: 22px;
  --cw-h-lh: 28px;
  --cw-h-weight: var(--cw-account-display-weight);
  --cw-h-case: var(--cw-account-display-case);
  --cw-h-track: var(--cw-account-display-tracking);
  --cw-h-color: var(--cw-account-display-ink);
}
.carisma-portal .cw-section__title {
  --cw-h-font: var(--cw-account-display-font);
  --cw-h-size: 20px;
  --cw-h-lh: 26px;
  --cw-h-weight: var(--cw-account-display-weight);
  --cw-h-case: var(--cw-account-display-case);
  --cw-h-track: var(--cw-account-display-tracking);
  --cw-h-color: var(--cw-account-display-ink);
}
.carisma-portal :is(.cw-label, .carisma-portal__eyebrow) {
  --cw-h-font: var(--cw-account-label-font);
  --cw-h-size: 11px;
  --cw-h-lh: 16px;
  --cw-h-weight: 500;
  --cw-h-case: uppercase;
  --cw-h-track: var(--cw-account-label-tracking);
  --cw-h-color: var(--cw-account-muted);
}
.carisma-portal .cw-appt__title {
  --cw-h-size: 17px;
  --cw-h-lh: 24px;
  --cw-h-weight: 500;
}
.carisma-portal svg { flex: none; }

.carisma-portal .cw-title {
  display: block;
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  text-transform: var(--cw-account-display-case);
  letter-spacing: var(--cw-account-display-tracking);
  font-size: clamp(1.75rem, 1.1rem + 2.2vw, 2.5rem);
  line-height: 1.15;
  color: var(--cw-account-display-ink);
  text-wrap: balance;
  outline: none;
}
.carisma-portal .cw-t2 {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  text-transform: var(--cw-account-display-case);
  letter-spacing: var(--cw-account-display-tracking);
  font-size: 22px;
  line-height: 28px;
  color: var(--cw-account-display-ink);
  text-wrap: balance;
}
.carisma-portal .cw-label {
  font-family: var(--cw-account-label-font);
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--cw-account-label-tracking);
  color: var(--cw-account-muted);
}
.carisma-portal .cw-small { font-size: 14px; line-height: 20px; }
.carisma-portal .cw-fine { font-size: 12.5px; line-height: 18px; color: var(--cw-account-muted); }
.carisma-portal .cw-muted { color: var(--cw-account-muted); }
.carisma-portal .cw-prose { max-width: 65ch; text-wrap: pretty; }
.carisma-portal .cw-vh {
  position: absolute !important;
  width: 1px; height: 1px;
  margin: -1px; padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.carisma-portal .cw-link {
  color: var(--cw-account-accent-text);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-color: color-mix(in srgb, var(--cw-account-accent-text) 45%, transparent);
  transition: text-decoration-color 160ms var(--cw-ease);
}
.carisma-portal .cw-link:hover { text-decoration-color: currentColor; }

/* ── Focus: one ring, on every control ───────────────────────────────── */
.carisma-portal :is(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--cw-account-focus);
  outline-offset: 3px;
}
.carisma-portal .cw-title:focus-visible { outline: none; }

/* ── Buttons ─────────────────────────────────────────────────────────── */
.carisma-portal .cw-btn {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 28px;
  margin: 0;
  border: 1px solid transparent;
  border-radius: var(--cw-account-button-radius);
  background: transparent;
  color: var(--cw-account-ink);
  font-family: var(--cw-account-label-font);
  font-size: 12.5px;
  line-height: 1;
  font-weight: var(--cw-account-button-weight);
  text-transform: var(--cw-account-button-case);
  letter-spacing: var(--cw-account-button-tracking);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 220ms var(--cw-ease), background-color 180ms var(--cw-ease),
    border-color 180ms var(--cw-ease), box-shadow 220ms var(--cw-ease), color 180ms var(--cw-ease);
}
.carisma-portal .cw-btn:active { transform: scale(0.98); }
.carisma-portal .cw-btn--primary {
  background: var(--cw-account-accent-fill);
  color: var(--cw-account-accent-ink);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--cw-account-ink) 14%, transparent);
}
.carisma-portal .cw-btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px -12px color-mix(in srgb, var(--cw-account-accent) 90%, transparent);
}
.carisma-portal .cw-btn--primary:active { transform: scale(0.98); }
.carisma-portal .cw-btn--secondary {
  border-color: var(--cw-account-line-strong);
  color: var(--cw-account-ink);
}
.carisma-portal .cw-btn--secondary:hover { background: var(--cw-account-accent-soft); }
.carisma-portal .cw-btn--sm { min-height: 44px; padding: 0 20px; font-size: 12px; }
.carisma-portal .cw-btn--quiet,
.carisma-portal .cw-btn--danger {
  min-height: 44px;
  padding: 0 2px;
  border: 0;
  border-radius: 4px;
  background: none;
  font-family: var(--cw-account-body-font);
  font-size: 15px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: var(--cw-account-accent-text);
}
.carisma-portal .cw-btn--danger { color: var(--cw-account-bad-text); }
.carisma-portal :is(.cw-btn--quiet, .cw-btn--danger):hover {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}
.carisma-portal :is(.cw-btn--quiet, .cw-btn--danger):active { transform: none; opacity: 0.7; }
.carisma-portal .cw-btn__arrow { transition: transform 220ms var(--cw-ease); }
.carisma-portal .cw-btn:hover .cw-btn__arrow { transform: translateX(3px); }
.carisma-portal .cw-btn[aria-disabled="true"],
.carisma-portal .cw-btn:disabled { opacity: 0.55; cursor: default; pointer-events: none; transform: none; }
.carisma-portal .cw-btn.is-busy::before {
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  border-right-color: transparent;
  animation: cw-spin 700ms linear infinite;
}
.carisma-portal .cw-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; }

/* ── Chips: always text, never colour alone ──────────────────────────── */
.carisma-portal .cw-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 24px;
  padding: 0 10px 0 9px;
  border-radius: 999px;
  background: var(--cw-account-surface-2);
  color: var(--cw-account-muted);
  font-family: var(--cw-account-label-font);
  font-size: 10.5px;
  line-height: 1;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.carisma-portal .cw-chip::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}
.carisma-portal .cw-chip--ok { background: var(--cw-account-ok-soft); color: var(--cw-account-ok-text); }
.carisma-portal .cw-chip--warn { background: var(--cw-account-warn-soft); color: var(--cw-account-warn-text); }
.carisma-portal .cw-chip--bad { background: var(--cw-account-bad-soft); color: var(--cw-account-bad-text); }
.carisma-portal .cw-chip--neutral::before { background: transparent; border: 1px solid currentColor; }

/* ── Cards ───────────────────────────────────────────────────────────── */
.carisma-portal .cw-card {
  background: var(--cw-account-surface);
  border: 1px solid var(--cw-account-line);
  border-radius: var(--cw-account-radius);
  padding: 24px;
}
.carisma-portal .cw-card--raised { box-shadow: var(--cw-account-shadow); }

/* ── Sections ────────────────────────────────────────────────────────── */
.carisma-portal .cw-body { display: flex; flex-direction: column; gap: 48px; }
.carisma-portal .cw-section { display: flex; flex-direction: column; gap: 16px; }
.carisma-portal .cw-section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.carisma-portal .cw-section__title {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  text-transform: var(--cw-account-display-case);
  letter-spacing: var(--cw-account-display-tracking);
  font-size: 20px;
  line-height: 26px;
  color: var(--cw-account-display-ink);
}
.carisma-portal .cw-section__count { color: var(--cw-account-muted); font-family: var(--cw-account-body-font); font-size: 14px; letter-spacing: 0; text-transform: none; margin-left: 8px; }
.carisma-portal .cw-section__more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  font-size: 14px;
  font-weight: 500;
  color: var(--cw-account-accent-text);
  white-space: nowrap;
}
.carisma-portal .cw-section__more:hover { text-decoration: underline; text-underline-offset: 4px; }

/* ── Facts list (Details, and anything label/value) ──────────────────── */
.carisma-portal .cw-facts { display: grid; }
.carisma-portal .cw-fact {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 6px 24px;
  align-items: baseline;
  padding: 18px 0;
}
.carisma-portal .cw-fact + .cw-fact { border-top: 1px solid var(--cw-account-line); }
.carisma-portal .cw-fact__value { font-size: 16px; overflow-wrap: anywhere; }
.carisma-portal .cw-details__note { margin-top: 12px; padding-top: 16px; border-top: 1px solid var(--cw-account-line); }

/* ── Toast / status region ───────────────────────────────────────────── */
.carisma-portal .cw-status {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  z-index: 70;
  width: min(480px, calc(100vw - 32px));
  transform: translateX(-50%);
  pointer-events: none;
}
.carisma-portal .cw-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  border-radius: var(--cw-account-radius-control);
  background: var(--cw-account-ink);
  color: var(--cw-account-ground);
  font-size: 14px;
  line-height: 20px;
  box-shadow: 0 16px 40px -16px color-mix(in srgb, var(--cw-account-ink) 60%, transparent);
  pointer-events: auto;
  animation: cw-rise 420ms var(--cw-ease) both;
}
.carisma-portal .cw-toast a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }

/* ── Error block: failed is not empty ────────────────────────────────── */
.carisma-portal .cw-error {
  display: grid;
  gap: 8px;
  padding: 24px;
  border-radius: var(--cw-account-radius);
  border: 1px solid var(--cw-account-line);
  background: var(--cw-account-surface);
}
.carisma-portal .cw-error__title { font-size: 17px; line-height: 24px; font-weight: 500; color: var(--cw-account-ink); }
.carisma-portal .cw-error__text { font-size: 15px; line-height: 22px; color: var(--cw-account-muted); max-width: 52ch; }
.carisma-portal .cw-error .cw-actions { margin-top: 8px; }

/* ── Empty state: an invitation, not an apology ──────────────────────── */
.carisma-portal .cw-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 64px 24px;
  border-radius: var(--cw-account-radius);
  background: var(--cw-account-surface-2);
}
.carisma-portal .cw-empty__icon {
  width: 56px;
  height: 56px;
  margin-bottom: 8px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--cw-account-accent-soft);
  color: var(--cw-account-accent-text);
}
.carisma-portal .cw-empty__text { max-width: 40ch; color: var(--cw-account-muted); font-size: 15px; line-height: 22px; }
.carisma-portal .cw-empty .cw-btn { margin-top: 12px; }
.carisma-portal .cw-empty--quiet { padding: 40px 24px; }

/* ── Skeleton ────────────────────────────────────────────────────────── */
.carisma-portal .cw-skel {
  display: block;
  border-radius: var(--cw-account-radius-control);
  background: linear-gradient(90deg,
    var(--cw-account-surface-2) 0%,
    color-mix(in srgb, var(--cw-account-surface-2) 55%, var(--cw-account-surface)) 50%,
    var(--cw-account-surface-2) 100%);
  background-size: 200% 100%;
  animation: cw-shimmer 1.4s ease-in-out infinite;
}
.carisma-portal .cw-skel--line { height: 12px; border-radius: 6px; }
.carisma-portal .cw-skel--card { border-radius: var(--cw-account-radius); }

/* ── Motion ──────────────────────────────────────────────────────────── */
@keyframes cw-rise { from { opacity: 0.001; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes cw-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
@keyframes cw-spin { to { transform: rotate(360deg); } }
.carisma-portal .cw-rise { animation: cw-rise 480ms var(--cw-ease) both; }
.carisma-portal .cw-body > .cw-rise:nth-child(2) { animation-delay: 40ms; }
.carisma-portal .cw-body > .cw-rise:nth-child(3) { animation-delay: 80ms; }
.carisma-portal .cw-body > .cw-rise:nth-child(4) { animation-delay: 120ms; }
.carisma-portal .cw-body > .cw-rise:nth-child(5) { animation-delay: 160ms; }
.carisma-portal .cw-body > .cw-rise:nth-child(n + 6) { animation-delay: 200ms; }
@media (prefers-reduced-motion: reduce) {
  .carisma-portal *, .carisma-portal *::before, .carisma-portal *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    animation-delay: 0ms !important;
    transition-duration: 1ms !important;
  }
  .carisma-portal .cw-skel { animation: none !important; }
  .carisma-portal .cw-btn:hover, .carisma-portal .cw-btn:active { transform: none; }
}

/* ── Legacy classes (detail + records pages until wave 2 rewrites them) ─
   Same tokens, same button system, so those pages sit in the new shell
   without a single hard-coded colour. */
.carisma-portal .carisma-portal__eyebrow {
  font-family: var(--cw-account-label-font);
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--cw-account-label-tracking);
  color: var(--cw-account-muted);
  margin: 0 0 10px;
}
.carisma-portal .carisma-portal__eyebrow a { color: var(--cw-account-accent-text); }
.carisma-portal .carisma-portal__title {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  text-transform: var(--cw-account-display-case);
  letter-spacing: var(--cw-account-display-tracking);
  font-size: clamp(1.75rem, 1.1rem + 2.2vw, 2.5rem);
  line-height: 1.15;
  color: var(--cw-account-display-ink);
  margin: 0 0 12px;
  text-wrap: balance;
}
.carisma-portal .carisma-portal__subtitle {
  font-family: var(--cw-account-display-font);
  text-transform: var(--cw-account-display-case);
  letter-spacing: var(--cw-account-display-tracking);
  font-size: 22px;
  line-height: 28px;
  color: var(--cw-account-display-ink);
  margin: 0 0 8px;
}
.carisma-portal .carisma-portal__lede { font-size: 15px; line-height: 22px; color: var(--cw-account-muted); margin: 0 0 8px; }
.carisma-portal .carisma-portal__lede a,
.carisma-portal .carisma-portal__empty a,
.carisma-portal .carisma-portal__note a { color: var(--cw-account-accent-text); text-decoration: underline; text-underline-offset: 3px; }
.carisma-portal .carisma-portal__status {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  margin: 4px 0 16px;
  border-radius: 999px;
  background: var(--cw-account-surface-2);
  color: var(--cw-account-muted);
  font-family: var(--cw-account-label-font);
  font-size: 10.5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.carisma-portal .carisma-portal__block {
  margin-top: 32px;
  padding: 24px;
  border-radius: var(--cw-account-radius);
  border: 1px solid var(--cw-account-line);
  background: var(--cw-account-surface);
}
.carisma-portal .carisma-portal__row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 0;
  font-size: 15px;
}
.carisma-portal .carisma-portal__row.is-strong { font-weight: 600; }
.carisma-portal .carisma-portal__fine { font-size: 12.5px; line-height: 18px; color: var(--cw-account-muted); margin: 6px 0 12px; }
.carisma-portal .carisma-portal__note { font-size: 14px; line-height: 20px; color: var(--cw-account-muted); margin: 12px 0 0; max-width: 65ch; }
.carisma-portal .carisma-portal__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.carisma-portal .carisma-portal__actions .carisma-portal__note { flex-basis: 100%; }
.carisma-portal .carisma-portal__card {
  display: grid;
  gap: 4px;
  padding: 18px 0;
  border-top: 1px solid var(--cw-account-line);
}
.carisma-portal .carisma-portal__label {
  font-family: var(--cw-account-label-font);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--cw-account-label-tracking);
  color: var(--cw-account-muted);
}
.carisma-portal .carisma-portal__value { font-size: 16px; color: var(--cw-account-ink); }
.carisma-portal .carisma-portal__empty { font-size: 15px; line-height: 22px; color: var(--cw-account-muted); }
.carisma-portal .carisma-portal__cardlink { display: block; color: inherit; border-radius: var(--cw-account-radius-control); }
.carisma-portal .carisma-portal__cardlink:hover { background: var(--cw-account-accent-soft); }
.carisma-portal .carisma-portal__btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 24px;
  border-radius: var(--cw-account-button-radius);
  border: 1px solid var(--cw-account-line-strong);
  background: transparent;
  color: var(--cw-account-ink);
  font-family: var(--cw-account-label-font);
  font-size: 12.5px;
  font-weight: var(--cw-account-button-weight);
  text-transform: var(--cw-account-button-case);
  letter-spacing: var(--cw-account-button-tracking);
  text-decoration: none;
  cursor: pointer;
  transition: transform 220ms var(--cw-ease), background-color 180ms var(--cw-ease);
}
.carisma-portal .carisma-portal__btn:hover { background: var(--cw-account-accent-soft); }
.carisma-portal .carisma-portal__btn:active { transform: scale(0.98); }
.carisma-portal .carisma-portal__btn.is-primary {
  background: var(--cw-account-accent-fill);
  color: var(--cw-account-accent-ink);
  border-color: transparent;
}
.carisma-portal .carisma-portal__btn.is-quiet {
  min-height: 44px;
  padding: 0 4px;
  border: 0;
  background: none;
  font-family: var(--cw-account-body-font);
  font-size: 15px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: var(--cw-account-accent-text);
}
.carisma-portal .carisma-portal__flash {
  border-radius: var(--cw-account-radius-control);
  padding: 12px 16px;
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 20px;
}
.carisma-portal .carisma-portal__flash.is-bad { background: var(--cw-account-bad-soft); color: var(--cw-account-bad-text); }
.carisma-portal .carisma-portal__flash.is-ok { background: var(--cw-account-ok-soft); color: var(--cw-account-ok-text); }
.carisma-portal .carisma-reschedule { flex-basis: 100%; margin-top: 16px; }
.carisma-portal .carisma-reschedule__day { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--cw-account-muted); margin-bottom: 14px; max-width: 240px; }
.carisma-portal .carisma-reschedule__day input {
  min-height: 44px;
  padding: 0 12px;
  border-radius: var(--cw-account-radius-control);
  border: 1px solid var(--cw-account-line-strong);
  background: var(--cw-account-surface);
  color: var(--cw-account-ink);
}
.carisma-portal .carisma-reschedule__times { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; }
.carisma-portal .carisma-reschedule__time,
.carisma-portal .carisma-reschedule__jump {
  min-height: 48px;
  border-radius: var(--cw-account-radius-control);
  border: 1px solid var(--cw-account-line);
  background: var(--cw-account-surface);
  color: var(--cw-account-ink);
  font-size: 15px;
  cursor: pointer;
}
.carisma-portal .carisma-reschedule__time:hover,
.carisma-portal .carisma-reschedule__jump:hover { border-color: var(--cw-account-line-strong); background: var(--cw-account-accent-soft); }
.carisma-portal .carisma-reschedule__jump { min-height: 44px; padding: 0 14px; font-size: 14px; }

@media (max-width: 1023.98px) {
  .carisma-portal { padding: 32px 16px 72px; }
  .carisma-portal .cw-body { gap: 40px; }
}
@media (max-width: 599.98px) {
  .carisma-portal .cw-fact { grid-template-columns: minmax(0, 1fr); padding: 14px 0; }
  .carisma-portal .cw-card { padding: 20px; }
  .carisma-portal .cw-error { padding: 20px; }
}
`;
