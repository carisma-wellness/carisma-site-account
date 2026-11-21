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
import { ACESFilmicToneMapping, AdditiveBlending, BackSide, BufferGeometry, CanvasTexture, Color, DirectionalLight, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, FrontSide, Group, LatheGeometry, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PMREMGenerator, SRGBColorSpace, Scene, ShaderMaterial, Shape, SphereGeometry, Vector2, Vector3, WebGLRenderer, getConsoleFunction, setConsoleFunction, } from "three";
import { markJewelFailed } from "./stage.js";
import { ROSE_PATHS } from "./rose.js";
// ── layout (brand websites never zoom the document: identity helpers keep the port's maths) ──
function documentCssZoom() {
    return 1;
}
function clientToRectSpace(_el, x, y, _rect) {
    return { x, y };
}
function layoutBoxOf(el) {
    const r = el.getBoundingClientRect();
    return { rect: { width: r.width, height: r.height }, zoom: 1 };
}
const FALLBACK = {
    metal: 0xe4be74,
    metalDeep: 0xb98a3a,
    band: 0xede4da,
    gems: {
        // the design kit's CC.PAL (21 Nov 2026, CEO, the Platinum ladder, the "lighter" stones): Level 1 Pearl · 2 Rose ·
        // 3 Ruby · 4 Diamond (key sapphire) · 5 Platinum (key diamond). The keys never change; only what a member reads does.
        rose: { hi: 0xfcefec, mid: 0xebc5be, lo: 0xd39a91 },
        pearl: { hi: 0xffffff, mid: 0xf4f3f1, lo: 0xd9e6f2, sheen: 0xbfefe4 },
        ruby: { hi: 0xffffff, mid: 0xf0d2da, lo: 0xb0124a, sheen: 0xe8336f },
        sapphire: { hi: 0xffffff, mid: 0xe2f1f3, lo: 0x36b8c8, sheen: 0x4fd0e0 },
        diamond: { hi: 0xffffff, mid: 0xf1eef7, lo: 0xa88be8, sheen: 0xb58cff },
    },
};
const TOKEN_HEX = /^#?([0-9a-f]{6})$/i;
function tokenNumber(style, name, fallback) {
    if (!style)
        return fallback;
    const m = TOKEN_HEX.exec(style.getPropertyValue(name).trim());
    return m ? parseInt(m[1], 16) : fallback;
}
/** The setting and the stones from `circle-jewel.css` (a material: the same in both appearances). */
export function readJewelPalette() {
    let style = null;
    try {
        style = getComputedStyle(document.documentElement);
    }
    catch {
        style = null;
    }
    const gem = (key) => {
        const fb = FALLBACK.gems[key];
        const tones = {
            hi: tokenNumber(style, `--cc-gem-${key}-hi`, fb.hi),
            mid: tokenNumber(style, `--cc-gem-${key}-mid`, fb.mid),
            lo: tokenNumber(style, `--cc-gem-${key}-lo`, fb.lo),
        };
        if (fb.sheen !== undefined)
            tones.sheen = tokenNumber(style, `--cc-gem-${key}-sheen`, fb.sheen);
        return tones;
    };
    return {
        metal: tokenNumber(style, "--cc-metal", FALLBACK.metal),
        metalDeep: tokenNumber(style, "--cc-metal-deep", FALLBACK.metalDeep),
        band: tokenNumber(style, "--cc-band", FALLBACK.band),
        gems: { rose: gem("rose"), pearl: gem("pearl"), ruby: gem("ruby"), sapphire: gem("sapphire"), diamond: gem("diamond") },
    };
}
// ── materials and geometry (numbers ported, not re-tuned) ────────────────────
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export function gold(hex, rough = 0.2) {
    return new MeshStandardMaterial({ color: new Color(hex), metalness: 1, roughness: rough, envMapIntensity: 1.15 });
}
export const GLARE = {
    1: { gi: 0.05, film: [250, 820], ior: 2.0 }, // Pearl: soft opal fire
    2: { gi: 0.1, film: [560, 680], ior: 2.0 }, // Ruby: crimson glare
    3: { gi: 0.08, film: [440, 560], ior: 2.2 }, // Level 4 Diamond (key sapphire): turquoise glare
    4: { gi: 0.05, film: [300, 420], ior: 2.2 }, // Level 5 Platinum (key diamond): violet glare
};
export function glareMats(recipe, tones) {
    const inner = new MeshStandardMaterial({
        color: new Color(tones.mid),
        metalness: 1,
        roughness: 0.05,
        side: BackSide,
        flatShading: true,
        envMapIntensity: 2.4,
        emissive: new Color(tones.lo),
        emissiveIntensity: recipe.gi,
    });
    const outer = new MeshPhysicalMaterial({
        color: 0x000000,
        metalness: 0,
        roughness: 0.03,
        flatShading: true,
        ior: recipe.ior,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        envMapIntensity: 1.7,
        side: FrontSide,
        iridescence: 1,
        iridescenceIOR: 1.9,
        iridescenceThicknessRange: [recipe.film[0], recipe.film[1]],
        sheen: 1,
        sheenColor: new Color(tones.sheen ?? tones.lo),
        sheenRoughness: 0.35,
    });
    return [inner, outer];
}
/**
 * A stone = a coloured mirror on its BACK facets (light bouncing inside) + a
 * clear polish on its front facets, added on top. Cheap: no transmission pass.
 * `identity` is the engine palette index by data key (rose 0, pearl 1, ruby 2, sapphire 3, diamond 4). Since the
 * 21 Nov ladder stones 1-4 are the light stones (`GLARE`); the mirror recipe below is Rose's, kept whole.
 */
