import { test } from "node:test";
import assert from "./fixtures/plain-assert.mjs";
import {
  createAccountRoutes,
  seal,
  isAllowed,
  PROXY_ALLOWLIST,
  FORBIDDEN_PATHS,
  readCircle,
  readCircleLeft,
  readCircleState,
  readRejoined,
  leftText,
  REJOIN_NOTE,
  circlePanelLeftHTML,
  circleOverviewLeftHTML,
  circleLeftViewHTML,
  circleViewHTML,
  readLeavePreview,
  leaveSheetBodyHTML,
  leaveSheetFootHTML,
  OFFERS_EMAIL_SENTENCE,
  OFFERS_WHATSAPP_SENTENCE,
  readCirclePrefs,
  offersState,
  offersErrorText,
  offersSavedText,
  circlePrefsHTML,
  buildPanelModel,
  accountPanelHTML,
  mountAccountPortal,
  mountAccountPanel,
  circleOffersCall,
  circleLeaveCall,
  requestsFor,
} from "../dist/index.js";
import { PORTAL_RULES_CSS } from "../dist/ui/styles/index.js";
import { MARIA } from "./fixtures/circle-v2.mjs";

/**
 * Carisma Circle W3 (backend B3b): "Leave Carisma Circle", a member who left,
 * Rejoin, and "Offers and reminders". The rules these tests defend:
 *  - leaving is only ever sent from the sheet's explicit confirm, after the
 *    sheet has shown what is given up and the server's own warning;
 *  - a member who left sees the date and Rejoin, never another Circle figure;
 *  - the two consent sentences are the Bible's, word for word, one box each for
 *    all three brands, never ticked unless the SERVER recorded consent, and an
 *    opt-out always works (a member who left included);
 *  - the proxy grows by exactly five literal doors.
 */

// Maria Borg, live (v2, fixtures/circle-v2.mjs): Level 3 · Ruby, €72.40 · 1,448 points.
// B3b's left answer: the programme names and the date, nothing else. 23:30 UTC on
// 14 Nov is 00:30 on 15 Nov in Malta: the date shown must be Malta's.
const LEFT = {
  tier: "gold",
  enabled: true,
  left: true,
  leftAt: "2026-11-14T23:30:00.000Z",
  programme: { name: "Carisma Circle", currencyName: "Carisma credit", unitName: "points" },
};
const brand = (name, house, email = false, wa = false, extra = {}) => ({
  brandId: `${house}-0000-4000-8000-000000000001`,
  slug: `carisma-${house}`,
  name,
  house,
  offersEmail: email,
  offersWhatsapp: wa,
  offersPush: false,
  canEmail: true,
  canWhatsapp: true,
  ...extra,
});
const PREFS_OFF = { enabled: true, left: false, brands: [brand("Carisma Spa", "spa"), brand("Carisma Aesthetics", "aesthetics"), brand("Carisma Slimming", "slimming")] };
const PREFS_ON = { ...PREFS_OFF, brands: PREFS_OFF.brands.map((b) => ({ ...b, offersEmail: true })) };
const PREFS_MIXED = { ...PREFS_OFF, brands: PREFS_OFF.brands.map((b) => (b.house === "spa" ? { ...b, offersEmail: true } : b)) };
const LEAVE_PREVIEW = {
  enabled: true,
  left: false,
  forfeit: { points: 1240, cents: 6200, display: "€62.00" },
  warning:
    "If you leave Carisma Circle, your €62.00 of Carisma credit (1,240 points) is forfeited and cannot be restored, even if you rejoin. We stop using your purchase history for the programme.",
};
const figure = /€\s?\d|\d[\d,]* points?\b|Golden Hour|Moonlight|ready to use/;

/* ── Readers ───────────────────────────────────────────────────────────── */

test("the member read has three outcomes: live, left, or nothing", () => {
  assert.equal(readCircleState(MARIA).kind, "live");
  assert.equal(readCircleState({ success: true, data: MARIA }).kind, "live");
  const left = readCircleState(LEFT);
  assert.equal(left.kind, "left");
  assert.equal(left.left.leftAt, LEFT.leftAt);
  for (const body of [{ enabled: false }, null, "x", { enabled: true }, { enabled: "true", left: true }, { enabled: false, left: true }]) {
    assert.equal(readCircleState(body), null, JSON.stringify(body));
  }
  // A left answer never builds a live model, even if a figure rode along with it.
  assert.equal(readCircle({ ...MARIA, left: true, leftAt: LEFT.leftAt }), null);
  assert.equal(readCircleLeft(MARIA), null, "NEGATIVE CONTROL: a live member is not 'left'");
  assert.deepEqual(readCircleLeft({ enabled: true, left: true }), { leftAt: "" }, "no date: still left");
});

