// Moving parts, described once. The build draws them at rest and records their true shapes;
// the page redraws them every frame from the same descriptions.
// An item is { kind: "disc" | "cyl" | "ball", ..., tone, key, lines? } in world units.

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function governorAngle(D, rate) {
  const g = D.GOV;
  return ((g.aMin + (g.aMax - g.aMin) * clamp01(rate / 0.10)) * Math.PI) / 180;
}
// The links are longer than half an arm, so the sleeve (and the lever on it) runs below the balls' sweep.
export function sleeveZ(D, rate) {
  const g = D.GOV, a = governorAngle(D, rate);
  const reach = (g.arm / 2) * Math.sin(a) - 4.6;
  return g.pivot - (g.arm / 2) * Math.cos(a) - Math.sqrt(g.link * g.link - reach * reach) - 2.5;
}

// The flyball governor: spindle, two arms, two balls, two links and the sleeve they lift.
export function governorParts(D, G, rate, theta) {
  const g = D.GOV;
  const a = governorAngle(D, rate);
  const zs = sleeveZ(D, rate);
  const top = [g.x, g.y, g.pivot];
  const out = [];
  const key = (p) => G.dot3(p, D.V);
  out.push({ name: "gov.spindle", kind: "cyl", x: g.x, y: g.y, r: 2.4, z0: g.z0 + 4, z1: g.pivot - 1.5, tone: "mid", key: -1e6, owner: "gov" });
  for (const side of [0, 1]) {
    const phi = theta + side * Math.PI;
    const dir = [Math.cos(phi), Math.sin(phi)];
    const bc = [g.x + dir[0] * g.arm * Math.sin(a), g.y + dir[1] * g.arm * Math.sin(a), g.pivot - g.arm * Math.cos(a)];
    const armDir = G.unit3(G.sub3(bc, top));
    const mid = G.add3(top, G.mul3(armDir, g.arm / 2));
    const foot = [g.x + dir[0] * 4.6, g.y + dir[1] * 4.6, zs + 2.5];
    const link = G.sub3(mid, foot);
    const linkLen = G.len3(link);
    const linkDir = G.unit3(link);
    // the arm leaves the pivot cap's rim and ends on the ball's skin
    out.push({ name: `gov.arm${side}`, kind: "disc", F: G.frameAlong(top, armDir), s0: 4.4, s1: g.arm - Math.sqrt(g.ball * g.ball - 1.25 * 1.25), r: 1.25, tone: "mid", key: key(mid), owner: "gov" });
    out.push({ name: `gov.link${side}`, kind: "disc", F: G.frameAlong(foot, linkDir), s0: 0, s1: linkLen - 1.25, r: 0.9, tone: "mid", key: key(G.add3(foot, G.mul3(linkDir, linkLen / 2))) - 0.2, owner: "gov" });
    out.push({ name: `gov.ball${side}`, kind: "ball", c: bc, r: g.ball, tone: "hi", key: key(bc) + 0.5, owner: "gov" });
  }
  out.push({ name: "gov.sleeve", kind: "cyl", x: g.x, y: g.y, r: 4.6, z0: zs, z1: zs + 5, tone: "mid", key: key([g.x, g.y, zs]) - 1, seam: zs + 2.5, owner: "gov" });
  out.push({ name: "lever.fork", kind: "disc", F: G.frameOf([D.LEVER.left, 0, zs + 2.5], [0, 1, 0], [1, 0, 0], [0, 0, 1]), s0: D.LEVER.py - 3, s1: D.LEVER.py + 3, r: 2.2, tone: "mid", key: key([D.LEVER.left, D.LEVER.py, zs]) - 0.5, owner: "gov" });
  out.push({ name: "gov.cap", kind: "cyl", x: g.x, y: g.y, r: 4.4, z0: g.pivot - 1.5, z1: g.pivot + 2.5, tone: "mid", key: key(top) + 1.5, owner: "gov" });
  out.push({ name: "gov.finial", kind: "ball", c: [g.x, g.y, g.pivot + 2.5 + 3.2], r: 3.4, tone: "mid", key: key(top) + 2, owner: "gov" });
  return out.sort((p, q) => p.key - q.key);
}

// The rate lever: a fork on the sleeve, a round bar through the pivot, a knurled knob on the far end.
export function leverParts(D, G, rate, held) {
  const L = D.LEVER;
  const zs = sleeveZ(D, rate) + 2.5;
  const pivot = [L.px, L.py, L.pz];
  const lx = L.left - L.px, lz = zs - L.pz;
  const leftLen = Math.hypot(lx, lz);
  const dir = [-lx / leftLen, 0, -lz / leftLen];
  const end = G.add3(pivot, G.mul3(dir, L.right));
  const Y = [0, 1, 0], X = [1, 0, 0], Z = [0, 0, 1];
  const knobF = G.frameOf([end[0], 0, end[2]], Y, X, Z);
  return [
    { name: "lever.bar", kind: "disc", F: G.frameAlong(pivot, dir), s0: -leftLen + 2.2, s1: L.right, r: 1.6, tone: "mid" },
    { name: "lever.hub", kind: "disc", F: G.frameOf([L.px, 0, L.pz], Y, X, Z), s0: L.py + 1.6, s1: L.py + 3.4, r: 3, tone: "mid" },
    { name: "lever.knob", kind: "disc", F: knobF, s0: L.py + 1.6, s1: L.py + 8, r: 4.4, tone: held ? "hi" : "mid", ribs: 26 },
  ];
}
export function knobPoint(D, G, rate) {
  const L = D.LEVER;
  const zs = sleeveZ(D, rate) + 2.5;
  const lx = L.left - L.px, lz = zs - L.pz, len = Math.hypot(lx, lz);
  return [L.px - (lx / len) * L.right, L.py + 5, L.pz - (lz / len) * L.right];
}

