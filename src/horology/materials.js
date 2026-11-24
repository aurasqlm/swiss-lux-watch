/**
 * src/horology/materials.js
 * Procedural Haute Horlogerie surface shaders & sub-assemblies:
 * - Pre-baked concentric/radial brushed metal sprites (18k Rose Gold, Gunmetal Rhodium, Obsidian)
 * - Linear satin carbon & engine-turned Perlage mainplate stippling
 * - Dynamic Côtes de Genève (Geneva Stripes) with sweeping key-light micro-grooves
 * - 45-deg hand-polished Anglage bevels & 3D axial-extruded involute gears
 * - Pigeon-blood corundum Ruby Jewel bearings in 18k gold chatons + Incabloc lyre springs
 * - Chamfered heat-blued micro-screws
 * - Complete 60s 96:8 Flying Tourbillon + 4 Hz Balance + Swiss Lever Escapement renderer
 */

import { TAU, clamp, mulberry32, getHorologyState } from './math.js';
import {
  getInvoluteGearGeometry,
  getEscapeWheelGeometry,
  drawBreguetHairspring,
  buildTourbillonCagePath,
} from './gears.js';

let textures = null;

function createOffscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Generates all deterministic offscreen texture sprites once at startup.
 */
export function initMaterials() {
  if (textures) return textures;

  // 1. Concentric circular-grained hairline overlay (512x512, alpha sprite)
  const circularGrain = createOffscreen(512, 512);
  {
    const gctx = circularGrain.getContext('2d');
    const rng = mulberry32(101);
    const cx = 256;
    const cy = 256;
    for (let i = 0; i < 240; i++) {
      const r = 10 + (i / 240) * 244 + (rng() - 0.5) * 0.8;
      const a0 = rng() * TAU;
      const span = (0.35 + rng() * 0.58) * TAU;
      gctx.beginPath();
      gctx.arc(cx, cy, r, a0, a0 + span);
      gctx.lineWidth = 0.55 + rng() * 0.45;
      gctx.strokeStyle =
        i % 2 === 0
          ? `rgba(255, 244, 228, ${(0.045 + rng() * 0.055).toFixed(3)})`
          : `rgba(4, 4, 8, ${(0.075 + rng() * 0.085).toFixed(3)})`;
      gctx.stroke();
    }
  }

  // 2. Sunburst + concentric brushed obsidian dial plate (900x900)
  const brushedObsidian = createOffscreen(900, 900);
  {
    const octx = brushedObsidian.getContext('2d');
    const rng = mulberry32(202);
    const cx = 450;
    const cy = 450;

    const conic = octx.createConicGradient(-0.65, cx, cy);
    conic.addColorStop(0.0, '#101116');
    conic.addColorStop(0.14, '#242731');
    conic.addColorStop(0.26, '#131419');
    conic.addColorStop(0.5, '#0B0C10');
    conic.addColorStop(0.66, '#262933');
    conic.addColorStop(0.82, '#14151B');
    conic.addColorStop(1.0, '#101116');
    octx.fillStyle = conic;
    octx.fillRect(0, 0, 900, 900);

    // Fine radial sunburst rays
    for (let i = 0; i < 420; i++) {
      const ang = (i / 420) * TAU + (rng() - 0.5) * 0.008;
      octx.beginPath();
      octx.moveTo(cx + 24 * Math.cos(ang), cy + 24 * Math.sin(ang));
      octx.lineTo(cx + 448 * Math.cos(ang), cy + 448 * Math.sin(ang));
      octx.lineWidth = 0.65;
      octx.strokeStyle =
        i % 2 === 0 ? 'rgba(220, 230, 242, 0.026)' : 'rgba(2, 2, 4, 0.06)';
      octx.stroke();
    }

    // Concentric lathe hairlines
    for (let i = 0; i < 260; i++) {
      const r = 28 + (i / 260) * 420;
      const a0 = rng() * TAU;
      octx.beginPath();
      octx.arc(cx, cy, r, a0, a0 + (0.4 + rng() * 0.5) * TAU);
      octx.lineWidth = 0.55;
      octx.strokeStyle =
        i % 3 === 0 ? 'rgba(242, 201, 160, 0.025)' : 'rgba(0, 0, 0, 0.11)';
      octx.stroke();
    }
  }

  // 3. Linear satin-brushed carbon/titanium texture (640x640)
  const satinCarbon = createOffscreen(640, 640);
  {
    const sctx = satinCarbon.getContext('2d');
    const rng = mulberry32(303);
    const bg = sctx.createLinearGradient(0, 0, 640, 640);
    bg.addColorStop(0.0, '#121318');
    bg.addColorStop(0.35, '#20222B');
    bg.addColorStop(0.68, '#14151A');
    bg.addColorStop(1.0, '#0C0D11');
    sctx.fillStyle = bg;
    sctx.fillRect(0, 0, 640, 640);

    for (let i = 0; i < 520; i++) {
      const y = rng() * 640;
      const x0 = rng() * 140;
      const len = 260 + rng() * 380;
      sctx.beginPath();
      sctx.moveTo(x0, y);
      sctx.lineTo(x0 + len, y + (rng() - 0.5) * 1.2);
      sctx.lineWidth = 0.5 + rng() * 0.55;
      sctx.strokeStyle =
        i % 2 === 0
          ? `rgba(220, 230, 242, ${(0.028 + rng() * 0.038).toFixed(3)})`
          : `rgba(3, 3, 5, ${(0.12 + rng() * 0.12).toFixed(3)})`;
      sctx.stroke();
    }
  }

  // 4. Engine-turned Perlage mainplate recess plate (512x512)
  const perlagePlate = createOffscreen(512, 512);
  {
    const pctx = perlagePlate.getContext('2d');
    pctx.fillStyle = '#0D0E12';
    pctx.fillRect(0, 0, 512, 512);
    const step = 18;
    for (let row = -1; row < 32; row++) {
      const y = row * (step * 0.78);
      const xOff = (row % 2) * (step * 0.5);
      for (let col = -1; col < 32; col++) {
        const x = col * step + xOff;
        const rg = pctx.createConicGradient(0.4, x, y);
        rg.addColorStop(0.0, 'rgba(35, 38, 48, 0.55)');
        rg.addColorStop(0.25, 'rgba(95, 102, 118, 0.22)');
        rg.addColorStop(0.5, 'rgba(14, 15, 20, 0.65)');
        rg.addColorStop(0.75, 'rgba(85, 92, 108, 0.20)');
        rg.addColorStop(1.0, 'rgba(35, 38, 48, 0.55)');
        pctx.fillStyle = rg;
        pctx.beginPath();
        pctx.arc(x, y, step * 0.62, 0, TAU);
        pctx.fill();
        pctx.strokeStyle = 'rgba(220, 230, 242, 0.05)';
        pctx.lineWidth = 0.5;
        pctx.stroke();
      }
    }
  }

  // 5. Pre-baked 35mm cinema grain tiles (4 x 256x256, deterministic mulberry32)
  const grainTiles = [];
  for (let t = 0; t < 4; t++) {
    const gc = createOffscreen(256, 256);
    const gctx = gc.getContext('2d');
    const img = gctx.createImageData(256, 256);
    const data = img.data;
    const rng = mulberry32(9001 + t * 777);
    for (let i = 0; i < data.length; i += 4) {
      // Soft Gaussian-like triangular noise around 128
      const n = (rng() + rng() - 1.0) * 115;
      const v = clamp(Math.round(128 + n), 0, 255);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = Math.min(255, v + 2);
      data[i + 3] = 255;
    }
    gctx.putImageData(img, 0, 0);
    grainTiles.push(gc);
  }

  textures = {
    circularGrain,
    brushedObsidian,
    satinCarbon,
    perlagePlate,
    grainTiles,
  };
  return textures;
}

