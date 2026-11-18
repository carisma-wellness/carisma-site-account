import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAccountRoutes,
  seal,
  isAllowed,
  PROXY_ALLOWLIST,
  FORBIDDEN_PATHS,
  readCircle,
  circleViewHTML,
  readCircleComfort,
  readCircleBirthday,
  readCircleWhatsapp,
  comfortHTML,
  birthdayHTML,
  whatsappUpdatesHTML,
  circleDetailsHTML,
  profileErrorText,
  profileMissingText,
  offersErrorText,
  WHATSAPP_UPDATES_SENTENCE,
  OFFERS_EMAIL_SENTENCE,
  OFFERS_WHATSAPP_SENTENCE,
  readCirclePrefs,
  circleBirthdayCall,
  circleComfortCall,
  mountAccountPortal,
  accountPortalHTML,
  buildPortalModel,
  CIRCLE_QC,
  ACCOUNT_DETAILS_HREF,
} from "../dist/index.js";
import { MARIA as MARIA_V2, THREE_BRANDS } from "./fixtures/circle-v2.mjs";
import { PORTAL_RULES_CSS } from "../dist/ui/styles/index.js";

/**
 * Carisma Circle W4 (backend B4): the member's own Circle profile in Details —
 * room comfort (fixed choices), birthday (day + month, never the year) and
 * WhatsApp booking updates (a SERVICE opt-in, never marketing, never beside
 * "Offers and reminders") — and what "Complete your profile" still needs.
 * Nothing renders until the B4 routes answer live; the proxy grows by six literals.
 */

const CHOICES = {
  pressure: [{ value: "light", label: "Light" }, { value: "medium", label: "Medium" }, { value: "firm", label: "Firm" }],
  oils: [{ value: "unscented", label: "Unscented" }, { value: "aromatic", label: "Aromatic" }, { value: "no_oil", label: "No oil" }],
  music: [{ value: "calm", label: "Calm" }, { value: "nature", label: "Nature sounds" }, { value: "silence", label: "Silence" }],
  roomTemperature: [{ value: "cooler", label: "Cooler" }, { value: "standard", label: "Standard" }, { value: "warmer", label: "Warmer" }],
};
const PROFILE = { done: false, missing: ["birthday", "comfort"] };
const COMFORT = { enabled: true, left: false, comfort: { pressure: "medium", oils: null, music: null, roomTemperature: null }, choices: CHOICES, profile: PROFILE };
const BDAY_EMPTY = { enabled: true, left: false, birthday: null, setAt: null, lockedUntil: null, editable: true, prefill: { day: 15, month: 3 }, profile: PROFILE };
const BDAY_LOCKED = { enabled: true, left: false, birthday: { day: 15, month: 3 }, setAt: "2026-11-15T10:00:00Z", lockedUntil: "2027-11-15", editable: false, prefill: null, profile: PROFILE };
const WA = { enabled: true, left: false, optedIn: false, changedAt: null, hasPhone: true, phoneLast4: "4821", wording: WHATSAPP_UPDATES_SENTENCE, wordingVersion: "circle-wa-service-2026-11-15" };
const LEFT_ONLY = { enabled: true, left: true };
// Maria Borg, live (v2, fixtures/circle-v2.mjs). v2 retired "Complete your profile" (BRIEF §2): its rows are the API's.
const MARIA = MARIA_V2;

/* ── Readers: nothing unless live ──────────────────────────────────────── */

test("B4 readers: off / 404 / garbage / a member who left → null (nothing drawn); live → the model", () => {
  for (const bad of [{ enabled: false }, null, "x", { error: "not_found" }, LEFT_ONLY]) {
    assert.equal(readCircleComfort(bad), null, JSON.stringify(bad));
    assert.equal(readCircleBirthday(bad), null, JSON.stringify(bad));
    assert.equal(readCircleWhatsapp(bad), null, JSON.stringify(bad));
  }
  assert.equal(circleDetailsHTML({ comfort: null, birthday: null, whatsapp: null }), "");
  const c = readCircleComfort({ success: true, data: COMFORT });
  assert.equal(c.values.pressure, "medium");
  assert.equal(c.values.oils, null);
  // A value the server does not list is shown as unset, never invented.
  assert.equal(readCircleComfort({ ...COMFORT, comfort: { ...COMFORT.comfort, music: "jazz" } }).values.music, null);
  assert.equal(readCircleComfort({ ...COMFORT, choices: { ...CHOICES, oils: [] } }), null, "no fixed choices, no group");
  assert.deepEqual(readCircleBirthday(BDAY_LOCKED), { birthday: { day: 15, month: 3 }, lockedUntil: "2027-11-15", editable: false, prefill: null });
});

