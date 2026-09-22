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
import { accountPortalHTML, buildPortalModel, errorBlockHTML, greetingFor, portalShellHTML, skeletonHTML, PORTAL_QC, } from "./portal.js";
import { bodyFor, bookingIdFromPath, ledeFor, requestsFor, subjectFor, titleFor } from "./portalData.js";
import { buildWalletModel } from "./records.js";
import { unwrapEnvelope } from "./appointments.js";
import { bookingDetailHTML, buildBookingDetailModel } from "./bookingDetail.js";
import { buildSlotsModel, reschedulePickerHTML, venueDateString, venueLocalToUtcIso, } from "./reschedule.js";
import { cancelCall, cancelQuestion, cancellationPreviewCall, confirmCall, membershipCall, messageFromError, needsPreview, payBalanceCall, readCancellationPreview, rescheduleCall, slotsCall, } from "./portalActions.js";
import { installBrandLinkInterceptor } from "./linkInterceptor.js";
import { ACCOUNT_CHROME_CSS, ACCOUNT_CHROME_STYLE_ID } from "./chromeCss.js";
/**
 * The member's photo URL for this tab, once known. Module state on purpose: a host's
 * header re-applies hydrateAccountMark on every re-render (a React re-commit of the
 * server glyph, a StrictMode remount), and a photo held only in the DOM would be wiped
 * back to initials each time. Read here, it survives every re-apply. Cleared when
 * the session read says signed out.
 */
