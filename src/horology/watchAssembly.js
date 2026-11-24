/**
 * src/horology/watchAssembly.js
 * Complete flagship watch renderer for VAUCHER NOIR — CALIBER 01:
 * Sculpted octagonal-cushion brushed obsidian carbon/titanium case, integrated beveled lugs
 * & bracelet links, stepped 18k 5N Rose Gold bezel with 8 tangential bolts, fluted crown,
 * multi-tiered skeletonized Côtes de Genève dial, live meshed going train, 6:00 Flying
 * Tourbillon, diamond-cut baton indices, split-facet 10:10 dauphine hands, and domed sapphire glare.
 */

import { TAU, getHorologyState, getChronoAngle } from './math.js';
import {
  initMaterials,
  createMetallicConicGradient,
  drawCotesDeGeneveBridge,
  drawInvoluteGear,
  drawRubyJewel,
  drawBluedScrew,
  drawFlyingTourbillon,
} from './materials.js';

/**
 * Helper: builds a rounded regular/sculpted octagon Path2D (Royal Oak x Overseas luxury geometry).
 */
export function buildRoundedOctagonPath(R, cornerFilletRatio = 0.28, rotationOffset = Math.PI / 8) {
  const path = new Path2D();
  const sides = 8;
  const verts = [];
  for (let i = 0; i < sides; i++) {
    const a = rotationOffset + (i * TAU) / sides;
    verts.push([R * Math.cos(a), R * Math.sin(a)]);
  }
  for (let i = 0; i < sides; i++) {
    const prev = verts[(i + sides - 1) % sides];
    const curr = verts[i];
    const next = verts[(i + 1) % sides];
    const p1x = curr[0] + (prev[0] - curr[0]) * cornerFilletRatio;
    const p1y = curr[1] + (prev[1] - curr[1]) * cornerFilletRatio;
    const p2x = curr[0] + (next[0] - curr[0]) * cornerFilletRatio;
    const p2y = curr[1] + (next[1] - curr[1]) * cornerFilletRatio;
    if (i === 0) path.moveTo(p1x, p1y);
    else path.lineTo(p1x, p1y);
    path.quadraticCurveTo(curr[0], curr[1], p2x, p2y);
  }
  path.closePath();
  return path;
}

/**
 * Draws a split-facet 3D Haute Horlogerie Dauphine hand (longitudinal bright/dark mirror planes
 * meeting along a razor-sharp central ridge + openworked skeleton slot).
 */
