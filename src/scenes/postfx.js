/**
 * src/scenes/postfx.js
 * Cinema finishing stack applied deterministically at the end of every rendered frame:
 * 1. Quarter-res (480x270) warm optical halation bloom on bright gold/sapphire specular peaks
 * 2. Subtle anamorphic studio vignette (preserving center contrast & luminosity)
 * 3. Pre-baked mulberry32 35mm cinema grain (alpha = 0.030, 15Hz cadence for <28MB H.264)
 */

import { initMaterials } from '../horology/materials.js';

let bloomBuf = null;
let bloomBlurBuf = null;

function ensureBuffers() {
  if (!bloomBuf) {
    bloomBuf = document.createElement('canvas');
    bloomBuf.width = 480;
    bloomBuf.height = 270;

    bloomBlurBuf = document.createElement('canvas');
    bloomBlurBuf.width = 480;
    bloomBlurBuf.height = 270;
  }
}

export function applyPostFX(mainCtx, mainCanvas, globalFrame, opts = {}) {
  ensureBuffers();
  const tex = initMaterials();
  const W = 1920;
  const H = 1080;

  // 1. Soft Optical Halation on High-Luminance Gold & Sapphire Speculars
  const bctx = bloomBuf.getContext('2d', { willReadFrequently: true });
  bctx.clearRect(0, 0, 480, 270);
  bctx.drawImage(mainCanvas, 0, 0, 480, 270);

  // Threshold only top specular highlights (> 198 luminance) so midtones stay razor-sharp
  const img = bctx.getImageData(0, 0, 480, 270);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 192) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
    } else {
      const k = (lum - 192) / 63.0;
      // Subtle warm rose-gold cinema halation tint (#F2C9A0)
      d[i] = Math.min(255, Math.round(r * k * 1.06));
      d[i + 1] = Math.min(255, Math.round(g * k * 0.94));
      d[i + 2] = Math.min(255, Math.round(b * k * 0.82));
      d[i + 3] = 255;
    }
  }
  bctx.putImageData(img, 0, 0);

  const blurCtx = bloomBlurBuf.getContext('2d');
  blurCtx.clearRect(0, 0, 480, 270);
  blurCtx.filter = 'blur(10px)';
  blurCtx.drawImage(bloomBuf, 0, 0);
  blurCtx.filter = 'none';

  mainCtx.save();
  mainCtx.globalCompositeOperation = 'screen';
  mainCtx.globalAlpha = opts.halationAlpha ?? 0.26;
  mainCtx.drawImage(bloomBlurBuf, 0, 0, W, H);
  mainCtx.restore();

  // 2. Subtle Anamorphic Studio Vignette (keeps hero watch bright & sculptural)
  mainCtx.save();
  const vig = mainCtx.createRadialGradient(W * 0.5, H * 0.5, H * 0.44, W * 0.5, H * 0.5, W * 0.64);
  vig.addColorStop(0.0, 'rgba(6, 6, 8, 0.0)');
  vig.addColorStop(0.68, 'rgba(6, 6, 8, 0.12)');
  vig.addColorStop(1.0, 'rgba(3, 3, 5, 0.50)');
  mainCtx.fillStyle = vig;
  mainCtx.fillRect(0, 0, W, H);
  mainCtx.restore();

  // 3. Deterministic 35mm Film Grain (2-frame / 15Hz cadence, alpha = 0.030)
  const grainCadence = Math.floor(globalFrame / 2);
  const tile = tex.grainTiles[grainCadence % tex.grainTiles.length];
  const offX = -((grainCadence * 73) % 256);
  const offY = -((grainCadence * 137) % 256);

  mainCtx.save();
  mainCtx.globalCompositeOperation = 'overlay';
  mainCtx.globalAlpha = opts.grainAlpha ?? 0.030;
  for (let y = offY; y < H; y += 256) {
    for (let x = offX; x < W; x += 256) {
      mainCtx.drawImage(tile, x, y);
    }
  }
  mainCtx.restore();

  // 4. Optional Dip-to-Black Curtain (applied cleanly AFTER scene so #060608 is pure at boundary)
  if (opts.blackCurtainAlpha && opts.blackCurtainAlpha > 0.001) {
    mainCtx.save();
    mainCtx.globalAlpha = Math.min(1, Math.max(0, opts.blackCurtainAlpha));
    mainCtx.fillStyle = '#060608';
    mainCtx.fillRect(0, 0, W, H);
    mainCtx.restore();
  }
}
