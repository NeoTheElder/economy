// The economic machine, after Ray Dalio's "How The Economic Machine Works" (2013).
// One unit of time is one year. Every dial, needle and readout in the figure reads this state.
//
// Leveraging (Dalio's template): short debt cycles of about 6.5 years ride on a long debt cycle
// whose debt burden climbs for decades, on top of 2% productivity growth.
//   spending gap   = short wave + slow boom + the reader's own push on the rate knob and levers
//   rate           = neutral (lower each cycle) + 1.6 · inflation, lagged, floored at 0%
//   debt burden    = climbs each expansion a little more than it falls in each recession
// Deleveraging (causal, after the long-term peak): rates sit at 0% and the four ways set the path.
//   debt growth    = interest 2% − repayment 6% − 6% · cuts − 10% · write-offs
//   income growth  = 2% − 4% − 9% · cuts − 4% · write-offs − 0.5% · sharing + 13% · printing
//   burden growth  = debt growth − income growth
// Cutting spending lowers incomes faster than it lowers debt, so on its own it makes the burden worse.

export const M = {
  growth: 0.02,       // productivity growth
  wave: 6.5,          // years per short-term debt cycle
  peakAt: 52,         // year of the long-term debt peak
  start: 0.95,        // debt burden (debt ÷ income) at the start of the loop
  peak: 1.62,         // burden at the long-term peak
  done: 1.02,         // burden at which lenders trust borrowers again
  reflate: 8,         // years of reflation before the loop starts again
  interest: 0.02,     // rate still paid on old debt in a deleveraging (Dalio's example)
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (x, target, dt, tau) => x + (target - x) * Math.min(1, dt / tau);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function initial() {
  return { t: 0, era: "lever", age: 0, gap: 0, infl: 0, r: 0.055, burden: M.start, debtGrowth: 0, incomeGrowth: M.growth, tension: 0, levers: [0, 0, 0, 0], user: null, spin: 0 };
}

// Pure effect of the four levers: [cut spending, reduce debt, redistribute, print money], each 0..1.
export function leversOf([cut, restructure, share, print]) {
  return {
    debt: M.interest - 0.06 - 0.06 * cut - 0.10 * restructure,
    income: M.growth - 0.04 - 0.09 * cut - 0.04 * restructure - 0.005 * share + 0.13 * print,
    push: -0.09 * cut - 0.04 * restructure - 0.005 * share + 0.13 * print,
  };
}

// Template wave of the leveraging years: the short cycle, growing a little as the boom builds.
function waveAt(t) {
  const phase = (2 * Math.PI * t) / M.wave;
  const build = 0.045 + 0.03 * (t / M.peakAt);
  return build * Math.sin(phase) + 0.012 * Math.sin(2 * phase + 0.6);
}

export function step(state, dt) {
  const s = { ...state, levers: [...state.levers] };
  s.t += dt; s.age += dt;
  const L = leversOf(s.levers);
  if (s.era === "lever") {
    const t = s.t;
    const boom = 0.02 * smooth(10, M.peakAt, t);
    const turn = -0.16 * smooth(M.peakAt - 2.2, M.peakAt + 0.6, t);   // repayments outgrow incomes
    const own = s.user === null ? 0 : -2.2 * (s.user - s.r);         // the reader's hand on the rate knob
    const want = waveAt(t) * (1 - smooth(M.peakAt - 3, M.peakAt, t)) + boom + turn + own + 0.6 * L.push;
    s.gap = ease(s.gap, want, dt, 0.35);
    s.infl = ease(s.infl, Math.max(-0.03, s.gap * 0.7), dt, 1.2);
    const neutral = 0.06 - 0.045 * smooth(0, M.peakAt, t);           // each cycle's peak rate is lower
    const auto = Math.max(0, neutral + 1.6 * s.infl) * (1 - smooth(M.peakAt - 1.5, M.peakAt + 0.5, t));
    s.r = ease(s.r, clamp(s.user ?? auto, 0, 0.10), dt, s.user === null ? 1.0 : 0.3);
    const climb = (M.peak - M.start) / M.peakAt;                      // debt outgrows income for decades
    s.incomeGrowth = M.growth + s.gap * 0.6;
    s.debtGrowth = s.incomeGrowth + (climb + s.gap * 0.18 * s.burden) / s.burden;
    s.burden = clamp(s.burden + (climb + s.gap * 0.18 * s.burden) * dt - (0.1 * s.levers[1] + 0.02 * s.levers[0]) * s.burden * dt, 0.6, 2.4);
    if (t >= M.peakAt + 0.6) { s.era = "delever"; s.age = 0; }
  } else if (s.era === "delever") {
    s.r = ease(s.r, 0, dt, 0.4);
    s.gap = ease(s.gap, -0.06 + L.push, dt, 0.9);
    s.infl = ease(s.infl, Math.max(-0.03, s.gap * 0.7), dt, 1.0);
    s.debtGrowth = L.debt;
    s.incomeGrowth = L.income + (s.gap - (-0.06 + L.push));
    s.burden = clamp(s.burden * (1 + (s.debtGrowth - s.incomeGrowth) * dt), 0.6, 2.4);
    if (s.burden <= M.done) { s.era = "reflate"; s.age = 0; }
  } else {
    // reflation: lenders trust again, spending grows, rates leave the floor; then the loop starts over
    const k = smooth(0, M.reflate, s.age);
    s.gap = ease(s.gap, 0.02 * (1 - k) + 0.6 * L.push, dt, 0.8);
    s.infl = ease(s.infl, s.gap * 0.7, dt, 1.0);
    s.r = ease(s.r, s.user ?? 0.055 * k, dt, 0.8);
    s.incomeGrowth = M.growth + s.gap * 0.6; s.debtGrowth = s.incomeGrowth + (M.start - s.burden) / 3;
    s.burden = ease(s.burden, M.start, dt, 3);
    if (s.age >= M.reflate) Object.assign(s, { t: 0, era: "lever", age: 0 });
  }
  s.tension = ease(s.tension, clamp(4 * Math.max(0, -s.gap) + 0.6 * s.levers[2], 0, 1), dt, 1.5);
  s.spin += (1 + s.gap) * dt;   // the flywheel turns in proportion to spending
  return s;
}

// The tour pulls the four ways in balance through the deleveraging, as a careful policy maker would.
export const BALANCED = [0.3, 0.5, 0.5, 0.6];

export function phaseOf(s) {
  if (s.era === "delever") {
    const L = leversOf(s.levers);
    if (L.income > 0.04) return "printing too much · inflation";
    if (L.debt - L.income >= 0) return "ugly deleveraging · burden rising";
    if (L.income > 0 && L.debt - L.income < -0.03) return "beautiful deleveraging";
    return "deleveraging · rates at 0%";
  }
  if (s.era === "reflate") return "reflation";
  if (s.t > M.peakAt - 2.5) return "long-term debt peak";
  if (s.infl > 0.012) return "inflation · rates up";
  if (s.gap >= 0) return "expansion";
  if (s.infl < -0.01) return "recession · rates down";
  return "recession";
}
