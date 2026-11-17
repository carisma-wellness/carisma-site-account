/**
 * The Circle jewel (DECIDED, CEO 17 Nov 2026) — a port of `CC.motifs.solitaire`
 * with `rose: "charm"` only (carisma-circle-v2-20261117; ported from the desk's copy):
 *
 *   a rose-cut stone in her level's gem, in a gold rim with an ivory
 *   mother-of-pearl band; a ring of gold beads counts the way to the next
 *   level (dark → gold, clockwise from 12); the Carisma rose hangs below as an
 *   OPEN, see-through gold charm.
 *
 * The rules this file keeps (reference-jewel.md): one jewel on every brand —
 * the setting never recolours; nothing sits on the stone or the beads; the
 * charm is ONE proportion at every size (ring 0.225 of the jewel's radius,
 * 0.3 below the rim, the rose 74 % of the ring by its true enclosing circle);
 * no words on the jewel. Numbers are ported, not re-tuned. Only her stone is
 * built (the 3.6 s level-up that swaps stones is not on the desk).
 */
import { Color, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, RingGeometry, SphereGeometry, TorusGeometry, DoubleSide } from "three";
import { GEM_IDENTITY } from "./stage.js";
import {
  DEG,
  TAU,
  facetGeo,
  gemMats,
  gold,
  lathe,
  pearlMesh,
  roseFit,
  roseGold,
  shadowSprite,
  type MotifBuilder,
  type MotifView,
} from "./engine.js";

/** The open charm: a gold ring holding the rose, nothing behind it (the ground shows through). */
function roseCharm(pol: MeshStandardMaterial, metal: number, r: number): Group {
  const grp = new Group();
  const tube = r * 0.085;
  grp.add(new Mesh(new TorusGeometry(r, tube, 14, 80), pol));
  const fit = roseFit();
  const sc = (r * 0.74) / fit.maxR;
  const rg = gold(metal, 0.26);
  rg.emissive = new Color(0x6b4a12);
  rg.emissiveIntensity = 0.35; // keeps the small rose from going dark
  const rose = roseGold(rg, 1.2);
  rose.scale.set(sc, sc, sc * 0.3);
  rose.position.set(-fit.cx * sc, -fit.cy * sc, -tube * 0.9);
  grp.add(rose);
  return grp;
}

