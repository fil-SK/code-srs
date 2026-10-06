/* logoReveal: riffle-fan reveal for the FlipTap logo (SVG + vanilla JS, no dependencies)
 *
 * Usage:
 *   <svg id="mark" viewBox="0 0 1254 1254">
 *     <rect width="1254" height="1254" fill="#FEFEFE"/>   <!-- optional: stage colour -->
 *     <g data-cards></g>
 *   </svg>
 *
 *   const anim = create(svgElement);
 *   play(anim, 'reveal');          // 'reveal' ≈1.7 s · 'launch' ≈0.72 s · 'loader' loops
 *   // anim.renderAt(t) draws any frame of the reveal deterministically (0 ≤ t ≤ anim.duration)
 *   // anim.renderLoop(t) draws any frame of the loader
 *
 * Tune everything in CONFIG below (timing, card count/order, ring angles, colours, easing).
 * play() shows the finished mark immediately when the visitor prefers reduced motion.
 */
const GEOMETRY = {
  // Exact final mark, reconstructed from the supplied PNG as lines + circular arcs
  // (1254 x 1254 space, separator gap = 20). B is the front card's outer silhouette;
  // SLOT is the negative space (the chevron) that opens inside it at the end.
  A: 'M435.76,421.97L471.52,242.37A44.60,44.60 0 0 1 523.49,207.25L858.24,270.11A44.80,44.80 0 0 1 893.91,322.87L844.54,571.29A62.30,62.30 0 0 1 821.71,608.30L784.36,637.39A81.46,81.46 0 0 0 748.75,553.40L541.82,419.20A82.10,82.10 0 0 0 471.24,410.17L435.76,421.97Z',
  B: 'M361.46,924.42L224.77,565.64A47.70,47.70 0 0 1 254.29,503.39L477.55,429.15A62.10,62.10 0 0 1 530.94,435.98L737.86,570.18A61.46,61.46 0 0 1 742.18,670.24L572.83,802.12A28.35,28.35 0 0 1 527.07,779.75L527.07,770.50L507.09,770.50L507.50,826.93A74.74,74.74 0 0 0 544.80,891.06L563.27,901.75L422.91,952.58A48.20,48.20 0 0 1 361.46,924.42Z',
  C: 'M881.84,486.16L1009.15,564.46A48.00,48.00 0 0 1 1026.28,628.08L836.92,980.17A48.20,48.20 0 0 1 770.16,998.96L554.87,873.25A54.74,54.74 0 0 1 527.93,819.53A48.35,48.35 0 0 0 584.94,817.80L833.75,624.73A82.30,82.30 0 0 0 864.01,575.77L881.84,486.16Z',
  SLOT: 'M527.07,770.50L527.07,761.67A19.85,19.85 0 0 1 535.48,745.45L662.30,656.00A33.70,33.70 0 0 0 661.67,600.49L526.24,509.54A12.60,12.60 0 0 0 506.62,519.96L506.54,552.78A18.50,18.50 0 0 0 514.73,568.19L595.20,622.19A8.40,8.40 0 0 1 595.29,636.07L514.87,691.63A19.10,19.10 0 0 0 506.62,707.49L507.09,770.50L507.09,773.50L527.07,773.50L527.07,770.50Z',
  // Centre line of the chevron slot; the slot opens outward from this spine.
  SLOT_SPINE: [[517.08, 773.5], [517.08, 724.1], [654.02, 628.51], [534.08, 547.99]],
};

/* ================================================================
   Card-cycle logo reveal — deterministic SVG engine
   Everything is a pure function of time: renderAt(t) draws frame t.
   ================================================================ */