test("the left line carries Malta's date, and says nothing forfeited comes back", () => {
  assert.equal(leftText({ leftAt: LEFT.leftAt }), "You left Carisma Circle on 15 November 2026");
  assert.equal(leftText({ leftAt: "" }), "You left Carisma Circle");
  assert.match(REJOIN_NOTE, /does not come back/);
  assert.match(REJOIN_NOTE, /start again at the first level/);
  assert.doesNotMatch(REJOIN_NOTE, /First Light/);
});

/* ── A member who left: date + Rejoin, never a figure ──────────────────── */

test("left: the panel row, the Overview card and the page show the date and Rejoin, and no other Circle figure", () => {
  const l = readCircleLeft(LEFT);
  const panel = accountPanelHTML(buildPanelModel({ signedIn: true, profile: { firstName: "Maria" }, upcoming: [], loyalty: LEFT }));
  const ov = circleOverviewLeftHTML(l);
  const page = circleLeftViewHTML({ left: l, prefs: readCirclePrefs(PREFS_OFF) });
  for (const [name, html] of [["panel", panel], ["overview", ov], ["page", page]]) {
    assert.match(html, /You left Carisma Circle on 15 November 2026/, name);
    assert.match(html, /data-cw-circle-rejoin/, name);
    assert.ok(html.includes(REJOIN_NOTE), `${name}: the rejoin sentence sits beside Rejoin`);
    assert.doesNotMatch(html.replace(REJOIN_NOTE, ""), figure, `${name}: no Circle figure`);
  }
  assert.match(panel, /href="\/account\/rewards">Credit &amp; rewards<\/a>/, "the page stays reachable");
  // The page: Offers and reminders stays (an opt-out must always work); no leave control, no shop, no activity.
  assert.match(page, /Offers and reminders/);
  assert.doesNotMatch(page, /data-cw-circle-leave|Spend your credit|Activity|Ways to earn/);
  // Not left: none of it.
  assert.equal(circlePanelLeftHTML(null), "");
  assert.equal(circleOverviewLeftHTML(null), "");
  assert.equal(circleLeftViewHTML(null), "");
  const live = accountPanelHTML(buildPanelModel({ signedIn: true, profile: {}, upcoming: [], loyalty: MARIA }));
  assert.doesNotMatch(live, /You left Carisma Circle/, "NEGATIVE CONTROL: a live member never sees the left row");
});

/* ── Leave Carisma Circle ──────────────────────────────────────────────── */

