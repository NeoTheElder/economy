// The Economic Machine: a bench engine whose working is Ray Dalio's model of the economy.
// node build.mjs [--light] [--audit]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = join(process.env.HOME, ".claude/skills/anatomy");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const G = await import(join(SKILL, "kit/lathe.mjs"));
const { tubePieces, tubeSvg } = await import(join(SKILL, "kit/tube.mjs"));
const A = await import(join(SKILL, "kit/audit.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));

const HERE = dirname(fileURLToPath(import.meta.url));
const PARTS = await import(join(HERE, "parts.mjs"));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const W = 820;
const H = 620;
const AZIMUTH = 58;
const ELEVATION = 28;

// ---------- layout (world units, z up) ----------
const PLATE = { x: -222, y: -122, w: 440, d: 250, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const AXLE_Z = 82;
const FW = { x: -70, y: -5, R: 56, rIn: 47, rim: 7, web: 2.5, hub: 10, hubLen: 12 };      // flywheel: spending
const SHAFT1 = { x: -70, y0: -40, y1: 70, r: 4.5 };
const PED1 = [-28, 16];                                                                    // pillow blocks on shaft 1
const PULLEY_Y = 38;
const PULLEY = { flange: 22, core: 17, halfCore: 1.8, half: 4.5 };
const BELT_R = 1.6;
const BELT_RAD = PULLEY.core + BELT_R;
const DRUM = { y: 58, r: 12, half: 7, flange: 16 };                                        // debt drum
const CS = { x: 85, y0: -18, y1: 48, r: 4.5, ped: 16 };                                     // countershaft: income
const BEVEL = { x: 73, y: -18, w: 24, d: 24, z0: 66, z1: 96 };
const GOV = { x: 85, y: -6, z0: 96, pivot: 172, top: 180, arm: 42, link: 34, ball: 8.5, aMin: 16, aMax: 50 }; // governor: central bank
const LEVER = { px: 102, py: -6, pz: 118, left: 89.6, right: 34, post: -20 };                            // rate lever pivot
const QUAD = { y: -16, x0: 120, x1: 150, z0: 88, z1: 128 };                                // rate quadrant plate
const GAL = { x: -185, post: [-185, 28], postR: 4.5, top: 214, py: 58, pz: 196, pr: 9 };    // gallows: debt weight
const BOARD = { x: -213, y: 33, w: 38, d: 4, z0: 18, z1: 192 };
const WEIGHT = { x: GAL.x - GAL.pr - 0.7, y: GAL.py, r: 9, zHi: 162, zLo: 50 };
const CONSOLE = { x: 32, y: 70, w: 166, d: 42, r: 4, h: 24 };
const DIALS = [[64, 91], [110, 91]];
const DIAL_R = 15;
const DIAL_Z = CONSOLE.h;
const DIAL_H = 8;
const LEVERS_X = [142, 155, 168, 181];
const LEVER_LEN = 26;
const SCREW = { x0: -196, x1: -44, y: 100, z: 9, r: 3 };
const BRAKE = { x: -150, y: -11 };
const MOTOR = { y0: -36, y1: -14, r: 10 };
const MA = -0.56;         // where the motor's wheel meets the flywheel rim, measured from +x toward +z
const REST_RATE = 0.055;  // the rate the static drawing is built at (the model's starting rate)

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GAL.x, GAL.py, GAL.top + 4], [GAL.post[0], GAL.post[1], GAL.top + 4], [GOV.x, GOV.y, GOV.top + 6], [QUAD.x1, QUAD.y, QUAD.z1]],
  W, H, { pad: 26, azimuth: AZIMUTH, elevation: ELEVATION },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const f2 = (v) => Math.round(v * 100) / 100;
const D = { V, GOV, LEVER, FW, AXLE_Z, MA, MOTOR, LEVERS_X, CONSOLE, LEVER_LEN };
const K = { solidSvg: k.solidSvg, cylinder: k.cylinder, lineSvg: k.lineSvg, sideArc: k.sideArc };
const Y = [0, 1, 0], X = [1, 0, 0], Z = [0, 0, 1];
const alongY = (x, y, z) => G.frameOf([x, y, z], Y, [1, 0, 0], [0, 0, 1]);
const alongX = (x, y, z) => G.frameOf([x, y, z], X, [0, 1, 0], [0, 0, 1]);
const alongZ = (x, y, z) => G.frameOf([x, y, z], Z, [1, 0, 0], [0, 1, 0]);

// ---------- recorder and drawing helpers ----------
const R = A.recorder(P);
const record = R.solid;
function put(name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece: "bench", ...rest });
}
function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.6, steps = 3, bevel = 0.4, extra = "", inner = "", bias = 0, attrs } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const shape = record(A.slab(plan, z0, z1 - z0, { name }, steps));
  put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, attrs });
  return shape;
}
function cyl(name, cx, cy, r, z0, z1, style = {}, { extra = "", bias = 0, steps = 28, bevel = 0, attrs } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z0, z1 - z0, { name }));
  put(name, [cx, cy, (z0 + z1) / 2], S(k.cylinder(cx, cy, r, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], { bias, attrs });
  return shape;
}
function disc(name, F, s0, s1, r, style = {}, { extra = "", inner = "", bias = 0, owner, attrs, bevel = 0 } = {}) {
  const shape = record(A.disc(F, s0, s1, r, { name, owner }));
  put(name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.disc(s0, s1, r, F, P, { bevel }), { tone: "mid", ...style, inner }) + extra, [shape], { bias, attrs });
  return shape;
}
function ring(name, F, s0, s1, rIn, rOut, style = {}, { extra = "", inner = "", bias = 0, attrs, hole = null } = {}) {
  const shape = record(A.ring(F, s0, s1, rIn, rOut, { name }));
  put(name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.ringBand(s0, s1, rIn, rOut, F, P, hole ? { hole } : {}), { tone: "mid", ...style, inner }) + extra, [shape], { bias, attrs });
  return shape;
}
function ball(name, c, r, style = {}, { bias = 0, extra = "", attrs } = {}) {
  const shape = record(A.ball(c, r, { name }));
  put(name, c, S(G.sphereOf(c, r, P, { steps: 32 }), { tone: "mid", ...style }) + extra, [shape], { bias, attrs });
  return shape;
}
function prism(name, F, poly, s0, s1, style = {}, { extra = "", bias = 0, attrs } = {}) {
  const shape = record(A.prism(F, poly, s0, s1, { name }));
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  const c = G.add3(G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.mul3(F.u, cx)), G.mul3(F.v, cy));
  put(name, c, S(G.prismOf(F, poly, s0, s1, P), { tone: "mid", ...style }) + extra, [shape], { bias, attrs });
  return shape;
}
const ROUTES = [];
function tube(name, points, r, { tone = "mid", maxLength = 14, bias = 0.05, limp = true, closed = false, ends = [true, true], gaps = [], attrs = "", caps, touch, tips } = {}) {
  ROUTES.push(name);
  R.route(name, points, r, { limp, closed, gaps, piece: "bench", ...(touch ? { touch } : {}), ...(tips ? { ends: tips } : {}) });
  tubePieces(points, r, P, { maxLength, spacing: Math.max(0.6, Math.min(1.6, r)), closed, gaps, ...(caps !== undefined ? { caps } : {}) }).forEach((piece, index) =>
    put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], { bias, route: name, attrs: ` data-route="${name}"${attrs}` }),
  );
  if (!closed) [0, 1].forEach((i) => {
    if (!ends[i]) return;
    const end = i ? points[points.length - 1] : points[0];
    const size = Math.max(0.55, r * KS * 0.9);
    put(`${name}.end${i}`, end, Dots([at(end)], { size, tone: "hi" }), [A.ball(end, size / KS, { name: `${name}.end${i}`, owner: name })], { bias: bias + 0.15 });
  });
}
const shapeOf = (it) => { const meta = { name: it.name, owner: it.owner }; return it.kind === "ball" ? A.ball(it.c, it.r, meta) : it.kind === "cyl" ? A.cylinder(it.x, it.y, it.r, it.z0, it.z1 - it.z0, meta) : A.disc(it.F, it.s0, it.s1, it.r, meta); };
// a moving part: drawn here at rest with its true shapes, redrawn live from the same descriptions
function live(name, partName, items, ref, { bias = 0 } = {}) {
  put(name, ref, `<g data-part="${partName}">${PARTS.partsSvg(items, G, P, K)}</g>`, items.map((it) => record(shapeOf(it))), { bias });
}
const shaftSeg = (name, F, ranges, r) => ranges.forEach(([s0, s1], i) => disc(`${name}.${i}`, F, s0, s1, r, { tone: "mid" }, { owner: name }));

