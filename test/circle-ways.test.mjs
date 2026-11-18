import { test } from "node:test";
import assert from "./fixtures/plain-assert.mjs";
import {
  readCircle,
  circleWaysHTML,
  circleWaysCardsHTML,
  waysSummaryText,
  isAllowed,
  FORBIDDEN_PATHS,
  mountAccountPanel,
} from "../dist/index.js";
import { MARIA as MARIA_SPA_ONLY, SPA_ONLY, THREE_BRANDS } from "./fixtures/circle-v2.mjs";

/** Three houses on: every row the server sends is drawn (ADDENDUM X10 needs two or more for the brand rows). */
const MARIA = { ...MARIA_SPA_ONLY, brands: THREE_BRANDS };

/**
 * Ways to earn (surfaces §1.3 B): rows only from the member read's actions;
 * an Instagram row is a plain link to the brand's own profile (works signed
 * out and without JavaScript) and, signed in and live, the tap fires the award
 * ONCE per brand, never holding the link up. Money earns; reviews never do.
 */

test("rows come only from the API's actions, in its order, with its labels and figures", () => {
  const m = readCircle(MARIA);
  const html = circleWaysHTML(m);
  const order = MARIA.actions.map((a) => html.indexOf(a.label));
  assert.ok(order.every((i) => i > 0), "every action drawn");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "in the server's order");
  assert.equal(waysSummaryText(m), "3 of 6 done · €30.00 more to earn");
  assert.match(html, /First sign-in to the Carisma app<\/b><span data-clarity-mask="True">\+€2\.50 · 50 points/);
  assert.match(html, /Full Circle: your first purchase at the third brand<\/b><span data-clarity-mask="True">\+€25\.00 · 500 points · A first purchase of €20\.00 or more/);
  assert.match(html, /We never give points for public reviews, ratings, posts, tags or shares\./);
  assert.equal(circleWaysHTML(readCircle({ ...MARIA, actions: [], actionsSummary: undefined })).includes("cc-ways__list"), false, "no actions → no rows (never typed ones)");
  assert.equal(circleWaysHTML(null), "");
});

test("X10: a Spa-only programme draws no second-brand or Full Circle row, and the count is what is drawn", () => {
  const m = readCircle(MARIA_SPA_ONLY);
  assert.deepEqual(m.actions.map((a) => a.key), ["verified_email", "app", "instagram", "first_house"]);
  const html = circleWaysHTML(m) + circleWaysCardsHTML(m);
  assert.doesNotMatch(html, /Full Circle|second brand|third brand|Carisma Aesthetics|Carisma Slimming/);
  // The server's "3 of 6" counted rows that are not drawn: the summary is the drawn rows' own.
  assert.equal(waysSummaryText(m), "2 of 4 done · €5.00 more to earn");
  // Two houses on: the second-brand row draws; with three, Full Circle too.
  const two = readCircle({ ...MARIA_SPA_ONLY, brands: THREE_BRANDS.slice(0, 2) });
  assert.ok(two.actions.some((a) => a.key === "second_house") && two.actions.some((a) => a.key === "full_circle"));
  assert.equal(waysSummaryText(two), "3 of 6 done · €30.00 more to earn", "nothing dropped: the server's count");
});

test("Instagram: a row only with the brand's own https profile; the link opens it in a new tab", () => {
  const m = readCircle(MARIA);
  const html = circleWaysHTML(m);
  assert.match(
    html,
    new RegExp(`<a class="cc-ig" href="https://www\\.instagram\\.com/carismaspa/" target="_blank" rel="noopener noreferrer" data-cw-circle-ig="${SPA_ONLY[0].brandId}">Follow</a>`),
  );
  for (const url of [undefined, null, "", "http://instagram.com/x", "javascript:alert(1)"]) {
    const noUrl = readCircle({ ...MARIA, actions: MARIA.actions.map((a) => (a.key === "instagram" ? { ...a, url } : a)) });
    assert.equal(noUrl.actions.some((a) => a.key === "instagram"), false, String(url));
    assert.doesNotMatch(circleWaysHTML(noUrl), /cc-ig/);
  }
  const done = readCircle({ ...MARIA, actions: MARIA.actions.map((a) => (a.key === "instagram" ? { ...a, done: true } : a)) });
  assert.doesNotMatch(circleWaysHTML(done), /cc-ig/, "done: no Follow button");
  // A Medical row never draws, even if one arrived.
  const med = readCircle({ ...MARIA, actions: [...MARIA.actions, { id: "instagram:medical", key: "instagram", house: "medical", brandId: "m", label: "Follow Carisma Medical", points: 50, done: false, url: "https://www.instagram.com/x/" }] });
  assert.doesNotMatch(circleWaysHTML(med), /Medical/);
});

