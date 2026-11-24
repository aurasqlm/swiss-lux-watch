/**
 * src/horology/gears.js
 * Exact parametric involute spur gear Path2D generator (alpha = 20 deg, backlash = 0.96),
 * 20-tooth Swiss club-tooth escape wheel, Swiss lever pallet fork, free-sprung Gyromax
 * balance wheel, breathing Breguet overcoil hairspring, and tri-spoke flying tourbillon cage.
 */

import { TAU } from './math.js';

const ALPHA = (20.0 * Math.PI) / 180.0; // 20 deg pressure angle
const INV_ALPHA = Math.tan(ALPHA) - ALPHA;
const BACKLASH = 0.96;

const gearCache = new Map();

/**
 * Builds and caches exact involute gear Path2D objects:
 * - combined: outer involute teeth + spoke cutouts + central bore (fill with 'evenodd')
 * - outerOnly: outer involute tooth profile only
 * - spokeWindows: spoke cutout windows only (for 45-deg anglage chamfer stroking!)
 */
export function getInvoluteGearGeometry(N, m, options = {}) {
  const spokes = options.spokes ?? 5;
  const hubRatio = options.hubRatio ?? 0.24;
  const solid = Boolean(options.solid);
  const key = `${N}_${m.toFixed(3)}_${spokes}_${hubRatio.toFixed(2)}_${solid ? 1 : 0}`;
  if (gearCache.has(key)) return gearCache.get(key);

  const Rp = (m * N) / 2.0;
  const Rb = Rp * Math.cos(ALPHA);
  const Ra = Rp + 1.0 * m;
  const Rf = Math.max(2.0, Rp - 1.25 * m);

  const etaP = (Math.PI / (2.0 * N)) * BACKLASH;
  const psiB = etaP + INV_ALPHA;

  const uMin = Rf > Rb ? Math.sqrt((Rf / Rb) * (Rf / Rb) - 1.0) : 0.0;
  const uMax = Math.sqrt((Ra / Rb) * (Ra / Rb) - 1.0);
  const steps = 9;

  const outerOnly = new Path2D();
  const combined = new Path2D();

  for (let k = 0; k < N; k++) {
    const gamma = (k * TAU) / N;
    const baseMinus = gamma - psiB;
    const basePlus = gamma + psiB;

    // Root start on lower radial flank if Rf < Rb
    const rStart = Rf < Rb ? Rf : Rb * Math.sqrt(1 + uMin * uMin);
    const thStart = Rf < Rb ? baseMinus : baseMinus + (uMin - Math.atan(uMin));

    if (k === 0) {
      outerOnly.moveTo(rStart * Math.cos(thStart), rStart * Math.sin(thStart));
      combined.moveTo(rStart * Math.cos(thStart), rStart * Math.sin(thStart));
    } else {
      outerOnly.lineTo(rStart * Math.cos(thStart), rStart * Math.sin(thStart));
      combined.lineTo(rStart * Math.cos(thStart), rStart * Math.sin(thStart));
    }

    // If Rf < Rb, step radially up to base circle
    if (Rf < Rb) {
      const xB = Rb * Math.cos(baseMinus);
      const yB = Rb * Math.sin(baseMinus);
      outerOnly.lineTo(xB, yB);
      combined.lineTo(xB, yB);
    }

    // Lower (-) involute flank ascending uMin -> uMax
    for (let s = 1; s <= steps; s++) {
      const u = uMin + ((uMax - uMin) * s) / steps;
      const r = Rb * Math.sqrt(1.0 + u * u);
      const th = baseMinus + (u - Math.atan(u));
      const x = r * Math.cos(th);
      const y = r * Math.sin(th);
      outerOnly.lineTo(x, y);
      combined.lineTo(x, y);
    }

    // Tip land arc at Ra
    const thTipMinus = baseMinus + (uMax - Math.atan(uMax));
    const thTipPlus = basePlus - (uMax - Math.atan(uMax));
    outerOnly.arc(0, 0, Ra, thTipMinus, thTipPlus, false);
    combined.arc(0, 0, Ra, thTipMinus, thTipPlus, false);

    // Upper (+) involute flank descending uMax -> uMin
    for (let s = steps - 1; s >= 0; s--) {
      const u = uMin + ((uMax - uMin) * s) / steps;
      const r = Rb * Math.sqrt(1.0 + u * u);
      const th = basePlus - (u - Math.atan(u));
      const x = r * Math.cos(th);
      const y = r * Math.sin(th);
      outerOnly.lineTo(x, y);
      combined.lineTo(x, y);
    }

    // Radial flank down to Rf if Rf < Rb
    const thRootPlus = Rf < Rb ? basePlus : basePlus - (uMin - Math.atan(uMin));
    if (Rf < Rb) {
      outerOnly.lineTo(Rf * Math.cos(basePlus), Rf * Math.sin(basePlus));
      combined.lineTo(Rf * Math.cos(basePlus), Rf * Math.sin(basePlus));
    }

    // Root arc to next tooth's lower flank
    const nextGamma = ((k + 1) * TAU) / N;
    const nextBaseMinus = nextGamma - psiB;
    const thNextRoot = Rf < Rb ? nextBaseMinus : nextBaseMinus + (uMin - Math.atan(uMin));
    outerOnly.arc(0, 0, Rf, thRootPlus, thNextRoot, false);
    combined.arc(0, 0, Rf, thRootPlus, thNextRoot, false);
  }
  outerOnly.closePath();
  combined.closePath();

  // Interior skeletonized horological spoke cutouts
  const spokeWindows = new Path2D();
  const rInnerRim = Rf - Math.max(3.5, 1.55 * m);
  const rHub = Math.max(6.0, Rp * hubRatio);

  if (!solid && rInnerRim > rHub + 8.0 && spokes >= 3) {
    const sector = TAU / spokes;
    // Angular half-width of spoke tapers slightly outward for classical Geneva elegance
    const spokeHalfWidthInner = Math.min(0.22, (sector * 0.22));
    const spokeHalfWidthOuter = Math.min(0.16, (sector * 0.14));

    for (let s = 0; s < spokes; s++) {
      const a0 = s * sector + spokeHalfWidthInner;
      const a1 = (s + 1) * sector - spokeHalfWidthInner;
      const b0 = s * sector + spokeHalfWidthOuter;
      const b1 = (s + 1) * sector - spokeHalfWidthOuter;
      if (a1 <= a0 + 0.05 || b1 <= b0 + 0.05) continue;

      const win = new Path2D();
      win.moveTo(rHub * Math.cos(a0), rHub * Math.sin(a0));
      win.lineTo(rInnerRim * Math.cos(b0), rInnerRim * Math.sin(b0));
      win.arc(0, 0, rInnerRim, b0, b1, false);
      win.lineTo(rHub * Math.cos(a1), rHub * Math.sin(a1));
      win.arc(0, 0, rHub, a1, a0, true);
      win.closePath();

      spokeWindows.addPath(win);
      combined.addPath(win);
    }
  }

  // Central pivot bore
  const rBore = Math.max(2.5, Math.min(rHub * 0.34, 14.0));
  const bore = new Path2D();
  bore.arc(0, 0, rBore, 0, TAU);
  bore.closePath();
  combined.addPath(bore);

  const geom = {
    N,
    m,
    Rp,
    Rb,
    Ra,
    Rf,
    rInnerRim,
    rHub,
    rBore,
    outerOnly,
    spokeWindows,
    combined,
  };
  gearCache.set(key, geom);
  return geom;
}