export function gemMats(identity, tones) {
    const glare = GLARE[identity];
    if (glare)
        return glareMats(glare, tones);
    const deep = identity === 2 || identity === 3;
    const inner = new MeshStandardMaterial({
        color: new Color(tones.mid).lerp(new Color(deep ? tones.lo : tones.hi), deep ? 0.32 : 0.2),
        metalness: 1,
        roughness: 0.05,
        side: BackSide,
        flatShading: true,
        envMapIntensity: identity === 4 ? 2.3 : identity === 0 ? 1.7 : 2.7,
        emissive: new Color(tones.mid),
        emissiveIntensity: identity === 4 ? 0.04 : identity === 0 ? 0.1 : 0.06,
    });
    const outer = new MeshPhysicalMaterial({
        color: 0x000000,
        metalness: 0,
        roughness: 0.03,
        flatShading: true,
        ior: identity === 4 ? 2.3 : 1.77,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        envMapIntensity: 1.6,
        side: FrontSide,
    });
    if (identity === 4) {
        outer.iridescence = 1;
        outer.iridescenceIOR = 2.0;
        outer.iridescenceThicknessRange = [260, 700];
    }
    return [inner, outer];
}
function ringPts(r, z, n, rot, sx, sy, sq) {
    const a = [];
    for (let k = 0; k < n; k++) {
        const th = rot + (k / n) * TAU;
        let c = Math.cos(th);
        let s = Math.sin(th);
        if (sq) {
            const e = 2 / sq;
            c = Math.sign(c) * Math.pow(Math.abs(c), e);
            s = Math.sign(s) * Math.pow(Math.abs(s), e);
        }
        a.push(new Vector3(c * r * sx, s * r * sy, z));
    }
    return a;
}
/** Facet geometry from stacked rings, closed with a table (first) and a culet (last). */
export function facetGeo(rings, sx = 1, sy = 1) {
    const pos = [];
    const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    const R = rings.map((q) => (q.n ? ringPts(q.r ?? 1, q.z, q.n, q.rot ?? 0, sx, sy, q.sq) : [new Vector3(0, 0, q.z)]));
    for (let i = 0; i < R.length - 1; i++) {
        const A = R[i];
        const B = R[i + 1];
        if (A.length === 1) {
            for (let k = 0; k < B.length; k++)
                tri(A[0], B[k], B[(k + 1) % B.length]);
        }
        else if (B.length === 1) {
            for (let k = 0; k < A.length; k++)
                tri(A[k], B[0], A[(k + 1) % A.length]);
        }
        else if (A.length === B.length) {
            const off = (rings[i + 1].rot ?? 0) - (rings[i].rot ?? 0) > 1e-6;
            for (let k = 0; k < A.length; k++) {
                const k1 = (k + 1) % A.length;
                if (off) {
                    tri(A[k], B[k], A[k1]);
                    tri(A[k1], B[k], B[k1]);
                }
                else {
                    tri(A[k], B[k], B[k1]);
                    tri(A[k], B[k1], A[k1]);
                }
            }
        }
        else if (B.length === 2 * A.length) {
            for (let k = 0; k < A.length; k++) {
                const k1 = (k + 1) % A.length;
                const b0 = 2 * k;
                const b1 = (2 * k + 1) % B.length;
                const b2 = (2 * k + 2) % B.length;
                tri(A[k], B[b0], B[b1]);
                tri(A[k], B[b1], A[k1]);
                tri(A[k1], B[b1], B[b2]);
            }
        }
        else if (A.length === 2 * B.length) {
            for (let k = 0; k < B.length; k++) {
                const k1 = (k + 1) % B.length;
                const a0 = 2 * k;
                const a1 = (2 * k + 1) % A.length;
                const a2 = (2 * k + 2) % A.length;
                tri(A[a0], B[k], A[a1]);
                tri(A[a1], B[k], B[k1]);
                tri(A[a1], B[k1], A[a2]);
            }
        }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
}
/** A lathe around Z from a profile [[r, z], …]. */
export function lathe(profile, seg = 96) {
    const g = new LatheGeometry(profile.map(([r, z]) => new Vector2(r, z)), seg);
    g.rotateX(Math.PI / 2);
    return g;
}
let roseShapeCache = null;
/** The Carisma rose as shapes, centred, fitted to radius 1 (y up). Parsed once per page. */
export function roseShapes() {
    if (roseShapeCache)
        return roseShapeCache;
    const out = [];
    const X = (v) => (parseFloat(v) - 50) / 47;
    const Y = (v) => -(parseFloat(v) - 44) / 47;
    for (const d of ROSE_PATHS) {
        const tk = d.match(/[MCLZ]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
        let i = 0;
        let sh = null;
        let cmd = "";
        while (i < tk.length) {
            if (/[MCLZ]/.test(tk[i])) {
                cmd = tk[i++];
                if (cmd === "Z") {
                    sh?.closePath();
                    continue;
                }
            }
            if (cmd === "M") {
                sh = new Shape();
                out.push(sh);
                sh.moveTo(X(tk[i]), Y(tk[i + 1]));
                i += 2;
                cmd = "L";
            }
            else if (cmd === "L" && sh) {
                sh.lineTo(X(tk[i]), Y(tk[i + 1]));
                i += 2;
            }
            else if (cmd === "C" && sh) {
                sh.bezierCurveTo(X(tk[i]), Y(tk[i + 1]), X(tk[i + 2]), Y(tk[i + 3]), X(tk[i + 4]), Y(tk[i + 5]));
                i += 6;
            }
            else
                i++;
        }
    }
    roseShapeCache = out;
    return out;
}
/** The rose split into 5 strata, back to front: leaves, outer petals, middle, inner, heart. */
export function roseStrata() {
    const sh = roseShapes().map((s) => {
        const p = s.getPoints(6);
        let x = 0;
        let y = 0;
        p.forEach((q) => {
            x += q.x;
            y += q.y;
        });
        return { s, x: x / p.length, y: y / p.length };
    });
    const isLeaf = (i) => i.y < -0.42 || (i.y < -0.2 && Math.abs(i.x) > 0.5);
    const d2 = (i) => (i.x + 0.5) * (i.x + 0.5) + (i.y - 0.55) * (i.y - 0.55);
    const leaves = sh.filter(isLeaf);
    const fl = sh.filter((i) => !isLeaf(i)).sort((a, b) => d2(b) - d2(a));
    const per = Math.ceil(fl.length / 4);
    return [leaves, fl.slice(0, per), fl.slice(per, 2 * per), fl.slice(2 * per, 3 * per), fl.slice(3 * per)].map((g) => g.map((i) => i.s));
}
let roseFitCache = null;
/**
 * The smallest circle round every point of the rose (iterative), + the bevel.
 * The charm scales the rose by THIS — its true enclosing circle, never by eye —
 * so the rose fills 74 % of its ring and never crosses the gold border.
 */
export function roseFit() {
    if (roseFitCache)
        return roseFitCache;
    const pts = [];
    roseShapes().forEach((sh) => sh.getPoints(10).forEach((q) => pts.push([q.x + 0.05, q.y])));
    let cx = 0;
    let cy = 0;
    pts.forEach((q) => {
        cx += q[0];
        cy += q[1];
    });
    cx /= pts.length;
    cy /= pts.length;
    for (let i = 1; i < 400; i++) {
        let far = pts[0];
        let fd = -1;
        for (const q of pts) {
            const d = (q[0] - cx) * (q[0] - cx) + (q[1] - cy) * (q[1] - cy);
            if (d > fd) {
                fd = d;
                far = q;
            }
        }
        cx += (far[0] - cx) / (i + 1);
        cy += (far[1] - cy) / (i + 1);
    }
    let maxR = 0;
    pts.forEach((q) => {
        maxR = Math.max(maxR, Math.hypot(q[0] - cx, q[1] - cy));
    });
    roseFitCache = { maxR: maxR + 0.02, cx, cy };
    return roseFitCache;
}
/** The rose in gold relief, one extrusion per stratum, back to front. */
export function roseGold(mat, thick) {
    const grp = new Group();
    roseStrata().forEach((gr, k) => {
        if (!gr.length)
            return;
        const m = new Mesh(new ExtrudeGeometry(gr, {
            depth: 0.06 * thick,
            bevelEnabled: true,
            bevelThickness: 0.035 * thick,
            bevelSize: 0.02,
            bevelSegments: 4,
            curveSegments: 14,
        }), mat);
        m.position.set(0.05, 0, k * 0.065 * thick);
        grp.add(m);
    });
    return grp;
}
const SHADOW_RGB = [60, 38, 20].join(",");
/** A soft contact shadow sprite (procedural canvas). */
export function shadowSprite(r, alpha) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    if (g) {
        const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
        gr.addColorStop(0, `rgba(${SHADOW_RGB},${alpha})`);
        gr.addColorStop(0.6, `rgba(${SHADOW_RGB},${alpha * 0.3})`);
        gr.addColorStop(1, `rgba(${SHADOW_RGB},0)`);
        g.fillStyle = gr;
        g.fillRect(0, 0, 256, 256);
    }
    const m = new Mesh(new PlaneGeometry(r * 2, r * 2), new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
    m.renderOrder = -5;
    return m;
}
// ── the procedural studio (softboxes on a warm dome) ─────────────────────────
const DOME_VERT = "varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}";
const DOME_FRAG = "varying vec3 p; uniform vec3 top; uniform vec3 mid; uniform vec3 bot; void main(){ float h=normalize(p).y; vec3 c=h>0.?mix(mid,top,smoothstep(0.,.9,h)):mix(mid,bot,smoothstep(0.,.8,-h)); gl_FragColor=vec4(c*.9,1.);}";
function makeEnv(renderer) {
    const pm = new PMREMGenerator(renderer);
    const s = new Scene();
    const dome = new Mesh(new SphereGeometry(60, 32, 16), new ShaderMaterial({
        side: BackSide,
        uniforms: { top: { value: new Color(0xb9a793) }, mid: { value: new Color(0x5a4d44) }, bot: { value: new Color(0x2a2320) } },
        vertexShader: DOME_VERT,
        fragmentShader: DOME_FRAG,
    }));
    s.add(dome);
    const box = (w, h, x, y, z, col, k) => {
        const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(col).multiplyScalar(k), side: DoubleSide }));
        m.position.set(x, y, z);
        m.lookAt(0, 0, 0);
        s.add(m);
    };
    box(5, 24, 10, 22, 18, 0xfff0d8, 17); // warm key, two strips
    box(5, 24, 19, 20, 14, 0xfff0d8, 15); // warm key, upper right front
    box(6, 34, -26, 6, 14, 0xe6edff, 9); // cool strip, left
    box(34, 6, 0, -12, 26, 0xffe1c0, 5); // low front bounce
    box(14, 14, -10, 18, -22, 0xffffff, 9); // back rim
    box(5, 26, 28, -4, -6, 0xffd3a0, 8); // warm strip, right
    box(12, 12, 0, 30, 0, 0xffffff, 8); // top
    box(3, 16, -7, -3, 30, 0xffffff, 5);
    box(2.5, 12, 9, 4, 30, 0xfff4e4, 4); // thin front sliver (catches facets)
    const tex = pm.fromScene(s, 0.012).texture;
    pm.dispose();
    disposeTree(s);
    return tex;
}
/**
 * Free every geometry, material and texture under a node (the shared light
 * room is never in a jewel's tree). A node may list extra materials it swaps
 * in at draw time (`userData.disposables`), which no mesh holds at that moment.
 */
