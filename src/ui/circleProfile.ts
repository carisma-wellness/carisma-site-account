/**
 * Carisma Circle W4 (backend B4, loyaltyCircleW41115): the member's own Circle
 * profile in Details — room comfort, birthday (day + month only) and WhatsApp
 * booking updates (a SERVICE opt-in, never marketing) — and what "Complete your
 * profile" still needs.
 *
 * Same rule as every Circle surface: nothing renders unless the server answered
 * a clean `enabled: true`. Off, 404 (an API without the B4 routes), 5xx or a
 * body we do not understand are all null, and null draws nothing.
 *
 * The WhatsApp box sits in Details, never beside "Offers and reminders"
 * (marketing, on Credit & rewards): one is about bookings, the other about offers.
 */
import { escapeHtml } from "./html.js";
import { unwrapEnvelope } from "./appointments.js";

const M = 'data-clarity-mask="True"';
/** Same value as circleCore.ts CIRCLE_QC (a copy kept in step by test/circle-w4.test.mjs's drift test). */
const CIRCLE_QC = "carisma-circle-v2-20261117";

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/* ── Room comfort ──────────────────────────────────────────────────────── */

export const COMFORT_KEYS = ["pressure", "oils", "music", "roomTemperature"] as const;
export type ComfortKey = (typeof COMFORT_KEYS)[number];
export const COMFORT_LABELS: Record<ComfortKey, string> = {
  pressure: "Massage pressure",
  oils: "Oils",
  music: "Music",
  roomTemperature: "Room temperature",
};

export interface CircleComfort {
  values: Record<ComfortKey, string | null>;
  choices: Record<ComfortKey, Array<{ value: string; label: string }>>;
}

/**
 * GET/PUT /client/loyalty/comfort → the model, or null (off, a member who left,
 * garbage). Fixed choices only: a value the server did not list is shown as unset.
 */
export function readCircleComfort(body: unknown): CircleComfort | null {
  const o = obj(unwrapEnvelope(body));
  if (!o || o.enabled !== true || o.left === true) return null;
  const c = obj(o.comfort);
  const ch = obj(o.choices);
  if (!c || !ch) return null;
  const values = {} as CircleComfort["values"];
  const choices = {} as CircleComfort["choices"];
  for (const k of COMFORT_KEYS) {
    const list = (Array.isArray(ch[k]) ? (ch[k] as unknown[]) : [])
      .map(obj)
      .filter((x): x is Record<string, unknown> => Boolean(x && str(x.value) && str(x.label)))
      .map((x) => ({ value: str(x.value), label: str(x.label) }));
    if (!list.length) return null;
    choices[k] = list;
    const v = str(c[k]);
    values[k] = list.some((x) => x.value === v) ? v : null;
  }
  return { values, choices };
}

/* ── Birthday (day + month, never the year) ────────────────────────────── */

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface CircleBirthday {
  birthday: { day: number; month: number } | null;
  /** 'YYYY-MM-DD' while a saved birthday cannot be changed yet. */
  lockedUntil: string | null;
  editable: boolean;
  /** Day + month of the date of birth already on file (no birthday saved yet). */
  prefill: { day: number; month: number } | null;
}

function dayMonth(v: unknown): { day: number; month: number } | null {
  const o = obj(v);
  if (!o) return null;
  const day = Number(o.day);
  const month = Number(o.month);
  return Number.isInteger(day) && Number.isInteger(month) && day >= 1 && day <= 31 && month >= 1 && month <= 12 ? { day, month } : null;
}

export function readCircleBirthday(body: unknown): CircleBirthday | null {
  const o = obj(unwrapEnvelope(body));
  if (!o || o.enabled !== true || o.left === true || !("birthday" in o)) return null;
  const lockedUntil = /^\d{4}-\d{2}-\d{2}$/.test(str(o.lockedUntil)) ? str(o.lockedUntil) : null;
  return {
    birthday: dayMonth(o.birthday),
    lockedUntil,
    editable: o.editable !== false && !lockedUntil,
    prefill: dayMonth(o.prefill),
  };
}