const escapeCache = new Map();

/**
 * Builds an authentic 20-tooth asymmetric Swiss club-tooth escape wheel Path2D.
 */
export function getEscapeWheelGeometry(R) {
  const key = R.toFixed(2);
  if (escapeCache.has(key)) return escapeCache.get(key);

  const N = 20;
  const rRoot = R * 0.72;
  const rInnerRim = R * 0.63;
  const rHub = R * 0.21;

  const combined = new Path2D();
  const outerOnly = new Path2D();
  const spokeWindows = new Path2D();

  for (let k = 0; k < N; k++) {
    const a = (k * TAU) / N;
    const pitch = TAU / N;
    // Raking undercut Swiss escape tooth stalk + inclined club impulse plane at tip
    const rootLead = a - 0.14 * pitch;
    const kneeLead = a + 0.16 * pitch;
    const tipHeel = a + 0.34 * pitch;
    const tipToe = a + 0.50 * pitch; // Club impulse plane
    const backKnee = a + 0.24 * pitch;
    const rootTrail = a + 0.36 * pitch;
    const nextRootLead = ((k + 1) * TAU) / N - 0.14 * pitch;

    const p0x = rRoot * Math.cos(rootLead);
    const p0y = rRoot * Math.sin(rootLead);
    if (k === 0) {
      outerOnly.moveTo(p0x, p0y);
      combined.moveTo(p0x, p0y);
    } else {
      outerOnly.lineTo(p0x, p0y);
      combined.lineTo(p0x, p0y);
    }

    const pts = [
      [R * 0.87 * Math.cos(kneeLead), R * 0.87 * Math.sin(kneeLead)],
      [R * 0.985 * Math.cos(tipHeel), R * 0.985 * Math.sin(tipHeel)],
      [R * 1.015 * Math.cos(tipToe), R * 1.015 * Math.sin(tipToe)],
      [R * 0.84 * Math.cos(backKnee), R * 0.84 * Math.sin(backKnee)],
      [rRoot * Math.cos(rootTrail), rRoot * Math.sin(rootTrail)],
    ];
    for (const [px, py] of pts) {
      outerOnly.lineTo(px, py);
      combined.lineTo(px, py);
    }
    outerOnly.arc(0, 0, rRoot, rootTrail, nextRootLead, false);
    combined.arc(0, 0, rRoot, rootTrail, nextRootLead, false);
  }
  outerOnly.closePath();
  combined.closePath();

  // 5 slender beveled spokes
  const spokes = 5;
  const sector = TAU / spokes;
  for (let s = 0; s < spokes; s++) {
    const a0 = s * sector + 0.11;
    const a1 = (s + 1) * sector - 0.11;
    const b0 = s * sector + 0.075;
    const b1 = (s + 1) * sector - 0.075;
    const win = new Path2D();
    win.moveTo(rHub * Math.cos(a0), rHub * Math.sin(a0));
    win.lineTo(rInnerRim * Math.cos(b0), rInnerRim * Math.sin(b0));
    win.arc(0, 0, rInnerRim, b0, b1, false);
    win.lineTo(rHub * Math.cos(a1), rHub * Math.sin(a1));
    win.arc(0, 0, rHub, a1, a0, true);
    win.closePath();
    spokeWindows.addPath(win);
    combined.addPath(win);
  }

  const bore = new Path2D();
  bore.arc(0, 0, R * 0.075, 0, TAU);
  bore.closePath();
  combined.addPath(bore);

  const res = { R, rRoot, rInnerRim, rHub, outerOnly, spokeWindows, combined };
  escapeCache.set(key, res);
  return res;
}

