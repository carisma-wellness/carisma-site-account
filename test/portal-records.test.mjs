/**
 * Wave 2B — Wallet, Payments, Membership, Documents.
 *
 * Every positive assertion here has a negative control beside it: a total
 * that must NOT include packages, a page that must NOT carry a combined pay
 * button, a document with no link that must NOT render an anchor.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildWalletModel,
  walletHTML,
  walletTotal,
  walletElsewhere,
  walletSources,
  buildStatementModel,
  statementHTML,
  monthOf,
  buildDocumentsModel,
  documentsHTML,
  documentTitle,
  buildMembershipModel,
  membershipHTML,
  bodyFor,
  ledeFor,
} from "../dist/ui/index.js";
import { PORTAL_RECORDS_CSS } from "../dist/ui/styles/index.js";

const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const count = (html, re) => (html.match(re) || []).length;

/* ── Wallet ────────────────────────────────────────────────────────────── */

const FULL_WALLET = {
  giftCards: { data: [
    { code: "GC-4K7Q-19", balance: 50, originalValue: 100, expiresAt: "2027-01-20T10:00:00.000Z", purchaserName: "Sarah" },
    { code: "GC-9P2M-44", balance: 150, originalValue: 150 },
  ] },
  packages: { data: [{ planNameSnapshot: "Six Signature Facials", sessionsRemaining: 4, sessionsTotal: 6, amountDue: 60 }] },
  credit: { data: { balance: 85 } },
};

test("Available to spend is credit plus gift-card balances — packages are sessions, not money", () => {
  const m = buildWalletModel(FULL_WALLET);
  assert.equal(walletTotal(m), 285);
  // NEGATIVE CONTROL: the package's €60 owed and its six sessions add nothing.
  const withoutPackage = buildWalletModel({ ...FULL_WALLET, packages: null });
  assert.equal(walletTotal(withoutPackage), walletTotal(m));
  // A spent (or corrupt negative) card never subtracts.
  assert.equal(walletTotal(buildWalletModel({ giftCards: [{ balance: -20 }], credit: 10 })), 10);
  const html = walletHTML(m);
  assert.match(text(html), /Available to spend €285\.00/);
  assert.match(text(html), /Credit €85\.00 · 2 gift cards · 1 package/);
});

/* The real GET /client/gift-cards card shape (backend ClientGiftCardWalletDTO). */
const card = (code, balance, brandKey, brandName) => ({
  id: code, code, brandKey, brandId: `b-${brandKey}`, brandName, amount: balance, balance, currency: "EUR", status: "active",
});
const MIXED_WALLET = {
  giftCards: {
    success: true,
    data: {
      cards: [
        card("AES0000001", 30, "aesthetics", "Carisma Aesthetics"),
        card("SPA0000001", 40, "spa", "Carisma Spa"),
        card("SLM0000001", 25, "slimming", "Carisma Slimming"),
        { id: "n1", code: "NOBRAND001", amount: 10, balance: 10, currency: "EUR", status: "active" },
      ],
    },
  },
  credit: { data: { balance: 5 } },
};

test("Available to spend counts credit plus THIS site's gift cards; other brands' are listed and named once", () => {
  const m = buildWalletModel(MIXED_WALLET);
  // Aesthetics: credit 5 + its own card 30 + the card that names no brand 10.
  assert.equal(walletTotal(m, "Carisma Aesthetics"), 45);
  assert.equal(walletElsewhere(m, "Carisma Aesthetics"), 65);
  const html = walletHTML(m, { siteBrand: "Carisma Aesthetics" });
  assert.match(text(html), /Available to spend €45\.00/);
  assert.match(text(html), /€65\.00 more on gift cards for other Carisma brands/);
  assert.equal(count(html, /more on gift cards for other Carisma brands/g), 1, "one quiet line");
  assert.match(html, /class="cw-balance__sources cw-balance__elsewhere"/);
  // Every card is still listed, each under its own brand.
  assert.equal(count(html, /class="cw-gift[ "]/g), 4);
  for (const brand of ["Carisma Aesthetics", "Carisma Spa", "Carisma Slimming"]) {
    assert.match(html, new RegExp(`class="cw-gift__brand">${brand}<`), brand);
  }
  // The Spa site counts the Spa card instead.
  assert.equal(walletTotal(m, "Carisma Spa"), 55);
  assert.equal(walletElsewhere(m, "Carisma Spa"), 55);
});

test("Hair Clinic counts Aesthetics cards (one programme family); Slimming does not", () => {
  const m = buildWalletModel(MIXED_WALLET);
  assert.equal(walletTotal(m, "Carisma Hair Clinic"), 45);
  assert.equal(walletTotal(m, "Carisma Slimming"), 40);
  // A card named only by its brand (no key) is placed by its name.
  const named = buildWalletModel({ giftCards: [{ code: "X", balance: 20, brandName: "Carisma Hair Clinic" }] });
  assert.equal(walletTotal(named, "Carisma Aesthetics"), 20);
  assert.equal(walletTotal(named, "Carisma Spa"), 0);
});

