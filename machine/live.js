
// ---------- live: the model drives every moving part ----------
const D = __DATA__;
const P = D.P;
const SPEED = 1.25;                          // model years per second of the tour
const stage = document.querySelector(".em-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector(`[data-part="${name}"]`);
const el = {
  face: part("fw-face"), p1: part("pulley1-spokes"), p2: part("pulley2-spokes"), drum: part("drum-mark"), sheave: part("sheave-spokes"),
  gov: part("gov"), lever: part("lever"), drop: part("drop"), weight: part("weight"), shoe: part("shoe"), motor: part("motor"),
  thread: part("thread"), carriage: part("carriage"), carriageBack: part("carriage-back"), needles: [part("needle0"), part("needle1")], pulls: [0, 1, 2, 3].map((i) => part(`pull${i}`)),
};
const readout = document.querySelector("[data-readout]");
const status = stage.querySelector("[data-status]");
const stats = Object.fromEntries([...document.querySelectorAll("[data-stat]")].map((n) => [n.dataset.stat, n]));
const buttons = [...document.querySelectorAll("[data-lever]")];
const tourButton = document.querySelector("[data-tour]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const KS = G.scaleOf(P);
const Y = [0, 1, 0], X = [1, 0, 0], Z = [0, 0, 1];
const fY = (x, y, z) => G.frameOf([x, y, z], Y, X, Z);
const fX = (x, y, z) => G.frameOf([x, y, z], X, Y, Z);
const at = (p) => iso(p, P);
const S = (paths, style) => solidSvg(paths, style);
const line = (d, tone = "lo", extra = "") => `<path class="iso-line" data-tone="${tone}"${extra} d="${d}"/>`;
const depth = (p) => G.dot3(p, D.V);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// ---------- theme follows the viewer unless the page says otherwise ----------
const page = document.querySelector(".em-page");
function theme() {
  const root = document.documentElement.getAttribute("data-theme");
  const dark = root ? root === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  if (page) page.setAttribute("data-theme", dark ? "dark" : "light");
}
theme();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);
new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

// ---------- drawing of each live part ----------
const K = { solidSvg, cylinder, lineSvg, sideArc };
function drawFace(angle) { el.face.innerHTML = faceSvg(D, G, P, K, angle); }
function drawSpokes(node, x, y, z, s, r0, r1, angle, count = 5) {
  node.innerHTML = line(G.spokesOf(fY(x, y, z), s, r0, r1, count, P, { phase: angle }), "lo");
}
function drawGovernor(rate, theta) {
  el.gov.innerHTML = partsSvg(governorParts(D, G, rate, theta), G, P, K);
  return sleeveZ(D, rate);
}
function drawLever(rate, held) { el.lever.innerHTML = partsSvg(leverParts(D, G, rate, held), G, P, K); }
function drawWeight(z, travel) {
  const w = D.WEIGHT;
  el.weight.setAttribute("transform", translateAlong(P, [0, 0, z]));
  const a = at([w.x, w.y, D.GAL.pz]), b = at([w.x, w.y, z + 9]);
  el.drop.innerHTML = `<path class="em-cord" style="stroke-width:${(1.4 * KS).toFixed(2)}" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}"/><path class="em-cord-core" style="stroke-width:${(1.4 * KS - 1.2).toFixed(2)}" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}"/>`;
  drawSpokes(el.sheave, D.GAL.x, D.GAL.py, D.GAL.pz, 3, 3, D.GAL.pr + 2.4 - 0.3, travel / D.GAL.pr, 4);
  drawSpokes(el.drum, D.SHAFT1.x, D.DRUM.y, D.AXLE_Z, D.DRUM.half + 1.2, 6.5, D.DRUM.flange - 0.3, -travel / D.DRUM.r, 3);
}
function drawMotor(gap, angle) { el.motor.innerHTML = partsSvg(motorParts(D, G, gap), G, P, K, angle); }
function drawPull(i, value) { el.pulls[i].innerHTML = partsSvg(pullParts(D, G, i, value), G, P, K); }
function drawNeedle(i, share) {
  const [x, y] = D.DIALS[i];
  const a = -2.36 + 4.71 * clamp01(share);
  const top = D.DIAL_Z + D.DIAL_H + 0.2;
  el.needles[i].setAttribute("d", lineOnTop([x - Math.sin(a) * 3, y + Math.cos(a) * 3], [x + Math.sin(a) * (D.DIAL_R - 4), y - Math.cos(a) * (D.DIAL_R - 4)], top, P));
}
function drawScrew(angle, share) {
  const s = D.SCREW;
  el.thread.innerHTML = line(G.ribsOf(fX(0, s.y, s.z), s.x0 + 0.5, s.x1 - 0.5, s.r, 9, P, { phase: angle, twist: 1.6 * Math.PI * 30 }), "lo");
  const move = translateAlong(P, [share * (s.x1 - s.x0 - 20), 0, 0]);
  el.carriage.setAttribute("transform", move);
  el.carriageBack.setAttribute("transform", move);
}

// ---------- state ----------
let state = initial();
let touring = !still.matches, frame = 0, last = 0, visible = false, angle = 0, travelLast = 0;
let leverTarget = [0, 0, 0, 0], leverShown = [0, 0, 0, 0], shoeAt = 0, motorGap = 3, motorSpin = 0;
let dragging = null, lastPhase = "";
const weightZ = (b) => D.WEIGHT.zHi - ((Math.min(2, Math.max(0.6, b)) - 0.6) / 1.4) * (D.WEIGHT.zHi - D.WEIGHT.zLo);

function render() {
  const s = state;
  angle = s.spin * Math.PI * 2 * 0.42;
  drawFace(-angle);
  drawSpokes(el.p1, D.SHAFT1.x, D.PULLEY_Y, D.AXLE_Z, D.PULLEY.half, 7, D.PULLEY.flange - 0.3, -angle);
  drawSpokes(el.p2, D.CS.x, D.PULLEY_Y, D.AXLE_Z, D.PULLEY.half, 7, D.PULLEY.flange - 0.3, -angle);
  drawGovernor(s.r, angle * 0.9);
  drawLever(s.r, state.user !== null);
  const z = weightZ(s.burden);
  drawWeight(z, D.WEIGHT.zHi - z);
  el.shoe.setAttribute("transform", translateAlong(P, [shoeAt * 2.6, 0, 0]));
  drawMotor(motorGap, motorSpin);
  for (let i = 0; i < 4; i++) drawPull(i, leverShown[i]);
  drawNeedle(0, (s.gap + 0.2) / 0.4);
  drawNeedle(1, (s.burden - 0.6) / 1.4);
  drawScrew(angle * 0.6, s.t / 66);
  const phase = phaseOf(s);
  const text = `year ${Math.floor(s.t)} · ${phase}`;
  if (readout.textContent !== text) readout.textContent = text;
  const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
  stats.year.textContent = `year ${s.t.toFixed(1)}`;
  stats.rate.textContent = `rate ${pct(s.r)}${s.user !== null ? " (yours)" : ""}`;
  stats.gap.textContent = `spending ${s.gap >= 0 ? "+" : "−"}${pct(Math.abs(s.gap))} vs capacity`;
  stats.burden.textContent = `debt ${pct(s.burden, 0)} of income`;
  stats.growth.textContent = `burden ${s.debtGrowth - s.incomeGrowth >= 0 ? "rising" : "falling"} ${pct(Math.abs(s.debtGrowth - s.incomeGrowth))}/yr`;
  if (phase.split(" · ")[0] !== lastPhase) { lastPhase = phase.split(" · ")[0]; if (document.activeElement === stage) status.textContent = phase; }
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  const years = calm ? 0 : dt * SPEED * (window.__driveSpeed ?? 1);
  if (touring) leverTarget = state.era === "delever" && state.age > 1.2 ? BALANCED.slice() : [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) leverShown[i] = calm ? leverTarget[i] : leverShown[i] + (leverTarget[i] - leverShown[i]) * (1 - Math.exp(-dt / 0.35));
  state.levers = leverShown.slice();
  const sub = Math.max(1, Math.ceil(years / 0.02));
  for (let i = 0; i < sub; i++) state = step(state, years / sub);
  shoeAt += ((leverShown[0] > 0.05 ? 1 : 0) - shoeAt) * (calm ? 1 : 1 - Math.exp(-dt / 0.2));
  motorGap += ((leverShown[3] > 0.05 ? 0 : 3) - motorGap) * (calm ? 1 : 1 - Math.exp(-dt / 0.25));
  motorSpin += dt * (motorGap < 0.5 ? 9 : 0);
  render();
  buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(leverTarget[i] > 0.5 || (touring && leverTarget[i] > 0))));
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }, { rootMargin: "120px 0px" }).observe(stage);

