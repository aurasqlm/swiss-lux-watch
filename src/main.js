/**
 * src/main.js
 * Deterministic frame controller exposing window.initEngine() and window.renderAtTime(t).
 * - ZERO requestAnimationFrame (GSAP ticker unhooked from RAF and stepped deterministically)
 * - 100% Canvas, SVG, and DOM layer clear before every frame
 * - Zero-ghosting HARD_CUT, non-overlapping DIP_TO_BLACK, and disjoint offscreen MASKED_WIPE
 */

import { FPS, TOTAL_FRAMES, STORYBOARD, resolveFrameDispatch } from './storyboard.js';
import { smootherstep01, getHorologyState } from './horology/math.js';
import { initMaterials } from './horology/materials.js';
import { renderIsolatedShot } from './scenes/shots.js';
import { applyPostFX } from './scenes/postfx.js';

const W = 1920;
const H = 1080;
const SVG_NS = 'http://www.w3.org/2000/svg';

let initialized = false;
let mainCanvas = null;
let mainCtx = null;
let svgOverlay = null;
let domOverlay = null;
let wipeCanvasOut = null;
let wipeCtxOut = null;
let wipeCanvasIn = null;
let wipeCtxIn = null;
let gsapMaster = null;
let gsapState = { vignettePulse: 0,halGlow: 0.26 };

function setupDeterministicGSAP() {
  const g = window.gsap;
  if (!g) return;

  // Disconnect GSAP from real-time requestAnimationFrame / wall-clock!
  g.ticker.remove(g.updateRoot);
  g.ticker.lagSmoothing(0);

  gsapMaster = g.timeline({ paused: true });
  // Build deterministic 60.0s optical breathing & Chunk 4 montage halation accents
  gsapMaster.to(gsapState, { halGlow: 0.28, duration: 10, ease: 'sine.inOut' }, 0);
  gsapMaster.to(gsapState, { halGlow: 0.25, duration: 10, ease: 'sine.inOut' }, 10);
  gsapMaster.to(gsapState, { halGlow: 0.30, duration: 10, ease: 'sine.inOut' }, 20);
  gsapMaster.to(gsapState, { halGlow: 0.33, duration: 10, ease: 'power2.inOut' }, 30);
  gsapMaster.to(gsapState, { halGlow: 0.27, duration: 10, ease: 'sine.inOut' }, 40);
  gsapMaster.to(gsapState, { halGlow: 0.24, duration: 10, ease: 'sine.out' }, 50);
}

/**
 * Adds precision SVG vector corner/architectural hairlines on title & legacy lockup shots.
 * Always called AFTER svgOverlay.replaceChildren() so zero elements ever persist across cuts!
 */
function renderIsolatedSvgLayer(shotId, localT, blackCurtainAlpha) {
  if (blackCurtainAlpha >= 0.999) return;

  if (
    shotId !== 'S03_TITLE_312_COMP' &&
    shotId !== 'S07_TITLE_ZERO_TOL' &&
    shotId !== 'S21_LEGACY_LOCKUP'
  ) {
    return;
  }

  const alpha = Math.max(0, (1 - blackCurtainAlpha) * Math.min(1, localT / 0.5));
  if (alpha <= 0.01) return;

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('opacity', alpha.toFixed(3));

  // Subtle Geneva Haute Horlogerie architectural corner brackets in 18k Rose Gold (#D49B6A)
  const inset = 54;
  const arm = 26;
  const corners = [
    `M ${inset} ${inset + arm} L ${inset} ${inset} L ${inset + arm} ${inset}`,
    `M ${W - inset - arm} ${inset} L ${W - inset} ${inset} L ${W - inset} ${inset + arm}`,
    `M ${inset} ${H - inset - arm} L ${inset} ${H - inset} L ${inset + arm} ${H - inset}`,
    `M ${W - inset - arm} ${H - inset} L ${W - inset} ${H - inset} L ${W - inset} ${H - inset - arm}`,
  ];

  for (const d of corners) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', '#D49B6A');
    p.setAttribute('stroke-width', '1.25');
    p.setAttribute('stroke-opacity', '0.52');
    g.appendChild(p);
  }

  svgOverlay.appendChild(g);
}

/**
 * Renders the 12-frame strictly disjoint diagonal MASKED_WIPE between outShot and inShot.
 * - Left polygon (x < x_wipe(y) - 12): clipped strictly to outShot
 * - Right polygon (x > x_wipe(y) + 12): clipped strictly to inShot
 * - Center 24px opaque #060608 bezel bar crowned with #D49B6A & #DCE6F2 specular ridges
 * ZERO pixel overlap, ZERO alpha cross-dissolve.
 */
