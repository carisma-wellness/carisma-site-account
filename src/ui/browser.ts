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
import {
  accountPortalHTML,
  buildPortalModel,
  errorBlockHTML,
  greetingFor,
  portalShellHTML,
  skeletonHTML,
  type ApptCard,
  type LoadState,
  type PortalView,
} from "./portal.js";
import { bodyFor, bookingIdFromPath, ledeFor, requestsFor, subjectFor, titleFor } from "./portalData.js";
import { buildWalletModel } from "./records.js";
import { unwrapEnvelope } from "./appointments.js";
import { escapeHtml } from "./html.js";
import { ACCOUNT_BOOKINGS_HREF } from "./panel.js";
import { linkifyPhones } from "./portal.js";
import {
  bookingSkeletonHTML,
  bookingTreatment,
  bookingViewParts,
  buildBookingDetailModel,
  isActiveBooking,
  type BookingDetailModel,
} from "./bookingDetail.js";
import { buildSlotsModel, venueDateString, venueLocalToUtcIso, type SlotsModel } from "./reschedule.js";
import {
  cancelCall,
  cancelSummary,
  cancellationPreviewCall,
  confirmCall,
  membershipCall,
  messageFromError,
  needsPreview,
  payBalanceCall,
  readCancellationPreview,
  readWalletAvailability,
  rescheduleCall,
  slotsCall,
  walletAvailabilityCall,
  walletPassCall,
  type CancelSummary,
  type ProxyCall,
} from "./portalActions.js";
import {
  buildDayStrip,
  cancelBodyHTML,
  cancelDialogHTML,
  cancelFootHTML,
  clockOf,
  dateWords,
  dayChipsHTML,
  dialogFrameHTML,
  instantWords,
  rescheduleDialogHTML,
  rescheduleTimesHTML,
  reviewBarHTML,
} from "./dialogs.js";
import { buildIcs, icsFileName, icsLocation } from "./ics.js";
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
  const parent = doc.head || doc.body;
  const createElement = bindCreateElement(doc);
  if (!createElement || !parent) return;
  const style = createElement("style");
  style.setAttribute("id", ACCOUNT_CHROME_STYLE_ID);
  style.innerHTML = ACCOUNT_CHROME_CSS;
  parent.appendChild(style);
}

function ensureMounts(doc: MinimalDocument, mountId: string): MinimalElement | null {
  let mount = doc.getElementById(mountId);
  const createElement = bindCreateElement(doc);
  const body = doc.body;
  if (!mount && createElement && body) {
    mount = createElement("div");
    mount.setAttribute("id", mountId);
    mount.setAttribute("hidden", "");
    body.appendChild(mount);
  }
  if (!doc.getElementById(BACKDROP_ID) && createElement && body) {
    const backdrop = createElement("div");
    backdrop.setAttribute("id", BACKDROP_ID);
    backdrop.setAttribute("hidden", "");
    backdrop.setAttribute("data-carisma-panel-backdrop", "");
    body.appendChild(backdrop);
  }
  return mount;
}

