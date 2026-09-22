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
import { accountPortalHTML, buildPortalModel, portalShellHTML, type PortalView } from "./portal.js";
import { bodyFor, bookingIdFromPath, requestsFor, titleFor } from "./portalData.js";
import { bookingDetailHTML, buildBookingDetailModel, type BookingDetailModel } from "./bookingDetail.js";
import {
  buildSlotsModel,
  reschedulePickerHTML,
  venueDateString,
  venueLocalToUtcIso,
} from "./reschedule.js";
import {
  cancelCall,
  cancelQuestion,
  cancellationPreviewCall,
  confirmCall,
  membershipCall,
  messageFromError,
  needsPreview,
  payBalanceCall,
  readCancellationPreview,
  rescheduleCall,
  slotsCall,
  type ProxyCall,
} from "./portalActions.js";
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
 *   · home / bookings / details — the original model-driven views.
 *
 * Nothing here decides what a member may do. That arrived with the appointment.
 */
export function mountAccountPortal(
  doc: MinimalDocument,
  opts: HydrateOptions & { view?: PortalView; portalMountId?: string; path?: string } = {},
): void {
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
    if (view !== "booking") mount.innerHTML = accountPortalHTML(buildPortalModel(fallback, view));
    return;
  }

  const read = (url: string): Promise<unknown> =>
    fetchImpl(url, { credentials: "same-origin" }).then(
      (r) => (r.ok ? r.json() : null),
      () => null,
    );

  const sessionP = read("/api/auth/session?include=upcoming");

  void sessionP
    .then((body) => {
      if (body && typeof body === "object" && (body as { signedIn?: boolean }).signedIn === false) {
        navigate(`/member?next=${encodeURIComponent(next)}`);
        return undefined;
      }
      const session = body || fallback;
      const emailMasked = String(
        ((session as Record<string, unknown>).profile as Record<string, unknown> | undefined)?.emailMasked ?? "",
      );

      if (view === "booking" && bookingId) {
        return read(`/api/auth/proxy/client/booking/appointments/${encodeURIComponent(bookingId)}`).then(
          (detail) => {
            const model = buildBookingDetailModel(detail, bookingId);
            mount.innerHTML = bookingDetailHTML(model);
            // Stripe sends the member back here after settling a balance. The
            // page is already showing the new figure; this says the payment
            // landed, so nobody has to infer it from a number that changed.
            const note = paymentReturnNote(
              (doc as unknown as { location?: { search?: string } }).location?.search ?? "",
            );
            if (note) say(mount, note.text, note.tone);
            bindBookingActions(doc, mount, model, opts);
          },
        );
      }

      if (view === "bookings") {
        return Promise.all(requestsFor(view).map(read)).then(([upcoming, past]) => {
          mount.innerHTML = accountPortalHTML(
            buildPortalModel(session, view, { upcomingOverride: upcoming, past }),
          );
        });
      }

      const urls = requestsFor(view);
      if (!urls.length) {
        mount.innerHTML = accountPortalHTML(buildPortalModel(session, view));
        return undefined;
      }
      return Promise.all(urls.map(read)).then((answers) => {
        mount.innerHTML = portalShellHTML({
          view,
          title: titleFor(view, "Your account"),
          emailMasked,
          body: bodyFor(view, answers),
        });
        bindMembershipActions(doc, mount, opts);
      });
    })
    .catch(() => {
      if (view !== "booking") mount.innerHTML = accountPortalHTML(buildPortalModel(fallback, view));
    });

  // Sign-out on this page is handled by mountAccountPanel's document listener
  // (layout calls hydrateAll). Binding it here as well would double-POST.
}

/** The current path, without leaning on a `location` the seam may not have. */
function currentPath(doc: MinimalDocument): string {
  const loc = (doc as unknown as { location?: { pathname?: string } }).location;
  return typeof loc?.pathname === "string" ? loc.pathname : "";
}

/**
 * What to say when Stripe sends the member back.
 *
 * `paid=1` is our own success_url, `paid=cancelled` our own cancel_url, and
 * anything else is an ordinary visit that must say nothing at all — a page
 * that congratulated everyone on a payment would be worse than silent.
 */
export function paymentReturnNote(search: string): { text: string; tone: "ok" | "bad" } | null {
  const q = String(search || "");
  if (/[?&]paid=1(&|$)/.test(q)) return { text: "Payment received — thank you.", tone: "ok" };
  if (/[?&]paid=cancelled(&|$)/.test(q)) {
    return { text: "Payment cancelled. Nothing has been charged.", tone: "bad" };
  }
  return null;
}

