/**
 * The two sheets a member meets on a booking: "Move your booking" and
 * "Cancel {Thursday}'s {treatment}?".
 *
 * Both are a native `<dialog>` opened with `showModal()` — the browser gives
 * us the focus trap, Esc, the top layer and `inert` behind it for free — and
 * both are appended INSIDE `.carisma-portal`, so they inherit the brand's
 * `--cw-account-*` tokens through the ordinary cascade even while they sit in
 * the top layer.
 *
 * This file is pure: labels, the day strip, the time grouping and the HTML.
 * browser.ts owns the listeners. Nothing here decides whether a booking may
 * move or what cancelling costs — those arrive from the server.
 */
import { escapeHtml } from "./html.js";
import type { SlotsModel } from "./reschedule.js";
import type { CancelSummary } from "./portalActions.js";

const M = 'data-clarity-mask="True"';
const MALTA = "Europe/Malta";

/* ── Calendar-date arithmetic (no zone involved) ───────────────────────── */

function ymd(dateStr: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** "2026-09-30" + 2 → "2026-10-02". Calendar arithmetic on noon UTC, so no DST edge can move it. */
export function addDays(dateStr: string, n: number): string {
  const p = ymd(dateStr);
  if (!p) return dateStr;
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n, 12));
  return d.toISOString().slice(0, 10);
}

/** Days from `a` to `b` (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  const pa = ymd(a);
  const pb = ymd(b);
  if (!pa || !pb) return 0;
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86_400_000);
}

export type DateStyle = "wk" | "wkLong" | "short" | "shortMonth" | "long";

/**
 * A calendar date in words. `short` "Thu 24", `shortMonth` "Sat 26 Sept",
 * `long` "Friday 25 September", `wkLong` "Thursday". Never ISO: a member
 * should never read "2026-09-26" on a button.
 */
export function dateWords(dateStr: string, style: DateStyle): string {
  const p = ymd(dateStr);
  if (!p) return dateStr;
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2], 12));
  const f = (o: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...o }).format(d);
    } catch {
      return dateStr;
    }
  };
  switch (style) {
    case "wk":
      return f({ weekday: "short" });
    case "wkLong":
      return f({ weekday: "long" });
    case "short":
      return f({ weekday: "short", day: "numeric" });
    case "shortMonth":
      return f({ weekday: "short", day: "numeric", month: "short" });
    default:
      return f({ weekday: "long", day: "numeric", month: "long" });
  }
}

/** An instant in words, on the Malta clock. `short` "Sat 26 Sept, 10:00", `long` "Saturday 26 September, 10:00". */
export function instantWords(iso: string, style: "short" | "long" = "short", timeZone = MALTA): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  try {
    const day = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: style === "long" ? "long" : "short",
      day: "numeric",
      month: style === "long" ? "long" : "short",
    }).format(new Date(ms));
    const clock = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(
      new Date(ms),
    );
    return `${day}, ${clock}`;
  } catch {
    return "";
  }
}

/** "10:00" on the venue clock. */
export function clockOf(iso: string, timeZone = MALTA): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(
      new Date(ms),
    );
  } catch {
    return "";
  }
}

/* ── The day strip ─────────────────────────────────────────────────────── */

export interface DayChip {
  date: string;
  wk: string;
  day: string;
  mon: string;
  /** The day the booking is on now. Dotted, never pre-selected by accident. */
  isCurrent: boolean;
  /** "Saturday 26 September" for the accessible name. */
  long: string;
}

/**
 * `count` consecutive days from `start`. The strip opens on the BOOKING's day,
 * not today: someone moving a Saturday massage is thinking about that
 * weekend, and a strip starting on a Tuesday makes them scroll to find it.
 */
export function buildDayStrip(start: string, count: number, currentDate: string): DayChip[] {
  const out: DayChip[] = [];
  for (let i = 0; i < count; i++) {
    const date = addDays(start, i);
    const p = ymd(date);
    out.push({
      date,
      wk: dateWords(date, "wk"),
      day: p ? String(p[2]) : "",
      mon: (() => {
        if (!p) return "";
        try {
          return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short" }).format(
            new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)),
          );
        } catch {
          return "";
        }
      })(),
      isCurrent: date === currentDate,
      long: dateWords(date, "long"),
    });
  }
  return out;
}

/* ── The times ─────────────────────────────────────────────────────────── */

export interface TimeOption {
  time: string;
  /** The booking's own slot: shown, disabled, labelled "Current". */
  current: boolean;
}

/**
 * The times worth showing on a day: every FREE slot, plus the booking's own
 * slot when this is its day (the server reports it as taken — by this very
 * booking — and a member who cannot see their current time loses their place).
 */
