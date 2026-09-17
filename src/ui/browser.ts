/**
 * The browser entry — the only UI code that touches the DOM. It is handed the real
 * `document` (and fetch/navigate seams) by the site's untyped bootstrap, and it uses
 * only the structural members declared in dom.ts, so the package needs neither the
 * TypeScript "DOM" lib nor React. Every function here is a thin adapter over the pure
 * modules (accountMark, panel, linkInterceptor); the decisions live there and are
 * unit-tested without a DOM.
 *
 * This module imports NO server code (no seal, no node:crypto), so it is safe to ship
 * into the site's client bundle — which is where `cw-signed-in` must appear (WP-SPA-1a
 * chunk grep). It runs after hydration, reads the host hint cookie, and upgrades the
 * byte-identical guest chip to the signed-in chip (W-1: the server HTML never branched).
 */
import { accountMarkSignedInHTML, accountMarkState, ACCOUNT_MARK_ATTR } from "./accountMark.js";
import { AVATAR_CACHE_KEY, AVATAR_CACHE_TTL_MS, avatarUrlFromSession, sanitizeAvatarUrl } from "./avatar.js";
import { readInitialsHint, readSignedInHint } from "./hint.js";
import { buildPanelModel, accountPanelHTML } from "./panel.js";
import { accountPortalHTML, buildPortalModel, type PortalView } from "./portal.js";
import { installBrandLinkInterceptor } from "./linkInterceptor.js";
import { ACCOUNT_CHROME_CSS, ACCOUNT_CHROME_STYLE_ID } from "./chromeCss.js";
import type { MinimalDocument, MinimalElement, MinimalMouseEvent } from "./dom.js";

/**
 * The member's photo URL for this tab, once known. Module state on purpose: a host's
 * header re-applies hydrateAccountMark on every re-render (a React re-commit of the
 * server glyph, a StrictMode remount), and a photo held only in the DOM would be wiped
 * back to initials each time. Read here, it survives every re-apply. Cleared when
 * the session read says signed out.
 */
let currentAvatarUrl: string | null = null;

const panelBound = new WeakSet<object>();

/** The photo the marks are currently painted with (exported for tests/hosts). */
export function accountMarkPhotoUrl(): string | null {
  return currentAvatarUrl;
}

/** Upgrade one guest chip to its signed-in appearance from the host cookie. */
export function hydrateAccountMark(el: MinimalElement, cookie: string): void {
  const st = accountMarkState(cookie);
  // Signed out is a legitimate final state — the guest glyph the server already
  // rendered. Nothing changes, so there is no re-render and no flash (4.1 / W-1).
  if (!st.signedIn) return;
  el.setAttribute("data-cw-session", "in");
  el.setAttribute("aria-label", st.ariaLabel);
  el.setAttribute("href", st.href);
  el.setAttribute("aria-haspopup", "dialog");
  if (!el.getAttribute("aria-expanded")) el.setAttribute("aria-expanded", "false");
  if (st.initials) el.setAttribute("data-cw-initials", st.initials);
  el.innerHTML = accountMarkSignedInHTML(st.initials, currentAvatarUrl);
}

/** Hydrate every account mark in the document from the current cookie. */
export function hydrateAccountMarks(doc: MinimalDocument): void {
  const cookie = doc.cookie || "";
  const marks = doc.querySelectorAll(`[${ACCOUNT_MARK_ATTR}]`);
  for (let i = 0; i < marks.length; i++) hydrateAccountMark(marks[i], cookie);
}

/** The tiny slice of sessionStorage this uses; a host passes the real one. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Put the member's own photo on the mark (CEO 2026-09-16).
 *
 * Only for a browser the hint cookie already calls signed in — a guest makes no
 * request, so the CloudFront-cached document stays free of member traffic (W-1). The
 * URL is read from the site's own `/api/auth/session`, cached per tab for
 * AVATAR_CACHE_TTL_MS so one photo costs one request however many pages are walked,
 * and every failure is silent: no photo simply means the initials chip, and nothing
 * here can sign anybody out (W-9).
 */
export function loadAccountMarkPhoto(
  doc: MinimalDocument,
  fetchImpl?: FetchLike,
  storage?: StorageLike | null,
): Promise<void> {
  if (!readSignedInHint(doc.cookie || "")) {
    currentAvatarUrl = null;
    return Promise.resolve();
  }

  const cached = readCachedAvatar(storage);
  if (cached) {
    currentAvatarUrl = cached;
    hydrateAccountMarks(doc);
    return Promise.resolve();
  }
  if (!fetchImpl) return Promise.resolve();

  return fetchImpl("/api/auth/session", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      const url = avatarUrlFromSession(body);
      currentAvatarUrl = url;
      writeCachedAvatar(storage, url);
      if (url) hydrateAccountMarks(doc);
    })
    .catch(() => {
      /* W-9: a failed read is a mark without a photo, never a sign-out */
    });
}

