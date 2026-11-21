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
 * The gem's IDENTITY in the engine's palette (`CC.PAL` order by data key: rose,
 * pearl, ruby, sapphire, diamond): its material. Every stone is the rose cut
 * (Pearl too, since 21 Nov); stones 1-4 are the light stones (`GLARE`). Chosen
 * by the API's level KEY, never by the level number. The keys are DATA and never
 * change (21 Nov 2026, CEO, the Platinum ladder): key `sapphire` reads "Diamond"
 * (Level 4) and key `diamond` reads "Platinum" (Level 5); the words always come
 * from the API's `level.label`, never from a key.
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