export function disposeTree(root) {
    root.traverse((o) => {
        const extra = o.userData?.disposables;
        if (Array.isArray(extra))
            for (const m of extra)
                m.dispose?.();
        const mesh = o;
        if (mesh.geometry)
            mesh.geometry.dispose();
        const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
        for (const m of mats) {
            const map = m.map;
            if (map)
                map.dispose();
            m.dispose();
        }
    });
}
let shared = null;
let failed = false;
let releaseTimer = null;
export const SHARED_RELEASE_MS = 30_000;
/**
 * three r185 `console.error`s "WebGLRenderer: Error creating WebGL context…"
 * before it throws. Construction is wrapped in this filter so a desk PC with
 * WebGL off (RDP, an old driver) gets a flat mark and a CLEAN console.
 */
export function filterWebGLRendererErrors(prev) {
    return (type, message, ...params) => {
        if (type === "error" && /WebGLRenderer/.test(String(message)))
            return;
        if (prev) {
            prev(type, message, ...params);
            return;
        }
        console[type](message, ...params);
    };
}
function acquireShared() {
    if (failed)
        throw new Error("circle jewel: WebGL failed on this page");
    if (releaseTimer) {
        clearTimeout(releaseTimer);
        releaseTimer = null;
    }
    if (shared)
        return shared;
    const canvas = document.createElement("canvas");
    const prev = getConsoleFunction() ?? null;
    setConsoleFunction(filterWebGLRendererErrors(prev));
    let renderer;
    try {
        renderer = new WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true,
        });
    }
    finally {
        // `null` restores three's own console (the getter answers null when none was set).
        setConsoleFunction(prev);
    }
    renderer.debug.onShaderError = () => failEverything();
    canvas.addEventListener("webglcontextlost", failEverything, false);
    renderer.setPixelRatio(1);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setScissorTest(true);
    renderer.setSize(512, 512, false);
    shared = { renderer, canvas, env: makeEnv(renderer), size: 512 };
    return shared;
}
function ensureSharedSize(need) {
    if (!shared || need <= shared.size)
        return;
    shared.size = Math.ceil(need / 128) * 128;
    shared.renderer.setSize(shared.size, shared.size, false);
}
function disposeShared() {
    if (releaseTimer) {
        clearTimeout(releaseTimer);
        releaseTimer = null;
    }
    const s = shared;
    shared = null;
    if (!s)
        return;
    s.canvas.removeEventListener("webglcontextlost", failEverything, false);
    try {
        s.env.dispose();
        s.renderer.forceContextLoss();
        s.renderer.dispose();
    }
    catch {
        /* already gone */
    }
}
/** The last jewel left: give the context back 30 s later unless another jewel arrives first. */
function releaseSharedSoon() {
    if (!shared || releaseTimer)
        return;
    releaseTimer = setTimeout(() => {
        releaseTimer = null;
        if (stages.size === 0)
            disposeShared();
    }, SHARED_RELEASE_MS);
}
/** Any throw, shader error or context loss: every jewel on the page becomes its flat mark, and nothing retries. */
function failEverything() {
    if (failed)
        return;
    failed = true;
    for (const stage of [...stages])
        stage.dispose();
    stages.clear();
    disposeShared();
    stopWatching();
    markJewelFailed();
}
const stages = new Set();
const byCanvas = new WeakMap();
let palette = null;
let raf = 0;
let nearIO = null;
let visIO = null;
let sizeRO = null;
let watching = false;
function prefersReducedMotion() {
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    catch {
        return false;
    }
}
function arcOf(state) {
    if (state.variant === "icon" || state.progress >= 1)
        return 1;
    return 0.017 + 0.966 * Math.max(0, state.progress);
}
class JewelStage {
    canvas;
    state;
    build;
    hover;
    onFirstFrame;
    scene = new Scene();
    cam = new PerspectiveCamera(26, 1, 0.1, 50);
    rig = new Group();
    sweep = new DirectionalLight(0xfff6e8, 0);
    key = new DirectionalLight(0xfff2e0, 1.1);
    ctx2d;
    motif = null;
    motifRoot = null;
    motifFixed = null;
    t0 = performance.now();
    pw = 0;
    ph = 0;
    tx = 0;
    ty = 0;
    px = 0;
    py = 0;
    sized = false;
    painted = false;
    near = false;
    visible = false;
    alive = true;
    /** Reduced motion: draw once per change, then nothing. */
    stillDue = true;
    still;
    constructor(canvas, state, build, hover, onFirstFrame) {
        this.canvas = canvas;
        this.state = state;
        this.build = build;
        this.hover = hover;
        this.onFirstFrame = onFirstFrame;
        this.ctx2d = canvas.getContext("2d");
        this.still = prefersReducedMotion();
        this.cam.position.set(0, -0.055, 5.8);
        this.scene.add(this.rig, this.sweep, this.key);
        this.key.position.set(2.5, 4, 5);
        if (!this.still && this.hover) {
            this.hover.addEventListener("pointermove", this.onMove);
            this.hover.addEventListener("pointerleave", this.onLeave);
        }
    }
    onMove = (e) => {
        const el = this.hover;
        if (!el)
            return;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height)
            return;
        const p = clientToRectSpace(el, e.clientX, e.clientY, rect);
        this.tx = Math.max(-1, Math.min(1, ((p.x - rect.left) / rect.width - 0.5) * 2));
        this.ty = Math.max(-1, Math.min(1, ((p.y - rect.top) / rect.height - 0.5) * 2));
        kick();
    };
    onLeave = () => {
        this.tx = 0;
        this.ty = 0;
        kick();
    };
    markResized() {
        this.sized = false;
        this.stillDue = true;
    }
    update(next) {
        const prev = this.state;
        this.state = { ...prev, ...next };
        if (this.state.gem !== prev.gem || this.state.variant !== prev.variant)
            this.rebuild();
        this.stillDue = true;
        kick();
    }
    rebuild() {
        if (this.motifRoot) {
            this.rig.remove(this.motifRoot);
            disposeTree(this.motifRoot);
        }
        if (this.motifFixed) {
            this.scene.remove(this.motifFixed);
            disposeTree(this.motifFixed);
        }
        this.motif = null;
        this.motifRoot = null;
        this.motifFixed = null;
        if (this.near)
            this.ensureBuilt();
    }
    ensureBuilt() {
        if (this.motif || !this.alive)
            return;
        const sh = acquireShared();
        this.scene.environment = sh.env;
        palette ??= readJewelPalette();
        const root = new Group();
        const fixed = new Group();
        this.rig.add(root);
        this.scene.add(fixed);
        this.motif = this.build({ rig: root, fixed, palette, state: this.state });
        this.motifRoot = root;
        this.motifFixed = fixed;
    }
    /**
     * The canvas's backing size in DEVICE pixels: its layout size × the
     * console's CSS zoom (`html { zoom: 0.8 }`) × the DPR (capped at 2). The
     * layout size is the element's own (`offsetWidth`), which no ancestor zoom
     * changes; the zoom-safe box is the fallback. (`layoutBoxOf().rect` is not
     * read directly: at zoom 1 it spreads a DOMRect, whose sides are prototype
     * getters, and comes back empty.)
     */
    measure() {
        if (this.sized)
            return this.pw > 0;
        let w = this.canvas.offsetWidth;
        let h = this.canvas.offsetHeight;
        let zoom = documentCssZoom();
        if (!w || !h) {
            const box = layoutBoxOf(this.canvas);
            const r = this.canvas.getBoundingClientRect();
            w = box.rect.width || r.width;
            h = box.rect.height || r.height;
            zoom = box.rect.width ? box.zoom : 1;
        }
        if (!w || !h)
            return false;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const scale = (zoom > 0 ? zoom : 1) * dpr;
        const pw = Math.max(1, Math.round(w * scale));
        const ph = Math.max(1, Math.round(h * scale));
        if (pw !== this.pw || ph !== this.ph) {
            this.pw = pw;
            this.ph = ph;
            this.canvas.width = pw;
            this.canvas.height = ph;
            this.cam.aspect = w / h;
            this.cam.updateProjectionMatrix();
            ensureSharedSize(Math.max(pw, ph));
        }
        this.sized = true;
        return true;
    }
    /** One frame. `now` drives the motion; a still frame holds the prototype's resting light. */
    draw(now) {
        if (!this.alive)
            return;
        this.ensureBuilt();
        if (!this.motif || !shared || !this.measure())
            return;
        const t = this.still ? 2.4 : (now - this.t0) / 1000;
        if (this.still) {
            this.rig.rotation.set(0, 0, 0);
            this.sweep.intensity = 3.2 * 0.35;
            this.sweep.position.set(-0.6, 1.4, 3.2);
        }
        else {
            this.px += (this.tx - this.px) * 0.08;
            this.py += (this.ty - this.py) * 0.08;
            // idle lean ~6° / 4° on a slow drift + a few degrees toward the pointer
            this.rig.rotation.y = Math.sin(t * 0.62) * 0.105 + this.px * 0.17;
            this.rig.rotation.x = Math.sin(t * 0.47 + 1.3) * 0.07 + this.py * 0.14;
            // the light passes every 8 s, for 1.6 s, left to right
            const phase = (t % 8) / 1.6;
            const k = phase < 1 ? Math.sin(phase * Math.PI) : 0;
            this.sweep.intensity = 3.2 * k;
            this.sweep.position.set(-3.4 + phase * 6.8, 1.4, 3.2);
        }
        this.motif.draw({ ...this.state, arc: arcOf(this.state) }, t, this.still);
        this.paint();
    }
    paint() {
        const sh = shared;
        if (!sh || !this.ctx2d || !this.pw)
            return;
        const r = sh.renderer;
        r.toneMappingExposure = 1;
        r.setViewport(0, 0, this.pw, this.ph);
        r.setScissor(0, 0, this.pw, this.ph);
        r.clear();
        r.render(this.scene, this.cam);
        this.ctx2d.clearRect(0, 0, this.pw, this.ph);
        this.ctx2d.drawImage(sh.canvas, 0, sh.size - this.ph, this.pw, this.ph, 0, 0, this.pw, this.ph);
        if (!this.painted) {
            this.painted = true;
            this.onFirstFrame?.();
        }
    }
    dispose() {
        if (!this.alive)
            return;
        this.alive = false;
        if (this.hover) {
            this.hover.removeEventListener("pointermove", this.onMove);
            this.hover.removeEventListener("pointerleave", this.onLeave);
        }
        disposeTree(this.scene);
        this.motif = null;
        this.motifRoot = null;
        this.motifFixed = null;
    }
}
/**
 * One jewel's turn in a frame: draw or not, and whether the loop must run again for it. Reduced motion
 * (surfaces §3.3, §7.2): ONE exact still frame per change, then nothing — never a running loop.
 */
