/**
 * The member's record, as opposed to their diary: what they have already paid
 * for (gift cards, packages, account credit), what they still owe, what they
 * have signed, and what their membership costs.
 *
 * All of it existed in CarismaSoft and none of it was readable from a website.
 * A member with €85 of credit and four sessions left on a package had no way
 * to see either without ringing the desk, which is also how the desk found out
 * they had forgotten.
 *
 * Every builder here is pure: a wire body in, a view model out, no DOM and no
 * fetch. The wire shapes are defensive on purpose — these are five separate
 * CarismaSoft endpoints written at different times, and a missing field must
 * render as "—", never as NaN and never as a thrown page.
 */
import { escapeHtml } from "./html.js";
import { eur, plainDate } from "./money.js";

export const MEMBER_RECORDS_QC = "account-records-20260922";

const M = 'data-clarity-mask="True"';

/**
 * Step inside the house envelope.
 *
 * Keyed on `data` being PRESENT, not on `success === true`. The live routes all
 * send `{success:true,data}`, but a cached body, a proxy that replays only the
 * payload, or a route written before the helper existed sends the bare object —
 * and a strict check turns each of those into a silently empty section rather
 * than an error anyone would see.
 */
function unwrap(body: unknown): unknown {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const o = body as Record<string, unknown>;
    if ("data" in o && o.data !== null && typeof o.data === "object") return o.data;
  }
  return body;
}

