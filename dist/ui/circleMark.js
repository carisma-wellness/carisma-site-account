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
/** Every stone, in the order the decided programme ranks them today (display only; never index by it). */
export const CIRCLE_GEM_KEYS = ["pearl", "rose", "ruby", "sapphire", "diamond"];
/** The API's level key → a gem, or null for anything else (a v1 key such as `first_light` never picks a stone). */
export function asGemKey(v) {
    return typeof v === "string" && CIRCLE_GEM_KEYS.includes(v) ? v : null;
}
const FLAT = {
    pearl: "#E2DCD5",
    rose: "#E0B4AC",
    ruby: "#A8405A",
    sapphire: "#2F5199",
    diamond: "#C9D6E3",
};
const RIM = "#8A6A1C";
const RING_TRACK = "#E6DDCC";
const RING_GOLD = "#9A7629";
const FACE = "#FBF8F2";
/** 0..1 from basis points (0..10000); anything else is 0. */
export function progressFraction(bp) {
    const n = typeof bp === "number" && Number.isFinite(bp) ? bp : 0;
    return Math.max(0, Math.min(1, n / 10000));
}
/**
 * The flat mark as an SVG string. `progress` is 0..1 of the way to the next
 * level (1 at the top level: the ring is closed). Decorative by default
 * (`aria-hidden`); pass `label` when the mark is the only carrier of the level.
 */
export function circleMarkSVG(gem, progress, size = 24, label = "") {
    const s = Math.max(12, Math.round(Number.isFinite(size) ? size : 24));
    const q = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
    const c = 2 * Math.PI * 8;
    const a11y = label
        ? ` role="img" aria-label="${label.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}"`
        : ' aria-hidden="true"';
    return (`<svg class="cc-mark" data-cc-gem="${gem}" width="${s}" height="${s}" viewBox="0 0 24 24" focusable="false"${a11y}>` +
        `<circle cx="12" cy="12" r="10.5" fill="${FACE}" stroke="${RIM}" stroke-width="1"></circle>` +
        `<circle cx="12" cy="12" r="8" fill="none" stroke="${RING_TRACK}" stroke-width="2"></circle>` +
        (q > 0.01
            ? `<circle cx="12" cy="12" r="8" fill="none" stroke="${RING_GOLD}" stroke-width="2" stroke-dasharray="${(c * q).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 12 12)"></circle>`
            : "") +
        `<circle cx="12" cy="12" r="5.5" fill="${FLAT[gem]}" stroke="${RIM}" stroke-width="1"></circle>` +
        `</svg>`);
}
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
export function jewelSlotHTML(opts) {
    const h = Math.max(40, Math.round(opts.height));
    const w = Math.round(h * 0.84);
    const kind = opts.kind ?? (h >= 200 ? "full" : "small");
    const p = Math.max(0, Math.min(1, opts.progress));
    const markSize = Math.max(24, Math.min(w, Math.round(h * 0.62)));
    return (`<span class="cc-jw${opts.cls ? ` ${opts.cls}` : ""}" data-cw-jewel data-gem="${opts.gem}" data-p="${p.toFixed(3)}" data-k="${kind}"` +
        ` style="width:${w}px;height:${h}px" aria-hidden="true">` +
        (opts.poster
            ? `<img class="cc-jw__poster" src="${opts.poster.replace(/"/g, "%22")}" alt="" width="${w}" height="${h}" loading="lazy" decoding="async">`
            : `<span class="cc-jw__mark">${circleMarkSVG(opts.gem, p, markSize)}</span>`) +
        `</span>`);
}
//# sourceMappingURL=circleMark.js.map