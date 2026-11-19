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
export declare const GEM_IDENTITY: Readonly<Record<CircleGemKey, number>>;
export declare function isGemKey(v: unknown): v is CircleGemKey;
export declare function jewelSupported(): boolean;
/** Every jewel falls back to its mark, for the rest of the page's life. No console error, no retry. */
export declare function markJewelFailed(): void;
export declare function onJewelFailed(fn: () => void): () => void;
/** `prefers-reduced-motion: reduce`: one exact still frame, no lean, no loop. */
export declare function prefersReducedMotion(): boolean;
/** Tests only: forget the cached probe and the failure (a fresh page). */
export declare function resetJewelPageForTests(): void;
//# sourceMappingURL=stage.d.ts.map