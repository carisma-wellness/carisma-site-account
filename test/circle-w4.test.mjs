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
} from "../dist/index.js";
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
const MARIA = {
  enabled: true,
  level: { key: "golden_hour", name: "Golden Hour", numeral: "III" },
  credit: { points: 1240, cents: 6200 },
  actions: [
    { key: "profile", label: "Complete your profile", points: 100, done: false, missing: ["email_verified", "birthday"] },
    { key: "whatsapp", label: "Booking updates and credit receipts on WhatsApp", points: 40, done: false },
  ],
  rules: { minRedeemPoints: 100 },
};

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
  assert.deepEqual(circleComfortCall("pressure", "firm"), { path: "/api/auth/proxy/client/loyalty/comfort", method: "PUT", body: { pressure: "firm" } });
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

test("WhatsApp updates: the Bible's sentence word for word, drawn only when the server records EXACTLY that wording", () => {
  assert.equal(
    WHATSAPP_UPDATES_SENTENCE,
    "Send my booking updates and Carisma credit receipts on WhatsApp from Carisma Spa, Carisma Aesthetics and Carisma Slimming. No offers. Reply STOP to end.",
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

test("ways to earn: 'Complete your profile' says what is missing and where to finish; nothing once done", () => {
  assert.equal(profileMissingText(["email_verified", "birthday", "comfort"]), "Still to do: Verify your email address · add your birthday · choose your room preferences");
  assert.equal(profileMissingText([]), "");
  assert.equal(profileMissingText(["something_new"]), "", "an unknown item is never shown as a raw code");
  const page = circleViewHTML({ me: readCircle(MARIA), activity: null, rewards: null });
  assert.match(page, /Complete your profile<span class="cw-circle-earn__missing" data-cw-circle-missing>Still to do: Verify your email address · add your birthday · <a class="cw-link" href="\/account\/details">Finish in your details<\/a><\/span>/);
  const done = circleViewHTML({ me: readCircle({ ...MARIA, actions: [{ ...MARIA.actions[0], done: true, missing: [] }] }), activity: null, rewards: null });
  assert.doesNotMatch(done, /data-cw-circle-missing/);
  assert.doesNotMatch(circleViewHTML({ me: readCircle({ ...MARIA, actions: [{ key: "whatsapp", label: "x", points: 40, done: false, missing: ["birthday"] }] }), activity: null, rewards: null }), /data-cw-circle-missing/, "only the profile row");
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

function harness({ comfort = COMFORT, birthday = BDAY_EMPTY, wa = WA, put = {} } = {}) {
  const state = { comfort, birthday, wa };
  const calls = [];
  const handlers = [];
  const selects = { day: { value: "" }, month: { value: "" } };
  const el = (extra = {}) => ({ innerHTML: "", attrs: {}, setAttribute(n, v) { this.attrs[n] = v; }, getAttribute(n) { return this.attrs[n] ?? null; }, removeAttribute(n) { delete this.attrs[n]; }, focus() {}, ...extra });
  const slotInputs = [el(), el(), el()];
  const slot = el({
    querySelector(sel) {
      if (sel === "[data-cw-bday-day]") return selects.day;
      if (sel === "[data-cw-bday-month]") return selects.month;
      return null;
    },
    querySelectorAll(sel) { return sel === "input[data-cw-comfort]" ? slotInputs : []; },
  });
  slot.attrs.hidden = "";
  const mount = {
    innerHTML: "", setAttribute() {}, getAttribute() { return null; },
    addEventListener(t, h) { if (t === "click") handlers.push(h); },
    querySelector(sel) {
      if (sel === '[data-cw-circle-slot="details"]') return mount.innerHTML.includes('data-cw-circle-slot="details"') ? slot : null;
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
    if (method === "PUT" && put[door]) return res(put[door].status, put[door].body);
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
    if (door === "me") return res(200, { success: true, data: { enabled: false } });
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
  return { doc, mount, slot, selects, slotInputs, calls, fetchImpl, target, click, state };
}
const settle = () => new Promise((r) => setTimeout(r, 40));
const mountDetails = (h, circle = true) => mountAccountPortal(h.doc, { view: "details", fetchImpl: h.fetchImpl, navigate() {}, circle });

test("Details: B4 off / 404 = the slot stays hidden and empty; live = the three sections; not opted in = no B4 read", async () => {
  for (const off of [{ enabled: false }, 404]) {
    const h = harness({ comfort: off, birthday: off, wa: off });
    mountDetails(h);
    await settle();
    assert.equal(h.slot.innerHTML, "", JSON.stringify(off));
    assert.ok("hidden" in h.slot.attrs);
    assert.equal(h.calls.filter((c) => c.method !== "GET").length, 0);
  }
  const live = harness();
  mountDetails(live);
  await settle();
  assert.ok(!("hidden" in live.slot.attrs));
  for (const k of ["comfort", "birthday", "whatsapp-updates"]) assert.match(live.slot.innerHTML, new RegExp(`data-cw-circle="${k}"`));
  assert.equal(live.calls.filter((c) => c.method !== "GET").length, 0, "a prefill is never saved by itself");
  const notOpted = harness();
  mountDetails(notOpted, false);
  await settle();
  assert.equal(notOpted.calls.some((c) => c.url.includes("/loyalty/")), false);
});

test("Details: a comfort tap PUTs that ONE key; the same choice again sends nothing", async () => {
  const h = harness();
  mountDetails(h);
  await settle();
  h.click(h.target("data-cw-comfort", "pressure", { value: "medium" })); // already on file
  h.click(h.target("data-cw-comfort", "pressure", { value: "firm" }));
  assert.ok(h.slotInputs.every((i) => "disabled" in i.attrs), "the choices are held while saving");
  await settle();
  assert.deepEqual(h.calls.filter((c) => c.method === "PUT").map((c) => [c.url, c.body]), [["/api/auth/proxy/client/loyalty/comfort", { pressure: "firm" }]]);
  assert.match(h.slot.innerHTML, /value="firm" data-cw-comfort="pressure" checked>/);
  assert.match(h.slot.innerHTML, /data-cw-profile-msg="comfort">Saved\.</);
});

test("Details: birthday saves {day, month} on the tap; a lock answers with the date it opens", async () => {
  const h = harness();
  mountDetails(h);
  await settle();
  h.selects.day.value = "15";
  h.selects.month.value = "3";
  h.click(h.target("data-cw-bday-save"));
  await settle();
  assert.deepEqual(h.calls.filter((c) => c.method === "PUT").map((c) => c.body), [{ day: 15, month: 3 }]);
  assert.match(h.slot.innerHTML, /You can change it again from 15 November 2027\./);

  const locked = harness({ put: { birthday: { status: 409, body: { error: "x", code: "LOYALTY_BIRTHDAY_LOCKED", data: { unlocksAt: "2027-11-15" } } } } });
  mountDetails(locked);
  await settle();
  locked.selects.day.value = "16";
  locked.selects.month.value = "3";
  locked.click(locked.target("data-cw-bday-save"));
  await settle();
  assert.match(locked.slot.innerHTML, /Your birthday is saved\. You can change it again from 15 November 2027\./);
  // Nothing chosen: no request, a plain line.
  const empty = harness({ birthday: { ...BDAY_EMPTY, prefill: null } });
  mountDetails(empty);
  await settle();
  empty.click(empty.target("data-cw-bday-save"));
  await settle();
  assert.equal(empty.calls.filter((c) => c.method === "PUT").length, 0);
  assert.match(empty.slot.innerHTML, /Choose a day and a month\./);
});

test("Details: WhatsApp updates opt in / out with one PUT; no phone = plain words; a member who left can still opt out", async () => {
  const h = harness();
  mountDetails(h);
  await settle();
  h.click(h.target("data-cw-wa-updates", "", { checked: true }));
  await settle();
  assert.deepEqual(h.calls.filter((c) => c.method === "PUT").map((c) => [c.url, c.body]), [["/api/auth/proxy/client/loyalty/whatsapp-updates", { optedIn: true }]]);
  assert.match(h.slot.innerHTML, /data-cw-wa-updates checked/);
  assert.match(h.slot.innerHTML, /Saved\. Your booking updates will come on WhatsApp\./);

  const noPhone = harness({ wa: { ...WA, hasPhone: false, phoneLast4: null }, put: { "whatsapp-updates": { status: 400, body: { error: "x", code: "LOYALTY_NO_PHONE" } } } });
  mountDetails(noPhone);
  await settle();
  noPhone.click(noPhone.target("data-cw-wa-updates", "", { checked: true }));
  await settle();
  assert.match(noPhone.slot.innerHTML, /We don(&#39;|')t have a mobile number for you yet/);
  assert.doesNotMatch(noPhone.slot.innerHTML, /data-cw-wa-updates checked/, "never shown as opted in");

  const left = harness({ comfort: LEFT_ONLY, birthday: LEFT_ONLY, wa: { ...WA, left: true, optedIn: true } });
  mountDetails(left);
  await settle();
  assert.doesNotMatch(left.slot.innerHTML, /data-cw-circle="comfort"|data-cw-circle="birthday"/, "a left member cannot save these");
  left.click(left.target("data-cw-wa-updates", "", { checked: false }));
  await settle();
  assert.deepEqual(left.calls.filter((c) => c.method === "PUT").map((c) => c.body), [{ optedIn: false }]);
  assert.match(left.slot.innerHTML, /Saved\. No more booking updates on WhatsApp\./);
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
  assert.equal(PROXY_ALLOWLIST.filter((r) => /loyalty|Carisma Circle/i.test(r.label)).length, 17);
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
