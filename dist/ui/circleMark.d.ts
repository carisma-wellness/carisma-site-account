/**
 * Carisma Circle v2 — the gem keys and the FLAT MARK (carisma-circle-v2-20261117).
 *
 * The level's stone is picked by the API's `level.key`, never by the level
 * number or a numeral (surfaces §0 "Gem by key"): `pearl` is Level 1 today, but
 * a config change can never put the wrong stone on a level.
 *
 * The flat mark is what a Circle surface draws under 40 px (the header chip, a
 * pay-step row, an earn line) and the fallback wherever the live jewel cannot
 * draw (no WebGL, forced colours): a gem disc in the level's flat colour, a
 * progress ring to the next level, a gold rim. It is a picture of a material,
 * the same on every brand and in both appearances, so its colours live here
 * as SVG attributes and never in the account CSS (that sheet is token-only).
 * Flat colours: CEO-RULES 17 Nov (surfaces §3.3).
 */
export type CircleGemKey = "pearl" | "rose" | "ruby" | "sapphire" | "diamond";
/** Every stone, in the order the decided programme ranks them today (display only; never index by it). */
export declare const CIRCLE_GEM_KEYS: readonly CircleGemKey[];
/** The API's level key → a gem, or null for anything else (a v1 key such as `first_light` never picks a stone). */
export declare function asGemKey(v: unknown): CircleGemKey | null;
/** 0..1 from basis points (0..10000); anything else is 0. */
export declare function progressFraction(bp: unknown): number;
/**
 * The flat mark as an SVG string. `progress` is 0..1 of the way to the next
 * level (1 at the top level: the ring is closed). Decorative by default
 * (`aria-hidden`); pass `label` when the mark is the only carrier of the level.
 */
export declare function circleMarkSVG(gem: CircleGemKey, progress: number, size?: number, label?: string): string;
/**
 * A jewel SLOT: plain HTML the page can ship in its first paint. The canvas is
 * mounted lazily by the `./jewel` export (only when Circle is live and the slot
 * is near the viewport); until then, and for ever without WebGL, the flat mark
 * inside the slot is what shows. Fixed box (width = 0.84 × height), so the
 * live jewel replacing it never shifts the layout.
 *
 * kind: "small" (20 beads) | "full" (40 beads) | "icon" (small, every bead gold).
 * `poster` is an optional still (`/circle/jewel/v1/<gem>-<kind>.webp`) shown
 * before the first frame.
 */
export declare function jewelSlotHTML(opts: {
    gem: CircleGemKey;
    progress: number;
    height: number;
    kind?: "small" | "full" | "icon";
    poster?: string;
    cls?: string;
}): string;
//# sourceMappingURL=circleMark.d.ts.map