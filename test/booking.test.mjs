import { test } from "node:test";
import assert from "node:assert/strict";
import {
  step3InitialState,
  step3Reducer,
  step3View,
  isReadyToCheckout,
  assertReadyToPay,
  NotReadyToPayError,
  guestFromProfile,
  buildCheckoutPayload,
  toClientCheckoutBody,
  makeClientCheckout,
  marketingConsentField,
  showMarketingConsent,
  MARKETING_DEFAULT_CHECKED,
  step3DoorsHTML,
  step3ConfirmHTML,
  marketingTickHTML,
  makeGuestClaim,
  STEP3_QC,
} from "../dist/index.js";

/* ── fixtures ────────────────────────────────────────────────────────────── */

const GUEST = { firstName: "Jane", lastName: "Doe", email: "jane.doe@gmail.com", phone: "+35679000099" };
const PROFILE = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane.doe@gmail.com",
  emailMasked: "j***@gmail.com",
  countryCode: "+356",
  phone: "79000099",
  initials: "JD",
};
const ESSENTIALS = {
  serviceId: "svc-1",
  optionId: null,
  locationId: "loc-1",
  date: "2026-09-20",
  time: "16:00",
  timeZone: "Europe/Malta",
  durationMinutes: 60,
  participants: 1,
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

/* ── 1. reducer contract: every Step 3 state reaches a non-null payload
      ONLY through SUBMIT_DETAILS (W-10) ─────────────────────────────────── */

test("guest-form state (ACCOUNT_LOGIN off): SUBMIT_DETAILS makes the payload non-null", () => {
  let s = step3InitialState({ accountLoginEnabled: false, session: { signedIn: false } });
  assert.equal(step3View(s), "guest-form");
  assert.equal(buildCheckoutPayload({ state: s, essentials: ESSENTIALS }), null, "no guest yet");
  s = step3Reducer(s, { type: "SUBMIT_DETAILS", guest: GUEST, marketingConsent: false });
  assert.notEqual(buildCheckoutPayload({ state: s, essentials: ESSENTIALS }), null);
});

test("doors state (on, signed out): OPEN_GUEST_DOOR does NOT write guest; only SUBMIT_DETAILS does", () => {
  let s = step3InitialState({ accountLoginEnabled: true, session: { signedIn: false } });
  assert.equal(step3View(s), "doors");
  s = step3Reducer(s, { type: "OPEN_GUEST_DOOR" });
  assert.equal(step3View(s), "guest-form");
  assert.equal(s.guest, null, "OPEN_GUEST_DOOR is not a guest writer");
  assert.equal(buildCheckoutPayload({ state: s, essentials: ESSENTIALS }), null);
  s = step3Reducer(s, { type: "SUBMIT_DETAILS", guest: GUEST, marketingConsent: true });
  assert.notEqual(buildCheckoutPayload({ state: s, essentials: ESSENTIALS }), null);
});

test("confirm state (member): SUBMIT_DETAILS with a profile-built GuestDetails is non-null", () => {
  let s = step3InitialState({ accountLoginEnabled: true, session: { signedIn: true, profile: PROFILE } });
  assert.equal(step3View(s), "confirm");
  assert.equal(buildCheckoutPayload({ state: s, essentials: ESSENTIALS }), null, "even a member needs SUBMIT_DETAILS");
  const memberGuest = guestFromProfile(PROFILE);
  assert.deepEqual(memberGuest, { firstName: "Jane", lastName: "Doe", email: "jane.doe@gmail.com", phone: "+35679000099" });
  s = step3Reducer(s, { type: "SUBMIT_DETAILS", guest: memberGuest });
  const payload = buildCheckoutPayload({ state: s, essentials: ESSENTIALS });
  assert.notEqual(payload, null);
  assert.equal(payload.guest.email, "jane.doe@gmail.com");
});

test("no other action writes guest: EDIT_DETAILS / BACK_TO_DOORS / SIGN_OUT_LOCAL leave it null", () => {
  let s = step3InitialState({ accountLoginEnabled: true, session: { signedIn: true, profile: PROFILE } });
  for (const type of ["EDIT_DETAILS", "OPEN_GUEST_DOOR", "BACK_TO_DOORS", "SIGN_OUT_LOCAL"]) {
    s = step3Reducer(s, { type });
    assert.equal(s.guest, null, `${type} must not write guest`);
  }
});

/* ── 2. NEGATIVE CONTROL: bypass SUBMIT_DETAILS and the pay guard refuses ─── */

test("NEGATIVE CONTROL: without SUBMIT_DETAILS the pay guard refuses and no payload builds", () => {
  const s = step3InitialState({ accountLoginEnabled: true, session: { signedIn: true, profile: PROFILE } });
  assert.equal(isReadyToCheckout(s), false);
  assert.equal(buildCheckoutPayload({ state: s, essentials: ESSENTIALS }), null);
  assert.throws(() => assertReadyToPay(s), NotReadyToPayError);
  // and after a legitimate SUBMIT_DETAILS the same guard passes — proving it can tell them apart
  const ok = step3Reducer(s, { type: "SUBMIT_DETAILS", guest: guestFromProfile(PROFILE) });
  assert.equal(isReadyToCheckout(ok), true);
  assert.doesNotThrow(() => assertReadyToPay(ok));
});

/* ── 3. the member path never sends turnstileToken; the guest path keeps it ─ */

test("member checkout never carries turnstileToken; guest checkout does (the recorder can tell them apart)", () => {
  const guestState = step3Reducer(
    step3InitialState({ accountLoginEnabled: true, session: { signedIn: false } }),
    { type: "SUBMIT_DETAILS", guest: GUEST, marketingConsent: true },
  );
  const guestPayload = buildCheckoutPayload({ state: guestState, essentials: ESSENTIALS, turnstileToken: "TS-TOKEN" });
  assert.equal(guestPayload.turnstileToken, "TS-TOKEN", "guest door keeps the token");

  const memberState = step3Reducer(
    step3InitialState({ accountLoginEnabled: true, session: { signedIn: true, profile: PROFILE } }),
    { type: "SUBMIT_DETAILS", guest: guestFromProfile(PROFILE) },
  );
  const memberPayload = buildCheckoutPayload({ state: memberState, essentials: ESSENTIALS, turnstileToken: "TS-TOKEN" });
  assert.equal(memberPayload.turnstileToken, undefined, "a member checkout drops the token even when one is passed");

  const wire = toClientCheckoutBody(memberPayload);
  assert.equal("turnstileToken" in wire, false, "the member wire body has no turnstileToken field at all");
  assert.equal("guest" in wire, false, "the member wire drops the top-level guest block (8.5)");
  assert.equal(wire.countryCode, "+356");
  assert.equal(wire.phone, "79000099");
});

/* ── 4. marketing tick: unticked + brand-named for guests, hidden for members ─ */

test("marketing tick is shown, unticked and brand-named for a guest", () => {
  const field = marketingConsentField({ signedIn: false }, "Carisma Aesthetics");
  assert.equal(field.shown, true);
  assert.equal(field.checked, false);
  assert.equal(MARKETING_DEFAULT_CHECKED, false);
  assert.match(field.label, /Carisma Aesthetics/);
  assert.doesNotMatch(field.label, /Carisma Spa/, "never the hard-coded Spa default (W-23)");
  const html = marketingTickHTML(field);
  assert.match(html, /name="marketingConsent"/);
  assert.doesNotMatch(html, /\bchecked\b/, "the box renders unticked");
  assert.match(html, /Carisma Aesthetics/);
});

test("marketing tick is HIDDEN for a member and renders nothing", () => {
  const field = marketingConsentField({ signedIn: true }, "Carisma Aesthetics");
  assert.equal(field.shown, false);
  assert.equal(showMarketingConsent({ signedIn: true }), false);
  assert.equal(marketingTickHTML(field), "");
});

test("the default Step 3 state is never pre-ticked", () => {
  const s = step3InitialState({ accountLoginEnabled: true, session: { signedIn: false } });
  assert.equal(s.marketingConsent, false);
});

test("marketingConsentField refuses an empty brand name (no silent wrong-brand default)", () => {
  assert.throws(() => marketingConsentField({ signedIn: false }, ""), /brandName is required/);
});

/* ── 5. views: QC marker, identity hrefs from urls.ts, masked confirm card ── */

test("State A doors carry the QC marker and build their hrefs through urls.ts", () => {
  const html = step3DoorsHTML({ next: "/face-treatments?resume=booking" });
  assert.match(html, new RegExp(`data-cw-qc="${STEP3_QC}"`));
  assert.match(html, /href="\/api\/auth\/start\?next=/, "primary door uses startUrl");
  assert.match(html, /prompt=create/, "secondary door carries prompt=create");
  assert.match(html, /Book as a guest/);
  // ACCOUNT_GUEST_ENABLED=off drops the guest door only
  const noGuest = step3DoorsHTML({ next: "/x", guestEnabled: false });
  assert.doesNotMatch(noGuest, /Book as a guest/);
});

test("State B confirm card masks personal strings and shows no marketing tick", () => {
  const html = step3ConfirmHTML({ name: "Jane Doe", emailMasked: "j***@gmail.com", phoneDisplay: "+356 79** **99" });
  assert.match(html, new RegExp(`data-cw-qc="${STEP3_QC}"`));
  assert.match(html, /data-clarity-mask="True"/);
  assert.match(html, /Booking as Jane Doe/);
  assert.doesNotMatch(html, /marketingConsent/, "no consent tick on the member card");
  assert.match(html, /data-carisma-member-continue/);
});

/* ── 6. the in-overlay guest claim (hermetic; the live probe is separate) ──── */

test("guest claim (email): start is enumeration-safe (purpose claim), finish returns tokens -> signed in", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = init?.body ? JSON.parse(init.body) : {};
    calls.push({ url, method: init?.method, body });
    if (url.endsWith("/auth/code/start")) return json({ success: true, data: { message: "on its way" } });
    if (url.endsWith("/auth/code/finish")) {
      if (body.code === "000000") return json({ error: "That code is invalid or has expired.", code: "CODE_INVALID" }, 400);
      return json({ success: true, data: { user: { id: "u-1", email: "guest@localtest.me" }, tokens: { accessToken: "AT", refreshToken: "RT" } } });
    }
    return json({}, 404);
  };
  const claim = makeGuestClaim({ apiBaseUrl: "http://backend.local/api/v1", fetchImpl });

  const start = await claim.start({ via: "email", email: "guest@localtest.me" });
  assert.equal(start.ok, true);
  assert.equal(calls[0].url, "http://backend.local/api/v1/auth/code/start");
  assert.equal(calls[0].body.purpose, "claim");
  assert.equal(calls[0].body.email, "guest@localtest.me");

  const fin = await claim.finish({ via: "email", email: "guest@localtest.me", code: "835423", password: "ClaimDev!2026" });
  assert.equal(fin.signedIn, true);
  assert.equal(fin.tokens.accessToken, "AT");
  assert.equal(fin.tokens.refreshToken, "RT");
});

