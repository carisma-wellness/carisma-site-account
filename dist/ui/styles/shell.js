/**
 * The shell: a 232px sticky rail beside the content on a desk (≥1024px), one
 * scrolling underline tab row above it on a phone. ONE <nav> serves both —
 * the groups flatten with `display: contents` below 1024px — so there is one
 * landmark, one set of links and nothing to drift.
 *
 * Sign-out sits at the rail's foot on a desk and at the page's foot on a
 * phone; it is never in the content column, which is for the member's visits.
 */
export const PORTAL_SHELL_CSS = `
.carisma-portal .cw-shell { display: block; }
.carisma-portal .cw-main { min-width: 0; }

/* Page header: display title + one informative line. No eyebrow, no email. */
.carisma-portal .cw-head { display: grid; gap: 12px; margin: 0 0 40px; }
.carisma-portal .cw-lede { font-size: 15px; line-height: 22px; color: var(--cw-account-muted); }
.carisma-portal .cw-lede strong { font-weight: 500; color: var(--cw-account-ink); }

/* Rail */
.carisma-portal .cw-rail { display: flex; flex-direction: column; gap: 28px; }
.carisma-portal .cw-member { display: grid; align-content: start; gap: 4px; min-height: 48px; padding: 0 12px; }
.carisma-portal .cw-member__name {
  font-family: var(--cw-account-display-font);
  font-weight: var(--cw-account-display-weight);
  text-transform: var(--cw-account-display-case);
  letter-spacing: var(--cw-account-display-tracking);
  font-size: 20px;
  line-height: 26px;
  color: var(--cw-account-display-ink);
  overflow-wrap: anywhere;
}
.carisma-portal .cw-member__email { font-size: 13px; line-height: 18px; color: var(--cw-account-muted); overflow-wrap: anywhere; }
.carisma-portal .cw-nav { display: flex; flex-direction: column; }
.carisma-portal .cw-nav__group { display: flex; flex-direction: column; gap: 2px; }
.carisma-portal .cw-nav__group + .cw-nav__group { margin-top: 20px; }
.carisma-portal .cw-nav__label { padding: 0 12px 6px; }
.carisma-portal .cw-nav__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: var(--cw-account-radius-control);
  color: var(--cw-account-ink);
  font-size: 15px;
  line-height: 20px;
  transition: background-color 180ms var(--cw-ease), color 180ms var(--cw-ease);
}
.carisma-portal .cw-nav__link::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  transition: background-color 180ms var(--cw-ease), transform 220ms var(--cw-ease);
  transform: scale(0.4);
}
.carisma-portal .cw-nav__link:hover { background: color-mix(in srgb, var(--cw-account-accent-soft) 60%, transparent); }
.carisma-portal .cw-nav__link[aria-current="page"] {
  background: var(--cw-account-accent-soft);
  color: var(--cw-account-accent-text);
  font-weight: 500;
}
.carisma-portal .cw-nav__link[aria-current="page"]::before { background: currentColor; transform: none; }
.carisma-portal .cw-nav__badge {
  margin-left: auto;
  font-family: var(--cw-account-label-font);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cw-account-warn-text);
}

.carisma-portal .cw-signout { display: flex; flex-direction: column; align-items: flex-start; gap: 0; }
.carisma-portal .cw-signout .cw-btn--quiet { font-size: 14px; color: var(--cw-account-muted); padding: 0; }
.carisma-portal .cw-signout .cw-btn--quiet:hover { color: var(--cw-account-ink); }
.carisma-portal .cw-rail__foot { padding: 16px 12px 0; border-top: 1px solid var(--cw-account-line); }
.carisma-portal .cw-foot { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--cw-account-line); }

@media (min-width: 1024px) {
  .carisma-portal .cw-shell {
    display: grid;
    grid-template-columns: 232px minmax(0, 720px);
    gap: 64px;
    align-items: start;
  }
  .carisma-portal .cw-rail { position: sticky; top: 112px; }
  .carisma-portal .cw-foot { display: none; }
  .carisma-portal .cw-head { margin-bottom: 48px; }
}

@media (max-width: 1023.98px) {
  .carisma-portal .cw-rail { margin: 0 -16px 32px; gap: 0; }
  .carisma-portal .cw-member,
  .carisma-portal .cw-nav__label,
  .carisma-portal .cw-rail__foot { display: none; }
  .carisma-portal .cw-nav {
    flex-direction: row;
    gap: 4px;
    padding: 0 40px 0 16px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    scroll-padding: 0 16px;
    scrollbar-width: none;
    border-bottom: 1px solid var(--cw-account-line);
    -webkit-mask-image: linear-gradient(to right, black calc(100% - 40px), transparent);
    mask-image: linear-gradient(to right, black calc(100% - 40px), transparent);
  }
  .carisma-portal .cw-nav::-webkit-scrollbar { display: none; }
  .carisma-portal .cw-nav__group { display: contents; }
  .carisma-portal .cw-nav__group + .cw-nav__group { margin: 0; }
  .carisma-portal .cw-nav__link {
    flex: none;
    min-height: 48px;
    padding: 0 12px;
    border-radius: 0;
    scroll-snap-align: start;
    font-family: var(--cw-account-label-font);
    font-size: 11.5px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: var(--cw-account-label-tracking);
    color: var(--cw-account-muted);
  }
  .carisma-portal .cw-nav__link::before { display: none; }
  .carisma-portal .cw-nav__link:hover { background: none; color: var(--cw-account-ink); }
  .carisma-portal .cw-nav__link[aria-current="page"] { background: none; color: var(--cw-account-ink); }
  .carisma-portal .cw-nav__link::after {
    content: "";
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 0;
    height: 2px;
    border-radius: 2px;
    background: transparent;
    transition: background-color 180ms var(--cw-ease);
  }
  .carisma-portal .cw-nav__link[aria-current="page"]::after { background: var(--cw-account-accent); }
  .carisma-portal .cw-nav__badge { margin-left: 6px; }
}
`;
//# sourceMappingURL=shell.js.map