// ---------- the bench ----------
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
  back.push(S(k.cylinder(x, y, 7.5, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.8, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
back.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
const plateScrews = k.corners(PLATE, 11);
back.push(Ln(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(plateScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }, 8));
// T-slots across the bed, the way a machine bed is cast
for (const y of [-80, -40, 0, 40]) back.push(Ln(k.planOutline({ x: PLATE.x + 14, y: y - 1.6, w: PLATE.w - 28, d: 3.2, r: 1.6 }, 0, P, 3), { tone: "faint" }));
// ruler strip under the productivity screw
const STRIP = { x: SCREW.x0 - 2, y: 110, w: SCREW.x1 - SCREW.x0 + 4, d: 7, r: 1 };
back.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
{
  const t = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4, 5, STRIP.y, 0.6, [2, 3.8], P);
  back.push(Ln(t.minor, { tone: "lo" }), Ln(t.major, { tone: "mid" }));
  back.push(Dots([at([STRIP.x + 2, STRIP.y + 3.5, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3.5, 0.6])], { size: 0.45 }));
}
// label plate with three rule lines
{
  const LABEL = { x: -20, y: 104, w: 36, d: 15, r: 1.2 };
  back.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 4), { tone: "faint" }));
  back.push(Ln([k.lineOnTop([LABEL.x + 5, LABEL.y + 4.5], [LABEL.x + 30, LABEL.y + 4.5], 0.8, P), k.lineOnTop([LABEL.x + 5, LABEL.y + 7.5], [LABEL.x + 24, LABEL.y + 7.5], 0.8, P), k.lineOnTop([LABEL.x + 5, LABEL.y + 10.5], [LABEL.x + 27, LABEL.y + 10.5], 0.8, P)].join(""), { tone: "lo", free: true }));
  back.push(Dots([at([LABEL.x + 2.4, LABEL.y + 7.5, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + 7.5, 0.8])], { size: 0.45 }));
}

// ---------- pillow block: base, web, bearing housing, cap bolts ----------
function pillow(name, x, y, z, { shaftR = 4.5 } = {}) {
  box(`${name}.base`, [x - 20, y - 8, 0], [x + 20, y + 8, 6], {}, { r: 1.5, steps: 4, extra: Dots([at([x - 15, y, 6]), at([x + 15, y, 6])], { size: 0.55 }) });
  box(`${name}.web`, [x - 9, y - 4, 6], [x + 9, y + 4, z - 11], {}, { r: 1, steps: 3 });
  const F = alongY(x, y, z);
  disc(`${name}.house`, F, -6, 6, 11, { tone: "mid" }, {
    inner: Ln(G.arcOf(F, 0, 11, P), { tone: "faint" }),
    extra: Ln(G.circleOf(F, 6, shaftR + 1.6, P), { tone: "faint" }) + Dots([at([x - 7.5, y, z + 8.2]), at([x + 7.5, y, z + 8.2])], { size: 0.5 }),
  });
}

