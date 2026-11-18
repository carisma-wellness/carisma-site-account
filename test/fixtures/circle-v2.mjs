/**
 * Circle v2 answers as the backend contracts write them (BE-1 §9.1, §9.2, §9.6
 * + R1.21; BE-2 §6). Level 1 = Pearl, Level 2 = Rose (BRIEF ERRATA). Maria Borg:
 * Level 3 · Ruby, €72.40 · 1,448 points, €710 of €1,000 paid this year.
 * Not a test file (node --test runs test/*.test.mjs only).
 */

export const LEVELS = [
  { key: "pearl", number: 1, name: "Pearl", label: "Level 1 · Pearl", numeral: "I", multiplier: 1, thresholdCents: 0, birthdayCreditCents: 500, freeSpaDaysPerYear: 0, earlyAccessHours: 0, noDeposit: false },
  { key: "rose", number: 2, name: "Rose", label: "Level 2 · Rose", numeral: "II", multiplier: 1.25, thresholdCents: 15000, birthdayCreditCents: 1000, freeSpaDaysPerYear: 0, earlyAccessHours: 24, noDeposit: false },
  { key: "ruby", number: 3, name: "Ruby", label: "Level 3 · Ruby", numeral: "III", multiplier: 1.5, thresholdCents: 50000, birthdayCreditCents: 2000, freeSpaDaysPerYear: 1, earlyAccessHours: 48, noDeposit: true },
  { key: "sapphire", number: 4, name: "Sapphire", label: "Level 4 · Sapphire", numeral: "IV", multiplier: 1.75, thresholdCents: 100000, birthdayCreditCents: 3500, freeSpaDaysPerYear: 2, earlyAccessHours: 48, noDeposit: true },
  { key: "diamond", number: 5, name: "Diamond", label: "Level 5 · Diamond", numeral: "V", multiplier: 2, thresholdCents: 250000, birthdayCreditCents: 5000, freeSpaDaysPerYear: 3, earlyAccessHours: 72, noDeposit: true },
];

export const SPA_ONLY = [{ house: "spa", brandId: "11111111-1111-4111-8111-111111111111", name: "Carisma Spa" }];
export const THREE_BRANDS = [
  ...SPA_ONLY,
  { house: "aesthetics", brandId: "22222222-2222-4222-8222-222222222222", name: "Carisma Aesthetics" },
  { house: "slimming", brandId: "33333333-3333-4333-8333-333333333333", name: "Carisma Slimming" },
];

