import { initial, step, phaseOf } from "./model.mjs";
let s = initial(); const dt = 0.02; const rows = [];
for (let i = 0; i < 100 / dt; i++) {
  s = step(s, dt);
  if (i % 50 === 0) rows.push(`${s.t.toFixed(0).padStart(3)} gap ${(s.gap*100).toFixed(1).padStart(6)}% r ${(s.r*100).toFixed(1).padStart(5)}% burden ${(s.burden*100).toFixed(0).padStart(4)}% app ${s.appetite.toFixed(3)} B ${s.B.toFixed(3)} DS ${s.DS.toFixed(3)} ${phaseOf(s)}`);
}
console.log(rows.join("\n"));