function readCachedAvatar(storage?: StorageLike | null): string | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(AVATAR_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { url?: unknown; at?: unknown };
    const at = typeof parsed.at === "number" ? parsed.at : 0;
    if (Date.now() - at > AVATAR_CACHE_TTL_MS) {
      storage.removeItem(AVATAR_CACHE_KEY);
      return null;
    }
    return sanitizeAvatarUrl(parsed.url);
  } catch {
    return null;
  }
}

function writeCachedAvatar(storage: StorageLike | null | undefined, url: string | null): void {
  if (!storage) return;
  try {
    storage.setItem(AVATAR_CACHE_KEY, JSON.stringify({ url, at: Date.now() }));
  } catch {
    /* private mode, blocked storage: the photo is simply re-read next page */
  }
}

export interface FetchLike {
  (
    url: string,
    init?: {
      credentials?: string;
      method?: string;
      headers?: Record<string, string> | { get?(name: string): string | null };
      body?: string;
      redirect?: string;
    },
  ): Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
    headers?: { get(name: string): string | null };
  }>;
}

export interface HydrateOptions {
  /** how the interceptor navigates (default: no-op; the bootstrap passes location) */
  navigate?: (url: string) => void;
  /** how the panel reads its one authenticated session (the bootstrap passes fetch) */
  fetchImpl?: FetchLike;
  /** id of the element the settled panel HTML is written into (default carisma-account-panel) */
  panelMountId?: string;
  /** where the member's photo URL is cached for the tab (the bootstrap passes sessionStorage) */
  storage?: StorageLike | null;
}

const BACKDROP_ID = "carisma-account-backdrop";

function cookieFallbackSession(cookie: string): Record<string, unknown> {
  return {
    signedIn: true,
    initials: readInitialsHint(cookie),
    profile: {},
    upcoming: [],
  };
}

function setOpen(doc: MinimalDocument, mountId: string, open: boolean): void {
  const mount = doc.getElementById(mountId);
  const backdrop = doc.getElementById(BACKDROP_ID);
  if (open) {
    mount?.removeAttribute?.("hidden");
    backdrop?.removeAttribute?.("hidden");
  } else {
    mount?.setAttribute("hidden", "");
    backdrop?.setAttribute("hidden", "");
  }
  const marks = doc.querySelectorAll(`[${ACCOUNT_MARK_ATTR}]`);
  for (let i = 0; i < marks.length; i++) {
    marks[i].setAttribute("aria-expanded", open ? "true" : "false");
  }
}

function injectChrome(doc: MinimalDocument): void {
  if (doc.getElementById(ACCOUNT_CHROME_STYLE_ID)) return;
  const create = doc.createElement;
  const parent = doc.head || doc.body;
  if (!create || !parent) return;
  const style = create("style");
  style.setAttribute("id", ACCOUNT_CHROME_STYLE_ID);
  style.innerHTML = ACCOUNT_CHROME_CSS;
  parent.appendChild(style);
}

function ensureMounts(doc: MinimalDocument, mountId: string): MinimalElement | null {
  let mount = doc.getElementById(mountId);
  const create = doc.createElement;
  const body = doc.body;
  if (!mount && create && body) {
    mount = create("div");
    mount.setAttribute("id", mountId);
    mount.setAttribute("hidden", "");
    body.appendChild(mount);
  }
  if (!doc.getElementById(BACKDROP_ID) && create && body) {
    const backdrop = create("div");
    backdrop.setAttribute("id", BACKDROP_ID);
    backdrop.setAttribute("hidden", "");
    backdrop.setAttribute("data-carisma-panel-backdrop", "");
    body.appendChild(backdrop);
  }
  return mount;
}

function postLogout(
  fetchImpl: FetchLike,
  everywhere: boolean,
  navigate: (url: string) => void,
  storage?: StorageLike | null,
): void {
  try {
    storage?.removeItem(AVATAR_CACHE_KEY);
  } catch {
    /* ignore */
  }
  currentAvatarUrl = null;
  void fetchImpl("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(everywhere ? { everywhere: true } : {}),
    redirect: "manual",
  })
    .then((r) => {
      const loc = r.headers && typeof r.headers.get === "function" ? r.headers.get("location") : null;
      navigate(loc || "/");
    })
    .catch(() => {
      navigate("/");
    });
}

function matches(el: MinimalElement | null, attr: string): boolean {
  if (!el) return false;
  if (el.getAttribute(attr) !== null) return true;
  const hit = el.closest ? el.closest(`[${attr}]`) : null;
  return Boolean(hit);
}

/**
 * Mount the panel: on a click of a signed-in mark, make the ONE authenticated read
 * and open the dialog. A failed read still opens the panel with Sign out (the CEO
 * must be able to leave) — it never signs anyone out by itself (W-9).
 */
