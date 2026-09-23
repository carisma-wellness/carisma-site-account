/**
 * Add to calendar: one booking as an RFC 5545 `.ics` file, built in the
 * browser from what the page already shows.
 *
 * Pure on purpose — every rule a calendar app is strict about (CRLF line
 * endings, UTC stamps, escaped text, folded lines) is a unit test, not a
 * hope. The browser half (Blob URL + a download link) lives in browser.ts.
 *
 * The UID is `{appointment id}@{this site's host}`, stable for the life of
 * the booking, so the file a member downloads after a reschedule (SEQUENCE 1)
 * REPLACES the event they added before instead of sitting beside it.
 */

const MALTA = "Europe/Malta";

export interface IcsEvent {
  /** The appointment id. With `host`, the event's permanent identity. */
  id: string;
  host: string;
  startIso: string;
  endIso: string;
  /** "{treatment} · {brand}" — built by the caller so the brand rule stays in one place. */
  summary: string;
  location?: string;
  description?: string;
  /** 0 when first added; 1 after a reschedule, so calendars take the update. */
  sequence?: number;
  /** DTSTAMP. Defaults to now; a test pins it. */
  now?: Date;
}

/** An instant as `YYYYMMDDTHHMMSSZ` (UTC). "" when unparseable. */
export function icsUtc(raw: string | Date): string {
  const ms = raw instanceof Date ? raw.getTime() : Date.parse(raw);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 §3.3.11: backslash, semicolon, comma and newlines are escaped in TEXT. */
export function icsEscape(text: string): string {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

function utf8Length(ch: string): number {
  const c = ch.codePointAt(0) ?? 0;
  return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
}

/**
 * Fold a content line at 75 OCTETS (§3.1), never inside a UTF-8 character.
 * "Couples Full Body Massage · Carisma Spa" carries a middle dot; a fold that
 * counted characters instead of bytes would split it on some addresses.
 */
export function icsFold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of Array.from(line)) {
    const n = utf8Length(ch);
    // The first line holds 75 octets; continuation lines start with a space.
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/** The whole file, CRLF-terminated. "" when the booking has no usable start. */
export function buildIcs(e: IcsEvent): string {
  const start = icsUtc(e.startIso);
  if (!start) return "";
  const startMs = Date.parse(e.startIso);
  const endMs = Date.parse(e.endIso);
  // A booking with no end still deserves an event; an hour is the honest guess.
  const end = icsUtc(new Date(Number.isFinite(endMs) && endMs > startMs ? endMs : startMs + 3_600_000));
  // The host NAME: a port is not part of an identity ("localhost:4411" would
  // otherwise collapse into "localhost4411").
  const host = String(e.host || "").replace(/:\d+$/, "").replace(/[^a-z0-9.-]/gi, "") || "carisma";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Carisma//Member account//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsEscape(e.id)}@${host}`,
    `DTSTAMP:${icsUtc(e.now ?? new Date())}`,
    `SEQUENCE:${Math.max(0, Math.floor(e.sequence ?? 0))}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(e.summary)}`,
    ...(e.location ? [`LOCATION:${icsEscape(e.location)}`] : []),
    ...(e.description ? [`DESCRIPTION:${icsEscape(e.description)}`] : []),
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(e.summary)}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

/** `carisma-20260926.ics` — the MALTA date, never the UTC one. */
export function icsFileName(startIso: string): string {
  const ms = Date.parse(startIso);
  if (!Number.isFinite(ms)) return "carisma-booking.ics";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: MALTA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(ms));
    const f: Record<string, string> = {};
    for (const p of parts) if (p.type !== "literal") f[p.type] = p.value;
    return `carisma-${f.year}${f.month}${f.day}.ics`;
  } catch {
    return "carisma-booking.ics";
  }
}

/**
 * "Hugo's Hotel, Great Siege Road, Floriana" with venue "Hugo's Hotel" →
 * "Great Siege Road, Floriana". CarismaSoft's address often repeats the venue,
 * and a page (or a calendar) that says it twice reads as a bug.
 */
export function stripVenuePrefix(address: string, venue: string): string {
  const a = String(address || "").trim();
  const v = String(venue || "").trim();
  if (!a || !v) return a;
  if (a.toLowerCase() === v.toLowerCase()) return "";
  const lead = a.slice(0, v.length).toLowerCase();
  if (lead === v.toLowerCase()) {
    const rest = a.slice(v.length).replace(/^\s*[,·\-–]\s*/, "");
    if (rest !== a.slice(v.length)) return rest.trim();
  }
  return a;
}

/** "Hugo's Hotel, Great Siege Road, Floriana" — venue once, then the rest. */
export function icsLocation(venue: string, address: string): string {
  return [venue, stripVenuePrefix(address, venue)].filter(Boolean).join(", ");
}