let currentAvatarUrl = null;
const panelBound = new WeakSet();
/** The photo the marks are currently painted with (exported for tests/hosts). */
export function accountMarkPhotoUrl() {
    return currentAvatarUrl;
}
/** Upgrade one guest chip to its signed-in appearance from the host cookie. */
export function hydrateAccountMark(el, cookie) {
    const st = accountMarkState(cookie);
    // Signed out is a legitimate final state — the guest glyph the server already
    // rendered. Nothing changes, so there is no re-render and no flash (4.1 / W-1).
    if (!st.signedIn)
        return;
    el.setAttribute("data-cw-session", "in");
    el.setAttribute("aria-label", st.ariaLabel);
    el.setAttribute("href", st.href);
    el.setAttribute("aria-haspopup", "dialog");
    if (!el.getAttribute("aria-expanded"))
        el.setAttribute("aria-expanded", "false");
    if (st.initials)
        el.setAttribute("data-cw-initials", st.initials);
    el.innerHTML = accountMarkSignedInHTML(st.initials, currentAvatarUrl);
}
/** Hydrate every account mark in the document from the current cookie. */
export function hydrateAccountMarks(doc) {
    const cookie = doc.cookie || "";
    const marks = doc.querySelectorAll(`[${ACCOUNT_MARK_ATTR}]`);
    for (let i = 0; i < marks.length; i++)
        hydrateAccountMark(marks[i], cookie);
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
export function loadAccountMarkPhoto(doc, fetchImpl, storage) {
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
    if (!fetchImpl)
        return Promise.resolve();
    return fetchImpl("/api/auth/session", { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
        const url = avatarUrlFromSession(body);
        currentAvatarUrl = url;
        writeCachedAvatar(storage, url);
        if (url)
            hydrateAccountMarks(doc);
    })
        .catch(() => {
        /* W-9: a failed read is a mark without a photo, never a sign-out */
    });
}
function readCachedAvatar(storage) {
    if (!storage)
        return null;
    try {
        const raw = storage.getItem(AVATAR_CACHE_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        const at = typeof parsed.at === "number" ? parsed.at : 0;
        if (Date.now() - at > AVATAR_CACHE_TTL_MS) {
            storage.removeItem(AVATAR_CACHE_KEY);
            return null;
        }
        return sanitizeAvatarUrl(parsed.url);
    }
    catch {
        return null;
    }
}
function writeCachedAvatar(storage, url) {
    if (!storage)
        return;
    try {
        storage.setItem(AVATAR_CACHE_KEY, JSON.stringify({ url, at: Date.now() }));
    }
    catch {
        /* private mode, blocked storage: the photo is simply re-read next page */
    }
}
const BACKDROP_ID = "carisma-account-backdrop";
function cookieFallbackSession(cookie) {
    return {
        signedIn: true,
        initials: readInitialsHint(cookie),
        profile: {},
        upcoming: [],
    };
}
function setOpen(doc, mountId, open) {
    const mount = doc.getElementById(mountId);
    const backdrop = doc.getElementById(BACKDROP_ID);
    if (open) {
        mount?.removeAttribute?.("hidden");
        backdrop?.removeAttribute?.("hidden");
    }
    else {
        mount?.setAttribute("hidden", "");
        backdrop?.setAttribute("hidden", "");
    }
    const marks = doc.querySelectorAll(`[${ACCOUNT_MARK_ATTR}]`);
    for (let i = 0; i < marks.length; i++) {
        marks[i].setAttribute("aria-expanded", open ? "true" : "false");
    }
}
function injectChrome(doc) {
    if (doc.getElementById(ACCOUNT_CHROME_STYLE_ID))
        return;
    const parent = doc.head || doc.body;
    const createElement = bindCreateElement(doc);
    if (!createElement || !parent)
        return;
    const style = createElement("style");
    style.setAttribute("id", ACCOUNT_CHROME_STYLE_ID);
    style.innerHTML = ACCOUNT_CHROME_CSS;
    parent.appendChild(style);
}
function ensureMounts(doc, mountId) {
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
function bindCreateElement(doc) {
    const fn = doc.createElement;
    if (typeof fn !== "function")
        return null;
    return fn.bind(doc);
}
function postLogout(fetchImpl, everywhere, navigate, storage) {
    try {
        storage?.removeItem(AVATAR_CACHE_KEY);
    }
    catch {
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
function matches(el, attr) {
    if (!el)
        return false;
    if (el.getAttribute(attr) !== null)
        return true;
    const hit = el.closest ? el.closest(`[${attr}]`) : null;
    return Boolean(hit);
}
/**
 * Mount the panel: on a click of a signed-in mark, make the ONE authenticated read
 * and open the dialog. A failed read still opens the panel with Sign out (the CEO
 * must be able to leave) — it never signs anyone out by itself (W-9).
 */
export function mountAccountPanel(doc, opts = {}) {
    if (panelBound.has(doc))
        return;
    panelBound.add(doc);
    const mountId = opts.panelMountId || "carisma-account-panel";
    try {
        injectChrome(doc);
        ensureMounts(doc, mountId);
    }
    catch {
        /* panel chrome is optional; a throw here used to white-screen the host page */
    }
    const navigate = opts.navigate || (() => { });
    const fetchImpl = opts.fetchImpl;
    const close = () => setOpen(doc, mountId, false);
    const openPanel = (body) => {
        const mount = ensureMounts(doc, mountId);
        if (!mount)
            return;
        mount.innerHTML = accountPanelHTML(buildPanelModel(body));
        setOpen(doc, mountId, true);
    };
    doc.addEventListener("click", (e) => {
        const t = e.target;
        if (matches(t, "data-carisma-panel-close") || matches(t, "data-carisma-panel-backdrop") || t?.getAttribute("id") === BACKDROP_ID) {
            e.preventDefault();
            close();
            return;
        }
        if (matches(t, "data-carisma-signout-all")) {
            e.preventDefault();
            if (fetchImpl)
                postLogout(fetchImpl, true, navigate, opts.storage);
            return;
        }
        if (matches(t, "data-carisma-signout")) {
            e.preventDefault();
            if (fetchImpl)
                postLogout(fetchImpl, false, navigate, opts.storage);
            return;
        }
        const mark = t && typeof t.closest === "function" ? t.closest(`[${ACCOUNT_MARK_ATTR}]`) : null;
        if (!mark || mark.getAttribute("data-cw-session") !== "in")
            return;
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
    doc.addEventListener("keydown", (e) => {
        if (e.key === "Escape")
            close();
    }, false);
}
/**
 * Classify one answer. A 2xx whose list is empty is `empty`; anything not
 * 2xx — or no answer at all (status 0) — is `failed`. The two never merge.
 */
export function classifyRead(ok, status, body) {
    if (!ok)
        return { state: "failed", status, body: null };
    const inner = unwrapEnvelope(body);
    let empty = false;
    if (Array.isArray(inner))
        empty = inner.length === 0;
    else if (inner && typeof inner === "object") {
        const data = inner.data;
        empty = Array.isArray(data) && data.length === 0;
    }
    else if (inner === null || inner === undefined)
        empty = true;
    return { state: empty ? "empty" : "ok", status, body };
}
/** The brand a host serves, for the cross-brand label on a card. "" when unknown. */
export function siteBrandFromHost(host) {
    const h = String(host || "").toLowerCase();
    if (h.includes("aesthetics"))
        return "Carisma Aesthetics";
    if (h.includes("slimming"))
        return "Carisma Slimming";
    if (h.includes("hairclinic") || h.includes("hair-clinic"))
        return "Carisma Hair Clinic";
    if (h.includes("pulse"))
        return "Pulse";
    if (h.includes("carismaspa") || h.includes("spa."))
        return "Carisma Spa";
    return "";
}
function qs(el, sel) {
    return el?.querySelector?.(sel) ?? null;
}
const portalListBound = new WeakSet();
const portalMembershipBound = new WeakSet();
const portalDetailBound = new WeakSet();
/** Write a toast into the shell's persistent status region. */
function announce(mount, text, tone = "ok") {
    const region = qs(mount, ".cw-status");
    if (!region)
        return;
    region.innerHTML = `<p class="cw-toast cw-toast--${tone}">${text.replace(/[<>&]/g, "")}</p>`;
    const clear = () => {
        if (region.innerHTML.includes(text.replace(/[<>&]/g, "")))
            region.innerHTML = "";
    };
    try {
        setTimeout(clear, 7000);
    }
    catch {
        /* no timers (a test host): the toast simply stays */
    }
}
/** A button mid-request: disabled to a second tap, saying what it is doing. */
function setBusy(btn, label) {
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
function revealCurrentTab(mount) {
    const navEl = qs(mount, ".cw-nav");
    const cur = qs(mount, '.cw-nav [aria-current="page"]');
    if (!navEl || !cur?.getBoundingClientRect || !navEl.getBoundingClientRect)
        return;
    if ((navEl.scrollWidth ?? 0) <= (navEl.clientWidth ?? 0))
        return;
    // Relative to the row itself, so it holds whatever the tab's offsetParent is.
    const delta = cur.getBoundingClientRect().left - navEl.getBoundingClientRect().left - 16;
    navEl.scrollLeft = Math.max(0, (navEl.scrollLeft ?? 0) + delta);
}
export function mountAccountPortal(doc, opts = {}) {
    try {
        injectChrome(doc);
    }
    catch {
        /* portal chrome is optional */
    }
    const mountId = opts.portalMountId || "carisma-account-portal";
    const mount = doc.getElementById(mountId);
    const navigate = opts.navigate || (() => { });
    const path = opts.path || currentPath(doc);
    const bookingId = bookingIdFromPath(path);
    const view = bookingId ? "booking" : opts.view || "home";
    const next = view === "home" ? "/account" : bookingId ? path : `/account/${view}`;
    const loc = doc.location;
    const siteBrand = opts.siteBrand ?? siteBrandFromHost(loc?.host ?? "");
    const extras = { siteBrand, bookHref: opts.bookHref, contactPhone: opts.contactPhone };
    if (!readSignedInHint(doc.cookie || "")) {
        navigate(`/member?next=${encodeURIComponent(next)}`);
        return;
    }
    if (!mount)
        return;
    const fetchImpl = opts.fetchImpl;
    const fallback = cookieFallbackSession(doc.cookie || "");
    if (!fetchImpl) {
        // No fetch seam (a server render, a test host): paint what the cookie
        // knows rather than an empty page. Never the booking view — one booking
        // is entirely server data, and a shell with no booking in it would read
        // as "this booking is gone".
        if (view !== "booking")
            mount.innerHTML = accountPortalHTML(buildPortalModel(fallback, view, extras));
        return;
    }
    const readT = (url) => fetchImpl(url, { credentials: "same-origin" }).then((r) => r.ok
        ? r.json().then((body) => classifyRead(true, r.status, body), () => classifyRead(false, r.status, null))
        : classifyRead(false, r.status, null), () => classifyRead(false, 0, null));
    const signIn = () => navigate(`/member?next=${encodeURIComponent(next)}`);
    /** Cards on screen, so a toast can name the day without another read. */
    let onScreen = [];
    const paint = (html) => {
        mount.innerHTML = html;
        revealCurrentTab(mount);
    };
    const skeleton = () => {
        if (view === "booking") {
            paint(`<main class="carisma-portal" data-cw-qc="${PORTAL_QC}" aria-busy="true">` +
                `<div class="cw-body">${skeletonHTML("booking")}</div></main>`);
            return;
        }
        paint(portalShellHTML({
            view,
            title: view === "home" ? greetingFor() : titleFor(view, "Your account"),
            emailMasked: "",
            body: skeletonHTML(view),
            busy: true,
        }));
    };
    const load = (after) => {
        skeleton();
        return readT("/api/auth/session?include=upcoming")
            .then((sessionRead) => {
            const body = sessionRead.body;
            if (sessionRead.status === 401 || (body && body.signedIn === false)) {
                signIn();
                return undefined;
            }
            const session = (sessionRead.state !== "failed" && body) || fallback;
            const profile = (session.profile ?? {});
            const emailMasked = String(profile.emailMasked ?? "");
            const memberName = String(profile.firstName ?? "") || buildPanelModel(session).name;
            if (view === "booking" && bookingId) {
                return readT(`/api/auth/proxy/client/booking/appointments/${encodeURIComponent(bookingId)}`).then((detail) => {
                    if (detail.status === 401)
                        return signIn();
                    if (detail.state === "failed" && detail.status !== 404) {
                        paint(portalShellHTML({
                            view,
                            title: "Your booking",
                            emailMasked,
                            memberName,
                            body: errorBlockHTML("booking", opts.contactPhone),
                        }));
                        return;
                    }
                    const model = buildBookingDetailModel(detail.body, bookingId);
                    paint(bookingDetailHTML(model));
                    // Stripe sends the member back here after settling a balance. The
                    // page is already showing the new figure; this says the payment
                    // landed, so nobody has to infer it from a number that changed.
                    const note = paymentReturnNote(loc?.search ?? "");
                    if (note)
                        say(mount, note.text, note.tone);
                    if (!portalDetailBound.has(mount)) {
                        portalDetailBound.add(mount);
                        bindBookingActions(doc, mount, model, opts);
                    }
                });
            }
            if (view === "home" || view === "bookings") {
                return Promise.all(requestsFor(view).map(readT)).then((reads) => {
                    if (reads.some((r) => r.status === 401))
                        return signIn();
                    const [up, past, gifts, packs, credit] = reads;
                    const walletReads = [gifts, packs, credit].filter(Boolean);
                    const wallet = view === "home" && walletReads.some((r) => r && r.state !== "failed")
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
                if (reads.some((r) => r.status === 401))
                    return signIn();
                const allFailed = reads.length > 0 && reads.every((r) => r.state === "failed");
                paint(portalShellHTML({
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
                        : `<div class="cw-legacy cw-rise">${bodyFor(view, reads.map((r) => (r.state === "failed" ? null : r.body)))}</div>`,
                }));
                if (!portalMembershipBound.has(mount)) {
                    portalMembershipBound.add(mount);
                    bindMembershipActions(doc, mount, opts);
                }
            });
        })
            .then(() => after?.(), () => {
            if (view !== "booking")
                paint(accountPortalHTML(buildPortalModel(fallback, view, { ...extras, upcomingState: "failed" })));
        });
    };
    // Try again, and the booking buttons on a LIST (Overview, Bookings). Bound
    // once per mount and delegated, so a re-render never stacks listeners. The
    // detail page keeps its own handler (bindBookingActions) untouched.
    if (!portalListBound.has(mount)) {
        portalListBound.add(mount);
        mount.addEventListener?.("click", (ev) => {
            const t = ev.target;
            const retry = t?.closest?.("[data-cw-retry]");
            if (retry) {
                ev.preventDefault?.();
                if (view === "booking")
                    portalDetailBound.delete(mount);
                void load();
                return;
            }
            if (view === "booking")
                return;
            const btn = t?.closest?.("[data-cw-action]");
            if (!btn)
                return;
            const action = btn.getAttribute("data-cw-action");
            const id = btn.getAttribute("data-cw-appt") || "";
            if (!id || (action !== "pay" && action !== "reschedule" && action !== "confirm"))
                return;
            ev.preventDefault?.();
            if (btn.getAttribute("aria-disabled") === "true")
                return;
            const card = onScreen.find((c) => c.id === id);
            if (action === "reschedule") {
                // Wave 2 replaces this with the in-place reschedule sheet.
                navigate(`/account/bookings/${encodeURIComponent(id)}`);
                return;
            }
            if (action === "pay") {
                const done = setBusy(btn, "Opening payment…");
                void postJson(fetchImpl, payBalanceCall(id, loc?.origin ?? null)).then((r) => {
                    const data = (r.body && typeof r.body === "object" ? r.body : {});
                    const inner = (data.success === true && data.data ? data.data : data);
                    const url = typeof inner.checkoutUrl === "string" ? inner.checkoutUrl : "";
                    if (r.ok && url) {
                        navigate(url);
                        return;
                    }
                    done();
                    announce(mount, messageFromError(r.body, r.status, "That didn't go through. Nothing has changed — try again."), "bad");
                });
                return;
            }
            const done = setBusy(btn, "Confirming…");
            void postJson(fetchImpl, confirmCall(id)).then((r) => {
                if (!r.ok) {
                    done();
                    announce(mount, messageFromError(r.body, r.status, "That didn't go through. Nothing has changed — try again."), "bad");
                    return;
                }
                const day = card?.longDay.split(" ")[0] || "soon";
                void load(() => announce(mount, `Thanks — we'll see you ${day}.`));
            });
        });
    }
    void load();
    // Sign-out on this page is handled by mountAccountPanel's document listener
    // (layout calls hydrateAll). Binding it here as well would double-POST.
}
/** The current path, without leaning on a `location` the seam may not have. */
function currentPath(doc) {
    const loc = doc.location;
    return typeof loc?.pathname === "string" ? loc.pathname : "";
}
/**
 * What to say when Stripe sends the member back.
 *
 * `paid=1` is our own success_url, `paid=cancelled` our own cancel_url, and
 * anything else is an ordinary visit that must say nothing at all — a page
 * that congratulated everyone on a payment would be worse than silent.
 */
export function paymentReturnNote(search) {
    const q = String(search || "");
    if (/[?&]paid=1(&|$)/.test(q))
        return { text: "Payment received — thank you.", tone: "ok" };
    if (/[?&]paid=cancelled(&|$)/.test(q)) {
        return { text: "Payment cancelled. Nothing has been charged.", tone: "bad" };
    }
    return null;
}
/** A banner above the page, for a refusal or a confirmation. */
function say(mount, text, tone) {
    const el = mount.querySelector?.(".carisma-portal__flash");
    const html = `<p class="carisma-portal__flash is-${tone}">${text.replace(/[<>&]/g, "")}</p>`;
    if (el)
        el.outerHTML = html;
    else
        mount.innerHTML = html + mount.innerHTML;
}
function postJson(fetchImpl, call) {
    return fetchImpl(call.path, {
        method: call.method,
        credentials: "same-origin",
        headers: call.body ? { "content-type": "application/json" } : undefined,
        body: call.body ? JSON.stringify(call.body) : undefined,
    }).then((r) => r.json().then((body) => ({ ok: r.ok, status: r.status, body }), () => ({ ok: r.ok, status: r.status, body: null })), () => ({ ok: false, status: 0, body: null }));
}
/**
 * Bind the buttons on one booking.
 *
 * Delegated from the mount, so a re-render replaces the handlers with the
 * markup and a stale listener cannot act on a booking that is no longer shown.
 */
function bindBookingActions(doc, mount, model, opts) {
    const fetchImpl = opts.fetchImpl;
    if (!fetchImpl)
        return;
    const navigate = opts.navigate || (() => { });
    const reload = () => navigate(`/account/bookings/${encodeURIComponent(model.id)}`);
    const confirmWith = opts.confirmImpl ??
        ((q) => {
            const w = doc.defaultView;
            return w?.confirm ? w.confirm(q) : true;
        });
    const onClick = (ev) => {
        const target = ev.target;
        const btn = target?.closest?.("[data-cw-action]");
        if (!btn)
            return;
        const action = btn.getAttribute("data-cw-action");
        if (!action)
            return;
        ev.preventDefault?.();
        if (action === "confirm") {
            void postJson(fetchImpl, confirmCall(model.id)).then((r) => r.ok ? reload() : say(mount, messageFromError(r.body, r.status, "We couldn't confirm that just now."), "bad"));
            return;
        }
        if (action === "cancel") {
            // Free? Ask plainly. Not free — or we do not know — read the server's
            // own preview and put ITS figures in the question. Never our own.
            const ask = (preview) => {
                const question = preview ? cancelQuestion(preview) : "Cancel this booking?";
                if (!confirmWith(question))
                    return;
                void postJson(fetchImpl, cancelCall(model.id, Boolean(preview && preview.chargeAmount + preview.forfeitAmount > 0))).then((r) => r.ok
                    ? navigate("/account/bookings")
                    : say(mount, messageFromError(r.body, r.status, "We couldn't cancel that just now."), "bad"));
            };
            if (!needsPreview(model.actions)) {
                ask(null);
                return;
            }
            void postJson(fetchImpl, cancellationPreviewCall(model.id)).then((r) => ask(r.ok ? readCancellationPreview(r.body) : null));
            return;
        }
        if (action === "pay") {
            // This site's own origin, so Stripe returns the member to this booking
            // on this brand. Read from the document rather than hard-coded, because
            // one kit serves five brands and a sixth host (a preview build) must not
            // be able to send anyone to the wrong one.
            const origin = doc.location?.origin ?? null;
            void postJson(fetchImpl, payBalanceCall(model.id, origin)).then((r) => {
                const data = (r.body && typeof r.body === "object" ? r.body : {});
                const inner = (data.success === true && data.data ? data.data : data);
                const url = typeof inner.checkoutUrl === "string" ? inner.checkoutUrl : "";
                if (r.ok && url)
                    navigate(url);
                else
                    say(mount, messageFromError(r.body, r.status, "We couldn't open the payment page."), "bad");
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
    mount.addEventListener?.("click", onClick);
}
/** Pause / resume on the membership page. */
function bindMembershipActions(doc, mount, opts) {
    const fetchImpl = opts.fetchImpl;
    if (!fetchImpl)
        return;
    const navigate = opts.navigate || (() => { });
    mount.addEventListener?.("click", (ev) => {
        const target = ev.target;
        const btn = target?.closest?.("[data-cw-action^='membership-']");
        if (!btn)
            return;
        const id = btn.getAttribute("data-cw-membership");
        const action = btn.getAttribute("data-cw-action");
        if (!id || !action)
            return;
        ev.preventDefault?.();
        const verb = action === "membership-pause" ? "pause" : "resume";
        void postJson(fetchImpl, membershipCall(id, verb)).then((r) => r.ok
            ? navigate("/account/membership")
            : say(mount, messageFromError(r.body, r.status, "We couldn't change that just now."), "bad"));
    });
}
/**
 * The reschedule picker: a day, the free times on it, and one PATCH.
 *
 * Same treatment, same venue — that is all `PATCH /reschedule` can do (it
 * shifts every service line by one delta), so the picker offers nothing else
 * and says so rather than letting a member hunt for a control that is not there.
 */
function openReschedule(doc, mount, model, opts) {
    const fetchImpl = opts.fetchImpl;
    if (!fetchImpl)
        return;
    const navigate = opts.navigate || (() => { });
    if (!model.brandLocationId) {
        say(mount, "We can't move this booking online. Please call the venue.", "bad");
        return;
    }
    const host = mount.querySelector?.(".carisma-portal__actions");
    const paintInto = host ?? mount;
    const minDate = venueDateString(new Date(), "Europe/Malta");
    const load = (date) => {
        void fetchImpl(slotsCall({
            brandLocationId: model.brandLocationId,
            date,
            serviceId: model.serviceId,
            durationMins: model.durationMins,
        }).path, { credentials: "same-origin" })
            .then((r) => (r.ok ? r.json() : null))
            .then((body) => {
            const slots = buildSlotsModel(body, date);
            const box = paintInto.querySelector?.(".carisma-reschedule");
            const html = reschedulePickerHTML(slots, { minDate });
            if (box)
                box.outerHTML = html;
            else
                paintInto.innerHTML = paintInto.innerHTML + html;
            const root = paintInto.querySelector?.(".carisma-reschedule");
            if (!root)
                return;
            root.addEventListener?.("click", (ev) => {
                const t = ev.target;
                const jump = t?.closest?.("[data-cw-date]");
                if (jump) {
                    ev.preventDefault?.();
                    load(jump.getAttribute("data-cw-date") || date);
                    return;
                }
                const slot = t?.closest?.("[data-cw-slot]");
                if (!slot)
                    return;
                ev.preventDefault?.();
                const time = slot.getAttribute("data-cw-slot") || "";
                // The venue's wall clock becomes a UTC instant HERE, using the
                // zone the SERVER named — not the handset's.
                const startTime = venueLocalToUtcIso(slots.date, time, slots.timeZone);
                if (!startTime)
                    return;
                void postJson(fetchImpl, rescheduleCall(model.id, startTime)).then((r) => r.ok
                    ? navigate(`/account/bookings/${encodeURIComponent(model.id)}`)
                    : say(mount, messageFromError(r.body, r.status, "We couldn't move it to that time."), "bad"));
            });
            const dayInput = root.querySelector?.("[data-cw-reschedule-date]");
            dayInput?.addEventListener?.("change", () => {
                const v = dayInput.value || date;
                load(v);
            });
        });
    };
    load(minDate);
}
/** Wire everything the account UI needs after hydration. */
export function hydrateAll(doc, opts = {}) {
    try {
        injectChrome(doc);
    }
    catch {
        /* account chrome is optional; never take the host page down */
    }
    hydrateAccountMarks(doc);
    void loadAccountMarkPhoto(doc, opts.fetchImpl, opts.storage);
    installBrandLinkInterceptor(doc, {
        getCookie: () => doc.cookie || "",
        navigate: opts.navigate || (() => { }),
    });
    mountAccountPanel(doc, opts);
}
//# sourceMappingURL=browser.js.map