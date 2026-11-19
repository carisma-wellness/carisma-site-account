/**
 * The Circle jewel's 3D engine on the brand websites (carisma-circle-v2-20261117) —
 * the account kit's copy of the desk port (HOD-1, loyaltyCircleV2Customers1117) of the decided prototype (`circle-motif-3d-2026-11-17/src/engine.js`,
 * three r160 UMD) to three r185 ES modules. Only `jewel3d/` imports three; the
 * site reaches it through ONE dynamic `import("@carisma/site-account/jewel")`, so no page's
 * first load carries a byte of it (the kit's `./ui` entry never imports this folder).
 *
 * - ONE shared WebGL renderer per page (browsers allow ~16 live contexts):
 *   every jewel is a 2D canvas painted by `drawImage` from the shared one,
 *   scissored to its own size. Disposed — `forceContextLoss()` +
 *   `renderer.dispose()` + the light room — 30 s after the last jewel leaves.
 * - ONE loop: a single `requestAnimationFrame` scheduler draws only jewels on
 *   screen (IntersectionObserver, 120 px) on a visible tab; a jewel's geometry
 *   is built when it first comes within 300 px. Reduced motion: ONE still
 *   frame, no lean, no loop.
 * - Failing quietly is the contract: the renderer is constructed with three's
 *   console routed through a filter (r185 `console.error`s a failed context
 *   before it throws), and any throw, shader error or context loss turns EVERY
 *   jewel on the page back into its flat mark — no console error, no retry.
 * - Colours are the jewel's own materials (numeric, the same on every brand);
 *   a site may override them with `--cc-*` custom properties.
 *
 * Dropped from the port: the other motifs, `levelUp()` (no desk moment),
 * `shot()`, the CC_* globals, AgX tone mapping.
 */
import { BufferGeometry, Group, LatheGeometry, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Shape, type Material, type Object3D } from "three";
import { type CircleGemKey } from "./stage.js";
export interface GemTones {
    hi: number;
    mid: number;
    lo: number;
}
export interface JewelPalette {
    metal: number;
    metalDeep: number;
    band: number;
    gems: Record<CircleGemKey, GemTones>;
}
/** The setting and the stones from `circle-jewel.css` (a material: the same in both appearances). */
export declare function readJewelPalette(): JewelPalette;
export declare const TAU: number;
export declare const DEG: number;
export declare function gold(hex: number, rough?: number): MeshStandardMaterial;
/**
 * A stone = a coloured mirror on its BACK facets (light bouncing inside) + a
 * clear polish on its front facets, added on top. Cheap: no transmission pass.
 * `identity` is the engine palette index (Rose 0, Pearl 1, Ruby 2, Sapphire 3, Diamond 4).
 */
export declare function gemMats(identity: number, tones: GemTones): [MeshStandardMaterial, MeshPhysicalMaterial];
/** The pearl: a smooth dome with a soft lustre and a pink / blue nacre sheen. */
export declare function pearlMesh(): Mesh;
export interface FacetRing {
    r?: number;
    z: number;
    n?: number;
    rot?: number;
    sq?: number;
}
/** Facet geometry from stacked rings, closed with a table (first) and a culet (last). */
export declare function facetGeo(rings: FacetRing[], sx?: number, sy?: number): BufferGeometry;
/** A lathe around Z from a profile [[r, z], …]. */
export declare function lathe(profile: Array<[number, number]>, seg?: number): LatheGeometry;
/** The Carisma rose as shapes, centred, fitted to radius 1 (y up). Parsed once per page. */
export declare function roseShapes(): Shape[];
/** The rose split into 5 strata, back to front: leaves, outer petals, middle, inner, heart. */
export declare function roseStrata(): Shape[][];
/**
 * The smallest circle round every point of the rose (iterative), + the bevel.
 * The charm scales the rose by THIS — its true enclosing circle, never by eye —
 * so the rose fills 74 % of its ring and never crosses the gold border.
 */
export declare function roseFit(): {
    maxR: number;
    cx: number;
    cy: number;
};
/** The rose in gold relief, one extrusion per stratum, back to front. */
export declare function roseGold(mat: Material, thick: number): Group;
/** A soft contact shadow sprite (procedural canvas). */
export declare function shadowSprite(r: number, alpha: number): Mesh;
/**
 * Free every geometry, material and texture under a node (the shared light
 * room is never in a jewel's tree). A node may list extra materials it swaps
 * in at draw time (`userData.disposables`), which no mesh holds at that moment.
 */
export declare function disposeTree(root: Object3D): void;
export declare const SHARED_RELEASE_MS = 30000;
type ConsoleFn = (type: "log" | "warn" | "error", message: string, ...params: unknown[]) => void;
/**
 * three r185 `console.error`s "WebGLRenderer: Error creating WebGL context…"
 * before it throws. Construction is wrapped in this filter so a desk PC with
 * WebGL off (RDP, an old driver) gets a flat mark and a CLEAN console.
 */
export declare function filterWebGLRendererErrors(prev: ConsoleFn | null): ConsoleFn;
export type JewelVariant = "full" | "small" | "icon";
export interface JewelState {
    gem: CircleGemKey;
    /** 0…1 of the way to the next level (1 at the top level). */
    progress: number;
    variant: JewelVariant;
}
export interface MotifView extends JewelState {
    /** The drawn fraction of the bead ring. */
    arc: number;
}
export interface Motif {
    draw(view: MotifView, t: number, still: boolean): void;
}
export interface MotifContext {
    /** Tilts with the pointer and the idle drift. */
    rig: Group;
    /** Stays put (the contact shadow). Cleared with the motif on a rebuild. */
    fixed: Group;
    palette: JewelPalette;
    state: JewelState;
}
export type MotifBuilder = (ctx: MotifContext) => Motif;
export interface JewelOptions extends JewelState {
    /** The element whose pointer the jewel leans toward (its whole card). */
    hover: HTMLElement | null;
    /** Called once, after the first 3D frame is on the canvas. */
    onFirstFrame?: () => void;
}
export interface JewelHandle {
    update(next: Partial<JewelState>): void;
    dispose(): void;
}
/** What the loop reads of a jewel each frame (a JewelStage; a plain object in the tests). */
export interface FrameStage {
    alive: boolean;
    near: boolean;
    visible: boolean;
    /** `prefers-reduced-motion: reduce` when the jewel mounted. */
    readonly still: boolean;
    /** A still jewel owes one frame (first paint, a change, a resize, back on screen). */
    stillDue: boolean;
}
/**
 * One jewel's turn in a frame: draw or not, and whether the loop must run again for it. Reduced motion
 * (surfaces §3.3, §7.2): ONE exact still frame per change, then nothing — never a running loop.
 */
export declare function frameStep(stage: FrameStage): {
    draw: boolean;
    again: boolean;
};
/** The engine's reading of `prefers-reduced-motion` (exported for the reduced-motion test). */
export declare function motionReduced(): boolean;
/**
 * Mount one jewel on `canvas` (a 2D canvas the component reserved at its final
 * size). Throws only when WebGL cannot start — the caller then shows the flat
 * mark; every later failure is handled here (all jewels fall back at once).
 */
export declare function createJewelMount(build: MotifBuilder): (canvas: HTMLCanvasElement, options: JewelOptions) => JewelHandle;
/** Tests only: the engine's module state, to prove the shared renderer is released. */
export declare function jewelEngineStateForTests(): {
    stages: number;
    shared: boolean;
    failed: boolean;
};
export {};
//# sourceMappingURL=engine.d.ts.map