/* ── Comfort: fixed choices only ───────────────────────────────────────── */

test("comfort: 'So we can prepare your room', the server's choices only, no free text, the saved one checked", () => {
  const html = comfortHTML(readCircleComfort(COMFORT));
  assert.match(html, /So we can prepare your room/);
  assert.equal((html.match(/type="radio"/g) || []).length, 12);
  assert.doesNotMatch(html, /type="text"|<textarea|contenteditable/i, "never free text");
  assert.match(html, /value="medium" data-cw-comfort="pressure" checked>/);
  assert.equal((html.match(/\schecked/g) || []).length, 1, "only what is on file is checked");
  assert.doesNotMatch(html, /allerg|pregnan|condition|health/i, "never health data");
  assert.deepEqual(circleComfortCall({ pressure: "firm" }), { path: "/api/auth/proxy/client/loyalty/comfort", method: "PUT", body: { pressure: "firm" } });
});

/* ── Birthday: day + month, never the year ─────────────────────────────── */

test("birthday: day + month selects only; a prefill is preselected but never saved by itself; no year anywhere", () => {
  const html = birthdayHTML(readCircleBirthday(BDAY_EMPTY));
  assert.match(html, /data-cw-bday-day/);
  assert.match(html, /data-cw-bday-month/);
  assert.doesNotMatch(html, /data-cw-bday-year|>Year<|\b(19|20)\d{2}\b/, "no year field, no year shown");
  assert.match(html, /<option value="15" selected>15<\/option>/);
  assert.match(html, /<option value="3" selected>March<\/option>/);
  assert.match(html, /Filled in from the date of birth we have for you\. Check it and save\./);
  assert.match(html, /Day and month only, never the year\./);
  assert.deepEqual(circleBirthdayCall(15, 3).body, { day: 15, month: 3 }, "a year is never sent");
});