// ---------- flywheel on shaft 1 ----------
const F1 = alongY(SHAFT1.x, 0, AXLE_Z);
const FWF = alongY(FW.x, FW.y, AXLE_Z);
pillow("ped1a", SHAFT1.x, PED1[0], AXLE_Z);
pillow("ped1b", SHAFT1.x, PED1[1], AXLE_Z);
shaftSeg("shaft1", F1, [[SHAFT1.y0, PED1[0] - 6], [PED1[0] + 6, FW.y - FW.hubLen], [FW.y + FW.hubLen, PED1[1] - 6], [PED1[1] + 6, PULLEY_Y - PULLEY.half], [PULLEY_Y + PULLEY.half + 2.5, DRUM.y - DRUM.half - 1.2], [DRUM.y + DRUM.half + 1.2, SHAFT1.y1]], SHAFT1.r);
ring("fw.rimBack", FWF, -FW.rim, -FW.web, FW.rIn, FW.R, { tone: "hi" });
disc("fw.web", FWF, -FW.web, FW.web, FW.rIn + 0.5, { tone: "hi" });
// the web carries six lightening holes and a timing mark: they turn with spending
put("fw.face", G.add3(FWF.o, G.mul3(Y, FW.web + 0.2)), `<g data-part="fw-face">${PARTS.faceSvg({ FW, AXLE_Z }, G, P, K, 0)}</g>`, [record(A.disc(FWF, FW.web, FW.web + 0.1, FW.rIn, { name: "fw.face" }))], { bias: 0.3 });
disc("fw.hubBack", FWF, -FW.hubLen, -FW.web, FW.hub, { tone: "hi" });
disc("fw.hub", FWF, FW.web, FW.hubLen, FW.hub, { tone: "hi" }, { extra: Dots([0, 1, 2].map((i) => at(G.pointOf(FWF, FW.hubLen, 6.6, i * 2.094 + 0.4))), { size: 0.5 }) });
{
  // the front rim is a ring with a bore: through it the web shows, with the inner wall of the rim
  const front = G.circleOf(FWF, FW.rim, FW.rIn, P, 120), backC = G.circleOf(FWF, FW.web, FW.rIn, P, 120);
  const wall = `<clipPath id="em-bore"><path d="${front}"/></clipPath><path clip-path="url(#em-bore)" class="iso-shade" data-shade="1" fill-rule="evenodd" d="${front}${backC}"/>` + `<g clip-path="url(#em-bore)">${Ln(backC, { tone: "faint" })}</g>`;
  ring("fw.rimFront", FWF, FW.web, FW.rim, FW.rIn, FW.R, { tone: "hi" }, { hole: [FW.rim, FW.rIn], inner: Ln(G.arcOf(FWF, 0, FW.R, P), { tone: "faint" }), extra: wall });
}
// drive pulley and its belt groove
function pulley(name, x) {
  const F = alongY(x, PULLEY_Y, AXLE_Z);
  disc(`${name}.back`, F, -PULLEY.half, -PULLEY.halfCore, PULLEY.flange);
  disc(`${name}.core`, F, -PULLEY.halfCore, PULLEY.halfCore, PULLEY.core);
  disc(`${name}.front`, F, PULLEY.halfCore, PULLEY.half, PULLEY.flange, { tone: "mid" }, { extra: `<g data-part="${name}-spokes"></g>` + Ln(G.circleOf(F, PULLEY.half, 7, P), { tone: "lo" }) });
  disc(`${name}.boss`, F, PULLEY.half, PULLEY.half + 2.5, 6.5, { tone: "mid" }, { extra: Dots([at(G.pointOf(F, PULLEY.half + 2.5, 4.4, 0.8))], { size: 0.5 }) });
  return F;
}
pulley("pulley1", SHAFT1.x);
// debt drum with cord wraps and a ratchet
{
  const F = alongY(SHAFT1.x, DRUM.y, AXLE_Z);
  disc("drum.flangeBack", F, -DRUM.half - 1.2, -DRUM.half, DRUM.flange);
  const wraps = [];
  for (let s = -DRUM.half + 1; s < DRUM.half; s += 1.4) wraps.push(G.arcOf(F, s, DRUM.r + 0.2, P, { trim: 0.4 }));
  disc("drum.core", F, -DRUM.half, DRUM.half, DRUM.r, { tone: "hi" }, { inner: Ln(wraps.join(""), { tone: "lo" }) });
  disc("drum.flangeFront", F, DRUM.half, DRUM.half + 1.2, DRUM.flange, { tone: "mid" }, { extra: `<g data-part="drum-mark"></g>` + Ln(G.circleOf(F, DRUM.half + 1.2, 6.5, P), { tone: "faint" }) });
}

// ---------- countershaft, income pulley, bevel box ----------
const F2 = alongY(CS.x, 0, AXLE_Z);
pillow("ped2", CS.x, CS.ped, AXLE_Z);
shaftSeg("shaft2", F2, [[BEVEL.y + BEVEL.d + 3, CS.ped - 6], [CS.ped + 6, PULLEY_Y - PULLEY.half], [PULLEY_Y + PULLEY.half + 2.5, CS.y1]], CS.r);
pulley("pulley2", CS.x);
box("bevel.box", [BEVEL.x, BEVEL.y, BEVEL.z0], [BEVEL.x + BEVEL.w, BEVEL.y + BEVEL.d, BEVEL.z1], {}, {
  r: 2, steps: 4, bevel: 0.6,
  inner: Ln(k.sideSeam({ x: BEVEL.x, y: BEVEL.y, w: BEVEL.w, d: BEVEL.d, r: 2 }, BEVEL.z1 - 6, P, 4), { tone: "faint" }),
  extra: Dots([[BEVEL.x + 4, BEVEL.y + 4], [BEVEL.x + BEVEL.w - 4, BEVEL.y + 4], [BEVEL.x + 4, BEVEL.y + BEVEL.d - 4], [BEVEL.x + BEVEL.w - 4, BEVEL.y + BEVEL.d - 4]].map(([x, y]) => at([x, y, BEVEL.z1])), { size: 0.5 }),
});
box("bevel.foot", [BEVEL.x - 4, BEVEL.y - 2, 0], [BEVEL.x + BEVEL.w, BEVEL.y + BEVEL.d + 2, 6], {}, { r: 1.5, steps: 4, extra: Dots([at([BEVEL.x - 1, BEVEL.y + 12, 6]), at([BEVEL.x - 1, BEVEL.y + 4, 6])], { size: 0.5 }) });
box("bevel.leg", [BEVEL.x + 6, BEVEL.y + 6, 6], [BEVEL.x + BEVEL.w - 6, BEVEL.y + BEVEL.d - 6, BEVEL.z0], {}, { r: 1 });
disc("bevel.boss", alongY(CS.x, 0, AXLE_Z), BEVEL.y + BEVEL.d, BEVEL.y + BEVEL.d + 3, 8.5, { tone: "mid" });

