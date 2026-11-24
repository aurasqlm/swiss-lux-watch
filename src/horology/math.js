/**
 * src/horology/math.js
 * Deterministic PRNG (mulberry32), smooth-step interpolators, and exact continuous
 * horological physics for VAUCHER NOIR — CALIBER 01 (ZERO modulo loop snaps).
 */

export const TAU = Math.PI * 2;
export const DEG2RAD = Math.PI / 180;

/**
 * Deterministic 32-bit PRNG (mulberry32). Zero Math.random() anywhere in engine.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(x, min, max) {
  return x < min ? min : x > max ? max : x;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const u = clamp((x - edge0) / (edge1 - edge0 || 1e-9), 0, 1);
  return u * u * (3 - 2 * u);
}

/**
 * Quintic C2 smooth-step S_5(x) = 6x^5 - 15x^4 + 10x^3 on [0, 1].
 */
export function smootherstep01(x) {
  const u = clamp(x, 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
}

export function easeOutCubic(x) {
  const u = clamp(x, 0, 1);
  return 1 - Math.pow(1 - u, 3);
}

export function easeInOutCubic(x) {
  const u = clamp(x, 0, 1);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

/**
 * Exact zero-collision meshing phase law for two external involute gears:
 *   phi_2 = beta_12 + pi - pi / N_2 + (beta_12 - phi_1) * (N_1 / N_2)
 */
export function computeMeshedPhase(phi1, N1, N2, beta12) {
  return beta12 + Math.PI - Math.PI / N2 + (beta12 - phi1) * (N1 / N2);
}

/**
 * Canonical Caliber 01 Macro Going-Train Specification (module m = 10.0 px).
 * Positions, pitch radii, opposing angular velocities, and IEEE-754 exact meshing phases.
 */
export const MACRO_MODULE = 10.0;

export const GOING_TRAIN_SPECS = (() => {
  const m = MACRO_MODULE;
  const g0 = {
    id: 'G0',
    role: 'Mainspring Barrel',
    finish: 'carbon',
    N: 72,
    m,
    Rp: (m * 72) / 2, // 360
    x: 380.0,
    y: 740.0,
    omega: (-4 * Math.PI) / 45, // -16.00 deg/s
    phi: 0.0,
    spokes: 6,
    hubRatio: 0.28,
  };

  const beta01 = -27.0 * DEG2RAD; // -0.47123889803846897
  const c01 = (m * (72 + 48)) / 2; // 600
  const g1 = {
    id: 'G1',
    role: 'Center Going Wheel',
    finish: 'roseGold',
    N: 48,
    m,
    Rp: (m * 48) / 2, // 240
    x: g0.x + c01 * Math.cos(beta01),
    y: g0.y + c01 * Math.sin(beta01),
    betaFromPrev: beta01,
    omega: -g0.omega * (72 / 48), // +24.00 deg/s
    phi: computeMeshedPhase(g0.phi, 72, 48, beta01),
    spokes: 5,
    hubRatio: 0.22,
  };

  const beta12 = 0.35; // +20.0535 deg
  const c12 = (m * (48 + 24)) / 2; // 360
  const g2 = {
    id: 'G2',
    role: 'Third Intermediate Wheel',
    finish: 'rhodium',
    N: 24,
    m,
    Rp: (m * 24) / 2, // 120
    x: g1.x + c12 * Math.cos(beta12),
    y: g1.y + c12 * Math.sin(beta12),
    betaFromPrev: beta12,
    omega: -g1.omega * (48 / 24), // -48.00 deg/s
    phi: computeMeshedPhase(g1.phi, 48, 24, beta12),
    spokes: 5,
    hubRatio: 0.25,
  };

  const beta23 = -25.0 * DEG2RAD; // -0.4363323129985824
  const c23 = (m * (24 + 16)) / 2; // 200
  const g3 = {
    id: 'G3',
    role: 'Fourth / Escape Drive Wheel',
    finish: 'roseGold',
    N: 16,
    m,
    Rp: (m * 16) / 2, // 80
    x: g2.x + c23 * Math.cos(beta23),
    y: g2.y + c23 * Math.sin(beta23),
    betaFromPrev: beta23,
    omega: -g2.omega * (24 / 16), // +72.00 deg/s (12 rpm)
    phi: computeMeshedPhase(g2.phi, 24, 16, beta23),
    spokes: 4,
    hubRatio: 0.28,
  };

  return Object.freeze([g0, g1, g2, g3]);
})();

/**
 * Computes exact continuous horological angles for any unbounded timestamp t (seconds).
 * ZERO modulo wrapping on angles or phases.
 */
export function getHorologyState(t) {
  // 1. Going-train gear angles: theta_i(t) = phi_i + omega_i * t
  const gearAngles = GOING_TRAIN_SPECS.map((g) => g.phi + g.omega * t);

  // 2. Free-sprung 4.000 Hz (28,800 vph = 8 beats/sec) balance wheel
  // Zero crossings occur at t_k = 0.125 * k seconds.
  const balancePhase = 8.0 * Math.PI * t;
  const balanceSin = Math.sin(balancePhase);
  const balanceAngle = 4.20 * balanceSin; // +/- 240.64 deg

  // 3. Swiss lever pallet fork: crisp hyperbolic-tangent lock & impulse flip at 8 beats/s
  const palletAngle = 0.096 * Math.tanh(14.0 * balanceSin); // +/- 5.50 deg

  // 4. 20-tooth club-tooth escape wheel: monotonic C2 quintic staircase
  // Advances pi/20 rad (9.00 deg) per 125ms impulse = 12.000 rev/min (1 rev / 5.0s)
  const w = 0.22;
  const us = 8.0 * t + 0.5;
  const nStep = Math.floor(us);
  const fu = us - nStep;
  const stepFrac = smootherstep01((fu - (0.5 - w / 2)) / w);
  const escapeAngle = -0.11 + (nStep - 0.5 + stepFrac) * (Math.PI / 20.0);

  // 5. 60.0s Flying Tourbillon cage (+6.00 deg/s CW, 96:8 fixed-fourth-wheel ratio)
  const tourbillonCageAngle = -0.26 + (TAU / 60.0) * t;

  // 6. Classic 10:10 luxury hero dial hands (anchored at 10:09:30.0 at t=0 -> 10:10:17.5 at t=47.5s)
  const secHandAngle = -Math.PI / 2 + (TAU / 60.0) * (30.0 + t);
  const minHandAngle = -Math.PI / 2 + (TAU / 3600.0) * (570.0 + t);
  const hourHandAngle = -Math.PI / 2 + (TAU / 43200.0) * (36570.0 + t);

  // 7. Impulse flash envelope (subtle mechanical energy peak right at each 125ms beat)
  const beatDist = Math.abs(balanceSin); // 0 at impulse, 1 at turnaround
  const impulseGlow = Math.exp(-32.0 * beatDist * beatDist);

  return {
    t,
    gearAngles,
    balanceAngle,
    balanceSin,
    palletAngle,
    escapeAngle,
    tourbillonCageAngle,
    secHandAngle,
    minHandAngle,
    hourHandAngle,
    impulseGlow,
  };
}

/**
 * S12 Chronograph central trotteuse launch (continuous on localT in [0, 2.0s]).
 */
export function getChronoAngle(localT) {
  const lt = Math.max(0, localT);
  const clutchSnap = 0.34 * (1 - Math.exp(-28.0 * lt) * Math.cos(36.0 * lt));
  const uc = 8.0 * lt;
  const nc = Math.floor(uc);
  const fc = uc - nc;
  const sweepSteps = ((nc + smootherstep01((fc - 0.25) / 0.45)) / 8.0) * 4.2;
  return -Math.PI / 2 - 0.22 + clutchSnap + (TAU / 60.0) * sweepSteps;
}