const CONFIG = {
  colors: { bg: '#FEFEFE', navy: '#1E283A', orange: '#FE6801' },
  pivot: [628, 604],                 // the "thumb": centre of the final mark, shared by every card
  card: { w: 430, h: 380, r: 47 },   // deck card, in logo units
  grip: [-20, 177],                  // where the thumb holds each card (card coords, from its centre)
  separator: { deck: 7, full: 37 },  // background-coloured outline (stroke width); full/2 < logo gap (20)
  deckAngle: -100,                   // rotation of the squared-up deck (deg): it starts on the left
  deckSpread: 2.6,                   // each card down the stack sits this much further anticlockwise
  fan: { time: 0.92 },               // the full-fan moment
  // Deck order, TOP card first. The top card leads the riffle and travels furthest; each card
  // below starts a beat later and stops earlier. fan = clockwise turn from the deck at the
  // full-fan moment; the end angle comes from the logo. The bottom card turns orange and
  // slides out from underneath at the end. coverBy: extra card that tucks under another.
  cards: [
    { target: 'B', start: 0.15, fan: 340, land: 1.45 },                          // top card: one full lap, lands on top
    { target: 'B', start: 0.21, fan: 290, land: 1.45, coverBy: 0 },              // follow it round and
    { target: 'B', start: 0.27, fan: 230, land: 1.45, coverBy: 0 },              //   tuck under it
    { target: 'A', start: 0.33, fan: 50,  land: 1.30 },                          // → back card
    { target: 'C', start: 0.36, fan: 150, land: 1.38, orange: [0.62, 0.86] },    // bottom card → orange
  ],
  morph: 0.24,        // seconds before landing during which a card eases into its exact final shape
  slot: [-0.03, 0.12],// chevron opening window relative to the front card's landing
  settle: { angle: 0.7, before: 0.12, after: 0.2 }, // tiny rotational overshoot about the pivot (deg)
  // Looping loader: the open fan on its own, stepping one card-gap clockwise per cycle,
  // top card first, the rest following in a riffle wave.
  loader: { period: 1.0, stagger: 0.07, move: 0.62, gap: 72, startAngle: 250, orangeCard: 0 }, // orangeCard: index from the top
  // Derived versions. from = where on the reveal timeline to start; duration = real seconds
  // (null = natural speed). The loader loops forever.
  variants: {
    reveal: { from: 0, duration: null },        // ≈1.7 s hero reveal
    launch: { from: 0.12, duration: 0.72 },     // app-launch cut: same motion, ≈2.2× faster
    loader: { loop: true },
  },
  end: 1.68,          // time at which the exact static mark is drawn
};