/** A banner above the page, for a refusal or a confirmation. */
function say(mount: MinimalElement, text: string, tone: "ok" | "bad"): void {
  const el = (mount as unknown as { querySelector?: (s: string) => MinimalElement | null }).querySelector?.(
    ".carisma-portal__flash",
  );
  const html = `<p class="carisma-portal__flash is-${tone}">${text.replace(/[<>&]/g, "")}</p>`;
  if (el) (el as unknown as { outerHTML: string }).outerHTML = html;
  else mount.innerHTML = html + mount.innerHTML;
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

/**
 * Bind the buttons on one booking.
 *
 * Delegated from the mount, so a re-render replaces the handlers with the
 * markup and a stale listener cannot act on a booking that is no longer shown.
 */
function bindBookingActions(
  doc: MinimalDocument,
  mount: MinimalElement,
  model: BookingDetailModel,
  opts: HydrateOptions,
): void {
  const fetchImpl = opts.fetchImpl;
  if (!fetchImpl) return;
  const navigate = opts.navigate || (() => {});
  const reload = () => navigate(`/account/bookings/${encodeURIComponent(model.id)}`);
  const confirmWith =
    (opts as { confirmImpl?: (q: string) => boolean }).confirmImpl ??
    ((q: string) => {
      const w = (doc as unknown as { defaultView?: { confirm?: (m: string) => boolean } }).defaultView;
      return w?.confirm ? w.confirm(q) : true;
    });

  const onClick = (ev: MinimalMouseEvent) => {
    const target = ev.target as unknown as {
      closest?: (s: string) => (MinimalElement & { getAttribute(n: string): string | null }) | null;
    };
    const btn = target?.closest?.("[data-cw-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-cw-action");
    if (!action) return;
    (ev as unknown as { preventDefault?: () => void }).preventDefault?.();

    if (action === "confirm") {
      void postJson(fetchImpl, confirmCall(model.id)).then((r) =>
        r.ok ? reload() : say(mount, messageFromError(r.body, r.status, "We couldn't confirm that just now."), "bad"),
      );
      return;
    }

    if (action === "cancel") {
      // Free? Ask plainly. Not free — or we do not know — read the server's
      // own preview and put ITS figures in the question. Never our own.
      const ask = (preview: ReturnType<typeof readCancellationPreview> | null) => {
        const question = preview ? cancelQuestion(preview) : "Cancel this booking?";
        if (!confirmWith(question)) return;
        void postJson(fetchImpl, cancelCall(model.id, Boolean(preview && preview.chargeAmount + preview.forfeitAmount > 0))).then(
          (r) =>
            r.ok
              ? navigate("/account/bookings")
              : say(mount, messageFromError(r.body, r.status, "We couldn't cancel that just now."), "bad"),
        );
      };
      if (!needsPreview(model.actions)) {
        ask(null);
        return;
      }
      void postJson(fetchImpl, cancellationPreviewCall(model.id)).then((r) =>
        ask(r.ok ? readCancellationPreview(r.body) : null),
      );
      return;
    }

    if (action === "pay") {
      // This site's own origin, so Stripe returns the member to this booking
      // on this brand. Read from the document rather than hard-coded, because
      // one kit serves five brands and a sixth host (a preview build) must not
      // be able to send anyone to the wrong one.
      const origin =
        (doc as unknown as { location?: { origin?: string } }).location?.origin ?? null;
      void postJson(fetchImpl, payBalanceCall(model.id, origin)).then((r) => {
        const data = (r.body && typeof r.body === "object" ? (r.body as Record<string, unknown>) : {}) as Record<
          string,
          unknown
        >;
        const inner = (data.success === true && data.data ? data.data : data) as Record<string, unknown>;
        const url = typeof inner.checkoutUrl === "string" ? inner.checkoutUrl : "";
        if (r.ok && url) navigate(url);
        else say(mount, messageFromError(r.body, r.status, "We couldn't open the payment page."), "bad");
      });
      return;
    }

    if (action === "rebook") {
      navigate("/");
      return;
    }

    if (action === "reschedule") {
      openReschedule(doc, mount, model, opts);
      return;
    }
  };

  (mount as unknown as { addEventListener?: (t: string, h: (e: MinimalMouseEvent) => void) => void }).addEventListener?.(
    "click",
    onClick,
  );
}

/** Pause / resume on the membership page. */
function bindMembershipActions(doc: MinimalDocument, mount: MinimalElement, opts: HydrateOptions): void {
  const fetchImpl = opts.fetchImpl;
  if (!fetchImpl) return;
  const navigate = opts.navigate || (() => {});
  (mount as unknown as { addEventListener?: (t: string, h: (e: MinimalMouseEvent) => void) => void }).addEventListener?.(
    "click",
    (ev: MinimalMouseEvent) => {
      const target = ev.target as unknown as {
        closest?: (s: string) => (MinimalElement & { getAttribute(n: string): string | null }) | null;
      };
      const btn = target?.closest?.("[data-cw-action^='membership-']");
      if (!btn) return;
      const id = btn.getAttribute("data-cw-membership");
      const action = btn.getAttribute("data-cw-action");
      if (!id || !action) return;
      (ev as unknown as { preventDefault?: () => void }).preventDefault?.();
      const verb = action === "membership-pause" ? "pause" : "resume";
      void postJson(fetchImpl, membershipCall(id, verb)).then((r) =>
        r.ok
          ? navigate("/account/membership")
          : say(mount, messageFromError(r.body, r.status, "We couldn't change that just now."), "bad"),
      );
    },
  );
}

/**
 * The reschedule picker: a day, the free times on it, and one PATCH.
 *
 * Same treatment, same venue — that is all `PATCH /reschedule` can do (it
 * shifts every service line by one delta), so the picker offers nothing else
 * and says so rather than letting a member hunt for a control that is not there.
 */
function openReschedule(
  doc: MinimalDocument,
  mount: MinimalElement,
  model: BookingDetailModel,
  opts: HydrateOptions,
): void {
  const fetchImpl = opts.fetchImpl;
  if (!fetchImpl) return;
  const navigate = opts.navigate || (() => {});
  if (!model.brandLocationId) {
    say(mount, "We can't move this booking online. Please call the venue.", "bad");
    return;
  }
  const host = (mount as unknown as { querySelector?: (s: string) => MinimalElement | null }).querySelector?.(
    ".carisma-portal__actions",
  );
  const paintInto = host ?? mount;
  const minDate = venueDateString(new Date(), "Europe/Malta");

  const load = (date: string) => {
    void fetchImpl(
      slotsCall({
        brandLocationId: model.brandLocationId as string,
        date,
        serviceId: model.serviceId,
        durationMins: model.durationMins,
      }).path,
      { credentials: "same-origin" },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const slots = buildSlotsModel(body, date);
        const box = (paintInto as unknown as { querySelector?: (s: string) => MinimalElement | null }).querySelector?.(
          ".carisma-reschedule",
        );
        const html = reschedulePickerHTML(slots, { minDate });
        if (box) (box as unknown as { outerHTML: string }).outerHTML = html;
        else paintInto.innerHTML = paintInto.innerHTML + html;

        const root = (paintInto as unknown as { querySelector?: (s: string) => MinimalElement | null }).querySelector?.(
          ".carisma-reschedule",
        );
        if (!root) return;
        (root as unknown as { addEventListener?: (t: string, h: (e: MinimalMouseEvent) => void) => void }).addEventListener?.(
          "click",
          (ev: MinimalMouseEvent) => {
            const t = ev.target as unknown as {
              closest?: (s: string) => (MinimalElement & { getAttribute(n: string): string | null }) | null;
            };
            const jump = t?.closest?.("[data-cw-date]");
            if (jump) {
              (ev as unknown as { preventDefault?: () => void }).preventDefault?.();
              load(jump.getAttribute("data-cw-date") || date);
              return;
            }
            const slot = t?.closest?.("[data-cw-slot]");
            if (!slot) return;
            (ev as unknown as { preventDefault?: () => void }).preventDefault?.();
            const time = slot.getAttribute("data-cw-slot") || "";
            // The venue's wall clock becomes a UTC instant HERE, using the
            // zone the SERVER named — not the handset's.
            const startTime = venueLocalToUtcIso(slots.date, time, slots.timeZone);
            if (!startTime) return;
            void postJson(fetchImpl, rescheduleCall(model.id, startTime)).then((r) =>
              r.ok
                ? navigate(`/account/bookings/${encodeURIComponent(model.id)}`)
                : say(mount, messageFromError(r.body, r.status, "We couldn't move it to that time."), "bad"),
            );
          },
        );
        const dayInput = (root as unknown as { querySelector?: (s: string) => MinimalElement | null }).querySelector?.(
          "[data-cw-reschedule-date]",
        );
        (dayInput as unknown as { addEventListener?: (t: string, h: () => void) => void } | null)?.addEventListener?.(
          "change",
          () => {
            const v = (dayInput as unknown as { value?: string }).value || date;
            load(v);
          },
        );
      });
  };

  load(minDate);
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
