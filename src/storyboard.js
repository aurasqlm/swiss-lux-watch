/**
 * src/storyboard.js
 * Canonical 21-shot storyboard (S01..S21) across 6 x 10.0s chunks (1,800 frames @ 30fps = 60.000s exact).
 * Enforces single-owner frame dispatch, non-overlapping DIP_TO_BLACK, and strictly disjoint MASKED_WIPE.
 */

export const FPS = 30;
export const TOTAL_FRAMES = 1800;
export const TOTAL_DURATION = 60.0;

export const PALETTE = Object.freeze({
  VOID_OBSIDIAN: '#060608',
  BRUSHED_CARBON: '#15161A',
  ROSE_GOLD_MID: '#D49B6A',
  ROSE_GOLD_SPEC: '#F2C9A0',
  ROSE_GOLD_SHADOW: '#7A4E2D',
  SAPPHIRE_GLARE: '#DCE6F2',
  RUBY_JEWEL: '#9E1B32',
  WARM_IVORY: '#F3ECE1',
  BLUED_STEEL_DARK: '#1B3B6F',
  BLUED_STEEL_SPEC: '#4A89DC',
});

export const STORYBOARD = Object.freeze([
  // CHUNK 1 (00:00 - 00:10 | Frames 0..299 | 3 shots)
  {
    id: 'S01_BEZEL_GLINT',
    chunk: 1,
    startFrame: 0,
    endFrame: 89,
    fadeInFrames: 18,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S01 — Razor Rose-Gold Bezel Glint',
  },
  {
    id: 'S02_RUBY_BALANCE_4HZ',
    chunk: 1,
    startFrame: 90,
    endFrame: 209,
    fadeInFrames: 0,
    fadeOutFrames: 8, // Dips to 100% #060608 over f=202..209
    wipeIn: false,
    label: 'S02 — 4 Hz Ruby Balance & Breguet Overcoil',
  },
  {
    id: 'S03_TITLE_312_COMP',
    chunk: 1,
    startFrame: 210,
    endFrame: 299,
    fadeInFrames: 8, // Emerges from 100% #060608 at f=210 (mid 50% at f=213)
    fadeOutFrames: 6, // Clean dip at chunk end f=294..299
    wipeIn: false,
    label: 'S03 — Title: 312 COMPONENTS.',
  },

  // CHUNK 2 (00:10 - 00:20 | Frames 300..599 | 4 shots)
  {
    id: 'S04_INVOLUTE_TRAIN',
    chunk: 2,
    startFrame: 300,
    endFrame: 379,
    fadeInFrames: 6,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S04 — Architectural Meshing Involute Gear Train',
  },
  {
    id: 'S05_PALLET_FORK_LOCK',
    chunk: 2,
    startFrame: 380,
    endFrame: 454,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S05 — Swiss Lever Pallet Fork & 20T Escape Wheel',
  },
  {
    id: 'S06_COTES_DE_GENEVE',
    chunk: 2,
    startFrame: 455,
    endFrame: 529,
    fadeInFrames: 0,
    fadeOutFrames: 7, // Dips to #060608 over f=523..529
    wipeIn: true, // Disjoint 12f wipe centered at f=455 (f=450..460, exact 50% at f=455)
    label: 'S06 — Côtes de Genève Skeleton Bridge Sweep',
  },
  {
    id: 'S07_TITLE_ZERO_TOL',
    chunk: 2,
    startFrame: 530,
    endFrame: 599,
    fadeInFrames: 7, // Emerges from #060608 at f=530..536
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S07 — Title: ZERO TOLERANCE.',
  },

  // CHUNK 3 (00:20 - 00:30 | Frames 600..899 | 4 shots)
  {
    id: 'S08_TOURBILLON_CAGE',
    chunk: 3,
    startFrame: 600,
    endFrame: 689,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S08 — Macro 18k Rose-Gold Flying Tourbillon',
  },
  {
    id: 'S09_BLUED_SCREWS',
    chunk: 3,
    startFrame: 690,
    endFrame: 764,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S09 — Heat-Blued Micro-Screws & Timing Weights',
  },
  {
    id: 'S10_SAPPHIRE_SWEEP',
    chunk: 3,
    startFrame: 765,
    endFrame: 839,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    wipeIn: true, // Disjoint 12f wipe centered at f=765 (f=760..770, exact 50% at f=765)
    label: 'S10 — Diagonal Sapphire Crystal Glare Sweep',
  },
  {
    id: 'S11_CROWN_AND_LUGS',
    chunk: 3,
    startFrame: 840,
    endFrame: 899,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S11 — Engraved Rose-Gold Crown & Beveled Lugs',
  },

  // CHUNK 4 (00:30 - 00:40 | Frames 900..1199 | 5 rapid shots)
  {
    id: 'S12_CHRONO_SNAP',
    chunk: 4,
    startFrame: 900,
    endFrame: 959,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S12 — Mechanical Chronograph Trotteuse Launch',
  },
  {
    id: 'S13_INDICES_RIM_FLASH',
    chunk: 4,
    startFrame: 960,
    endFrame: 1013,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S13 — Diamond-Cut Rose-Gold Indices Rim-Flash',
  },
  {
    id: 'S14_SLAM_18K_GOLD',
    chunk: 4,
    startFrame: 1014,
    endFrame: 1067,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S14 — Stark Luxury Slam: 18K ROSE GOLD.',
  },
  {
    id: 'S15_SLAM_28800_GENEVA',
    chunk: 4,
    startFrame: 1068,
    endFrame: 1124,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S15 — Dual Beat Slam: 28,800 VPH. / GENEVA.',
  },
  {
    id: 'S16_MACRO_TRAIN_BLUR',
    chunk: 4,
    startFrame: 1125,
    endFrame: 1199,
    fadeInFrames: 0,
    fadeOutFrames: 8, // Dips to #060608 over f=1192..1199
    wipeIn: false,
    label: 'S16 — Kinetic Rotational Gear-Train Rush',
  },

  // CHUNK 5 (00:40 - 00:50 | Frames 1200..1499 | 3 shots)
  {
    id: 'S17_MONOLITH_PULLBACK',
    chunk: 5,
    startFrame: 1200,
    endFrame: 1304,
    fadeInFrames: 10,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S17 — Full Monolith Axial Pullback',
  },
  {
    id: 'S18_CASE_BEZEL_SWEEP',
    chunk: 5,
    startFrame: 1305,
    endFrame: 1409,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S18 — Sculptural Case & Rose-Gold Bezel Sweep',
  },
  {
    id: 'S19_DIAL_ALIVE_HERO',
    chunk: 5,
    startFrame: 1410,
    endFrame: 1499,
    fadeInFrames: 0,
    fadeOutFrames: 12, // Dips cleanly to #060608 over f=1488..1499
    wipeIn: true, // Disjoint 12f wipe centered at f=1410 (f=1405..1415, exact 50% at f=1410)
    label: 'S19 — Brushed Obsidian Skeleton Dial Hero (10:10)',
  },

  // CHUNK 6 (00:50 - 01:00 | Frames 1500..1799 | 2 shots)
  {
    id: 'S20_HERO_STILLNESS',
    chunk: 6,
    startFrame: 1500,
    endFrame: 1649,
    fadeInFrames: 14, // Emerges from #060608 over f=1500..1513 (mid ~50% at f=1506)
    fadeOutFrames: 8, // Dips to #060608 over f=1642..1649
    wipeIn: false,
    label: 'S20 — Timeless Stillness Monolith Portrait',
  },
  {
    id: 'S21_LEGACY_LOCKUP',
    chunk: 6,
    startFrame: 1650,
    endFrame: 1799,
    fadeInFrames: 10, // Emerges cleanly f=1650..1659, holds through f=1799 (60.00s)
    fadeOutFrames: 0,
    wipeIn: false,
    label: 'S21 — Final Hero Watch & Legacy Lockup',
  },
]);