/* ---------- small math helpers ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const smootherstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * t * (t * (6 * t - 15) + 10); };
const rad = d => d * Math.PI / 180;

function cubicBezier([x1, y1, x2, y2]) {
  const bx = t => 3 * x1 * (1 - t) * (1 - t) * t + 3 * x2 * (1 - t) * t * t + t * t * t;
  const by = t => 3 * y1 * (1 - t) * (1 - t) * t + 3 * y2 * (1 - t) * t * t + t * t * t;
  const dx = t => 3 * x1 * (1 - t) * (1 - t) + 6 * (x2 - x1) * (1 - t) * t + 3 * (1 - x2) * t * t;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t = clamp(t - (bx(t) - x) / d); }
    let lo = 0, hi = 1; // bisection polish
    for (let i = 0; i < 20 && Math.abs(bx(t) - x) > 1e-6; i++) { if (bx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return by(t);
  };
}

/* ---------- colour: interpolate in OKLab so the navy→orange turn stays clean ---------- */
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const toSrgb = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.round(clamp(v) * 255); };
function rgbToOklab([r, g, b]) {
  r = toLin(r); g = toLin(g); b = toLin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function oklabToHex([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
               -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
               -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map(toSrgb);
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}
function colorMixer(hexA, hexB) {
  const A = rgbToOklab(hexToRgb(hexA)), B = rgbToOklab(hexToRgb(hexB));
  return t => t <= 0 ? hexA : t >= 1 ? hexB : oklabToHex(A.map((v, i) => lerp(v, B[i], t)));
}

/* ---------- geometry helpers ---------- */
function rrectPath(w, h, r) {
  const x = w / 2, y = h / 2;
  return `M${-x + r},${-y}H${x - r}A${r},${r} 0 0 1 ${x},${-y + r}V${y - r}A${r},${r} 0 0 1 ${x - r},${y}` +
         `H${-x + r}A${r},${r} 0 0 1 ${-x},${y - r}V${-y + r}A${r},${r} 0 0 1 ${-x + r},${-y}Z`;
}
// point on a rounded rect by perimeter fraction s (clockwise from the top edge's left end)
function rrectSampler(w, h, r) {
  const ex = w - 2 * r, ey = h - 2 * r, q = Math.PI * r / 2;
  const segs = [ex, q, ey, q, ex, q, ey, q], P = segs.reduce((a, b) => a + b, 0);
  return s => {
    let d = ((s % 1) + 1) % 1 * P, i = 0;
    while (i < 7 && d > segs[i]) { d -= segs[i]; i++; }
    const x = w / 2, y = h / 2;
    switch (i) {
      case 0: return [-x + r + d, -y];
      case 1: { const a = -Math.PI / 2 + d / r; return [x - r + r * Math.cos(a), -y + r + r * Math.sin(a)]; }
      case 2: return [x, -y + r + d];
      case 3: { const a = d / r; return [x - r + r * Math.cos(a), y - r + r * Math.sin(a)]; }
      case 4: return [x - r - d, y];
      case 5: { const a = Math.PI / 2 + d / r; return [-x + r + r * Math.cos(a), y - r + r * Math.sin(a)]; }
      case 6: return [-x, y - r - d];
      default: { const a = Math.PI + d / r; return [-x + r + r * Math.cos(a), -y + r + r * Math.sin(a)]; }
    }
  };
}
function samplePath(svg, d, step) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d); svg.appendChild(p);
  const L = p.getTotalLength(), n = Math.max(16, Math.round(L / step)), pts = [];
  for (let i = 0; i < n; i++) { const q = p.getPointAtLength(L * i / n); pts.push([q.x, q.y]); }
  p.remove(); return pts;
}
const signedArea = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
function toLocal(pts, cx, cy, thDeg) {
  const c = Math.cos(rad(-thDeg)), s = Math.sin(rad(-thDeg));
  return pts.map(([x, y]) => { const dx = x - cx, dy = y - cy; return [dx * c - dy * s, dx * s + dy * c]; });
}
// Dynamic time warping between a closed target outline and a closed rect outline.
// Returns, for each target point, the perimeter fraction on the rect it morphs from.
function correspondence(target, rectAt, M = 480) {
  const N = target.length;
  let j0 = 0, best = Infinity;
  for (let j = 0; j < M; j++) { const p = rectAt(j / M); const d = (p[0] - target[0][0]) ** 2 + (p[1] - target[0][1]) ** 2; if (d < best) { best = d; j0 = j; } }
  const R = []; for (let j = 0; j <= M; j++) R.push(rectAt((j0 + j) / M));
  const n = N + 1, m = M + 1, D = new Float64Array(n * m).fill(Infinity);
  const cost = (i, j) => { const a = target[i % N], b = R[j]; return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; };
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const c = cost(i, j);
    if (i === 0 && j === 0) { D[0] = c; continue; }
    let prev = Infinity;
    if (i > 0) prev = Math.min(prev, D[(i - 1) * m + j]);
    if (j > 0) prev = Math.min(prev, D[i * m + j - 1]);
    if (i > 0 && j > 0) prev = Math.min(prev, D[(i - 1) * m + j - 1]);
    D[i * m + j] = c + prev;
  }
  const sum = new Float64Array(n), cnt = new Float64Array(n);
  let i = n - 1, j = m - 1;
  while (true) {
    sum[i] += j; cnt[i]++;
    if (i === 0 && j === 0) break;
    const a = i > 0 && j > 0 ? D[(i - 1) * m + j - 1] : Infinity, b = i > 0 ? D[(i - 1) * m + j] : Infinity, c = j > 0 ? D[i * m + j - 1] : Infinity;
    if (a <= b && a <= c) { i--; j--; } else if (b <= c) i--; else j--;
  }
  const out = [];
  for (let k = 0; k < N; k++) out.push((j0 + sum[k] / cnt[k]) / M);
  return out;
}
function nearestOnPolyline(p, line) {
  let best = null, bd = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], b = line[i + 1], vx = b[0] - a[0], vy = b[1] - a[1];
    const t = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy));
    const q = [a[0] + vx * t, a[1] + vy * t], d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