function renderDisjointMaskedWipe(dispatch) {
  const {
    wipeProgress,
    globalT,
    outShot,
    outLocalT,
    outProgress,
    inShot,
    inLocalT,
    inProgress,
  } = dispatch;

  // Render outgoing and incoming shots into completely separate, freshly-cleared buffers
  renderIsolatedShot(wipeCtxOut, outShot.id, outLocalT, globalT, outProgress);
  renderIsolatedShot(wipeCtxIn, inShot.id, inLocalT, globalT, inProgress);

  const s = smootherstep01(wipeProgress);
  // Sweeps right-to-left: at p=0 -> xCenter=2140 (100% outShot); at p=0.5 -> xCenter=960 (exact 50/50 split!); at p=1 -> xCenter=-220 (100% inShot)
  const xCenter = 2140.0 - 2360.0 * s;
  const tan18 = Math.tan((18.0 * Math.PI) / 180.0);
  const dxTop = (0 - 540) * tan18; // -175.46
  const dxBot = (1080 - 540) * tan18; // +175.46
  const halfBar = 12.0;

  const xTop = xCenter + dxTop;
  const xBot = xCenter + dxBot;

  // 1. Outgoing shot strictly clipped to left half-plane (x <= xWipe - halfBar)
  mainCtx.save();
  mainCtx.beginPath();
  mainCtx.moveTo(-400, 0);
  mainCtx.lineTo(xTop - halfBar, 0);
  mainCtx.lineTo(xBot - halfBar, H);
  mainCtx.lineTo(-400, H);
  mainCtx.closePath();
  mainCtx.clip();
  mainCtx.drawImage(wipeCanvasOut, 0, 0);
  mainCtx.restore();

  // 2. Incoming shot strictly clipped to right half-plane (x >= xWipe + halfBar)
  mainCtx.save();
  mainCtx.beginPath();
  mainCtx.moveTo(xTop + halfBar, 0);
  mainCtx.lineTo(W + 400, 0);
  mainCtx.lineTo(W + 400, H);
  mainCtx.lineTo(xBot + halfBar, H);
  mainCtx.closePath();
  mainCtx.clip();
  mainCtx.drawImage(wipeCanvasIn, 0, 0);
  mainCtx.restore();

  // 3. Opaque 24px #060608 obsidian bevel bar + dual #D49B6A / #DCE6F2 specular highlights
  mainCtx.save();
  mainCtx.fillStyle = '#060608';
  mainCtx.beginPath();
  mainCtx.moveTo(xTop - halfBar - 1, 0);
  mainCtx.lineTo(xTop + halfBar + 1, 0);
  mainCtx.lineTo(xBot + halfBar + 1, H);
  mainCtx.lineTo(xBot - halfBar - 1, H);
  mainCtx.closePath();
  mainCtx.fill();

  // Leading Rose-Gold chamfer line
  mainCtx.strokeStyle = '#D49B6A';
  mainCtx.lineWidth = 2.0;
  mainCtx.beginPath();
  mainCtx.moveTo(xTop - halfBar, 0);
  mainCtx.lineTo(xBot - halfBar, H);
  mainCtx.stroke();

  // Trailing Sapphire Glare specular edge
  mainCtx.strokeStyle = '#DCE6F2';
  mainCtx.lineWidth = 2.0;
  mainCtx.beginPath();
  mainCtx.moveTo(xTop + halfBar, 0);
  mainCtx.lineTo(xBot + halfBar, H);
  mainCtx.stroke();

  // Center hairline glint inside bevel bar
  mainCtx.strokeStyle = 'rgba(242, 201, 160, 0.45)';
  mainCtx.lineWidth = 1.0;
  mainCtx.beginPath();
  mainCtx.moveTo(xTop, 0);
  mainCtx.lineTo(xBot, H);
  mainCtx.stroke();
  mainCtx.restore();
}

