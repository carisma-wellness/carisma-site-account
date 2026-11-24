/**
 * Refer a friend, the 24 Nov 2026 flow (12-Tech/Docs/refer-a-friend-flow-2026-11-24): the share message with the
 * link at the END (Mert 24 Nov: never a bare link), /r/ links, the brand switch, the ladder, claimed friends with
 * Remind, the claim door, friendGift. Every positive assertion has a negative control beside it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildReferModel,
  referHTML,
  referralShareMessage,
  referralEmailSubject,
  referralEmailBody,
  referralRemindMessage,
  referralBrandKey,
  referralLinkCode,
  referralLink,
  readFriendOffer,
  readClaimAnswer,
  claimReferral,
  friendGiftFrom,
  ownCodeFrom,
  claimStateText,
  referralLadderTotals,
  referralGiftSavedLine,
  REFERRAL_FLOW_MARKER,
} from "../dist/ui/index.js";
import { PORTAL_RECORDS_CSS } from "../dist/ui/styles/index.js";
import { isAllowed } from "../dist/index.js";

const decode = (s) =>
  s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const text = (html) => decode(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

const FRIEND = { type: "AMOUNT_OFF", valueCents: 2000, minSpendCents: 5000 };
const prog = (brandKey, brandName, extra = {}) => ({
  brandId: `b-${brandKey}`,
  brandName,
  brandSlug: `carisma-${brandKey}`,
  brandKey,
  offerText: "€20 off your first visit (minimum spend €50)",
  rewardText: "€20 voucher for you",
  releaseText: "After your friend's visit",
  voucherValidityDays: 180,
  termsUrl: `https://www.carisma${brandKey}.com/referral-terms`,
  shareUrl: `https://www.carisma${brandKey}.com/r/NPAAD04J`,
  canRefer: true,
  friend: FRIEND,
  ...extra,
});
const ME = {
  success: true,
  data: {
    code: "NPAAD04J",
    links: {
      spa: "https://www.carismaspa.com/r/NPAAD04J",
      aesthetics: "https://www.carismaaesthetics.com/r/NPAAD04J",
      slimming: "https://www.carismaslimming.com/r/NPAAD04J",
    },
    programmes: [prog("aesthetics", "Carisma Aesthetics"), prog("spa", "Carisma Spa"), prog("slimming", "Carisma Slimming")],
    friends: [
      { id: "f1", friendInitial: "S.", friendFirstName: null, brandName: "Carisma Spa", brandKey: "spa", status: "rewarded" },
      { id: "f2", friendInitial: "N.", friendFirstName: "Nina", brandName: "Carisma Spa", brandKey: "spa", status: "claimed" },
      { id: "f3", friendInitial: "L.", friendFirstName: "Luca", brandName: "Carisma Spa", brandKey: "spa", status: "joined" },
    ],
    rewards: [],
    pendingRewardsCents: 0,
    friendGift: { spa: { code: "ANNA7K2Q", referrerFirstName: "Anna", type: "AMOUNT_OFF", valueCents: 2000, minSpendCents: 5000, expiresAt: "2099-01-01T00:00:00.000Z" } },
  },
};
const LADDER = [
  { friend: 1, cents: 2000 },
  { friend: 2, cents: 3000 },
  { friend: 3, cents: 5000 },
];
const SPA = { siteBrand: "Carisma Spa", siteOrigin: "https://www.carismaspa.com", referLadder: LADDER };

test("the marker ships", () => assert.equal(REFERRAL_FLOW_MARKER, "referral-flow-20261124"));

test("the share message is warm, carries the API's amounts, and ends with the link — never a bare link", () => {
  const msg = referralShareMessage({ brand: "spa", link: "https://www.carismaspa.com/r/NPAAD04J", offer: readFriendOffer(FRIEND) });
  assert.equal(
    msg,
    "I've been going to Carisma Spa and I think you'd love it. Here's €20 off your first visit (anything from €50) with my link: https://www.carismaspa.com/r/NPAAD04J",
  );
  assert.ok(msg.endsWith("https://www.carismaspa.com/r/NPAAD04J"));
  // NEGATIVE CONTROL: no offer from the API → no typed amount, still a sentence with the link last.
  const none = referralShareMessage({ brand: "slimming", link: "https://www.carismaslimming.com/r/X", offer: null });
  assert.doesNotMatch(none, /€/);
  assert.match(none, /^I've been going to Carisma Slimming .* with my link: https:\/\/www\.carismaslimming\.com\/r\/X$/);
  // A different amount from the API is said as sent.
  assert.match(referralShareMessage({ brand: "aesthetics", link: "L", offer: readFriendOffer({ type: "AMOUNT_OFF", valueCents: 2550, minSpendCents: null }) }), /Here's €25\.50 off your first visit with my link: L$/);
});

test("email: the subject names the gift and the brand; the body carries the message", () => {
  const i = { brand: "spa", link: "https://www.carismaspa.com/r/NPAAD04J", offer: readFriendOffer(FRIEND) };
  assert.equal(referralEmailSubject(i), "€20 off your first visit at Carisma Spa");
  assert.ok(referralEmailBody(i).includes(referralShareMessage(i)));
  assert.equal(referralEmailSubject({ ...i, offer: null }), "A gift for your first visit at Carisma Spa");
});

test("brand keys: spa, aesthetics, slimming only — Medical, Hair Clinic and Pulse never", () => {
  assert.equal(referralBrandKey("Carisma Spa"), "spa");
  assert.equal(referralBrandKey("carisma-aesthetics"), "aesthetics");
  assert.equal(referralBrandKey("www.carismaslimming.com"), "slimming");
  for (const no of ["Carisma Medical", "Carisma Hair Clinic", "Pulse", "", "carisma-medical"]) assert.equal(referralBrandKey(no), null, no);
});

test("codes: the forgiving reading for a link, null for words; links are /r/", () => {
  assert.equal(referralLinkCode("npaad-04j"), "NPAAD04J");
  assert.equal(referralLinkCode("NPAADO4J"), "NPAAD04J");
  assert.equal(referralLinkCode("hello"), null);
  assert.equal(referralLinkCode("NPAAD04JX"), null);
  assert.equal(referralLink("aesthetics", "NPAAD04J"), "https://www.carismaaesthetics.com/r/NPAAD04J");
  assert.equal(referralLink("spa", "NPAAD04J", "http://localhost:3000"), "https://www.carismaspa.com/r/NPAAD04J");
});

test("the hub: this site's brand first, a panel per brand, every way to share sends the message with the link", () => {
  const m = buildReferModel(ME, SPA);
  assert.deepEqual(m.brands.map((b) => b.key), ["spa", "aesthetics", "slimming"]);
  const html = referHTML(m);
  const t = text(html);
  assert.match(t, /Give €20\. Get up to €100\./);
  // Running totals that never read as a sum (QC 24 Nov 2026: "€20, then €50, then €100" read as €170).
  assert.match(t, /Once they've been, you get Carisma credit: €20 for your first friend, €50 in total for two, €100 in total for three\./);
  assert.doesNotMatch(t, /€50 for two/);
  assert.match(t, /carismaspa\.com\/r\/NPAAD04J/);
  // Only the first panel is visible; the switch names each brand.
  assert.equal((html.match(/data-cw-refer-panel="[a-z]+"[^>]*hidden/g) || []).length, 2);
  assert.match(html, /data-cw-refer-tab="aesthetics"/);
  // WhatsApp, text, email and native share all carry the warm message ending in the link.
  const spaPanel = html.slice(html.indexOf('data-cw-refer-panel="spa"'), html.indexOf('data-cw-refer-panel="aesthetics"'));
  const wa = decodeURIComponent(decode(/href="https:\/\/wa\.me\/\?text=([^"]+)"/.exec(spaPanel)[1]));
  assert.match(wa, /^I've been going to Carisma Spa.*with my link: https:\/\/www\.carismaspa\.com\/r\/NPAAD04J$/);
  const sms = decodeURIComponent(decode(/href="sms:\?&amp;body=([^"]+)"/.exec(spaPanel)[1]));
  assert.equal(sms, wa);
  assert.match(decode(spaPanel), /mailto:\?subject=%E2%82%AC20%20off%20your%20first%20visit%20at%20Carisma%20Spa&body=/);
  assert.match(decode(spaPanel), /data-cw-refer-share[^>]*data-cw-refer-text="I've been going to Carisma Spa[^"]*\/r\/NPAAD04J"/);
  // Copy link copies the BARE url (the one place a bare link is right); Copy message copies the sentence.
  assert.match(spaPanel, /data-cw-refer-copy="https:\/\/www\.carismaspa\.com\/r\/NPAAD04J"/);
  assert.match(decode(spaPanel), /data-cw-refer-copy="I've been going to Carisma Spa/);
  // NEGATIVE CONTROL: no ?ref= link anywhere.
  assert.doesNotMatch(html, /\?ref=/);
});

test("ladder: qualified friends count, the earned sum is the API's ladder; no ladder → reward words, no typed numbers", () => {
  const m = buildReferModel(ME, SPA);
  assert.equal(m.qualified, 1);
  assert.match(text(referHTML(m)), /1 of 3 friends €20 yours/);
  const bare = buildReferModel(ME, { siteBrand: "Carisma Spa", siteOrigin: "https://www.carismaspa.com" });
  const t = text(referHTML(bare));
  assert.doesNotMatch(t, /Get up to|of 3 friends/);
  assert.match(t, /you get €20 voucher for you/);
});

test("friends: a claimed friend shows her first name, 'Joined, not booked' and Remind (a WhatsApp the member sends)", () => {
  const html = referHTML(buildReferModel(ME, SPA));
  const t = text(html);
  assert.match(t, /Nina N\. Joined, not booked/);
  const remind = /data-cw-refer-remind href="([^"]+)"/.exec(html);
  assert.ok(remind, "Remind is there");
  const msg = decodeURIComponent(decode(remind[1]).replace("https://wa.me/?text=", ""));
  assert.match(msg, /^Hi Nina, just a reminder: your €20 off your first visit at Carisma Spa is waiting in your account\..*https:\/\/www\.carismaspa\.com\/r\/NPAAD04J$/);
  // NEGATIVE CONTROL: a booked friend shows an initial only, and no Remind; a first name on a booked row is ignored.
  assert.doesNotMatch(t, /Luca/);
  assert.equal((html.match(/data-cw-refer-remind/g) || []).length, 1);
});

test("canRefer false: that brand's panel says why and offers nothing to send", () => {
  const body = structuredClone(ME);
  body.data.programmes[1] = prog("spa", "Carisma Spa", { canRefer: false, referBlockedText: "Your code starts working after your first paid visit with us." });
  const html = referHTML(buildReferModel(body, SPA));
  const spaPanel = html.slice(html.indexOf('data-cw-refer-panel="spa"'), html.indexOf('data-cw-refer-panel="aesthetics"'));
  assert.match(text(spaPanel), /Your code starts working after your first paid visit/);
  assert.doesNotMatch(spaPanel, /wa\.me|data-cw-refer-copy/);
  // Another brand keeps its share row.
  assert.match(html.slice(html.indexOf('data-cw-refer-panel="aesthetics"')), /wa\.me/);
});

test("an older API (no links, no brandKey, no friend numbers): /r/ links are built, this site's offer comes from its public status", () => {
  const body = { success: true, data: { code: "NPAAD04J", programmes: [{ ...prog("spa", "Carisma Spa"), brandKey: undefined, friend: undefined, shareUrl: "https://www.carismaspa.com/?ref=NPAAD04J" }], friends: [] } };
  const m = buildReferModel(body, { ...SPA, referFriendOffer: FRIEND });
  assert.equal(m.brands[0].link, "https://www.carismaspa.com/r/NPAAD04J");
  assert.match(text(referHTML(m)), /Here's €20 off your first visit \(anything from €50\)/);
  // NEGATIVE CONTROL: without the public status either, no amount is invented.
  const m2 = buildReferModel(body, { siteBrand: "Carisma Spa", siteOrigin: "https://www.carismaspa.com" });
  assert.doesNotMatch(text(referHTML(m2)), /Here's €/);
});

test("the claim door is on the proxy allowlist (POST only); /me stays GET only", () => {
  assert.equal(isAllowed("POST", "/client/referrals/claim"), true);
  assert.equal(isAllowed("GET", "/client/referrals/claim"), false);
  assert.equal(isAllowed("POST", "/client/referrals/claim/x"), false);
});

test("claim answers: READY with a gift, the three refusals, and anything else is silence", async () => {
  const ready = readClaimAnswer({ success: true, data: { state: "READY", gift: { code: "NPAAD04J", brand: "spa", referrerFirstName: "Maria", type: "AMOUNT_OFF", valueCents: 2000, minSpendCents: 5000, expiresAt: "2099-01-01T00:00:00Z" } } }, "spa");
  assert.equal(ready.state, "READY");
  assert.equal(ready.gift.referrerFirstName, "Maria");
  assert.equal(claimStateText(ready, "Carisma Spa").title, "Maria's €20 gift is saved to your account");
  for (const s of ["OWN_LINK", "NOT_NEW", "NOT_FOUND"]) assert.equal(readClaimAnswer({ data: { state: s } }, "spa").state, s);
  assert.equal(readClaimAnswer({ data: { state: "WHAT" } }, "spa"), null);
  // The fetch: a 404 (API not deployed) and a throw both answer null.
  assert.equal(await claimReferral(async () => ({ ok: false, status: 404, json: async () => ({}) }), "NPAAD04J", "spa"), null);
  assert.equal(await claimReferral(async () => { throw new Error("net"); }, "NPAAD04J", "spa"), null);
  let sent = null;
  const ok = await claimReferral(async (url, init) => { sent = { url, init }; return { ok: true, status: 200, json: async () => ({ success: true, data: { state: "NOT_NEW" } }) }; }, "NPAAD04J", "spa");
  assert.equal(ok.state, "NOT_NEW");
  assert.equal(sent.url, "/api/auth/proxy/client/referrals/claim");
  assert.deepEqual(JSON.parse(sent.init.body), { code: "NPAAD04J", brand: "spa" });
});

test("friendGift: the brand's open gift, never another brand's, never an expired one; own code read", () => {
  const g = friendGiftFrom(ME, "spa");
  assert.equal(g.code, "ANNA7K2Q");
  assert.equal(friendGiftFrom(ME, "aesthetics"), null);
  const old = structuredClone(ME);
  old.data.friendGift.spa.expiresAt = "2001-01-01T00:00:00Z";
  assert.equal(friendGiftFrom(old, "spa"), null);
  assert.equal(ownCodeFrom(ME), "NPAAD04J");
});

test("the stylesheet carries the hub rules in tokens only", () => {
  const css = PORTAL_RECORDS_CSS;
  assert.match(css, /\.cw-refer__ways/);
  assert.match(css, /\.cw-refer__switch/);
  const block = css.slice(css.indexOf("referral-flow-20261124"), css.indexOf(".cw-refer__remind"));
  assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b|rgba?\(/i);
});

test("an API still on /?ref= links (before REFERRAL_SHORT_LINKS): the hub shares the same code as /r/", () => {
  const body = structuredClone(ME);
  body.data.links = { spa: "https://www.carismaspa.com/?ref=NPAAD04J" };
  body.data.programmes = [prog("spa", "Carisma Spa", { shareUrl: "https://www.carismaspa.com/?ref=NPAAD04J" }), prog("aesthetics", "Carisma Aesthetics", { shareUrl: "https://www.carismaaesthetics.com/?ref=NPAAD04J" })];
  const m = buildReferModel(body, SPA);
  assert.deepEqual(m.brands.map((b) => b.link), ["https://www.carismaspa.com/r/NPAAD04J", "https://www.carismaaesthetics.com/r/NPAAD04J"]);
  assert.doesNotMatch(referHTML(m), /\?ref=/);
});

/* ── QC 24 Nov 2026: the ladder as totals, the gift line, the gift hint on the account door ── */

test("the ladder words running totals from the per-friend steps, never a list that adds up", () => {
  assert.equal(referralLadderTotals([2000, 3000, 5000]), "€20 for your first friend, €50 in total for two, €100 in total for three");
  // The amounts come from the steps: other figures, other words (nothing typed).
  assert.equal(referralLadderTotals([1500, 1500]), "€15 for your first friend, €30 in total for two");
  assert.equal(referralLadderTotals([2000]), "€20 for your first friend");
  assert.equal(referralLadderTotals([]), null);
  assert.equal(referralLadderTotals(null), null);
  // Negative control: the old wording is gone.
  assert.doesNotMatch(referralLadderTotals([2000, 3000, 5000]), /then/);
});

test("the gift line says the amount when it is known, and never invents one", () => {
  assert.equal(referralGiftSavedLine(2000), "Your €20 gift will be saved to your account.");
  assert.equal(referralGiftSavedLine(2050), "Your €20.50 gift will be saved to your account.");
  assert.equal(referralGiftSavedLine(null), "Your gift will be saved to your account.");
  assert.equal(referralGiftSavedLine(0), "Your gift will be saved to your account.");
  assert.equal(referralGiftSavedLine(-500), "Your gift will be saved to your account.");
});
