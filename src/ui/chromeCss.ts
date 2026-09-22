/**
 * The account chrome — panel, backdrop, /account portal. Injected once by
 * hydrateAll so every brand site gets the same behaviour without copying 200
 * lines of CSS. Brands override --cw-account-accent next to .carisma-account-mark.
 */
export const ACCOUNT_CHROME_STYLE_ID = "carisma-account-chrome";

export const ACCOUNT_CHROME_CSS = `
:root {
  --cw-account-ink: #1c1917;
  --cw-account-muted: #57534e;
  --cw-account-line: rgba(28, 25, 23, 0.12);
  --cw-account-accent: #8a6a1c;
  --cw-account-surface: rgba(255, 255, 255, 0.92);
  --cw-account-shadow: 0 24px 64px rgba(28, 25, 23, 0.16);
}
#carisma-account-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(28, 25, 23, 0.18);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 0;
  padding: 0;
  cursor: pointer;
}
#carisma-account-backdrop[hidden],
#carisma-account-panel[hidden] { display: none !important; }
#carisma-account-panel {
  position: fixed;
  z-index: 81;
  top: 72px;
  right: 16px;
  width: min(380px, calc(100vw - 24px));
  max-height: min(72vh, 640px);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}
.carisma-panel {
  background: var(--cw-account-surface);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 20px;
  box-shadow: var(--cw-account-shadow);
  color: var(--cw-account-ink);
  font-family: "Roboto Local", Roboto, system-ui, sans-serif;
  padding: 20px 20px 16px;
}
.carisma-panel__close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--cw-account-muted);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  border-radius: 999px;
}
.carisma-panel__close:hover { background: rgba(28, 25, 23, 0.06); }
.carisma-panel { position: relative; }
.carisma-panel__header { display: grid; gap: 2px; padding-right: 44px; margin-bottom: 16px; }
.carisma-panel__initials {
  display: none;
}
.carisma-panel__name {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.carisma-panel__email {
  font-size: 13px;
  color: var(--cw-account-muted);
}
.carisma-panel__empty {
  font-size: 14px;
  color: var(--cw-account-muted);
  margin: 0 0 12px;
}
.carisma-panel__book,
.carisma-panel__manage,
.carisma-panel__links a,
.carisma-portal__nav a {
  color: var(--cw-account-accent);
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}
.carisma-panel__book:hover,
.carisma-panel__manage:hover,
.carisma-panel__links a:hover,
.carisma-portal__nav a:hover { text-decoration: underline; }
.carisma-panel__visit {
  display: grid;
  gap: 2px;
  padding: 12px 0;
  border-top: 1px solid var(--cw-account-line);
}
.carisma-panel__when { font-size: 12px; color: var(--cw-account-muted); }
.carisma-panel__service { font-size: 14px; font-weight: 600; }
.carisma-panel__venue,
.carisma-panel__brand { font-size: 12px; color: var(--cw-account-muted); }
.carisma-panel__links {
  display: grid;
  gap: 4px;
  margin: 12px 0;
  padding: 8px 0;
  border-top: 1px solid var(--cw-account-line);
}
.carisma-panel__links a {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 4px;
}
.carisma-panel__footer {
  display: grid;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--cw-account-line);
}
.carisma-panel__footer button {
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid var(--cw-account-line);
  background: #fff;
  color: var(--cw-account-ink);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.carisma-panel__footer button[data-carisma-signout-all] {
  border-color: transparent;
  background: transparent;
  color: var(--cw-account-muted);
  font-weight: 500;
}
.carisma-panel__footer button:hover { background: rgba(28, 25, 23, 0.04); }
@media (max-width: 640px) {
  #carisma-account-panel {
    top: auto;
    right: 0;
    left: 0;
    bottom: 0;
    width: 100%;
    max-height: 86vh;
  }
  .carisma-panel {
    border-radius: 20px 20px 0 0;
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }
}

/* /account portal */
.carisma-portal {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 20px 80px;
  color: var(--cw-account-ink);
  font-family: "Roboto Local", Roboto, system-ui, sans-serif;
}
.carisma-portal__eyebrow {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--cw-account-muted);
  margin: 0 0 8px;
}
.carisma-portal__title {
  font-size: 32px;
  letter-spacing: -0.03em;
  font-weight: 600;
  margin: 0 0 8px;
}
.carisma-portal__lede {
  font-size: 15px;
  color: var(--cw-account-muted);
  margin: 0 0 28px;
}
.carisma-portal__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 32px;
}
.carisma-portal__nav a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--cw-account-line);
  background: #fff;
  color: var(--cw-account-ink);
  font-weight: 600;
  font-size: 14px;
}
.carisma-portal__nav a[aria-current="page"] {
  background: var(--cw-account-ink);
  color: #fff;
  border-color: var(--cw-account-ink);
}
.carisma-portal__card {
  display: grid;
  gap: 4px;
  padding: 16px 0;
  border-top: 1px solid var(--cw-account-line);
}
.carisma-portal__label {
  font-size: 12px;
  color: var(--cw-account-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.carisma-portal__value { font-size: 16px; }
.carisma-portal__signout {
  margin-top: 32px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.carisma-portal__signout button {
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid var(--cw-account-line);
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.carisma-portal__empty { color: var(--cw-account-muted); font-size: 15px; }
@media (prefers-reduced-motion: reduce) {
  #carisma-account-backdrop,
  .carisma-panel { transition: none; }
}

/* The member account pages. Brand skin arrives through --cw-account-*, so a
   site overrides the accent once and every rule below follows. Nothing here
   names a brand colour. */
.carisma-portal__subtitle { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; margin: 2px 0 6px; }
.carisma-portal__status { display: inline-block; font-size: 13px; color: var(--cw-account-muted); border: 1px solid var(--cw-account-line); border-radius: 999px; padding: 3px 12px; margin: 0 0 14px; }
.carisma-portal__block { border-top: 1px solid var(--cw-account-line); padding-top: 18px; margin-top: 22px; }
.carisma-portal__row { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font-size: 15px; }
.carisma-portal__row.is-strong { font-weight: 600; }
.carisma-portal__fine { font-size: 12px; color: var(--cw-account-muted); margin: 6px 0 0; }
.carisma-portal__note { font-size: 14px; color: var(--cw-account-muted); margin: 14px 0 0; line-height: 1.5; }
.carisma-portal__actions { display: flex; flex-wrap: wrap; gap: 10px; }
.carisma-portal__actions .carisma-portal__note { flex-basis: 100%; }
/* 44px is the tap target, not a look: these are pressed one-handed, often by
   someone already late for the appointment they are trying to move. */
.carisma-portal__btn { min-height: 44px; padding: 0 20px; border-radius: 999px; border: 1px solid var(--cw-account-line); background: transparent; color: var(--cw-account-ink); font: inherit; font-size: 15px; cursor: pointer; display: inline-flex; align-items: center; text-decoration: none; }
.carisma-portal__btn:hover { background: rgba(28, 25, 23, 0.05); }
.carisma-portal__btn.is-primary { background: var(--cw-account-ink); color: #fff; border-color: var(--cw-account-ink); }
.carisma-portal__btn.is-quiet { color: var(--cw-account-muted); font-size: 14px; }
.carisma-portal__cardlink { display: block; text-decoration: none; color: inherit; border-radius: 14px; }
.carisma-portal__cardlink:hover { background: rgba(28, 25, 23, 0.04); }
.carisma-portal__flash { border-radius: 12px; padding: 12px 14px; margin: 0 0 16px; font-size: 14px; line-height: 1.5; }
.carisma-portal__flash.is-bad { background: rgba(180, 35, 24, 0.08); color: #8c1d18; }
.carisma-portal__flash.is-ok { background: rgba(23, 120, 70, 0.08); color: #10643b; }
.carisma-reschedule { flex-basis: 100%; margin-top: 18px; }
.carisma-reschedule__day { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--cw-account-muted); margin-bottom: 14px; max-width: 220px; }
.carisma-reschedule__day input { min-height: 44px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--cw-account-line); background: transparent; color: var(--cw-account-ink); font: inherit; }
/* auto-fill wraps to one column at phone width with no media query. */
.carisma-reschedule__times { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; }
.carisma-reschedule__time, .carisma-reschedule__jump { min-height: 44px; border-radius: 12px; border: 1px solid var(--cw-account-line); background: transparent; color: var(--cw-account-ink); font: inherit; font-size: 15px; cursor: pointer; }
.carisma-reschedule__time:hover, .carisma-reschedule__jump:hover { background: rgba(28, 25, 23, 0.06); }
.carisma-reschedule__jump { min-height: 0; padding: 2px 10px; font-size: 14px; }
`.replace(/^\s+/gm, "").trim();