/** "15 March" — never a year. */
export function birthdayText(b: { day: number; month: number }): string {
  return `${b.day} ${MONTHS[b.month - 1] ?? ""}`.trim();
}

/** 'YYYY-MM-DD' → "14 November 2027" (a calendar day, no time zone maths). */
export function calendarDayText(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || "");
  if (!m) return "";
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : "";
}

/* ── WhatsApp booking updates (SERVICE, never marketing) ───────────────── */

/**
 * The consent text for the service opt-in (ways to earn: `whatsapp`): counsel's re-versioned wording
 * (surface-consistency row 55 — WhatsApp credit receipts are not built, so the sentence no longer promises them;
 * terms v1.0 §7 "service messages … (no offers)"), word for word. Fail-closed: the box is drawn only when the
 * server records EXACTLY this sentence, so until the backend re-versions its consent wording the box stays hidden.
 */
export const WHATSAPP_UPDATES_SENTENCE =
  "Send me Carisma Circle service messages on WhatsApp from Carisma Spa, Carisma Aesthetics and Carisma Slimming. No offers. Reply STOP to end.";

export interface CircleWhatsapp {
  left: boolean;
  optedIn: boolean;
  hasPhone: boolean;
  phoneLast4: string | null;
}

/**
 * GET/PUT /client/loyalty/whatsapp-updates → the model, or null. Fail-closed on
 * the wording: the box is drawn only when the server records EXACTLY the
 * sentence this page shows, so what a member ticks is what is on file.
 */
export function readCircleWhatsapp(body: unknown): CircleWhatsapp | null {
  const o = obj(unwrapEnvelope(body));
  if (!o || o.enabled !== true || typeof o.optedIn !== "boolean") return null;
  if (str(o.wording) !== WHATSAPP_UPDATES_SENTENCE) return null;
  const last4 = /^\d{2,4}$/.test(str(o.phoneLast4)) ? str(o.phoneLast4) : null;
  return { left: o.left === true, optedIn: o.optedIn, hasPhone: o.hasPhone === true, phoneLast4: last4 };
}

/* ── Plain words for every refusal ─────────────────────────────────────── */

export function profileErrorText(code: string, body?: unknown): string {
  switch (code) {
    case "LOYALTY_BIRTHDAY_LOCKED": {
      const env = obj(body);
      const at = str(obj(env?.data)?.unlocksAt) || str(obj(obj(env?.error)?.data)?.unlocksAt);
      const d = calendarDayText(at);
      return d ? `Your birthday is saved. You can change it again from ${d}.` : "Your birthday is saved and can't be changed again yet.";
    }
    case "LOYALTY_BIRTHDAY_INVALID":
      return "That date isn't in the calendar. Please check the day and the month.";
    case "LOYALTY_NO_PHONE":
      return "We don't have a mobile number for you yet. Ask the team to add it to your details, then tick this box again.";
    case "LOYALTY_COMFORT_INVALID":
      return "That choice isn't available any more. Please pick one of the options shown.";
    case "LOYALTY_LEFT":
      return "You left Carisma Circle, so this can't be saved. Rejoin from Credit & rewards to use it.";
    default:
      return "That didn't save, so nothing has changed. Please try again in a moment.";
  }
}

/* ── HTML ──────────────────────────────────────────────────────────────── */

export type ProfileMsg = { text: string; tone: "ok" | "bad" } | null | undefined;

function msgHTML(key: string, msg: ProfileMsg): string {
  return (
    `<p class="cw-circle-prefs__msg${msg ? ` cw-circle-prefs__msg--${msg.tone}` : ""}" role="status" aria-live="polite" data-cw-profile-msg="${key}">` +
    `${msg ? escapeHtml(msg.text) : ""}</p>`
  );
}