test("with no site brand (a test, an unknown host) the headline keeps the old total, and no 'more' line", () => {
  const m = buildWalletModel(MIXED_WALLET);
  assert.equal(walletTotal(m), 110);
  assert.equal(walletElsewhere(m), 0);
  const html = walletHTML(m);
  assert.match(text(html), /Available to spend €110\.00/);
  assert.doesNotMatch(html, /more on gift cards for other Carisma brands/);
  // NEGATIVE CONTROL: only this site's cards held ⇒ no "more" line either.
  const own = buildWalletModel({ giftCards: [card("AES0000002", 30, "aesthetics", "Carisma Aesthetics")] });
  assert.doesNotMatch(walletHTML(own, { siteBrand: "Carisma Aesthetics" }), /more on gift cards/);
});

test("the wallet page gets the site brand from bodyFor's context", () => {
  const answers = [MIXED_WALLET.giftCards, null, MIXED_WALLET.credit];
  assert.match(text(bodyFor("wallet", answers, { siteBrand: "Carisma Slimming" })), /Available to spend €40\.00/);
  assert.match(text(bodyFor("wallet", answers)), /Available to spend €110\.00/);
});

test("the sources line names only what exists", () => {
  assert.equal(walletSources(buildWalletModel({ credit: 85 })), "Credit €85.00");
  assert.equal(walletSources(buildWalletModel({ giftCards: [{ balance: 5 }] })), "1 gift card");
});

test("a member holding only package sessions sees no money hero (never '€0.00 available')", () => {
  const html = walletHTML(buildWalletModel({ packages: [{ name: "Six facials", sessionsRemaining: 4, sessionsTotal: 6 }] }));
  assert.doesNotMatch(html, /Available to spend/);
  assert.match(html, /Six facials/);
});

test("a gift card shows balance, what it was worth, its expiry and its code", () => {
  const html = walletHTML(buildWalletModel(FULL_WALLET));
  assert.equal(count(html, /class="cw-gift[ "]/g), 2);
  assert.match(html, /class="cw-gift__code">GC-4K7Q-19</);
  assert.match(text(html), /€50\.00 of €100\.00 · valid until 20 Jan 2027/);
  // The rail is keyboard-scrollable and named.
  assert.match(html, /class="cw-gifts" tabindex="0" role="list" aria-label="Gift cards"/);
});

test("a package meter has one segment per session, filled for each one left", () => {
  const html = walletHTML(buildWalletModel(FULL_WALLET));
  assert.equal(count(html, /cw-meter__seg/g), 6);
  assert.equal(count(html, /cw-meter__seg is-on/g), 4);
  assert.match(html, /aria-label="4 of 6 sessions left"/);
  assert.match(text(html), /€60\.00 still to pay/);
  // NEGATIVE CONTROL: nothing owed, no owed line.
  const paid = walletHTML(buildWalletModel({ packages: [{ name: "P", sessionsRemaining: 1, sessionsTotal: 2 }] }));
  assert.doesNotMatch(paid, /still to pay/);
  // Thirty sessions would be slivers: one bar instead.
  const big = walletHTML(buildWalletModel({ packages: [{ name: "P", sessionsRemaining: 12, sessionsTotal: 30 }] }));
  assert.equal(count(big, /cw-meter__seg/g), 0);
  assert.match(big, /cw-meter--bar/);
});