// ---------- governor (rebuilt live) and its rate lever ----------
cyl("gov.collar", GOV.x, GOV.y, 6, GOV.z0, GOV.z0 + 4, {}, { steps: 28 });
// the whole spinning governor is one live group; its recorded shape is the volume it sweeps
live("gov.live", "gov", PARTS.governorParts(D, G, REST_RATE, 0), [GOV.x, GOV.y, 140]);
// pivot post, quadrant plate with its scale and the 0% stop
cyl("lever.postFoot", LEVER.px, LEVER.post, 4.4, 0, 3, { tone: "mid" }, { steps: 28 });
cyl("lever.post", LEVER.px, LEVER.post, 3.2, 3, LEVER.pz + 4, { tone: "mid" }, { steps: 24 });
disc("lever.pin", alongY(LEVER.px, 0, LEVER.pz), LEVER.post + 3.2, LEVER.py - 1.6, 2, { tone: "mid" });
const QF = G.frameOf([0, QUAD.y, 0], Y, [1, 0, 0], [0, 0, 1]);
const rateAngle = (r) => {
  const zs = PARTS.sleeveZ(D, r) + 2.5;
  const lx = LEVER.left - LEVER.px, lz = zs - LEVER.pz;
  return Math.atan2(-lz, -lx);            // direction of the right arm
};
const quadTicks = [];
for (let i = 0; i <= 20; i++) {
  const th = rateAngle(i * 0.005);
  const r0 = LEVER.right + 2.4, r1 = LEVER.right + (i % 4 === 0 ? 6.2 : 4.4);
  quadTicks.push({ major: i % 4 === 0, d: path3([[LEVER.px + r0 * Math.cos(th), QUAD.y + 2.01, LEVER.pz + r0 * Math.sin(th)], [LEVER.px + r1 * Math.cos(th), QUAD.y + 2.01, LEVER.pz + r1 * Math.sin(th)]]) });
}
{
  const t0 = rateAngle(0), t1 = rateAngle(0.10);
  const arcPts = (rr) => Array.from({ length: 25 }, (_, i) => { const th = t0 + (t1 - t0) * (i / 24); return [LEVER.px + rr * Math.cos(th), QUAD.y + 2.01, LEVER.pz + rr * Math.sin(th)]; });
  const plate = [[QUAD.x0, QUAD.z0], [QUAD.x1, QUAD.z0], [QUAD.x1, QUAD.z1], [QUAD.x0, QUAD.z1]].map(([x, z]) => [x, z]);
  const PF = G.frameOf([0, QUAD.y, 0], Y, [1, 0, 0], [0, 0, 1]);
  const scale = Ln(path3(arcPts(LEVER.right + 2.4)), { tone: "lo" }) + Ln(quadTicks.filter((t) => !t.major).map((t) => t.d).join(""), { tone: "lo" }) + Ln(quadTicks.filter((t) => t.major).map((t) => t.d).join(""), { tone: "mid" });
  prism("quad.plate", PF, plate, 0, 2, { tone: "mid" }, { extra: scale + Dots([at([QUAD.x0 + 3, QUAD.y + 2, QUAD.z0 + 3]), at([QUAD.x0 + 3, QUAD.y + 2, QUAD.z1 - 3]), at([QUAD.x1 - 3, QUAD.y + 2, QUAD.z0 + 3]), at([QUAD.x1 - 3, QUAD.y + 2, QUAD.z1 - 3])], { size: 0.45 }) });
  box("quad.arm", [LEVER.px + 3.1, LEVER.post - 0.8, QUAD.z0 + 6], [QUAD.x0 + 2, QUAD.y, QUAD.z0 + 12], {}, { r: 0.6 });
  // the 0% stop: a block the lever rests on once rates reach zero
  const th = t0 + (t0 - t1) * 0.09, rs = LEVER.right + 1;
  const sx = LEVER.px + rs * Math.cos(th), sz = LEVER.pz + rs * Math.sin(th);
  box("quad.stop", [sx - 2.5, QUAD.y + 2, sz], [sx + 2.5, LEVER.py + 2, sz + 4.5], { tone: "hi" }, { r: 0.6, extra: Dots([at([sx, LEVER.py + 2, sz + 2.2])], { size: 0.45 }) });
}
live("lever.live", "lever", PARTS.leverParts(D, G, REST_RATE, false), [LEVER.px + 10, LEVER.py, LEVER.pz], { bias: 0.4 });

// ---------- round belt over both pulleys: spending is income ----------
{
  const pts = [];
  const arc = (cx, a0, a1, n) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push([cx + BELT_RAD * Math.cos(a), PULLEY_Y, AXLE_Z + BELT_RAD * Math.sin(a)]); } };
  arc(SHAFT1.x, Math.PI / 2, 1.5 * Math.PI, 24);
  arc(CS.x, -Math.PI / 2, Math.PI / 2, 24);
  tube("belt", pts, BELT_R, { tone: "hi", closed: true, maxLength: 16, touch: ["pulley1*", "pulley2*"] });
}

