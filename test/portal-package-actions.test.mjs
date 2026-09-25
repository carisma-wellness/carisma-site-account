/**
 * Package cards: Pay now / Book now (2026-09-25).
 *
 * The rule: money owed → Pay now AND Book now; paid in full → Book now only.
 * Every positive has a negative control beside it — a package that is not live,
 * a package the server did not describe well enough to book without charging.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildWalletModel,
  walletHTML,
  packageActions,
  packagePayCall,
  packageBookCall,
  packageBookDialogHTML,
  packageBookBarHTML,
  readCheckoutUrl,
  readBookedAppointmentId,
  packageBookFailureMessage,
  isTakenTimeRefusal,
  paymentReturnNote,
} from "../dist/ui/index.js";
import { isAllowed } from "../dist/index.js";

const ID = "4b8c2a1e-1111-4222-8333-444455556666";
const BRAND = "9f0e1d2c-aaaa-4bbb-8ccc-ddddeeeeffff";
const SVC = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const VENUE = "0f1e2d3c-4b5a-4968-8776-655443322110";

/** The GET /client/packages wire shape (ClientPackageWalletDTO), per item. */
function wire(over = {}) {
  return {
    id: ID,
    planName: "12 Lipocavitation",
    status: "ACTIVE",
    amountPaid: 150.76,
    amountDue: 449.24,
    availableSessions: 3,
    brandId: BRAND,
    venues: [{ brandLocationId: VENUE, name: "Carisma Slimming" }],
    items: [{ serviceName: "Lipocavitation", remaining: 12, total: 12, serviceId: SVC, serviceOptionId: null }],
    ...over,
  };
}
const card = (over) => buildWalletModel({ packages: [wire(over)] }).packages[0];
const html = (over) => walletHTML(buildWalletModel({ packages: [wire(over)] }));

test("owed money → Pay now AND Book now", () => {
  const h = html();
  assert.match(h, /data-cw-action="package-pay"[^>]*>Pay now</);
  assert.match(h, /data-cw-action="package-book"[^>]*>Book now</);
  assert.match(h, /€449\.24 still to pay/);
});

