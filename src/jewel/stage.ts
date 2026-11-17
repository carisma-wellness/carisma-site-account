/**
 * The jewel's page-level state (carisma-circle-v2-20261117): which stone a
 * level wears, whether this page can draw the live 3D jewel, and the one-way
 * door every jewel falls back through.
 *
 * No three.js here, and nothing from `../ui`: the gem table is repeated (it is
 * five words) so the `./jewel` chunk stays self-contained.
 */

export type CircleGemKey = "pearl" | "rose" | "ruby" | "sapphire" | "diamond";

/**
 * The gem's IDENTITY in the engine's palette (`CC.PAL` order: Rose, Pearl,
 * Ruby, Sapphire, Diamond): its cut and material. Pearl is the smooth dome;
 * every other stone is the rose cut. Chosen by the API's level KEY, never by
 * the level number (BRIEF ERRATA: Level 1 = Pearl, Level 2 = Rose).
 */
export const GEM_IDENTITY: Readonly<Record<CircleGemKey, number>> = {
  rose: 0,
  pearl: 1,
  ruby: 2,
  sapphire: 3,
  diamond: 4,
};

export function isGemKey(v: unknown): v is CircleGemKey {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(GEM_IDENTITY, v);
}

/*
 * Can this page draw the live jewel? Flat (the mark stays) when: server
 * render; `forced-colors: active`; the QA switch `<html data-circle-jewel="flat">`;
 * no `WebGL2RenderingContext` (three r184 is WebGL2-only); or a probe canvas
 * answers no `webgl2` context. The probe's context is released at once and
 * the answer is cached for the page.
 */
let probed: boolean | null = null;
let failed = false;
const listeners = new Set<() => void>();

function probe(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    if (window.matchMedia?.("(forced-colors: active)").matches) return false;
  } catch {
    /* no matchMedia: carry on */
  }
  if (document.documentElement?.dataset?.circleJewel === "flat") return false;
  if (typeof (window as Window & { WebGL2RenderingContext?: unknown }).WebGL2RenderingContext === "undefined") {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function jewelSupported(): boolean {
  if (failed) return false;
  if (probed === null) probed = probe();
  return probed;
}

/** Every jewel falls back to its mark, for the rest of the page's life. No console error, no retry. */
export function markJewelFailed(): void {
  if (failed) return;
  failed = true;
  for (const fn of [...listeners]) fn();
}

export function onJewelFailed(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** `prefers-reduced-motion: reduce`: one exact still frame, no lean, no loop. */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Tests only: forget the cached probe and the failure (a fresh page). */
export function resetJewelPageForTests(): void {
  probed = null;
  failed = false;
  listeners.clear();
}
