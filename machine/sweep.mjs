import { M, initial, step } from "./model.mjs";
export function run(over, years = 100) {
  const base = { ...M }; Object.assign(M, over);
  let s = initial(); const dt = 0.02, gaps = [], bs = [], rs = [];
  for (let i = 0; i < years / dt; i++) { s = step(s, dt); gaps.push(s.gap); bs.push(s.burden); rs.push(s.r); }
  Object.assign(M, base);
  const peaks = []; for (let i = 1; i < gaps.length - 1; i++) if (gaps[i] > gaps[i-1] && gaps[i] >= gaps[i+1] && gaps[i] > 0.004) peaks.push(+(i*dt).toFixed(1));
  const zero = rs.findIndex((r, i) => i > 250 && r === 0) * dt;
  return { peaks: peaks.slice(0, 14).join(","), maxB: Math.max(...bs).toFixed(2), atB: (bs.indexOf(Math.max(...bs))*dt).toFixed(0), zeroAt: zero.toFixed(0), amp: (Math.max(...gaps.slice(400,2500))-Math.min(...gaps.slice(400,2500))).toFixed(3) };
}
if (process.argv[2] === "sweep") {
  for (const moodGain of [6, 9, 12]) for (const gain of [1.5, 2.5]) for (const lag of [0.8, 1.3])
    console.log(JSON.stringify({ moodGain, gain, lag }), JSON.stringify(run({ moodGain, gain, lagRate: lag, lagInflation: lag })));
}