test("the live page ends with Leave Carisma Circle; the sheet shows the forfeit and the server's warning first", () => {
  const page = circleViewHTML({ me: readCircle(MARIA), activity: null, rewards: null, prefs: readCirclePrefs(PREFS_OFF) });
  assert.match(page, /data-cw-circle="prefs"[\s\S]*data-cw-circle="leave"[\s\S]*<\/div>$/, "offers, then leave, at the very foot");
  assert.match(page, /<button type="button" class="cw-link cw-circle-leave__btn" data-cw-circle-leave>Leave Carisma Circle<\/button>/);

  const p = readLeavePreview({ success: true, data: LEAVE_PREVIEW });
  assert.deepEqual(p, { kind: "preview", points: 1240, cents: 6200, warning: LEAVE_PREVIEW.warning });
  const body = leaveSheetBodyHTML(p, "ready");
  assert.match(body, /You would give up/);
  assert.match(body, /€62\.00/);
  assert.match(body, /1,240 points/);
  assert.ok(body.includes(LEAVE_PREVIEW.warning.replace(/'/g, "&#39;")), "the server's warning, word for word");
  const foot = leaveSheetFootHTML(p);
  assert.match(foot, /class="cw-btn cw-btn--primary" data-cw-dialog-close autofocus>Stay in Carisma Circle</);
  assert.match(foot, /data-cw-circle-leave-commit>Leave and give up €62\.00</);
  // Without a preview there is nothing to confirm: Stay only.
  for (const bad of [null, { enabled: false }, { error: "not_found" }, { enabled: true }, { enabled: true, left: false }]) {
    const pv = readLeavePreview(bad);
    assert.equal(pv, null, JSON.stringify(bad));
    assert.doesNotMatch(leaveSheetFootHTML(pv), /data-cw-circle-leave-commit/);
    assert.match(leaveSheetBodyHTML(pv, "failed"), /Nothing has changed/);
  }
  // A missing warning falls back to the backend's own sentence with the real figures.
  const noWarn = readLeavePreview({ ...LEAVE_PREVIEW, warning: "" });
  assert.match(noWarn.warning, /your €62\.00 of Carisma credit \(1,240 points\) is forfeited and cannot be restored/);
  assert.equal(readLeavePreview(LEFT).kind, "left");
  assert.deepEqual(circleLeaveCall().body, { confirm: true });
});

/* ── Offers and reminders ──────────────────────────────────────────────── */

test("offers: the Bible's two sentences verbatim, one box each, ticked ONLY when the server recorded consent", () => {
  assert.equal(OFFERS_EMAIL_SENTENCE, "Email me offers and reminders from Carisma Spa, Carisma Aesthetics and Carisma Slimming.");
  assert.equal(OFFERS_WHATSAPP_SENTENCE, "Send me offers and reminders on WhatsApp from Carisma Spa, Carisma Aesthetics and Carisma Slimming.");
  const off = circlePrefsHTML(readCirclePrefs(PREFS_OFF));
  assert.equal((off.match(/type="checkbox"/g) || []).length, 2, "two boxes, not six");
  assert.doesNotMatch(off, /\schecked/, "never pre-ticked");
  assert.ok(off.includes(OFFERS_EMAIL_SENTENCE) && off.includes(OFFERS_WHATSAPP_SENTENCE));
  assert.match(off, /No credit is given for ticking these/);
  assert.doesNotMatch(off, /€|points/, "nothing is earned for ticking");
  // A missing flag is never consent.
  const missing = readCirclePrefs({ enabled: true, brands: [{ brandId: "b1", name: "Carisma Spa", house: "spa" }] });
  assert.equal(missing.brands[0].offersEmail, false);
  assert.doesNotMatch(circlePrefsHTML(missing), /\schecked/);
  // All three recorded: ticked.
  const on = circlePrefsHTML(readCirclePrefs(PREFS_ON));
  assert.match(on, /data-cw-circle-pref="email" checked/);
  assert.doesNotMatch(on, /data-cw-circle-pref="whatsapp" checked/);
  // Some brands only: ticked + mixed, naming the brands, so ONE tap opts out of all three.
  const p = readCirclePrefs(PREFS_MIXED);
  assert.deepEqual(offersState(p, "email"), { state: "mixed", onFor: ["Carisma Spa"] });
  const mixed = circlePrefsHTML(p);
  assert.match(mixed, /data-cw-circle-pref="email" checked data-cw-mixed aria-describedby="cw-circle-pref-email-note"/);
  assert.doesNotMatch(mixed, /aria-checked/, "a native checkbox reports mixed through its indeterminate property");
  assert.match(mixed, /On for Carisma Spa only\. Untick to stop all three\./);
  // Off / 404 / garbage: no box. Carisma Medical never listed.
  for (const bad of [{ enabled: false }, null, { error: "not_found" }, { enabled: true, brands: [] }]) assert.equal(readCirclePrefs(bad), null);
  const med = readCirclePrefs({ enabled: true, brands: [...PREFS_OFF.brands, brand("Carisma Medical", "medical")] });
  assert.equal(med.brands.length, 3);
});

test("offers: one PATCH for all three brands (no brandId); refusals in plain words", () => {
  assert.deepEqual(circleOffersCall("email", true), { path: "/api/auth/proxy/client/loyalty/preferences", method: "PATCH", body: { offersEmail: true } });
  assert.deepEqual(circleOffersCall("whatsapp", false).body, { offersWhatsapp: false });
  assert.equal("brandId" in circleOffersCall("email", true).body, false);
  assert.match(offersErrorText("LOYALTY_NO_EMAIL"), /don't have an email address for you yet/);
  assert.match(offersErrorText("LOYALTY_NO_PHONE"), /don't have a mobile number for you yet/);
  assert.match(offersErrorText(""), /nothing has changed/);
  assert.doesNotMatch(offersErrorText("LOYALTY_NO_EMAIL"), /LOYALTY_/);
  assert.equal(offersSavedText(readCirclePrefs(PREFS_ON), "email"), "Saved. You'll get offers and reminders by email.");
  assert.equal(offersSavedText(readCirclePrefs(PREFS_OFF), "whatsapp"), "Saved. No more offers and reminders on WhatsApp.");
});

test("W3 CSS reads tokens only (no raw colour)", () => {
  const css = PORTAL_RULES_CSS.slice(PORTAL_RULES_CSS.indexOf("A member who left (W3)"));
  assert.ok(css.includes(".cw-circle-prefs__box"));
  assert.doesNotMatch(css.slice(0, css.indexOf("Wallet line")), /#[0-9a-f]{3,8}\b|rgba?\(/i);
});

/* ── The browser: the sheet, Rejoin and the boxes, end to end ──────────── */

/** A fake DOM just deep enough for the portal: a mount, a dialog with a body and a foot, a status region, the prefs slot. */
function harness({ me = MARIA, prefs = PREFS_OFF, view = "rewards", leave = LEAVE_PREVIEW, patchAnswer = null, slowLeave = 0 } = {}) {
  const state = { me, prefs };
  const calls = [];
  const handlers = [];
  const toasts = [];
  const navs = [];
  let shown = 0;
  let dialogOpen = false;
  let inserted = false;
  const dlgListeners = { click: [], close: [] };
  const el = (extra = {}) => ({ innerHTML: "", attrs: {}, setAttribute(n, v) { this.attrs[n] = v; }, getAttribute(n) { return this.attrs[n] ?? null; }, removeAttribute(n) { delete this.attrs[n]; }, focus() {}, ...extra });
  const body = el();
  const foot = el();
  const dialog = el({
    addEventListener(t, h) { (dlgListeners[t] ||= []).push(h); },
    showModal() { shown++; dialogOpen = true; },
    close() { if (!dialogOpen) return; dialogOpen = false; for (const h of dlgListeners.close) h({}); },
    remove() { inserted = false; },
    querySelector(sel) { return sel === ".cw-dialog__body" ? body : sel === ".cw-dialog__foot" ? foot : sel === ".cw-btn--primary" ? el() : null; },
    querySelectorAll() { return []; },
  });
  const host = {
    insertAdjacentHTML(_w, html) { inserted = true; body.innerHTML = /cw-dialog__body">([\s\S]*?)<\/div><div class="cw-dialog__foot">/.exec(html)?.[1] ?? ""; foot.innerHTML = /cw-dialog__foot">([\s\S]*?)<\/div><\/dialog>$/.exec(html)?.[1] ?? ""; },
    querySelectorAll(sel) { return sel === "dialog.cw-dialog" && inserted ? [dialog] : []; },
    querySelector() { return null; },
  };
  const status = el();
  Object.defineProperty(status, "innerHTML", { get() { return this._h || ""; }, set(v) { this._h = v; if (v) toasts.push(v); } });
  // Two live checkboxes inside the prefs slot, so "disable while saving" is observable.
  const slotInputs = [el(), el()];
  const prefsSlot = el({ querySelectorAll(sel) { return sel === "input[data-cw-circle-pref]" ? slotInputs : []; }, querySelector() { return el(); } });
  // The mixed box on the painted page, so markMixed (the indeterminate property) is observable.
  const mixedInputs = [];
  const mount = {
    innerHTML: "", setAttribute() {}, getAttribute() { return null; },
    addEventListener(t, h) { if (t === "click") handlers.push(h); },
    querySelector(sel) {
      if (sel === ".carisma-portal") return host;
      if (sel === ".cw-status") return status;
      if (sel === '[data-cw-circle-slot="prefs"]') return mount.innerHTML.includes('data-cw-circle-slot="prefs"') ? prefsSlot : null;
      if (sel === '[data-cw-circle-slot="home"]') {
        const tag = '<div class="cw-circle-slot" data-cw-circle-slot="home" hidden></div>';
        if (!mount.innerHTML.includes(tag)) return null;
        return { get innerHTML() { return ""; }, set innerHTML(v) { mount.innerHTML = mount.innerHTML.replace(tag, `<div class="cw-circle-slot" data-cw-circle-slot="home">${v}</div>`); }, removeAttribute() {} };
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === "dialog.cw-dialog") return inserted ? [dialog] : [];
      if (sel === "input[data-cw-mixed]") {
        const n = (mount.innerHTML.match(/data-cw-mixed/g) || []).length;
        while (mixedInputs.length < n) mixedInputs.push({});
        return mixedInputs.slice(0, n);
      }
      if (sel === "[data-cw-circle-rail]" && /data-cw-circle-rail hidden/.test(mount.innerHTML)) {
        return [{ removeAttribute() { mount.innerHTML = mount.innerHTML.replace("data-cw-circle-rail hidden", "data-cw-circle-rail"); } }];
      }
      return [];
    },
  };
  const doc = {
    cookie: "cw-signed-in=1",
    location: { pathname: `/account/${view === "home" ? "" : view}`, host: "www.carismaspa.com", origin: "https://www.carismaspa.com", search: "" },
    getElementById: (id) => (id === "carisma-account-portal" ? mount : null),
    querySelectorAll: () => [], addEventListener() {},
  };
  const res = (status, data) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) });
  const fetchImpl = (url, init = {}) => {
    const method = init.method || "GET";
    calls.push({ method, url, body: init.body ? JSON.parse(init.body) : undefined });
    if (url.startsWith("/api/auth/session")) return res(200, { signedIn: true, profile: { firstName: "Maria" } });
    if (url === "/api/auth/proxy/client/loyalty/me") return res(200, { success: true, data: state.me });
    if (url === "/api/auth/proxy/client/loyalty/leave" && method === "GET") return typeof leave === "number" ? res(leave, { error: "x" }) : res(200, { success: true, data: leave });
    if (url === "/api/auth/proxy/client/loyalty/leave" && method === "POST") {
      state.me = LEFT;
      const answer = () => res(200, { success: true, data: { enabled: true, left: true, leftAt: LEFT.leftAt, forfeited: LEAVE_PREVIEW.forfeit, alreadyLeft: false } });
      return slowLeave ? new Promise((r) => setTimeout(() => r(answer()), slowLeave)) : answer();
    }
    if (url === "/api/auth/proxy/client/loyalty/rejoin") {
      state.me = MARIA;
      return res(200, { success: true, data: { enabled: true, left: false, rejoined: true, rejoinedAt: "2026-11-15T12:00:00Z" } });
    }
    if (url === "/api/auth/proxy/client/loyalty/preferences" && method === "GET") return res(200, { success: true, data: state.prefs });
    if (url === "/api/auth/proxy/client/loyalty/preferences" && method === "PATCH") {
      if (patchAnswer) return res(patchAnswer.status, patchAnswer.body);
      const b = JSON.parse(init.body);
      const key = "offersEmail" in b ? "offersEmail" : "offersWhatsapp";
      state.prefs = { ...state.prefs, brands: state.prefs.brands.map((x) => ({ ...x, [key]: b[key] })) };
      return res(200, { success: true, data: state.prefs });
    }
    if (url.startsWith("/api/auth/proxy/client/loyalty/")) return res(200, { enabled: true, items: [], nextCursor: null });
    return res(200, { success: true, data: [] });
  };
  /** A click on an element carrying `attr` (and optionally a checkbox state). */
  const target = (attr, value = "", extra = {}) => {
    const t = el({ ...extra });
    t.attrs[attr] = value;
    t.closest = (sel) => {
      if (sel === "dialog.cw-dialog") return extra.inDialog ? dialog : null;
      const m = /^(?:input)?\[([\w-]+)(?:=|\])/.exec(sel);
      return m && m[1] === attr ? t : null;
    };
    return t;
  };
  const click = (t) => handlers.forEach((h) => h({ target: t, preventDefault() {}, stopPropagation() {} }));
  const clickDialog = (t) => dlgListeners.click.forEach((h) => h({ target: t, preventDefault() {} }));
  return { doc, mount, calls, fetchImpl, navs, toasts, body, foot, prefsSlot, slotInputs, mixedInputs, dialog, target, click, clickDialog, shown: () => shown, isOpen: () => dialogOpen, state };
}
const settle = () => new Promise((r) => setTimeout(r, 40));
const mountIt = (h, view = "rewards") =>
  mountAccountPortal(h.doc, { view, fetchImpl: h.fetchImpl, navigate: (u) => h.navs.push(u), circle: true });

test("leave: the first tap only opens the sheet and READS; nothing is sent until the explicit confirm", async () => {
  const h = harness();
  mountIt(h);
  await settle();
  assert.match(h.mount.innerHTML, /Leave Carisma Circle/);
  h.click(h.target("data-cw-circle-leave"));
  await settle();
  assert.equal(h.shown(), 1, "a sheet opened");
  assert.equal(h.calls.filter((c) => c.method !== "GET").length, 0, "no leave was sent on the first tap");
  assert.ok(h.calls.some((c) => c.method === "GET" && c.url === "/api/auth/proxy/client/loyalty/leave"), "the forfeit was read first");
  assert.match(h.body.innerHTML, /€62\.00/);
  assert.match(h.body.innerHTML, /cannot be restored, even if you rejoin/);
  assert.match(h.foot.innerHTML, /Leave and give up €62\.00/);
  // Stay closes, still nothing sent.
  h.clickDialog(h.target("data-cw-dialog-close", "", { inDialog: true }));
  assert.equal(h.isOpen(), false);
  assert.equal(h.calls.filter((c) => c.method !== "GET").length, 0);
});

test("leave: confirm sends {confirm:true} once, then the page shows the date and Rejoin, no figure", async () => {
  const h = harness();
  mountIt(h);
  await settle();
  h.click(h.target("data-cw-circle-leave"));
  await settle();
  h.clickDialog(h.target("data-cw-circle-leave-commit", "", { inDialog: true }));
  h.clickDialog(h.target("data-cw-circle-leave-commit", "", { inDialog: true })); // a double tap
  await settle();
  const posts = h.calls.filter((c) => c.method === "POST");
  assert.deepEqual(posts, [{ method: "POST", url: "/api/auth/proxy/client/loyalty/leave", body: { confirm: true } }]);
  assert.equal(h.isOpen(), false);
  assert.match(h.mount.innerHTML, /You left Carisma Circle on 15 November 2026/);
  assert.match(h.mount.innerHTML, /Offers and reminders/, "the opt-out is still there");
  assert.doesNotMatch(h.mount.innerHTML.replace(REJOIN_NOTE, ""), /€\s?\d|ready to use|Golden Hour/);
  assert.ok(h.toasts.some((t) => /You have left Carisma Circle\./.test(t)));
});

test("leave: a failed or 404 forfeit read offers Stay only (never a blind leave)", async () => {
  for (const leave of [500, 404, { enabled: false }]) {
    const h = harness({ leave });
    mountIt(h);
    await settle();
    h.click(h.target("data-cw-circle-leave"));
    await settle();
    assert.doesNotMatch(h.foot.innerHTML, /data-cw-circle-leave-commit/, JSON.stringify(leave));
    assert.match(h.body.innerHTML, /Nothing has changed/);
    h.clickDialog(h.target("data-cw-circle-leave-commit", "", { inDialog: true }));
    await settle();
    assert.equal(h.calls.filter((c) => c.method === "POST").length, 0, JSON.stringify(leave));
  }
});

test("rejoin: one tap posts rejoin and the page reads the fresh start", async () => {
  const h = harness({ me: LEFT });
  mountIt(h);
  await settle();
  assert.equal(h.navs.length, 0, "a left member keeps the page (it is not 'off')");
  assert.match(h.mount.innerHTML, /You left Carisma Circle on 15 November 2026/);
  h.click(h.target("data-cw-circle-rejoin"));
  await settle();
  assert.deepEqual(h.calls.filter((c) => c.method === "POST").map((c) => [c.url, c.body]), [["/api/auth/proxy/client/loyalty/rejoin", {}]]);
  assert.match(h.mount.innerHTML, /€72\.40/, "the live page again (from the server's read)");
  assert.doesNotMatch(h.mount.innerHTML, /You left Carisma Circle on/);
  assert.equal(readRejoined({ success: true, data: { enabled: true, left: false, rejoined: false } }), true, "not left = nothing to do, still fine");
  assert.equal(readRejoined({ enabled: false }), false);
});

test("Overview: a left member's card is the date + Rejoin; the wallet line never draws", async () => {
  const h = harness({ me: LEFT, view: "home" });
  mountIt(h, "home");
  await settle();
  assert.match(h.mount.innerHTML, /data-cw-circle="overview-left"/);
  assert.match(h.mount.innerHTML, /You left Carisma Circle on 15 November 2026/);
  assert.doesNotMatch(h.mount.innerHTML, /data-cw-circle="wallet"|data-cw-circle="overview"/);
  assert.doesNotMatch(h.mount.innerHTML, /data-cw-circle-rail hidden/, "Credit & rewards stays reachable");
});

test("offers: a tick sends ONE PATCH without brandId and the box redraws from the server's answer", async () => {
  const h = harness();
  mountIt(h);
  await settle();
  assert.match(h.mount.innerHTML, /data-cw-circle-pref="email">/, "unticked to start");
  h.click(h.target("data-cw-circle-pref", "email", { checked: true }));
  await settle();
  const patches = h.calls.filter((c) => c.method === "PATCH");
  assert.deepEqual(patches, [{ method: "PATCH", url: "/api/auth/proxy/client/loyalty/preferences", body: { offersEmail: true } }]);
  assert.match(h.prefsSlot.innerHTML, /data-cw-circle-pref="email" checked/);
  assert.match(h.prefsSlot.innerHTML, /Saved\. You(&#39;|')ll get offers and reminders by email\./);
});

test("offers: LOYALTY_NO_EMAIL / LOYALTY_NO_PHONE come back in plain words and the box stays unticked", async () => {
  for (const [code, channel, words] of [["LOYALTY_NO_EMAIL", "email", /an email address/], ["LOYALTY_NO_PHONE", "whatsapp", /a mobile number/]]) {
    const h = harness({ patchAnswer: { status: 400, body: { success: false, message: "x", code } } });
    mountIt(h);
    await settle();
    h.click(h.target("data-cw-circle-pref", channel, { checked: true }));
    await settle();
    assert.match(h.prefsSlot.innerHTML, words, code);
    assert.doesNotMatch(h.prefsSlot.innerHTML, new RegExp(`data-cw-circle-pref="${channel}" checked`), `${code}: never shown as consent`);
    assert.doesNotMatch(h.prefsSlot.innerHTML, /LOYALTY_/);
  }
});

test("offers: a member who LEFT can still opt out", async () => {
  const h = harness({ me: LEFT, prefs: { ...PREFS_ON, left: true } });
  mountIt(h);
  await settle();
  assert.match(h.mount.innerHTML, /data-cw-circle-pref="email" checked/);
  h.click(h.target("data-cw-circle-pref", "email", { checked: false }));
  await settle();
  assert.deepEqual(h.calls.filter((c) => c.method === "PATCH").map((c) => c.body), [{ offersEmail: false }]);
  assert.match(h.prefsSlot.innerHTML, /Saved\. No more offers and reminders by email\./);
  assert.doesNotMatch(h.prefsSlot.innerHTML, /data-cw-circle-pref="email" checked/);
});

test("NEGATIVE CONTROL: Circle off = no leave, no offers box, no extra request beyond the page's five", async () => {
  const h = harness({ me: { enabled: false } });
  mountIt(h);
  await settle();
  assert.deepEqual(h.navs, ["/account"]);
  assert.doesNotMatch(h.mount.innerHTML, /Offers and reminders|Leave Carisma Circle/);
  // The page's own five reads (me, activity, rewards, preferences, v2 perks) and not one more.
  assert.equal(h.calls.filter((c) => c.url.includes("/loyalty/")).length, 5);
  assert.equal(h.calls.filter((c) => c.method !== "GET").length, 0);
});

test("leave: closing the sheet while the leave is in flight cannot stop it, and the page still follows the server", async () => {
  const h = harness({ slowLeave: 30 });
  mountIt(h);
  await settle();
  h.click(h.target("data-cw-circle-leave"));
  await settle();
  h.clickDialog(h.target("data-cw-circle-leave-commit", "", { inDialog: true }));
  assert.match(h.foot.innerHTML, /aria-disabled="true">Stay in Carisma Circle/, "Stay is inert while leaving");
  h.clickDialog(h.target("data-cw-dialog-close", "", { inDialog: true })); // "Stay" mid-flight: ignored
  assert.equal(h.isOpen(), true);
  h.dialog.close(); // Escape / the backdrop: the sheet goes, the leave does not
  assert.equal(h.isOpen(), false);
  await new Promise((r) => setTimeout(r, 90));
  assert.equal(h.calls.filter((c) => c.method === "POST").length, 1);
  assert.match(h.mount.innerHTML, /You left Carisma Circle on 15 November 2026/, "the page shows what the server did");
  assert.doesNotMatch(h.mount.innerHTML.replace(REJOIN_NOTE, ""), /€\s?\d/);
  assert.ok(h.toasts.some((t) => /You have left Carisma Circle\./.test(t)));
});

test("offers: a box on for some brands only is set indeterminate, and ONE untick opts out of all three", async () => {
  const h = harness({ prefs: PREFS_MIXED });
  mountIt(h);
  await settle();
  assert.equal(h.mixedInputs.length, 1);
  assert.equal(h.mixedInputs[0].indeterminate, true, "markMixed ran on the painted page");
  h.click(h.target("data-cw-circle-pref", "email", { checked: false })); // the browser unticks a ticked+mixed box
  assert.ok(h.slotInputs.every((i) => "disabled" in i.attrs), "both boxes are disabled while the save is in flight");
  await settle();
  assert.deepEqual(h.calls.filter((c) => c.method === "PATCH").map((c) => c.body), [{ offersEmail: false }]);
  assert.doesNotMatch(h.prefsSlot.innerHTML, /data-cw-circle-pref="email" checked|data-cw-mixed/);
});

test("panel: a left member rejoins from the header row, then lands on Credit & rewards", async () => {
  const posts = [];
  const navs = [];
  const clicks = [];
  const docClick = (e) => clicks.forEach((h) => h(e));
  const panelMount = { innerHTML: "", setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, querySelector() { return null; } };
  const doc = {
    cookie: "cw-signed-in=1",
    location: { pathname: "/", host: "www.carismaspa.com" },
    getElementById: (id) => (id === "carisma-account-panel" ? panelMount : null),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ setAttribute() {}, appendChild() {} }),
    head: { appendChild() {} }, body: { appendChild() {} },
    // v2: a Circle site binds a second document click (the Instagram award); every handler sees the click.
    addEventListener(t, h) { if (t === "click") clicks.push(h); },
  };
  const fetchImpl = (url, init = {}) => {
    posts.push([init.method || "GET", url]);
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, data: { enabled: true, left: false, rejoined: true } }) });
  };
  mountAccountPanel(doc, { fetchImpl, navigate: (u) => navs.push(u), circle: true });
  const btn = { attrs: { "data-cw-circle-rejoin": "" }, innerHTML: "Rejoin", getAttribute(n) { return this.attrs[n] ?? null; }, setAttribute(n, v) { this.attrs[n] = v; }, removeAttribute(n) { delete this.attrs[n]; }, closest(sel) { return sel === "[data-cw-circle-rejoin]" ? this : null; } };
  docClick({ target: btn, preventDefault() {} });
  await settle();
  assert.deepEqual(posts, [["POST", "/api/auth/proxy/client/loyalty/rejoin"]]);
  assert.deepEqual(navs, ["/account/rewards"]);
});

