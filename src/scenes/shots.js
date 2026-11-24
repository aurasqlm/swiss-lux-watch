/**
 * src/scenes/shots.js
 * Strictly isolated 21-shot scene renderers (S01..S21) for VAUCHER NOIR — CALIBER 01.
 * Every shot renders into a freshly cleared context with ZERO shared mutable state.
 */

import {
  TAU,
  GOING_TRAIN_SPECS,
  getHorologyState,
  lerp,
  smoothstep,
  easeOutCubic,
  easeInOutCubic,
} from '../horology/math.js';
import {
  initMaterials,
  createMetallicConicGradient,
  drawCotesDeGeneveBridge,
  drawInvoluteGear,
  drawRubyJewel,
  drawBluedScrew,
  drawEscapementPair,
  drawBalanceWheelAssembly,
  drawFlyingTourbillon,
} from '../horology/materials.js';
import {
  drawFullWatch,
  drawAppliedBatonIndex,
  buildRoundedOctagonPath,
} from '../horology/watchAssembly.js';

const W = 1920;
const H = 1080;

/**
 * Renders a subtle dark studio rim-lit obsidian backdrop so #060608 never looks flat or muddy.
 */
function drawStudioBackdrop(ctx, keyX = 960, keyY = 480, warmIntensity = 0.11, coolIntensity = 0.05) {
  ctx.fillStyle = '#060608';
  ctx.fillRect(0, 0, W, H);

  const warm = ctx.createRadialGradient(keyX, keyY, 40, keyX, keyY, 920);
  warm.addColorStop(0.0, `rgba(212, 155, 106, ${warmIntensity.toFixed(3)})`);
  warm.addColorStop(0.42, `rgba(34, 28, 28, ${(warmIntensity * 0.55).toFixed(3)})`);
  warm.addColorStop(1.0, 'rgba(6, 6, 8, 0.0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);

  if (coolIntensity > 0) {
    const cool = ctx.createRadialGradient(W - keyX * 0.6, H - keyY * 0.5, 60, W - keyX * 0.6, H - keyY * 0.5, 860);
    cool.addColorStop(0.0, `rgba(220, 230, 242, ${coolIntensity.toFixed(3)})`);
    cool.addColorStop(1.0, 'rgba(6, 6, 8, 0.0)');
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, W, H);
  }
}

/**
 * Helper: renders sculpted 4-point 18k Rose-Gold Vaucher Star emblem at (cx, cy).
 */
function drawVaucherEmblem(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 2);
    ctx.fillStyle = i % 2 === 0 ? '#FCE2C4' : '#D49B6A';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.22, -r * 0.34);
    ctx.lineTo(0, -r);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7A4E2D';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    ctx.lineTo(r * 0.22, -r * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Helper: crisp Canvas + optional SVG luxury centered headline lockup with tapered gold rules.
 */
