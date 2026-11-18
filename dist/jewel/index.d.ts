/**
 * `@carisma/site-account/jewel` — the live Circle jewel for a brand website
 * (carisma-circle-v2-20261117).
 *
 * The ONLY kit entry that imports three.js. The `./ui` entry never imports this
 * folder (a test reads the built files): a site that wants live jewels hands
 * the kit a loader (`() => import("@carisma/site-account/jewel")`), so a site
 * without three.js (Aesthetics, Slimming today) never resolves it, and a page
 * that shows no live jewel never downloads it.
 *
 * Two ways in:
 *  - `mountJewel(canvas, options)` — one jewel on a canvas the page reserved
 *    (the Spa's React `Jewel` component);
 *  - `hydrateJewels(root)` — every `[data-cw-jewel]` slot under `root` (the
 *    kit's HTML strings: the account menu Card, the account Hero, the track).
 *
 * Every jewel draws through ONE shared WebGL renderer (one 3D context per
 * page), one animation loop, only on screen; reduced motion → one still frame
 * and no pointer lean; any WebGL failure → every jewel goes back to its flat
 * mark, quietly. Gem by KEY (the API's `level.key`), never by level number.
 */
import { type JewelHandle } from "./engine.js";
export type { FrameStage, JewelHandle, JewelOptions, JewelState, JewelVariant } from "./engine.js";
export { frameStep, motionReduced } from "./engine.js";
export { GEM_IDENTITY, isGemKey, jewelSupported, onJewelFailed, prefersReducedMotion, type CircleGemKey } from "./stage.js";
export declare const CIRCLE_JEWEL_QC = "carisma-circle-v2-20261117";
/** Mount one jewel. Throws only when WebGL cannot start (the caller keeps its flat mark). */
export declare const mountJewel: (canvas: HTMLCanvasElement, options: import("./engine.js").JewelOptions) => JewelHandle;
/**
 * Mount a live jewel in every `[data-cw-jewel]` slot under `root` that has
 * none yet. A slot keeps its flat mark (or poster) until the jewel's first
 * frame is on the canvas; then `data-cw-jewel-live` hides the mark (no layout
 * shift: the slot's box is fixed). Returns a dispose for everything it mounted.
 * Does nothing (and returns a no-op) when the page cannot draw the jewel.
 */
export declare function hydrateJewels(root: ParentNode | null | undefined): () => void;
/** Change a mounted slot's stone or beads in place (e.g. after a fresh member read). */
export declare function updateJewelSlot(slot: Element, next: {
    gem?: string;
    progress?: number;
    kind?: string;
}): void;
//# sourceMappingURL=index.d.ts.map