// The printing-press motor: can, end bell, shaft and the friction wheel that meets the flywheel rim.
export function motorParts(D, G, gap) {
  const mx = D.FW.x + (D.FW.R + 9 + gap) * Math.cos(D.MA), mz = D.AXLE_Z + (D.FW.R + 9 + gap) * Math.sin(D.MA);
  const F = G.frameOf([mx, 0, mz], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const m = D.MOTOR;
  return [
    { name: "motor.can", kind: "disc", F, s0: m.y0, s1: m.y1, r: m.r, tone: "mid", seams: [m.y0 + 7, m.y1 - 4] },
    { name: "motor.bell", kind: "disc", F, s0: m.y1, s1: m.y1 + 1.6, r: m.r - 2, tone: "mid" },
    { name: "motor.shaft", kind: "disc", F, s0: m.y1 + 1.6, s1: -10, r: 2, tone: "mid" },
    { name: "motor.wheel", kind: "disc", F, s0: -10, s1: -2.4, r: 9, tone: "hi", spokes: true },
  ];
}

// A policy lever on the desk: a round bar from its pivot and a ball grip, tilted toward you when pulled.
export function pullParts(D, G, i, value) {
  const x = D.LEVERS_X[i], y = D.CONSOLE.y + 21, z = D.CONSOLE.h + 3;
  const a = ((-24 + 48 * value) * Math.PI) / 180;
  const dir = [0, Math.sin(a), Math.cos(a)];
  const tip = G.add3([x, y, z], G.mul3(dir, D.LEVER_LEN));
  const tone = value > 0.5 ? "hi" : "mid";
  return [
    { name: `lever${i}.bar`, kind: "disc", F: G.frameAlong([x, y, z], dir), s0: 3, s1: D.LEVER_LEN - Math.sqrt(3.2 * 3.2 - 1.3 * 1.3), r: 1.3, tone },
    { name: `lever${i}.grip`, kind: "ball", c: tip, r: 3.2, tone },
  ];
}

// Draw a list of items with the kit: K carries solidSvg, cylinder, lineSvg, sideArc.
export function partsSvg(items, G, P, K, angle = 0) {
  return items.map((it) => {
    if (it.kind === "ball") return K.solidSvg(G.sphereOf(it.c, it.r, P, { steps: 32 }), { tone: it.tone });
    if (it.kind === "cyl") {
      const inner = it.seam ? K.lineSvg(K.sideArc(it.x, it.y, it.r, it.seam, P, 20), { tone: "faint" }) : "";
      return K.solidSvg(K.cylinder(it.x, it.y, it.r, it.z0, it.z1 - it.z0, P, 24), { tone: it.tone, inner });
    }
    const inner = (it.seams || []).map((s) => K.lineSvg(G.arcOf(it.F, s, it.r, P), { tone: "faint" })).join("");
    let extra = "";
    if (it.ribs) extra += K.lineSvg(G.ribsOf(it.F, it.s0, it.s1, it.r, it.ribs, P), { tone: "lo" });
    if (it.spokes) extra += K.lineSvg(G.circleOf(it.F, it.s1, 2.6, P, 24) + G.spokesOf(it.F, it.s1, 2.6, it.r - 0.3, 4, P, { phase: angle }), { tone: "lo" });
    return K.solidSvg(G.disc(it.s0, it.s1, it.r, it.F, P), { tone: it.tone, inner }) + extra;
  }).join("");
}

// The flywheel's web face: six lightening holes, six ribs and a timing mark, turned by `angle`.
export function faceSvg(D, G, P, K, angle) {
  const Y = [0, 1, 0], X = [1, 0, 0], Z = [0, 0, 1];
  const F = G.frameOf([D.FW.x, D.FW.y, D.AXLE_Z], Y, X, Z);
  const s = D.FW.web + 0.05;
  const holes = [], ribs = [];
  for (let i = 0; i < 6; i++) {
    const c = G.pointOf(F, s, 31, angle + (i * Math.PI) / 3);
    holes.push(G.circleOf(G.frameOf(c, Y, X, Z), 0, 7.2, P, 40));
    ribs.push(G.spokesOf(F, s, D.FW.hub + 0.2, D.FW.rIn - 0.2, 1, P, { phase: angle + (i * Math.PI) / 3 + Math.PI / 6 }));
  }
  const mark = G.spokesOf(F, s, D.FW.rIn - 7, D.FW.rIn - 0.2, 1, P, { phase: angle });
  return `<path class="em-hole" d="${holes.join("")}"/>` + K.lineSvg(ribs.join(""), { tone: "faint" }) + K.lineSvg(mark, { tone: "hi" });
}