test("paid in full → Book now only, and it is the primary button", () => {
  const h = html({ amountDue: 0, amountPaid: 600 });
  assert.doesNotMatch(h, /package-pay/);
  assert.match(h, /cw-btn--primary[^"]*" data-cw-action="package-book"/);
});

test("the per-item counts reach the meter (the live wire has no flat session fields)", () => {
  const p = card({ items: [
    { serviceName: "Lipocavitation", remaining: 9, total: 12, serviceId: SVC },
    { serviceName: "Consultation", remaining: 1, total: 1, serviceId: SVC },
  ] });
  assert.equal(p.sessionsLeft, 10);
  assert.equal(p.sessionsTotal, 13);
  assert.match(html(), /12 of 12 sessions left/);
});

test("NEGATIVE: an expired / cancelled package offers neither button", () => {
  for (const status of ["EXPIRED", "CANCELLED", "COMPLETED"]) {
    const h = html({ status });
    assert.doesNotMatch(h, /package-pay|package-book/, status);
  }
});

test("NEGATIVE: no sessions left → no Book now, but money owed still offers Pay now", () => {
  const h = html({ items: [{ serviceName: "Lipocavitation", remaining: 0, total: 12, serviceId: SVC }] });
  assert.doesNotMatch(h, /package-book/);
  assert.match(h, /package-pay/);
});

test("NEGATIVE: an older server with no venues / brand → no Book now (never the charging pop-up)", () => {
  assert.equal(packageActions(card({ venues: undefined })).book, false);
  assert.equal(packageActions(card({ brandId: undefined })).book, false);
  assert.equal(packageActions(card({ id: undefined })).pay, false);
  // A venue id that is not a uuid is dropped, not sent.
  assert.equal(card({ venues: [{ brandLocationId: "nope", name: "X" }] }).venues.length, 0);
});

test("sessions left but none unlocked yet → says so, offers Pay now, no Book now", () => {
  const h = html({ availableSessions: 0 });
  assert.match(h, /Your next session unlocks once it's paid/);
  assert.match(h, /package-pay/);
  assert.doesNotMatch(h, /package-book/);
});

test("a hostile package name is escaped in the card and in the button labels", () => {
  const h = html({ planName: '<img src=x onerror=alert(1)>"' });
  assert.doesNotMatch(h, /<img/);
});

test("pay call: the server's own path, only the origin in the body", () => {
  const c = packagePayCall(ID, "https://www.carismaslimming.com");
  assert.equal(c.method, "POST");
  assert.equal(c.path, `/api/auth/proxy/client/packages/${ID}/pay-balance`);
  assert.deepEqual(c.body, { origin: "https://www.carismaslimming.com" });
  assert.deepEqual(packagePayCall(ID, null).body, {});
});

test("book call: a PACKAGE checkout on the package — never FULL/DEPOSIT, no amount", () => {
  const c = packageBookCall({
    brandId: BRAND, clientPackageId: ID, serviceId: SVC, serviceOptionId: null,
    brandLocationId: VENUE, startTime: "2026-10-02T08:00:00.000Z", origin: "https://www.carismaslimming.com",
  });
  assert.equal(c.path, "/api/auth/proxy/client/booking/checkout");
  assert.equal(c.body.paymentType, "PACKAGE");
  assert.equal(c.body.clientPackageId, ID);
  assert.equal(c.body.totalAmount, undefined);
  assert.equal(c.body.amountToPay, undefined);
  const line = c.body.participants[0].services[0];
  assert.deepEqual(line, { serviceId: SVC, brandLocationId: VENUE, startTime: "2026-10-02T08:00:00.000Z" });
});

test("the proxy allows the package pay-balance POST and nothing looser", () => {
  assert.equal(isAllowed("POST", `/client/packages/${ID}/pay-balance`), true);
  assert.equal(isAllowed("GET", `/client/packages/${ID}/pay-balance`), false);
  assert.equal(isAllowed("POST", `/client/packages/${ID}/instalment-intent`), false);
  assert.equal(isAllowed("POST", `/client/packages/x/../../auth/pay-balance`), false);
});

test("checkout URL: https only; appointment id read from every shape the checkout has used", () => {
  assert.equal(readCheckoutUrl({ success: true, data: { checkoutUrl: "https://checkout.stripe.com/c/x" } }), "https://checkout.stripe.com/c/x");
  assert.equal(readCheckoutUrl({ data: { checkoutUrl: "javascript:alert(1)" } }), "");
  assert.equal(readBookedAppointmentId({ data: { appointmentId: "a1" } }), "a1");
  assert.equal(readBookedAppointmentId({ data: { appointment: { id: "a2" } } }), "a2");
  assert.equal(readBookedAppointmentId({ data: { appointments: [{ id: "a3" }] } }), "a3");
  assert.equal(readBookedAppointmentId({ data: { appointmentIds: ["a4"] } }), "a4");
  assert.equal(readBookedAppointmentId({ data: {} }), "");
});

test("refusals: a locked session says pay first; a taken time is told apart from a package refusal", () => {
  assert.match(packageBookFailureMessage({ code: "PACKAGE_SESSION_LOCKED" }, 409, "x"), /unlocks once it's paid/);
  assert.equal(isTakenTimeRefusal({ code: "SLOT_TAKEN" }, 409), true);
  assert.equal(isTakenTimeRefusal({ code: "PACKAGE_SESSION_LOCKED" }, 409), false);
  assert.equal(isTakenTimeRefusal({}, 400), false);
});

test("the sheet: says nothing is charged; shows choices only when there is a choice", () => {
  const one = packageBookDialogHTML(
    { packageName: "P", venues: [{ key: VENUE, label: "V" }], venueKey: VENUE, treatments: [{ key: "t", label: "Lipo" }], treatmentKey: "t", stripStart: "2026-09-25", minDate: "2026-09-25" },
    [], "2026-09-25",
  );
  assert.match(one, /nothing is charged/);
  assert.doesNotMatch(one, /data-cw-pk-venue|data-cw-pk-treat/);
  const two = packageBookDialogHTML(
    { packageName: "P", venues: [{ key: "a", label: "A" }, { key: "b", label: "B" }], venueKey: "a", treatments: [{ key: "t", label: "Lipo" }], treatmentKey: "t", stripStart: "2026-09-25", minDate: "2026-09-25" },
    [], "2026-09-25",
  );
  assert.equal((two.match(/data-cw-pk-venue=/g) || []).length, 2);
  assert.match(packageBookBarHTML("Thu 2 Oct, 10:00"), /data-cw-pk-commit[^>]*>Book this session</);
});

test("coming back from a package payment says so without claiming it already reads paid", () => {
  const n = paymentReturnNote("?paid=package");
  assert.equal(n.tone, "ok");
  assert.match(n.text, /updates in a moment/);
  assert.equal(paymentReturnNote("?paid=packages"), null);
});
