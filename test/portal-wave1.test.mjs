/**
 * Wave 1 of the member-account redesign: the shell, the booking card, the
 * Overview composition, tri-state reads and the token-only stylesheet.
 * Every behaviour carries a negative control — a test that could not fail
 * proves nothing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildApptCard,
  buildApptCards,
  apptCardHTML,
  buildPortalModel,
  accountPortalHTML,
  overviewBodyHTML,
  bookingsBodyHTML,
  needsYou,
  walletSummary,
  linkifyPhones,
  greetingFor,
  errorBlockHTML,
} from "../dist/ui/portal.js";
import { classifyRead, siteBrandFromHost } from "../dist/ui/browser.js";
import { requestsFor } from "../dist/ui/portalData.js";
import { PORTAL_RULES_CSS, PORTAL_TOKENS_CSS } from "../dist/ui/styles/index.js";
import { ACCOUNT_CHROME_CSS } from "../dist/ui/chromeCss.js";
import { buildWalletModel } from "../dist/ui/records.js";
import { isAllowed } from "../dist/index.js";

const H = 3_600_000;
const NOW = new Date("2026-09-23T10:00:00.000Z");
const iso = (hours) => new Date(NOW.getTime() + hours * H).toISOString();

const OPEN = {
  canConfirm: true,
  canReschedule: true,
  rescheduleClosesAt: iso(48),
  canCancel: true,
  cancelIsFree: true,
  freeCancelEndsAt: iso(48),
  canPayBalance: false,
  balanceDue: 0,
  canRebook: false,
  reason: null,
};
const CLOSED = {
  ...OPEN,
  canReschedule: false,
  reason: "Online changes close 24 hours before your appointment. To move this one, call Pulse on +35627802062.",
};

function row(id, hours, over = {}) {
  return {
    id,
    status: "BOOKED",
    startTime: iso(hours),
    endTime: iso(hours + 1),
    brandName: "Carisma Spa",
    locationName: "Hugo's Hotel",
    primaryServiceName: `Treatment ${id}`,
    actions: OPEN,
    ...over,
  };
}

const session = {
  signedIn: true,
  profile: { firstName: "Jane", lastName: "Doe", emailMasked: "j***@gmail.com" },
  upcoming: [],
};

/* ── Order ─────────────────────────────────────────────────────────────── */

test("upcoming cards run soonest-first and past cards latest-first", () => {
  const body = { success: true, data: [row("c", 72), row("a", 5), row("b", 28)] };
  assert.deepEqual(buildApptCards(body, "upcoming").map((c) => c.id), ["a", "b", "c"]);
  const past = { success: true, data: [row("x", -500), row("y", -24), row("z", -200)] };
  assert.deepEqual(buildApptCards(past, "past").map((c) => c.id), ["y", "z", "x"]);
});

test("NEGATIVE CONTROL: the sort is a real sort, not the wire order", () => {
  const body = { data: [row("c", 72), row("a", 5)] };
  const ids = buildApptCards(body, "upcoming").map((c) => c.id);
  assert.notDeepEqual(ids, body.data.map((r) => r.id));
});

test("an unparseable start never displaces a real next visit", () => {
  const body = { data: [row("bad", 0, { startTime: "someday" }), row("real", 30)] };
  assert.equal(buildApptCards(body, "upcoming")[0].id, "real");
});

/* ── The card's buttons come from `actions` and nowhere else ───────────── */

test("NEGATIVE CONTROL: a card with no actions block renders no buttons; the same card with one does", () => {
  const bare = { ...row("n", 30, { balance: { amount: 40 } }) };
  delete bare.actions;
  const without = apptCardHTML(buildApptCard(bare, "upcoming"));
  assert.doesNotMatch(without, /<button/);
  assert.doesNotMatch(without, /data-cw-action/);

  const withActions = apptCardHTML(
    buildApptCard(row("n", 30, { actions: { ...OPEN, canPayBalance: true, balanceDue: 40 } }), "upcoming"),
  );
  assert.match(withActions, /data-cw-action="reschedule" data-cw-appt="n"/);
  assert.match(withActions, /data-cw-action="pay" data-cw-appt="n"/);
  assert.match(withActions, />Pay €40\.00</);
});

