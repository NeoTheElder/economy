import { M, initial, step, phaseOf, BALANCED } from "./model.mjs";
const mode = process.argv[2] || "tour";
const pick = { tour: BALANCED, none: [0,0,0,0], cut: [1,0,0,0], print: [0,0,0,1], restr: [0,1,0,0] }[mode];
let s = initial(); const dt = 1/60; const out = [];
for (let i = 0; i < 90 * 60; i++) {
  s.levers = s.era === "delever" && s.age > 0.8 ? pick : [0,0,0,0];
  s = step(s, dt);
  if (i % 60 === 0) out.push(`${s.t.toFixed(0)}${s.era[0]}:${(s.gap*100).toFixed(0)}/${(s.r*100).toFixed(1)}/${(s.burden*100).toFixed(0)}`);
}
console.log(mode, out.join(" ")); console.log("final phase", phaseOf(s));