// ---------- gallows, cord and the debt weight ----------
cyl("gal.foot", GAL.post[0], GAL.post[1], 9, 0, 3, { tone: "mid" }, { steps: 32, extra: Dots([0, 1, 2, 3].map((i) => at([GAL.post[0] + 6.5 * Math.cos(i * 1.571 + 0.785), GAL.post[1] + 6.5 * Math.sin(i * 1.571 + 0.785), 3])), { size: 0.5 }) });
cyl("gal.post", GAL.post[0], GAL.post[1], GAL.postR, 3, GAL.top - 6, { tone: "mid" }, { steps: 28 });
box("gal.arm", [GAL.x - 4, GAL.post[1] - 4, GAL.top - 6], [GAL.x + 4, GAL.py + 9, GAL.top], {}, { r: 1, extra: Dots([at([GAL.x, GAL.post[1], GAL.top]), at([GAL.x, GAL.py + 5, GAL.top])], { size: 0.5 }) });
box("gal.cheek", [GAL.x - 4, GAL.py + 5, GAL.pz - 3], [GAL.x + 4, GAL.py + 8, GAL.top - 6], {}, { r: 0.6 });
disc("gal.axle", alongY(GAL.x, 0, GAL.pz), GAL.py + 3, GAL.py + 5, 2.4, { tone: "mid" });
disc("gal.nut", alongY(GAL.x, 0, GAL.pz), GAL.py + 8, GAL.py + 9.6, 3.2, { tone: "mid" }, { extra: Ln(G.circleOf(alongY(GAL.x, 0, GAL.pz), GAL.py + 9.6, 1.6, P), { tone: "lo" }) });
{
  const F = alongY(GAL.x, GAL.py, GAL.pz);
  disc("gal.sheaveBack", F, -3, -1.1, GAL.pr + 2.4, { tone: "mid" });
  disc("gal.sheaveCore", F, -1.1, 1.1, GAL.pr, { tone: "mid" });
  disc("gal.sheave", F, 1.1, 3, GAL.pr + 2.4, { tone: "mid" }, { extra: `<g data-part="sheave-spokes"></g>` + Ln(G.circleOf(F, 3, 3, P), { tone: "lo" }) });
}
// scale board behind the weight: the debt burden, read off the weight's pointer on a scale strip
{
  const plan = { x: BOARD.x, y: BOARD.y, w: BOARD.w, d: BOARD.d, r: 0.6 };
  const strip = { x: BOARD.x + BOARD.w - 9, y: BOARD.y + BOARD.d, w: 7.5, d: 0.6, r: 0.3 };
  const face = strip.y + strip.d + 0.02;
  const zOf = (b) => WEIGHT.zHi - ((b - 60) / 140) * (WEIGHT.zHi - WEIGHT.zLo) - 20;
  const ticks = [];
  for (let b = 60; b <= 200; b += 5) {
    const len = b % 50 === 0 ? strip.w : b % 10 === 0 ? 4.6 : 2.8;
    ticks.push({ major: b % 50 === 0, d: path3([[strip.x, face, zOf(b)], [strip.x + len, face, zOf(b)]]) });
  }
  const red = path3([[strip.x + strip.w - 1.2, face, zOf(150)], [strip.x + strip.w - 1.2, face, zOf(200)]]);
  const shape = record(A.slab(plan, BOARD.z0, BOARD.z1 - BOARD.z0, { name: "board" }, 2));
  put("board", [BOARD.x + BOARD.w / 2, BOARD.y + BOARD.d / 2, (BOARD.z0 + BOARD.z1) / 2], S(k.slabOf(plan, BOARD.z0, BOARD.z1 - BOARD.z0, P, 2, 0.3), { tone: "mid" }) +
    S(k.slabOf(strip, zOf(200) - 3, zOf(60) - zOf(200) + 6, P, 2), { tone: "lo", crease: "none" }) +
    Ln(ticks.filter((t) => !t.major).map((t) => t.d).join(""), { tone: "lo" }) + Ln(ticks.filter((t) => t.major).map((t) => t.d).join(""), { tone: "mid" }) + Ln(red, { tone: "red" }) +
    Dots([[BOARD.x + 4, BOARD.z0 + 5], [BOARD.x + 4, BOARD.z1 - 5]].map(([x, z]) => at([x, BOARD.y + BOARD.d, z])), { size: 0.5 }), [shape]);
  box("board.bracketLo", [GAL.post[0] - 3, GAL.post[1] + GAL.postR, 40], [GAL.post[0] + 3, BOARD.y, 46], {}, { r: 0.4 });
  box("board.bracketHi", [GAL.post[0] - 3, GAL.post[1] + GAL.postR, 160], [GAL.post[0] + 3, BOARD.y, 166], {}, { r: 0.4 });
}
// cord: drum to sheave (fixed), sheave down to the weight (live, clipped at the hook)
{
  const c1 = [SHAFT1.x, AXLE_Z], r1 = DRUM.r, c2 = [GAL.x, GAL.pz], r2 = GAL.pr + 0.7;
  const dx = c2[0] - c1[0], dz = c2[1] - c1[1], dist = Math.hypot(dx, dz);
  const ux = dx / dist, uz = dz / dist;
  const sinB = (r1 - r2) / dist, cosB = Math.sqrt(1 - sinB * sinB);
  // the normal on the upper side of the line from the drum to the sheave
  const nx = -uz * cosB + ux * sinB * -1, nz = ux * cosB + uz * sinB * -1;
  const p1 = [c1[0] + r1 * nx, DRUM.y, c1[1] + r1 * nz];
  const p2 = [c2[0] + r2 * nx, GAL.py, c2[1] + r2 * nz];
  const a0 = Math.atan2(nz, nx), a1 = Math.PI;
  const wrap = Array.from({ length: 13 }, (_, i) => { const a = a0 + (a1 - a0) * (i / 12); return [c2[0] + r2 * Math.cos(a), GAL.py, c2[1] + r2 * Math.sin(a)]; });
  tube("cord", [p1, p2, ...wrap.slice(1)], 0.7, { tone: "hi", maxLength: 12, ends: [false, false], caps: [false, false], limp: false, touch: ["drum.core", "gal.sheave*", "cord.drop"], tips: [false, false] });
}
put("cord.drop", [WEIGHT.x, WEIGHT.y, 120], `<g data-part="drop">${(() => { const a = at([WEIGHT.x, WEIGHT.y, GAL.pz]), b = at([WEIGHT.x, WEIGHT.y, WEIGHT.zHi + 9]); return `<path class="em-cord" style="stroke-width:${(1.4 * KS).toFixed(2)}" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}"/><path class="em-cord-core" style="stroke-width:${(1.4 * KS - 1.2).toFixed(2)}" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}"/>`; })()}</g>`, [record(A.tube([[WEIGHT.x, WEIGHT.y, GAL.pz], [WEIGHT.x, WEIGHT.y, WEIGHT.zHi + 9]], 0.7, { name: "cord.drop" }))], { bias: 0.1 });
// the weight: hook, hanger, three slotted masses and a pointer to the board
function weightShapes(z) {
  const x = WEIGHT.x, y = WEIGHT.y;
  const own = { owner: "weight" };
  const list = [A.disc(alongZ(x, y, z), -39, 9, 1.4, { name: "weight.hanger", ...own }), A.cylinder(x, y, 5, z - 12, 2.4, { name: "weight.top", ...own })];
  for (let i = 0; i < 3; i++) list.push(A.cylinder(x, y, WEIGHT.r, z - 12 - 9 * (i + 1), 9, { name: `weight.mass${i}`, ...own }));
  list.push(A.slab({ x: x - 2, y: BOARD.y + BOARD.d + 0.8, w: 4, d: y - WEIGHT.r - BOARD.y - BOARD.d - 0.8 + 0.3, r: 0.5 }, z - 21, 2, { name: "weight.arm", ...own }, 2));
  list.push(A.slab({ x: x - 2, y: BOARD.y + BOARD.d + 0.8, w: BOARD.x + BOARD.w - x + 2, d: 2.4, r: 0.5 }, z - 21, 2, { name: "weight.pointer", ...own }, 2));
  return list.map((shape) => record(shape));
}
function weightSvg() {
  const x = WEIGHT.x, y = WEIGHT.y;
  const parts = [];
  const Fh = alongZ(x, y, 0);
  parts.push(S(G.disc(-9.6, 9, 1.4, Fh, P), { tone: "hi", lit: true }));
  for (let i = 2; i >= 0; i--) {
    const z0 = -12 - 9 * (i + 1), z1 = -12 - 9 * i;
    parts.push(S(k.cylinder(x, y, WEIGHT.r, z0, z1 - z0, P, 40, 0.6), { tone: "hi", lit: true }) + Ln(k.planOutline({ x: x - 1.3, y: y, w: 2.6, d: WEIGHT.r, r: 1.2 }, z1, P, 3), { tone: "lo" }));
  }
  parts.push(S(k.cylinder(x, y, 5, -12, 2.4, P, 28), { tone: "hi", lit: true }));
  parts.push(S(k.slabOf({ x: x - 2, y: BOARD.y + BOARD.d + 0.8, w: 4, d: y - WEIGHT.r - BOARD.y - BOARD.d - 0.5, r: 0.5 }, -21, 2, P, 2), { tone: "hi", lit: true }));
  parts.push(S(k.slabOf({ x: x - 2, y: BOARD.y + BOARD.d + 0.8, w: BOARD.x + BOARD.w - x + 2, d: 2.4, r: 0.5 }, -21, 2, P, 2), { tone: "hi", lit: true }));
  return parts.join("");
}
put("weight", [WEIGHT.x, WEIGHT.y, WEIGHT.zHi - 30], `<g data-part="weight" transform="${k.translateAlong(P, [0, 0, WEIGHT.zHi])}">${weightSvg()}</g>`,
  weightShapes(WEIGHT.zHi), { bias: 0.2 });