export function timeOptions(slots: SlotsModel, currentDate: string, currentTime: string): TimeOption[] {
  const free = slots.slots.filter((s) => s.available).map((s) => ({ time: s.time.slice(0, 5), current: false }));
  const out = free.filter((o) => !(slots.date === currentDate && o.time === currentTime));
  if (slots.date === currentDate && currentTime) out.push({ time: currentTime, current: true });
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export type DayPart = "Morning" | "Afternoon" | "Evening";

export function dayPart(time: string): DayPart {
  const h = Number(time.slice(0, 2));
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

/** Morning / Afternoon / Evening, but only when there are more than 8 times — fewer read fine as one row. */
export function groupTimes(options: TimeOption[]): Array<{ label: DayPart | null; options: TimeOption[] }> {
  if (options.length <= 8) return [{ label: null, options }];
  const groups: Array<{ label: DayPart; options: TimeOption[] }> = [];
  for (const o of options) {
    const label = dayPart(o.time);
    const g = groups.find((x) => x.label === label);
    if (g) g.options.push(o);
    else groups.push({ label, options: [o] });
  }
  return groups;
}

/* ── Shared frame ──────────────────────────────────────────────────────── */

const CLOSE_ICON =
  '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
  'stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>';

export function dialogFrameHTML(opts: {
  kind: "reschedule" | "cancel";
  title: string;
  sub?: string;
  body: string;
  foot?: string;
}): string {
  const id = `cw-dlg-${opts.kind}`;
  return (
    `<dialog class="cw-dialog cw-dialog--${opts.kind}" data-cw-dialog="${opts.kind}" aria-labelledby="${id}-title"` +
    (opts.sub ? ` aria-describedby="${id}-sub"` : "") +
    `>` +
    `<div class="cw-dialog__grab" aria-hidden="true"></div>` +
    `<header class="cw-dialog__head">` +
    `<div class="cw-dialog__heading"><h2 class="cw-t2 cw-dialog__title" id="${id}-title" ${M}>${escapeHtml(opts.title)}</h2>` +
    (opts.sub ? `<p class="cw-dialog__sub" id="${id}-sub" ${M}>${opts.sub}</p>` : "") +
    `</div>` +
    `<button type="button" class="cw-dialog__close" data-cw-dialog-close aria-label="Close">${CLOSE_ICON}</button>` +
    `</header>` +
    `<div class="cw-dialog__body">${opts.body}</div>` +
    `<div class="cw-dialog__foot">${opts.foot ?? ""}</div>` +
    `</dialog>`
  );
}

/* ── Reschedule ────────────────────────────────────────────────────────── */

export interface RescheduleContext {
  treatment: string;
  venue: string;
  /** The booking's start, UTC. */
  startIso: string;
  /** The first day chip (YYYY-MM-DD). */
  stripStart: string;
  /** The booking's own day on the venue clock. */
  currentDate: string;
  /** The earliest date the native picker may offer (today, venue clock). */
  minDate: string;
}

/** "Couples Full Body Massage · Hugo's Hotel · now Sat 26 Sept, 10:00" (escaped). */
export function rescheduleSubline(treatment: string, venue: string, startIso: string): string {
  const now = instantWords(startIso, "short");
  return [treatment, venue, now ? `now ${now}` : ""]
    .filter(Boolean)
    .map((s) => escapeHtml(s))
    .join(" · ");
}

export function dayChipsHTML(days: DayChip[], selected: string): string {
  return days
    .map(
      (d) =>
        `<button type="button" class="cw-rs-day${d.isCurrent ? " is-current" : ""}" data-cw-rs-day="${escapeHtml(d.date)}" ` +
        `aria-pressed="${d.date === selected ? "true" : "false"}" ` +
        `aria-label="${escapeHtml(d.long + (d.isCurrent ? " — your booking's day" : ""))}">` +
        `<span class="cw-rs-day__wk">${escapeHtml(d.wk)}</span>` +
        `<span class="cw-rs-day__num">${escapeHtml(d.day)}</span>` +
        `<span class="cw-rs-day__mon">${escapeHtml(d.mon)}</span>` +
        `</button>`,
    )
    .join("");
}

export function timesSkeletonHTML(): string {
  return (
    `<div class="cw-rs-grid" aria-hidden="true">` +
    Array.from({ length: 8 }, () => `<span class="cw-skel cw-rs-skel"></span>`).join("") +
    `</div><p class="cw-vh">Loading free times…</p>`
  );
}

export interface TimesState {
  /** The day being shown. */
  date: string;
  phase: "loading" | "ready" | "failed";
  slots?: SlotsModel | null;
  currentDate: string;
  currentTime: string;
  selected: string | null;
  /** A refusal from the server, shown beside the times (role=alert). */
  alert?: string | null;
  /** Times the server just refused, hidden until the day is re-read. */
  taken?: string[];
}

export function rescheduleTimesHTML(s: TimesState): string {
  const alert = s.alert ? `<p class="cw-rs-alert" role="alert">${escapeHtml(s.alert)}</p>` : "";
  if (s.phase === "loading") return alert + timesSkeletonHTML();
  if (s.phase === "failed" || !s.slots) {
    return (
      alert +
      `<div class="cw-rs-none" role="alert"><p class="cw-rs-none__title">We couldn't load the free times just now.</p>` +
      `<button type="button" class="cw-btn cw-btn--secondary cw-btn--sm" data-cw-rs-day="${escapeHtml(s.date)}">Try again</button></div>`
    );
  }
  const slots = s.slots;
  if (!slots.offeredHere) {
    return (
      alert +
      `<div class="cw-rs-none"><p class="cw-rs-none__title">This treatment isn't offered at this venue any more.</p>` +
      `<p class="cw-rs-none__text">Please call us and we'll find you something.</p></div>`
    );
  }
  const taken = new Set(s.taken ?? []);
  const options = timeOptions(slots, s.currentDate, s.currentTime).filter((o) => o.current || !taken.has(o.time));
  const bookable = options.filter((o) => !o.current);
  if (!bookable.length) {
    const next = slots.nextAvailableDate && slots.nextAvailableDate !== s.date ? slots.nextAvailableDate : null;
    return (
      alert +
      `<div class="cw-rs-none">` +
      `<p class="cw-rs-none__title">Nothing free on ${escapeHtml(dateWords(s.date, "short"))}.</p>` +
      (next
        ? `<button type="button" class="cw-btn cw-btn--primary cw-btn--sm" data-cw-rs-day="${escapeHtml(next)}">` +
          `Show ${escapeHtml(dateWords(next, "short"))}</button>`
        : `<p class="cw-rs-none__text">Try another day.</p>`) +
      `</div>` +
      // The booking's own time, still shown so the member keeps their bearings.
      (options.length ? timeGridHTML(options, s) : "")
    );
  }
  return alert + timeGridHTML(options, s);
}

function timeGridHTML(options: TimeOption[], s: TimesState): string {
  const day = dateWords(s.date, "long");
  return groupTimes(options)
    .map(
      (g) =>
        `<div class="cw-rs-group">` +
        (g.label ? `<p class="cw-label cw-rs-group__label">${g.label}</p>` : "") +
        `<div class="cw-rs-grid">` +
        g.options
          .map((o) =>
            o.current
              ? `<button type="button" class="cw-rs-time is-current" disabled aria-label="${escapeHtml(`${day}, ${o.time} — your current time`)}">` +
                `<span class="cw-rs-time__clock">${escapeHtml(o.time)}</span><span class="cw-rs-time__tag">Current</span></button>`
              : `<button type="button" class="cw-rs-time" data-cw-rs-time="${escapeHtml(o.time)}" ` +
                `aria-pressed="${s.selected === o.time ? "true" : "false"}" aria-label="${escapeHtml(`${day}, ${o.time}`)}">` +
                `<span class="cw-rs-time__clock">${escapeHtml(o.time)}</span></button>`,
          )
          .join("") +
        `</div></div>`,
    )
    .join("");
}

/** The review bar: the change in words, and the only button that moves anything. */
export function reviewBarHTML(oldLabel: string, newLabel: string, busy = false): string {
  return (
    `<div class="cw-rs-review">` +
    `<p class="cw-rs-change" ${M}><span class="cw-rs-change__old">${escapeHtml(oldLabel)}</span>` +
    `<span class="cw-rs-change__arrow" aria-hidden="true">→</span><span class="cw-vh"> to </span>` +
    `<span class="cw-rs-change__new">${escapeHtml(newLabel)}</span></p>` +
    `<div class="cw-rs-review__actions">` +
    `<button type="button" class="cw-btn cw-btn--primary${busy ? " is-busy" : ""}" data-cw-rs-commit` +
    (busy ? ' aria-disabled="true"' : "") +
    `>${busy ? "Moving…" : "Move my booking"}</button>` +
    `<button type="button" class="cw-btn cw-btn--quiet" data-cw-dialog-close>Keep current time</button>` +
    `</div></div>`
  );
}

export function rescheduleDialogHTML(ctx: RescheduleContext | null, days: DayChip[], selected: string): string {
  const sub = ctx ? rescheduleSubline(ctx.treatment, ctx.venue, ctx.startIso) : "";
  const body = ctx
    ? `<div class="cw-rs-days" role="group" aria-label="Choose a day">${dayChipsHTML(days, selected)}</div>` +
      `<div class="cw-rs-other">` +
      `<button type="button" class="cw-btn cw-btn--quiet cw-rs-other__toggle" data-cw-rs-other aria-expanded="false">Pick another date</button>` +
      `<label class="cw-rs-other__field" hidden><span class="cw-label">Date</span>` +
      `<input type="date" class="cw-rs-other__input" data-cw-rs-date min="${escapeHtml(ctx.minDate)}" value="${escapeHtml(selected)}"></label>` +
      `</div>` +
      `<div class="cw-rs-times" data-cw-rs-times aria-live="polite">${timesSkeletonHTML()}</div>` +
      `<p class="cw-fine cw-rs-note">Same treatment and venue. Malta time.</p>`
    : `<div class="cw-rs-days" aria-hidden="true">${Array.from({ length: 6 }, () => `<span class="cw-skel cw-rs-skel cw-rs-skel--day"></span>`).join("")}</div>` +
      `<div class="cw-rs-times" data-cw-rs-times aria-live="polite">${timesSkeletonHTML()}</div>`;
  return dialogFrameHTML({
    kind: "reschedule",
    title: "Move your booking",
    sub: sub || undefined,
    body,
    foot: "",
  });
}

/* ── Cancel ────────────────────────────────────────────────────────────── */

/** "Cancel Thursday's Lipocavitation?" */
export function cancelTitle(startIso: string, treatment: string): string {
  const ms = Date.parse(startIso);
  let wk = "";
  if (Number.isFinite(ms)) {
    try {
      wk = new Intl.DateTimeFormat("en-GB", { timeZone: MALTA, weekday: "long" }).format(new Date(ms));
    } catch {
      wk = "";
    }
  }
  const what = treatment || "booking";
  return wk ? `Cancel ${wk}'s ${what}?` : `Cancel your ${what}?`;
}

export function cancelBodyHTML(s: CancelSummary | null, canReschedule: boolean, alert?: string | null): string {
  const swap = canReschedule
    ? `<p class="cw-cx-swap">Want a different time instead? ` +
      `<button type="button" class="cw-link cw-cx-swap__btn" data-cw-cx-reschedule>Reschedule</button></p>`
    : "";
  const err = alert ? `<p class="cw-rs-alert" role="alert">${escapeHtml(alert)}</p>` : "";
  if (!s) {
    return (
      swap +
      err +
      `<div class="cw-cx-summary" aria-hidden="true"><span class="cw-skel cw-skel--line" style="width:40%"></span>` +
      `<span class="cw-skel cw-skel--line" style="width:30%;height:22px"></span></div>` +
      `<span class="cw-skel cw-skel--line" style="width:90%"></span><p class="cw-vh">Checking what cancelling costs…</p>`
    );
  }
  return (
    swap +
    err +
    (s.headline
      ? `<div class="cw-cx-summary cw-cx-summary--${s.tone}">` +
        `<p class="cw-label">${escapeHtml(s.headline)}</p>` +
        (s.amount ? `<p class="cw-cx-summary__amount" ${M}>${escapeHtml(s.amount)}</p>` : "") +
        `</div>`
      : "") +
    s.lines.map((l) => `<p class="cw-cx-line" ${M}>${escapeHtml(l)}</p>`).join("") +
    (s.policyText ? `<p class="cw-fine cw-cx-policy">${escapeHtml(s.policyText)}</p>` : "")
  );
}

export function cancelFootHTML(s: CancelSummary | null, busy = false): string {
  const label = busy ? "Cancelling…" : s ? s.confirmLabel : "Cancel booking";
  return (
    `<div class="cw-cx-actions">` +
    `<button type="button" class="cw-btn cw-btn--primary" data-cw-dialog-close autofocus>Keep my booking</button>` +
    `<button type="button" class="cw-btn cw-btn--danger${busy ? " is-busy" : ""}" data-cw-cx-commit` +
    (busy || !s ? ' aria-disabled="true"' : "") +
    `>${escapeHtml(label)}</button>` +
    `</div>`
  );
}

export function cancelDialogHTML(opts: {
  startIso: string;
  treatment: string;
  summary: CancelSummary | null;
  canReschedule: boolean;
}): string {
  return dialogFrameHTML({
    kind: "cancel",
    title: cancelTitle(opts.startIso, opts.treatment),
    body: cancelBodyHTML(opts.summary, opts.canReschedule),
    foot: cancelFootHTML(opts.summary),
  });
}