/**
 * Validates at import time that STORYBOARD covers 0..1799 with zero gaps, zero overlaps,
 * and exact 300-frame chunk boundaries.
 */
(function validateStoryboard() {
  let expectedStart = 0;
  const chunkTotals = [0, 0, 0, 0, 0, 0];
  for (const shot of STORYBOARD) {
    if (shot.startFrame !== expectedStart) {
      throw new Error(`Storyboard gap/overlap at ${shot.id}: expected ${expectedStart}, got ${shot.startFrame}`);
    }
    const dur = shot.endFrame - shot.startFrame + 1;
    if (dur < 45 || dur > 150) {
      throw new Error(`Shot ${shot.id} duration ${dur}f outside [1.5s, 5.0s]`);
    }
    chunkTotals[shot.chunk - 1] += dur;
    expectedStart = shot.endFrame + 1;
  }
  if (expectedStart !== TOTAL_FRAMES) {
    throw new Error(`Storyboard ends at ${expectedStart}, expected ${TOTAL_FRAMES}`);
  }
  for (let c = 0; c < 6; c++) {
    if (chunkTotals[c] !== 300) {
      throw new Error(`Chunk ${c + 1} has ${chunkTotals[c]} frames, expected 300`);
    }
  }
})();

function smooth01(x) {
  const u = Math.max(0, Math.min(1, x));
  return u * u * (3 - 2 * u);
}

