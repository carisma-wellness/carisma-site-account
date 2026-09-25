/**
 * Payments page: Pay now on package balances and membership invoices (2026-09-25).
 *
 * "Pay at the desk" stays only where no member door exists. Every positive has
 * a negative control beside it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildStatementModel,
  statementHTML,
  statementPayTarget,
  invoicePayCall,
  invoicePayConfirmCall,
  invoiceReturnFrom,
  statementPayFailureMessage,
  paymentReturnNote,
} from "../dist/ui/index.js";
import { isAllowed } from "../dist/index.js";

const ON = { invoicePay: true };
const PKG = "4b8c2a1e-1111-4222-8333-444455556666";
const INV = "7c1d2e3f-2222-4333-8444-555566667777";

/** The GET /client/account/statement wire shape (MemberStatement). */
function statement(due) {
  return { success: true, data: { totalDue: due.reduce((s, l) => s + l.amountDue, 0), due, history: [] } };
}
const pkgLine = (over = {}) => ({
  kind: "package_balance",
  id: PKG,
  status: "DUE",
  description: "12 Lipocavitation",
  amountDue: 449.24,
  amountPaid: 149.76,
  total: 599,
  dueAt: null,
  occurredAt: "2026-09-22T09:00:00.000Z",
  clientPackageId: PKG,
  ...over,
});
const invLine = (over = {}) => ({
  kind: "membership_invoice",
  id: INV,
  status: "OPEN",
  description: "Core — Standard protocol · MI-1790333877299-fc101419",
  amountDue: 99,
  amountPaid: 0,
  total: 99,
  dueAt: "2026-09-25T00:00:00.000Z",
  occurredAt: "2026-09-25T00:00:00.000Z",
  clientMembershipId: "0a0b0c0d-3333-4444-8555-666677778888",
  ...over,
});

test("a package balance offers Pay now, not Pay at the desk", () => {
  const html = statementHTML(buildStatementModel(statement([pkgLine()])));
  assert.match(html, /data-cw-action="statement-pay" data-cw-pay-kind="package" data-cw-pay-id="4b8c2a1e-/);
  assert.match(html, />Pay now</);
  assert.doesNotMatch(html, /Pay at the desk/);
});

test("negative: invoices stay at the desk until the site switches invoicePay on", () => {
  const html = statementHTML(buildStatementModel(statement([invLine()])));
  assert.match(html, /Pay at the desk/);
  assert.doesNotMatch(html, /data-cw-pay-kind="invoice"/);
});

test("an open membership invoice offers Pay now once invoicePay is on", () => {
  const html = statementHTML(buildStatementModel(statement([invLine()])), ON);
  assert.match(html, /data-cw-pay-kind="invoice" data-cw-pay-id="7c1d2e3f-/);
  assert.doesNotMatch(html, /Pay at the desk/);
});

test("both rows at once: each carries its own Pay now, neither is the page's primary", () => {
  const html = statementHTML(buildStatementModel(statement([pkgLine(), invLine()])), ON);
  assert.equal((html.match(/data-cw-action="statement-pay"/g) || []).length, 2);
  assert.doesNotMatch(html, /cw-btn--primary cw-btn--sm cw-ledger__pay/);
});

test("negative: a paid, void or draft invoice is never offered online", () => {
  for (const status of ["PAID", "VOID", "DRAFT", "paid"]) {
    const m = buildStatementModel(statement([invLine({ status, amountDue: 99 })]));
    assert.equal(statementPayTarget(m.due[0], ON), null, status);
  }
});

test("negative: a line without an id, or with nothing owed, stays at the desk", () => {
  const noId = buildStatementModel(statement([pkgLine({ id: "" })]));
  assert.match(statementHTML(noId), /Pay at the desk/);
  assert.equal(statementPayTarget({ ...noId.due[0], id: PKG, amountDue: 0 }), null);
});

test("negative: a fee with no booking behind it has no door, so it says Pay at the desk", () => {
  const html = statementHTML(buildStatementModel(statement([pkgLine({ kind: "cancellation_fee" })])));
  assert.match(html, /Pay at the desk/);
});

test("a booking balance keeps its own per-booking Pay", () => {
  const appt = "9d8c7b6a-5555-4666-8777-888899990000";
  const html = statementHTML(buildStatementModel(statement([pkgLine({ kind: "appointment_balance", appointmentId: appt })])));
  assert.match(html, /data-cw-action="pay" data-cw-appt="9d8c7b6a-/);
});

test("the package balance row is labelled Package", () => {
  const html = statementHTML(buildStatementModel(statement([pkgLine()])));
  assert.match(html, /Package · €149\.76 paid so far/);
});

test("invoice pay call: the server mints the amount; the body names only the origin", () => {
  const c = invoicePayCall(INV, "https://www.carismaslimming.com");
  assert.equal(c.path, `/api/auth/proxy/client/membership/invoices/${INV}/pay`);
  assert.equal(c.method, "POST");
  assert.deepEqual(c.body, { origin: "https://www.carismaslimming.com" });
  assert.deepEqual(invoicePayCall(INV, null).body, {});
  assert.deepEqual(invoicePayConfirmCall(INV, "cs_live_abc").body, { sessionId: "cs_live_abc" });
});

test("the proxy lets exactly the two invoice doors through", () => {
  assert.equal(isAllowed("POST", `/client/membership/invoices/${INV}/pay`), true);
  assert.equal(isAllowed("POST", `/client/membership/invoices/${INV}/pay/confirm`), true);
  // negative controls
  assert.equal(isAllowed("GET", `/client/membership/invoices/${INV}/pay`), false);
  assert.equal(isAllowed("POST", `/client/membership/invoices/not-an-id/pay`), false);
  assert.equal(isAllowed("POST", `/client/membership/invoices/${INV}/pay/extra`), false);
});

test("return from Stripe: shape-checked, and says the payment arrived", () => {
  assert.deepEqual(invoiceReturnFrom(`?invoice_paid=${INV}&session_id=cs_live_a1B2`), {
    invoiceId: INV,
    sessionId: "cs_live_a1B2",
  });
  assert.equal(invoiceReturnFrom(`?invoice_paid=nope&session_id=cs_live_a1B2`), null);
  assert.equal(invoiceReturnFrom(`?invoice_paid=${INV}&session_id=evil`), null);
  assert.equal(invoiceReturnFrom(""), null);
  assert.match(paymentReturnNote(`?invoice_paid=${INV}&session_id=cs_live_a1B2`).text, /Payment received/);
  assert.equal(paymentReturnNote("?invoice_paid=x"), null);
});

test("a refusal speaks the server's sentence, never a code or 'that time was taken'", () => {
  assert.equal(
    statementPayFailureMessage({ success: false, message: "This package is paid at the desk." }, 409),
    "This package is paid at the desk.",
  );
  const coded = statementPayFailureMessage({ message: "PACKAGE_BALANCE_PAY_AT_DESK" }, 409);
  assert.doesNotMatch(coded, /PACKAGE_BALANCE|time has just been taken/);
  assert.match(statementPayFailureMessage(null, 0), /couldn't open the payment/);
});