/**
 * Creates a rich 12-stop anisotropic conic metallic gradient for 18k 5N Rose Gold,
 * Gunmetal Rhodium, or Brushed Carbon.
 */
export function createMetallicConicGradient(ctx, cx, cy, lightAngle, finish = 'roseGold') {
  const g = ctx.createConicGradient(lightAngle, cx, cy);
  if (finish === 'roseGold') {
    g.addColorStop(0.0, '#7A4E2D');
    g.addColorStop(0.08, '#D49B6A');
    g.addColorStop(0.15, '#FCE2C4'); // Grazing specular peak 1
    g.addColorStop(0.23, '#D49B6A');
    g.addColorStop(0.36, '#56341C');
    g.addColorStop(0.50, '#9B6840');
    g.addColorStop(0.63, '#F2C9A0'); // Opposite specular lobe
    g.addColorStop(0.73, '#C98E5D');
    g.addColorStop(0.86, '#482A15');
    g.addColorStop(1.0, '#7A4E2D');
  } else if (finish === 'rhodium') {
    g.addColorStop(0.0, '#222630');
    g.addColorStop(0.10, '#5B6475');
    g.addColorStop(0.17, '#AEB8CA');
    g.addColorStop(0.26, '#485060');
    g.addColorStop(0.42, '#171920');
    g.addColorStop(0.58, '#3B4250');
    g.addColorStop(0.68, '#8E99AD');
    g.addColorStop(0.82, '#1A1D25');
    g.addColorStop(1.0, '#222630');
  } else {
    // Brushed PVD Obsidian Carbon / Titanium (crisp metallic specular lobes so 72T barrel teeth read sharply)
    g.addColorStop(0.0, '#12141B');
    g.addColorStop(0.12, '#393E4E');
    g.addColorStop(0.19, '#6C758A');
    g.addColorStop(0.31, '#181A22');
    g.addColorStop(0.52, '#0B0C10');
    g.addColorStop(0.68, '#444A5B');
    g.addColorStop(0.84, '#15171F');
    g.addColorStop(1.0, '#12141B');
  }
  return g;
}

/**
 * Renders dynamic Côtes de Genève (Geneva Stripes) inside a clipped bridge path,
 * finished with hand-beveled 45-deg rose-gold or rhodium anglage chamfers.
 */