export const MARIA = {
  enabled: true,
  programme: { name: "Carisma Circle", currencyName: "Carisma credit", unitName: "points", tagline: "Come back to more." },
  level: { key: "ruby", number: 3, name: "Ruby", label: "Level 3 · Ruby", numeral: "III", multiplier: 1.5, heldUntil: "2027-12-31" },
  nextLevel: { key: "sapphire", number: 4, name: "Sapphire", label: "Level 4 · Sapphire", numeral: "IV", thresholdCents: 100000 },
  spendThisYearCents: 71000,
  headStartCents: 0,
  toNextLevelCents: 29000,
  progressBp: 4200,
  levelSentence: "€290 more this year to reach Level 4 · Sapphire",
  credit: { points: 1448, cents: 7240, display: "€72.40 · 1,448 points" },
  pending: { points: 120, cents: 600 },
  awaitingEmail: null,
  expiring: { points: 1448, cents: 7240, date: "2027-11-17" },
  pointsExpireAt: "2027-11-17",
  pointsExpireKind: "balance",
  balanceLapse: { at: "2027-11-17", points: 1448 },
  datedEnds: null,
  passport: { spa: true, aesthetics: true, slimming: false, count: 2 },
  fullCircleAt: null,
  actions: [
    { id: "verified_email", key: "verified_email", label: "Verified email on your account", points: 50, done: true },
    { id: "app", key: "app", label: "First sign-in to the Carisma app", points: 50, done: false },
    { id: "instagram:spa", key: "instagram", house: "spa", brandId: SPA_ONLY[0].brandId, label: "Follow Carisma Spa on Instagram", points: 50, done: false, url: "https://www.instagram.com/carismaspa/" },
    { id: "first_house", key: "first_house", label: "Your first purchase at a Carisma brand", points: 100, done: true },
    { id: "second_house", key: "second_house", label: "Your first purchase at a second brand", points: 200, done: true },
    { id: "full_circle", key: "full_circle", label: "Full Circle: your first purchase at the third brand", points: 500, done: false },
  ],
  actionsSummary: { done: 3, of: 6, leftPoints: 600, leftCents: 3000 },
  nextVisitCredit: null,
  rules: { pointsPerEuro: 20, minRedeemPoints: 100, maxSharePct: 50 },
  perks: { multiplier: 1.5, birthdayCreditCents: 2000, freeSpaDaysPerYear: 1, earlyAccessHours: 48, noDeposit: true },
  nextLevelPerks: { multiplier: 1.75, birthdayCreditCents: 3500, freeSpaDaysPerYear: 2, earlyAccessHours: 48, noDeposit: true },
  levels: LEVELS,
  brands: SPA_ONLY,
  minAge: 18,
  brandBonusMinCents: 2000,
  affordable: true,
  member: { number: "CC 1234 5678", emailVerified: true, spendPausedUntil: null },
  card: { memberNumber: "CC 1234 5678", qrPayload: "cc1.x", deskCode: "123456", deskCodeExpiresAt: "2026-11-17T20:10:00Z" },
};

/**
 * `GET /client/loyalty/summary` EXACTLY as BE-1 built it (loyalty.readModel.ts `summaryFromRow`, feat/circle-v2-be1
 * @ abdf5bead): `nextLevel` is {key, number, name, label} with NO thresholdCents, no `rules`, no paid-this-year,
 * no perks. The one field added on top is BE-2's `affordable` (R2.9 adds it to this read). The WEB fix's BRIEF §9
 * ask (thresholdCents, spendThisYearCents, perks, nextLevelPerks on the summary) is `SUMMARY_ASKED` below.
 */
export const SUMMARY = {
  enabled: true,
  level: { key: "ruby", number: 3, name: "Ruby", label: "Level 3 · Ruby" },
  nextLevel: { key: "sapphire", number: 4, name: "Sapphire", label: "Level 4 · Sapphire" },
  toNextLevelCents: 29000,
  progressBp: 4200,
  levelSentence: "€290 more this year to reach Level 4 · Sapphire",
  heldUntil: "2027-12-31",
  balance: { points: 1448, cents: 7240, display: "€72.40 · 1,448 points" },
  pointsExpireAt: "2027-11-17",
  pointsExpiring: 1448,
  pointsExpireKind: "balance",
  balanceLapse: { at: "2027-11-17", points: 1448 },
  datedEnds: null,
  awaitingEmailPoints: 0,
  identity: "ok",
  memberNumber: "CC 1234 5678",
  spendPausedUntil: null,
  brandsVisited: ["spa", "aesthetics"],
  fullCircleAt: null,
  left: false,
  affordable: true,
};

/** The summary once BE-1 takes the WEB fix's ask: the menu then draws the caption and the unlock line at once. */
export const SUMMARY_ASKED = {
  ...SUMMARY,
  nextLevel: { ...SUMMARY.nextLevel, thresholdCents: 100000 },
  spendThisYearCents: 71000,
  perks: { multiplier: 1.5, birthdayCreditCents: 2000, freeSpaDaysPerYear: 1, earlyAccessHours: 48, noDeposit: true },
  nextLevelPerks: { multiplier: 1.75, birthdayCreditCents: 3500, freeSpaDaysPerYear: 2, earlyAccessHours: 48, noDeposit: true },
};