test("guest claim NEGATIVE CONTROL: a wrong/expired code never signs anyone in", async () => {
  const fetchImpl = async (url, init) => {
    const body = init?.body ? JSON.parse(init.body) : {};
    if (url.endsWith("/auth/code/finish") && body.code === "000000")
      return json({ error: "That code is invalid or has expired.", code: "CODE_INVALID" }, 400);
    return json({}, 404);
  };
  const claim = makeGuestClaim({ apiBaseUrl: "http://backend.local/api/v1", fetchImpl });
  const bad = await claim.finish({ via: "email", email: "guest@localtest.me", code: "000000", password: "x" });
  assert.equal(bad.signedIn, false);
  assert.match(bad.error, /invalid|expired|CODE_INVALID/i);
});

test("guest claim (guest-token): start attaches the token as Bearer and never types an address", async () => {
  let seenAuth = null;
  const fetchImpl = async (url, init) => {
    seenAuth = init?.headers?.["authorization"] ?? init?.headers?.authorization ?? null;
    return json({ success: true, data: { maskedEmail: "g***@localtest.me" } });
  };
  const claim = makeGuestClaim({ apiBaseUrl: "http://backend.local/api/v1", fetchImpl });
  const start = await claim.start({ via: "guest-token", guestToken: "GTOKEN" });
  assert.equal(start.ok, true);
  assert.equal(start.maskedEmail, "g***@localtest.me");
  assert.equal(seenAuth, "Bearer GTOKEN");
});

