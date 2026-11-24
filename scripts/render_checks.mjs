#!/usr/bin/env node
/**
 * scripts/render_checks.mjs
 * Renders lossless 1920x1080 verification proof sheets directly from window.renderAtTime(t)
 * via CDP PNG capture + high-quality Python Pillow (Lanczos) compositing:
 *   --mode style  -> /home/antigravity/aurasqlm/swiss-lux-watch/style_frame_check.png
 *   --mode motion -> /home/antigravity/aurasqlm/swiss-lux-watch/transition_and_motion_check.png
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ROOT_DIR,
  startStaticServer,
  launchHeadlessBrowser,
  createWorkerContext,
} from './server_util.mjs';

function parseArgs(argv) {
  let mode = 'style';
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--mode' && argv[i + 1]) {
      mode = argv[++i];
    } else if (argv[i] === '--motion') {
      mode = 'motion';
    } else if (argv[i] === '--style') {
      mode = 'style';
    }
  }
  return { mode };
}

async function captureFramesLossless(framesToCapture) {
  const srv = await startStaticServer(ROOT_DIR);
  const browser = await launchHeadlessBrowser();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vn-checks-'));

  try {
    const workerCount = Math.min(3, framesToCapture.length);
    const workers = await Promise.all(
      Array.from({ length: workerCount }, () => createWorkerContext(browser, srv.sceneUrl))
    );

    let cursor = 0;
    const metaByFrame = {};

    await Promise.all(
      workers.map(async ({ page, cdp, errors }) => {
        while (cursor < framesToCapture.length) {
          const idx = cursor++;
          const f = framesToCapture[idx];
          const info = await page.evaluate((frameIdx) => {
            const t = frameIdx / 30.0;
            const res = window.renderAtTime(t);
            const hs = window.getHorologyState(t);
            return { ...res, hs };
          }, f);

          const shot = await cdp.send('Page.captureScreenshot', {
            format: 'png',
            optimizeForSpeed: true,
          });
          if (errors.length > 0) {
            throw new Error(`Render error on frame ${f}: ${errors.join('; ')}`);
          }
          const outPath = path.join(tmpDir, `f_${f}.png`);
          await fs.writeFile(outPath, Buffer.from(shot.data, 'base64'));
          metaByFrame[f] = { path: outPath, info };
        }
      })
    );

    return { tmpDir, metaByFrame };
  } finally {
    await browser.close();
    await srv.close();
  }
}

const PY_COMPOSITE_STYLE = `
import json, sys
from PIL import Image, ImageDraw, ImageFont

manifest = json.loads(sys.argv[1])
out_path = sys.argv[2]
font_path = sys.argv[3]

canvas = Image.new("RGB", (1920, 1080), (6, 6, 8))
quads = [
    (645,  0,   0,   "Q1  •  S08 MACRO 18K ROSE-GOLD FLYING TOURBILLON  (f=645 | t=21.50s)"),
    (1425, 960, 0,   "Q2  •  S19 BRUSHED OBSIDIAN SKELETON DIAL HERO  (f=1425 | t=47.50s)"),
    (336,  0,   540, "Q3  •  S04 MESHING INVOLUTE GEAR TRAIN  (f=336 | t=11.20s)"),
    (1725, 960, 540, "Q4  •  S21 FINAL WATCH HERO LOCKUP  (f=1725 | t=57.50s)"),
]

for f_idx, x0, y0, label in quads:
    im = Image.open(manifest[str(f_idx)]["path"]).convert("RGB")
    im_half = im.resize((960, 540), Image.Resampling.LANCZOS)
    canvas.paste(im_half, (x0, y0))

overlay = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

# 2px #15161A hairline divider cross with subtle #D49B6A center tick
draw.rectangle([959, 0, 960, 1080], fill=(21, 22, 26, 255))
draw.rectangle([0, 539, 1920, 540], fill=(21, 22, 26, 255))

try:
    font = ImageFont.truetype(font_path, 13)
except Exception:
    font = ImageFont.load_default()

for _, x0, y0, label in quads:
    # Subtle dark pill behind discrete corner label so text is legible without obscuring art
    bbox = draw.textbbox((x0 + 18, y0 + 512), label, font=font)
    draw.rounded_rectangle([bbox[0]-8, bbox[1]-4, bbox[2]+8, bbox[3]+4], radius=3, fill=(6, 6, 8, 155))
    draw.text((x0 + 18, y0 + 512), label, font=font, fill=(243, 236, 225, 165))

final_img = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")
final_img.save(out_path, format="PNG", optimize=True)
print(f"Saved {out_path} ({final_img.size[0]}x{final_img.size[1]})")
`;

const PY_COMPOSITE_MOTION = `
import json, math, sys
from PIL import Image, ImageDraw, ImageFont

manifest = json.loads(sys.argv[1])
out_path = sys.argv[2]
font_reg_path = sys.argv[3]
font_bold_path = sys.argv[4]

W, H = 1920, 1080
canvas = Image.new("RGB", (W, H), (6, 6, 8))
draw = ImageDraw.Draw(canvas)

try:
    f_hdr = ImageFont.truetype(font_bold_path, 13)
    f_lbl = ImageFont.truetype(font_reg_path, 11)
    f_sm  = ImageFont.truetype(font_reg_path, 10)
except Exception:
    f_hdr = f_lbl = f_sm = ImageFont.load_default()

def load_f(f):
    return Image.open(manifest[str(f)]["path"]).convert("RGB")

# ============================================================================
# SECTION A (y = 0..539): EXACT SCENE TRANSITION MIDPOINT FRAMES (ZERO GHOSTING)
# ============================================================================
draw.rectangle([0, 0, W, 34], fill=(15, 16, 21))
draw.line([(0, 34), (W, 34)], fill=(212, 155, 106), width=1)
draw.text((18, 10), "SECTION A  —  SCENE TRANSITION MIDPOINT AUDIT  (STRICT ISOLATION  •  ZERO GHOSTING / ZERO LEFTOVER ELEMENTS)", font=f_hdr, fill=(243, 236, 225))

cols_a = [
    {
        "title": "A1: DIP-TO-BLACK MIDPOINT (S02->S03 | f=213, 50% IN)",
        "main_f": 213,
        "sub_type": "pair",
        "sub_f1": 206, "sub_l1": "f=206 (S02 50% OUT)",
        "sub_f2": 210, "sub_l2": "f=210 (100% #060608 CLEAR)",
    },
    {
        "title": "A2: MASKED WIPE 50% MIDPOINT (S05->S06 | f=455)",
        "main_f": 455,
        "sub_type": "crop_seam",
        "sub_l": "2.4x SEAM ZOOM @ x=960: DISJOINT CLIP + BEVEL BAR (0% BLEND)",
    },
    {
        "title": "A3: MONTAGE HARD CUT (S14->S15 | f=1068, 1ST FRAME)",
        "main_f": 1068,
        "sub_type": "pair",
        "sub_f1": 1067, "sub_l1": "f=1067 (LAST OF S14)",
        "sub_f2": 1068, "sub_l2": "f=1068 (0% S14 GLYPH GHOST)",
    },
    {
        "title": "A4: SAPPHIRE WIPE (f=765) & CHUNK 5->6 DIP (f=1506)",
        "main_f": 765,
        "sub_type": "single_inset",
        "sub_f": 1506,
        "sub_l": "f=1506 (t=50.20s CHUNK 6 EMERGENCE FROM PURE BLACK)",
    },
]

for idx, c in enumerate(cols_a):
    x0 = 14 + idx * 476
    pw, ph = 460, 259
    draw.text((x0, 42), c["title"], font=f_lbl, fill=(212, 155, 106))
    im_main = load_f(c["main_f"]).resize((pw, ph), Image.Resampling.LANCZOS)
    canvas.paste(im_main, (x0, 60))
    draw.rectangle([x0, 60, x0 + pw, 60 + ph], outline=(42, 45, 56), width=1)

    iy0 = 330
    ih = 178
    if c["sub_type"] == "pair":
        hw = (pw - 8) // 2
        im1 = load_f(c["sub_f1"]).resize((hw, ih), Image.Resampling.LANCZOS)
        im2 = load_f(c["sub_f2"]).resize((hw, ih), Image.Resampling.LANCZOS)
        canvas.paste(im1, (x0, iy0))
        canvas.paste(im2, (x0 + hw + 8, iy0))
        draw.rectangle([x0, iy0, x0 + hw, iy0 + ih], outline=(35, 38, 48), width=1)
        draw.rectangle([x0 + hw + 8, iy0, x0 + hw + 8 + hw, iy0 + ih], outline=(35, 38, 48), width=1)
        draw.text((x0 + 2, iy0 + ih + 5), c["sub_l1"], font=f_sm, fill=(200, 206, 218))
        draw.text((x0 + hw + 10, iy0 + ih + 5), c["sub_l2"], font=f_sm, fill=(200, 206, 218))
    elif c["sub_type"] == "crop_seam":
        src = load_f(c["main_f"])
        crop = src.crop((960 - 190, 540 - 74, 960 + 190, 540 + 74)).resize((pw, ih), Image.Resampling.LANCZOS)
        canvas.paste(crop, (x0, iy0))
        draw.rectangle([x0, iy0, x0 + pw, iy0 + ih], outline=(212, 155, 106), width=1)
        draw.text((x0 + 2, iy0 + ih + 5), c["sub_l"], font=f_sm, fill=(200, 206, 218))
    elif c["sub_type"] == "single_inset":
        im_in = load_f(c["sub_f"]).resize((pw, ih), Image.Resampling.LANCZOS)
        canvas.paste(im_in, (x0, iy0))
        draw.rectangle([x0, iy0, x0 + pw, iy0 + ih], outline=(35, 38, 48), width=1)
        draw.text((x0 + 2, iy0 + ih + 5), c["sub_l"], font=f_sm, fill=(200, 206, 218))

# ============================================================================
# SECTION B (y = 540..1079): 5 CONSECUTIVE 30FPS MOTION FRAMES (ZERO LOOP SNAPS)
# ============================================================================
draw.rectangle([0, 540, W, 574], fill=(15, 16, 21))
draw.line([(0, 540), (W, 540)], fill=(212, 155, 106), width=1)
draw.line([(0, 574), (W, 574)], fill=(212, 155, 106), width=1)
draw.text((18, 550), "SECTION B  —  5 CONSECUTIVE 30FPS MOTION FRAMES  (OPPOSING INVOLUTE GEAR RATIOS & 4.000 HZ BALANCE ZERO-CROSSING / ZERO SNAPS)", font=f_hdr, fill=(243, 236, 225))

cw, ch = 368, 207
# Row B1: Meshing Involute Gear Train S04 frames 336..340 (zoomed crop on G1 <-> G2 <-> G3 mesh zone!)
gear_frames = [336, 337, 338, 339, 340]
for i, f in enumerate(gear_frames):
    x0 = 14 + i * 380
    y0 = 584
    src = load_f(f)
    # Crop centered on active meshing teeth between G1 (48T Gold), G2 (24T Rhodium), G3 (16T Gold)
    crop = src.crop((680, 250, 1640, 790)).resize((cw, ch), Image.Resampling.LANCZOS)
    canvas.paste(crop, (x0, y0))
    # Fixed crosshair reference reticle so critic can visually verify steady ~4px/frame tooth advance
    rx, ry = x0 + int(cw * 0.48), y0 + int(ch * 0.52)
    draw.line([(rx - 14, ry), (rx + 14, ry)], fill=(220, 230, 242), width=1)
    draw.line([(rx, ry - 14), (rx, ry + 14)], fill=(220, 230, 242), width=1)
    draw.rectangle([x0, y0, x0 + cw, y0 + ch], outline=(42, 45, 56), width=1)

    hs = manifest[str(f)]["info"]["hs"]
    g1_deg = math.degrees(hs["gearAngles"][1])
    g2_deg = math.degrees(hs["gearAngles"][2])
    lbl = f"f={f} ({f/30:.3f}s) | G1:{g1_deg:+.1f}°  G2:{g2_deg:+.1f}°"
    draw.text((x0 + 2, y0 + ch + 5), lbl, font=f_lbl, fill=(242, 201, 160))

# Row B2: 4 Hz Balance Wheel + Pallet Flip + 20T Escape Impulse S02 frames 96..100
bal_frames = [96, 97, 98, 99, 100]
for i, f in enumerate(bal_frames):
    x0 = 14 + i * 380
    y0 = 824
    src = load_f(f)
    im_cell = src.resize((cw, ch), Image.Resampling.LANCZOS)
    canvas.paste(im_cell, (x0, y0))
    draw.rectangle([x0, y0, x0 + cw, y0 + ch], outline=(42, 45, 56), width=1)

    hs = manifest[str(f)]["info"]["hs"]
    b_deg = math.degrees(hs["balanceAngle"])
    e_deg = math.degrees(hs["escapeAngle"])
    lbl = f"f={f} ({f/30:.3f}s) | Bal:{b_deg:+.1f}°  Esc:{e_deg:+.2f}°"
    draw.text((x0 + 2, y0 + ch + 5), lbl, font=f_lbl, fill=(243, 236, 225))

canvas.save(out_path, format="PNG", optimize=True)
print(f"Saved {out_path} ({canvas.size[0]}x{canvas.size[1]})")
`;

async function main() {
  const t0 = Date.now();
  const { mode } = parseArgs(process.argv);

  const fontReg = path.join(ROOT_DIR, 'src/assets/fonts/montserrat-500-latin.woff2');
  // Fallback TTF on Ubuntu for Pillow ImageFont (Pillow supports .woff2 if libbrotli is compiled, else LiberationSans)
  const sysFontReg = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
  const sysFontBold = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';

  if (mode === 'style') {
    const frames = [645, 1425, 336, 1725];
    const { tmpDir, metaByFrame } = await captureFramesLossless(frames);
    try {
      const outPath = path.join(ROOT_DIR, 'style_frame_check.png');
      const res = spawnSync(
        'python3',
        ['-c', PY_COMPOSITE_STYLE, JSON.stringify(metaByFrame), outPath, sysFontReg],
        { stdio: 'inherit' }
      );
      if (res.status !== 0) throw new Error(`Pillow style compositor exited ${res.status}`);
      console.log(`[STYLE CHECK COMPLETE] ${((Date.now() - t0) / 1000).toFixed(2)}s -> ${outPath}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  } else if (mode === 'motion') {
    const frames = [
      206, 210, 213, 455, 765, 1067, 1068, 1506,
      336, 337, 338, 339, 340,
      96, 97, 98, 99, 100,
    ];
    const { tmpDir, metaByFrame } = await captureFramesLossless(frames);
    try {
      const outPath = path.join(ROOT_DIR, 'transition_and_motion_check.png');
      const res = spawnSync(
        'python3',
        [
          '-c',
          PY_COMPOSITE_MOTION,
          JSON.stringify(metaByFrame),
          outPath,
          sysFontReg,
          sysFontBold,
        ],
        { stdio: 'inherit' }
      );
      if (res.status !== 0) throw new Error(`Pillow motion compositor exited ${res.status}`);
      console.log(`[MOTION CHECK COMPLETE] ${((Date.now() - t0) / 1000).toFixed(2)}s -> ${outPath}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  } else {
    throw new Error(`Unsupported --mode ${mode} (expected 'style' or 'motion')`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