/** Chrome throws Illegal invocation if createElement is called unbound. */
function bindCreateElement(
  doc: MinimalDocument,
): ((tag: string) => MinimalElement) | null {
  const fn = doc.createElement;
  if (typeof fn !== "function") return null;
  return fn.bind(doc);
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
  const mountId = opts.panelMountId || "carisma-account-panel";
  try {
    injectChrome(doc);
    ensureMounts(doc, mountId);
  } catch {
    /* panel chrome is optional; a throw here used to white-screen the host page */
  }
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

/**
 * Mount one account page.
 *
 * Three shapes of page, one mount:
 *   · `booking` — ONE booking, read from `/account/bookings/<id>`, with the
 *     server's capability block deciding every button;
 *   · a data section (wallet / payments / documents / membership) — the paths
 *     portalData names, rendered by the builder it names;
 *   · home / bookings / details — the model-driven views, fed by the
 *     appointment LIST (which carries each booking's `actions`).
 *
 * Every page paints its shell and a skeleton FIRST, then fills. Every read is
 * tri-state — ok, empty, failed — and a failed read shows an error block with
 * Try again, never the empty state: "you have no bookings" is a lie when we
 * could not ask. Nothing here decides what a member may do.
 */
export interface PortalMountOptions extends HydrateOptions {
  view?: PortalView;
  portalMountId?: string;
  path?: string;
  /** This site's brand name ("Carisma Slimming"). Inferred from the host when absent. */
  siteBrand?: string;
  /** Where "book" goes on this brand (default "/"). */
  bookHref?: string;
  /** The brand's phone, offered in the error block. */
  contactPhone?: string;
}

/** One read's outcome. `failed` carries the status so 401 and 404 can be told apart. */
export interface ReadResult {
  state: LoadState;
  status: number;
  body: unknown;
}

/**
 * Classify one answer. A 2xx whose list is empty is `empty`; anything not
 * 2xx — or no answer at all (status 0) — is `failed`. The two never merge.
 */
export function classifyRead(ok: boolean, status: number, body: unknown): ReadResult {
  if (!ok) return { state: "failed", status, body: null };
  const inner = unwrapEnvelope(body);
  let empty = false;
  if (Array.isArray(inner)) empty = inner.length === 0;
  else if (inner && typeof inner === "object") {
    const data = (inner as Record<string, unknown>).data;
    empty = Array.isArray(data) && data.length === 0;
  } else if (inner === null || inner === undefined) empty = true;
  return { state: empty ? "empty" : "ok", status, body };
}

/** The brand a host serves, for the cross-brand label on a card. "" when unknown. */
export function siteBrandFromHost(host: string): string {
  const h = String(host || "").toLowerCase();
  if (h.includes("aesthetics")) return "Carisma Aesthetics";
  if (h.includes("slimming")) return "Carisma Slimming";
  if (h.includes("hairclinic") || h.includes("hair-clinic")) return "Carisma Hair Clinic";
  if (h.includes("pulse")) return "Pulse";
  if (h.includes("carismaspa") || h.includes("spa.")) return "Carisma Spa";
  return "";
}

type Listenable = { addEventListener?: (t: string, h: (e: MinimalMouseEvent) => void) => void };

/* ── DOM seams ─────────────────────────────────────────────────────────────
   dom.ts is deliberately minimal and shared; the portal needs a few more
   members of the real DOM (dialogs, focus, attributes on many nodes). They
   are declared here and reached through `unknown`, exactly as the rest of
   this file does — the real browser satisfies them structurally. */
interface LiveEl extends MinimalElement {
  querySelector?(s: string): LiveEl | null;
  querySelectorAll?(s: string): ArrayLike<LiveEl>;
  addEventListener?(t: string, h: (e: LiveEvent) => void): void;
  insertAdjacentHTML?(where: string, html: string): void;
  focus?(opts?: { preventScroll?: boolean }): void;
  remove?(): void;
  showModal?(): void;
  close?(): void;
  scrollIntoView?(opts?: Record<string, string>): void;
  getBoundingClientRect?(): { left: number; right: number; top: number; bottom: number };
  hasAttribute?(n: string): boolean;
  hidden?: boolean;
  value?: string;
  open?: boolean;
  isConnected?: boolean;
  style?: Record<string, string>;
  outerHTML?: string;
}
interface LiveEvent extends MinimalMouseEvent {
  clientX?: number;
  clientY?: number;
}
function live(el: unknown): LiveEl | null {
  return (el as LiveEl | null) ?? null;
}
function qs(el: unknown, sel: string): LiveEl | null {
  return live(el)?.querySelector?.(sel) ?? null;
}
function qsa(el: unknown, sel: string): LiveEl[] {
  const list = live(el)?.querySelectorAll?.(sel);
  return list ? Array.from(list) : [];
}
function closestOf(el: unknown, sel: string): LiveEl | null {
  return (live(el)?.closest?.(sel) as LiveEl | null) ?? null;
}

const portalListBound = new WeakSet<object>();
const portalMembershipBound = new WeakSet<object>();

const GENERIC_FAILURE = "That didn't go through. Nothing has changed — try again.";

/**
 * Write a toast into the shell's persistent status region. An optional action
 * ("Update your calendar") rides with it as a real button, handled by the
 * mount's delegated listener through `data-cw-toast-action`.
 */
function announce(
  mount: MinimalElement,
  text: string,
  tone: "ok" | "bad" = "ok",
  action?: { label: string; key: string },
): void {
  const region = qs(mount, ".cw-status");
  if (!region) return;
  const clean = text.replace(/[<>&]/g, "");
  region.innerHTML =
    `<p class="cw-toast cw-toast--${tone}"><span class="cw-toast__text">${clean}</span>` +
    (action
      ? `<button type="button" class="cw-toast__action" data-cw-toast-action="${action.key}">${action.label.replace(/[<>&"]/g, "")}</button>`
      : "") +
    `</p>`;
  const clear = () => {
    if (region.innerHTML.includes(clean)) region.innerHTML = "";
  };
  try {
    setTimeout(clear, action ? 12000 : 7000);
  } catch {
    /* no timers (a test host): the toast simply stays */
  }
}

/** A button mid-request: disabled to a second tap, saying what it is doing. */
function setBusy(btn: MinimalElement, label: string): () => void {
  const html = btn.innerHTML;
  const cls = btn.getAttribute("class") || "";
  btn.setAttribute("aria-disabled", "true");
  btn.setAttribute("class", `${cls} is-busy`);
  btn.innerHTML = label;
  return () => {
    btn.removeAttribute?.("aria-disabled");
    btn.setAttribute("class", cls);
    btn.innerHTML = html;
  };
}

/** Keep the current tab in view on a phone's scrolling tab row. */
function revealCurrentTab(mount: MinimalElement): void {
  type Box = { getBoundingClientRect?: () => { left: number; right: number } };
  const navEl = qs(mount, ".cw-nav") as unknown as
    | (Box & { scrollWidth?: number; clientWidth?: number; scrollLeft?: number })
    | null;
  const cur = qs(mount, '.cw-nav [aria-current="page"]') as unknown as Box | null;
  if (!navEl || !cur?.getBoundingClientRect || !navEl.getBoundingClientRect) return;
  if ((navEl.scrollWidth ?? 0) <= (navEl.clientWidth ?? 0)) return;
  // Relative to the row itself, so it holds whatever the tab's offsetParent is.
  const delta = cur.getBoundingClientRect().left - navEl.getBoundingClientRect().left - 16;
  navEl.scrollLeft = Math.max(0, (navEl.scrollLeft ?? 0) + delta);
}

/** Hand a file to the member: a Blob URL and a download link, clicked once. */
function downloadFile(doc: MinimalDocument, name: string, text: string, type: string): boolean {
  const g = globalThis as unknown as {
    Blob?: new (parts: string[], opts: { type: string }) => unknown;
    URL?: { createObjectURL?(b: unknown): string; revokeObjectURL?(u: string): void };
  };
  const make = bindCreateElement(doc);
  if (!g.Blob || !g.URL?.createObjectURL || !make || !doc.body) return false;
  const url = g.URL.createObjectURL(new g.Blob([text], { type }));
  const a = make("a") as LiveEl;
  a.setAttribute("href", url);
  a.setAttribute("download", name);
  a.setAttribute("hidden", "");
  doc.body.appendChild(a);
  (a as unknown as { click?: () => void }).click?.();
  try {
    setTimeout(() => {
      g.URL?.revokeObjectURL?.(url);
      a.remove?.();
    }, 1000);
  } catch {
    /* ignore */
  }
  return true;
}

/** What a calendar entry needs, whichever view the booking came from. */
interface CalendarEntry {
  id: string;
  startIso: string;
  endIso: string;
  treatment: string;
  brand: string;
  venue: string;
  address: string;
  sequence: number;
}

function calendarFromModel(m: BookingDetailModel, sequence = 0): CalendarEntry {
  return {
    id: m.id,
    startIso: m.startIso,
    endIso: m.endIso,
    treatment: bookingTreatment(m),
    brand: m.brand,
    venue: m.venue,
    address: m.address,
    sequence,
  };
}

function downloadCalendar(doc: MinimalDocument, e: CalendarEntry): boolean {
  const host = (doc as unknown as { location?: { host?: string } }).location?.host || "carisma";
  const ics = buildIcs({
    id: e.id,
    host,
    startIso: e.startIso,
    endIso: e.endIso,
    summary: [e.treatment, e.brand].filter(Boolean).join(" · "),
    location: icsLocation(e.venue, e.address),
    sequence: e.sequence,
  });
  if (!ics) return false;
  return downloadFile(doc, icsFileName(e.startIso), ics, "text/calendar;charset=utf-8");
}

/** The dialog's inner markup, from the frame builder (the element itself stays open). */
function innerOfDialog(html: string): string {
  return html.replace(/^<dialog[^>]*>/, "").replace(/<\/dialog>$/, "");
}

export function mountAccountPortal(doc: MinimalDocument, opts: PortalMountOptions = {}): void {
  try {
    injectChrome(doc);
  } catch {
    /* portal chrome is optional */
  }
  const mountId = opts.portalMountId || "carisma-account-portal";
  const mount = doc.getElementById(mountId);
  const navigate = opts.navigate || (() => {});
  const path = opts.path || currentPath(doc);
  const bookingId = bookingIdFromPath(path);
  const view: PortalView = bookingId ? "booking" : opts.view || "home";
  const next = view === "home" ? "/account" : bookingId ? path : `/account/${view}`;
  const loc = (doc as unknown as { location?: { host?: string; origin?: string; search?: string } }).location;
  const siteBrand = opts.siteBrand ?? siteBrandFromHost(loc?.host ?? "");
  const extras = { siteBrand, bookHref: opts.bookHref, contactPhone: opts.contactPhone };

  if (!readSignedInHint(doc.cookie || "")) {
    navigate(`/member?next=${encodeURIComponent(next)}`);
    return;
  }
  if (!mount) return;
  const fetchImpl = opts.fetchImpl;
  const fallback = cookieFallbackSession(doc.cookie || "");
  if (!fetchImpl) {
    // No fetch seam (a server render, a test host): paint what the cookie
    // knows rather than an empty page. Never the booking view — one booking
    // is entirely server data, and a shell with no booking in it would read
    // as "this booking is gone".
    if (view !== "booking") mount.innerHTML = accountPortalHTML(buildPortalModel(fallback, view, extras));
    return;
  }

  const readT = (url: string): Promise<ReadResult> =>
    fetchImpl(url, { credentials: "same-origin" }).then(
      (r) =>
        r.ok
          ? r.json().then(
              (body) => classifyRead(true, r.status, body),
              () => classifyRead(false, r.status, null),
            )
          : classifyRead(false, r.status, null),
      () => classifyRead(false, 0, null),
    );
  const signIn = () => navigate(`/member?next=${encodeURIComponent(next)}`);

  /** Cards on screen, so a toast can name the day without another read. */
  let onScreen: ApptCard[] = [];
  /** The booking on screen (booking view), so dialogs never re-read it. */
  let detail: BookingDetailModel | null = null;
  /** The last reschedule, for "Update your calendar". */
  let movedEntry: CalendarEntry | null = null;
  /** Wallet availability, read once per mount. */
  let walletOnce: Promise<{ apple: boolean; google: boolean }> | null = null;
  let noteShown = false;
  let identity = { emailMasked: "", memberName: "" };

  const paint = (html: string) => {
    mount.innerHTML = html;
    revealCurrentTab(mount);
  };
  const focusTitle = () => qs(mount, ".cw-title")?.focus?.({ preventScroll: false });

  const skeleton = () => {
    paint(
      portalShellHTML({
        view,
        title: view === "home" ? greetingFor() : view === "booking" ? "Your booking" : titleFor(view, "Your account"),
        emailMasked: identity.emailMasked,
        memberName: identity.memberName || undefined,
        body: view === "booking" ? bookingSkeletonHTML() : skeletonHTML(view),
        busy: true,
      }),
    );
  };

  const readWallet = () => {
    if (!walletOnce) {
      walletOnce = readT(walletAvailabilityCall().path).then((r) =>
        r.state === "failed" ? { apple: false, google: false } : readWalletAvailability(r.body),
      );
    }
    return walletOnce;
  };

  const showReturnNote = () => {
    if (noteShown) return;
    noteShown = true;
    const note = paymentReturnNote(loc?.search ?? "");
    if (note) announce(mount, note.text, note.tone);
  };

  const load = (after?: () => void, quiet = false): Promise<void> => {
    // A re-render after an action keeps the page on screen; only the first
    // paint (and Try again) shows the skeleton.
    if (!quiet) skeleton();
    return readT("/api/auth/session?include=upcoming")
      .then((sessionRead) => {
        const body = sessionRead.body as { signedIn?: boolean } | null;
        if (sessionRead.status === 401 || (body && body.signedIn === false)) {
          signIn();
          return undefined;
        }
        const session = (sessionRead.state !== "failed" && body) || fallback;
        const profile = ((session as Record<string, unknown>).profile ?? {}) as Record<string, unknown>;
        const emailMasked = String(profile.emailMasked ?? "");
        const memberName = String(profile.firstName ?? "") || buildPanelModel(session).name;
        identity = { emailMasked, memberName };

        if (view === "booking" && bookingId) {
          const id = encodeURIComponent(bookingId);
          // The preview is read beside the booking, not after it: it is only
          // USED when the server says cancelling is not free, but waiting for
          // the booking to find that out would cost a whole round trip.
          const previewRead = postJson(fetchImpl, cancellationPreviewCall(bookingId)).then((r) =>
            r.ok ? readCancellationPreview(r.body) : null,
          );
          return Promise.all([readT(`/api/auth/proxy/client/booking/appointments/${id}`), readWallet(), previewRead]).then(
            ([read, wallet, preview]) => {
              if (read.status === 401) return signIn();
              if (read.state === "failed" && read.status !== 404) {
                detail = null;
                paint(
                  portalShellHTML({
                    view,
                    title: "Your booking",
                    emailMasked,
                    memberName,
                    body: errorBlockHTML("booking", opts.contactPhone),
                  }),
                );
                return;
              }
              const model = buildBookingDetailModel(read.state === "failed" ? null : read.body, bookingId);
              detail = model.found && !model.isMedical ? model : null;
              const needPreview = model.found && !model.actions.cancelIsFree && model.actions.canCancel;
              const parts = bookingViewParts(model, {
                siteBrand,
                wallet,
                preview: needPreview ? preview : null,
                bookHref: opts.bookHref,
              });
              paint(portalShellHTML({ view, title: parts.title, lede: parts.lede, body: parts.body, emailMasked, memberName }));
            },
          );
        }

        if (view === "home" || view === "bookings") {
          return Promise.all(requestsFor(view).map(readT)).then((reads) => {
            if (reads.some((r) => r.status === 401)) return signIn();
            const [up, past, gifts, packs, credit] = reads;
            const walletReads = [gifts, packs, credit].filter(Boolean);
            const wallet =
              view === "home" && walletReads.some((r) => r && r.state !== "failed")
                ? buildWalletModel({ giftCards: gifts?.body, packages: packs?.body, credit: credit?.body })
                : null;
            const model = buildPortalModel(session, view, {
              ...extras,
              upcomingOverride: up.state === "failed" ? [] : up.body ?? [],
              upcomingState: up.state,
              past: past && past.state !== "failed" ? past.body ?? [] : [],
              pastState: past ? past.state : "empty",
              wallet,
            });
            onScreen = [...model.upcomingCards, ...model.pastCards];
            paint(accountPortalHTML(model));
          });
        }

        if (view === "details") {
          paint(accountPortalHTML(buildPortalModel(session, view, extras)));
          return undefined;
        }

        const urls = requestsFor(view);
        return Promise.all(urls.map(readT)).then((reads) => {
          if (reads.some((r) => r.status === 401)) return signIn();
          const allFailed = reads.length > 0 && reads.every((r) => r.state === "failed");
          paint(
            portalShellHTML({
              view,
              title: titleFor(view, "Your account"),
              lede: allFailed ? "" : ledeFor(view),
              emailMasked,
              memberName,
              // ONE dead endpoint costs its own block (the builders treat a
              // null answer as nothing there); ALL of them dead is an outage,
              // and says so.
              body: allFailed
                ? errorBlockHTML(subjectFor(view), opts.contactPhone)
                : // The record pages are built on the new system now; the
                  // legacy wrapper only existed to hold their old markup. They
                  // also need the member's first name (the membership card) and
                  // the brand phone (a tel link beside "speak to the team").
                  `<div class="cw-rise">${bodyFor(
                    view,
                    reads.map((r) => (r.state === "failed" ? null : r.body)),
                    { memberName, contactPhone: opts.contactPhone },
                  )}</div>`,
            }),
          );
          if (!portalMembershipBound.has(mount)) {
            portalMembershipBound.add(mount);
            bindMembershipActions(mount, opts);
          }
        });
      })
      .then(
        () => {
          showReturnNote();
          after?.();
        },
        () => {
          if (view === "booking") {
            paint(
              portalShellHTML({
                view,
                title: "Your booking",
                emailMasked: identity.emailMasked,
                body: errorBlockHTML("booking", opts.contactPhone),
              }),
            );
          } else paint(accountPortalHTML(buildPortalModel(fallback, view, { ...extras, upcomingState: "failed" })));
        },
      );
  };

  /** The booking a dialog is about: the one on screen, or a fresh read. */
  const bookingFor = (id: string): Promise<BookingDetailModel | null> => {
    if (detail && detail.id === id) return Promise.resolve(detail);
    return readT(`/api/auth/proxy/client/booking/appointments/${encodeURIComponent(id)}`).then((r) => {
      if (r.state === "failed") return null;
      const m = buildBookingDetailModel(r.body, id);
      return m.found && !m.isMedical ? m : null;
    });
  };

  /* ── Dialogs ──────────────────────────────────────────────────────────── */

  /**
   * One dialog at a time, appended inside `.carisma-portal` so it inherits
   * the brand tokens. `onClose` runs once, after the element is gone.
   */
  const openDialog = (html: string, opener: LiveEl | null, onClose?: () => void): LiveEl | null => {
    qsa(mount, "dialog.cw-dialog").forEach((d) => {
      d.close?.();
      d.remove?.();
    });
    const host = qs(mount, ".carisma-portal") ?? live(mount);
    host?.insertAdjacentHTML?.("beforeend", html);
    const dlg = qsa(host, "dialog.cw-dialog").pop() ?? null;
    if (!dlg) return null;
    const root = (doc as unknown as { documentElement?: LiveEl }).documentElement;
    const prevOverflow = root?.style?.overflow ?? "";
    if (root?.style) root.style.overflow = "hidden";
    let closed = false;
    dlg.addEventListener?.("close", () => {
      if (closed) return;
      closed = true;
      if (root?.style) root.style.overflow = prevOverflow;
      dlg.remove?.();
      onClose?.();
      // Back where the member was — unless a re-render replaced it, in
      // which case the page's own title is the honest place to land.
      if (opener && opener.isConnected !== false) opener.focus?.();
      else focusTitle();
    });
    // A tap on the dimmed page closes; a tap inside the sheet never does.
    dlg.addEventListener?.("click", (ev: LiveEvent) => {
      if (ev.target !== (dlg as unknown)) return;
      const r = dlg.getBoundingClientRect?.();
      const x = ev.clientX ?? 0;
      const y = ev.clientY ?? 0;
      if (r && (x < r.left || x > r.right || y < r.top || y > r.bottom)) dlg.close?.();
    });
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    return dlg;
  };

  const openReschedule = (id: string, opener: LiveEl | null): void => {
    const dlg = openDialog(rescheduleDialogHTML(null, [], ""), opener);
    if (!dlg) return;
    let alive = true;
    dlg.addEventListener?.("close", () => {
      alive = false;
    });
    const times = () => qs(dlg, "[data-cw-rs-times]");
    const foot = () => qs(dlg, ".cw-dialog__foot");

    void bookingFor(id).then((m) => {
      if (!alive) return;
      const refuse = (text: string) => {
        const body = qs(dlg, ".cw-dialog__body");
        if (body) {
          body.innerHTML = `<div class="cw-rs-none" role="alert"><p class="cw-rs-none__title">${escapeHtml(text.split("\n")[0])}</p>${
            text.includes("\n") ? `<p class="cw-rs-none__text">${linkifyPhones(text.split("\n")[1])}</p>` : ""
          }</div>`;
        }
        const f = foot();
        if (f) f.innerHTML = `<div class="cw-rs-review__actions"><button type="button" class="cw-btn cw-btn--secondary" data-cw-dialog-close>Close</button></div>`;
        qs(dlg, "[data-cw-dialog-close]")?.focus?.();
      };
      if (!m) return refuse("We couldn't open this booking just now.\nNothing has changed — try again in a moment.");
      // The server decides. A sheet opened from a card whose window has
      // since closed says why instead of offering times it will refuse.
      if (!m.actions.canReschedule || !isActiveBooking(m)) {
        return refuse(`This booking can't be moved online.\n${m.actions.reason || "Please call us and we'll move it for you."}`);
      }
      if (!m.brandLocationId || !m.startIso) return refuse("We can't move this booking online.\nPlease call the venue and we'll do it for you.");

      const tz = "Europe/Malta";
      const currentDate = venueDateString(new Date(m.startIso), tz);
      const currentTime = clockOf(m.startIso, tz);
      const today = venueDateString(new Date(), tz);
      let stripStart = currentDate > today ? currentDate : today;
      let days = buildDayStrip(stripStart, 14, currentDate);
      let selectedDate = currentDate >= today ? currentDate : today;
      let selectedTime: string | null = null;
      let alert: string | null = null;
      const taken = new Map<string, string[]>();
      const cache = new Map<string, SlotsModel | "failed">();
      const ctx = {
        treatment: bookingTreatment(m),
        venue: m.venue,
        startIso: m.startIso,
        stripStart,
        currentDate,
        minDate: today,
      };
      const frame = rescheduleDialogHTML(ctx, days, selectedDate);
      dlg.innerHTML = innerOfDialog(frame);
      const describedBy = /aria-describedby="([^"]+)"/.exec(frame);
      if (describedBy) dlg.setAttribute("aria-describedby", describedBy[1]);
      const oldLabel = instantWords(m.startIso, "short");

      const renderTimes = () => {
        const el = times();
        if (!el) return;
        const c = cache.get(selectedDate);
        el.innerHTML = rescheduleTimesHTML({
          date: selectedDate,
          phase: c === undefined ? "loading" : c === "failed" ? "failed" : "ready",
          slots: c && c !== "failed" ? c : null,
          currentDate,
          currentTime,
          selected: selectedTime,
          alert,
          taken: taken.get(selectedDate),
        });
      };
      const renderReview = () => {
        const f = foot();
        if (!f) return;
        if (!selectedTime) {
          f.innerHTML = "";
          f.removeAttribute?.("data-open");
          return;
        }
        const newLabel = `${dateWords(selectedDate, "shortMonth")}, ${selectedTime}`;
        f.innerHTML = reviewBarHTML(oldLabel, newLabel);
        f.setAttribute("data-open", "");
      };
      const pressDays = () => {
        qsa(dlg, "[data-cw-rs-day].cw-rs-day").forEach((b) =>
          b.setAttribute("aria-pressed", b.getAttribute("data-cw-rs-day") === selectedDate ? "true" : "false"),
        );
      };
      const loadDay = (date: string) => {
        if (cache.has(date) && cache.get(date) !== "failed") return renderTimes();
        cache.delete(date);
        renderTimes();
        void readT(
          slotsCall({ brandLocationId: m.brandLocationId as string, date, serviceId: m.serviceId, durationMins: m.durationMins }).path,
        ).then((r) => {
          if (!alive) return;
          cache.set(date, r.state === "failed" ? "failed" : buildSlotsModel(r.body, date));
          if (date === selectedDate) renderTimes();
        });
      };
      const selectDay = (date: string, focusChip = false) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
        if (date < today) date = today;
        if (!days.some((d) => d.date === date)) {
          // Outside the strip (the native picker, or the server's next free
          // day): the strip re-opens on that date rather than hiding it.
          stripStart = date;
          days = buildDayStrip(stripStart, 14, currentDate);
          const strip = qs(dlg, ".cw-rs-days");
          if (strip) strip.innerHTML = dayChipsHTML(days, date);
        }
        selectedDate = date;
        selectedTime = null;
        alert = null;
        pressDays();
        renderReview();
        const chip = qs(dlg, `[data-cw-rs-day="${date}"].cw-rs-day`);
        chip?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
        if (focusChip) chip?.focus?.();
        loadDay(date);
      };

      const commit = (btn: LiveEl) => {
        if (!selectedTime || btn.getAttribute("aria-disabled") === "true") return;
        const c = cache.get(selectedDate);
        const zone = c && c !== "failed" ? c.timeZone : tz;
        // The venue's wall clock becomes a UTC instant HERE, in the zone the
        // SERVER named — never the handset's.
        const startTime = venueLocalToUtcIso(selectedDate, selectedTime, zone);
        if (!startTime) return;
        const time = selectedTime;
        const restore = setBusy(btn, "Moving…");
        void postJson(fetchImpl, rescheduleCall(m.id, startTime)).then((r) => {
          if (!alive) return;
          if (r.ok) {
            const length = Date.parse(m.endIso) - Date.parse(m.startIso);
            const ms = Number.isFinite(length) && length > 0 ? length : (m.durationMins || 60) * 60_000;
            movedEntry = {
              ...calendarFromModel(m, 1),
              startIso: startTime,
              endIso: new Date(Date.parse(startTime) + ms).toISOString(),
            };
            const said = `Moved to ${instantWords(startTime, "long")}. We've sent you a new confirmation.`;
            dlg.close?.();
            void load(() => {
              focusTitle();
              announce(mount, said, "ok", { label: "Update your calendar", key: "calendar-update" });
            }, true);
            return;
          }
          restore();
          if (r.status === 409) {
            // Taken between reading the day and pressing Move: say which time,
            // hide it, and keep the sheet open on the same day.
            taken.set(selectedDate, [...(taken.get(selectedDate) ?? []), time]);
            alert = `Someone just took ${time}. Pick another time.`;
            selectedTime = null;
            renderReview();
          } else {
            alert = messageFromError(r.body, r.status, GENERIC_FAILURE);
          }
          renderTimes();
          qs(dlg, ".cw-rs-alert")?.scrollIntoView?.({ block: "nearest" });
        });
      };

      dlg.addEventListener?.("click", (ev: LiveEvent) => {
        const t = ev.target;
        if (closestOf(t, "[data-cw-dialog-close]")) {
          ev.preventDefault();
          dlg.close?.();
          return;
        }
        const day = closestOf(t, "[data-cw-rs-day]");
        if (day) {
          ev.preventDefault();
          const date = day.getAttribute("data-cw-rs-day") || "";
          // "Show Sat 26" and Try again land focus on the new day's chip.
          selectDay(date, !day.getAttribute("class")?.includes("cw-rs-day"));
          return;
        }
        const slot = closestOf(t, "[data-cw-rs-time]");
        if (slot) {
          ev.preventDefault();
          selectedTime = slot.getAttribute("data-cw-rs-time");
          alert = null;
          qs(dlg, ".cw-rs-alert")?.remove?.();
          qsa(dlg, "[data-cw-rs-time]").forEach((b) =>
            b.setAttribute("aria-pressed", b === slot ? "true" : "false"),
          );
          renderReview();
          return;
        }
        const other = closestOf(t, "[data-cw-rs-other]");
        if (other) {
          ev.preventDefault();
          const field = qs(dlg, ".cw-rs-other__field");
          if (field) {
            const opening = field.hidden !== false;
            field.hidden = !opening;
            other.setAttribute("aria-expanded", opening ? "true" : "false");
            if (opening) {
              const input = qs(field, "input");
              if (input) input.value = selectedDate;
              input?.focus?.();
            }
          }
          return;
        }
        const go = closestOf(t, "[data-cw-rs-commit]");
        if (go) {
          ev.preventDefault();
          commit(go);
        }
      });
      qs(dlg, "[data-cw-rs-date]")?.addEventListener?.("change", () => {
        const v = qs(dlg, "[data-cw-rs-date]")?.value || "";
        if (v) selectDay(v);
      });

      qs(dlg, ".cw-rs-day")?.focus?.();
      loadDay(selectedDate);
    });
  };

  const openCancel = (opener: LiveEl | null): void => {
    const m = detail;
    if (!m) return;
    const free = !needsPreview(m.actions);
    let summary: CancelSummary | null = free ? cancelSummary(null, true, m.policyText) : null;
    const dlg = openDialog(
      cancelDialogHTML({ startIso: m.startIso, treatment: bookingTreatment(m), summary, canReschedule: canRescheduleNow(m) }),
      opener,
    );
    if (!dlg) return;
    let alive = true;
    dlg.addEventListener?.("close", () => {
      alive = false;
    });
    const render = (alert?: string | null) => {
      const body = qs(dlg, ".cw-dialog__body");
      const foot = qs(dlg, ".cw-dialog__foot");
      if (body) body.innerHTML = cancelBodyHTML(summary, canRescheduleNow(m), alert);
      if (foot) foot.innerHTML = cancelFootHTML(summary);
    };
    qs(dlg, ".cw-btn--primary")?.focus?.();
    if (!free) {
      // Not free — or we cannot tell: the server's own figures go in the
      // sheet before the member can press anything that costs money.
      void postJson(fetchImpl, cancellationPreviewCall(m.id)).then((r) => {
        if (!alive) return;
        summary = cancelSummary(r.ok ? readCancellationPreview(r.body) : null, false, m.policyText);
        render();
        qs(dlg, ".cw-btn--primary")?.focus?.();
      });
    }
    dlg.addEventListener?.("click", (ev: LiveEvent) => {
      const t = ev.target;
      if (closestOf(t, "[data-cw-dialog-close]")) {
        ev.preventDefault();
        dlg.close?.();
        return;
      }
      if (closestOf(t, "[data-cw-cx-reschedule]")) {
        ev.preventDefault();
        dlg.close?.();
        openReschedule(m.id, opener);
        return;
      }
      const go = closestOf(t, "[data-cw-cx-commit]");
      if (!go || !summary || go.getAttribute("aria-disabled") === "true") return;
      ev.preventDefault();
      const restore = setBusy(go, "Cancelling…");
      void postJson(fetchImpl, cancelCall(m.id, summary.acceptFee)).then((r) => {
        if (!alive) return;
        if (r.ok) {
          dlg.close?.();
          navigate(`${ACCOUNT_BOOKINGS_HREF}?cancelled=1`);
          return;
        }
        restore();
        // 409 on a cancel is the server refusing a fee nobody agreed to — the
        // policy moved under the member. Never the "time was taken" words.
        render(
          r.status === 409
            ? "Cancelling now carries a fee we haven't shown you. Close this and open it again to see it before you decide."
            : messageFromError(r.body, r.status, GENERIC_FAILURE),
        );
      });
    });
  };

  /* ── One delegated listener for every view ────────────────────────────── */

  if (!portalListBound.has(mount)) {
    portalListBound.add(mount);
    (mount as unknown as Listenable).addEventListener?.("click", (ev: MinimalMouseEvent) => {
      const t = ev.target;
      // A dialog handles its own controls.
      if (closestOf(t, "dialog.cw-dialog")) return;
      if (closestOf(t, "[data-cw-retry]")) {
        ev.preventDefault?.();
        void load();
        return;
      }
      if (closestOf(t, '[data-cw-toast-action="calendar-update"]')) {
        ev.preventDefault?.();
        if (movedEntry && !downloadCalendar(doc, movedEntry)) announce(mount, GENERIC_FAILURE, "bad");
        return;
      }
      const btn = closestOf(t, "[data-cw-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-cw-action") || "";
      const id = btn.getAttribute("data-cw-appt") || "";
      if (!id || !["pay", "reschedule", "confirm", "cancel", "calendar", "wallet"].includes(action)) return;
      ev.preventDefault?.();
      if (btn.getAttribute("aria-disabled") === "true") return;
      const card = onScreen.find((c) => c.id === id);

      if (action === "reschedule") {
        openReschedule(id, btn);
        return;
      }
      if (action === "cancel") {
        openCancel(btn);
        return;
      }
      if (action === "calendar") {
        if (!detail || !downloadCalendar(doc, calendarFromModel(detail))) announce(mount, GENERIC_FAILURE, "bad");
        return;
      }
      if (action === "wallet") {
        const which = btn.getAttribute("data-cw-wallet") === "google" ? "google" : "apple";
        const done = setBusy(btn, "Opening wallet…");
        void readT(walletPassCall(id, which).path).then((r) => {
          const inner = unwrapEnvelope(r.body) as Record<string, unknown> | null;
          const url = inner && typeof inner.url === "string" ? inner.url : "";
          done();
          if (r.state !== "failed" && /^https:\/\//.test(url)) navigate(url);
          else announce(mount, GENERIC_FAILURE, "bad");
        });
        return;
      }
      if (action === "pay") {
        const done = setBusy(btn, "Opening payment…");
        // This site's own origin, so Stripe returns the member to this
        // booking on this brand (the server checks it against its own map).
        void postJson(fetchImpl, payBalanceCall(id, loc?.origin ?? null)).then((r) => {
          const data = (r.body && typeof r.body === "object" ? r.body : {}) as Record<string, unknown>;
          const inner = (data.success === true && data.data ? data.data : data) as Record<string, unknown>;
          const url = typeof inner.checkoutUrl === "string" ? inner.checkoutUrl : "";
          if (r.ok && url) {
            navigate(url);
            return;
          }
          done();
          announce(mount, messageFromError(r.body, r.status, GENERIC_FAILURE), "bad");
        });
        return;
      }
      // confirm
      const done = setBusy(btn, "Confirming…");
      void postJson(fetchImpl, confirmCall(id)).then((r) => {
        if (!r.ok) {
          done();
          announce(mount, messageFromError(r.body, r.status, GENERIC_FAILURE), "bad");
          return;
        }
        const startIso = detail?.id === id ? detail.startIso : card?.startIso || "";
        const day = weekdayOf(startIso) || "soon";
        void load(() => {
          focusTitle();
          announce(mount, `Thanks — we'll see you ${day}.`);
        }, true);
      });
    });
  }

  void load();

  // Sign-out on this page is handled by mountAccountPanel's document listener
  // (layout calls hydrateAll). Binding it here as well would double-POST.
}

