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
export declare function icsUtc(raw: string | Date): string;
/** RFC 5545 §3.3.11: backslash, semicolon, comma and newlines are escaped in TEXT. */
export declare function icsEscape(text: string): string;
/**
 * Fold a content line at 75 OCTETS (§3.1), never inside a UTF-8 character.
 * "Couples Full Body Massage · Carisma Spa" carries a middle dot; a fold that
 * counted characters instead of bytes would split it on some addresses.
 */
export declare function icsFold(line: string): string;
/** The whole file, CRLF-terminated. "" when the booking has no usable start. */
export declare function buildIcs(e: IcsEvent): string;
/** `carisma-20260926.ics` — the MALTA date, never the UTC one. */
export declare function icsFileName(startIso: string): string;
/**
 * "Hugo's Hotel, Great Siege Road, Floriana" with venue "Hugo's Hotel" →
 * "Great Siege Road, Floriana". CarismaSoft's address often repeats the venue,
 * and a page (or a calendar) that says it twice reads as a bug.
 */
export declare function stripVenuePrefix(address: string, venue: string): string;
/** "Hugo's Hotel, Great Siege Road, Floriana" — venue once, then the rest. */
export declare function icsLocation(venue: string, address: string): string;
//# sourceMappingURL=ics.d.ts.map