// ---------- austerity brake and the printing-press motor ----------
box("brake.post", [BRAKE.x, BRAKE.y, 4], [BRAKE.x + 8, BRAKE.y + 12, AXLE_Z - 6], {}, { r: 1, extra: Dots([at([BRAKE.x + 4, BRAKE.y + 6, AXLE_Z - 6])], { size: 0.5 }) });
box("brake.foot", [BRAKE.x - 4, BRAKE.y - 4, 0], [BRAKE.x + 12, BRAKE.y + 16, 4], {}, { r: 1.5, extra: Dots([at([BRAKE.x - 1, BRAKE.y + 6, 4]), at([BRAKE.x + 9, BRAKE.y + 6, 4])], { size: 0.5 }) });
put("brake.shoe", [FW.x - FW.R - 6, FW.y, AXLE_Z], `<g data-part="shoe">${S(k.slabOf({ x: BRAKE.x + 8, y: BRAKE.y + 2, w: 10, d: 8, r: 0.8 }, AXLE_Z - 6, 12, P, 2, 0.4), { tone: "mid" })}${S(k.slabOf({ x: BRAKE.x + 18, y: BRAKE.y + 1, w: 3, d: 10, r: 0.6 }, AXLE_Z - 9, 18, P, 2), { tone: "lo" })}</g>`,
  [record(A.slab({ x: BRAKE.x + 8, y: BRAKE.y + 1, w: 13, d: 10, r: 0.6 }, AXLE_Z - 9, 18, { name: "brake.shoe" }, 2))], { bias: 0.1 });