/** A booking is movable from a sheet only when the server says so, and it is still ahead. */
function canRescheduleNow(m: BookingDetailModel): boolean {
  return isActiveBooking(m) && m.actions.canReschedule;
}

/** "Thursday" on the Malta clock. */
function weekdayOf(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", weekday: "long" }).format(new Date(ms));
  } catch {
    return "";
  }
}

/** The current path, without leaning on a `location` the seam may not have. */
function currentPath(doc: MinimalDocument): string {
  const loc = (doc as unknown as { location?: { pathname?: string } }).location;
  return typeof loc?.pathname === "string" ? loc.pathname : "";
}

/**
 * What to say when the member comes back to the account.
 *
 * `paid=1` is our own Stripe success_url, `paid=cancelled` its cancel_url,
 * `cancelled=1` our own redirect after a cancellation. Anything else is an
 * ordinary visit that must say nothing at all — a page that congratulated
 * everyone on a payment would be worse than silent.
 */
export function paymentReturnNote(search: string): { text: string; tone: "ok" | "bad" } | null {
  const q = String(search || "");
  if (/[?&]paid=1(&|$)/.test(q)) return { text: "Paid. Thank you — nothing more to pay for this visit.", tone: "ok" };
  if (/[?&]paid=cancelled(&|$)/.test(q)) {
    return { text: "Payment cancelled. Nothing has been charged.", tone: "bad" };
  }
  if (/[?&]cancelled=1(&|$)/.test(q)) return { text: "Cancelled. We've emailed you a confirmation.", tone: "ok" };
  return null;
}