export function comfortHTML(c: CircleComfort | null, msg?: ProfileMsg): string {
  if (!c) return "";
  const groups = COMFORT_KEYS.map((k) => {
    const opts = c.choices[k]
      .map((ch) => {
        const id = `cw-comfort-${k}-${ch.value}`;
        return (
          `<span class="cw-comfort__opt">` +
          `<input type="radio" class="cw-comfort__radio" id="${escapeHtml(id)}" name="cw-comfort-${k}" value="${escapeHtml(ch.value)}" data-cw-comfort="${k}"` +
          (c.values[k] === ch.value ? " checked" : "") +
          `>` +
          `<label class="cw-comfort__chip" for="${escapeHtml(id)}">${escapeHtml(ch.label)}</label>` +
          `</span>`
        );
      })
      .join("");
    return (
      `<fieldset class="cw-comfort__group" ${M}><legend class="cw-label">${COMFORT_LABELS[k]}</legend>` +
      `<div class="cw-comfort__opts">${opts}</div></fieldset>`
    );
  }).join("");
  return (
    `<section class="cw-section cw-rise cw-circle-comfort" aria-labelledby="cw-circle-comfort-title" data-cw-circle="comfort">` +
    `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-comfort-title" tabindex="-1">So we can prepare your room</h2></div>` +
    `<div class="cw-card cw-circle-profile__card">` +
    groups +
    `<p class="cw-fine">Used only to set up your room at Carisma Spa, Aesthetics and Slimming. Change them any time.</p>` +
    msgHTML("comfort", msg) +
    `</div></section>`
  );
}

export function birthdayHTML(b: CircleBirthday | null, msg?: ProfileMsg): string {
  if (!b) return "";
  const head =
    `<section class="cw-section cw-rise cw-circle-bday" aria-labelledby="cw-circle-bday-title" data-cw-circle="birthday">` +
    `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-bday-title" tabindex="-1">Your birthday</h2></div>` +
    `<div class="cw-card cw-circle-profile__card">`;
  const foot = msgHTML("birthday", msg) + `</div></section>`;
  if (b.birthday && !b.editable) {
    const until = b.lockedUntil ? calendarDayText(b.lockedUntil) : "";
    return (
      head +
      `<p class="cw-circle__level" ${M}>${escapeHtml(birthdayText(b.birthday))}</p>` +
      `<p class="cw-fine">${until ? `You can change it again from ${escapeHtml(until)}.` : "It can't be changed again yet."}</p>` +
      foot
    );
  }
  const pick = b.birthday ?? b.prefill;
  const dayOpts =
    `<option value="">Day</option>` +
    Array.from({ length: 31 }, (_, i) => i + 1)
      .map((d) => `<option value="${d}"${pick && pick.day === d ? " selected" : ""}>${d}</option>`)
      .join("");
  const monthOpts =
    `<option value="">Month</option>` +
    MONTHS.map((name, i) => `<option value="${i + 1}"${pick && pick.month === i + 1 ? " selected" : ""}>${name}</option>`).join("");
  return (
    head +
    `<p class="cw-circle__rule">Day and month only, never the year. Once saved, it can be changed once a year.</p>` +
    (b.prefill && !b.birthday ? `<p class="cw-fine">Filled in from the date of birth we have for you. Check it and save.</p>` : "") +
    `<div class="cw-bday__row" ${M}>` +
    `<label class="cw-vh" for="cw-bday-day">Day</label><select class="cw-bday__select" id="cw-bday-day" data-cw-bday-day>${dayOpts}</select>` +
    `<label class="cw-vh" for="cw-bday-month">Month</label><select class="cw-bday__select" id="cw-bday-month" data-cw-bday-month>${monthOpts}</select>` +
    `<button type="button" class="cw-btn cw-btn--secondary cw-btn--sm" data-cw-bday-save>${b.birthday ? "Save" : "Save my birthday"}</button>` +
    `</div>` +
    (b.birthday ? `<p class="cw-fine" ${M}>${escapeHtml(`Saved as ${birthdayText(b.birthday)}.`)}</p>` : "") +
    foot
  );
}