/**
 * Resolves exact frame ownership, dip-to-black curtain alpha, or disjoint masked-wipe parameters.
 */
export function resolveFrameDispatch(rawFrame) {
  const f = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(rawFrame)));
  const globalT = f / FPS;

  let shotIdx = 0;
  for (let i = 0; i < STORYBOARD.length; i++) {
    if (f >= STORYBOARD[i].startFrame && f <= STORYBOARD[i].endFrame) {
      shotIdx = i;
      break;
    }
  }

  // Check if frame falls inside an intra-chunk 12-frame disjoint MASKED_WIPE window
  // Window spans [S_in.startFrame - 5 .. S_in.startFrame + 5] with p = (f - (S_in.startFrame - 6)) / 12
  // At f = S_in.startFrame (455, 765, 1410), p = 6 / 12 = 0.500000 exact!
  for (let i = 1; i < STORYBOARD.length; i++) {
    const inShot = STORYBOARD[i];
    if (!inShot.wipeIn) continue;
    const wStart = inShot.startFrame - 5;
    const wEnd = inShot.startFrame + 5;
    if (f >= wStart && f <= wEnd) {
      const outShot = STORYBOARD[i - 1];
      const wipeProgress = (f - (inShot.startFrame - 6)) / 12.0;
      const outDur = outShot.endFrame - outShot.startFrame + 1;
      const inDur = inShot.endFrame - inShot.startFrame + 1;
      return {
        mode: 'MASKED_WIPE',
        globalFrame: f,
        globalT,
        wipeProgress,
        outShot,
        outLocalT: (f - outShot.startFrame) / FPS,
        outProgress: Math.max(0, Math.min(1, (f - outShot.startFrame) / outDur)),
        inShot,
        inLocalT: (f - inShot.startFrame) / FPS,
        inProgress: Math.max(0, Math.min(1, (f - inShot.startFrame) / inDur)),
        blackCurtainAlpha: 0,
      };
    }
  }

  const shot = STORYBOARD[shotIdx];
  const dur = shot.endFrame - shot.startFrame + 1;
  const localFrame = f - shot.startFrame;
  const localT = localFrame / FPS;
  const shotProgress = localFrame / dur;

  let blackCurtainAlpha = 0;
  if (shot.fadeInFrames > 0 && localFrame < shot.fadeInFrames) {
    // At localFrame === 0 (e.g. f=210, 530, 1200, 1500, 1650), alpha === 1.00 (pure #060608 boundary)
    // For S03 (fadeInFrames=8), at f=213 (localFrame=3), u = 3 / 6 = 0.50 -> 50% emergence!
    const denom = Math.max(1, shot.fadeInFrames - 2);
    blackCurtainAlpha = 1.0 - smooth01(localFrame / denom);
  }
  const framesFromEnd = shot.endFrame - f;
  if (shot.fadeOutFrames > 0 && framesFromEnd < shot.fadeOutFrames) {
    // At f === shot.endFrame (framesFromEnd === 0), alpha === 1.00 (pure #060608)
    const denom = Math.max(1, shot.fadeOutFrames - 1);
    const outAlpha = 1.0 - smooth01(framesFromEnd / denom);
    blackCurtainAlpha = Math.max(blackCurtainAlpha, outAlpha);
  }

  return {
    mode: 'SINGLE_SHOT',
    globalFrame: f,
    globalT,
    shot,
    localFrame,
    localT,
    shotProgress,
    blackCurtainAlpha,
  };
}