export function mountAccountPanel(doc: MinimalDocument, opts: HydrateOptions = {}): void {
  if (panelBound.has(doc)) return;
  panelBound.add(doc);
  injectChrome(doc);
  const mountId = opts.panelMountId || "carisma-account-panel";
  ensureMounts(doc, mountId);
  const navigate = opts.navigate || (() => {});
  const fetchImpl = opts.fetchImpl;

  const close = () => setOpen(doc, mountId, false);

  const openPanel = (body: unknown) => {
    const mount = ensureMounts(doc, mountId);
    if (!mount) return;
    mount.innerHTML = accountPanelHTML(buildPanelModel(body));
    setOpen(doc, mountId, true);
  };

  doc.addEventListener("click", (e: MinimalMouseEvent) => {
    const t = e.target;
    if (matches(t, "data-carisma-panel-close") || matches(t, "data-carisma-panel-backdrop") || t?.getAttribute("id") === BACKDROP_ID) {
      e.preventDefault();
      close();
      return;
    }
    if (matches(t, "data-carisma-signout-all")) {
      e.preventDefault();
      if (fetchImpl) postLogout(fetchImpl, true, navigate, opts.storage);
      return;
    }
    if (matches(t, "data-carisma-signout")) {
      e.preventDefault();
      if (fetchImpl) postLogout(fetchImpl, false, navigate, opts.storage);
      return;
    }
    const mark = t && typeof t.closest === "function" ? t.closest(`[${ACCOUNT_MARK_ATTR}]`) : null;
    if (!mark || mark.getAttribute("data-cw-session") !== "in") return;
    e.preventDefault();
    const mount = doc.getElementById(mountId);
    if (mount && mount.getAttribute("hidden") === null && mount.innerHTML) {
      close();
      return;
    }
    const fallback = cookieFallbackSession(doc.cookie || "");
    if (!fetchImpl) {
      openPanel(fallback);
      return;
    }
    fetchImpl("/api/auth/session?include=upcoming", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        openPanel(body && typeof body === "object" ? body : fallback);
      })
      .catch(() => {
        openPanel(fallback);
      });
  }, false);

  doc.addEventListener(
    "keydown",
    (e: MinimalMouseEvent) => {
      if (e.key === "Escape") close();
    },
    false,
  );
}

export function mountAccountPortal(
  doc: MinimalDocument,
  opts: HydrateOptions & { view?: PortalView; portalMountId?: string } = {},
): void {
  injectChrome(doc);
  const mountId = opts.portalMountId || "carisma-account-portal";
  const mount = doc.getElementById(mountId);
  const navigate = opts.navigate || (() => {});
  const view: PortalView = opts.view || "home";
  const next = view === "home" ? "/account" : `/account/${view}`;
  if (!readSignedInHint(doc.cookie || "")) {
    navigate(`/member?next=${encodeURIComponent(next)}`);
    return;
  }
  if (!mount) return;
  const fetchImpl = opts.fetchImpl;
  const fallback = cookieFallbackSession(doc.cookie || "");
  const paint = (session: unknown, extra?: { past?: unknown; upcomingOverride?: unknown }) => {
    mount.innerHTML = accountPortalHTML(buildPortalModel(session, view, extra));
  };
  if (!fetchImpl) {
    paint(fallback);
    return;
  }
  const sessionP = fetchImpl("/api/auth/session?include=upcoming", { credentials: "same-origin" }).then((r) =>
    r.ok ? r.json() : null,
  );
  const extraP =
    view === "bookings"
      ? Promise.all([
          fetchImpl("/api/auth/proxy/client/booking/appointments?filter=upcoming&limit=50", {
            credentials: "same-origin",
          }).then((r) => (r.ok ? r.json() : null)),
          fetchImpl("/api/auth/proxy/client/booking/appointments?filter=past&limit=50", {
            credentials: "same-origin",
          }).then((r) => (r.ok ? r.json() : null)),
        ])
      : Promise.resolve(null);

  void sessionP
    .then((body) => {
      if (body && typeof body === "object" && (body as { signedIn?: boolean }).signedIn === false) {
        navigate(`/member?next=${encodeURIComponent(next)}`);
        return;
      }
      return extraP.then((extra) => {
        const upcomingOverride = extra ? extra[0] : undefined;
        const past = extra ? extra[1] : undefined;
        paint(body || fallback, { upcomingOverride, past });
      });
    })
    .catch(() => paint(fallback));

  // Sign-out on this page is handled by mountAccountPanel's document listener
  // (layout calls hydrateAll). Binding it here as well would double-POST.
}

/** Wire everything the account UI needs after hydration. */
export function hydrateAll(doc: MinimalDocument, opts: HydrateOptions = {}): void {
  injectChrome(doc);
  hydrateAccountMarks(doc);
  void loadAccountMarkPhoto(doc, opts.fetchImpl, opts.storage);
  installBrandLinkInterceptor(doc, {
    getCookie: () => doc.cookie || "",
    navigate: opts.navigate || (() => {}),
  });
  mountAccountPanel(doc, opts);
}