test("Reschedule is on the card exactly when the server says canReschedule", () => {
  const yes = apptCardHTML(buildApptCard(row("r", 72), "upcoming"));
  assert.match(yes, /data-cw-action="reschedule"/);
  assert.match(yes, /aria-label="Reschedule Treatment r on /);
  const no = apptCardHTML(buildApptCard(row("r", 72, { actions: { ...OPEN, canReschedule: false } }), "upcoming"));
  assert.doesNotMatch(no, /data-cw-action="reschedule"/);
});

test("a truthy-looking canReschedule is not a true one", () => {
  const html = apptCardHTML(buildApptCard(row("t", 72, { actions: { ...OPEN, canReschedule: "yes" } }), "upcoming"));
  assert.doesNotMatch(html, /data-cw-action="reschedule"/);
});

test("a past booking never offers Reschedule, even if the flag leaked through", () => {
  const html = apptCardHTML(buildApptCard(row("p", -48), "past"));
  assert.doesNotMatch(html, /data-cw-action="reschedule"/);
});

test("the server's reason shows on an upcoming card only, with the phone as a tel: link", () => {
  const up = apptCardHTML(buildApptCard(row("u", 5, { actions: CLOSED }), "upcoming"));
  assert.match(up, /class="cw-reason"/);
  assert.match(up, /Online changes close 24 hours/);
  assert.match(up, /<a href="tel:\+35627802062">\+356 2780 2062<\/a>/);
  // Negative control: the SAME row as a past visit carries no reason line.
  const past = apptCardHTML(buildApptCard(row("u", -5, { actions: CLOSED }), "past"));
  assert.doesNotMatch(past, /cw-reason/);
  assert.doesNotMatch(past, /Online changes close/);
});

test("the reason line is escaped before phones are linked", () => {
  const html = linkifyPhones('<img src=x onerror=alert(1)> call +35627802062');
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
  assert.match(html, /tel:\+35627802062/);
});

test("every personal string on a card is masked, and the treatment links to its page", () => {
  const html = apptCardHTML(buildApptCard(row("m", 30), "upcoming"));
  assert.match(html, /<h3 class="cw-appt__title" data-clarity-mask="True">/);
  assert.match(html, /<p class="cw-appt__meta" data-clarity-mask="True">/);
  assert.match(html, /href="\/account\/bookings\/m"/);
});

test("the brand label appears only when the booking is another brand's", () => {
  const same = buildApptCard(row("s", 30), "upcoming", "Carisma Spa");
  const other = buildApptCard(row("s", 30, { brandName: "Carisma Slimming" }), "upcoming", "Carisma Spa");
  assert.equal(same.showBrand, false);
  assert.equal(other.showBrand, true);
  assert.match(apptCardHTML(other), /cw-appt__brand/);
  assert.doesNotMatch(apptCardHTML(same), /cw-appt__brand/);
});

test("Carisma Medical rows never become cards", () => {
  const body = { data: [row("med", 10, { brandName: "Carisma Medical" }), row("spa", 20)] };
  assert.deepEqual(buildApptCards(body, "upcoming").map((c) => c.id), ["spa"]);
});

/* ── The shell ─────────────────────────────────────────────────────────── */

function bodyRegion(html) {
  const start = html.indexOf('<div class="cw-body"');
  const end = html.indexOf('<footer class="cw-foot">');
  assert.ok(start > 0 && end > start, "shell has a body and a foot");
  return html.slice(start, end);
}

test("sign-out lives in the rail and the page foot, never in the main content", () => {
  for (const view of ["home", "bookings", "details"]) {
    const html = accountPortalHTML(
      buildPortalModel(session, view, { upcomingOverride: { data: [row("a", 30)] }, now: NOW }),
    );
    // Control: sign-out IS on the page…
    assert.match(html, /data-carisma-signout/, view);
    assert.match(html, /<div class="cw-rail__foot">[\s\S]*data-carisma-signout/, view);
    // …and not inside the content column.
    assert.doesNotMatch(bodyRegion(html), /data-carisma-signout/, view);
  }
});

test("the page header has no CARISMA eyebrow and no repeated email", () => {
  const html = accountPortalHTML(buildPortalModel(session, "bookings", { upcomingOverride: { data: [] }, now: NOW }));
  const head = html.slice(html.indexOf('<header class="cw-head">'), html.indexOf("</header>"));
  assert.doesNotMatch(head, /Carisma/i);
  assert.doesNotMatch(head, /j\*\*\*@gmail\.com/);
  // The email is still on the page — in the rail, masked.
  assert.match(html, /cw-member__email" data-clarity-mask="True">j\*\*\*@gmail\.com/);
});

test("one labelled nav with the current page marked", () => {
  const html = accountPortalHTML(buildPortalModel(session, "bookings", { now: NOW }));
  assert.equal((html.match(/<nav /g) || []).length, 1);
  assert.match(html, /<nav class="cw-nav" aria-label="Account">/);
  assert.match(html, /href="\/account\/bookings" aria-current="page"/);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
});

test("the shell carries one persistent polite status region", () => {
  const html = accountPortalHTML(buildPortalModel(session, "home", { now: NOW }));
  assert.equal((html.match(/role="status" aria-live="polite"/g) || []).length, 1);
});

test("Overview greets by first name on the Malta clock", () => {
  // 10:00 UTC = 12:00 Malta (CEST) → afternoon; 04:00 UTC = 06:00 → morning.
  assert.equal(greetingFor(new Date("2026-09-23T10:00:00Z")), "Good afternoon");
  assert.equal(greetingFor(new Date("2026-09-23T04:00:00Z")), "Good morning");
  assert.equal(greetingFor(new Date("2026-09-23T19:00:00Z")), "Good evening");
  const html = accountPortalHTML(buildPortalModel(session, "home", { now: NOW }));
  assert.match(html, /Good afternoon, Jane/);
});

/* ── Overview composition ──────────────────────────────────────────────── */

test("Overview reads the appointment LIST (which carries actions), not session.upcoming", () => {
  const urls = requestsFor("home");
  assert.equal(urls[0], "/api/auth/proxy/client/booking/appointments?filter=upcoming&limit=50");
  assert.ok(urls.includes("/api/auth/proxy/client/credit-balance"));
});

test("the next visit is the hero, with the one primary chosen Pay > Reschedule > Confirm", () => {
  const m = buildPortalModel(session, "home", {
    upcomingOverride: { data: [row("later", 72), row("next", 30, { actions: { ...OPEN, canPayBalance: true, balanceDue: 40 } })] },
    now: NOW,
  });
  const html = overviewBodyHTML(m);
  const hero = html.slice(html.indexOf('<section class="cw-next'), html.indexOf("</section>"));
  assert.match(hero, /Treatment next/);
  assert.match(hero, /cw-btn--primary" data-cw-action="pay"/);
  assert.match(hero, /cw-btn--secondary" data-cw-action="reschedule"/);
  assert.equal((hero.match(/cw-btn--primary/g) || []).length, 1);
});

test("Needs you lists only what the server made actionable, at most three", () => {
  const m = buildPortalModel(session, "home", {
    upcomingOverride: {
      data: [
        row("hero", 3),
        row("owe", 30, { actions: { ...OPEN, canPayBalance: true, balanceDue: 40 } }),
        row("closing", 50, { actions: { ...OPEN, rescheduleClosesAt: iso(4) } }),
        row("quiet", 200, { actions: { ...OPEN, rescheduleClosesAt: iso(170) } }),
      ],
    },
    past: { data: [row("miss", -300, { status: "NO_SHOW", actions: { ...OPEN, canPayBalance: true, balanceDue: 35 } })] },
    now: NOW,
  });
  const rows = needsYou(m, "hero");
  assert.deepEqual(rows.map((r) => r.card.id), ["owe", "closing", "miss"]);
  assert.match(rows[1].title, /Online changes close in 4 hours/);
  assert.match(rows[2].title, /Missed-visit fee/);
  // Negative control: a booking with no actions never needs you.
  const bare = row("bare", 30, { balance: { amount: 90 } });
  delete bare.actions;
  const none = buildPortalModel(session, "home", { upcomingOverride: { data: [row("h", 2), bare] }, now: NOW });
  assert.equal(needsYou(none, "h").length, 0);
});

test("the wallet strip appears only when there is value", () => {
  assert.equal(walletSummary(buildWalletModel({})), "");
  assert.equal(walletSummary(null), "");
  const w = buildWalletModel({
    credit: { data: { balance: 85 } },
    giftCards: { data: [{ code: "A", balance: 50 }, { code: "B", balance: 0 }] },
    packages: { data: [{ name: "Facials", sessionsRemaining: 4, sessionsTotal: 6 }] },
  });
  assert.equal(walletSummary(w), "€85.00 credit · 1 gift card · 4 of 6 sessions left");
});

test("a new member is invited to this brand's own booking door", () => {
  const html = overviewBodyHTML(
    buildPortalModel(session, "home", { upcomingOverride: { data: [] }, siteBrand: "Carisma Slimming", bookHref: "/book", now: NOW }),
  );
  assert.match(html, /Your next visit starts here\./);
  assert.match(html, /href="\/book">Book your free body analysis</);
});

/* ── Failed is not empty ───────────────────────────────────────────────── */

test("reads are tri-state: ok, empty and failed never merge", () => {
  assert.equal(classifyRead(true, 200, { success: true, data: [{ id: 1 }] }).state, "ok");
  assert.equal(classifyRead(true, 200, { success: true, data: [] }).state, "empty");
  assert.equal(classifyRead(true, 200, { data: [] }).state, "empty");
  assert.equal(classifyRead(false, 503, null).state, "failed");
  assert.equal(classifyRead(false, 0, null).state, "failed");
  assert.equal(classifyRead(false, 404, null).status, 404);
});

test("NEGATIVE CONTROL: a failed bookings read shows the error block, never 'nothing booked'", () => {
  const failed = bookingsBodyHTML(buildPortalModel(session, "bookings", { upcomingOverride: [], upcomingState: "failed", now: NOW }));
  assert.match(failed, /role="alert"/);
  assert.match(failed, /We couldn't load your bookings just now/);
  assert.match(failed, /data-cw-retry/);
  assert.doesNotMatch(failed, /Nothing booked yet/);
  const empty = bookingsBodyHTML(buildPortalModel(session, "bookings", { upcomingOverride: [], upcomingState: "empty", now: NOW }));
  assert.match(empty, /Nothing booked yet/);
  assert.doesNotMatch(empty, /role="alert"/);
});

test("the error block offers the brand's phone only when there is one", () => {
  assert.match(errorBlockHTML("bookings", "+35627802062"), /href="tel:\+35627802062">Call \+356 2780 2062/);
  assert.doesNotMatch(errorBlockHTML("bookings"), /tel:/);
});

test("a host names its brand; an unknown host names none", () => {
  assert.equal(siteBrandFromHost("www.carismaslimming.com"), "Carisma Slimming");
  assert.equal(siteBrandFromHost("www.pulsewellness.com"), "Pulse");
  assert.equal(siteBrandFromHost("localhost:4411"), "");
});

/* ── The stylesheet reads tokens only ──────────────────────────────────── */

const HEX = /#[0-9a-fA-F]{3,8}\b/;

test("no raw hex or rgba in any portal rule — only var(--cw-account-*)", () => {
  const hits = PORTAL_RULES_CSS.split("\n").filter((l) => HEX.test(l) || /rgba?\(/.test(l));
  assert.deepEqual(hits, []);
  assert.doesNotMatch(PORTAL_RULES_CSS, /#1c1917|#fff\b/i);
});

test("NEGATIVE CONTROL: the hex probe does fire — on the :root fallback block", () => {
  assert.match(PORTAL_TOKENS_CSS, HEX);
  assert.match(PORTAL_TOKENS_CSS, /^\s*:root \{/);
  // …and that block is the only place colour is written down.
  const rootBlocks = (ACCOUNT_CHROME_CSS.match(/:root\s*\{/g) || []).length;
  assert.equal(rootBlocks, 1);
});

test("every portal rule is scoped under .carisma-portal (site CSS can't leak in, ours can't leak out)", () => {
  const selectors = [...PORTAL_RULES_CSS.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(^|})\s*([^{}@]+)\{/g)]
    .map((m) => m[2].trim())
    .filter((s) => s && !/^(from|to|\d+%)$/.test(s));
  // Split on TOP-LEVEL commas only — the ones inside :is(…) belong to one selector.
  const topLevel = (sel) => {
    const out = [];
    let depth = 0;
    let cur = "";
    for (const ch of sel) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    return [...out, cur];
  };
  const loose = selectors.filter((s) => topLevel(s).some((part) => !part.trim().startsWith(".carisma-portal")));
  // Negative control: the probe does catch an unscoped rule.
  assert.equal(topLevel("h1, .carisma-portal .x").some((p) => !p.trim().startsWith(".carisma-portal")), true);
  assert.deepEqual(loose, []);
});

test("reduced motion is honoured and focus is always visible", () => {
  assert.match(PORTAL_RULES_CSS, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(PORTAL_RULES_CSS, /:focus-visible \{\s*outline: 2px solid var\(--cw-account-focus\);\s*outline-offset: 3px;/);
});

/* ── The allowlist gains exactly one read ──────────────────────────────── */

test("wallet availability is readable through the proxy, and nothing near it is", () => {
  assert.equal(isAllowed("GET", "/client/wallet/availability"), true);
  assert.equal(isAllowed("GET", "/client/wallet/availability?x=1"), true);
  // Negative controls: another verb, a deeper path, a sibling.
  assert.equal(isAllowed("POST", "/client/wallet/availability"), false);
  assert.equal(isAllowed("GET", "/client/wallet/availability/apple"), false);
  assert.equal(isAllowed("GET", "/client/wallet/availabilityx"), false);
  assert.equal(isAllowed("GET", "/client/wallet"), false);
});