export const buildSolitaire: MotifBuilder = ({ rig, fixed, palette, state }) => {
  const pol = gold(palette.metal, 0.14);
  const polD = pol.clone();
  polD.side = DoubleSide;
  const satin = gold(palette.metalDeep, 0.5);
  const g = new Group();
  rig.add(g);

  // a tight frame (the box is the canvas): the soft shadow must fade inside it, or its edge shows as a pale square
  const sh = shadowSprite(1.7, 0.3);
  sh.position.set(0.08, -0.14, -0.4);
  sh.scale.setScalar(0.56);
  fixed.add(sh);

  // her stone: the rose cut (flat base, a dome of small facets); Pearl is the smooth dome
  const identity = GEM_IDENTITY[state.gem];
  const stone = new Group();
  if (state.gem === "pearl") {
    stone.add(pearlMesh());
  } else {
    const P16 = Math.PI / 16;
    const cut = facetGeo([
      { z: 0.5 },
      { r: 0.3, z: 0.45, n: 8, rot: 0 },
      { r: 0.6, z: 0.32, n: 16, rot: 0 },
      { r: 0.85, z: 0.16, n: 16, rot: P16 },
      { r: 1, z: 0.0, n: 32, rot: P16 },
      { r: 0.95, z: -0.1, n: 32, rot: P16 },
      { z: -0.12 },
    ]);
    const [inner, outer] = gemMats(identity, palette.gems[state.gem]);
    inner.emissiveIntensity *= 1.8;
    const back = new Mesh(cut, inner);
    back.scale.z = -0.8;
    back.position.z = 0.02;
    const front = new Mesh(cut, outer);
    front.renderOrder = 2;
    stone.add(back, front);
  }
  stone.position.z = 0.1;
  g.add(stone);

  g.add(
    new Mesh(
      lathe(
        [
          [0.64, -0.06],
          [0.66, -0.04],
          [0.672, 0.04],
          [0.652, 0.15],
          [0.632, 0.165],
          [0.622, 0.12],
          [0.62, 0.05],
        ],
        128,
      ),
      polD,
    ),
  );
  const band = new MeshPhysicalMaterial({
    color: new Color(palette.band),
    metalness: 0.12,
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 1,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [300, 800],
    sheen: 0.6,
    sheenColor: new Color(0xf0c6d4),
    envMapIntensity: 1.1,
    side: DoubleSide,
  });
  g.add(
    new Mesh(
      lathe(
        [
          [0.672, -0.02],
          [0.69, 0.03],
          [0.79, 0.055],
          [0.9, 0.03],
          [0.915, -0.02],
        ],
        128,
      ),
      band,
    ),
  );
  const backPlate = new Mesh(new RingGeometry(0.655, 1.0, 96), satin);
  backPlate.position.z = -0.045;
  g.add(backPlate);

  // the gold beads: 40 on the full jewel, 20 larger ones on the small jewel and the icon
  const small = state.variant !== "full";
  const dull = new MeshStandardMaterial({ color: new Color(0xd8cbb4), metalness: 0.35, roughness: 0.6 });
  const N = small ? 20 : 40;
  const beadGeo = new SphereGeometry(1, 20, 14);
  const beads: Mesh[] = [];
  // the materials a bead swaps between at draw time: freed with the jewel even when no bead holds one
  g.userData.disposables = [pol, polD, satin, dull, band];
  for (let k = 0; k < N; k++) {
    const a = 90 * DEG - ((k + 0.5) / N) * TAU;
    const b = new Mesh(beadGeo, pol);
    b.position.set(Math.cos(a) * 0.79, Math.sin(a) * 0.79, 0.07);
    g.add(b);
    beads.push(b);
  }
  g.add(
    new Mesh(
      lathe(
        [
          [0.905, -0.05],
          [1.02, -0.05],
          [1.04, 0.0],
          [1.02, 0.05],
          [0.975, 0.062],
          [0.925, 0.045],
          [0.91, 0.0],
        ],
        128,
      ),
      polD,
    ),
  );

  // the rose charm hangs from a gold ring under the jewel; it sways
  g.scale.setScalar(0.9);
  g.position.y = 0.2;
  const loop = new Mesh(new TorusGeometry(0.06, 0.014, 10, 40), pol);
  loop.position.set(0, -1.085, 0);
  g.add(loop);
  const eye = new Mesh(new TorusGeometry(0.03, 0.012, 8, 28), pol);
  eye.rotation.y = Math.PI / 2;
  eye.position.set(0, -1.035, 0);
  g.add(eye);
  const swing = new Group();
  swing.position.set(0, -1.09, 0);
  g.add(swing);
  const charm = roseCharm(pol, palette.metal, 0.225); // ONE proportion at every size, never enlarged
  charm.position.set(0, -0.3, 0);
  swing.add(charm);

  return {
    draw(view: MotifView, t: number, still: boolean) {
      stone.scale.setScalar(0.62);
      stone.rotation.z = still ? 0.26 : t * (TAU / 26); // one turn every 26 s
      const lit = view.arc >= 1 ? N : Math.round(view.arc * N);
      beads.forEach((b, k) => {
        const on = k < lit;
        b.material = on ? pol : dull;
        b.scale.setScalar(small ? (on ? 0.064 : 0.04) : on ? 0.04 : 0.026);
        b.position.z = on ? 0.075 : 0.058;
      });
      swing.rotation.z = still ? 0 : Math.sin(t * (TAU / 4.6)) * 0.085; // ±5° every 4.6 s
    },
  };
};