function postJson(
  fetchImpl: FetchLike,
  call: ProxyCall,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  return fetchImpl(call.path, {
    method: call.method,
    credentials: "same-origin",
    headers: call.body ? { "content-type": "application/json" } : undefined,
    body: call.body ? JSON.stringify(call.body) : undefined,
  } as never).then(
    (r) => r.json().then(
      (body: unknown) => ({ ok: r.ok, status: r.status, body }),
      () => ({ ok: r.ok, status: r.status, body: null }),
    ),
    () => ({ ok: false, status: 0, body: null }),
  );
}

/** Pause / resume on the membership page. */
function bindMembershipActions(mount: MinimalElement, opts: HydrateOptions): void {
  const fetchImpl = opts.fetchImpl;
  if (!fetchImpl) return;
  const navigate = opts.navigate || (() => {});
  (mount as unknown as Listenable).addEventListener?.("click", (ev: MinimalMouseEvent) => {
    const btn = closestOf(ev.target, "[data-cw-action^='membership-']");
    if (!btn) return;
    const id = btn.getAttribute("data-cw-membership");
    const action = btn.getAttribute("data-cw-action");
    if (!id || !action) return;
    ev.preventDefault?.();
    if (btn.getAttribute("aria-disabled") === "true") return;
    const verb = action === "membership-pause" ? "pause" : "resume";
    const send = () => {
      const done = setBusy(btn, verb === "pause" ? "Pausing…" : "Resuming…");
      void postJson(fetchImpl, membershipCall(id, verb)).then((r) => {
        if (r.ok) {
          navigate("/account/membership");
          return;
        }
        done();
        announce(mount, messageFromError(r.body, r.status, GENERIC_FAILURE), "bad");
      });
    };
    // Resuming gives something back, so it acts on the tap. Pausing takes a
    // paid membership off — the same class of act as cancelling a booking — so
    // it asks first, in the same sheet the cancel flow uses, with the safe
    // choice focused. It used to pause on a single tap.
    if (verb === "resume") return send();
    confirmPause(mount, btn, send);
  });
}