const polyD = pts => { let s = 'M' + pts[0][0].toFixed(2) + ',' + pts[0][1].toFixed(2); for (let i = 1; i < pts.length; i++) s += 'L' + pts[i][0].toFixed(2) + ',' + pts[i][1].toFixed(2); return s + 'Z'; };

/* ================================================================
   Build: turn CONFIG + GEOMETRY into per-card motion plans
   ================================================================ */
function createLogoAnimation(svg, config = CONFIG, geometry = GEOMETRY) {
  const C = config, [Px, Py] = C.pivot, { w, h, r } = C.card;
  const rectAt = rrectSampler(w, h, r), rectD = rrectPath(w, h, r);
  const toOrange = colorMixer(C.colors.navy, C.colors.orange);

  // Final pose of the rectangle each part of the mark "comes from" (best overlap when layered
  // like the logo). In every one, the pivot sits near the card's bottom edge: the logo is a fan.
  // Rotations are the ones where that grip lands near the bottom edge (so they matter mod 360).
  const TARGET_POSE = { A: [655.04, 424.10, 10.70], B: [472.06, 681.16, 249.90], C: [753.04, 737.60, 118.20] };
  const TARGET_PATH = { A: geometry.A, B: geometry.B, C: geometry.C };

  const layer = svg.querySelector('[data-cards]');
  layer.replaceChildren();
  const N = C.cards.length;
  const D = C.deckAngle;

  const cards = C.cards.map((spec, k) => {
    const [tx, ty, trot] = TARGET_POSE[spec.target];
    let final = (((trot - D) % 360) + 360) % 360;            // clockwise turn from deck to end
    while (final < spec.fan) final += 360;
    const thEnd = D + final;
    // exact grip for this card's final pose (the shared pivot in its own coordinates)
    const c0 = Math.cos(rad(thEnd)), s0 = Math.sin(rad(thEnd)), dx = Px - tx, dy = Py - ty;
    const gripEnd = [dx * c0 + dy * s0, -dx * s0 + dy * c0];
    let tgt = toLocal(samplePath(svg, TARGET_PATH[spec.target], 4), tx, ty, thEnd);
    if (signedArea(tgt) < 0) tgt.reverse();
    const corr = correspondence(tgt, rectAt);
    const src = corr.map(s => rectAt(s));
    return { ...spec, k, deckAngle: -C.deckSpread * k, final, thEnd, gripEnd, tgt, src, tx, ty, el: null };
  });

  // Chevron slot (lives inside the front card, i.e. the top card targeting B)
  const front = cards.find(c => c.target === 'B');
  let slotPts = toLocal(samplePath(svg, geometry.SLOT, 2), front.tx, front.ty, front.thEnd);
  const spine = toLocal(geometry.SLOT_SPINE, front.tx, front.ty, front.thEnd);
  const slotBase = slotPts.map(p => nearestOnPolyline(p, spine));
  front.slotPts = slotPts; front.slotBase = slotBase;

  // DOM: bottom card first so the top card paints last
  for (let k = N - 1; k >= 0; k--) {
    const c = cards[k];
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    body.setAttribute('stroke', C.colors.bg);
    body.setAttribute('stroke-linejoin', 'round');
    body.setAttribute('paint-order', 'stroke');
    g.appendChild(body);
    if (c === front) {
      const slot = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      slot.setAttribute('fill', C.colors.bg);
      g.appendChild(slot); c.slotEl = slot;
    }
    layer.appendChild(g); c.el = g; c.body = body; c.state = '';
  }

  const bump = (t, t0, before, after) => {       // 0 → 1 at t0 → 0, C1-smooth
    if (t <= t0 - before || t >= t0 + after) return 0;
    return t < t0 ? smootherstep(t0 - before, t0, t) : 1 - smootherstep(t0, t0 + after, t);
  };

  // Smooth monotone path through (t0,y0) → (t1,y1) → (t2,y2): starts at rest (cubic ease-in),
  // passes y1 with a continuous velocity, and ends at rest with zero acceleration (long quartic tail).
  function glide(t, t0, t1, t2, y0, y1, y2, v1) {
    if (t <= t0) return y0; if (t >= t2) return y2;
    const h0 = t1 - t0, h1 = t2 - t1, d0 = (y1 - y0) / h0, d1 = (y2 - y1) / h1;
    if (v1 === undefined) v1 = d0 * d1 <= 0 ? 0 : (3 * h0 + 3 * h1) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1);
    if (t < t1) {                                   // cubic Hermite, zero start velocity
      const s = (t - t0) / h0, s2 = s * s, s3 = s2 * s, m = v1 * h0;
      return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - s2) * m + (-2 * s3 + 3 * s2) * y1;
    }
    const D = y2 - y1; if (Math.abs(D) < 1e-9) return y1;
    const s = (t - t1) / h1, m = clamp(v1 * h1 / D, 0, 3);   // quartic: y'(0)=m, y(1)=1, y'(1)=y''(1)=0
    const b = 6 - 3 * m, c = 3 * m - 8, d = 3 - m;
    return y1 + D * (m * s + b * s * s + c * s * s * s + d * s * s * s * s);
  }

  function poseAt(c, t) {
    const over = C.settle.angle * bump(t, c.land, C.settle.before, C.settle.after);
    const a = glide(t, c.start, C.fan.time, c.land, c.deckAngle, c.fan, c.final);
    const th = D + a + over;                                   // rigid turn about the shared grip
    // slide the grip from the shared deck grip to this card's exact one while it locks in
    const g = smootherstep(c.land - C.morph - 0.1, c.land, t);
    const gx = lerp(C.grip[0], c.gripEnd[0], g), gy = lerp(C.grip[1], c.gripEnd[1], g);
    const co = Math.cos(rad(th)), si = Math.sin(rad(th));
    return {
      u: smoothstep(c.start, c.start + 0.25, t), th,
      x: Px - (gx * co - gy * si),
      y: Py - (gx * si + gy * co),
    };
  }

  function renderAt(t) {
    const done = t >= C.end;
    for (const c of cards) {
      if (done) {                                        // exact static mark
        if (c.state !== 'final') {
          c.el.removeAttribute('transform');
          const isFront = c === front, isExtra = c.target === 'B' && !isFront;
          c.el.style.display = isExtra ? 'none' : '';
          c.body.setAttribute('d', TARGET_PATH[c.target]);
          c.body.setAttribute('fill', c.orange ? C.colors.orange : C.colors.navy);
          c.body.setAttribute('stroke-width', 0);
          if (isFront) c.slotEl.setAttribute('d', geometry.SLOT);
          c.state = 'final';
        }
        continue;
      }
      c.el.style.display = '';
      const p = poseAt(c, t);
      c.el.setAttribute('transform', `translate(${p.x.toFixed(3)} ${p.y.toFixed(3)}) rotate(${p.th.toFixed(4)})`);
      const drv = c.coverBy !== undefined ? cards[c.coverBy] : c;
      const m = smootherstep(drv.land - C.morph, drv.land, t);
      if (m <= 0) { if (c.state !== 'rect') { c.body.setAttribute('d', rectD); c.state = 'rect'; } }
      else {
        const pts = c.src.map((s, i) => [lerp(s[0], c.tgt[i][0], m), lerp(s[1], c.tgt[i][1], m)]);
        c.body.setAttribute('d', polyD(pts)); c.state = 'morph';
      }
      c.body.setAttribute('stroke-width', lerp(C.separator.deck, C.separator.full, p.u).toFixed(2));
      c.body.setAttribute('fill', c.orange ? toOrange(smoothstep(c.orange[0], c.orange[1], t)) : C.colors.navy);
      if (c === front) {
        const wOpen = smootherstep(c.land + C.slot[0], c.land + C.slot[1], t);
        c.slotEl.setAttribute('d', wOpen <= 0 ? '' : polyD(slotPts.map((q, i) => [lerp(slotBase[i][0], q[0], wOpen), lerp(slotBase[i][1], q[1], wOpen)])));
      }
    }
  }

  const easeStep = cubicBezier([0.4, 0, 0.3, 1]);
  const rectOnly = c => {
    if (c.state !== 'loop') {
      c.el.style.display = ''; c.body.setAttribute('d', rectD);
      c.body.setAttribute('stroke-width', C.separator.full);
      if (c.slotEl) c.slotEl.setAttribute('d', '');
      c.state = 'loop';
    }
  };
  // tau: seconds since the loader started (any value; the motion is periodic)
  function renderLoop(tau) {
    const L = C.loader;
    const cycle = Math.floor(tau / L.period), local = tau - cycle * L.period;
    for (const c of cards) {                       // k = 0 is the top card: furthest round, moves first
      rectOnly(c);
      const p = easeStep(clamp((local - c.k * L.stagger) / L.move));
      const th = L.startAngle - L.gap * c.k + L.gap * (cycle + p);
      const co = Math.cos(rad(th)), si = Math.sin(rad(th)), [gx, gy] = C.grip;
      c.el.setAttribute('transform', `translate(${(Px - (gx * co - gy * si)).toFixed(3)} ${(Py - (gx * si + gy * co)).toFixed(3)}) rotate(${th.toFixed(4)})`);
      c.body.setAttribute('fill', c.k === L.orangeCard ? C.colors.orange : C.colors.navy);
    }
  }

  return { renderAt, renderLoop, cards, config: C, duration: C.end };
}