const wheelAt = (gap) => [FW.x + (FW.R + 9 + gap) * Math.cos(MA), AXLE_Z + (FW.R + 9 + gap) * Math.sin(MA)];
{
  const [mx, mz] = wheelAt(3);
  box("motor.bracket", [mx - 12, MOTOR.y0 - 4, 0], [mx + 12, MOTOR.y0 + 12, mz - MOTOR.r], {}, { r: 1.5, steps: 4, extra: Dots([at([mx - 8, MOTOR.y0 + 4, mz - MOTOR.r]), at([mx + 8, MOTOR.y0 + 4, mz - MOTOR.r])], { size: 0.5 }) });
  live("motor.live", "motor", PARTS.motorParts(D, G, 3), [mx, (MOTOR.y0 + MOTOR.y1) / 2, mz], { bias: 0.1 });
}

// ---------- productivity: a lead screw that walks the capacity mark ----------
box("screw.endL", [SCREW.x0 - 6, SCREW.y - 6, 0], [SCREW.x0, SCREW.y + 6, SCREW.z + 6], {}, { r: 1, extra: Dots([at([SCREW.x0 - 3, SCREW.y - 3, SCREW.z + 6]), at([SCREW.x0 - 3, SCREW.y + 3, SCREW.z + 6])], { size: 0.45 }) });
box("screw.endR", [SCREW.x1, SCREW.y - 6, 0], [SCREW.x1 + 6, SCREW.y + 6, SCREW.z + 6], {}, { r: 1, extra: Dots([at([SCREW.x1 + 3, SCREW.y - 3, SCREW.z + 6]), at([SCREW.x1 + 3, SCREW.y + 3, SCREW.z + 6])], { size: 0.45 }) });
{
  const F = alongX(0, SCREW.y, SCREW.z);
  disc("screw.rod", F, SCREW.x0, SCREW.x1, SCREW.r, { tone: "mid" }, { extra: `<g data-part="thread"></g>` });
  disc("screw.crankHub", F, SCREW.x0 - 10, SCREW.x0 - 6, 4.5, { tone: "mid" });
  disc("screw.crank", F, SCREW.x0 - 14, SCREW.x0 - 10, 6, { tone: "mid" }, { extra: Ln(G.ribsOf(F, SCREW.x0 - 14, SCREW.x0 - 10, 6, 28, P), { tone: "lo" }) });
}
const CARR_X = SCREW.x0 + 10;
{
  const top = SCREW.z + SCREW.r;
  const body = { x: CARR_X - 8, y: SCREW.y - 7, w: 16, d: 14, r: 1.2 };
  const blade = { x: CARR_X - 1.5, y: SCREW.y + 7, w: 3, d: 6, r: 0.5 };
  const cheeks = [-1, 1].map((side) => ({ x: CARR_X - 6, y: SCREW.y + side * (SCREW.r + 0.8) - (side < 0 ? 2 : 0), w: 12, d: 2, r: 0.4 }));
  // the carriage straddles the screw: its back cheek is drawn behind the rod, the rest in front
  const cheek = (c) => S(k.slabOf(c, SCREW.z - 3, top - SCREW.z + 3, P, 2), { tone: "hi" });
  const own = { owner: "carriage" };
  put("carriage.back", [CARR_X, cheeks[0].y + 1, SCREW.z], `<g data-part="carriage-back">${cheek(cheeks[0])}</g>`, [record(A.slab(cheeks[0], SCREW.z - 3, top - SCREW.z + 3, { name: "carriage.cheek0", ...own }, 2))]);
  const svgC = cheek(cheeks[1]) + S(k.slabOf(body, top, 9, P, 3, 0.5), { tone: "hi" }) + S(k.slabOf(blade, top + 1, 1.4, P, 2), { tone: "hi" }) +
    Dots([at([CARR_X - 5, SCREW.y - 4, top + 9]), at([CARR_X + 5, SCREW.y - 4, top + 9])], { size: 0.45 });
  put("carriage", [CARR_X, SCREW.y + 2, top + 4], `<g data-part="carriage">${svgC}</g>`,
    [record(A.slab(body, top, 9, { name: "carriage", ...own }, 3)), record(A.slab(blade, top + 1, 1.4, { name: "carriage.blade", ...own }, 2)), record(A.slab(cheeks[1], SCREW.z - 3, top - SCREW.z + 3, { name: "carriage.cheek1", ...own }, 2))], { bias: 0.3 });
}

// ---------- the policy desk: two dials and four levers ----------
{
  const plan = { x: CONSOLE.x, y: CONSOLE.y, w: CONSOLE.w, d: CONSOLE.d, r: CONSOLE.r };
  const slots = LEVERS_X.map((x) => Ln(k.planOutline({ x: x - 2.2, y: CONSOLE.y + 8, w: 4.4, d: 26, r: 2 }, CONSOLE.h, P, 3), { tone: "lo" })).join("");
  const screws = Dots(k.corners(plan, 5).map(([x, y]) => at([x, y, CONSOLE.h])), { size: 0.5 });
  box("desk", [plan.x, plan.y, 0], [plan.x + plan.w, plan.y + plan.d, CONSOLE.h], {}, { r: CONSOLE.r, steps: 6, bevel: 0.8, inner: Ln(k.sideSeam(plan, 6, P, 6), { tone: "faint" }), extra: slots + screws + Ln(k.planOutline(k.insetPlan(plan, 3), CONSOLE.h, P, 6), { tone: "faint" }) });
  DIALS.forEach(([x, y], i) => {
    const top = DIAL_Z + DIAL_H;
    const t = k.radialTicks(x, y, DIAL_R - 3, 40, 5, top, [1.3, 2.8], P, -2.36, 4.71);
    const zone = i === 1 ? Ln(k.onTop(Array.from({ length: 13 }, (_, j) => { const a = -2.36 + 4.71 * ((150 - 60) / 140 + (1 - (150 - 60) / 140) * j / 12); return [x + Math.sin(a) * (DIAL_R - 2.2), y - Math.cos(a) * (DIAL_R - 2.2)]; }), top, P), { tone: "red" }) : "";
    cyl(`dial${i}`, x, y, DIAL_R, DIAL_Z, top, { tone: "hi", crease: "lo" }, { steps: 64, bevel: 0.8, extra:
      Ln(k.knurl(x, y, DIAL_R, top - 3, top, 72, P, 0.3), { tone: "lo" }) + Ln(k.ring(x, y, DIAL_R - 2.2, top, P, 64), { tone: "lo" }) + Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }) + zone + Ln(k.ring(x, y, 1.5, top, P, 16), { tone: "mid" }) + `<path class="iso-line" data-tone="hi" data-free="start" data-part="needle${i}" style="stroke-width:1.1" d=""/>` });
  });
  LEVERS_X.forEach((x, i) => {
    disc(`lever${i}.pivot`, alongX(0, CONSOLE.y + 21, CONSOLE.h + 3), x - 3.4, x + 3.4, 3, { tone: "mid" });
    live(`lever${i}`, `pull${i}`, PARTS.pullParts(D, G, i, 0), [x, CONSOLE.y + 21, CONSOLE.h + 14], { bias: 0.2 });
  });
}