test("an empty wallet uses the empty pattern with a quiet gift-card door, never a primary", () => {
  const html = walletHTML(buildWalletModel({}));
  assert.match(html, /class="cw-empty/);
  assert.match(html, /No credit or gift cards yet/);
  assert.match(html, /<a class="cw-btn cw-btn--quiet" href="\/gifts">Buy a gift card/);
  assert.doesNotMatch(html, /cw-btn--primary/);
});

/* ── Payments ──────────────────────────────────────────────────────────── */

const STATEMENT = {
  success: true,
  data: {
    totalDue: 75,
    due: [
      { kind: "appointment_balance", description: "Lipocavitation", amountDue: 40, amountPaid: 80, total: 120, dueAt: "2026-09-24T08:00:00.000Z", appointmentId: "u2" },
      { kind: "cancellation_fee", description: "Missed appointment — Hammam Ritual", amountDue: 35, dueAt: "2026-08-24T08:00:00.000Z", appointmentId: "p3" },
    ],
    history: [
      { kind: "appointment_balance", description: "Hydrafacial", amountPaid: 95, total: 95, occurredAt: "2026-09-13T09:00:00.000Z", appointmentId: "p1" },
      // 22:30 UTC on 31 Aug is 00:30 on 1 September in Malta.
      { kind: "membership_invoice", description: "Gold Membership", amountPaid: 49, total: 49, occurredAt: "2026-08-31T22:30:00.000Z" },
      { kind: "membership_invoice", description: "Gold Membership", amountPaid: 49, total: 49, occurredAt: "2026-07-31T09:00:00.000Z" },
    ],
  },
};

test("owed: a warn summary, and every owed row carries its OWN pay button — never a combined one", () => {
  const html = statementHTML(buildStatementModel(STATEMENT));
  assert.match(text(html), /€75\.00 to pay 2 items/);
  assert.equal(count(html, /data-cw-action="pay"/g), 2);
  assert.match(html, /data-cw-action="pay" data-cw-appt="u2"/);
  assert.match(html, /data-cw-action="pay" data-cw-appt="p3"/);
  assert.match(text(html), /Pay €40\.00/);
  // Two owed rows: neither outranks the other.
  assert.equal(count(html, /cw-btn--primary/g), 0);
  assert.equal(count(html, /cw-btn--secondary cw-btn--sm cw-ledger__pay/g), 2);
  // NEGATIVE CONTROL: no button pays the total.
  assert.doesNotMatch(text(html), /Pay €75\.00/);
});

test("a single owed row is the page's one primary", () => {
  const one = { data: { totalDue: 40, due: [STATEMENT.data.due[0]], history: [] } };
  const html = statementHTML(buildStatementModel(one));
  assert.equal(count(html, /cw-btn--primary/g), 1);
});

test("an owed row with no booking behind it is settled at the desk, not with a dead button", () => {
  const html = statementHTML(buildStatementModel({ data: { totalDue: 20, due: [{ description: "Invoice", amountDue: 20 }], history: [] } }));
  assert.equal(count(html, /data-cw-action="pay"/g), 0);
  assert.match(html, /Pay at the desk/);
});

test("each row title links to its booking when there is one", () => {
  const html = statementHTML(buildStatementModel(STATEMENT));
  assert.match(html, /href="\/account\/bookings\/u2">Lipocavitation</);
  assert.match(html, /href="\/account\/bookings\/p1">Hydrafacial</);
  // NEGATIVE CONTROL: the membership invoice has no booking, so no link.
  assert.doesNotMatch(html, /href="[^"]*">Gold Membership</);
});

test("history groups by month on the MALTA clock, newest first", () => {
  assert.equal(monthOf("2026-08-31T22:30:00.000Z").label, "September 2026");
  assert.equal(monthOf("2026-08-31T21:30:00.000Z").label, "August 2026"); // 23:30 Malta
  const html = statementHTML(buildStatementModel(STATEMENT));
  const months = [...html.matchAll(/cw-ledger__month">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(months, ["September 2026", "July 2026"]);
});

test("nothing owed reads as a calm settled state, with no pay button anywhere", () => {
  const html = statementHTML(buildStatementModel({ data: { totalDue: 0, due: [], history: STATEMENT.data.history } }));
  assert.match(html, /You're all settled\./);
  assert.equal(count(html, /data-cw-action="pay"/g), 0);
  assert.doesNotMatch(html, /cw-owed/);
});

/* ── Documents ─────────────────────────────────────────────────────────── */

test("a document shows its title without the extension, a file tile, and opens safely in a new tab", () => {
  assert.equal(documentTitle("Laser consent form.pdf"), "Laser consent form");
  assert.equal(documentTitle(".pdf"), ".pdf");
  const html = documentsHTML(
    buildDocumentsModel({ data: [
      { id: "d1", category: "consent", name: "Laser consent form.pdf", mimeType: "application/pdf", url: "https://s3/x?X-Amz-Signature=a", uploadedAt: "2026-09-14T09:00:00.000Z" },
      { id: "d2", name: "before.jpg", isImage: true, url: "https://s3/y", uploadedAt: "2026-09-10T09:00:00.000Z" },
    ] }),
  );
  assert.match(html, /cw-doc__title">Laser consent form</);
  assert.match(html, /<span>PDF<\/span>/);
  assert.match(html, /<span>IMG<\/span>/);
  assert.match(text(html), /14 Sept 2026 · Consent form/);
  assert.equal(count(html, /target="_blank" rel="noreferrer"/g), 2);
});

test("a document with no link says ask at the desk and renders no anchor", () => {
  const html = documentsHTML(buildDocumentsModel({ data: [{ id: "d1", name: "consent.pdf", url: null }] }));
  assert.match(html, /Ask at the desk/);
  assert.doesNotMatch(html, /<a /);
});

test("no documents uses the spec's empty sentence", () => {
  assert.match(documentsHTML([]), /Consent forms and aftercare guides will appear here after your visit\./);
});

/* ── Membership ────────────────────────────────────────────────────────── */

const ACTIVE = { data: [{ id: "m1", status: "ACTIVE", price: 49, membership: { name: "Gold Membership" }, nextBillingAt: "2026-10-01T10:00:00.000Z", storedValue: 30 }] };

test("the membership card carries the plan, the member's first name and the status", () => {
  const html = membershipHTML(buildMembershipModel(ACTIVE), { memberName: "Mert" });
  assert.match(html, /cw-mcard__plan">Gold Membership</);
  assert.match(html, /cw-mcard__label">Mert</);
  assert.match(html, /cw-mcard__chip--ok">Active</);
  assert.match(text(html), /Monthly €49\.00 Next payment 1 Oct 2026 Balance €30\.00/);
  // NEGATIVE CONTROL: no name given, no name invented.
  assert.match(membershipHTML(buildMembershipModel(ACTIVE)), /cw-mcard__label">Member</);
});

test("pause is a secondary with its explanation; paused offers resume instead", () => {
  const html = membershipHTML(buildMembershipModel(ACTIVE));
  assert.match(html, /class="cw-btn cw-btn--secondary" data-cw-action="membership-pause" data-cw-membership="m1"/);
  assert.match(html, /Pausing stops your monthly payments/);
  assert.doesNotMatch(html, /membership-resume/);
  const paused = membershipHTML(buildMembershipModel({ data: [{ id: "m1", status: "PAUSED", membership: { name: "Gold" } }] }));
  assert.match(paused, /data-cw-action="membership-resume"/);
  assert.doesNotMatch(paused, /membership-pause/);
  assert.match(text(paused), /Next payment Paused/);
});

test("a cancelled membership offers no pause or resume", () => {
  const html = membershipHTML(buildMembershipModel({ data: [{ id: "m1", status: "CANCELLED", membership: { name: "Gold" } }] }));
  assert.doesNotMatch(html, /data-cw-action="membership-/);
  assert.match(html, /cw-mcard__chip--bad">Cancelled</);
});

test("card change and cancel are a quiet sentence, with the brand phone only when given", () => {
  const withPhone = membershipHTML(buildMembershipModel(ACTIVE), { contactPhone: "+35627802062" });
  assert.match(withPhone, /speak to the team on <a class="cw-link" href="tel:\+35627802062">\+356 2780 2062<\/a>\./);
  const without = membershipHTML(buildMembershipModel(ACTIVE));
  assert.match(without, /speak to the team\./);
  assert.doesNotMatch(without, /tel:/);
});

test("no membership invites to the brand's membership page", () => {
  const html = membershipHTML(buildMembershipModel({ data: [] }));
  assert.match(html, /class="cw-empty/);
  assert.match(html, /href="\/membership"/);
});

test("bodyFor passes page context through to the membership card", () => {
  const html = bodyFor("membership", [ACTIVE], { memberName: "Mert", contactPhone: "+35627802062" });
  assert.match(html, /cw-mcard__label">Mert</);
  assert.match(html, /tel:\+35627802062/);
  // Old two-argument callers still render.
  assert.match(bodyFor("membership", [ACTIVE]), /Gold Membership/);
});

/* ── Cross-cutting ─────────────────────────────────────────────────────── */

test("every record view masks personal values and uses the new root, not the legacy classes", () => {
  const views = [
    walletHTML(buildWalletModel(FULL_WALLET)),
    statementHTML(buildStatementModel(STATEMENT)),
    documentsHTML(buildDocumentsModel({ data: [{ id: "d1", name: "a.pdf", url: "https://s3/x" }] })),
    membershipHTML(buildMembershipModel(ACTIVE)),
  ];
  for (const html of views) {
    assert.match(html, /^<div class="cw-rec cw-rec--/);
    assert.match(html, /data-clarity-mask="True"/);
    assert.doesNotMatch(html, /carisma-portal__/);
  }
});

test("the records sheet retires the legacy wrapper and paints cards from card-bg / card-ink", () => {
  assert.match(PORTAL_RECORDS_CSS, /\.carisma-portal \.cw-legacy:has\(> \.cw-rec\) \{ display: contents; \}/);
  assert.match(PORTAL_RECORDS_CSS, /var\(--cw-account-card-bg\)/);
  assert.match(PORTAL_RECORDS_CSS, /var\(--cw-account-card-ink\)/);
  assert.match(PORTAL_RECORDS_CSS, /scroll-snap-type: x mandatory/);
});

test("record views open on their own hero or rows, so they carry no lede that repeats them", () => {
  for (const v of ["wallet", "payments", "documents", "membership"]) assert.equal(ledeFor(v), "", v);
});