test("the overview's earn cards: one figure each, only the open actions, Follow on the Instagram card", () => {
  const html = circleWaysCardsHTML(readCircle(MARIA));
  // Three open actions: Full Circle (a brand bonus), Instagram (a wide card), the app sign-in (board 10's order).
  assert.equal((html.match(/class="cc-earn-card( wide)?"/g) || []).length, 3);
  assert.match(html, /cc-earn-card__fig" data-clarity-mask="True">\+€2\.50 · 50 points</);
  assert.match(html, /data-cw-circle-ig=/);
  const allDone = readCircle({ ...MARIA, actions: MARIA.actions.map((a) => ({ ...a, done: true })) });
  assert.equal(circleWaysCardsHTML(allDone), "");
});

function fakeDoc() {
  const clicks = [];
  const els = {};
  const doc = {
    cookie: "cw-signed-in=1",
    location: { pathname: "/", host: "www.carismaspa.com" },
    addEventListener(t, h) {
      if (t === "click") clicks.push(h);
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById: (id) => els[id] ?? null,
    createElement: () => ({ setAttribute() {}, getAttribute() { return null; }, appendChild() {}, innerHTML: "" }),
    head: { appendChild() {} },
    body: { appendChild(el) { const id = el.getAttribute?.("id"); if (id) els[id] = el; } },
  };
  return { doc, click: (e) => clicks.forEach((h) => h(e)), clicks };
}
function igLink(brandId) {
  const a = { attrs: { "data-cw-circle-ig": brandId, href: "https://www.instagram.com/carismaspa/" }, getAttribute(n) { return this.attrs[n] ?? null; } };
  return { closest: (sel) => (sel === "[data-cw-circle-ig]" ? a : null), getAttribute: () => null };
}
const settle = () => new Promise((r) => setTimeout(r, 20));

test("the tap: ONE award POST per brand per page (keepalive), the link is never held up; a second tap sends nothing", async () => {
  const { doc, click } = fakeDoc();
  const posts = [];
  const fetchImpl = (url, init = {}) => {
    if (init.method === "POST") posts.push({ url, init });
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, data: { enabled: true, awarded: true } }) });
  };
  mountAccountPanel(doc, { fetchImpl, circle: true });
  let prevented = 0;
  const ev = (target) => ({ target, preventDefault() { prevented++; } });
  click(ev(igLink(SPA_ONLY[0].brandId)));
  await settle();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, "/api/auth/proxy/client/loyalty/actions/instagram");
  assert.deepEqual(JSON.parse(posts[0].init.body), { brandId: SPA_ONLY[0].brandId });
  assert.equal(posts[0].init.keepalive, true);
  assert.equal(posts[0].init.credentials, "same-origin");
  assert.equal(prevented, 0, "the link opens Instagram by itself");
  click(ev(igLink(SPA_ONLY[0].brandId)));
  await settle();
  assert.equal(posts.length, 1, "second tap on the same brand: no POST");
});

test("NEGATIVE CONTROL: a site that did not opt in to Circle binds no award at all", async () => {
  const { doc, click } = fakeDoc();
  const posts = [];
  mountAccountPanel(doc, { fetchImpl: (url, init = {}) => { if (init.method === "POST") posts.push(url); return Promise.resolve({ ok: true, status: 200, json: async () => ({}) }); } });
  click({ target: igLink("x-brand"), preventDefault() {} });
  await settle();
  assert.deepEqual(posts, []);
});

test("proxy: the five v2 doors are exact literals; their siblings and the HOD twins stay refused", () => {
  const allowed = [
    ["GET", "/client/loyalty/summary"],
    ["POST", "/client/loyalty/actions/instagram"],
    ["GET", "/client/loyalty/perks"],
    ["POST", "/client/loyalty/perks/spa-day"],
    ["GET", "/client/loyalty/points-bookings"],
    ["GET", "/client/loyalty/points-bookings?appointmentIds=a,b"],
  ];
  for (const [m, p] of allowed) assert.equal(isAllowed(m, p), true, `${m} ${p}`);
  const refused = [
    ["POST", "/client/loyalty/summary"],
    ["GET", "/client/loyalty/actions/instagram"],
    ["POST", "/client/loyalty/actions/other"],
    ["POST", "/client/loyalty/actions"],
    ["POST", "/client/loyalty/perks"],
    ["GET", "/client/loyalty/perks/spa-day"],
    ["POST", "/client/loyalty/points-bookings"],
    ["GET", "/hod/clients/abc/loyalty/summary"],
    ["GET", "/hod/appointments/abc/checkout/loyalty-points"],
    ["POST", "/hod/appointments/abc/checkout/loyalty-points"],
    ["GET", "/hod/clients/abc/loyalty/perks"],
    ["GET", "/hod/loyalty/points-bookings"],
    ["GET", "/public/loyalty/featured"],
  ];
  for (const [m, p] of refused) assert.equal(isAllowed(m, p), false, `${m} ${p}`);
  for (const f of FORBIDDEN_PATHS) assert.equal(isAllowed(f.method, f.path), false, `${f.method} ${f.path}`);
});