// ---------- input ----------
function takeOver() { touring = false; tourButton.setAttribute("aria-pressed", "false"); }
function setRate(r) { state.user = Math.min(0.10, Math.max(0, r)); if (still.matches) { state = step(state, 0.5); render(); } run(); }
function toggleLever(i) {
  takeOver();
  leverTarget[i] = leverTarget[i] > 0.5 ? 0 : 1;
  if (still.matches) { leverShown = leverTarget.slice(); state.levers = leverShown.slice(); state = step(state, 0.5); render(); }
  status.textContent = `${buttons[i].textContent.replace(/^\d\s*/, "")} ${leverTarget[i] ? "on" : "off"}`;
  run();
}
buttons.forEach((b, i) => b.addEventListener("click", () => toggleLever(i)));
tourButton.addEventListener("click", () => {
  touring = !touring;
  tourButton.setAttribute("aria-pressed", String(touring));
  if (touring) { state.user = null; leverTarget = [0, 0, 0, 0]; }
  run();
});
function knobScreen() { return at(knobPoint(D, G, state.r)); }
function toViewBox(event) {
  const box = svg.getBoundingClientRect();
  return [((event.clientX - box.left) / box.width) * D.W, ((event.clientY - box.top) / box.height) * D.H];
}
stage.addEventListener("pointerdown", (event) => {
  const [x, y] = toViewBox(event);
  const [kx, ky] = knobScreen();
  if (Math.hypot(x - kx, y - ky) > 26) return;
  dragging = { y, rate: state.r };
  stage.setPointerCapture(event.pointerId);
  takeOver();
  event.preventDefault();
});
stage.addEventListener("pointermove", (event) => {
  const [x, y] = toViewBox(event);
  if (dragging) { setRate(dragging.rate + (y - dragging.y) * 0.0012); return; }
  const [kx, ky] = knobScreen();
  stage.classList.toggle("em-grab", Math.hypot(x - kx, y - ky) < 26);
});
const release = (event) => { if (dragging) { dragging = null; try { stage.releasePointerCapture(event.pointerId); } catch {} } };
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);
stage.addEventListener("keydown", (event) => {
  const big = event.shiftKey ? 0.02 : 0.005;
  if (event.key === "ArrowUp") { takeOver(); setRate((state.user ?? state.r) - big); }
  else if (event.key === "ArrowDown") { takeOver(); setRate((state.user ?? state.r) + big); }
  else if (event.key === "Escape") { state.user = null; status.textContent = "rate back with the governor"; run(); }
  else if (["1", "2", "3", "4"].includes(event.key)) toggleLever(+event.key - 1);
  else if (event.key === " ") { tourButton.click(); }
  else return;
  event.preventDefault();
});
stage.addEventListener("focus", () => { status.textContent = phaseOf(state); });
if (still.matches) { for (let i = 0; i < 47 / 0.02; i++) state = step(state, 0.02); }
render();