/* ── The proxy: exactly five new literal doors ─────────────────────────── */

test("proxy: the five W3 doors are exact literals; siblings, the till and placement stay refused", () => {
  const allowed = [
    ["GET", "/client/loyalty/leave"],
    ["POST", "/client/loyalty/leave"],
    ["POST", "/client/loyalty/rejoin"],
    ["GET", "/client/loyalty/preferences"],
    ["PATCH", "/client/loyalty/preferences"],
  ];
  for (const [m, p] of allowed) assert.equal(isAllowed(m, p), true, `${m} ${p}`);
  const refused = [
    ["DELETE", "/client/loyalty/leave"],
    ["PATCH", "/client/loyalty/leave"],
    ["POST", "/client/loyalty/leave/abc"],
    ["GET", "/client/loyalty/rejoin"],
    ["POST", "/client/loyalty/rejoin/abc"],
    ["PUT", "/client/loyalty/preferences"],
    ["POST", "/client/loyalty/preferences"],
    ["DELETE", "/client/loyalty/preferences"],
    ["PATCH", "/client/loyalty/preferences/abc"],
    ["GET", "/client/loyalty/preferences/abc"],
    // POST /client/loyalty/earn/preview is a member door since the v2 WEB fix (the pay step's earn line at her
    // own level, a read): the PUBLIC earn twin below still never goes through the member proxy.
    ["GET", "/public/loyalty/earn"],
    ["GET", "/hod/appointments/abc/checkout/loyalty-reward"],
    ["POST", "/hod/appointments/abc/checkout/loyalty-reward"],
    ["POST", "/hod/settings/loyalty/launch-placement/preview"],
    ["PATCH", "/client/marketing/preferences"],
  ];
  for (const [m, p] of refused) assert.equal(isAllowed(m, p), false, `${m} ${p}`);
  for (const f of FORBIDDEN_PATHS) assert.equal(isAllowed(f.method, f.path), false, `${f.method} ${f.path}`);
  // Loyalty doors in all: /me, W1's five, W3's five, W4's six (test/circle-w4.test.mjs), v2's five
  // (test/circle-ways.test.mjs) + the member earn preview (the WEB fix). Never anything wider.
  const loyaltyRules = PROXY_ALLOWLIST.filter((r) => /loyalty|Carisma Circle/i.test(r.label));
  assert.equal(loyaltyRules.length, 23, loyaltyRules.map((r) => `${r.method} ${r.label}`).join(", "));
});