test("birthday: locked shows the saved day and the date it can change; a 409 names that date", () => {
  const html = birthdayHTML(readCircleBirthday(BDAY_LOCKED));
  assert.match(html, /15 March/);
  assert.match(html, /You can change it again from 15 November 2027\./);
  assert.doesNotMatch(html, /<select|data-cw-bday-save/, "nothing to submit while locked");
  const body = { error: "Your birthday can be changed again from 2027-11-15.", code: "LOYALTY_BIRTHDAY_LOCKED", data: { unlocksAt: "2027-11-15" } };
  assert.equal(profileErrorText("LOYALTY_BIRTHDAY_LOCKED", body), "Your birthday is saved. You can change it again from 15 November 2027.");
  assert.match(profileErrorText("LOYALTY_BIRTHDAY_INVALID"), /isn't in the calendar/);
});

/* ── WhatsApp booking updates: a service, never marketing ─────────────── */

test("WhatsApp updates: counsel's re-versioned sentence word for word, drawn only when the server records EXACTLY that wording", () => {
  assert.equal(
    WHATSAPP_UPDATES_SENTENCE,
    "Send me Carisma Circle service messages on WhatsApp from Carisma Spa, Carisma Aesthetics and Carisma Slimming. No offers. Reply STOP to end.",
  );
  const html = whatsappUpdatesHTML(readCircleWhatsapp(WA));
  assert.ok(html.includes(WHATSAPP_UPDATES_SENTENCE));
  assert.doesNotMatch(html, /\schecked/, "not ticked unless the server says opted in");
  assert.match(html, /To your mobile ending 4821\./);
  assert.match(whatsappUpdatesHTML(readCircleWhatsapp({ ...WA, optedIn: true })), /data-cw-wa-updates checked/);
  // A different wording on file = no box (what is ticked must be what is recorded).
  assert.equal(readCircleWhatsapp({ ...WA, wording: "Send me offers on WhatsApp." }), null);
  assert.equal(readCircleWhatsapp({ ...WA, wording: undefined }), null);
  // A member who left still gets the box: an opt-out must always be possible.
  assert.equal(readCircleWhatsapp({ ...WA, left: true, optedIn: true }).optedIn, true);
  assert.match(profileErrorText("LOYALTY_NO_PHONE"), /don't have a mobile number for you yet/);
});

test("the service box and the marketing boxes never sit together: Details has no offers, Credit & rewards has no service box", () => {
  const details = circleDetailsHTML({ comfort: readCircleComfort(COMFORT), birthday: readCircleBirthday(BDAY_EMPTY), whatsapp: readCircleWhatsapp(WA) });
  assert.ok(details.includes(WHATSAPP_UPDATES_SENTENCE));
  assert.ok(!details.includes(OFFERS_EMAIL_SENTENCE) && !details.includes(OFFERS_WHATSAPP_SENTENCE));
  assert.doesNotMatch(details, /€|points/, "nothing in Details promises credit");
  const prefs = readCirclePrefs({ enabled: true, brands: [{ brandId: "b1", name: "Carisma Spa", house: "spa" }] });
  const rewards = circleViewHTML({ me: readCircle(MARIA), activity: null, rewards: null, prefs });
  assert.ok(rewards.includes(OFFERS_EMAIL_SENTENCE));
  assert.ok(!rewards.includes(WHATSAPP_UPDATES_SENTENCE));
  // W3's refusal words now match Details (a record on a brand site, not a form).
  assert.doesNotMatch(offersErrorText("LOYALTY_NO_EMAIL"), /in My details/);
  assert.match(offersErrorText("LOYALTY_NO_EMAIL"), /Ask the team to add it to your details/);
});

/* ── Complete your profile: what is missing ────────────────────────────── */

test("ways to earn (v2): rows are the API's actions; the retired profile hint never draws; email says how to finish", () => {
  assert.equal(profileMissingText(["email_verified", "birthday", "comfort"]), "Still to do: Verify your email address · add your birthday · choose your room preferences");
  assert.equal(profileMissingText([]), "");
  assert.equal(profileMissingText(["something_new"]), "", "an unknown item is never shown as a raw code");
  // Three houses on, so every row the server sent is drawn (X10 drops the brand rows on a Spa-only config).
  const page = circleViewHTML({ me: readCircle({ ...MARIA, brands: THREE_BRANDS }), activity: null, rewards: null });
  assert.doesNotMatch(page, /data-cw-circle-missing|Complete your profile/);
  for (const a of MARIA.actions) assert.ok(page.includes(a.label), a.label);
  const unverified = circleViewHTML({
    me: readCircle({ ...MARIA, actions: MARIA.actions.map((a) => (a.key === "verified_email" ? { ...a, done: false } : a)) }),
    activity: null,
    rewards: null,
  });
  assert.match(unverified, /Verified email on your account<\/b><span data-clarity-mask="True">\+€2\.50 · 50 points · Sign in with your email/);
  // A stray v1 "profile" row from an old server still renders only as the server's own label: no hint, no link.
  const stray = circleViewHTML({ me: readCircle({ ...MARIA, actions: [{ key: "profile", label: "Complete your profile", points: 100, done: false, missing: ["birthday"] }] }), activity: null, rewards: null });
  assert.doesNotMatch(stray, /data-cw-circle-missing|Finish in your details/);
});

test("W4 CSS reads tokens only (no raw colour)", () => {
  const css = PORTAL_RULES_CSS.slice(PORTAL_RULES_CSS.indexOf("Circle profile in Details (W4)"));
  assert.ok(css.includes(".cw-comfort__chip"));
  assert.doesNotMatch(css.slice(0, css.indexOf("Wallet line")), /#[0-9a-f]{3,8}\b|rgba?\(/i);
});

test("Details draws only an EMPTY, HIDDEN Circle slot (and none when the site did not opt in)", () => {
  const session = { signedIn: true, profile: { firstName: "Maria" } };
  const on = accountPortalHTML(buildPortalModel(session, "details", { siteBrand: "Carisma Spa", circleRail: true }));
  assert.match(on, /<div class="cw-circle-slot" data-cw-circle-slot="details" hidden><\/div>/);
  const off = accountPortalHTML(buildPortalModel(session, "details", { siteBrand: "Carisma Spa" }));
  assert.doesNotMatch(off, /data-cw-circle-slot/);
  const med = accountPortalHTML(buildPortalModel(session, "details", { siteBrand: "Carisma Medical", circleRail: true }));
  assert.doesNotMatch(med, /data-cw-circle-slot/);
});

/* ── The browser: Details end to end ───────────────────────────────────── */

/**
 * A fake DOM deep enough to SEE what the mount does: the Details slot, one slot
 * per section (each redraw is recorded), each section's live region, the
 * birthday selects, and one stub per radio actually drawn.
 */
const LIVE_ME = { enabled: true, level: { key: "pearl", number: 1, name: "Pearl", label: "Level 1 · Pearl" }, credit: { points: 0, cents: 0 } };
function harness({ comfort = COMFORT, birthday = BDAY_EMPTY, wa = WA, put = {}, me = LIVE_ME } = {}) {
  const state = { comfort, birthday, wa, me };
  const calls = [];
  const handlers = [];
  const selects = { day: { value: "" }, month: { value: "" } };
  const el = (extra = {}) => ({ innerHTML: "", attrs: {}, setAttribute(n, v) { this.attrs[n] = v; }, getAttribute(n) { return this.attrs[n] ?? null; }, removeAttribute(n) { delete this.attrs[n]; }, focus() { focused.push(this.name || "?"); }, ...extra });
  const focused = [];
  const outer = el({ name: "outer" });
  outer.attrs.hidden = "";
  const sections = {};
  for (const name of ["comfort", "birthday", "whatsapp"]) {
    const sec = el({ name, draws: 0, radios: [] });
    let html = "";
    Object.defineProperty(sec, "innerHTML", { get() { return html; }, set(v) { html = v; sec.draws++; sec.msg = el({ name: `${name}-msg` }); sec.radios = []; } });
    sec.msg = el({ name: `${name}-msg` });
    sec.querySelector = (sel) => {
      if (sel === "[data-cw-profile-msg]") return sec.msg;
      if (sel === "[data-cw-bday-day]") return selects.day;
      if (sel === "[data-cw-bday-month]") return selects.month;
      if (sel.startsWith("input[data-cw-comfort") || sel === "#cw-wa-updates" || sel === "[data-cw-bday-save]") {
        return (sec.innerHTML || outer.innerHTML).includes(sel.includes("comfort") ? "data-cw-comfort" : sel.includes("wa") ? "data-cw-wa-updates" : "data-cw-bday-save") ? el({ name: sel }) : null;
      }
      if (sel === ".cw-section__title") return el({ name: `${name}-title` });
      return null;
    };
    sec.querySelectorAll = (sel) => {
      if (sel !== "input[data-cw-comfort]") return [];
      const n = ((sec.innerHTML || outer.innerHTML).match(/data-cw-comfort="/g) || []).length;
      while (sec.radios.length < n) sec.radios.push(el({ name: "radio" }));
      return sec.radios;
    };
    sections[name] = sec;
  }
  const mount = {
    innerHTML: "", setAttribute() {}, getAttribute() { return null; },
    addEventListener(t, h) { if (t === "click") handlers.push(h); },
    querySelector(sel) {
      if (sel === '[data-cw-circle-slot="details"]') return mount.innerHTML.includes('data-cw-circle-slot="details"') ? outer : null;
      const m = /^\[data-cw-profile-slot="(\w+)"\]$/.exec(sel);
      if (m) return outer.innerHTML.includes(`data-cw-profile-slot="${m[1]}"`) ? sections[m[1]] : null;
      return null;
    },
    querySelectorAll() { return []; },
  };
  const doc = {
    cookie: "cw-signed-in=1",
    location: { pathname: "/account/details", host: "www.carismaspa.com", origin: "https://www.carismaspa.com", search: "" },
    getElementById: (id) => (id === "carisma-account-portal" ? mount : null),
    querySelectorAll: () => [], addEventListener() {},
  };
  const res = (status, data) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) });
  const fetchImpl = (url, init = {}) => {
    const method = init.method || "GET";
    calls.push({ method, url, body: init.body ? JSON.parse(init.body) : undefined });
    if (url.startsWith("/api/auth/session")) return res(200, { signedIn: true, profile: { firstName: "Maria" } });
    const door = url.replace("/api/auth/proxy/client/loyalty/", "");
    if (method === "PUT" && put[door]) {
      const a = typeof put[door] === "function" ? put[door](state) : put[door];
      return res(a.status, a.body);
    }
    if (door === "comfort") {
      if (method === "PUT") state.comfort = { ...state.comfort, comfort: { ...state.comfort.comfort, ...JSON.parse(init.body) } };
      return typeof state.comfort === "number" ? res(state.comfort, {}) : res(200, { success: true, data: state.comfort });
    }
    if (door === "birthday") {
      if (method === "PUT") state.birthday = { ...BDAY_LOCKED, birthday: JSON.parse(init.body) };
      return typeof state.birthday === "number" ? res(state.birthday, {}) : res(200, { success: true, data: state.birthday });
    }
    if (door === "whatsapp-updates") {
      if (method === "PUT") state.wa = { ...state.wa, optedIn: JSON.parse(init.body).optedIn };
      return typeof state.wa === "number" ? res(state.wa, {}) : res(200, { success: true, data: state.wa });
    }
    if (door === "me") return res(200, { success: true, data: state.me });
    return res(200, { success: true, data: [] });
  };
  const target = (attr, value = "", extra = {}) => {
    const t = el(extra);
    t.attrs[attr] = value;
    t.closest = (sel) => {
      if (sel === "dialog.cw-dialog") return null;
      const m = /^(?:input)?\[([\w-]+)(?:=|\])/.exec(sel);
      return m && m[1] === attr ? t : null;
    };
    return t;
  };
  const click = (t) => handlers.forEach((h) => h({ target: t, preventDefault() {}, stopPropagation() {} }));
  const puts = () => calls.filter((c) => c.method === "PUT").map((c) => [c.url.replace("/api/auth/proxy/client/loyalty/", ""), c.body]);
  return { doc, mount, outer, sections, selects, calls, puts, fetchImpl, target, click, state, focused };
}
const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const SETTLED = 700; // > the 600 ms comfort settle
const mountDetails = (h, circle = true) => mountAccountPortal(h.doc, { view: "details", fetchImpl: h.fetchImpl, navigate() {}, circle });

test("Details: B4 off / 404 = the slot stays hidden and empty; live = three sections in their own slots; not opted in = no B4 read", async () => {
  for (const off of [{ enabled: false }, 404]) {
    const h = harness({ comfort: off, birthday: off, wa: off });
    mountDetails(h);
    await settle();
    assert.equal(h.outer.innerHTML, "", JSON.stringify(off));
    assert.ok("hidden" in h.outer.attrs);
    assert.equal(h.calls.filter((c) => c.method !== "GET").length, 0);
  }
  const live = harness();
  mountDetails(live);
  await settle();
  assert.ok(!("hidden" in live.outer.attrs));
  for (const k of ["comfort", "birthday", "whatsapp"]) assert.match(live.outer.innerHTML, new RegExp(`data-cw-profile-slot="${k}"`));
  assert.match(live.outer.innerHTML, new RegExp(`data-cw-qc="${CIRCLE_QC}"`));
  assert.equal(live.calls.filter((c) => c.method !== "GET").length, 0, "a prefill is never saved by itself");
  const notOpted = harness();
  mountDetails(notOpted, false);
  await settle();
  assert.equal(notOpted.calls.some((c) => c.url.includes("/loyalty/")), false);
});

test("Details: while the member read says Circle is OFF (production today) not one B4 request is made; a member who left still gets them", async () => {
  for (const me of [{ enabled: false }, { tier: "gold", perks: [] }, null]) {
    const h = harness({ me });
    mountDetails(h);
    await settle();
    const b4 = h.calls.filter((c) => /loyalty\/(comfort|birthday|whatsapp-updates)/.test(c.url));
    assert.deepEqual(b4, [], JSON.stringify(me));
    assert.equal(h.outer.innerHTML, "");
  }
  const left = harness({ me: { enabled: true, left: true, leftAt: "2026-11-14T10:00:00Z" }, comfort: LEFT_ONLY, birthday: LEFT_ONLY, wa: { ...WA, left: true, optedIn: true } });
  mountDetails(left);
  await settle();
  assert.equal(left.calls.filter((c) => /loyalty\/(comfort|birthday|whatsapp-updates)/.test(c.url)).length, 3);
  assert.match(left.outer.innerHTML, /data-cw-circle="whatsapp-updates"/);
  // One member read for the page, never two.
  assert.equal(left.calls.filter((c) => c.url.endsWith("/loyalty/me")).length, 1);
});

test("comfort: a keyboard sweep (Light → Medium → Firm) settles into ONE save of 'firm'; the drawn choices are held while it flies", async () => {
  const h = harness();
  mountDetails(h);
  await settle();
  for (const v of ["light", "medium", "firm"]) h.click(h.target("data-cw-comfort", "pressure", { value: v }));
  await settle();
  assert.deepEqual(h.puts(), [], "nothing is sent while the choice is still moving");
  await settle(SETTLED);
  assert.deepEqual(h.puts(), [["comfort", { pressure: "firm" }]]);
  assert.equal(h.sections.comfort.radios.length, 0, "redrawn after the answer");
  assert.match(h.sections.comfort.innerHTML, /value="firm" data-cw-comfort="pressure" checked>/);
  assert.equal(h.sections.comfort.msg.innerHTML, "Saved.");
  assert.equal(h.sections.birthday.draws, 0, "the other sections are never redrawn");
  assert.equal(h.sections.whatsapp.draws, 0);
});

test("comfort: two groups changed together go in one PUT; going back to what is on file sends nothing", async () => {
  const h = harness();
  mountDetails(h);
  await settle();
  h.click(h.target("data-cw-comfort", "oils", { value: "aromatic" }));
  h.click(h.target("data-cw-comfort", "music", { value: "calm" }));
  await settle(SETTLED);
  assert.deepEqual(h.puts(), [["comfort", { oils: "aromatic", music: "calm" }]]);
  const same = harness();
  mountDetails(same);
  await settle();
  same.click(same.target("data-cw-comfort", "pressure", { value: "firm" }));
  same.click(same.target("data-cw-comfort", "pressure", { value: "medium" })); // back to what is on file
  await settle(SETTLED);
  assert.deepEqual(same.puts(), []);
});

test("comfort: a refusal redraws what is ON FILE (the old choice checked) and says why", async () => {
  const h = harness({ put: { comfort: { status: 400, body: { error: "x", code: "LOYALTY_COMFORT_INVALID" } } } });
  mountDetails(h);
  await settle();
  h.click(h.target("data-cw-comfort", "pressure", { value: "firm" }));
  await settle(SETTLED);
  assert.match(h.sections.comfort.innerHTML, /value="medium" data-cw-comfort="pressure" checked>/);
  assert.doesNotMatch(h.sections.comfort.innerHTML, /value="firm" data-cw-comfort="pressure" checked>/);
  assert.match(h.sections.comfort.msg.innerHTML, /isn(&#39;|')t available any more/);
  assert.equal(h.sections.comfort.msg.attrs.class, "cw-circle-prefs__msg cw-circle-prefs__msg--bad");
});

test("birthday: saves {day, month} on the tap and shows the locked day; other sections untouched", async () => {
  const h = harness();
  mountDetails(h);
  await settle();
  h.selects.day.value = "15";
  h.selects.month.value = "3";
  h.click(h.target("data-cw-bday-save"));
  await settle();
  assert.deepEqual(h.puts(), [["birthday", { day: 15, month: 3 }]]);
  assert.match(h.sections.birthday.innerHTML, /You can change it again from 15 November 2027\./);
  assert.equal(h.sections.birthday.msg.innerHTML, "Saved.");
  assert.equal(h.sections.comfort.draws, 0);
});

test("birthday: a refusal KEEPS the member's picks (only the message changes); nothing chosen sends nothing", async () => {
  const h = harness({ put: { birthday: { status: 400, body: { error: "x", code: "LOYALTY_BIRTHDAY_INVALID" } } } });
  mountDetails(h);
  await settle();
  h.selects.day.value = "31";
  h.selects.month.value = "2";
  h.click(h.target("data-cw-bday-save"));
  await settle();
  assert.equal(h.sections.birthday.draws, 0, "the form is not redrawn, so 31 / February stay picked");
  assert.match(h.sections.birthday.msg.innerHTML, /isn(&#39;|')t in the calendar/);
  const empty = harness({ birthday: { ...BDAY_EMPTY, prefill: null } });
  mountDetails(empty);
  await settle();
  empty.click(empty.target("data-cw-bday-save"));
  await settle();
  assert.deepEqual(empty.puts(), []);
  assert.equal(empty.sections.birthday.msg.innerHTML, "Choose a day and a month.");
});

test("birthday: a 409 lock re-reads the saved day and shows the date it opens (either error envelope)", async () => {
  for (const body of [
    { error: "x", code: "LOYALTY_BIRTHDAY_LOCKED", data: { unlocksAt: "2027-11-15" } },
    { success: false, code: "LOYALTY_BIRTHDAY_LOCKED", error: { code: "LOYALTY_BIRTHDAY_LOCKED", data: { unlocksAt: "2027-11-15" } } },
  ]) {
    const h = harness({ put: { birthday: (st) => { st.birthday = BDAY_LOCKED; return { status: 409, body }; } } });
    mountDetails(h);
    await settle();
    h.selects.day.value = "16";
    h.selects.month.value = "3";
    h.click(h.target("data-cw-bday-save"));
    await settle();
    assert.match(h.sections.birthday.innerHTML, /15 March/);
    assert.doesNotMatch(h.sections.birthday.innerHTML, /<select/, "the locked view, not the form");
    assert.equal(h.sections.birthday.msg.innerHTML, "Your birthday is saved. You can change it again from 15 November 2027.");
    assert.ok(h.focused.includes("birthday-title"), "focus lands on the section, not the page");
  }
});

test("WhatsApp updates: opt in / out with one PUT; no phone = plain words; a left member can opt out; an off-switch opt-out still saves", async () => {
  const h = harness();
  mountDetails(h);
  await settle();
  h.click(h.target("data-cw-wa-updates", "", { checked: true }));
  await settle();
  assert.deepEqual(h.puts(), [["whatsapp-updates", { optedIn: true }]]);
  assert.match(h.sections.whatsapp.innerHTML, /data-cw-wa-updates checked/);
  assert.equal(h.sections.whatsapp.msg.innerHTML, "Saved. Your booking updates will come on WhatsApp.");

  const noPhone = harness({ wa: { ...WA, hasPhone: false, phoneLast4: null }, put: { "whatsapp-updates": { status: 400, body: { error: "x", code: "LOYALTY_NO_PHONE" } } } });
  mountDetails(noPhone);
  await settle();
  noPhone.click(noPhone.target("data-cw-wa-updates", "", { checked: true }));
  await settle();
  assert.match(noPhone.sections.whatsapp.msg.innerHTML, /We don(&#39;|')t have a mobile number for you yet/);
  assert.equal((noPhone.sections.whatsapp.innerHTML.match(/mobile number/g) || []).length, 0, "the sentence is said once, in the message");
  assert.doesNotMatch(noPhone.sections.whatsapp.innerHTML, /data-cw-wa-updates checked/, "never shown as opted in");

  const left = harness({ comfort: LEFT_ONLY, birthday: LEFT_ONLY, wa: { ...WA, left: true, optedIn: true } });
  mountDetails(left);
  await settle();
  assert.doesNotMatch(left.outer.innerHTML, /data-cw-circle="comfort"|data-cw-circle="birthday"/, "a left member cannot save these");
  left.click(left.target("data-cw-wa-updates", "", { checked: false }));
  await settle();
  assert.deepEqual(left.puts(), [["whatsapp-updates", { optedIn: false }]]);
  assert.equal(left.sections.whatsapp.msg.innerHTML, "Saved. No more booking updates on WhatsApp.");

  const offOut = harness({ wa: { ...WA, optedIn: true }, put: { "whatsapp-updates": { status: 200, body: { success: true, data: { enabled: false, optedIn: false } } } } });
  mountDetails(offOut);
  await settle();
  offOut.click(offOut.target("data-cw-wa-updates", "", { checked: false }));
  await settle();
  assert.doesNotMatch(offOut.sections.whatsapp.innerHTML, /data-cw-wa-updates checked/);
  assert.equal(offOut.sections.whatsapp.msg.innerHTML, "Saved. No more booking updates on WhatsApp.");
});

test("the copies of shared constants have not drifted (the QC marker)", () => {
  assert.equal(CIRCLE_QC, "carisma-circle-v2-20261117");
  assert.match(circleDetailsHTML({ comfort: readCircleComfort(COMFORT), birthday: null, whatsapp: null }), new RegExp(`data-cw-qc="${CIRCLE_QC}"`));
  assert.match(circleViewHTML({ me: readCircle(MARIA), activity: null, rewards: null }), new RegExp(`data-cw-qc="${CIRCLE_QC}"`));
  assert.equal(ACCOUNT_DETAILS_HREF, "/account/details");
});

/* ── The proxy: exactly six new literal doors ──────────────────────────── */

test("proxy: the six W4 doors are exact literals; siblings and the staff twin stay refused", () => {
  for (const p of ["/client/loyalty/comfort", "/client/loyalty/birthday", "/client/loyalty/whatsapp-updates"]) {
    assert.equal(isAllowed("GET", p), true, `GET ${p}`);
    assert.equal(isAllowed("PUT", p), true, `PUT ${p}`);
    for (const m of ["POST", "PATCH", "DELETE"]) assert.equal(isAllowed(m, p), false, `${m} ${p}`);
    assert.equal(isAllowed("PUT", `${p}/abc`), false);
    assert.equal(isAllowed("GET", `${p}/abc`), false);
  }
  for (const [m, p] of [["GET", "/hod/clients/abc/loyalty/comfort"], ["PUT", "/client/loyalty/profile"], ["GET", "/client/loyalty/profile"], ["PUT", "/client/care-profile"], ["PUT", "/profile"]]) {
    assert.equal(isAllowed(m, p), false, `${m} ${p}`);
  }
  for (const f of FORBIDDEN_PATHS) assert.equal(isAllowed(f.method, f.path), false, `${f.method} ${f.path}`);
  // v2 adds six more (summary, Instagram, perks, Spa day, points-bookings, the member earn preview): 23 in all.
  assert.equal(PROXY_ALLOWLIST.filter((r) => /loyalty|Carisma Circle/i.test(r.label)).length, 23);
});

const RP = "carisma-spa";
const SECRET = "primary-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const NOW_S = 1_700_000_000;
const cookie = () => seal({ v: 1, sid: "s", uid: "u", at: "ACCESS", atExp: NOW_S + 99999, rt: "R", initials: "MB", iat: NOW_S }, SECRET, RP);

test("proxy: the WhatsApp service consent PUT carries the member's own browser; comfort and birthday do not", async () => {
  const seen = [];
  const r = createAccountRoutes({
    rpId: RP, clientId: RP, clientSecret: "cs", identityOrigin: "http://account.localtest.me:3000",
    carismasoftApiUrl: "http://backend.local/api/v1", sessionSecret: SECRET,
    allowedOrigins: ["http://localhost:3100"], cookieSecure: false, now: () => NOW_S * 1000,
    fetchImpl: async (url, init) => {
      seen.push([init.method, url.replace("http://backend.local/api/v1", ""), init.headers["user-agent"] ?? null]);
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const ua = "Mozilla/5.0 (QC)";
  for (const [path, body] of [["whatsapp-updates", { optedIn: true }], ["comfort", { pressure: "firm" }], ["birthday", { day: 1, month: 2 }]]) {
    await r.proxy(new Request(`http://localhost:3100/api/auth/proxy/client/loyalty/${path}`, {
      method: "PUT",
      headers: { cookie: `cw_session=${cookie()}`, origin: "http://localhost:3100", "content-type": "application/json", "user-agent": ua },
      body: JSON.stringify(body),
    }));
  }
  assert.deepEqual(seen, [
    ["PUT", "/client/loyalty/whatsapp-updates", ua],
    ["PUT", "/client/loyalty/comfort", null],
    ["PUT", "/client/loyalty/birthday", null],
  ]);
});