export function frameStep(stage) {
    if (!stage.alive || !stage.near || !stage.visible)
        return { draw: false, again: false };
    if (stage.still) {
        if (!stage.stillDue)
            return { draw: false, again: false };
        stage.stillDue = false;
        return { draw: true, again: false };
    }
    return { draw: true, again: true };
}
/** The engine's reading of `prefers-reduced-motion` (exported for the reduced-motion test). */
export function motionReduced() {
    return prefersReducedMotion();
}
function kick() {
    if (raf || failed || stages.size === 0 || typeof window === "undefined")
        return;
    raf = window.requestAnimationFrame(frame);
}
function frame(now) {
    raf = 0;
    if (failed)
        return;
    const hidden = document.visibilityState === "hidden";
    let again = false;
    try {
        for (const stage of stages) {
            const step = frameStep(stage);
            if (step.draw)
                stage.draw(now);
            if (step.again)
                again = true;
        }
    }
    catch {
        failEverything();
        return;
    }
    if (again && !hidden)
        kick();
}
const onVisibility = () => {
    if (document.visibilityState !== "hidden")
        kick();
};
function startWatching() {
    if (watching)
        return;
    watching = true;
    document.addEventListener("visibilitychange", onVisibility);
    if (typeof IntersectionObserver !== "undefined") {
        nearIO = new IntersectionObserver((entries) => {
            for (const e of entries) {
                const stage = byCanvas.get(e.target);
                if (!stage || !e.isIntersecting || stage.near)
                    continue;
                stage.near = true;
                try {
                    stage.ensureBuilt();
                }
                catch {
                    failEverything();
                    return;
                }
            }
            kick();
        }, { rootMargin: "300px" });
        visIO = new IntersectionObserver((entries) => {
            for (const e of entries) {
                const stage = byCanvas.get(e.target);
                if (!stage)
                    continue;
                stage.visible = e.isIntersecting;
                if (stage.visible)
                    stage.stillDue = true;
            }
            kick();
        }, { rootMargin: "120px" });
    }
    if (typeof ResizeObserver !== "undefined") {
        sizeRO = new ResizeObserver((entries) => {
            for (const e of entries)
                byCanvas.get(e.target)?.markResized();
            kick();
        });
    }
}
function stopWatching() {
    if (!watching)
        return;
    watching = false;
    document.removeEventListener("visibilitychange", onVisibility);
    nearIO?.disconnect();
    visIO?.disconnect();
    sizeRO?.disconnect();
    nearIO = null;
    visIO = null;
    sizeRO = null;
    if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
    }
}
/**
 * Mount one jewel on `canvas` (a 2D canvas the component reserved at its final
 * size). Throws only when WebGL cannot start — the caller then shows the flat
 * mark; every later failure is handled here (all jewels fall back at once).
 */
export function createJewelMount(build) {
    return function mountJewel(canvas, options) {
        acquireShared();
        startWatching();
        const { hover, onFirstFrame, ...state } = options;
        const stage = new JewelStage(canvas, state, build, hover, onFirstFrame);
        stages.add(stage);
        byCanvas.set(canvas, stage);
        if (nearIO && visIO) {
            nearIO.observe(canvas);
            visIO.observe(canvas);
        }
        else {
            stage.near = true;
            stage.visible = true;
        }
        sizeRO?.observe(canvas);
        kick();
        return {
            update: (next) => {
                if (stage.alive)
                    stage.update(next);
            },
            dispose: () => {
                nearIO?.unobserve(canvas);
                visIO?.unobserve(canvas);
                sizeRO?.unobserve(canvas);
                byCanvas.delete(canvas);
                stages.delete(stage);
                stage.dispose();
                if (stages.size === 0) {
                    stopWatching();
                    releaseSharedSoon();
                }
            },
        };
    };
}
/** Tests only: the engine's module state, to prove the shared renderer is released. */
export function jewelEngineStateForTests() {
    return { stages: stages.size, shared: shared !== null, failed };
}
//# sourceMappingURL=engine.js.map