/**
 * Draws the concentric 11.5-turn breathing Breguet overcoil hairspring.
 * Outer stud stays 100% stationary in bridge/cage frame while inner coils breathe
 * organically at 4.000 Hz coupled to balanceSin = sin(8 * pi * t).
 */
export function drawBreguetHairspring(ctx, rIn, rOut, balanceSin, opts = {}) {
  const turns = 10.5;
  const totalTheta = turns * TAU;
  const steps = 260;
  const breatheAmp = 0.058 * (rOut - rIn);
  const studAngle = opts.studAngle ?? -Math.PI * 0.35;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Build spiral path
  const spiral = new Path2D();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const th = studAngle + u * totalTheta;
    // Pinned at inner collet (u=0 -> rIn) and outer stud (u=1 -> rOut)
    const breathe = breatheAmp * balanceSin * Math.sin(Math.PI * u) * (1.0 - 0.25 * u);
    const r = rIn + (rOut - rIn) * u + breathe;
    const x = r * Math.cos(th);
    const y = r * Math.sin(th);
    if (i === 0) spiral.moveTo(x, y);
    else spiral.lineTo(x, y);
  }

  // Shadow pass for 3D depth over balance arms
  ctx.strokeStyle = 'rgba(4, 5, 8, 0.68)';
  ctx.lineWidth = Math.max(1.4, (rOut - rIn) * 0.032);
  ctx.save();
  ctx.translate(1.5, 2.2);
  ctx.stroke(spiral);
  ctx.restore();

  // Metallic Nivarox / heat-blued hairspring sheen
  const grad = ctx.createLinearGradient(-rOut, -rOut, rOut, rOut);
  grad.addColorStop(0.0, '#2B4B7E');
  grad.addColorStop(0.28, '#8FB6E8');
  grad.addColorStop(0.52, '#DCE6F2');
  grad.addColorStop(0.76, '#4A89DC');
  grad.addColorStop(1.0, '#1B3B6F');

  ctx.strokeStyle = grad;
  ctx.lineWidth = Math.max(1.05, (rOut - rIn) * 0.022);
  ctx.stroke(spiral);

  // Raised terminal Breguet overcoil S-curve sweeping from outer stud inward to 0.68 * rOut
  const endAngle = studAngle + totalTheta;
  const sx = rOut * Math.cos(endAngle);
  const sy = rOut * Math.sin(endAngle);
  const midAngle = endAngle + 0.85;
  const targetAngle = endAngle + 1.65;
  const rOver = rOut * 0.68;

  const overcoil = new Path2D();
  overcoil.moveTo(sx, sy);
  overcoil.bezierCurveTo(
    rOut * 0.96 * Math.cos(midAngle - 0.3),
    rOut * 0.96 * Math.sin(midAngle - 0.3),
    rOver * 1.12 * Math.cos(midAngle + 0.3),
    rOver * 1.12 * Math.sin(midAngle + 0.3),
    rOver * Math.cos(targetAngle),
    rOver * Math.sin(targetAngle)
  );
  ctx.strokeStyle = '#DCE6F2';
  ctx.lineWidth = Math.max(1.35, (rOut - rIn) * 0.028);
  ctx.stroke(overcoil);

  // Outer stationary stud block (rose-gold stud carrier + blued clamping screw)
  ctx.fillStyle = '#D49B6A';
  ctx.strokeStyle = '#F2C9A0';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(sx, sy, Math.max(3.2, rOut * 0.055), 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Builds the sculpted tri-spoke Vaucher Flying Tourbillon upper cage Path2D.
 */
export function buildTourbillonCagePath(R) {
  const outer = new Path2D();
  outer.arc(0, 0, R, 0, TAU);
  outer.closePath();

  const windows = new Path2D();
  const rInner = R * 0.86;
  const rHub = R * 0.20;
  const arms = 3;
  const sector = TAU / arms;

  for (let i = 0; i < arms; i++) {
    const a0 = i * sector + 0.135;
    const a1 = (i + 1) * sector - 0.135;
    const b0 = i * sector + 0.085;
    const b1 = (i + 1) * sector - 0.085;

    const win = new Path2D();
    win.moveTo(rHub * Math.cos(a0), rHub * Math.sin(a0));
    // Swept lyre-style curved cage arms
    const midR = R * 0.54;
    win.quadraticCurveTo(
      midR * Math.cos(a0 - 0.04),
      midR * Math.sin(a0 - 0.04),
      rInner * Math.cos(b0),
      rInner * Math.sin(b0)
    );
    win.arc(0, 0, rInner, b0, b1, false);
    win.quadraticCurveTo(
      midR * Math.cos(a1 + 0.04),
      midR * Math.sin(a1 + 0.04),
      rHub * Math.cos(a1),
      rHub * Math.sin(a1)
    );
    win.arc(0, 0, rHub, a1, a0, true);
    win.closePath();
    windows.addPath(win);
    outer.addPath(win);
  }

  const centerHole = new Path2D();
  centerHole.arc(0, 0, R * 0.09, 0, TAU);
  centerHole.closePath();
  outer.addPath(centerHole);

  return { combined: outer, windows, rInner, rHub };
}