export function drawCotesDeGeneveBridge(ctx, bridgePath, bounds, lightPhase, opts = {}) {
  initMaterials();
  const ribWidth = opts.ribWidth ?? 32;
  const angleRad = ((opts.angleDeg ?? -22) * Math.PI) / 180;
  const chamferGold = opts.chamferGold ?? true;

  ctx.save();
  // Deep cast shadow onto lower movement cavity
  ctx.save();
  ctx.translate(opts.shadowDx ?? 5, opts.shadowDy ?? 8);
  ctx.fillStyle = 'rgba(2, 2, 4, 0.78)';
  ctx.fill(bridgePath, 'evenodd');
  ctx.restore();

  // Dark 3D vertical flank thickness of skeletonized bridge
  ctx.save();
  ctx.translate(2.0, 3.0);
  ctx.fillStyle = chamferGold ? '#4A2D17' : '#0B0C10';
  ctx.fill(bridgePath, 'evenodd');
  ctx.restore();

  // Clip to bridge interior for Geneva ribs
  ctx.save();
  ctx.clip(bridgePath, 'evenodd');

  const cx = (bounds.x0 + bounds.x1) * 0.5;
  const cy = (bounds.y0 + bounds.y1) * 0.5;
  const diag = Math.hypot(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0) * 0.75;

  ctx.translate(cx, cy);
  ctx.rotate(angleRad);

  const numRibs = Math.ceil((diag * 2) / ribWidth) + 2;
  for (let i = -numRibs; i <= numRibs; i++) {
    const y0 = i * ribWidth;
    // Sweeping studio light across adjacent Geneva ribs
    const spatialWave = Math.cos(i * 0.35 - lightPhase);
    const hiBoost = Math.pow(Math.max(0, spatialWave), 5);

    const g = ctx.createLinearGradient(0, y0, 0, y0 + ribWidth);
    const baseDark = Math.round(17 + 8 * hiBoost);
    const midLum = Math.round(32 + 26 * (0.5 + 0.5 * spatialWave) + 36 * hiBoost);
    const peakLum = Math.round(48 + 45 * hiBoost);

    g.addColorStop(0.0, `rgb(9, 10, 14)`);
    g.addColorStop(0.08, `rgb(${baseDark}, ${baseDark + 2}, ${baseDark + 6})`);
    g.addColorStop(0.44, `rgb(${peakLum}, ${peakLum + 3}, ${peakLum + 10})`);
    g.addColorStop(0.76, `rgb(${midLum}, ${midLum + 2}, ${midLum + 7})`);
    g.addColorStop(0.96, `rgb(${baseDark - 3}, ${baseDark - 2}, ${baseDark + 1})`);
    g.addColorStop(1.0, `rgb(7, 8, 11)`);

    ctx.fillStyle = g;
    ctx.fillRect(-diag * 1.4, y0, diag * 2.8, ribWidth + 0.5);

    // Fine abrasive longitudinal brushing lines inside each Geneva stripe
    ctx.strokeStyle = `rgba(220, 230, 242, ${(0.025 + 0.045 * hiBoost).toFixed(3)})`;
    ctx.lineWidth = 0.6;
    for (let sub = 4; sub < ribWidth - 3; sub += 4.5) {
      ctx.beginPath();
      ctx.moveTo(-diag * 1.3, y0 + sub);
      ctx.lineTo(diag * 1.3, y0 + sub);
      ctx.stroke();
    }
  }
  ctx.restore();

  // 45-degree hand-polished Anglage bevel along bridge perimeter & cutouts
  const bevelGrad = ctx.createLinearGradient(bounds.x0, bounds.y0, bounds.x1, bounds.y1);
  if (chamferGold) {
    bevelGrad.addColorStop(0.0, '#F2C9A0');
    bevelGrad.addColorStop(0.28, '#D49B6A');
    bevelGrad.addColorStop(0.55, '#6E4526');
    bevelGrad.addColorStop(0.82, '#FCE2C4');
    bevelGrad.addColorStop(1.0, '#8A5832');
  } else {
    bevelGrad.addColorStop(0.0, '#DCE6F2');
    bevelGrad.addColorStop(0.35, '#687387');
    bevelGrad.addColorStop(0.70, '#22252E');
    bevelGrad.addColorStop(1.0, '#AEB8CA');
  }

  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(5, 5, 8, 0.85)';
  ctx.lineWidth = (opts.bevelWidth ?? 3.2) + 1.4;
  ctx.stroke(bridgePath);

  ctx.strokeStyle = bevelGrad;
  ctx.lineWidth = opts.bevelWidth ?? 2.6;
  ctx.stroke(bridgePath);

  ctx.restore();
}

/**
 * Renders a multi-facet pigeon-blood corundum Ruby Jewel in a recessed 18k gold chaton,
 * optionally crowned with an Incabloc golden lyre shock-absorber spring.
 */
export function drawRubyJewel(ctx, x, y, r, lightAngle = -0.7, opts = {}) {
  ctx.save();
  ctx.translate(x, y);

  // 1. Recessed mainplate sink shadow
  const chatonR = r * (opts.chatonRatio ?? 1.42);
  ctx.fillStyle = 'rgba(3, 3, 6, 0.82)';
  ctx.beginPath();
  ctx.arc(1.0, 1.5, chatonR * 1.07, 0, TAU);
  ctx.fill();

  // 2. 18k Rose Gold Chaton bevel
  if (opts.withChaton !== false) {
    const cg = createMetallicConicGradient(ctx, 0, 0, lightAngle, 'roseGold');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, chatonR, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#FCE2C4';
    ctx.lineWidth = Math.max(0.8, r * 0.08);
    ctx.stroke();

    // Inner dark bezel seat
    ctx.fillStyle = '#180509';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.06, 0, TAU);
    ctx.fill();
  }

  // 3. Synthetic corundum pigeon-blood ruby radial body (#9E1B32 core)
  const gx = -r * 0.28 * Math.cos(lightAngle);
  const gy = -r * 0.28 * Math.sin(lightAngle);
  const rg = ctx.createRadialGradient(gx, gy, r * 0.06, 0, 0, r);
  rg.addColorStop(0.0, '#FF6884');
  rg.addColorStop(0.24, '#D92648');
  rg.addColorStop(0.58, '#9E1B32');
  rg.addColorStop(0.86, '#540917');
  rg.addColorStop(1.0, '#2B040B');

  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  // 4. 8-facet jewel crown reflections + internal crescent caustic
  ctx.strokeStyle = 'rgba(255, 165, 182, 0.34)';
  ctx.lineWidth = Math.max(0.7, r * 0.055);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8 + 0.2;
    const fx = r * 0.66 * Math.cos(a);
    const fy = r * 0.66 * Math.sin(a);
    if (i === 0) ctx.moveTo(fx, fy);
    else ctx.lineTo(fx, fy);
  }
  ctx.closePath();
  ctx.stroke();

  // Opposite internal corundum caustic arc
  ctx.strokeStyle = 'rgba(255, 110, 138, 0.52)';
  ctx.lineWidth = Math.max(1.1, r * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.76, lightAngle + Math.PI - 0.65, lightAngle + Math.PI + 0.65);
  ctx.stroke();

  // 5. Optional Incabloc lyre spring (for hero balance wheel pivot jewel!)
  if (opts.incabloc) {
    ctx.save();
    ctx.rotate(opts.incablocAngle ?? 0.0);
    ctx.strokeStyle = '#F2C9A0';
    ctx.lineWidth = Math.max(1.4, r * 0.11);
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -chatonR * 0.94);
      ctx.bezierCurveTo(
        sign * chatonR * 1.18,
        -chatonR * 0.55,
        sign * chatonR * 1.12,
        chatonR * 0.55,
        sign * chatonR * 0.26,
        chatonR * 0.88
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  // 6. Hardened polished steel pivot arbor in center (unless cap-jewel)
  if (!opts.capJewel) {
    const arborR = r * 0.30;
    const ag = ctx.createRadialGradient(-arborR * 0.35, -arborR * 0.35, 0.5, 0, 0, arborR);
    ag.addColorStop(0.0, '#FFFFFF');
    ag.addColorStop(0.35, '#DCE6F2');
    ag.addColorStop(0.75, '#596375');
    ag.addColorStop(1.0, '#1B1E26');
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(0, 0, arborR, 0, TAU);
    ctx.fill();
  }

  // 7. Crisp sapphire-like top table specular highlight
  ctx.fillStyle = 'rgba(255, 245, 248, 0.78)';
  ctx.beginPath();
  ctx.ellipse(
    -r * 0.34,
    -r * 0.34,
    r * 0.20,
    r * 0.10,
    -Math.PI / 4,
    0,
    TAU
  );
  ctx.fill();

  ctx.restore();
}