/* ── 7. startClientCheckout hits the site's OWN origin proxy, no bearer ────── */

test("startClientCheckout POSTs the member wire body to the site's own proxy with no Authorization", async () => {
  let seen = null;
  const fetchImpl = async (url, init) => {
    seen = { url, method: init?.method, auth: init?.headers?.authorization ?? null, body: JSON.parse(init.body) };
    return json({ appointments: [{ id: "a1", bookingRef: "SPA-1" }], checkoutUrl: "https://stripe.test/x" });
  };
  const startClientCheckout = makeClientCheckout({ siteOrigin: "http://localhost:3100", fetchImpl });
  const memberState = step3Reducer(
    step3InitialState({ accountLoginEnabled: true, session: { signedIn: true, profile: PROFILE } }),
    { type: "SUBMIT_DETAILS", guest: guestFromProfile(PROFILE) },
  );
  const wire = toClientCheckoutBody(buildCheckoutPayload({ state: memberState, essentials: ESSENTIALS, origin: "http://localhost:3100" }));
  const result = await startClientCheckout(wire);
  assert.equal(seen.url, "http://localhost:3100/api/auth/proxy/client/booking/checkout");
  assert.equal(seen.method, "POST");
  assert.equal(seen.auth, null, "the bearer is attached server-side, never here");
  assert.equal("guest" in seen.body, false);
  assert.equal(result.appointments[0].bookingRef, "SPA-1");
  assert.equal(result.guestSessionToken, undefined, "the member path returns no guest token");
});