/** The "Pause your membership?" sheet. Keep is primary and takes focus. */
function confirmPause(mount: MinimalElement, opener: LiveEl, onConfirm: () => void): void {
  const host = qs(mount, ".carisma-portal") ?? live(mount);
  if (!host) return onConfirm();
  qsa(host, "dialog.cw-dialog").forEach((d) => {
    d.close?.();
    d.remove?.();
  });
  host.insertAdjacentHTML?.(
    "beforeend",
    dialogFrameHTML({
      kind: "cancel",
      title: "Pause your membership?",
      body:
        `<p class="cw-cx-summary">Your membership stays yours, and you can resume it any time from this page.</p>`,
      foot:
        `<div class="cw-rs-review__actions">` +
        `<button type="button" class="cw-btn cw-btn--primary" data-cw-dialog-close data-cw-pause-keep>Keep my membership</button>` +
        `<button type="button" class="cw-btn cw-btn--secondary" data-cw-pause-confirm>Pause membership</button>` +
        `</div>`,
    }),
  );
  const dlg = qsa(host, "dialog.cw-dialog").pop() ?? null;
  if (!dlg) return onConfirm();
  let confirmed = false;
  dlg.addEventListener?.("click", (ev: LiveEvent) => {
    if (closestOf(ev.target, "[data-cw-pause-confirm]")) {
      confirmed = true;
      dlg.close?.();
      return;
    }
    if (closestOf(ev.target, "[data-cw-dialog-close]")) dlg.close?.();
  });
  dlg.addEventListener?.("close", () => {
    dlg.remove?.();
    if (confirmed) onConfirm();
    else opener.focus?.();
  });
  if (typeof dlg.showModal === "function") dlg.showModal();
  else dlg.setAttribute("open", "");
  qs(dlg, "[data-cw-pause-keep]")?.focus?.();
}

/** Wire everything the account UI needs after hydration. */
export function hydrateAll(doc: MinimalDocument, opts: HydrateOptions = {}): void {
  try {
    injectChrome(doc);
  } catch {
    /* account chrome is optional; never take the host page down */
  }
  hydrateAccountMarks(doc);
  void loadAccountMarkPhoto(doc, opts.fetchImpl, opts.storage);
  installBrandLinkInterceptor(doc, {
    getCookie: () => doc.cookie || "",
    navigate: opts.navigate || (() => {}),
  });
  mountAccountPanel(doc, opts);
}