/**
 * Renders a chamfered heat-blued steel horological micro-screw (#1B3B6F / #4A89DC)
 * with diametric screwdriver slot & edge highlight.
 */
export function drawBluedScrew(ctx, x, y, r, slotAngle = 0.5, lightAngle = -0.7) {
  ctx.save();
  ctx.translate(x, y);

  // Countersunk chamfer ring
  ctx.fillStyle = '#07080C';
  ctx.beginPath();
  ctx.arc(0.6, 0.9, r * 1.22, 0, TAU);
  ctx.fill();

  const sg = ctx.createConicGradient(lightAngle, 0, 0);
  sg.addColorStop(0.0, '#102447');
  sg.addColorStop(0.12, '#4A89DC');
  sg.addColorStop(0.20, '#9CC6FF');
  sg.addColorStop(0.32, '#1B3B6F');
  sg.addColorStop(0.55, '#09152B');
  sg.addColorStop(0.72, '#3870BC');
  sg.addColorStop(0.88, '#142C54');
  sg.addColorStop(1.0, '#102447');

  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  // Polished outer bevel rim
  ctx.strokeStyle = 'rgba(220, 230, 242, 0.45)';
  ctx.lineWidth = Math.max(0.6, r * 0.09);
  ctx.stroke();

  // Diametric screwdriver slot clipped to screw head
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.96, 0, TAU);
  ctx.clip();
  ctx.rotate(slotAngle);

  const slotHalf = Math.max(0.9, r * 0.16);
  ctx.fillStyle = '#05070D';
  ctx.fillRect(-r * 1.1, -slotHalf, r * 2.2, slotHalf * 2);

  // Specular glint on lower slot lip
  ctx.strokeStyle = '#DCE6F2';
  ctx.lineWidth = Math.max(0.65, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, slotHalf);
  ctx.lineTo(r * 0.92, slotHalf);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * Renders an involute spur gear with 3D axial tooth thickness, anisotropic metallic
 * gradient, rotating concentric brushed hairlines, 45-deg spoke anglage, and ruby pivot.
 */
