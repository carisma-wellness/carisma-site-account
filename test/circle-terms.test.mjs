import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  PROMISE_QUALIFIER,
  PAY_STEP_DISCLOSURE,
  REJOIN_NOTE,
  EARN_TERMS_LINE,
  WHATSAPP_UPDATES_SENTENCE,
  readCircle,
  readCircleRewards,
  readCircleWhatsapp,
  circleViewHTML,
  circleRewardsHTML,
  rejoinNoteText,
  whatsappUpdatesHTML,
} from "../dist/index.js";
import { MARIA, REWARDS as REWARDS_V2 } from "./fixtures/circle-v2.mjs";

/**
 * Carisma Circle terms v1.0 (counsel, 15 Nov 2026; legal/carisma-circle-terms.md in the point-system pack) and
 * counsel's surface-consistency table: every kit sentence it rated No or Partly carries the corrected wording,
 * word for word. A sentence the terms contradict (a refund reduced by spent credit, a gift-card purchase that
 * keeps credit alive, "tell the desk" for a reward, WhatsApp credit receipts that are not built) must never
 * come back.
 */

test("row 1: the promise qualifier names every exclusion the terms name (§4) and the gift card someone bought (§3)", () => {
  assert.equal(
    PROMISE_QUALIFIER,
    "Medical treatments, consultations with a doctor, prescription-only medicines, fees and tips don't earn credit. A gift card someone bought earns for the person who uses it.",
  );
});

test("row 6: the pay-step disclosure never takes spent credit from a refund (§12, §13)", () => {
  assert.equal(
    PAY_STEP_DISCLOSURE,
    "If you cancel, the credit this booking gives you is removed. If you've already used it, your balance can go below zero. We never take it from your refund.",
  );
  assert.doesNotMatch(PAY_STEP_DISCLOSURE, /comes off your refund/);
});

test("row 8: beside Rejoin, a balance below zero comes back too unless written off (§13); the level is the API's (R5.1)", () => {
  assert.equal(
    REJOIN_NOTE,
    "If you rejoin, you start again at the first level with no credit. The credit you gave up when you left does not come back. If your balance was below zero when you left, that comes back too, unless it has been written off.",
  );
  assert.match(rejoinNoteText("Level 1 · Pearl"), /^If you rejoin, you start again at Level 1 · Pearl with no credit\./);
  assert.doesNotMatch(REJOIN_NOTE, /First Light|\bI\b /);
});

test("row 55 (kit part): the WhatsApp service consent no longer promises credit receipts, and the OLD wording is never drawn", () => {
  assert.equal(
    WHATSAPP_UPDATES_SENTENCE,
    "Send me Carisma Circle service messages on WhatsApp from Carisma Spa, Carisma Aesthetics and Carisma Slimming. No offers. Reply STOP to end.",
  );
  const base = { enabled: true, left: false, optedIn: false, changedAt: null, hasPhone: true, phoneLast4: "4821" };
  // A server still recording the old sentence: fail-closed, no box (what a member ticks is what is on file).
  const old = "Send my booking updates and Carisma credit receipts on WhatsApp from Carisma Spa, Carisma Aesthetics and Carisma Slimming. No offers. Reply STOP to end.";
  assert.equal(readCircleWhatsapp({ ...base, wording: old }), null);
  assert.equal(whatsappUpdatesHTML(readCircleWhatsapp({ ...base, wording: old })), "");
  // Negative control: the re-versioned sentence draws the box.
  assert.ok(whatsappUpdatesHTML(readCircleWhatsapp({ ...base, wording: WHATSAPP_UPDATES_SENTENCE })).includes(WHATSAPP_UPDATES_SENTENCE));
});

// Maria Borg, v2 (fixtures/circle-v2.mjs).
const ME = MARIA;

test("same defect as row 26: how points pay at the desk is the card in the Carisma app (§10), never 'tell the desk'", () => {
  const m = readCircle(ME);
  assert.ok(m, "precondition: the demo member reads live");
  const cards = circleRewardsHTML(readCircleRewards(REWARDS_V2), m.points);
  assert.ok(cards.length > 0, "precondition: the reward cards rendered");
  assert.match(cards, /at reception with your card in the Carisma app\. Prices include VAT\./);
  assert.doesNotMatch(cards, /tell the desk/);
});

test("same defect as rows 18/21: the Ways to earn line says 'on eligible treatments'", () => {
  const m = readCircle(ME);
  const html = circleViewHTML({ me: m, activity: null, rewards: null });
  assert.ok(html.includes(`Every €1 you pay on eligible treatments at Carisma Spa earns credit too. ${EARN_TERMS_LINE}`));
  assert.ok(html.includes(PROMISE_QUALIFIER.replace(/'/g, "&#39;")) || html.includes(PROMISE_QUALIFIER), "row 33: the qualifier sits in the same view");
});

test("no shipped kit file still carries a sentence counsel struck", () => {
  const files = readdirSync(new URL("../dist/ui/", import.meta.url)).filter((f) => f.endsWith(".js"));
  assert.ok(files.length > 10, "precondition: the built kit is there");
  const all = files.map((f) => readFileSync(new URL(`../dist/ui/${f}`, import.meta.url), "utf8")).join("\n");
  for (const struck of [
    /its value comes off your refund/,
    /gift card purchase/i,
    /last paid visit/,
    /tell the desk/,
    /credit receipts on WhatsApp/,
    /prescribed or performed by a doctor/,
    // v2: the retired spend rules and level names never come back.
    /up to half/i,
    /First Light|Golden Hour|Moonlight|Starlight/,
  ]) {
    assert.doesNotMatch(all, struck, String(struck));
  }
});
