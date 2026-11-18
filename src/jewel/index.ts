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
import { createJewelMount, type JewelHandle, type JewelVariant } from "./engine.js";
import { buildSolitaire } from "./motif.js";
import { isGemKey, jewelSupported, onJewelFailed } from "./stage.js";

export type { FrameStage, JewelHandle, JewelOptions, JewelState, JewelVariant } from "./engine.js";
export { frameStep, motionReduced } from "./engine.js";
export { GEM_IDENTITY, isGemKey, jewelSupported, onJewelFailed, prefersReducedMotion, type CircleGemKey } from "./stage.js";

export const CIRCLE_JEWEL_QC = "carisma-circle-v2-20261117";

/** Mount one jewel. Throws only when WebGL cannot start (the caller keeps its flat mark). */
export const mountJewel = createJewelMount(buildSolitaire);

const LIVE = "data-cw-jewel-live";
const mounted = new WeakMap<Element, { handle: JewelHandle; canvas: HTMLCanvasElement }>();

function variantOf(v: string | null): JewelVariant {
  return v === "full" || v === "icon" ? v : "small";
}

function progressOf(v: string | null): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

/** The element whose pointer a slot's jewel leans toward: its card (`[data-cw-jewel-hover]`), else the slot. */
function hoverFor(slot: Element): HTMLElement | null {
  const card = slot.closest?.("[data-cw-jewel-hover]");
  return (card as HTMLElement | null) ?? (slot as HTMLElement);
}

function unmountSlot(slot: Element): void {
  const m = mounted.get(slot);
  if (!m) return;
  mounted.delete(slot);
  try {
    m.handle.dispose();
  } catch {
    /* a jewel that cannot dispose has nothing left to free */
  }
  m.canvas.remove();
  slot.removeAttribute(LIVE);
  for (const el of Array.from(slot.children)) (el as HTMLElement).style.opacity = "";
}

/**
 * Mount a live jewel in every `[data-cw-jewel]` slot under `root` that has
 * none yet. A slot keeps its flat mark (or poster) until the jewel's first
 * frame is on the canvas; then `data-cw-jewel-live` hides the mark (no layout
 * shift: the slot's box is fixed). Returns a dispose for everything it mounted.
 * Does nothing (and returns a no-op) when the page cannot draw the jewel.
 */
export function hydrateJewels(root: ParentNode | null | undefined): () => void {
  if (!root || typeof document === "undefined" || !jewelSupported()) return () => {};
  const slots = Array.from(root.querySelectorAll?.("[data-cw-jewel]") ?? []);
  const mine: Element[] = [];
  for (const slot of slots) {
    if (mounted.has(slot)) continue;
    const gem = slot.getAttribute("data-gem");
    if (!isGemKey(gem)) continue;
    const canvas = document.createElement("canvas");
    canvas.className = "cc-jw__canvas";
    canvas.setAttribute("aria-hidden", "true");
    // Stacked over the mark in the slot's own grid cell (inline, so any host page lays it out the same).
    canvas.style.cssText = "grid-area:1/1;display:block;width:100%;height:100%;opacity:0;transition:opacity 240ms ease";
    slot.appendChild(canvas);
    try {
      const handle = mountJewel(canvas, {
        gem,
        progress: progressOf(slot.getAttribute("data-p")),
        variant: variantOf(slot.getAttribute("data-k")),
        hover: hoverFor(slot),
        onFirstFrame: () => {
          slot.setAttribute(LIVE, "");
          canvas.style.opacity = "1";
          for (const el of Array.from(slot.children)) {
            if (el !== canvas) (el as HTMLElement).style.opacity = "0";
          }
        },
      });
      mounted.set(slot, { handle, canvas });
      mine.push(slot);
    } catch {
      canvas.remove();
      return () => mine.forEach(unmountSlot);
    }
  }
  const off = onJewelFailed(() => mine.forEach(unmountSlot));
  return () => {
    off();
    mine.forEach(unmountSlot);
  };
}

/** Change a mounted slot's stone or beads in place (e.g. after a fresh member read). */
export function updateJewelSlot(slot: Element, next: { gem?: string; progress?: number; kind?: string }): void {
  const m = mounted.get(slot);
  if (!m) return;
  const patch: { gem?: "pearl" | "rose" | "ruby" | "sapphire" | "diamond"; progress?: number; variant?: JewelVariant } = {};
  if (next.gem !== undefined && isGemKey(next.gem)) patch.gem = next.gem;
  if (typeof next.progress === "number") patch.progress = Math.max(0, Math.min(1, next.progress));
  if (next.kind !== undefined) patch.variant = variantOf(next.kind);
  m.handle.update(patch);
}

const hostDisposers = new WeakMap<object, () => void>();

/**
 * ADDENDUM KIT-6 (should): the jewel's host interface. A site hands it to the kit as `jewelHost` (or calls it for
 * its own Circle blocks): `hydrate(root)` mounts a live jewel in every slot under `root` that has none yet;
 * `release(root)` frees what `hydrate` mounted under that root (call it before replacing the root's HTML).
 * Hydrating the same root twice keeps both sets until one release.
 */
export const jewelHost: { hydrate(root: unknown): void; release(root: unknown): void } = {
  hydrate(root: unknown): void {
    if (!root || typeof root !== "object") return;
    const d = hydrateJewels(root as ParentNode);
    const prev = hostDisposers.get(root);
    hostDisposers.set(root, () => {
      prev?.();
      d();
    });
  },
  release(root: unknown): void {
    if (!root || typeof root !== "object") return;
    const d = hostDisposers.get(root);
    hostDisposers.delete(root);
    d?.();
  },
};