export function drawInvoluteGear(ctx, spec, angle, lightAngle = -0.65, opts = {}) {
  const tex = initMaterials();
  const geom = getInvoluteGearGeometry(spec.N, spec.m, {
    spokes: spec.spokes ?? 5,
    hubRatio: spec.hubRatio ?? 0.24,
    solid: spec.solid ?? false,
  });

  const finish = opts.finish ?? spec.finish ?? 'roseGold';
  const extrudePx = opts.extrudePx ?? Math.max(2.2, spec.m * 0.34);

  ctx.save();
  ctx.translate(spec.x, spec.y);

  // 1. Ambient cast shadow onto lower plate
  if (opts.shadow !== false) {
    ctx.save();
    ctx.translate(extrudePx * 1.5, extrudePx * 2.2);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(2, 2, 5, 0.65)';
    ctx.fill(geom.combined, 'evenodd');
    ctx.restore();
  }

  // 2. 3D axial flank extrusion (gives real physical thickness to every involute tooth!)
  const flankColor =
    finish === 'roseGold' ? '#4E2F18' : finish === 'rhodium' ? '#14171F' : '#090A0E';
  const steps3d = 3;
  for (let s = steps3d; s >= 1; s--) {
    const frac = s / steps3d;
    ctx.save();
    ctx.translate(extrudePx * 0.7 * frac, extrudePx * frac);
    ctx.rotate(angle);
    ctx.fillStyle = flankColor;
    ctx.fill(geom.combined, 'evenodd');
    ctx.restore();
  }

  // 3. Primary metallic top face (conic gradient stays anchored to studio light while wheel rotates!)
  const faceGrad = createMetallicConicGradient(ctx, 0, 0, lightAngle, finish);
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = faceGrad;
  ctx.fill(geom.combined, 'evenodd');

  // 4. Clipped concentric circular-grained lathe hairlines rotating with the wheel!
  ctx.save();
  ctx.clip(geom.combined, 'evenodd');
  const d = geom.Ra * 2.04;
  ctx.drawImage(tex.circularGrain, -d * 0.5, -d * 0.5, d, d);

  // Subtle recessed inner web shading between hub and tooth rim
  if (!spec.solid && geom.rInnerRim > geom.rHub + 8) {
    const webGrad = ctx.createRadialGradient(0, 0, geom.rHub, 0, 0, geom.rInnerRim);
    webGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.22)');
    webGrad.addColorStop(0.5, 'rgba(255, 235, 210, 0.06)');
    webGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = webGrad;
    ctx.beginPath();
    ctx.arc(0, 0, geom.rInnerRim, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // 5. Crisp 45-deg Anglage specular highlights on spoke cutouts & tooth rim
  const rimHighlight =
    finish === 'roseGold'
      ? 'rgba(252, 226, 196, 0.65)'
      : finish === 'rhodium'
      ? 'rgba(220, 230, 242, 0.50)'
      : 'rgba(195, 208, 228, 0.44)';
  ctx.strokeStyle = rimHighlight;
  ctx.lineWidth = Math.max(0.85, spec.m * 0.11);
  ctx.stroke(geom.spokeWindows);

  ctx.strokeStyle =
    finish === 'roseGold'
      ? 'rgba(242, 201, 160, 0.46)'
      : finish === 'rhodium'
      ? 'rgba(210, 222, 238, 0.34)'
      : 'rgba(185, 198, 220, 0.42)';
  ctx.lineWidth = Math.max(0.85, spec.m * 0.095);
  ctx.stroke(geom.outerOnly);

  // Turned circular step groove inside tooth root ring
  ctx.strokeStyle = 'rgba(10, 8, 8, 0.45)';
  ctx.lineWidth = Math.max(0.9, spec.m * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, geom.rInnerRim + spec.m * 0.55, 0, TAU);
  ctx.stroke();

  ctx.restore();

  // 6. Polished central collet & pigeon-blood Ruby Jewel pivot bearing
  if (opts.withJewel !== false) {
    const colletR = Math.max(7.0, geom.rHub * 0.72);
    ctx.fillStyle = createMetallicConicGradient(
      ctx,
      0,
      0,
      lightAngle + 0.5,
      finish === 'roseGold' ? 'rhodium' : 'roseGold'
    );
    ctx.beginPath();
    ctx.arc(0, 0, colletR, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 240, 222, 0.5)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    drawRubyJewel(ctx, 0, 0, Math.max(4.5, colletR * 0.52), lightAngle, {
      withChaton: true,
      chatonRatio: 1.32,
    });
  }

  ctx.restore();
}

/**
 * Renders the Swiss Lever Pallet Fork + Ruby Pallet Stones interacting with a 20T Escape Wheel.
 * Pivot distance and fork horn geometry are calibrated so entry/exit ruby banking stones
 * physically lock and impulse the 20T club teeth cleanly!
 */
export function drawEscapementPair(ctx, escX, escY, escRadius, globalT, lightAngle = -0.65, opts = {}) {
  const tex = initMaterials();
  const state = getHorologyState(globalT);
  const escGeom = getEscapeWheelGeometry(escRadius);

  // 1. Render 20-tooth Swiss club-tooth escape wheel in 18k Rose Gold
  ctx.save();
  ctx.translate(escX, escY);

  // Shadow & 3D thickness
  ctx.save();
  ctx.translate(3.0, 4.5);
  ctx.rotate(state.escapeAngle);
  ctx.fillStyle = 'rgba(2, 2, 5, 0.70)';
  ctx.fill(escGeom.combined, 'evenodd');
  ctx.restore();

  ctx.save();
  ctx.translate(1.4, 2.0);
  ctx.rotate(state.escapeAngle);
  ctx.fillStyle = '#523018';
  ctx.fill(escGeom.combined, 'evenodd');
  ctx.restore();

  const escGrad = createMetallicConicGradient(ctx, 0, 0, lightAngle, 'roseGold');
  ctx.save();
  ctx.rotate(state.escapeAngle);
  ctx.fillStyle = escGrad;
  ctx.fill(escGeom.combined, 'evenodd');

  ctx.save();
  ctx.clip(escGeom.combined, 'evenodd');
  ctx.drawImage(tex.circularGrain, -escRadius * 1.05, -escRadius * 1.05, escRadius * 2.1, escRadius * 2.1);
  ctx.restore();

  ctx.strokeStyle = 'rgba(252, 226, 196, 0.68)';
  ctx.lineWidth = Math.max(0.8, escRadius * 0.011);
  ctx.stroke(escGeom.outerOnly);
  ctx.stroke(escGeom.spokeWindows);
  ctx.restore();

  drawRubyJewel(ctx, 0, 0, Math.max(4.5, escRadius * 0.105), lightAngle);
  ctx.restore();

  // 2. Render Swiss Lever Pallet Fork pivoted at (forkX, forkY) above-left of escape wheel
  const forkAngleAxis = opts.forkAxisAngle ?? -Math.PI * 0.72;
  const pivotDist = escRadius * 1.36;
  const forkX = escX + pivotDist * Math.cos(forkAngleAxis);
  const forkY = escY + pivotDist * Math.sin(forkAngleAxis);
  const towardEsc = Math.atan2(escY - forkY, escX - forkX);

  ctx.save();
  ctx.translate(forkX, forkY);

  // Stationary banking pins flanking the lever tail
  const tailDir = towardEsc + Math.PI;
  const bankR = escRadius * 0.62;
  for (const side of [-1, 1]) {
    const ba = tailDir + side * 0.145;
    const bx = bankR * Math.cos(ba);
    const by = bankR * Math.sin(ba);
    ctx.fillStyle = '#D49B6A';
    ctx.beginPath();
    ctx.arc(bx, by, Math.max(2.2, escRadius * 0.032), 0, TAU);
    ctx.fill();
  }

  // Oscillating pallet fork body
  ctx.rotate(towardEsc + state.palletAngle);

  const armSpan = escRadius * 0.56;
  const armReach = escRadius * 0.52;
  const tailLen = escRadius * 0.88;
  const wBar = Math.max(3.0, escRadius * 0.058);

  const forkPath = new Path2D();
  // T-yoke arms embracing 2.5 pitches of the escape wheel
  forkPath.moveTo(armReach, -armSpan);
  forkPath.lineTo(armReach + wBar * 1.2, -armSpan * 0.86);
  forkPath.quadraticCurveTo(wBar * 1.6, -wBar * 1.2, 0, -wBar * 1.35);
  // Lever stalk toward balance roller
  forkPath.lineTo(-tailLen, -wBar * 0.65);
  // Fork horns + guard dart
  forkPath.lineTo(-tailLen - wBar * 2.4, -wBar * 2.1);
  forkPath.lineTo(-tailLen - wBar * 1.1, -wBar * 0.4);
  forkPath.lineTo(-tailLen - wBar * 2.8, 0); // Guard dart
  forkPath.lineTo(-tailLen - wBar * 1.1, wBar * 0.4);
  forkPath.lineTo(-tailLen - wBar * 2.4, wBar * 2.1);
  forkPath.lineTo(-tailLen, wBar * 0.65);
  forkPath.lineTo(0, wBar * 1.35);
  forkPath.quadraticCurveTo(wBar * 1.6, wBar * 1.2, armReach + wBar * 1.2, armSpan * 0.86);
  forkPath.lineTo(armReach, armSpan);
  forkPath.quadraticCurveTo(wBar * 0.5, armSpan * 0.45, -wBar * 0.8, 0);
  forkPath.quadraticCurveTo(wBar * 0.5, -armSpan * 0.45, armReach, -armSpan);
  forkPath.closePath();

  // Shadow
  ctx.save();
  ctx.translate(2.5, 3.5);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fill(forkPath);
  ctx.restore();

  // Black-polished (spéculaire) steel pallet body
  const steelGrad = createMetallicConicGradient(ctx, 0, 0, lightAngle - towardEsc, 'rhodium');
  ctx.fillStyle = steelGrad;
  ctx.fill(forkPath);
  ctx.strokeStyle = '#DCE6F2';
  ctx.lineWidth = Math.max(0.9, escRadius * 0.014);
  ctx.stroke(forkPath);

  // Entry & Exit Pigeon-Blood Ruby Pallet Stones (#9E1B32 + #FF6B88 specular edge)
  const stoneLen = escRadius * 0.24;
  const stoneW = escRadius * 0.068;
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.translate(armReach * 0.94, sign * armSpan * 0.90);
    ctx.rotate(sign * 0.42);
    const rg = ctx.createLinearGradient(-stoneLen * 0.5, -stoneW, stoneLen * 0.5, stoneW);
    rg.addColorStop(0.0, '#4E0715');
    rg.addColorStop(0.45, '#9E1B32');
    rg.addColorStop(0.85, '#FF5C7A');
    rg.addColorStop(1.0, '#FFD0DA');
    ctx.fillStyle = rg;
    ctx.fillRect(-stoneLen * 0.25, -stoneW * 0.5, stoneLen, stoneW);
    ctx.strokeStyle = 'rgba(255, 210, 220, 0.65)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-stoneLen * 0.25, -stoneW * 0.5, stoneLen, stoneW);
    ctx.restore();
  }

  // Pallet pivot ruby jewel
  drawRubyJewel(ctx, 0, 0, Math.max(4.0, escRadius * 0.095), lightAngle - towardEsc);

  ctx.restore();
}