/* ================================================================
   Playback helper (the only part that touches the clock)
   ================================================================ */
function playLogo(anim, variant = 'reveal', { speed = 1, respectReducedMotion = true, onFrame, onDone } = {}) {
  const C = anim.config, v = C.variants[variant];
  const reduce = respectReducedMotion && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {                                  // no motion: show the finished state
    if (v.loop) anim.renderLoop(0); else anim.renderAt(C.end);
    onFrame?.(v.loop ? 0 : C.end); onDone?.();
    return { stop() {} };
  }
  let raf = 0, start = null;
  const frame = now => {
    if (start === null) start = now;
    const elapsed = (now - start) / 1000 * speed;
    if (v.loop) { anim.renderLoop(elapsed); onFrame?.(elapsed); raf = requestAnimationFrame(frame); return; }
    const dur = v.duration == null ? C.end - v.from : v.duration;
    const p = Math.min(1, elapsed / dur), t = v.from + (C.end - v.from) * p;
    anim.renderAt(t); onFrame?.(t);
    if (p < 1) raf = requestAnimationFrame(frame); else onDone?.();
  };
  raf = requestAnimationFrame(frame);
  return { stop() { cancelAnimationFrame(raf); } };
}


export { createLogoAnimation as create, playLogo as play, CONFIG, GEOMETRY }