export const STATUS = {
  enabled: true,
  rules: { earnPerEuro: 1, pointsPerEuro: 20, minRedeemPoints: 100, maxSharePct: 50 },
  levels: LEVELS,
  earning: {
    retailBoostPct: 50,
    rebookSharePct: 50,
    brandBonusPoints: [100, 200, 500],
    brandBonusMinCents: 2000,
    actions: [
      { key: "verified_email", points: 50 },
      { key: "app", points: 50 },
      { key: "instagram", points: 50, perBrand: true, brands: [{ house: "spa", brandId: SPA_ONLY[0].brandId, url: "https://www.instagram.com/carismaspa/" }] },
    ],
  },
  expiry: { inactiveMonths: 12, noticeDaysBefore: [60, 14], birthdayUseByDays: 60 },
  brands: SPA_ONLY,
  minAge: 18,
};

const spa = { id: SPA_ONLY[0].brandId, slug: "carisma-spa", name: "Carisma Spa", house: "spa" };
export const REWARDS = {
  enabled: true,
  items: [
    { brand: spa, serviceId: "b8a48ed1-8fe8-4eba-a5de-2df79be7ddd9", serviceOptionId: null, name: "Day of Indulgence: Spa Facility Pass", durationMinutes: 0, fromCents: 2500, fromPoints: 500, venues: [], affordable: true },
    { brand: spa, serviceId: "b3ce259a-98e7-4974-aee3-986915606a97", serviceOptionId: null, name: "Japanese Short & Sweet", durationMinutes: 30, fromCents: 6500, fromPoints: 1300, venues: [], affordable: true },
    { brand: spa, serviceId: "111bec59-5dfc-4ea5-85d9-76859e2ea595", serviceOptionId: "opt-55", name: "Anti-Stress Massage", durationMinutes: 55, fromCents: 8900, fromPoints: 1780, venues: [], affordable: false },
    { brand: spa, serviceId: "b8d8382b-ab57-4e02-8bf7-43bbef27c018", serviceOptionId: "opt-85", name: "Carisma Signature Massage", durationMinutes: 85, fromCents: 14900, fromPoints: 2980, venues: [], affordable: false },
  ],
};

export const PERKS = {
  enabled: true,
  year: 2026,
  level: { key: "ruby", number: 3, name: "Ruby" },
  spaDays: { entitlement: 1, used: 0, left: 1, serviceIds: ["b8a48ed1-8fe8-4eba-a5de-2df79be7ddd9"], resetsOn: "2027-01-01" },
  noDeposit: { active: true, fromLevel: { key: "ruby", number: 3, name: "Ruby" } },
  earlyAccess: { hours: 48, upcoming: [] },
};

export const LEFT = { enabled: true, left: true, leftAt: "2026-11-14T10:30:00.000Z", rejoinedAt: null };
export const MINOR = { enabled: true, minor: true, minAge: 18 };

/**
 * ADDENDUM X2 / BE-i: `perks.live {spaDays, earlyAccess, noDeposit}`, each default false. BE-1's built answers
 * (MARIA, SUMMARY, SUMMARY_ASKED, LEVELS, STATUS above) carry NO `live` block: no surface may list a free Spa day,
 * early access or no deposit from them. These are the same answers once BE-2 switches every perk on.
 */
export const LIVE_ALL = { spaDays: true, earlyAccess: true, noDeposit: true };
export const LEVELS_LIVE = LEVELS.map((l) => ({ ...l, live: LIVE_ALL }));
export const MARIA_LIVE = {
  ...MARIA,
  perks: { ...MARIA.perks, live: LIVE_ALL },
  nextLevelPerks: { ...MARIA.nextLevelPerks, live: LIVE_ALL },
};
export const SUMMARY_ASKED_LIVE = {
  ...SUMMARY_ASKED,
  perks: { ...SUMMARY_ASKED.perks, live: LIVE_ALL },
  nextLevelPerks: { ...SUMMARY_ASKED.nextLevelPerks, live: LIVE_ALL },
};