/**
 * Renders the free-sprung 4.000 Hz 18k Rose-Gold Balance Wheel + 8 Poincare/Gyromax
 * timing weights + concentric breathing Breguet overcoil hairspring + ruby shock bearing.
 */
export function drawBalanceWheelAssembly(ctx, cx, cy, radius, globalT, lightAngle = -0.65, opts = {}) {
  const tex = initMaterials();
  const state = getHorologyState(globalT);

  ctx.save();
  ctx.translate(cx, cy);

  // 1. Oscillating 4 Hz Balance Wheel
  ctx.save();
  ctx.rotate(state.balanceAngle);

  const rimOuter = radius;
  const rimInner = radius * 0.835;
  const hubR = radius * 0.17;

  // Build balance wheel Path2D (annular rim + beveled cross-arm)
  const balPath = new Path2D();
  balPath.arc(0, 0, rimOuter, 0, TAU);
  balPath.closePath();

  // 2 semicircular cutouts leaving 2 sleek beveled cross-arms
  for (let s = 0; s < 2; s++) {
    const a0 = s * Math.PI + 0.115;
    const a1 = (s + 1) * Math.PI - 0.115;
    const b0 = s * Math.PI + 0.072;
    const b1 = (s + 1) * Math.PI - 0.072;
    const win = new Path2D();
    win.moveTo(hubR * Math.cos(a0), hubR * Math.sin(a0));
    win.lineTo(rimInner * Math.cos(b0), rimInner * Math.sin(b0));
    win.arc(0, 0, rimInner, b0, b1, false);
    win.lineTo(hubR * Math.cos(a1), hubR * Math.sin(a1));
    win.arc(0, 0, hubR, a1, a0, true);
    win.closePath();
    balPath.addPath(win);
  }

  // Cast shadow
  ctx.save();
  ctx.translate(3.5, 5.5);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fill(balPath, 'evenodd');
  ctx.restore();

  // 3D gold rim extrusion
  ctx.save();
  ctx.translate(1.5, 2.2);
  ctx.fillStyle = '#4F2E16';
  ctx.fill(balPath, 'evenodd');
  ctx.restore();

  // 18k Rose Gold metallic rim
  ctx.fillStyle = createMetallicConicGradient(ctx, 0, 0, lightAngle - state.balanceAngle, 'roseGold');
  ctx.fill(balPath, 'evenodd');

  ctx.save();
  ctx.clip(balPath, 'evenodd');
  ctx.drawImage(tex.circularGrain, -radius * 1.04, -radius * 1.04, radius * 2.08, radius * 2.08);
  ctx.restore();

  // Diamond-turned outer & inner 45-deg chamfers
  ctx.strokeStyle = 'rgba(252, 226, 196, 0.74)';
  ctx.lineWidth = Math.max(1.0, radius * 0.015);
  ctx.beginPath();
  ctx.arc(0, 0, rimOuter - radius * 0.008, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, rimInner + radius * 0.008, 0, TAU);
  ctx.stroke();

  // 8 Free-sprung Microstella / Gyromax timing weights inset along inner rim
  const numWeights = 8;
  const wR = radius * 0.056;
  for (let i = 0; i < numWeights; i++) {
    const wa = (i * TAU) / numWeights + Math.PI / 8;
    const wx = (rimInner - wR * 0.45) * Math.cos(wa);
    const wy = (rimInner - wR * 0.45) * Math.sin(wa);

    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(wa);
    ctx.fillStyle = '#FCE2C4';
    ctx.beginPath();
    ctx.arc(0, 0, wR, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#6A4122';
    ctx.lineWidth = Math.max(0.8, wR * 0.18);
    ctx.stroke();
    // Slotted C-notch for timing regulation tool
    ctx.strokeStyle = '#180E08';
    ctx.lineWidth = Math.max(1.0, wR * 0.26);
    ctx.beginPath();
    ctx.moveTo(-wR * 0.7, 0);
    ctx.lineTo(wR * 0.7, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // End rotating balance wheel

  // 2. Breathing 11.5-turn Breguet Overcoil Hairspring
  drawBreguetHairspring(ctx, radius * 0.13, radius * 0.56, state.balanceSin, {
    studAngle: opts.studAngle ?? -Math.PI * 0.35,
  });

  // 3. Central Gold Chaton + Pigeon-Blood Ruby Shock Bearing + Incabloc Lyre Spring
  drawRubyJewel(ctx, 0, 0, Math.max(6.0, radius * 0.115), lightAngle, {
    withChaton: true,
    chatonRatio: 1.48,
    incabloc: true,
    capJewel: true,
  });

  ctx.restore();
}

/**
 * Renders the complete 60.0s 96:8 Flying Tourbillon sub-assembly inside a beveled
 * obsidian/titanium movement well.
 */
export function drawFlyingTourbillon(ctx, cx, cy, radius, globalT, lightAngle = -0.65, opts = {}) {
  const tex = initMaterials();
  const state = getHorologyState(globalT);

  ctx.save();
  ctx.translate(cx, cy);

  // 1. Deep recessed movement well + engine-turned Perlage baseplate
  const wellR = radius * 1.12;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, wellR, 0, TAU);
  ctx.clip();
  ctx.drawImage(tex.perlagePlate, -wellR, -wellR, wellR * 2, wellR * 2);

  // Deep inner shadow vignette inside tourbillon well
  const wellVig = ctx.createRadialGradient(0, 0, radius * 0.35, 0, 0, wellR);
  wellVig.addColorStop(0.0, 'rgba(6, 6, 8, 0.10)');
  wellVig.addColorStop(0.75, 'rgba(4, 4, 7, 0.52)');
  wellVig.addColorStop(1.0, 'rgba(2, 2, 4, 0.90)');
  ctx.fillStyle = wellVig;
  ctx.fillRect(-wellR, -wellR, wellR * 2, wellR * 2);
  ctx.restore();

  // 2. Stationary 96-tooth dark gunmetal fixed fourth wheel coaxial with cage!
  const fixedFourthSpec = {
    N: 96,
    m: (radius * 1.62) / 96,
    x: 0,
    y: 0,
    finish: 'rhodium',
    spokes: 6,
    hubRatio: 0.58,
  };
  drawInvoluteGear(ctx, fixedFourthSpec, 0.0, lightAngle, {
    withJewel: false,
    extrudePx: Math.max(1.6, radius * 0.015),
    shadow: false,
  });

  // 3. Stationary brushed-carbon aperture ring with 60-second scale & 3 blued bridge screws
  const ringOuter = radius * 1.18;
  const ringInner = radius * 1.03;
  const ringPath = new Path2D();
  ringPath.arc(0, 0, ringOuter, 0, TAU);
  ringPath.closePath();
  const ringHole = new Path2D();
  ringHole.arc(0, 0, ringInner, 0, TAU);
  ringHole.closePath();
  ringPath.addPath(ringHole);

  ctx.fillStyle = createMetallicConicGradient(ctx, 0, 0, lightAngle + 0.3, 'carbon');
  ctx.fill(ringPath, 'evenodd');
  ctx.strokeStyle = 'rgba(212, 155, 106, 0.55)';
  ctx.lineWidth = Math.max(1.0, radius * 0.012);
  ctx.beginPath();
  ctx.arc(0, 0, ringInner, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220, 230, 242, 0.24)';
  ctx.beginPath();
  ctx.arc(0, 0, ringOuter, 0, TAU);
  ctx.stroke();

  // 60 crisp tourbillon seconds ticks around the aperture bezel
  for (let s = 0; s < 60; s++) {
    const a = (s * TAU) / 60 - Math.PI / 2;
    const isMajor = s % 5 === 0;
    const r0 = ringInner + (ringOuter - ringInner) * (isMajor ? 0.16 : 0.34);
    const r1 = ringOuter - (ringOuter - ringInner) * 0.18;
    ctx.strokeStyle = isMajor ? '#D49B6A' : 'rgba(243, 236, 225, 0.45)';
    ctx.lineWidth = isMajor ? Math.max(1.2, radius * 0.012) : Math.max(0.7, radius * 0.006);
    ctx.beginPath();
    ctx.moveTo(r0 * Math.cos(a), r0 * Math.sin(a));
    ctx.lineTo(r1 * Math.cos(a), r1 * Math.sin(a));
    ctx.stroke();
  }

  for (let i = 0; i < 3; i++) {
    const sa = (i * TAU) / 3 - Math.PI / 6;
    const sr = (ringInner + ringOuter) * 0.5;
    // Skip tick overlap nicely with recessed blued mounting screws at 60-deg pillars
    drawBluedScrew(ctx, sr * Math.cos(sa), sr * Math.sin(sa), Math.max(2.6, radius * 0.032), sa + 0.6, lightAngle);
  }

  // 4. Rotating Tourbillon Carriage Frame (+6.00 deg/s CW = 1 rev / 60.0s exact!)
  ctx.save();
  ctx.rotate(state.tourbillonCageAngle);

  // 4a. Offset 20T Escape Wheel & Swiss Lever Pallet Fork riding inside the rotating cage!
  const escOffset = radius * 0.46;
  const escAnglePos = Math.PI * 0.52;
  const escX = escOffset * Math.cos(escAnglePos);
  const escY = escOffset * Math.sin(escAnglePos);
  drawEscapementPair(
    ctx,
    escX,
    escY,
    radius * 0.28,
    globalT,
    lightAngle - state.tourbillonCageAngle,
    { forkAxisAngle: -Math.PI * 0.52 }
  );

  // 4b. Coaxial 4.000 Hz Free-Sprung Balance Wheel + Breathing Breguet Hairspring
  drawBalanceWheelAssembly(
    ctx,
    0,
    0,
    radius * 0.78,
    globalT,
    lightAngle - state.tourbillonCageAngle,
    { studAngle: -Math.PI * 0.33 }
  );

  // 4c. Upper Sculpted Tri-Spoke 18k Rose-Gold Flying Tourbillon Cage Bridge
  const cageGeom = buildTourbillonCagePath(radius * 0.98);

  // Cage drop shadow onto oscillating balance wheel below
  ctx.save();
  ctx.translate(2.8, 4.2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.fill(cageGeom.combined, 'evenodd');
  ctx.restore();

  // 3D beveled gold thickness
  ctx.save();
  ctx.translate(1.2, 1.8);
  ctx.fillStyle = '#523018';
  ctx.fill(cageGeom.combined, 'evenodd');
  ctx.restore();

  ctx.fillStyle = createMetallicConicGradient(
    ctx,
    0,
    0,
    lightAngle - state.tourbillonCageAngle,
    'roseGold'
  );
  ctx.fill(cageGeom.combined, 'evenodd');

  ctx.save();
  ctx.clip(cageGeom.combined, 'evenodd');
  ctx.drawImage(tex.circularGrain, -radius, -radius, radius * 2, radius * 2);
  ctx.restore();

  // Mirror-polished 45-deg Anglage highlights along all 3 lyre cage arms
  ctx.strokeStyle = '#FCE2C4';
  ctx.lineWidth = Math.max(1.1, radius * 0.015);
  ctx.stroke(cageGeom.windows);

  ctx.strokeStyle = 'rgba(242, 201, 160, 0.72)';
  ctx.lineWidth = Math.max(1.0, radius * 0.012);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.98, 0, TAU);
  ctx.stroke();

  // 3 Heat-blued perimeter pillar micro-screws on the rotating tourbillon rim + seconds index tip
  for (let i = 0; i < 3; i++) {
    const pa = (i * TAU) / 3;
    const pr = radius * 0.895;
    drawBluedScrew(
      ctx,
      pr * Math.cos(pa),
      pr * Math.sin(pa),
      Math.max(2.5, radius * 0.034),
      pa + 0.9,
      lightAngle - state.tourbillonCageAngle
    );
  }

  // Blued-steel & sapphire-glint tourbillon seconds pointer extending cleanly past outer cage rim
  ctx.fillStyle = '#DCE6F2';
  ctx.strokeStyle = '#4A89DC';
  ctx.lineWidth = Math.max(0.8, radius * 0.006);
  ctx.beginPath();
  ctx.moveTo(radius * 1.075, 0);
  ctx.lineTo(radius * 0.965, -radius * 0.022);
  ctx.lineTo(radius * 0.965, radius * 0.022);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Upper central Ruby shock-jewel chaton crowning the flying cage hub
  drawRubyJewel(
    ctx,
    0,
    0,
    Math.max(5.5, radius * 0.095),
    lightAngle - state.tourbillonCageAngle,
    { withChaton: true, chatonRatio: 1.52, incabloc: true, capJewel: true }
  );

  ctx.restore(); // End rotating cage
  ctx.restore();
}