export async function initEngine() {
  if (initialized) return true;

  mainCanvas = document.getElementById('main-canvas');
  mainCtx = mainCanvas.getContext('2d', { alpha: false });
  svgOverlay = document.getElementById('svg-overlay');
  domOverlay = document.getElementById('dom-overlay');

  wipeCanvasOut = document.createElement('canvas');
  wipeCanvasOut.width = W;
  wipeCanvasOut.height = H;
  wipeCtxOut = wipeCanvasOut.getContext('2d', { alpha: false });

  wipeCanvasIn = document.createElement('canvas');
  wipeCanvasIn.width = W;
  wipeCanvasIn.height = H;
  wipeCtxIn = wipeCanvasIn.getContext('2d', { alpha: false });

  // Force load & verify all vendored SIL OFL luxury .woff2 faces (incl. U+00C8 'È')
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('400 48px "Cinzel"', 'VAUCHER NOIR GENÈVE'),
    document.fonts.load('600 64px "Cinzel"', '312 COMPONENTS. ZERO TOLERANCE. VAUCHER NOIR'),
    document.fonts.load('700 92px "Cinzel"', '18K ROSE GOLD. 28,800 VPH. GENEVA.'),
    document.fonts.load('400 36px "Cormorant Garamond"', 'CALIBER 01 — GENÈVE'),
    document.fonts.load('italic 400 38px "Cormorant Garamond"', '“Time, Perfected.”'),
    document.fonts.load('600 30px "Cormorant Garamond"', 'CALIBER 01 — GENÈVE'),
    document.fonts.load('300 14px "Montserrat"', 'MANUFACTURE HAUTE HORLOGERIE SUISSE'),
    document.fonts.load('500 16px "Montserrat"', 'SWISS MADE 60 05 10'),
  ]);
  await document.fonts.ready;

  const cinzelOk = document.fonts.check('600 48px "Cinzel"');
  const cormorantOk = document.fonts.check('italic 400 36px "Cormorant Garamond"');
  const montserratOk = document.fonts.check('500 16px "Montserrat"');
  if (!cinzelOk || !cormorantOk || !montserratOk) {
    throw new Error(
      `Luxury font check failed: Cinzel=${cinzelOk}, Cormorant=${cormorantOk}, Montserrat=${montserratOk}`
    );
  }

  initMaterials();
  setupDeterministicGSAP();
  initialized = true;
  return true;
}

/**
 * Deterministic entry point required by contract:
 * Renders exact timestamp `t` (in seconds, [0.0, 60.0)) with 100% scene isolation.
 */
export function renderAtTime(t) {
  if (!initialized) {
    throw new Error('Engine not initialized: await window.initEngine() must run before renderAtTime(t)');
  }

  const clampedT = Math.max(0.0, Math.min(59.999, Number(t) || 0.0));
  const rawFrame = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(clampedT * FPS)));

  // Step GSAP root timeline deterministically to exact timestamp `clampedT`
  if (window.gsap) {
    window.gsap.updateRoot(clampedT);
  }
  if (gsapMaster) {
    gsapMaster.time(clampedT);
  }

  // 100% clear of Canvas, SVG, and DOM layers BEFORE rendering current frame!
  mainCtx.setTransform(1, 0, 0, 1, 0, 0);
  mainCtx.globalAlpha = 1.0;
  mainCtx.globalCompositeOperation = 'source-over';
  mainCtx.filter = 'none';
  mainCtx.fillStyle = '#060608';
  mainCtx.fillRect(0, 0, W, H);
  svgOverlay.replaceChildren();
  domOverlay.replaceChildren();

  const dispatch = resolveFrameDispatch(rawFrame);
  // Allow continuous sub-frame physics inspection if non-grid `t` is queried
  const physicsT = Math.abs(clampedT - dispatch.globalT) > 1e-5 ? clampedT : dispatch.globalT;

  if (dispatch.mode === 'MASKED_WIPE') {
    renderDisjointMaskedWipe({ ...dispatch, globalT: physicsT });
    applyPostFX(mainCtx, mainCanvas, dispatch.globalFrame, {
      halationAlpha: gsapState.halGlow,
      blackCurtainAlpha: 0,
    });
  } else {
    renderIsolatedShot(
      mainCtx,
      dispatch.shot.id,
      dispatch.localT,
      physicsT,
      dispatch.shotProgress
    );
    applyPostFX(mainCtx, mainCanvas, dispatch.globalFrame, {
      halationAlpha: gsapState.halGlow,
      blackCurtainAlpha: dispatch.blackCurtainAlpha,
    });
    renderIsolatedSvgLayer(dispatch.shot.id, dispatch.localT, dispatch.blackCurtainAlpha);
  }

  return {
    frame: dispatch.globalFrame,
    t: physicsT,
    mode: dispatch.mode,
    shotId: dispatch.mode === 'MASKED_WIPE' ? `${dispatch.outShot.id}->${dispatch.inShot.id}` : dispatch.shot.id,
  };
}

// Expose deterministic diagnostics & API on window
window.STORYBOARD = STORYBOARD;
window.getHorologyState = getHorologyState;
window.initEngine = initEngine;
window.renderAtTime = renderAtTime;

// Auto-initialize on load and render frame 0
initEngine().then(() => {
  renderAtTime(0.0);
  window.__ENGINE_READY__ = true;
});