/** Rows out of any of the house shapes: `[]`, `{data:[]}`, `{items:[]}`. */
function rows(body: unknown): Array<Record<string, unknown>> {
  const inner = unwrap(body);
  const pick = (v: unknown): Array<Record<string, unknown>> =>
    Array.isArray(v) ? v.filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object") : [];
  if (Array.isArray(inner)) return pick(inner);
  if (inner && typeof inner === "object") {
    const o = inner as Record<string, unknown>;
    // `cards`: GET /client/gift-cards answers `{ cards, totalsByBrand }`
    // (backend ClientGiftCardWalletDTO). Reading only data/items made every
    // member's wallet show no gift cards at all (referral v2 pack, P11).
    for (const key of ["data", "items", "cards"]) {
      const list = pick(o[key]);
      if (list.length) return list;
    }
  }
  return [];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** The first of several possible field names, for DTOs written years apart. */
function firstOf(o: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

/* ── Shared pieces ─────────────────────────────────────────────────────── */

/**
 * What a record view may know about the page around it. Optional: bodyFor is
 * called with answers alone today, and every view renders correctly without
 * it — the name label and the tel link simply do not appear.
 */
export interface RecordsContext {
  /** The member's first name, for the membership card. */
  memberName?: string;
  /** The brand's phone ("+35627802062"), offered beside "speak to the team". */
  contactPhone?: string;
}

const MALTA = "Europe/Malta";

/** One Malta-clock part of a date ("24", "Sept", "2026", "9"). "" when unreadable. */
function part(raw: string, opts: Intl.DateTimeFormatOptions, type: Intl.DateTimeFormatPartTypes): string {
  const ms = Date.parse(raw);
  if (!raw || !Number.isFinite(ms)) return "";
  try {
    const found = new Intl.DateTimeFormat("en-GB", { timeZone: MALTA, ...opts })
      .formatToParts(new Date(ms))
      .find((p) => p.type === type);
    return found ? found.value : "";
  } catch {
    return "";
  }
}

/** "September 2026" + a sortable "2026-09" key, on the Malta clock. */
export function monthOf(raw: string): { key: string; label: string } {
  const y = part(raw, { year: "numeric" }, "year");
  const mNum = part(raw, { month: "numeric" }, "month");
  const mLong = part(raw, { month: "long" }, "month");
  if (!y || !mNum) return { key: "", label: "Earlier" };
  return { key: `${y}-${mNum.padStart(2, "0")}`, label: `${mLong} ${y}` };
}

/** The 80px date column: day number over a month label. Empty when there is no date. */
function dateCol(raw: string): string {
  const day = part(raw, { day: "numeric" }, "day");
  const mon = part(raw, { month: "short" }, "month");
  if (!day) return `<span class="cw-ledger__date" aria-hidden="true"></span>`;
  return (
    `<span class="cw-ledger__date" aria-hidden="true">` +
    `<span class="cw-ledger__day">${escapeHtml(day)}</span>` +
    `<span class="cw-ledger__mon">${escapeHtml(mon)}</span></span>`
  );
}

/** "+356 2780 2062" for a Maltese number; anything else as given. */
function phoneLabel(raw: string): string {
  const d = raw.replace(/\s+/g, "");
  const mt = /^\+356(\d{4})(\d{4})$/.exec(d);
  return mt ? `+356 ${mt[1]} ${mt[2]}` : raw.trim();
}

function icon(paths: string, size = 26): string {
  return (
    `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  );
}
const GIFT_ICON = icon('<rect x="3.5" y="8.5" width="17" height="12" rx="2"></rect><path d="M3.5 12.5h17M12 8.5v12M12 8.5c-1.8-3.6-5.5-3.9-5.5-1.6 0 1.1 1.2 1.6 5.5 1.6zM12 8.5c1.8-3.6 5.5-3.9 5.5-1.6 0 1.1-1.2 1.6-5.5 1.6z"></path>');
const DOC_ICON = icon('<path d="M7 3.5h7l4.5 4.5v12.5H7z"></path><path d="M14 3.5V8h4.5M10 12.5h5.5M10 16h5.5"></path>');
const CARD_ICON = icon('<rect x="3" y="5.5" width="18" height="13" rx="2.5"></rect><path d="M3 10h18M7 14.5h4"></path>');
const CHECK_ICON = icon('<circle cx="12" cy="12" r="8.5"></circle><path d="M8.5 12.2l2.4 2.4 4.6-5"></path>', 22);

function emptyHTML(glyph: string, title: string, text: string, action = ""): string {
  return (
    `<section class="cw-empty cw-rise">` +
    `<span class="cw-empty__icon">${glyph}</span>` +
    `<h2 class="cw-t2">${escapeHtml(title)}</h2>` +
    `<p class="cw-empty__text">${escapeHtml(text)}</p>` +
    action +
    `</section>`
  );
}

function sectionHead(title: string, count?: number): string {
  return (
    `<div class="cw-section__head"><h2 class="cw-section__title">${escapeHtml(title)}` +
    (count !== undefined ? `<span class="cw-section__count">${count}</span>` : "") +
    `</h2></div>`
  );
}

/** Every record view's root. The class lets the stylesheet retire the legacy wrapper around it. */
function recordRoot(view: string, inner: string): string {
  return `<div class="cw-rec cw-rec--${view}">${inner}</div>`;
}

/* ── Wallet: gift cards, packages, credit ──────────────────────────────── */

export interface GiftCardView {
  code: string;
  balance: number;
  originalValue: number;
  expiresAt: string | null;
  from: string | null;
  brand: string | null;
  /** A free referral voucher (`origin: "REFERRAL_REWARD"`): treatments only, no cash value. */
  referralReward: boolean;
}

export interface PackageView {
  name: string;
  sessionsLeft: number | null;
  sessionsTotal: number | null;
  expiresAt: string | null;
  amountDue: number;
}

export interface WalletModel {
  giftCards: GiftCardView[];
  packages: PackageView[];
  credit: number;
  isEmpty: boolean;
}

export function buildWalletModel(input: {
  giftCards?: unknown;
  packages?: unknown;
  credit?: unknown;
}): WalletModel {
  const giftCards: GiftCardView[] = rows(input.giftCards).map((g) => {
    const brandObj = g.brand && typeof g.brand === "object" ? (g.brand as Record<string, unknown>) : {};
    return {
      code: str(firstOf(g, ["code", "cardCode", "reference"])),
      balance: num(firstOf(g, ["balance", "remainingAmount", "currentBalance"])),
      originalValue: num(firstOf(g, ["originalValue", "initialAmount", "amount", "value"])),
      expiresAt: str(firstOf(g, ["expiresAt", "expiryDate", "validUntil"])) || null,
      from: str(firstOf(g, ["purchaserName", "senderName", "from"])) || null,
      brand: str(firstOf(g, ["brandName"])) || str(brandObj.name) || null,
      referralReward: str(firstOf(g, ["origin"])) === "REFERRAL_REWARD",
    };
  });

  const packages: PackageView[] = rows(input.packages).map((p) => {
    const left = firstOf(p, ["sessionsRemaining", "remainingSessions", "sessionsLeft"]);
    const total = firstOf(p, ["sessionsTotal", "totalSessions", "sessions"]);
    return {
      name: str(firstOf(p, ["planNameSnapshot", "name", "planName"])) || "Package",
      sessionsLeft: left === undefined ? null : num(left),
      sessionsTotal: total === undefined ? null : num(total),
      expiresAt: str(firstOf(p, ["expiresAt", "expiryDate", "validUntil"])) || null,
      amountDue: num(firstOf(p, ["amountDue", "balanceDue"])),
    };
  });

  const creditRaw = unwrap(input.credit);
  const credit =
    creditRaw && typeof creditRaw === "object"
      ? num(firstOf(creditRaw as Record<string, unknown>, ["balance", "creditBalance", "amount"]))
      : num(creditRaw);

  return {
    giftCards,
    packages,
    credit,
    isEmpty: giftCards.length === 0 && packages.length === 0 && credit <= 0,
  };
}

/**
 * "Available to spend": account credit plus what is left on gift cards.
 * Packages are NOT money — they are sessions — so they never add to it, and a
 * spent card (or a negative figure from a bad row) never subtracts from it.
 */
export function walletTotal(m: WalletModel): number {
  const cards = m.giftCards.reduce((sum, g) => sum + Math.max(0, g.balance), 0);
  return Math.round((Math.max(0, m.credit) + cards) * 100) / 100;
}

/** "Credit €85.00 · 2 gift cards · 1 package" — only the parts that exist. */
export function walletSources(m: WalletModel): string {
  const n = (k: number, one: string) => `${k} ${one}${k === 1 ? "" : "s"}`;
  return [
    m.credit > 0 ? `Credit ${eur(m.credit)}` : "",
    m.giftCards.length ? n(m.giftCards.length, "gift card") : "",
    m.packages.length ? n(m.packages.length, "package") : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function giftCardHTML(g: GiftCardView): string {
  const spent = g.balance <= 0;
  const of = [
    g.originalValue > 0 ? `of ${eur(g.originalValue)}` : "",
    // Expiry is stated plainly rather than hidden. A member finding out at
    // the desk that a card expired last month is what this line prevents.
    g.expiresAt ? `valid until ${plainDate(g.expiresAt)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const label = `Gift card, ${eur(g.balance)} left` + (g.code ? `, code ${g.code}` : "");
  return (
    `<li class="cw-gift${spent ? " cw-gift--spent" : ""}" aria-label="${escapeHtml(label)}" ${M}>` +
    `<div class="cw-gift__top">` +
    `<span class="cw-gift__brand">${escapeHtml(g.brand || "Gift card")}</span>` +
    (spent
      ? `<span class="cw-gift__tag">Spent</span>`
      : g.referralReward
        ? `<span class="cw-gift__tag">Referral reward</span>`
        : g.from
          ? `<span class="cw-gift__from">From ${escapeHtml(g.from)}</span>`
          : "") +
    `</div>` +
    `<div class="cw-gift__foot">` +
    `<div class="cw-gift__money"><span class="cw-gift__balance">${escapeHtml(eur(g.balance))}</span>` +
    (of ? `<span class="cw-gift__of">${escapeHtml(of)}</span>` : "") +
    `</div>` +
    (g.code ? `<span class="cw-gift__code">${escapeHtml(g.code)}</span>` : "") +
    `</div></li>`
  );
}

/** One segment per session; past 24 sessions the segments would be slivers, so it becomes one bar. */
function meterHTML(left: number, total: number): string {
  const safeTotal = Math.max(0, Math.round(total));
  const safeLeft = Math.min(safeTotal, Math.max(0, Math.round(left)));
  const label = `${safeLeft} of ${safeTotal} sessions left`;
  if (safeTotal <= 24) {
    const segs = Array.from({ length: safeTotal }, (_, i) => `<span class="cw-meter__seg${i < safeLeft ? " is-on" : ""}"></span>`).join("");
    return `<div class="cw-meter" role="img" aria-label="${escapeHtml(label)}" style="--cw-n:${safeTotal}">${segs}</div>`;
  }
  const pct = safeTotal ? Math.round((safeLeft / safeTotal) * 1000) / 10 : 0;
  return (
    `<div class="cw-meter cw-meter--bar" role="img" aria-label="${escapeHtml(label)}">` +
    `<span class="cw-meter__fill" style="width:${pct}%"></span></div>`
  );
}

function packageHTML(p: PackageView): string {
  const known = p.sessionsLeft !== null && p.sessionsTotal !== null && p.sessionsTotal > 0;
  const count = known
    ? `${p.sessionsLeft} of ${p.sessionsTotal} sessions left`
    : p.sessionsLeft !== null
      ? `${p.sessionsLeft} session${p.sessionsLeft === 1 ? "" : "s"} left`
      : "";
  const used = known && (p.sessionsLeft ?? 0) <= 0;
  return (
    `<li class="cw-pack" ${M}>` +
    `<div class="cw-pack__head"><p class="cw-pack__name">${escapeHtml(p.name)}</p>` +
    (used ? `<span class="cw-chip cw-chip--neutral">Used</span>` : "") +
    `</div>` +
    (known ? meterHTML(p.sessionsLeft ?? 0, p.sessionsTotal ?? 0) : "") +
    `<div class="cw-pack__meta">` +
    (count ? `<span class="cw-pack__count">${escapeHtml(count)}</span>` : "") +
    (p.expiresAt ? `<span>Valid until ${escapeHtml(plainDate(p.expiresAt))}</span>` : "") +
    `</div>` +
    (p.amountDue > 0 ? `<p class="cw-pack__due">${escapeHtml(eur(p.amountDue))} still to pay</p>` : "") +
    `</li>`
  );
}

export function walletHTML(m: WalletModel): string {
  if (m.isEmpty) {
    return recordRoot(
      "wallet",
      emptyHTML(
        GIFT_ICON,
        "No credit or gift cards yet",
        "Gift cards, treatment packages and account credit will appear here, ready to spend.",
        `<a class="cw-btn cw-btn--quiet" href="/gifts">Buy a gift card <span aria-hidden="true">→</span></a>`,
      ),
    );
  }
  const total = walletTotal(m);
  const sources = walletSources(m);
  // The hero is money. A member holding only package sessions has no money
  // to show, and "€0.00 available" above four facials reads as a loss.
  const hero =
    total > 0 || m.credit > 0 || m.giftCards.length
      ? `<section class="cw-balance cw-rise" aria-label="Available to spend">` +
        `<p class="cw-label">Available to spend</p>` +
        `<p class="cw-balance__value" ${M}>${escapeHtml(eur(total))}</p>` +
        (sources ? `<p class="cw-balance__sources" ${M}>${escapeHtml(sources)}</p>` : "") +
        `</section>`
      : "";

  const gifts = m.giftCards.length
    ? `<section class="cw-section cw-rise">` +
      sectionHead("Gift cards", m.giftCards.length) +
      `<ul class="cw-gifts" tabindex="0" role="list" aria-label="Gift cards">${m.giftCards.map(giftCardHTML).join("")}</ul>` +
      `</section>`
    : "";

  const packs = m.packages.length
    ? `<section class="cw-section cw-rise">` +
      sectionHead("Packages", m.packages.length) +
      `<ul class="cw-packs" role="list">${m.packages.map(packageHTML).join("")}</ul>` +
      `</section>`
    : "";

  return recordRoot("wallet", hero + gifts + packs);
}

/* ── Statement ─────────────────────────────────────────────────────────── */

export interface StatementLineView {
  description: string;
  kind: string;
  amountDue: number;
  amountPaid: number;
  total: number;
  when: string;
  appointmentId: string | null;
  receiptUrl: string | null;
}

export interface StatementModel {
  totalDue: number;
  due: StatementLineView[];
  history: StatementLineView[];
}

function statementLine(l: Record<string, unknown>): StatementLineView {
  return {
    description: str(l.description) || "Carisma",
    kind: str(l.kind),
    amountDue: num(l.amountDue),
    amountPaid: num(l.amountPaid),
    total: num(l.total),
    when: str(firstOf(l, ["dueAt", "occurredAt"])),
    appointmentId: str(l.appointmentId) || null,
    receiptUrl: str(firstOf(l, ["receiptUrl", "invoiceUrl"])) || null,
  };
}

function whenMs(l: StatementLineView): number {
  const ms = Date.parse(l.when);
  return Number.isFinite(ms) ? ms : 0;
}

export function buildStatementModel(body: unknown): StatementModel {
  const inner = unwrap(body);
  const o = (inner && typeof inner === "object" ? inner : {}) as Record<string, unknown>;
  const due = rows(o.due).map(statementLine).filter((l) => l.amountDue > 0);
  const history = rows(o.history)
    .map(statementLine)
    .sort((a, b) => whenMs(b) - whenMs(a));
  // The server's own total wins; the sum is only for a body that left it out.
  const sum = due.reduce((s, l) => s + l.amountDue, 0);
  const totalDue = num(o.totalDue) > 0 ? num(o.totalDue) : Math.round(sum * 100) / 100;
  return { totalDue, due: due.sort((a, b) => whenMs(a) - whenMs(b)), history };
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "appointment_balance":
      return "Visit";
    case "cancellation_fee":
    case "no_show_fee":
      return "Fee";
    case "membership_invoice":
      return "Membership";
    case "package":
    case "package_invoice":
      return "Package";
    case "gift_card":
      return "Gift card";
    default:
      return "";
  }
}

function lineTitle(l: StatementLineView): string {
  const text = escapeHtml(l.description);
  return l.appointmentId
    ? `<a class="cw-ledger__link" href="/account/bookings/${encodeURIComponent(l.appointmentId)}">${text}</a>`
    : text;
}

function dueRowHTML(l: StatementLineView, single: boolean): string {
  const meta = [
    kindLabel(l.kind),
    l.amountPaid > 0 ? `${eur(l.amountPaid)} paid so far` : "",
    l.when ? plainDate(l.when) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const amount = eur(l.amountDue);
  // Pay-balance is per booking. A line with no booking behind it (an
  // invoice, a package instalment) is settled at the desk, and says so.
  const action = l.appointmentId
    ? `<button type="button" class="cw-btn ${single ? "cw-btn--primary" : "cw-btn--secondary"} cw-btn--sm cw-ledger__pay" ` +
      `data-cw-action="pay" data-cw-appt="${escapeHtml(l.appointmentId)}" ` +
      `aria-label="${escapeHtml(`Pay ${amount} for ${l.description}`)}">Pay ${escapeHtml(amount)}</button>`
    : `<span class="cw-ledger__desk">Pay at the desk</span>`;
  return (
    `<div class="cw-ledger__row cw-ledger__row--due" role="listitem" ${M}>` +
    dateCol(l.when) +
    `<div class="cw-ledger__main"><div class="cw-ledger__title">${lineTitle(l)}</div>` +
    (meta ? `<p class="cw-ledger__meta">${escapeHtml(meta)}</p>` : "") +
    `</div>` +
    `<div class="cw-ledger__end"><span class="cw-ledger__amount">${escapeHtml(amount)}</span>${action}</div>` +
    `</div>`
  );
}

function historyRowHTML(l: StatementLineView): string {
  const meta = [kindLabel(l.kind), l.when ? plainDate(l.when) : ""].filter(Boolean).join(" · ");
  const receipt = l.receiptUrl
    ? `<a class="cw-btn cw-btn--quiet cw-ledger__receipt" href="${escapeHtml(l.receiptUrl)}" target="_blank" rel="noreferrer">Receipt</a>`
    : "";
  return (
    `<div class="cw-ledger__row" role="listitem" ${M}>` +
    dateCol(l.when) +
    `<div class="cw-ledger__main"><div class="cw-ledger__title">${lineTitle(l)}</div>` +
    (meta ? `<p class="cw-ledger__meta">${escapeHtml(meta)}</p>` : "") +
    `</div>` +
    `<div class="cw-ledger__end"><span class="cw-ledger__amount">${escapeHtml(eur(l.amountPaid || l.total))}</span>${receipt}</div>` +
    `</div>`
  );
}

export function statementHTML(m: StatementModel): string {
  const owed = m.due.length > 0 && m.totalDue > 0;
  const payable = m.due.filter((l) => l.appointmentId).length;

  const summary = owed
    ? `<section class="cw-owed cw-rise" aria-label="To pay">` +
      `<span class="cw-owed__icon">${CARD_ICON}</span>` +
      `<div class="cw-owed__text"><p class="cw-owed__line" ${M}><span class="cw-owed__value">${escapeHtml(eur(m.totalDue))}</span> <span class="cw-owed__word">to pay</span></p>` +
      `<p class="cw-owed__sub">${m.due.length} item${m.due.length === 1 ? "" : "s"} · Prices include VAT</p></div>` +
      `</section>`
    : `<section class="cw-settled cw-rise">` +
      `<span class="cw-settled__icon">${CHECK_ICON}</span>` +
      `<div><p class="cw-settled__title">You're all settled.</p>` +
      `<p class="cw-settled__sub">${m.history.length ? "Nothing to pay right now." : "Nothing to pay. Receipts collect here after your visits."}</p></div>` +
      `</section>`;

  // Never a combined pay button: each booking settles on its own, so each row
  // carries its own Pay. The one owed row is the page's primary; with two,
  // neither outranks the other.
  const dueList = owed
    ? `<section class="cw-section cw-rise">` +
      sectionHead("To pay", m.due.length) +
      `<div class="cw-ledger" role="list">${m.due.map((l) => dueRowHTML(l, payable === 1)).join("")}</div>` +
      `</section>`
    : "";

  const groups: Array<{ key: string; label: string; lines: StatementLineView[] }> = [];
  for (const l of m.history) {
    const mo = monthOf(l.when);
    const g = groups.find((x) => x.key === mo.key);
    if (g) g.lines.push(l);
    else groups.push({ ...mo, lines: [l] });
  }
  const history = groups.length
    ? `<section class="cw-section cw-rise">` +
      sectionHead("History") +
      groups
        .map(
          (g) =>
            `<div class="cw-ledger__group"><h3 class="cw-label cw-ledger__month">${escapeHtml(g.label)}</h3>` +
            `<div class="cw-ledger" role="list">${g.lines.map(historyRowHTML).join("")}</div></div>`,
        )
        .join("") +
      `</section>`
    : "";

  return recordRoot("payments", summary + dueList + history);
}

/* ── Documents ─────────────────────────────────────────────────────────── */

export interface DocumentView {
  id: string;
  name: string;
  caption: string | null;
  url: string | null;
  uploadedAt: string;
  category: string;
  mimeType: string;
  isImage: boolean;
}

export function buildDocumentsModel(body: unknown): DocumentView[] {
  return rows(body).map((d) => ({
    id: str(d.id),
    name: str(d.name) || str(d.originalName) || "Document",
    caption: str(d.caption) || null,
    url: str(d.url) || null,
    uploadedAt: str(d.uploadedAt),
    category: str(d.category).toLowerCase(),
    mimeType: str(firstOf(d, ["mimeType", "contentType"])).toLowerCase(),
    isImage: d.isImage === true,
  }));
}

/** "Laser consent form.pdf" → "Laser consent form". A name that is only an extension keeps it. */
export function documentTitle(name: string): string {
  const stripped = name.replace(/\.(pdf|jpe?g|png|heic|webp|gif|docx?|txt)$/i, "").trim();
  return stripped || name;
}

/** The two-to-four letters on the file tile. */
function fileKind(d: DocumentView): string {
  if (d.isImage || d.mimeType.startsWith("image/") || /\.(jpe?g|png|heic|webp|gif)$/i.test(d.name)) return "IMG";
  if (d.mimeType === "application/pdf" || /\.pdf$/i.test(d.name)) return "PDF";
  if (/word|\.docx?$/i.test(d.mimeType + d.name)) return "DOC";
  return "FILE";
}

function docType(d: DocumentView): string {
  if (d.category === "consent") return "Consent form";
  if (d.category === "aftercare") return "Aftercare guide";
  if (d.category === "prescription") return "Prescription";
  if (d.category === "invoice" || d.category === "receipt") return "Receipt";
  return d.caption || "";
}

export function documentsHTML(docs: DocumentView[]): string {
  if (!docs.length) {
    return recordRoot(
      "documents",
      emptyHTML(DOC_ICON, "No documents yet", "Consent forms and aftercare guides will appear here after your visit."),
    );
  }
  const sorted = [...docs].sort((a, b) => (Date.parse(b.uploadedAt) || 0) - (Date.parse(a.uploadedAt) || 0));
  const rowsHtml = sorted
    .map((d) => {
      const title = documentTitle(d.name);
      const meta = [d.uploadedAt ? plainDate(d.uploadedAt) : "", docType(d)].filter(Boolean).join(" · ");
      // The link is a 5-minute presign minted for this read. `rel=noreferrer`
      // so the signature never travels in a Referer header.
      const open = d.url
        ? `<a class="cw-btn cw-btn--quiet cw-doc__open" href="${escapeHtml(d.url)}" target="_blank" rel="noreferrer">` +
          `View<span class="cw-vh"> ${escapeHtml(title)} (opens in a new tab)</span> <span aria-hidden="true">↗</span></a>`
        : `<span class="cw-doc__desk">Ask at the desk</span>`;
      return (
        `<div class="cw-doc" role="listitem" ${M}>` +
        `<span class="cw-doc__tile" aria-hidden="true"><span>${fileKind(d)}</span></span>` +
        `<div class="cw-doc__main"><div class="cw-doc__title">${escapeHtml(title)}</div>` +
        (meta ? `<p class="cw-doc__meta">${escapeHtml(meta)}</p>` : "") +
        `</div>${open}</div>`
      );
    })
    .join("");
  return recordRoot("documents", `<section class="cw-section cw-rise"><div class="cw-docs" role="list">${rowsHtml}</div></section>`);
}

/* ── Membership ────────────────────────────────────────────────────────── */

export interface MembershipModel {
  hasMembership: boolean;
  planName: string;
  status: string;
  price: number;
  nextChargeAt: string | null;
  storedValue: number;
  id: string | null;
  canPause: boolean;
  canResume: boolean;
}

export function buildMembershipModel(body: unknown): MembershipModel {
  const inner = unwrap(body);
  const list = rows(body);
  const o = (list[0] ?? (inner && typeof inner === "object" ? inner : {})) as Record<string, unknown>;
  const plan = (o.membership && typeof o.membership === "object" ? o.membership : {}) as Record<string, unknown>;
  const status = str(firstOf(o, ["status", "state"])).toUpperCase();
  const planName = str(firstOf(plan, ["name"])) || str(firstOf(o, ["planName", "planNameSnapshot"]));
  const hasMembership = Boolean(planName || status);
  return {
    hasMembership,
    planName: planName || "Membership",
    status,
    price: num(firstOf(o, ["price", "chosenAmount", "priceSnapshot", "monthlyAmount"])),
    nextChargeAt: str(firstOf(o, ["nextBillingAt", "nextChargeAt", "currentPeriodEnd"])) || null,
    storedValue: num(firstOf(o, ["storedValue", "balance", "creditBalance"])),
    id: str(o.id) || null,
    // Pause and resume are mutually exclusive, and both are refused outright
    // on a cancelled membership.
    canPause: hasMembership && status === "ACTIVE",
    canResume: hasMembership && (status === "PAUSED" || status === "SUSPENDED"),
  };
}

function membershipChip(status: string): { label: string; tone: string } {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", tone: "ok" };
    case "PAUSED":
    case "SUSPENDED":
      return { label: "Paused", tone: "neutral" };
    case "PAST_DUE":
    case "UNPAID":
      return { label: "Payment due", tone: "warn" };
    case "CANCELLED":
    case "CANCELED":
    case "EXPIRED":
      return { label: status === "EXPIRED" ? "Ended" : "Cancelled", tone: "bad" };
    default:
      return { label: status ? status.charAt(0) + status.slice(1).toLowerCase() : "", tone: "neutral" };
  }
}

export function membershipHTML(m: MembershipModel, ctx: RecordsContext = {}): string {
  if (!m.hasMembership) {
    return recordRoot(
      "membership",
      emptyHTML(
        CARD_ICON,
        "You're not a member yet",
        "See what membership includes, and what it costs each month.",
        `<a class="cw-btn cw-btn--secondary" href="/membership">See membership</a>`,
      ),
    );
  }
  const chip = membershipChip(m.status);
  const paused = m.canResume;
  const name = (ctx.memberName || "").trim();

  const hero =
    `<section class="cw-mcard cw-rise" aria-label="${escapeHtml(`${m.planName}${chip.label ? `, ${chip.label}` : ""}`)}" ${M}>` +
    `<div class="cw-mcard__top">` +
    `<span class="cw-mcard__label">${escapeHtml(name || "Member")}</span>` +
    (chip.label ? `<span class="cw-mcard__chip cw-mcard__chip--${chip.tone}">${escapeHtml(chip.label)}</span>` : "") +
    `</div>` +
    `<div class="cw-mcard__foot"><p class="cw-mcard__plan">${escapeHtml(m.planName)}</p>` +
    (m.price > 0 ? `<p class="cw-mcard__price">${escapeHtml(eur(m.price))} a month</p>` : "") +
    `</div></section>`;

  const fact = (label: string, value: string) =>
    `<div class="cw-mfact"><dt class="cw-mfact__label">${escapeHtml(label)}</dt><dd class="cw-mfact__value" ${M}>${escapeHtml(value)}</dd></div>`;
  const facts =
    `<dl class="cw-mfacts cw-rise">` +
    fact("Monthly", m.price > 0 ? eur(m.price) : "—") +
    fact("Next payment", paused ? "Paused" : m.nextChargeAt ? plainDate(m.nextChargeAt) : "—") +
    fact("Balance", eur(m.storedValue)) +
    `</dl>`;

  const btn = (action: string, label: string) =>
    `<button type="button" class="cw-btn cw-btn--secondary" data-cw-action="${action}" ` +
    `data-cw-membership="${escapeHtml(m.id ?? "")}">${escapeHtml(label)}</button>`;

  const controls =
    m.id && (m.canPause || m.canResume)
      ? `<div class="cw-mctl__do">` +
        (m.canPause
          ? btn("membership-pause", "Pause membership") +
            `<p class="cw-mctl__note">Pausing stops your monthly payments until you resume. Your balance stays on your account.</p>`
          : btn("membership-resume", "Resume membership") +
            `<p class="cw-mctl__note">Your membership is paused. Resuming restarts your monthly payments.</p>`) +
        `</div>`
      : "";

  // Cancelling and changing the card are deliberately NOT buttons here. The
  // card is an identity-origin act (the brand proxy forbids it); cancelling a
  // membership is a conversation we would rather have than lose silently.
  const tel = (ctx.contactPhone || "").replace(/\s+/g, "");
  const rest =
    `<p class="cw-mnote">To change the card that pays for this, or to cancel, speak to the team` +
    (tel ? ` on <a class="cw-link" href="tel:${escapeHtml(tel)}">${escapeHtml(phoneLabel(tel))}</a>` : "") +
    `.</p>`;

  return recordRoot("membership", hero + facts + `<section class="cw-mctl cw-rise">${controls}${rest}</section>`);
}