export function drawDauphineHand(ctx, angle, length, tailLength, halfWidth, opts = {}) {
  ctx.save();
  ctx.rotate(angle);

  // Drop shadow onto skeleton dial below
  ctx.save();
  ctx.rotate(-angle);
  ctx.translate(4.0, 6.5);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.beginPath();
  ctx.moveTo(length, 0);
  ctx.lineTo(0, -halfWidth);
  ctx.lineTo(-tailLength, -halfWidth * 0.48);
  ctx.lineTo(-tailLength * 1.12, 0);
  ctx.lineTo(-tailLength, halfWidth * 0.48);
  ctx.lineTo(0, halfWidth);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Upper longitudinal facet (-Y side in hand space): bright specular 18k Rose Gold (#FCE2C4 -> #D49B6A)
  const upperGrad = ctx.createLinearGradient(-tailLength, -halfWidth, length, 0);
  upperGrad.addColorStop(0.0, '#C98E5B');
  upperGrad.addColorStop(0.35, '#FCE2C4');
  upperGrad.addColorStop(0.75, '#F2C9A0');
  upperGrad.addColorStop(1.0, '#FFF4E4');

  ctx.fillStyle = upperGrad;
  ctx.beginPath();
  ctx.moveTo(length, 0);
  ctx.lineTo(0, -halfWidth);
  ctx.lineTo(-tailLength, -halfWidth * 0.48);
  ctx.lineTo(-tailLength * 1.12, 0);
  ctx.closePath();
  ctx.fill();

  // Lower longitudinal facet (+Y side in hand space): rich warm shadow 18k Rose Gold (#693F20 -> #B57B4C)
  const lowerGrad = ctx.createLinearGradient(-tailLength, 0, length, halfWidth);
  lowerGrad.addColorStop(0.0, '#523017');
  lowerGrad.addColorStop(0.45, '#85532D');
  lowerGrad.addColorStop(0.85, '#B87E50');
  lowerGrad.addColorStop(1.0, '#D49B6A');

  ctx.fillStyle = lowerGrad;
  ctx.beginPath();
  ctx.moveTo(length, 0);
  ctx.lineTo(-tailLength * 1.12, 0);
  ctx.lineTo(-tailLength, halfWidth * 0.48);
  ctx.lineTo(0, halfWidth);
  ctx.closePath();
  ctx.fill();

  // Warm Ivory luminous inlay near forward tip + openworked skeleton cutout near base
  if (!opts.solid) {
    // Recessed dark skeleton cutout window
    ctx.fillStyle = '#0A0B0F';
    ctx.strokeStyle = '#FCE2C4';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(length * 0.46, 0);
    ctx.lineTo(length * 0.12, -halfWidth * 0.36);
    ctx.lineTo(length * 0.12, halfWidth * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Warm Ivory Super-LumiNova tip needle
    ctx.fillStyle = '#F3ECE1';
    ctx.beginPath();
    ctx.moveTo(length * 0.88, 0);
    ctx.lineTo(length * 0.52, -halfWidth * 0.22);
    ctx.lineTo(length * 0.52, halfWidth * 0.22);
    ctx.closePath();
    ctx.fill();
  }

  // Razor-sharp central spine highlight
  ctx.strokeStyle = 'rgba(255, 248, 238, 0.85)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-tailLength * 1.08, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the slender central sweep seconds / chronograph trotteuse hand with open diamond counterweight.
 */
export function drawSecondsTrotteuse(ctx, angle, length, tailLength) {
  ctx.save();
  ctx.rotate(angle);

  // Shadow
  ctx.save();
  ctx.rotate(-angle);
  ctx.translate(3.0, 5.0);
  ctx.rotate(angle);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-tailLength, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();
  ctx.restore();

  const sg = ctx.createLinearGradient(-tailLength, 0, length, 0);
  sg.addColorStop(0.0, '#C98E5D');
  sg.addColorStop(0.5, '#FCE2C4');
  sg.addColorStop(0.88, '#D49B6A');
  sg.addColorStop(1.0, '#F3ECE1');

  ctx.strokeStyle = sg;
  ctx.lineWidth = 1.85;
  ctx.beginPath();
  ctx.moveTo(-tailLength * 0.58, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();

  // Openworked diamond counterweight tail
  ctx.fillStyle = '#D49B6A';
  ctx.strokeStyle = '#FCE2C4';
  ctx.lineWidth = 1.2;
  const dPath = new Path2D();
  dPath.moveTo(-tailLength * 0.55, 0);
  dPath.lineTo(-tailLength * 0.82, -6.2);
  dPath.lineTo(-tailLength * 1.08, 0);
  dPath.lineTo(-tailLength * 0.82, 6.2);
  dPath.closePath();

  const dHole = new Path2D();
  dHole.moveTo(-tailLength * 0.66, 0);
  dHole.lineTo(-tailLength * 0.82, -3.2);
  dHole.lineTo(-tailLength * 0.97, 0);
  dHole.lineTo(-tailLength * 0.82, 3.2);
  dHole.closePath();
  dPath.addPath(dHole);

  ctx.fill(dPath, 'evenodd');
  ctx.stroke(dPath);

  ctx.restore();
}

/**
 * Draws an applied 4-facet diamond-cut 18k Rose-Gold baton hour marker with Warm Ivory inlay.
 */
export function drawAppliedBatonIndex(ctx, angle, rInner, rOuter, halfW, lightAngle = -0.65, extraGlow = 0) {
  ctx.save();
  ctx.rotate(angle);

  // Drop shadow on radial-brushed chapter ring
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(rInner - 1.5, -halfW + 2.0, rOuter - rInner + 2.0, halfW * 2 + 1.5);

  const len = rOuter - rInner;
  const bevel = Math.min(halfW * 0.45, 3.5);

  // Determine how strongly studio rim-light hits this index angle
  const align = Math.cos(angle - lightAngle);
  const topBright = align > -0.2 ? '#FCE2C4' : '#D49B6A';
  const botDark = align > 0.3 ? '#B67D4F' : '#59351B';

  // Upper bevel trapezoid
  ctx.fillStyle = topBright;
  ctx.beginPath();
  ctx.moveTo(rInner, -halfW);
  ctx.lineTo(rOuter, -halfW);
  ctx.lineTo(rOuter - bevel, 0);
  ctx.lineTo(rInner + bevel, 0);
  ctx.closePath();
  ctx.fill();

  // Lower bevel trapezoid
  ctx.fillStyle = botDark;
  ctx.beginPath();
  ctx.moveTo(rInner + bevel, 0);
  ctx.lineTo(rOuter - bevel, 0);
  ctx.lineTo(rOuter, halfW);
  ctx.lineTo(rInner, halfW);
  ctx.closePath();
  ctx.fill();

  // End-cap bevels (pointing toward dial center and rehaut)
  ctx.fillStyle = '#F2C9A0';
  ctx.beginPath();
  ctx.moveTo(rInner, -halfW);
  ctx.lineTo(rInner + bevel, 0);
  ctx.lineTo(rInner, halfW);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7A4E2D';
  ctx.beginPath();
  ctx.moveTo(rOuter, -halfW);
  ctx.lineTo(rOuter - bevel, 0);
  ctx.lineTo(rOuter, halfW);
  ctx.closePath();
  ctx.fill();

  // Central Warm Ivory luminous inlay strip
  if (halfW >= 3.2) {
    ctx.fillStyle = '#F3ECE1';
    ctx.fillRect(
      rInner + bevel * 1.45,
      -halfW * 0.28,
      Math.max(2, len - bevel * 2.9),
      halfW * 0.56
    );
  }

  // Optional sequential rim-flash specular bloom (for Chunk 4 S13!)
  if (extraGlow > 0.01) {
    const cx = (rInner + rOuter) * 0.5;
    const gg = ctx.createRadialGradient(cx, 0, 1, cx, 0, len * 0.85);
    gg.addColorStop(0.0, `rgba(255, 244, 224, ${(0.85 * extraGlow).toFixed(3)})`);
    gg.addColorStop(0.35, `rgba(242, 201, 160, ${(0.45 * extraGlow).toFixed(3)})`);
    gg.addColorStop(1.0, 'rgba(212, 155, 106, 0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(cx, 0, len * 0.85, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws the sculpted 12:00 Vaucher Noir Maltese-Compass Rose-Gold Emblem + Engraved Plaque.
 */
function drawTwelveOClockCrest(ctx, dialR, lightAngle) {
  const cy = -dialR * 0.57;

  ctx.save();
  ctx.translate(0, cy);

  // Satin-brushed obsidian trapezoidal cartouche plate with 45-deg rose-gold chamfer
  const pwTop = dialR * 0.44;
  const pwBot = dialR * 0.38;
  const ph = dialR * 0.19;
  const plate = new Path2D();
  plate.moveTo(-pwTop * 0.5, -ph * 0.42);
  plate.lineTo(pwTop * 0.5, -ph * 0.42);
  plate.lineTo(pwBot * 0.5, ph * 0.58);
  plate.lineTo(-pwBot * 0.5, ph * 0.58);
  plate.closePath();

  ctx.fillStyle = 'rgba(4, 4, 7, 0.88)';
  ctx.save();
  ctx.translate(2, 3.5);
  ctx.fill(plate);
  ctx.restore();

  const pg = ctx.createLinearGradient(-pwTop * 0.5, -ph * 0.5, pwTop * 0.5, ph * 0.5);
  pg.addColorStop(0.0, '#101116');
  pg.addColorStop(0.5, '#1D2028');
  pg.addColorStop(1.0, '#0E0F14');
  ctx.fillStyle = pg;
  ctx.fill(plate);

  ctx.strokeStyle = 'rgba(212, 155, 106, 0.72)';
  ctx.lineWidth = Math.max(1.0, dialR * 0.0045);
  ctx.stroke(plate);

  // Applied 3D 4-point sculpted Vaucher Star / Maltese Emblem above VAUCHER NOIR
  const starY = -ph * 0.14;
  const starR = dialR * 0.046;
  ctx.save();
  ctx.translate(0, starY);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 2);
    ctx.fillStyle = i % 2 === 0 ? '#FCE2C4' : '#D49B6A';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-starR * 0.24, -starR * 0.36);
    ctx.lineTo(0, -starR);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7A4E2D';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -starR);
    ctx.lineTo(starR * 0.24, -starR * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Crisp engraved dial typography: VAUCHER NOIR / GENÈVE
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F3ECE1';
  ctx.font = `600 ${Math.max(10, dialR * 0.052).toFixed(1)}px "Cinzel", serif`;
  ctx.letterSpacing = `${(dialR * 0.009).toFixed(2)}px`;
  ctx.fillText('VAUCHER NOIR', dialR * 0.004, ph * 0.20);

  ctx.fillStyle = '#D49B6A';
  ctx.font = `500 ${Math.max(7.5, dialR * 0.029).toFixed(1)}px "Montserrat", sans-serif`;
  ctx.letterSpacing = `${(dialR * 0.011).toFixed(2)}px`;
  ctx.fillText('GENÈVE', dialR * 0.005, ph * 0.42);
  ctx.letterSpacing = '0px';

  ctx.restore();
}

/**
 * Renders the complete VAUCHER NOIR — CALIBER 01 watch head & integrated lugs/links.
 * Base nominal dial radius = `dialR` (default 300px), centered at `(cx, cy)`, with optional
 * 3D foreshortening `tiltX` (horizontal perspective compression) and `rotation`.
 */
export function drawFullWatch(ctx, opts = {}) {
  const tex = initMaterials();
  const cx = opts.cx ?? 960;
  const cy = opts.cy ?? 540;
  const dialR = opts.dialR ?? 300;
  const globalT = opts.globalT ?? 0;
  const lightAngle = opts.lightAngle ?? -0.68;
  const scaleX = opts.scaleX ?? 1.0;
  const scaleY = opts.scaleY ?? 1.0;
  const rotation = opts.rotation ?? 0.0;
  const showCase = opts.showCase !== false;
  const sapphireSweepPos = opts.sapphireSweepPos ?? null; // [-1.2 .. +1.2] across crystal
  const chronoOverrideLocalT = opts.chronoOverrideLocalT ?? null;
  const indexFlashAngle = opts.indexFlashAngle ?? null;

  const state = getHorologyState(globalT);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.scale(scaleX, scaleY);

  const bezelOuterR = dialR * 1.24;
  const caseOuterR = dialR * 1.35;

  // =========================================================================
  // 1. INTEGRATED SATIN-BRUSHED CARBON LUGS, H-LINKS, CROWN GUARDS & 18K CROWN
  // =========================================================================
  if (showCase) {
    // Soft ambient studio aura behind case so dark carbon silhouette pops cleanly from #060608!
    const auraR = caseOuterR * 1.55;
    const aura = ctx.createRadialGradient(
      -caseOuterR * 0.25 * Math.cos(lightAngle),
      -caseOuterR * 0.25 * Math.sin(lightAngle),
      caseOuterR * 0.65,
      0,
      0,
      auraR
    );
    aura.addColorStop(0.0, 'rgba(212, 155, 106, 0.14)');
    aura.addColorStop(0.45, 'rgba(38, 42, 54, 0.18)');
    aura.addColorStop(1.0, 'rgba(6, 6, 8, 0.0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, TAU);
    ctx.fill();

    // Top & Bottom Integrated Lugs + 2 Articulated Bracelet Links
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.scale(1, dir);

      // Integrated tapered lug hood
      const lugW0 = caseOuterR * 0.72;
      const lugW1 = caseOuterR * 0.52;
      const lugY0 = caseOuterR * 0.74;
      const lugY1 = caseOuterR * 1.48;

      const lugPath = new Path2D();
      lugPath.moveTo(-lugW0, lugY0);
      lugPath.lineTo(lugW0, lugY0);
      lugPath.lineTo(lugW1, lugY1);
      lugPath.lineTo(-lugW1, lugY1);
      lugPath.closePath();

      ctx.save();
      ctx.clip(lugPath);
      ctx.drawImage(tex.satinCarbon, -lugW0, lugY0, lugW0 * 2, lugY1 - lugY0 + 20);
      // Directional studio gradient across lug hood
      const lg = ctx.createLinearGradient(-lugW0, lugY0, lugW0, lugY1);
      lg.addColorStop(0.0, 'rgba(220, 230, 242, 0.10)');
      lg.addColorStop(0.45, 'rgba(21, 22, 26, 0.20)');
      lg.addColorStop(1.0, 'rgba(4, 4, 7, 0.78)');
      ctx.fillStyle = lg;
      ctx.fillRect(-lugW0, lugY0, lugW0 * 2, lugY1 - lugY0 + 10);
      ctx.restore();

      // 45-degree 18k Rose-Gold mirror-polished shoulder chamfers on both lug flanks!
      const chamferW = dialR * 0.032;
      for (const side of [-1, 1]) {
        const cg = ctx.createLinearGradient(0, lugY0, 0, lugY1);
        cg.addColorStop(0.0, side < 0 ? '#FCE2C4' : '#D49B6A');
        cg.addColorStop(0.65, side < 0 ? '#D49B6A' : '#7A4E2D');
        cg.addColorStop(1.0, 'rgba(122, 78, 45, 0.15)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(side * lugW0, lugY0);
        ctx.lineTo(side * (lugW0 - chamferW), lugY0);
        ctx.lineTo(side * (lugW1 - chamferW * 0.8), lugY1);
        ctx.lineTo(side * lugW1, lugY1);
        ctx.closePath();
        ctx.fill();
      }

      // Twin 18k Rose-Gold interlink studs + 2 articulated bracelet links fading into studio dark
      for (let link = 0; link < 2; link++) {
        const yA = lugY1 + 5 + link * (dialR * 0.24);
        const yB = yA + dialR * 0.21;
        const wA = lugW1 * (1 - link * 0.06);
        const wB = lugW1 * (1 - (link + 1) * 0.06);
        const fade = link === 0 ? 0.85 : 0.42;

        ctx.save();
        ctx.globalAlpha = fade;
        // Satin carbon H-link
        ctx.fillStyle = '#14161C';
        ctx.strokeStyle = 'rgba(220, 230, 242, 0.16)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-wA, yA);
        ctx.lineTo(wA, yA);
        ctx.lineTo(wB, yB);
        ctx.lineTo(-wB, yB);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Twin polished 18k Rose-Gold connector interlinks!
        for (const s of [-0.42, 0.42]) {
          const ix = s * wA;
          const iw = dialR * 0.062;
          const ig = ctx.createLinearGradient(ix - iw, yA - 6, ix + iw, yA + 18);
          ig.addColorStop(0.0, '#FCE2C4');
          ig.addColorStop(0.5, '#D49B6A');
          ig.addColorStop(1.0, '#6A4122');
          ctx.fillStyle = ig;
          ctx.fillRect(ix - iw * 0.5, yA - 5, iw, dialR * 0.085);
        }
        ctx.restore();
      }

      // Smooth studio shadow gradient dissolving outer bracelet tail seamlessly into #060608 void
      const tailEnd = lugY1 + dialR * 0.52;
      const tailFade = ctx.createLinearGradient(0, lugY1 + dialR * 0.10, 0, tailEnd);
      tailFade.addColorStop(0.0, 'rgba(6, 6, 8, 0.0)');
      tailFade.addColorStop(0.75, 'rgba(6, 6, 8, 0.82)');
      tailFade.addColorStop(1.0, 'rgba(6, 6, 8, 1.0)');
      ctx.fillStyle = tailFade;
      ctx.fillRect(-lugW0 * 1.1, lugY1 + dialR * 0.10, lugW0 * 2.2, dialR * 0.46);

      ctx.restore();
    }

    // 3:00 Crown Guards + Fluted 18k Rose-Gold Screw-Down Crown
    ctx.save();
    // Brushed carbon crown guard shoulders
    const cgPath = new Path2D();
    cgPath.moveTo(caseOuterR * 0.86, -dialR * 0.34);
    cgPath.lineTo(caseOuterR * 1.04, -dialR * 0.20);
    cgPath.lineTo(caseOuterR * 1.04, dialR * 0.20);
    cgPath.lineTo(caseOuterR * 0.86, dialR * 0.34);
    cgPath.closePath();
    ctx.fillStyle = '#181A21';
    ctx.fill(cgPath);
    ctx.strokeStyle = '#D49B6A';
    ctx.lineWidth = 1.5;
    ctx.stroke(cgPath);

    // Fluted 18k Rose-Gold hexagonal/knurled crown
    const crX = caseOuterR * 1.02;
    const crW = dialR * 0.145;
    const crH = dialR * 0.25;
    const crGrad = ctx.createLinearGradient(crX, -crH * 0.5, crX, crH * 0.5);
    crGrad.addColorStop(0.0, '#6B4223');
    crGrad.addColorStop(0.22, '#FCE2C4');
    crGrad.addColorStop(0.48, '#D49B6A');
    crGrad.addColorStop(0.76, '#F2C9A0');
    crGrad.addColorStop(1.0, '#59351B');
    ctx.fillStyle = crGrad;
    ctx.beginPath();
    ctx.roundRect(crX, -crH * 0.5, crW, crH, dialR * 0.022);
    ctx.fill();

    // Knurled horizontal fluting ribs on crown
    const ribs = 11;
    for (let i = 1; i < ribs; i++) {
      const ry = -crH * 0.46 + (i / ribs) * (crH * 0.92);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(65, 36, 16, 0.78)' : 'rgba(255, 238, 215, 0.65)';
      ctx.lineWidth = dialR * 0.008;
      ctx.beginPath();
      ctx.moveTo(crX + 2, ry);
      ctx.lineTo(crX + crW - 3, ry);
      ctx.stroke();
    }
    ctx.restore();

    // Sculpted Octagonal-Cushion Brushed Obsidian Midcase
    const midCasePath = buildRoundedOctagonPath(caseOuterR, 0.30, Math.PI / 8);
    ctx.save();
    ctx.translate(4, 8);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fill(midCasePath);
    ctx.restore();

    ctx.save();
    ctx.clip(midCasePath);
    ctx.drawImage(tex.satinCarbon, -caseOuterR, -caseOuterR, caseOuterR * 2, caseOuterR * 2);
    const caseRim = createMetallicConicGradient(ctx, 0, 0, lightAngle, 'carbon');
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = caseRim;
    ctx.fillRect(-caseOuterR, -caseOuterR, caseOuterR * 2, caseOuterR * 2);
    ctx.restore();

    // Outer rim grazing highlight on midcase
    const midStroke = createMetallicConicGradient(ctx, 0, 0, lightAngle, 'rhodium');
    ctx.strokeStyle = midStroke;
    ctx.lineWidth = Math.max(1.8, dialR * 0.008);
    ctx.stroke(midCasePath);

    // =========================================================================
    // 2. STEPPED 18K 5N ROSE-GOLD OCTAGONAL BEZEL + 8 TANGENTIAL HEX BOLTS
    // =========================================================================
    const bezelOuterPath = buildRoundedOctagonPath(bezelOuterR, 0.27, Math.PI / 8);
    const bezelChamferInnerPath = buildRoundedOctagonPath(bezelOuterR * 0.945, 0.27, Math.PI / 8);

    // 45-degree mirror-polished outer Rose-Gold Bezel Chamfer (catches blazing #FCE2C4 speculars!)
    ctx.save();
    ctx.translate(2, 4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
    ctx.fill(bezelOuterPath);
    ctx.restore();

    ctx.fillStyle = createMetallicConicGradient(ctx, 0, 0, lightAngle, 'roseGold');
    ctx.fill(bezelOuterPath);

    // Satin-brushed flat upper bezel deck (slightly warmer/softer conic contrast)
    ctx.save();
    ctx.clip(bezelChamferInnerPath);
    ctx.fillStyle = createMetallicConicGradient(ctx, 0, 0, lightAngle + 0.14, 'roseGold');
    ctx.fillRect(-bezelOuterR, -bezelOuterR, bezelOuterR * 2, bezelOuterR * 2);
    ctx.globalAlpha = 0.65;
    ctx.drawImage(
      tex.circularGrain,
      -bezelOuterR,
      -bezelOuterR,
      bezelOuterR * 2,
      bezelOuterR * 2
    );
    ctx.restore();

    // Crisp specular ridge between vertical satin deck and 45-deg outer chamfer
    ctx.strokeStyle = 'rgba(255, 240, 220, 0.72)';
    ctx.lineWidth = Math.max(1.2, dialR * 0.005);
    ctx.stroke(bezelChamferInnerPath);

    // 8 Recessed Hexagonal/Slotted Gold & Rhodium Bezel Bolts at Octagon Vertices
    const boltRingR = (bezelOuterR * 0.945 + dialR * 1.03) * 0.505;
    const boltR = dialR * 0.031;
    for (let i = 0; i < 8; i++) {
      const ba = Math.PI / 8 + (i * TAU) / 8;
      const bx = boltRingR * Math.cos(ba);
      const by = boltRingR * Math.sin(ba);

      ctx.save();
      ctx.translate(bx, by);
      // Countersunk dark recess
      ctx.fillStyle = '#1B1109';
      ctx.beginPath();
      ctx.arc(0, 0, boltR * 1.22, 0, TAU);
      ctx.fill();

      // Hexagonal white-gold / rhodium contrast bolt head
      ctx.rotate(ba);
      ctx.fillStyle = createMetallicConicGradient(ctx, 0, 0, lightAngle - ba, 'rhodium');
      ctx.beginPath();
      for (let h = 0; h < 6; h++) {
        const ha = (h * TAU) / 6;
        const hx = boltR * Math.cos(ha);
        const hy = boltR * Math.sin(ha);
        if (h === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#DCE6F2';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Tangential precision slot aligned around the bezel circle!
      ctx.strokeStyle = '#090A0E';
      ctx.lineWidth = Math.max(1.2, boltR * 0.22);
      ctx.beginPath();
      ctx.moveTo(0, -boltR * 0.78);
      ctx.lineTo(0, boltR * 0.78);
      ctx.stroke();
      ctx.restore();
    }

    // Inner Polished Rose-Gold Crystal Retaining Ring
    ctx.fillStyle = '#08090D';
    ctx.beginPath();
    ctx.arc(0, 0, dialR * 1.03, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = createMetallicConicGradient(ctx, 0, 0, lightAngle + Math.PI, 'roseGold');
    ctx.lineWidth = dialR * 0.022;
    ctx.beginPath();
    ctx.arc(0, 0, dialR * 1.022, 0, TAU);
    ctx.stroke();
  }

  // =========================================================================
  // 3. MULTI-TIERED SKELETONIZED OBSIDIAN DIAL & LIVE MOVEMENT (Clipped to dialR)
  // =========================================================================
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, dialR, 0, TAU);
  ctx.clip();

  // Tier 3A: Deep Engine-Turned Perlage Mainplate Floor
  ctx.drawImage(tex.perlagePlate, -dialR, -dialR, dialR * 2, dialR * 2);
  ctx.fillStyle = 'rgba(5, 6, 9, 0.52)';
  ctx.fillRect(-dialR, -dialR, dialR * 2, dialR * 2);

  // Tier 3B: Visible Live Meshed Going-Train Wheels inside Skeleton Cutout!
  // Openworked Mainspring Barrel at 10:30 + Center Wheel + Third & Fourth Wheels
  const dialMod = dialR * 0.0085;
  const barrelR = dialMod * 36;
  const barrelX = -dialR * 0.30;
  const barrelY = -dialR * 0.25;

  // Coiled rose-gold mainspring visible inside openworked barrel drum!
  ctx.save();
  ctx.translate(barrelX, barrelY);
  ctx.fillStyle = '#090A0E';
  ctx.beginPath();
  ctx.arc(0, 0, barrelR * 0.85, 0, TAU);
  ctx.fill();
  for (let c = 0; c < 6; c++) {
    const cr = barrelR * (0.28 + c * 0.085);
    ctx.strokeStyle = c % 2 === 0 ? 'rgba(212, 155, 106, 0.55)' : 'rgba(122, 78, 45, 0.45)';
    ctx.lineWidth = Math.max(1.2, dialR * 0.006);
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  drawInvoluteGear(
    ctx,
    { N: 64, m: dialMod * 1.08, x: barrelX, y: barrelY, finish: 'carbon', spokes: 6, hubRatio: 0.26 },
    state.gearAngles[0],
    lightAngle,
    { extrudePx: dialR * 0.008 }
  );

  // Meshed 18k Rose-Gold Center Wheel & Rhodium Third Wheel at 1:30-2:30
  drawInvoluteGear(
    ctx,
    { N: 48, m: dialMod * 1.05, x: dialR * 0.26, y: -dialR * 0.22, finish: 'rhodium', spokes: 5, hubRatio: 0.24 },
    state.gearAngles[2],
    lightAngle,
    { extrudePx: dialR * 0.008 }
  );
  drawInvoluteGear(
    ctx,
    { N: 42, m: dialMod * 1.12, x: 0, y: -dialR * 0.02, finish: 'roseGold', spokes: 5, hubRatio: 0.24 },
    state.gearAngles[1],
    lightAngle,
    { extrudePx: dialR * 0.009 }
  );
  drawInvoluteGear(
    ctx,
    { N: 28, m: dialMod * 1.05, x: dialR * 0.34, y: dialR * 0.09, finish: 'roseGold', spokes: 4, hubRatio: 0.26 },
    state.gearAngles[3],
    lightAngle,
    { extrudePx: dialR * 0.007 }
  );
  drawInvoluteGear(
    ctx,
    { N: 28, m: dialMod * 1.05, x: -dialR * 0.34, y: dialR * 0.09, finish: 'rhodium', spokes: 4, hubRatio: 0.26 },
    -state.gearAngles[3],
    lightAngle,
    { extrudePx: dialR * 0.007 }
  );

  // Tier 3C: Architectural Openworked Côtes de Genève Bridges with 45-deg Rose-Gold Anglage!
  const bridgePath = new Path2D();
  // Left architectural wing bridge
  bridgePath.moveTo(-dialR * 0.78, -dialR * 0.16);
  bridgePath.lineTo(-dialR * 0.20, -dialR * 0.08);
  bridgePath.lineTo(-dialR * 0.14, dialR * 0.16);
  bridgePath.lineTo(-dialR * 0.44, dialR * 0.42);
  bridgePath.lineTo(-dialR * 0.78, dialR * 0.24);
  bridgePath.closePath();

  // Right architectural wing bridge
  bridgePath.moveTo(dialR * 0.78, -dialR * 0.16);
  bridgePath.lineTo(dialR * 0.20, -dialR * 0.08);
  bridgePath.lineTo(dialR * 0.14, dialR * 0.16);
  bridgePath.lineTo(dialR * 0.44, dialR * 0.42);
  bridgePath.lineTo(dialR * 0.78, dialR * 0.24);
  bridgePath.closePath();

  // Upper Y-caliber barrel bridge
  bridgePath.moveTo(-dialR * 0.56, -dialR * 0.68);
  bridgePath.lineTo(dialR * 0.56, -dialR * 0.68);
  bridgePath.lineTo(dialR * 0.34, -dialR * 0.34);
  bridgePath.lineTo(-dialR * 0.34, -dialR * 0.34);
  bridgePath.closePath();

  drawCotesDeGeneveBridge(
    ctx,
    bridgePath,
    { x0: -dialR * 0.8, y0: -dialR * 0.7, x1: dialR * 0.8, y1: dialR * 0.5 },
    lightAngle * 2.0,
    { ribWidth: Math.max(12, dialR * 0.075), chamferGold: true, bevelWidth: Math.max(1.5, dialR * 0.007) }
  );

  // Ruby Jewel Chatons & Heat-Blued Micro-Screws mounted on the skeleton bridges
  const jewelPts = [
    [-dialR * 0.28, dialR * 0.06],
    [dialR * 0.28, dialR * 0.06],
    [-dialR * 0.24, -dialR * 0.46],
    [dialR * 0.24, -dialR * 0.46],
  ];
  for (const [jx, jy] of jewelPts) {
    drawRubyJewel(ctx, jx, jy, Math.max(3.5, dialR * 0.024), lightAngle);
  }
  const screwPts = [
    [-dialR * 0.60, dialR * 0.04, 0.4],
    [dialR * 0.60, dialR * 0.04, -0.5],
    [-dialR * 0.45, dialR * 0.28, 1.1],
    [dialR * 0.45, dialR * 0.28, -1.1],
    [-dialR * 0.40, -dialR * 0.54, 0.8],
    [dialR * 0.40, -dialR * 0.54, -0.8],
  ];
  for (const [sx, sy, sa] of screwPts) {
    drawBluedScrew(ctx, sx, sy, Math.max(2.6, dialR * 0.017), sa, lightAngle);
  }

  // Tier 3D: Radial Sunburst-Brushed Obsidian Outer Chapter Ring (0.74R .. 1.00R)
  const chapterInnerR = dialR * 0.735;
  const chapterPath = new Path2D();
  chapterPath.arc(0, 0, dialR * 1.01, 0, TAU);
  chapterPath.closePath();
  const chapterHole = new Path2D();
  chapterHole.arc(0, 0, chapterInnerR, 0, TAU);
  chapterHole.closePath();
  chapterPath.addPath(chapterHole);

  // Drop shadow from chapter ring overhang onto skeleton movement below!
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.lineWidth = dialR * 0.035;
  ctx.beginPath();
  ctx.arc(2, 4, chapterInnerR, 0, TAU);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.clip(chapterPath, 'evenodd');
  ctx.drawImage(tex.brushedObsidian, -dialR, -dialR, dialR * 2, dialR * 2);
  ctx.restore();

  // 45-degree 18k Rose-Gold inner chapter ring chamfer
  ctx.strokeStyle = createMetallicConicGradient(ctx, 0, 0, lightAngle, 'roseGold');
  ctx.lineWidth = Math.max(1.6, dialR * 0.0085);
  ctx.beginPath();
  ctx.arc(0, 0, chapterInnerR, 0, TAU);
  ctx.stroke();

  // Sloped outer rehaut ring & precision 1/5-second minute track
  const trackOuterR = dialR * 0.965;
  const trackInnerR = dialR * 0.915;
  ctx.strokeStyle = 'rgba(212, 155, 106, 0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, trackOuterR, 0, TAU);
  ctx.stroke();

  for (let t = 0; t < 240; t++) {
    const a = (t * TAU) / 240 - Math.PI / 2;
    const isHour = t % 20 === 0;
    const isSec = t % 4 === 0;
    const r0 = isHour ? dialR * 0.90 : isSec ? trackInnerR : dialR * 0.935;
    ctx.strokeStyle = isHour
      ? '#F2C9A0'
      : isSec
      ? 'rgba(243, 236, 225, 0.72)'
      : 'rgba(243, 236, 225, 0.28)';
    ctx.lineWidth = isHour ? Math.max(1.4, dialR * 0.006) : isSec ? 1.0 : 0.6;
    ctx.beginPath();
    ctx.moveTo(r0 * Math.cos(a), r0 * Math.sin(a));
    ctx.lineTo(trackOuterR * Math.cos(a), trackOuterR * Math.sin(a));
    ctx.stroke();
  }

  // Subtle 5-minute tachymeter/minute numerals along outer rehaut
  ctx.fillStyle = 'rgba(243, 236, 225, 0.65)';
  ctx.font = `500 ${Math.max(7, dialR * 0.025).toFixed(1)}px "Montserrat", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let m = 0; m < 12; m++) {
    if (m === 6) continue;
    const num = m === 0 ? '60' : String(m * 5).padStart(2, '0');
    const a = (m * TAU) / 12 - Math.PI / 2;
    const nr = dialR * 0.982;
    // Only draw if dialR large enough to read crisply
    if (dialR >= 180) {
      ctx.save();
      ctx.translate(nr * Math.cos(a), nr * Math.sin(a));
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(num, 0, 0);
      ctx.restore();
    }
  }

  // SWISS MADE flanking 6:00
  if (dialR >= 160) {
    ctx.fillStyle = 'rgba(212, 155, 106, 0.78)';
    ctx.font = `500 ${Math.max(7, dialR * 0.022).toFixed(1)}px "Montserrat", sans-serif`;
    for (const [label, degOff] of [
      ['SWISS', 103],
      ['MADE', 77],
    ]) {
      const a = (degOff * Math.PI) / 180;
      const sr = dialR * 0.875;
      ctx.save();
      ctx.translate(sr * Math.cos(a), sr * Math.sin(a));
      ctx.rotate(a - Math.PI / 2);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }

  // Tier 3E: 6:00 Live Flying Tourbillon Sub-Aperture (centered at (0, +0.43 * dialR))!
  drawFlyingTourbillon(
    ctx,
    0,
    dialR * 0.425,
    dialR * 0.305,
    globalT,
    lightAngle
  );

  // Tier 3F: 12:00 Applied Vaucher Noir Crest & Plaque
  drawTwelveOClockCrest(ctx, dialR, lightAngle);

  // Tier 3G: Applied Diamond-Cut 18k Rose-Gold Baton Hour Indices (Double at 12, Single 1..5 & 7..11)
  const idxInner = dialR * 0.755;
  const idxOuter = dialR * 0.888;
  const idxHalfW = Math.max(2.6, dialR * 0.017);

  for (let h = 0; h < 12; h++) {
    if (h === 6) continue; // 6:00 opened cleanly for Flying Tourbillon aperture!
    const a = (h * TAU) / 12 - Math.PI / 2;

    let flash = 0;
    if (indexFlashAngle !== null) {
      const diff = Math.atan2(Math.sin(a - indexFlashAngle), Math.cos(a - indexFlashAngle));
      flash = Math.exp(-8.5 * diff * diff);
    }

    if (h === 0) {
      // Signature Geneva Double Baton at 12:00
      const sep = 0.028;
      drawAppliedBatonIndex(ctx, a - sep, idxInner + dialR * 0.02, idxOuter, idxHalfW * 0.88, lightAngle, flash);
      drawAppliedBatonIndex(ctx, a + sep, idxInner + dialR * 0.02, idxOuter, idxHalfW * 0.88, lightAngle, flash);
    } else {
      drawAppliedBatonIndex(ctx, a, idxInner, idxOuter, idxHalfW, lightAngle, flash);
    }
  }

  // Tier 3H: Open-V 10:10 Split-Facet 18k Rose-Gold Dauphine Hands + Central Sweep Seconds
  drawDauphineHand(
    ctx,
    state.hourHandAngle,
    dialR * 0.56,
    dialR * 0.13,
    Math.max(5.5, dialR * 0.036)
  );
  drawDauphineHand(
    ctx,
    state.minHandAngle,
    dialR * 0.82,
    dialR * 0.16,
    Math.max(4.4, dialR * 0.028)
  );

  const secAng =
    chronoOverrideLocalT !== null ? getChronoAngle(chronoOverrideLocalT) : state.secHandAngle;
  drawSecondsTrotteuse(ctx, secAng, dialR * 0.88, dialR * 0.24);

  // Polished 18k Rose-Gold & Rhodium Central Hand Cannon Pinion Cap
  const capR = Math.max(4.5, dialR * 0.034);
  ctx.fillStyle = createMetallicConicGradient(ctx, 0, 0, lightAngle, 'roseGold');
  ctx.beginPath();
  ctx.arc(0, 0, capR, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#FFF2E0';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  ctx.fillStyle = '#DCE6F2';
  ctx.beginPath();
  ctx.arc(-capR * 0.22, -capR * 0.22, capR * 0.28, 0, TAU);
  ctx.fill();

  // =========================================================================
  // 4. DOMED ANTI-REFLECTIVE SAPPHIRE CRYSTAL CURVATURE & CAUSTIC SWEEP
  // =========================================================================
  // Subtle blue-ice anti-reflective sapphire meniscus rim reflection (#DCE6F2)
  const meniscus = ctx.createRadialGradient(
    -dialR * 0.18,
    -dialR * 0.22,
    dialR * 0.55,
    0,
    0,
    dialR
  );
  meniscus.addColorStop(0.0, 'rgba(220, 230, 242, 0.0)');
  meniscus.addColorStop(0.78, 'rgba(220, 230, 242, 0.015)');
  meniscus.addColorStop(0.94, 'rgba(185, 212, 242, 0.075)');
  meniscus.addColorStop(1.0, 'rgba(220, 230, 242, 0.14)');
  ctx.fillStyle = meniscus;
  ctx.fillRect(-dialR, -dialR, dialR * 2, dialR * 2);

  // Ambient studio softbox curved sheen on upper-left sapphire dome
  ctx.save();
  ctx.rotate(-0.58);
  const softSheenPos = sapphireSweepPos !== null ? sapphireSweepPos * dialR * 1.45 : -dialR * 0.36;
  const sheenAlpha = sapphireSweepPos !== null ? 0.25 : 0.115;
  const sg = ctx.createLinearGradient(softSheenPos - dialR * 0.38, 0, softSheenPos + dialR * 0.38, 0);
  sg.addColorStop(0.0, 'rgba(220, 230, 242, 0.0)');
  sg.addColorStop(0.36, `rgba(205, 224, 246, ${(sheenAlpha * 0.58).toFixed(3)})`);
  sg.addColorStop(0.50, `rgba(238, 246, 255, ${sheenAlpha.toFixed(3)})`);
  sg.addColorStop(0.58, `rgba(242, 201, 160, ${(sheenAlpha * 0.32).toFixed(3)})`);
  sg.addColorStop(1.0, 'rgba(220, 230, 242, 0.0)');
  ctx.fillStyle = sg;
  ctx.fillRect(-dialR * 1.4, -dialR * 1.4, dialR * 2.8, dialR * 2.8);

  // Delicate curved sapphire crystal dome specular crescent along upper-left rim
  ctx.strokeStyle = 'rgba(220, 230, 242, 0.22)';
  ctx.lineWidth = Math.max(1.4, dialR * 0.008);
  ctx.beginPath();
  ctx.arc(0, 0, dialR * 0.988, -Math.PI * 0.42, Math.PI * 0.36);
  ctx.stroke();

  // Secondary razor-thin anti-reflective caustic edge during active sapphire sweep (S10)
  if (sapphireSweepPos !== null) {
    const razorX = softSheenPos + dialR * 0.19;
    const rg = ctx.createLinearGradient(razorX - dialR * 0.05, 0, razorX + dialR * 0.05, 0);
    rg.addColorStop(0.0, 'rgba(220, 230, 242, 0)');
    rg.addColorStop(0.5, 'rgba(240, 248, 255, 0.32)');
    rg.addColorStop(1.0, 'rgba(220, 230, 242, 0)');
    ctx.fillStyle = rg;
    ctx.fillRect(-dialR * 1.4, -dialR * 1.4, dialR * 2.8, dialR * 2.8);
  }
  ctx.restore();

  ctx.restore(); // End dial clip
  ctx.restore(); // End full watch transform
}