const RP = "carisma-spa";
const SECRET = "primary-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const NOW_S = 1_700_000_000;
const cookie = () => seal({ v: 1, sid: "s", uid: "u", at: "ACCESS", atExp: NOW_S + 99999, rt: "R", initials: "MB", iat: NOW_S }, SECRET, RP);
function routes(fetchImpl) {
  return createAccountRoutes({
    rpId: RP, clientId: RP, clientSecret: "cs", identityOrigin: "http://account.localtest.me:3000",
    carismasoftApiUrl: "http://backend.local/api/v1", sessionSecret: SECRET,
    allowedOrigins: ["http://localhost:3100"], cookieSecure: false, fetchImpl, now: () => NOW_S * 1000,
  });
}

test("proxy: the consent PATCH carries the member's own browser to the backend's proof; other calls do not", async () => {
  const seen = [];
  const r = routes(async (url, init) => {
    seen.push({ url, method: init.method, ua: init.headers["user-agent"] ?? null, body: init.body });
    return new Response(JSON.stringify({ success: true, data: PREFS_ON }), { status: 200, headers: { "content-type": "application/json" } });
  });
  const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)";
  const patch = await r.proxy(new Request("http://localhost:3100/api/auth/proxy/client/loyalty/preferences", {
    method: "PATCH",
    headers: { cookie: `cw_session=${cookie()}`, origin: "http://localhost:3100", "content-type": "application/json", "user-agent": ua },
    body: JSON.stringify({ offersEmail: true }),
  }));
  assert.equal(patch.status, 200);
  await r.proxy(new Request("http://localhost:3100/api/auth/proxy/client/loyalty/me", { headers: { cookie: `cw_session=${cookie()}`, "user-agent": ua } }));
  await r.proxy(new Request("http://localhost:3100/api/auth/proxy/client/loyalty/leave", {
    method: "POST",
    headers: { cookie: `cw_session=${cookie()}`, origin: "http://localhost:3100", "content-type": "application/json", "user-agent": ua },
    body: JSON.stringify({ confirm: true }),
  }));
  assert.deepEqual(seen.map((s) => [s.method, s.url.replace("http://backend.local/api/v1", ""), s.ua]), [
    ["PATCH", "/client/loyalty/preferences", ua],
    ["GET", "/client/loyalty/me", null],
    ["POST", "/client/loyalty/leave", null],
  ]);
  assert.equal(seen[0].body, JSON.stringify({ offersEmail: true }));
});

test("proxy: a leave or a consent change from another origin is refused 403 and never reaches the backend", async () => {
  let called = 0;
  const r = routes(async () => { called++; return new Response("{}", { status: 200 }); });
  for (const [method, path, body] of [["POST", "/client/loyalty/leave", { confirm: true }], ["PATCH", "/client/loyalty/preferences", { offersEmail: true }], ["POST", "/client/loyalty/rejoin", {}]]) {
    const res = await r.proxy(new Request(`http://localhost:3100/api/auth/proxy${path}`, {
      method,
      headers: { cookie: `cw_session=${cookie()}`, origin: "http://evil.example", "content-type": "application/json" },
      body: JSON.stringify(body),
    }));
    assert.equal(res.status, 403, `${method} ${path}`);
  }
  assert.equal(called, 0);
});