// ---------- order, page ----------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((item) => `<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);

const LABEL_TEXT = "A bench engine that works like the economy. A heavy flywheel is total spending. A round belt carries it to a second pulley, because one person's spending is another person's income. That shaft spins a flyball governor, the central bank: as spending runs hot the balls fly out and swing the rate lever up its quadrant, and when spending falls they drop until the lever rests on the 0% stop. On the front of the flywheel shaft a drum pays out cord over a sheave on a tall gallows: the hanging weight is debt, and how far it has dropped against the scale board is the debt burden. A lead screw walks the capacity mark along the front ruler: productivity. A desk carries two dials, spending against capacity and the debt burden, and four policy levers that brake the flywheel, cut debt, share income and start a motor that pushes the flywheel.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: [...back, `<g class="em-parts">${groups.join("")}</g>`] });

const latheSource = readFileSync(join(SKILL, "kit", "lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, sphereOf, prismOf, circleOf, spokesOf, ribsOf, arcOf, dot3, add3, sub3, mul3, unit3, cross3, len3, toneOf, radialOf };})();\n`;
const modelScript = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "") + readFileSync(join(HERE, "parts.mjs"), "utf8").replace(/^export /gm, "").replace(/^const clamp01 .*$/m, "");
const DATA = { CARR_X, P, V, W, H, AXLE_Z, FW, SHAFT1, PULLEY, PULLEY_Y, DRUM, CS, GOV, LEVER, GAL, WEIGHT, BOARD, CONSOLE, DIALS, DIAL_R, DIAL_Z, DIAL_H, LEVERS_X, LEVER_LEN, SCREW, BRAKE, MOTOR, MA };
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const CSS = readFileSync(join(HERE, "machine.css"), "utf8");

const body = k.plateHtml({
  fig: "Fig 1",
  title: "The economic machine",
  hint: "drag the rate knob · 1–4 levers · space",
  readout: "year 0 · expansion",
  keys: [
    { mark: "lit", label: "Debt: the weight the drum lets down. Its drop on the board is the debt burden" },
    { mark: "raised", label: "Spending: the flywheel. Income: the second pulley on the belt" },
    { mark: "edge", label: "Central bank: the governor and the rate lever, with its 0% stop" },
    { mark: "red", label: "Red zone: a debt burden over 150% of income" },
  ],
  caption: "After Ray Dalio's How The Economic Machine Works. Short debt cycles of about 6½ years ride on a long debt cycle that peaks after about 50 years, on top of 2% productivity growth. In each expansion the flywheel outruns capacity, the governor's balls fly out and the rate rises; in each recession they fall back. Each cycle lets the weight down a little further. At the long-term peak the lever is already on its 0% stop and the governor can do nothing more: the deleveraging. The tour then pulls the four levers in balance. Pull them yourself: the brake alone (austerity) makes the burden rise, the motor alone (printing) brings inflation, and a balanced mix gives a beautiful deleveraging.",
  body: `<div class="iso-stage em-stage" tabindex="0" role="group" aria-label="The economic machine. Drag the rate knob up or down, or use the up and down arrows, to set the interest rate by hand. Escape gives the rate back to the governor. Keys 1 to 4 pull the four policy levers. Space pauses or restarts the tour.">${svg}<span class="em-sr" role="status" aria-live="polite" data-status></span></div>
<div class="em-controls" role="group" aria-label="Policy levers">
  <button type="button" data-lever="0" aria-pressed="false"><b>1</b> Cut spending</button>
  <button type="button" data-lever="1" aria-pressed="false"><b>2</b> Reduce debt</button>
  <button type="button" data-lever="2" aria-pressed="false"><b>3</b> Redistribute</button>
  <button type="button" data-lever="3" aria-pressed="false"><b>4</b> Print money</button>
  <button type="button" data-tour aria-pressed="true">Tour</button>
</div>
<div class="em-stats" aria-hidden="true"><span data-stat="year"></span><span data-stat="rate"></span><span data-stat="gap"></span><span data-stat="burden"></span><span data-stat="growth"></span></div>`,
});

const out = process.argv.includes("--artifact")
  ? `<title>Debt Cycle Engine</title><style>${k.ISO_CSS}${CSS}</style><div class="iso em-page" data-theme="${THEME}">${body}</div><script type="module">${(kitScript() + latheScript + modelScript + LIVE).replace(/<\/(script)/gi, "<\\/$1")}</script>`
  : k.pageHtml({ title: "The economic machine", theme: THEME, body: `<style>${CSS}</style>${body}`, script: kitScript() + latheScript + modelScript + LIVE, width: 860 });
const name = process.argv.includes("--artifact") ? "economic-machine.html" : THEME === "light" ? "machine-light.html" : "machine.html";
writeFileSync(join(HERE, name), out);
console.log("wrote", name, `${(out.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);
// the cord rides in the sheave's groove, so where they overlap on screen neither is simply in front
A.auditOrExit(R, P, { allow: [["cord*", "gal.sheave*"]] });