export function whatsappUpdatesHTML(w: CircleWhatsapp | null, msg?: ProfileMsg): string {
  if (!w) return "";
  // With no number on file, a tick answers LOYALTY_NO_PHONE in full words (one sentence, never two).
  const to = w.phoneLast4 ? `To your mobile ending ${w.phoneLast4}.` : "";
  return (
    `<section class="cw-section cw-rise cw-circle-wa" aria-labelledby="cw-circle-wa-title" data-cw-circle="whatsapp-updates">` +
    `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-wa-title" tabindex="-1">Booking updates on WhatsApp</h2></div>` +
    `<div class="cw-card cw-circle-profile__card">` +
    `<div class="cw-circle-prefs__row">` +
    `<input type="checkbox" class="cw-circle-prefs__box" id="cw-wa-updates" data-cw-wa-updates` +
    (w.optedIn ? " checked" : "") +
    `>` +
    `<label class="cw-circle-prefs__label" for="cw-wa-updates">${escapeHtml(WHATSAPP_UPDATES_SENTENCE)}</label>` +
    `</div>` +
    (to ? `<p class="cw-fine" ${M}>${escapeHtml(to)}</p>` : "") +
    msgHTML("whatsapp", msg) +
    `</div></section>`
  );
}

export interface CircleDetailsInput {
  comfort: CircleComfort | null;
  birthday: CircleBirthday | null;
  whatsapp: CircleWhatsapp | null;
}

export type ProfileSection = "comfort" | "birthday" | "whatsapp";

/** One section's HTML (the part browser.ts redraws after a save, leaving the other two untouched). */
export function profileSectionHTML(section: ProfileSection, input: CircleDetailsInput, msg?: ProfileMsg): string {
  if (section === "comfort") return comfortHTML(input.comfort, msg);
  if (section === "birthday") return birthdayHTML(input.birthday, msg);
  return whatsappUpdatesHTML(input.whatsapp, msg);
}

/**
 * The Circle part of Details: each section in its own slot, so a save in one
 * never redraws (and never wipes the unsaved picks of) another. "" when nothing
 * answered live.
 */
export function circleDetailsHTML(input: CircleDetailsInput): string {
  const { comfort, birthday, whatsapp } = input;
  if (!comfort && !birthday && !whatsapp) return "";
  const slot = (s: ProfileSection) => `<div class="cw-circle-slot" data-cw-profile-slot="${s}">${profileSectionHTML(s, input)}</div>`;
  return (
    `<div class="cw-circle-profile" data-cw-qc="${CIRCLE_QC}" data-cw-circle="details">` +
    slot("comfort") +
    slot("birthday") +
    slot("whatsapp") +
    `</div>`
  );
}

/* ── "Complete your profile": what is still missing ────────────────────── */

const MISSING_WORDS: Record<string, string> = {
  email_verified: "verify your email address",
  birthday: "add your birthday",
  comfort: "choose your room preferences",
};

/** Can Details finish it? Birthday and comfort, yes; verifying an email, no (it is done from the email itself). */
export function profileMissingInDetails(missing: readonly string[] | undefined): boolean {
  return (missing ?? []).some((m) => m === "birthday" || m === "comfort");
}

/** "Still to do: add your birthday · choose your room preferences". "" when nothing (known) is missing. */
export function profileMissingText(missing: readonly string[] | undefined): string {
  const words = (missing ?? []).map((m) => MISSING_WORDS[m]).filter(Boolean);
  if (!words.length) return "";
  const first = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return `Still to do: ${[first, ...words.slice(1)].join(" · ")}`;
}