function drawCenteredLuxuryCard(ctx, text, subLabel, progress, opts = {}) {
  const enter = easeOutCubic(Math.min(1, progress * 3.8));
  const y = opts.y ?? 540;
  const fontSize = opts.fontSize ?? 66;
  const trackingPx = opts.trackingPx ?? 18;

  ctx.save();
  ctx.globalAlpha = enter;

  // Tapered 18k Rose-Gold horizontal rule above & below
  const ruleW = lerp(180, opts.ruleWidth ?? 420, enter);
  for (const dy of [-74, 74]) {
    const rg = ctx.createLinearGradient(960 - ruleW, y + dy, 960 + ruleW, y + dy);
    rg.addColorStop(0.0, 'rgba(212, 155, 106, 0.0)');
    rg.addColorStop(0.5, 'rgba(242, 201, 160, 0.78)');
    rg.addColorStop(1.0, 'rgba(212, 155, 106, 0.0)');
    ctx.strokeStyle = rg;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(960 - ruleW, y + dy);
    ctx.lineTo(960 + ruleW, y + dy);
    ctx.stroke();
  }

  drawVaucherEmblem(ctx, 960, y - 112, 18);

  // Subtle engraved gold drop shadow + Warm Ivory Cinzel headline
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${fontSize}px "Cinzel", serif`;
  ctx.letterSpacing = `${trackingPx}px`;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillText(text, 960 + trackingPx * 0.5 + 2, y + 3);

  const tg = ctx.createLinearGradient(960 - 360, y - 34, 960 + 360, y + 34);
  tg.addColorStop(0.0, '#E8DFD1');
  tg.addColorStop(0.48, '#FFFDF9');
  tg.addColorStop(0.55, '#F3ECE1');
  tg.addColorStop(1.0, '#D49B6A');
  ctx.fillStyle = tg;
  ctx.fillText(text, 960 + trackingPx * 0.5, y);

  if (subLabel) {
    ctx.font = `500 15px "Montserrat", sans-serif`;
    ctx.letterSpacing = '7px';
    ctx.fillStyle = 'rgba(212, 155, 106, 0.85)';
    ctx.fillText(subLabel, 963.5, y + 112);
  }

  ctx.letterSpacing = '0px';
  ctx.restore();
}

// ============================================================================
// CHUNK 1 (00:00–00:10) — THE HEARTBEAT IN THE DARK
// ============================================================================

function renderS01_BezelGlint(ctx, localT, globalT, u) {
  drawStudioBackdrop(ctx, 760 + u * 420, 420, 0.09, 0.03);

  // Grazing macro arc of beveled 18k Rose-Gold bezel & brushed obsidian case emerging from pitch black
  const zoom = lerp(1.0, 1.07, u);
  const glintAngle = lerp(-1.38, -0.18, easeInOutCubic(u));

  drawFullWatch(ctx, {
    cx: 1180,
    cy: 860,
    dialR: 590 * zoom,
    globalT,
    lightAngle: glintAngle,
    rotation: -0.18,
  });

  // Dramatic dark foreground shadow mask so only the grazing bezel chamfer & upper dial catch studio rim-light
  const mask = ctx.createRadialGradient(780 + u * 260, 390, 90, 960, 620, 980);
  mask.addColorStop(0.0, 'rgba(6, 6, 8, 0.0)');
  mask.addColorStop(0.52, 'rgba(6, 6, 8, 0.52)');
  mask.addColorStop(0.84, 'rgba(6, 6, 8, 0.92)');
  mask.addColorStop(1.0, 'rgba(6, 6, 8, 0.98)');
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, W, H);

  // Traveling razor-thin specular glint star along the 45-deg bezel chamfer
  const rBezel = 590 * zoom * 1.21;
  const gx = 1180 + rBezel * Math.cos(glintAngle - 0.55);
  const gy = 860 + rBezel * Math.sin(glintAngle - 0.55);
  const flare = ctx.createRadialGradient(gx, gy, 1, gx, gy, 145);
  flare.addColorStop(0.0, 'rgba(255, 250, 242, 0.95)');
  flare.addColorStop(0.18, 'rgba(242, 201, 160, 0.58)');
  flare.addColorStop(0.55, 'rgba(220, 230, 242, 0.12)');
  flare.addColorStop(1.0, 'rgba(212, 155, 106, 0.0)');
  ctx.fillStyle = flare;
  ctx.beginPath();
  ctx.arc(gx, gy, 145, 0, TAU);
  ctx.fill();
}

function renderS02_RubyBalance4Hz(ctx, localT, globalT, u) {
  const tex = initMaterials();
  const state = getHorologyState(globalT);
  const zoom = lerp(1.0, 1.06, u);
  const lightAngle = -0.62 + 0.18 * u;

  drawStudioBackdrop(ctx, 960, 520, 0.13, 0.05);

  ctx.save();
  ctx.translate(960, 540);
  ctx.scale(zoom, zoom);

  // Recessed engine-turned Perlage mainplate floor
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.drawImage(tex.perlagePlate, -980, -560, 1960, 1120);
  ctx.restore();

  const floorVig = ctx.createRadialGradient(0, 0, 180, 0, 0, 920);
  floorVig.addColorStop(0.0, 'rgba(6, 6, 8, 0.15)');
  floorVig.addColorStop(1.0, 'rgba(6, 6, 8, 0.88)');
  ctx.fillStyle = floorVig;
  ctx.fillRect(-1000, -600, 2000, 1200);

  // Flanking Côtes de Genève movement bridges
  const leftBridge = new Path2D();
  leftBridge.moveTo(-980, -560);
  leftBridge.lineTo(-290, -560);
  leftBridge.quadraticCurveTo(-410, 0, -260, 560);
  leftBridge.lineTo(-980, 560);
  leftBridge.closePath();
  drawCotesDeGeneveBridge(ctx, leftBridge, { x0: -980, y0: -560, x1: -250, y1: 560 }, lightAngle * 2.5, {
    ribWidth: 42,
    chamferGold: true,
    bevelWidth: 3.4,
  });
  drawBluedScrew(ctx, -430, -240, 20, 0.45, lightAngle);
  drawBluedScrew(ctx, -410, 250, 20, -0.65, lightAngle);

  // Adjacent Swiss Lever Pallet Fork & 20T Club-Tooth Escape Wheel at right-lower quadrant!
  // (Allows Gate 2 Row B2 frames 96..100 to verify BOTH 4Hz balance zero-crossing AND 20T +9 deg step!)
  drawEscapementPair(ctx, 435, 155, 165, globalT, lightAngle, {
    forkAxisAngle: -Math.PI * 0.84,
  });

  // Hero 4.000 Hz Free-Sprung 18k Rose-Gold Balance Wheel + Breathing Breguet Overcoil + Ruby Shock Jewel
  drawBalanceWheelAssembly(ctx, -55, -10, 340, globalT, lightAngle, {
    studAngle: -Math.PI * 0.28,
  });

  // Upper sculpted 18k Rose-Gold & Carbon Balance Cock Bridge spanning into the central ruby chaton
  const cock = new Path2D();
  cock.moveTo(980, -320);
  cock.lineTo(980, -110);
  cock.quadraticCurveTo(380, -95, 25, 36);
  cock.arc(-55, -10, 86, 0.52, -0.78, true);
  cock.quadraticCurveTo(360, -240, 980, -320);
  cock.closePath();

  const cockHole = new Path2D();
  cockHole.arc(-55, -10, 62, 0, TAU);
  cockHole.closePath();
  cock.addPath(cockHole);

  drawCotesDeGeneveBridge(ctx, cock, { x0: -160, y0: -340, x1: 980, y1: 90 }, lightAngle * 2.5, {
    ribWidth: 36,
    chamferGold: true,
    bevelWidth: 3.2,
  });

  // Re-crown the central Pigeon-Blood Ruby Jewel + Gold Chaton + Incabloc Lyre on top of the balance cock!
  drawRubyJewel(ctx, -55, -10, 44, lightAngle, {
    withChaton: true,
    chatonRatio: 1.44,
    incabloc: true,
    capJewel: true,
  });

  // Subtle ruby impulse glint at exact 125ms escapement zero-crossings
  if (state.impulseGlow > 0.05) {
    const ig = ctx.createRadialGradient(-55, -10, 4, -55, -10, 130);
    ig.addColorStop(0.0, `rgba(255, 160, 180, ${(0.35 * state.impulseGlow).toFixed(3)})`);
    ig.addColorStop(1.0, 'rgba(158, 27, 50, 0.0)');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(-55, -10, 130, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

function renderS03_Title312Comp(ctx, localT, globalT, u) {
  drawStudioBackdrop(ctx, 960, 540, 0.08, 0.02);

  // Subtle 7%-luminance architectural silhouette of Caliber 01 going train in background void
  ctx.save();
  ctx.globalAlpha = 0.085;
  const state = getHorologyState(globalT);
  for (let i = 0; i < GOING_TRAIN_SPECS.length; i++) {
    drawInvoluteGear(ctx, GOING_TRAIN_SPECS[i], state.gearAngles[i], -0.6, {
      shadow: false,
      extrudePx: 1.5,
    });
  }
  ctx.restore();

  drawCenteredLuxuryCard(ctx, '312 COMPONENTS.', 'HAND-FINISHED IN GENEVA', u, {
    fontSize: 66,
    trackingPx: 18,
    ruleWidth: 440,
  });
}

// ============================================================================
// CHUNK 2 (00:10–00:20) — INTERLOCKING PRECISION
// ============================================================================

function renderS04_InvoluteTrain(ctx, localT, globalT, u) {
  // Style Frame Q3 @ f = 336 (t = 11.200s) & Gate 2 Motion Strip @ f = 336..340!
  const tex = initMaterials();
  const state = getHorologyState(globalT);
  const lightAngle = -0.58 + 0.16 * u;

  drawStudioBackdrop(ctx, 1020, 480, 0.15, 0.06);

  // Subtle slow cinema camera push framing all 4 meshed involute wheels & pitch points cleanly
  const camScale = lerp(1.06, 1.11, u);

  ctx.save();
  ctx.translate(960, 540);
  ctx.scale(camScale, camScale);
  // Center camera on the primary meshing triad (G0 <-> G1 <-> G2 <-> G3) around (1010, 555)
  ctx.translate(-1015, -552);

  // 1. Deep Engine-Turned Perlage Mainplate Floor
  ctx.save();
  for (let py = -120; py < 1280; py += 512) {
    for (let px = -120; px < 2080; px += 512) {
      ctx.drawImage(tex.perlagePlate, px, py, 512, 512);
    }
  }
  ctx.fillStyle = 'rgba(5, 6, 9, 0.42)';
  ctx.fillRect(-120, -120, 2200, 1400);
  ctx.restore();

  // 2. Lower Recessed Côtes de Genève Mainplate Architecture framing the wheel wells
  const lowerBridge = new Path2D();
  lowerBridge.moveTo(-80, -80);
  lowerBridge.lineTo(2060, -80);
  lowerBridge.lineTo(2060, 260);
  lowerBridge.quadraticCurveTo(1380, 210, 920, 155);
  lowerBridge.quadraticCurveTo(420, 110, -80, 310);
  lowerBridge.closePath();
  drawCotesDeGeneveBridge(ctx, lowerBridge, { x0: -80, y0: -80, x1: 2060, y1: 320 }, lightAngle * 2.2, {
    ribWidth: 38,
    chamferGold: true,
    bevelWidth: 3.0,
  });

  const botBridge = new Path2D();
  botBridge.moveTo(760, 830);
  botBridge.quadraticCurveTo(1260, 740, 2060, 680);
  botBridge.lineTo(2060, 1220);
  botBridge.lineTo(680, 1220);
  botBridge.closePath();
  drawCotesDeGeneveBridge(ctx, botBridge, { x0: 680, y0: 680, x1: 2060, y1: 1220 }, lightAngle * 2.2 + 0.6, {
    ribWidth: 38,
    chamferGold: true,
    bevelWidth: 3.0,
  });

  drawBluedScrew(ctx, 1180, 105, 15, 0.5, lightAngle);
  drawBluedScrew(ctx, 1540, 130, 15, -0.7, lightAngle);
  drawBluedScrew(ctx, 1140, 885, 16, 1.1, lightAngle);
  drawBluedScrew(ctx, 1590, 815, 16, -0.3, lightAngle);
  drawRubyJewel(ctx, 1360, 118, 17, lightAngle);
  drawRubyJewel(ctx, 1380, 855, 18, lightAngle);

  // 3. Coiled 18k Rose-Gold Mainspring visible inside G0 Openworked Carbon Barrel (380, 740)!
  const g0 = GOING_TRAIN_SPECS[0];
  ctx.save();
  ctx.translate(g0.x, g0.y);
  ctx.fillStyle = '#08090D';
  ctx.beginPath();
  ctx.arc(0, 0, g0.Rp * 0.82, 0, TAU);
  ctx.fill();
  for (let c = 0; c < 9; c++) {
    const cr = g0.Rp * (0.30 + c * 0.052);
    ctx.strokeStyle = c % 2 === 0 ? 'rgba(212, 155, 106, 0.52)' : 'rgba(122, 78, 45, 0.36)';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Render Exact Zero-Collision Meshing Involute Gear Train (G0=72T, G1=48T, G2=24T, G3=16T)
  // Order stacked realistically along horological arbors: G0 & G2 lower plane, G1 & G3 upper plane
  drawInvoluteGear(ctx, GOING_TRAIN_SPECS[0], state.gearAngles[0], lightAngle, {
    extrudePx: 4.2,
  });
  drawInvoluteGear(ctx, GOING_TRAIN_SPECS[2], state.gearAngles[2], lightAngle, {
    extrudePx: 3.6,
  });
  drawInvoluteGear(ctx, GOING_TRAIN_SPECS[1], state.gearAngles[1], lightAngle, {
    extrudePx: 4.5,
  });
  drawInvoluteGear(ctx, GOING_TRAIN_SPECS[3], state.gearAngles[3], lightAngle, {
    extrudePx: 3.4,
  });

  // 5. Sleek Upper Skeleton Train Finger Bridge connecting G2 & G3 ruby bearings without hiding mesh zones!
  const finger = new Path2D();
  finger.moveTo(1680, 320);
  finger.lineTo(1920, 390);
  finger.lineTo(1510, 560);
  finger.arc(GOING_TRAIN_SPECS[3].x, GOING_TRAIN_SPECS[3].y, 32, 0.8, -1.9, true);
  finger.closePath();
  drawCotesDeGeneveBridge(ctx, finger, { x0: 1390, y0: 310, x1: 1920, y1: 570 }, lightAngle * 2.4, {
    ribWidth: 28,
    chamferGold: true,
    bevelWidth: 2.4,
  });
  drawRubyJewel(ctx, GOING_TRAIN_SPECS[3].x, GOING_TRAIN_SPECS[3].y, 14, lightAngle);
  drawBluedScrew(ctx, 1690, 392, 13, 0.85, lightAngle);

  ctx.restore();
}

function renderS05_PalletForkLock(ctx, localT, globalT, u) {
  const tex = initMaterials();
  const lightAngle = -0.72 + 0.22 * u;
  const zoom = lerp(1.0, 1.07, u);

  drawStudioBackdrop(ctx, 880, 520, 0.14, 0.05);

  ctx.save();
  ctx.translate(960, 540);
  ctx.scale(zoom, zoom);

  ctx.drawImage(tex.perlagePlate, -980, -560, 1960, 1120);
  ctx.fillStyle = 'rgba(5, 6, 10, 0.48)';
  ctx.fillRect(-980, -560, 1960, 1120);

  // Flanking skeleton bridge on left
  const palletBridge = new Path2D();
  palletBridge.moveTo(-960, -540);
  palletBridge.lineTo(-220, -540);
  palletBridge.lineTo(-140, -140);
  palletBridge.lineTo(-480, 260);
  palletBridge.lineTo(-960, 220);
  palletBridge.closePath();
  drawCotesDeGeneveBridge(ctx, palletBridge, { x0: -960, y0: -540, x1: -140, y1: 260 }, lightAngle * 2.5, {
    ribWidth: 38,
    chamferGold: true,
    bevelWidth: 3.2,
  });
  drawBluedScrew(ctx, -360, -280, 19, 0.6, lightAngle);
  drawRubyJewel(ctx, -260, -195, 20, lightAngle);

  // Extreme macro of 20T Club-Tooth Escape Wheel + Clicking Swiss Lever Pallet Fork & Ruby Stones
  drawEscapementPair(ctx, 180, 85, 315, globalT, lightAngle, {
    forkAxisAngle: -Math.PI * 0.76,
  });

  ctx.restore();
}

function renderS06_CotesDeGeneve(ctx, localT, globalT, u) {
  const tex = initMaterials();
  // Dramatic sweeping studio key-light rolling across Côtes de Genève ribs!
  const sweepPhase = lerp(-1.8, 3.2, easeInOutCubic(u));
  const lightAngle = -0.85 + 0.65 * u;

  drawStudioBackdrop(ctx, lerp(480, 1440, u), 480, 0.15, 0.06);

  ctx.save();
  const zoom = lerp(1.04, 1.0, u);
  ctx.translate(960, 540);
  ctx.scale(zoom, zoom);
  ctx.translate(-960, -540);

  // Underlying Perlage movement cavity & meshed rose-gold wheel peeking through bridge apertures
  ctx.drawImage(tex.perlagePlate, 0, 0, W, H);
  const state = getHorologyState(globalT);
  drawInvoluteGear(
    ctx,
    { N: 48, m: 9.5, x: 520, y: 610, finish: 'roseGold', spokes: 5, hubRatio: 0.24 },
    state.gearAngles[1],
    lightAngle
  );
  drawInvoluteGear(
    ctx,
    { N: 32, m: 9.5, x: 1410, y: 460, finish: 'roseGold', spokes: 5, hubRatio: 0.25 },
    state.gearAngles[3],
    lightAngle
  );

  // Grand sculpted Geneva caliber bridge with two circular bevel cutouts & dramatic 45-deg gold anglage
  const mainBridge = new Path2D();
  mainBridge.moveTo(90, 120);
  mainBridge.lineTo(1830, 120);
  mainBridge.lineTo(1740, 960);
  mainBridge.lineTo(180, 960);
  mainBridge.closePath();

  const cut1 = new Path2D();
  cut1.arc(520, 610, 215, 0, TAU);
  cut1.closePath();
  mainBridge.addPath(cut1);

  const cut2 = new Path2D();
  cut2.arc(1410, 460, 165, 0, TAU);
  cut2.closePath();
  mainBridge.addPath(cut2);

  drawCotesDeGeneveBridge(ctx, mainBridge, { x0: 90, y0: 120, x1: 1830, y1: 960 }, sweepPhase, {
    ribWidth: 46,
    angleDeg: -22,
    chamferGold: true,
    bevelWidth: 4.2,
  });

  // 2 Hero Pigeon-Blood Ruby Jewel Chatons + 4 Heat-Blued Micro-Screws + Engraved Caliber Plate
  drawRubyJewel(ctx, 960, 430, 34, lightAngle, { withChaton: true, chatonRatio: 1.46 });
  drawRubyJewel(ctx, 985, 710, 26, lightAngle, { withChaton: true, chatonRatio: 1.42 });

  drawBluedScrew(ctx, 310, 250, 20, 0.35, lightAngle);
  drawBluedScrew(ctx, 1610, 250, 20, -0.55, lightAngle);
  drawBluedScrew(ctx, 820, 835, 20, 1.05, lightAngle);
  drawBluedScrew(ctx, 1560, 825, 20, -0.25, lightAngle);

  // Gold-filled bridge engraving: CALIBER 01 — THIRTY-THREE (33) JEWELS
  ctx.save();
  ctx.translate(960, 245);
  ctx.textAlign = 'center';
  ctx.font = '600 22px "Cinzel", serif';
  ctx.letterSpacing = '9px';
  ctx.fillStyle = 'rgba(242, 201, 160, 0.78)';
  ctx.fillText('CALIBER 01  •  GENÈVE', 4.5, 0);
  ctx.font = '500 13px "Montserrat", sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillStyle = 'rgba(212, 155, 106, 0.62)';
  ctx.fillText('THIRTY-THREE (33) RUBY JEWELS  •  FIVE POSITIONS', 3, 30);
  ctx.restore();

  ctx.restore();
}

function renderS07_TitleZeroTol(ctx, localT, globalT, u) {
  drawStudioBackdrop(ctx, 960, 540, 0.08, 0.03);

  // Ultra-faint horological technical caliper circles & tolerances at 6% luminance
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 155, 106, 0.09)';
  ctx.lineWidth = 1.0;
  for (const r of [260, 380, 490]) {
    ctx.beginPath();
    ctx.arc(960, 540, r, 0, TAU);
    ctx.stroke();
  }
  // Precision vernier caliper ticks left & right
  for (let i = -8; i <= 8; i++) {
    const y = 540 + i * 24;
    const len = i % 4 === 0 ? 28 : 14;
    ctx.strokeStyle = i === 0 ? 'rgba(242, 201, 160, 0.45)' : 'rgba(212, 155, 106, 0.18)';
    ctx.beginPath();
    ctx.moveTo(260, y);
    ctx.lineTo(260 + len, y);
    ctx.moveTo(1660 - len, y);
    ctx.lineTo(1660, y);
    ctx.stroke();
  }
  ctx.restore();

  drawCenteredLuxuryCard(ctx, 'ZERO TOLERANCE.', 'MICRON-LEVEL CHRONOMETRIC PRECISION  •  ±0.002 MM', u, {
    fontSize: 66,
    trackingPx: 18,
    ruleWidth: 460,
  });
}

// ============================================================================
// CHUNK 3 (00:20–00:30) — THE FLYING TOURBILLON
// ============================================================================

function renderS08_TourbillonCage(ctx, localT, globalT, u) {
  // Style Frame Q1 @ f = 645 (t = 21.500s): Macro Rose-Gold Flying Tourbillon!
  const tex = initMaterials();
  const state = getHorologyState(globalT);
  const zoom = lerp(1.0, 1.055, u);
  const lightAngle = -0.64 + 0.14 * u;

  drawStudioBackdrop(ctx, 960, 500, 0.16, 0.06);

  // Frame directly onto the 6:00 Flying Tourbillon sub-aperture surrounded by the real
  // skeletonized obsidian dial architecture (indices 4, 5, 7, 8, Côtes de Genève bridges, SWISS MADE)!
  const macroDialR = 1040 * zoom;
  const dialCenterX = 960;
  const dialCenterY = 540 - macroDialR * 0.425; // Centers the 6:00 tourbillon dead-on at (960, 540)!

  ctx.save();
  ctx.translate(dialCenterX, dialCenterY);

  // 1. Surrounding Perlage & Meshed Going-Train Wheels above the tourbillon
  ctx.drawImage(tex.perlagePlate, -macroDialR, -macroDialR * 0.2, macroDialR * 2, macroDialR * 1.4);
  ctx.fillStyle = 'rgba(5, 6, 9, 0.46)';
  ctx.fillRect(-macroDialR, -macroDialR * 0.2, macroDialR * 2, macroDialR * 1.4);

  drawInvoluteGear(
    ctx,
    { N: 28, m: macroDialR * 0.009, x: macroDialR * 0.35, y: macroDialR * 0.08, finish: 'roseGold', spokes: 4, hubRatio: 0.26 },
    state.gearAngles[3],
    lightAngle,
    { extrudePx: 5 }
  );
  drawInvoluteGear(
    ctx,
    { N: 28, m: macroDialR * 0.009, x: -macroDialR * 0.35, y: macroDialR * 0.08, finish: 'rhodium', spokes: 4, hubRatio: 0.26 },
    -state.gearAngles[3],
    lightAngle,
    { extrudePx: 5 }
  );

  // 2. Flanking Côtes de Genève Skeleton Wing Bridges with 45-deg 18k Rose-Gold Anglage
  const wings = new Path2D();
  wings.moveTo(-macroDialR * 0.85, -macroDialR * 0.12);
  wings.lineTo(-macroDialR * 0.22, -macroDialR * 0.04);
  wings.lineTo(-macroDialR * 0.16, macroDialR * 0.16);
  wings.lineTo(-macroDialR * 0.44, macroDialR * 0.45);
  wings.lineTo(-macroDialR * 0.85, macroDialR * 0.28);
  wings.closePath();

  wings.moveTo(macroDialR * 0.85, -macroDialR * 0.12);
  wings.lineTo(macroDialR * 0.22, -macroDialR * 0.04);
  wings.lineTo(macroDialR * 0.16, macroDialR * 0.16);
  wings.lineTo(macroDialR * 0.44, macroDialR * 0.45);
  wings.lineTo(macroDialR * 0.85, macroDialR * 0.28);
  wings.closePath();

  drawCotesDeGeneveBridge(
    ctx,
    wings,
    { x0: -macroDialR * 0.85, y0: -macroDialR * 0.15, x1: macroDialR * 0.85, y1: macroDialR * 0.48 },
    lightAngle * 2.2,
    { ribWidth: 38, chamferGold: true, bevelWidth: 3.8 }
  );

  drawRubyJewel(ctx, -macroDialR * 0.28, macroDialR * 0.07, 19, lightAngle);
  drawRubyJewel(ctx, macroDialR * 0.28, macroDialR * 0.07, 19, lightAngle);
  drawBluedScrew(ctx, -macroDialR * 0.46, macroDialR * 0.28, 16, 1.1, lightAngle);
  drawBluedScrew(ctx, macroDialR * 0.46, macroDialR * 0.28, 16, -1.1, lightAngle);

  // 3. Lower Radial-Brushed Obsidian Chapter Ring, 18k Rose-Gold Inner Bezel Rim & Applied Indices
  const chapIn = macroDialR * 0.735;
  const chapOut = macroDialR * 1.03;
  const chap = new Path2D();
  chap.arc(0, 0, chapOut, 0, TAU);
  chap.closePath();
  const chapHole = new Path2D();
  chapHole.arc(0, 0, chapIn, 0, TAU);
  chapHole.closePath();
  chap.addPath(chapHole);

  ctx.save();
  ctx.clip(chap, 'evenodd');
  ctx.drawImage(tex.brushedObsidian, -macroDialR * 1.05, -macroDialR * 1.05, macroDialR * 2.1, macroDialR * 2.1);
  ctx.restore();

  // Warm 18k Rose-Gold stepped bezel surround framing the lower-left & lower-right macro corners!
  const bezelSurround = new Path2D();
  bezelSurround.arc(0, 0, macroDialR * 1.32, 0, TAU);
  bezelSurround.closePath();
  const bezelHole = new Path2D();
  bezelHole.arc(0, 0, chapOut, 0, TAU);
  bezelHole.closePath();
  bezelSurround.addPath(bezelHole);

  ctx.fillStyle = createMetallicConicGradient(ctx, 0, 0, lightAngle, 'roseGold');
  ctx.fill(bezelSurround, 'evenodd');
  ctx.save();
  ctx.clip(bezelSurround, 'evenodd');
  ctx.globalAlpha = 0.55;
  ctx.drawImage(tex.circularGrain, -macroDialR * 1.32, -macroDialR * 1.32, macroDialR * 2.64, macroDialR * 2.64);
  ctx.restore();

  ctx.strokeStyle = '#FCE2C4';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, chapOut, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = createMetallicConicGradient(ctx, 0, 0, lightAngle, 'roseGold');
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.arc(0, 0, chapIn, 0, TAU);
  ctx.stroke();

  for (const h of [4, 5, 7, 8]) {
    const a = (h * TAU) / 12 - Math.PI / 2;
    drawAppliedBatonIndex(ctx, a, macroDialR * 0.755, macroDialR * 0.89, 14, lightAngle);
  }

  // SWISS MADE markings flanking bottom of tourbillon
  ctx.fillStyle = 'rgba(212, 155, 106, 0.82)';
  ctx.font = '500 18px "Montserrat", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [label, degOff] of [
    ['SWISS', 107],
    ['MADE', 73],
  ]) {
    const a = (degOff * Math.PI) / 180;
    const sr = macroDialR * 0.86;
    ctx.save();
    ctx.translate(sr * Math.cos(a), sr * Math.sin(a));
    ctx.rotate(a - Math.PI / 2);
    ctx.letterSpacing = '4px';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  // 4. Centerpiece Hero 60s 18k Rose-Gold Flying Tourbillon at (0, macroDialR * 0.425) == (960, 540)!
  drawFlyingTourbillon(
    ctx,
    0,
    macroDialR * 0.425,
    345 * zoom,
    globalT,
    lightAngle
  );

  ctx.restore();
}

function renderS09_BluedScrews(ctx, localT, globalT, u) {
  // Tight oblique macro on tourbillon rim & carbon bridge where heat-blued micro-screws
  // (#1B3B6F -> #4A89DC) & gold timing weights gleam in shifting rim-light
  const lightAngle = lerp(-1.1, 0.2, u);
  drawStudioBackdrop(ctx, 1120, 440, 0.14, 0.08);

  ctx.save();
  ctx.translate(640, 620);
  ctx.rotate(-0.14);

  const bPath = new Path2D();
  bPath.moveTo(140, -680);
  bPath.lineTo(1420, -680);
  bPath.lineTo(1420, 560);
  bPath.lineTo(260, 560);
  bPath.arc(0, 0, 510, 0.45, -0.55, true);
  bPath.closePath();
  drawCotesDeGeneveBridge(ctx, bPath, { x0: 140, y0: -680, x1: 1420, y1: 560 }, lightAngle * 3.0, {
    ribWidth: 44,
    chamferGold: true,
    bevelWidth: 4.0,
  });

  // Hero cluster of precision heat-blued steel bridge micro-screws gleaming in specular light
  drawBluedScrew(ctx, 640, -175, 42, 0.52, lightAngle);
  drawBluedScrew(ctx, 880, 45, 36, -0.38, lightAngle);
  drawBluedScrew(ctx, 690, 245, 38, 1.18, lightAngle);
  drawRubyJewel(ctx, 845, -185, 36, lightAngle);

  // Close-up of rotating Flying Tourbillon cage rim, blued pillar screw & gold timing weights
  drawFlyingTourbillon(ctx, -40, 20, 485, globalT, lightAngle);

  ctx.restore();
}

function renderS10_SapphireSweep(ctx, localT, globalT, u) {
  // Diagonal Sapphire Glare (#DCE6F2) sweeping cleanly from top-left (-1.1) to bottom-right (+1.1)
  const sweepPos = lerp(-1.05, 1.05, easeInOutCubic(u));
  const lightAngle = lerp(-0.95, -0.25, u);

  drawStudioBackdrop(ctx, lerp(620, 1300, u), 480, 0.14, 0.09);

  drawFullWatch(ctx, {
    cx: 960,
    cy: 540,
    dialR: 390,
    scaleX: 0.94,
    scaleY: 1.0,
    rotation: -0.11,
    globalT,
    lightAngle,
    sapphireSweepPos: sweepPos,
  });
}

function renderS11_CrownAndLugs(ctx, localT, globalT, u) {
  // Precision architectural macro of fluted 18k Rose-Gold screw-down crown (engraved VN emblem)
  // and multi-faceted satin-brushed obsidian case lugs with mirror-polished rose-gold chamfers
  const tex = initMaterials();
  const lightAngle = lerp(-0.85, -0.30, u);
  const shiftY = lerp(18, -18, u);

  drawStudioBackdrop(ctx, 1140, 520, 0.16, 0.05);

  ctx.save();
  ctx.translate(0, shiftY);

  // Left half: grazing macro of right-side watch bezel, midcase, crown guards, lugs & fluted 18k crown
  drawFullWatch(ctx, {
    cx: 380,
    cy: 540,
    dialR: 540,
    globalT,
    lightAngle,
    rotation: 0.04,
  });

  // Right inset sculptural profile detail: frontal end-cap of the engraved 18k Rose-Gold Crown!
  const cx = 1435;
  const cy = 540;
  const crR = 235;

  // Studio rim aura behind crown end-cap
  const aura = ctx.createRadialGradient(cx, cy, crR * 0.5, cx, cy, crR * 1.55);
  aura.addColorStop(0.0, 'rgba(212, 155, 106, 0.18)');
  aura.addColorStop(1.0, 'rgba(6, 6, 8, 0.0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, crR * 1.55, 0, TAU);
  ctx.fill();

  // 24-tooth knurled rose-gold crown gear rim
  drawInvoluteGear(
    ctx,
    { N: 32, m: (crR * 1.92) / 32, x: cx, y: cy, finish: 'roseGold', solid: true },
    0.08 * localT,
    lightAngle,
    { withJewel: false, extrudePx: 8 }
  );

  // Brushed obsidian & rose-gold inner crown medallion engraved with Vaucher Star + VN monogram
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#12141A';
  ctx.beginPath();
  ctx.arc(0, 0, crR * 0.76, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, crR * 0.74, 0, TAU);
  ctx.clip();
  ctx.drawImage(tex.circularGrain, -crR, -crR, crR * 2, crR * 2);
  ctx.restore();

  ctx.strokeStyle = createMetallicConicGradient(ctx, 0, 0, lightAngle, 'roseGold');
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, crR * 0.75, 0, TAU);
  ctx.stroke();

  drawVaucherEmblem(ctx, 0, -34, 52);
  ctx.fillStyle = '#F2C9A0';
  ctx.font = '600 44px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '10px';
  ctx.fillText('VN', 5, 58);
  ctx.restore();

  ctx.restore();
}

// ============================================================================
// CHUNK 4 (00:30–00:40) — RAPID HOROLOGY MONTAGE (5 shots, 1.8s–2.5s cuts)
// ============================================================================

function renderS12_ChronoSnap(ctx, localT, globalT, u) {
  drawStudioBackdrop(ctx, 960, 440, 0.16, 0.06);

  const zoom = lerp(1.04, 1.0, easeOutCubic(u));
  drawFullWatch(ctx, {
    cx: 960,
    cy: 690,
    dialR: 540 * zoom,
    globalT,
    lightAngle: -0.62 + 0.2 * u,
    chronoOverrideLocalT: localT,
  });
}

function renderS13_IndicesRimFlash(ctx, localT, globalT, u) {
  // Fast circular rim-light whip igniting diamond-cut 18k rose-gold baton hour indices in sequence
  const whipAngle = -Math.PI * 0.65 + u * (Math.PI * 1.15);
  drawStudioBackdrop(
    ctx,
    960 + 380 * Math.cos(whipAngle),
    540 + 280 * Math.sin(whipAngle),
    0.18,
    0.05
  );

  drawFullWatch(ctx, {
    cx: 760,
    cy: 760,
    dialR: 620,
    globalT,
    lightAngle: whipAngle,
    indexFlashAngle: whipAngle,
  });
}

/**
 * Helper for Chunk 4 Stark Invert Luxury Typography Slams (S14 & S15):
 * Crisp 0.24s brushed Warm-Ivory/Rose-Gold shutter-flash plate settling into deep
 * #060608 obsidian architectural frame with razor-sharp Cinzel 700 display lettering.
 */
function renderStarkLuxurySlam(ctx, headline, subline, localSubT, globalT) {
  // Initial 0.22s stark invert luxury flash (#F3ECE1 / #F2C9A0 brushed metallic plate) -> settles to #060608
  const invertMix = Math.exp(-13.5 * Math.max(0, localSubT));
  const scalePunch = 1.0 + 0.045 * Math.exp(-16.0 * Math.max(0, localSubT));

  if (invertMix > 0.38) {
    // Stark Invert Luxury Plate (#F3ECE1 Warm Ivory + #F2C9A0 Rose-Gold sheen, #060608 obsidian text)
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0.0, '#E8DFD2');
    bg.addColorStop(0.5, '#F6F0E6');
    bg.addColorStop(1.0, '#E5C6A3');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#060608';
    ctx.lineWidth = 3;
    ctx.strokeRect(64, 64, W - 128, H - 128);

    ctx.save();
    ctx.translate(960, 540);
    ctx.scale(scalePunch, scalePunch);
    drawVaucherEmblem(ctx, 0, -118, 24);
    ctx.fillStyle = '#060608';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 92px "Cinzel", serif';
    ctx.letterSpacing = '20px';
    ctx.fillText(headline, 10, 4);

    ctx.font = '500 17px "Montserrat", sans-serif';
    ctx.letterSpacing = '10px';
    ctx.fillStyle = '#7A4E2D';
    ctx.fillText(subline, 5, 96);
    ctx.restore();
  } else {
    drawStudioBackdrop(ctx, 960, 540, 0.16, 0.04);

    // Precision architectural double hairline frame in 18k Rose Gold
    ctx.strokeStyle = 'rgba(212, 155, 106, 0.48)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(72, 72, W - 144, H - 144);
    ctx.strokeStyle = 'rgba(242, 201, 160, 0.20)';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(84, 84, W - 168, H - 168);

    // Subtle residual gold shutter glow
    if (invertMix > 0.01) {
      ctx.fillStyle = `rgba(242, 201, 160, ${(invertMix * 0.45).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.save();
    ctx.translate(960, 540);
    ctx.scale(scalePunch, scalePunch);

    drawVaucherEmblem(ctx, 0, -118, 24);

    const tg = ctx.createLinearGradient(-460, -48, 460, 48);
    tg.addColorStop(0.0, '#D49B6A');
    tg.addColorStop(0.32, '#FFFDF9');
    tg.addColorStop(0.55, '#F3ECE1');
    tg.addColorStop(0.82, '#F2C9A0');
    tg.addColorStop(1.0, '#D49B6A');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 92px "Cinzel", serif';
    ctx.letterSpacing = '20px';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillText(headline, 12, 7);
    ctx.fillStyle = tg;
    ctx.fillText(headline, 10, 4);

    ctx.font = '500 16px "Montserrat", sans-serif';
    ctx.letterSpacing = '10px';
    ctx.fillStyle = '#D49B6A';
    ctx.fillText(subline, 5, 98);
    ctx.restore();
  }
}

function renderS14_Slam18kGold(ctx, localT, globalT) {
  renderStarkLuxurySlam(ctx, '18K ROSE GOLD.', '5N HAND-BEVELED ANGLAGE  •  CALIBER 01', localT, globalT);
}

function renderS15_Slam28800Geneva(ctx, localT, globalT) {
  // S15 spans f=1068..1124 (57 frames = 1.90s):
  // First 28 frames (localT < 28/30 = 0.9333s): "28,800 VPH."
  // Frame 1096..1124 (localT >= 28/30): "GENEVA."
  const splitT = 28.0 / 30.0;
  if (localT < splitT) {
    renderStarkLuxurySlam(
      ctx,
      '28,800 VPH.',
      '4.000 HZ FREE-SPRUNG BREGUET OSCILLATOR',
      localT,
      globalT
    );
  } else {
    renderStarkLuxurySlam(
      ctx,
      'GENEVA.',
      'POINÇON D’EXCELLENCE HAUTE HORLOGERIE',
      localT - splitT,
      globalT
    );
  }
}

function renderS16_MacroTrainBlur(ctx, localT, globalT, u) {
  // Dynamic Dutch-angle (-14 deg) macro kinetic rush with 5-tap rotational motion blur streaks
  const tex = initMaterials();
  const lightAngle = -0.5 + 0.5 * u;
  drawStudioBackdrop(ctx, 1040, 460, 0.17, 0.06);

  ctx.save();
  ctx.translate(960, 540);
  ctx.rotate(-0.24); // -14 deg Dutch tilt
  const zoom = lerp(1.18, 1.34, easeInOutCubic(u));
  ctx.scale(zoom, zoom);
  ctx.translate(-1080, -540);

  ctx.drawImage(tex.perlagePlate, 200, 0, 1700, 1100);
  ctx.fillStyle = 'rgba(5, 6, 10, 0.52)';
  ctx.fillRect(0, 0, 2200, 1200);

  // 5-tap rotational motion-blur trail accelerating smoothly into high-energy kinetic climax
  const speedMult = 1.0 + 3.5 * u * u;
  const taps = 5;
  const shutterSpan = 0.045 * speedMult;

  for (let tap = 0; tap < taps; tap++) {
    const tapFrac = tap / (taps - 1);
    const subT = globalT * speedMult - shutterSpan * (1.0 - tapFrac);
    const subState = getHorologyState(subT);
    ctx.save();
    ctx.globalAlpha = tap === taps - 1 ? 0.88 : 0.16;
    drawInvoluteGear(ctx, GOING_TRAIN_SPECS[0], subState.gearAngles[0], lightAngle, {
      shadow: tap === taps - 1,
    });
    drawInvoluteGear(ctx, GOING_TRAIN_SPECS[2], subState.gearAngles[2], lightAngle, {
      shadow: tap === taps - 1,
    });
    drawInvoluteGear(ctx, GOING_TRAIN_SPECS[1], subState.gearAngles[1], lightAngle, {
      shadow: tap === taps - 1,
    });
    drawInvoluteGear(ctx, GOING_TRAIN_SPECS[3], subState.gearAngles[3], lightAngle, {
      shadow: tap === taps - 1,
    });
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// CHUNK 5 (00:40–00:50) — THE FULL MONOLITH REVEAL
// ============================================================================

function renderS17_MonolithPullback(ctx, localT, globalT, u) {
  // Dramatic slow axial pullback (scale 1.62x -> 1.04x) revealing the complete VAUCHER NOIR watch
  const scale = lerp(1.62, 1.04, easeOutCubic(u));
  const lightAngle = lerp(-0.92, -0.58, u);

  drawStudioBackdrop(ctx, 960, 500, 0.15, 0.05);

  drawFullWatch(ctx, {
    cx: 960,
    cy: 540,
    dialR: 320 * scale,
    globalT,
    lightAngle,
    rotation: lerp(-0.05, 0.0, u),
  });
}

function renderS18_CaseBezelSweep(ctx, localT, globalT, u) {
  // Sculptural 22-deg three-quarter hero angle (scaleX = cos(22deg) ≈ 0.91) with sweeping rim-light
  const lightAngle = lerp(-1.25, 0.25, easeInOutCubic(u));
  drawStudioBackdrop(ctx, lerp(640, 1280, u), 480, 0.16, 0.06);

  // Subtle extruded 3D case band behind foreshortened three-quarter watch face!
  ctx.save();
  ctx.translate(960 - 24, 540 + 10);
  ctx.rotate(-0.10);
  ctx.scale(0.88, 1.0);
  const bandPath = buildRoundedOctagonPath(345 * 1.35, 0.30, Math.PI / 8);
  ctx.fillStyle = '#0D0E13';
  ctx.fill(bandPath);
  ctx.strokeStyle = 'rgba(212, 155, 106, 0.45)';
  ctx.lineWidth = 3;
  ctx.stroke(bandPath);
  ctx.restore();

  drawFullWatch(ctx, {
    cx: 960,
    cy: 540,
    dialR: 345,
    scaleX: 0.88,
    scaleY: 1.0,
    rotation: -0.10,
    globalT,
    lightAngle,
  });
}

function renderS19_DialAliveHero(ctx, localT, globalT, u) {
  // Style Frame Q2 @ f = 1425 (t = 47.500s): Brushed Obsidian Skeleton Dial Hero Portrait (10:10)!
  const lightAngle = lerp(-0.74, -0.52, u);
  const scale = lerp(1.0, 1.035, u);

  drawStudioBackdrop(ctx, 920, 480, 0.17, 0.06);

  drawFullWatch(ctx, {
    cx: 960,
    cy: 540,
    dialR: 350 * scale,
    scaleX: 0.985,
    scaleY: 1.0,
    rotation: -0.035,
    globalT,
    lightAngle,
  });
}

// ============================================================================
// CHUNK 6 (00:50–01:00) — THE LEGACY LOCKUP
// ============================================================================

function renderS20_HeroStillness(ctx, localT, globalT, u) {
  // Serene museum-lit vertical monolith watch floating in warm subtle 18k rim-light
  const scale = lerp(1.0, 1.025, u);
  const lightAngle = lerp(-0.68, -0.58, u);

  drawStudioBackdrop(ctx, 960, 500, 0.14, 0.04);

  drawFullWatch(ctx, {
    cx: 960,
    cy: 540,
    dialR: 315 * scale,
    globalT,
    lightAngle,
    rotation: 0.0,
  });
}

function renderS21_LegacyLockup(ctx, localT, globalT, u) {
  // Style Frame Q4 @ f = 1725 (t = 57.500s) & Final Commercial Hold through 60.00s!
  // Left: Rim-lit hero watch silhouette at (485, 540), dialR = 252
  // Right: Razor-sharp luxury lockup centered at x = 1365:
  //   VAUCHER NOIR / CALIBER 01 — GENÈVE / "Time, Perfected."
  const lightAngle = lerp(-0.68, -0.56, u);
  // Subtle final mechanical tick & Geneva harmonic chime resonance at t = 59.000s (localT = 4.000s)
  const chimeT = localT - 4.0;
  const chimeGlow = chimeT >= 0 ? Math.exp(-2.8 * chimeT) : 0.0;

  drawStudioBackdrop(ctx, 560, 520, 0.15 + 0.06 * chimeGlow, 0.04);

  // Subtle warm radial glow behind right-hand brand lockup
  const rightGlow = ctx.createRadialGradient(1365, 540, 30, 1365, 540, 520);
  rightGlow.addColorStop(0.0, `rgba(212, 155, 106, ${(0.075 + 0.05 * chimeGlow).toFixed(3)})`);
  rightGlow.addColorStop(1.0, 'rgba(6, 6, 8, 0.0)');
  ctx.fillStyle = rightGlow;
  ctx.fillRect(800, 0, 1120, H);

  // 1. Hero Timepiece Monolith on Left (proportioned so lugs dissolve into #060608 with clean top/bottom air)
  drawFullWatch(ctx, {
    cx: 485,
    cy: 540,
    dialR: 232,
    globalT,
    lightAngle,
    rotation: 0.0,
  });

  // Delicate vertical architectural divider separating timepiece & brand typography (x = 918)
  const textEnter = easeOutCubic(Math.min(1, localT / 0.85));
  ctx.save();
  ctx.globalAlpha = textEnter;

  const vRule = ctx.createLinearGradient(918, 250, 918, 830);
  vRule.addColorStop(0.0, 'rgba(212, 155, 106, 0.0)');
  vRule.addColorStop(0.5, 'rgba(212, 155, 106, 0.36)');
  vRule.addColorStop(1.0, 'rgba(212, 155, 106, 0.0)');
  ctx.strokeStyle = vRule;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(918, 250);
  ctx.lineTo(918, 830);
  ctx.stroke();

  // 2. Right-Balanced Haute Horlogerie Legacy Lockup (centerX = 1385)
  const tx = 1385;

  // Sculpted 18k Rose-Gold Vaucher 4-Point Star Emblem
  drawVaucherEmblem(ctx, tx, 382, 28);

  // Primary Brand Title: VAUCHER NOIR (Cinzel 600, #F3ECE1)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 64px "Cinzel", serif';
  ctx.letterSpacing = '14px';

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillText('VAUCHER NOIR', tx + 7 + 2, 466 + 3);

  const brandGrad = ctx.createLinearGradient(tx - 340, 434, tx + 340, 498);
  brandGrad.addColorStop(0.0, '#E8DFD2');
  brandGrad.addColorStop(0.48, '#FFFDF9');
  brandGrad.addColorStop(0.75, '#F3ECE1');
  brandGrad.addColorStop(1.0, '#E6C6A4');
  ctx.fillStyle = brandGrad;
  ctx.fillText('VAUCHER NOIR', tx + 7, 466);

  // Tapered 18k Rose-Gold Horizontal Divider with Central Diamond
  const hRuleW = 290;
  const hRuleY = 524;
  const hg = ctx.createLinearGradient(tx - hRuleW, hRuleY, tx + hRuleW, hRuleY);
  hg.addColorStop(0.0, 'rgba(212, 155, 106, 0.0)');
  hg.addColorStop(0.5, 'rgba(242, 201, 160, 0.85)');
  hg.addColorStop(1.0, 'rgba(212, 155, 106, 0.0)');
  ctx.strokeStyle = hg;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(tx - hRuleW, hRuleY);
  ctx.lineTo(tx + hRuleW, hRuleY);
  ctx.stroke();

  ctx.fillStyle = '#FCE2C4';
  ctx.beginPath();
  ctx.moveTo(tx, hRuleY - 4.5);
  ctx.lineTo(tx + 4.5, hRuleY);
  ctx.lineTo(tx, hRuleY + 4.5);
  ctx.lineTo(tx - 4.5, hRuleY);
  ctx.closePath();
  ctx.fill();

  // Editorial Subtitle: CALIBER 01 — GENÈVE (Lining numerals + Cormorant Garamond 600, #D49B6A, native U+00C8 È)
  ctx.fontVariantNumeric = 'lining-nums';
  ctx.font = '600 28px "Cinzel", "Cormorant Garamond", serif';
  ctx.letterSpacing = '9.5px';
  ctx.fillStyle = '#D49B6A';
  ctx.fillText('CALIBER 01 — GENÈVE', tx + 4.75, 568);
  ctx.fontVariantNumeric = 'normal';

  // Poetic Italic Tagline: "Time, Perfected." (Cormorant Garamond 400 Italic, #F3ECE1)
  ctx.font = 'italic 400 38px "Cormorant Garamond", serif';
  ctx.letterSpacing = '2.2px';
  ctx.fillStyle = 'rgba(243, 236, 225, 0.94)';
  ctx.fillText('“Time, Perfected.”', tx + 1.1, 636);

  // Discrete bottom manufacture signature
  ctx.font = '300 12px "Montserrat", sans-serif';
  ctx.letterSpacing = '5.5px';
  ctx.fillStyle = 'rgba(212, 155, 106, 0.58)';
  ctx.fillText('MANUFACTURE HAUTE HORLOGERIE SUISSE', tx + 2.75, 706);

  ctx.letterSpacing = '0px';
  ctx.restore();
}

const SHOT_RENDERERS = Object.freeze({
  S01_BEZEL_GLINT: renderS01_BezelGlint,
  S02_RUBY_BALANCE_4HZ: renderS02_RubyBalance4Hz,
  S03_TITLE_312_COMP: renderS03_Title312Comp,
  S04_INVOLUTE_TRAIN: renderS04_InvoluteTrain,
  S05_PALLET_FORK_LOCK: renderS05_PalletForkLock,
  S06_COTES_DE_GENEVE: renderS06_CotesDeGeneve,
  S07_TITLE_ZERO_TOL: renderS07_TitleZeroTol,
  S08_TOURBILLON_CAGE: renderS08_TourbillonCage,
  S09_BLUED_SCREWS: renderS09_BluedScrews,
  S10_SAPPHIRE_SWEEP: renderS10_SapphireSweep,
  S11_CROWN_AND_LUGS: renderS11_CrownAndLugs,
  S12_CHRONO_SNAP: renderS12_ChronoSnap,
  S13_INDICES_RIM_FLASH: renderS13_IndicesRimFlash,
  S14_SLAM_18K_GOLD: renderS14_Slam18kGold,
  S15_SLAM_28800_GENEVA: renderS15_Slam28800Geneva,
  S16_MACRO_TRAIN_BLUR: renderS16_MacroTrainBlur,
  S17_MONOLITH_PULLBACK: renderS17_MonolithPullback,
  S18_CASE_BEZEL_SWEEP: renderS18_CaseBezelSweep,
  S19_DIAL_ALIVE_HERO: renderS19_DialAliveHero,
  S20_HERO_STILLNESS: renderS20_HeroStillness,
  S21_LEGACY_LOCKUP: renderS21_LegacyLockup,
});

/**
 * Strictly isolated scene dispatch: clears target context 100% before invoking shotId.
 */
export function renderIsolatedShot(ctx, shotId, localT, globalT, shotProgress) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.letterSpacing = '0px';
  ctx.clearRect(0, 0, W, H);

  const fn = SHOT_RENDERERS[shotId];
  if (!fn) {
    throw new Error(`Unknown shotId: ${shotId}`);
  }
  fn(ctx, localT, globalT, shotProgress);
  ctx.restore();
}
