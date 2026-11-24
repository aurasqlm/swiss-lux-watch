#!/usr/bin/env node
/**
 * scripts/render_chunks.mjs
 * High-throughput persistent multi-context CDP -> FFmpeg stdin video renderer:
 * - ZERO intermediate PNGs written to disk
 * - 1 persistent chrome-headless-shell + 3 persistent CDP contexts + ordered ring-buffer
 * - Modes:
 *   1. `node scripts/render_chunks.mjs --preview-12fps`
 *      Renders `preview_12fps.mp4` (720 frames @ 12fps = 60.0s, muxing soundtrack_60s.wav if present).
 *   2. `node scripts/render_chunks.mjs [--chunk 1..6] [--force] [--preset fast|veryfast]`
 *      Renders 6 resumable 10.0s chunks (`chunks/chunk_01.mp4 .. chunks/chunk_06.mp4`, 300 frames each @ 30fps)
 *      with identical H.264 High Profile VBV-capped parameters (`-crf 18 -maxrate 3600k -bufsize 7200k`),
 *      skipping any existing chunk that already passes ffprobe unless `--force` is passed.
 */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import {
  ROOT_DIR,
  startStaticServer,
  launchHeadlessBrowser,
  createWorkerContext,
} from './server_util.mjs';

function parseArgs(argv) {
  const opts = {
    preview12fps: false,
    onlyChunk: null,
    force: false,
    preset: 'fast',
    workers: 3,
    jpegQuality: 96,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--preview-12fps') opts.preview12fps = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--chunk' && argv[i + 1]) opts.onlyChunk = Number(argv[++i]);
    else if (a === '--preset' && argv[i + 1]) opts.preset = argv[++i];
    else if (a === '--workers' && argv[i + 1]) opts.workers = Math.max(1, Number(argv[++i]));
  }
  return opts;
}

function isValidChunk(chunkPath, expectedFrames = 300) {
  if (!fsSync.existsSync(chunkPath)) return false;
  const res = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name,width,height,nb_frames',
      '-of',
      'json',
      chunkPath,
    ],
    { encoding: 'utf8' }
  );
  if (res.status !== 0) return false;
  try {
    const parsed = JSON.parse(res.stdout);
    const s = parsed.streams?.[0];
    return (
      s &&
      s.codec_name === 'h264' &&
      Number(s.width) === 1920 &&
      Number(s.height) === 1080 &&
      Number(s.nb_frames) === expectedFrames
    );
  } catch {
    return false;
  }
}

async function writeBufferWithBackpressure(writable, buf) {
  if (!writable.write(buf)) {
    await new Promise((resolve, reject) => {
      const onDrain = () => {
        writable.off('error', onErr);
        resolve();
      };
      const onErr = (err) => {
        writable.off('drain', onDrain);
        reject(err);
      };
      writable.once('drain', onDrain);
      writable.once('error', onErr);
    });
  }
}

async function renderFrameRangeToFFmpeg({
  workers,
  startIndex,
  frameCount,
  fps,
  outMp4Path,
  ffmpegArgs,
  jpegQuality,
  label,
}) {
  const tmpMp4Path = `${outMp4Path}.tmp.mp4`;
  await fs.rm(tmpMp4Path, { force: true });

  const ff = spawn('ffmpeg', [...ffmpegArgs, tmpMp4Path], {
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  const ffDone = new Promise((resolve, reject) => {
    ff.once('error', reject);
    ff.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code} for ${label}`));
    });
  });

  const ring = new Map();
  let nextPull = 0;
  let nextFlush = 0;
  let flushing = false;
  let wakeWaiters = [];

  const notifyProgress = () => {
    const list = wakeWaiters;
    wakeWaiters = [];
    for (const fn of list) fn();
  };

  async function flushReady() {
    if (flushing) return;
    flushing = true;
    try {
      while (ring.has(nextFlush)) {
        const buf = ring.get(nextFlush);
        ring.delete(nextFlush);
        nextFlush++;
        notifyProgress();
        await writeBufferWithBackpressure(ff.stdin, buf);
      }
    } finally {
      flushing = false;
    }
  }

  const t0 = Date.now();
  const maxInFlight = workers.length * 4;

  await Promise.all(
    workers.map(async ({ page, cdp, errors }) => {
      while (true) {
        const localIdx = nextPull++;
        if (localIdx >= frameCount) break;

        while (ring.size >= maxInFlight && localIdx > nextFlush + 2) {
          await new Promise((r) => wakeWaiters.push(r));
        }

        const globalIdx = startIndex + localIdx;
        const t = globalIdx / fps;

        await page.evaluate((timeSec) => window.renderAtTime(timeSec), t);
        const { data } = await cdp.send('Page.captureScreenshot', {
          format: 'jpeg',
          quality: jpegQuality,
          optimizeForSpeed: true,
        });
        if (errors.length > 0) {
          throw new Error(`Worker error at t=${t.toFixed(3)}s: ${errors.join('; ')}`);
        }

        ring.set(localIdx, Buffer.from(data, 'base64'));
        await flushReady();
      }
    })
  );

  await flushReady();
  ff.stdin.end();
  await ffDone;

  await fs.rename(tmpMp4Path, outMp4Path);
  const st = await fs.stat(outMp4Path);
  const elapsed = (Date.now() - t0) / 1000;
  console.log(
    `[RENDERED ${label}] ${frameCount}f @ ${fps}fps in ${elapsed.toFixed(1)}s (${(
      frameCount / elapsed
    ).toFixed(2)} FPS) | ${(st.size / (1024 * 1024)).toFixed(2)} MB`
  );
}

async function main() {
  const opts = parseArgs(process.argv);
  const srv = await startStaticServer(ROOT_DIR);
  const browser = await launchHeadlessBrowser();

  try {
    const workers = await Promise.all(
      Array.from({ length: opts.workers }, () => createWorkerContext(browser, srv.sceneUrl))
    );

    if (opts.preview12fps) {
      const previewVideoOnly = path.join(ROOT_DIR, 'preview_12fps.video.tmp.mp4');
      const finalPreview = path.join(ROOT_DIR, 'preview_12fps.mp4');
      const wavPath = path.join(ROOT_DIR, 'soundtrack_60s.wav');

      await renderFrameRangeToFFmpeg({
        workers,
        startIndex: 0,
        frameCount: 720,
        fps: 12.0,
        outMp4Path: fsSync.existsSync(wavPath) ? previewVideoOnly : finalPreview,
        jpegQuality: 92,
        label: 'preview_12fps',
        ffmpegArgs: [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'image2pipe',
          '-vcodec',
          'mjpeg',
          '-framerate',
          '12',
          '-i',
          '-',
          '-c:v',
          'libx264',
          '-profile:v',
          'high',
          '-pix_fmt',
          'yuv420p',
          '-r',
          '12',
          '-crf',
          '20',
          '-maxrate',
          '3200k',
          '-bufsize',
          '6400k',
          '-preset',
          'veryfast',
          '-g',
          '12',
          '-movflags',
          '+faststart',
        ],
      });

      if (fsSync.existsSync(wavPath)) {
        const mux = spawnSync(
          'ffmpeg',
          [
            '-y',
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            previewVideoOnly,
            '-i',
            wavPath,
            '-map',
            '0:v:0',
            '-map',
            '1:a:0',
            '-c:v',
            'copy',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-ar',
            '48000',
            '-ac',
            '2',
            '-movflags',
            '+faststart',
            finalPreview,
          ],
          { stdio: 'inherit' }
        );
        await fs.rm(previewVideoOnly, { force: true });
        if (mux.status !== 0) throw new Error('Failed muxing audio into preview_12fps.mp4');
        console.log(`[MUXED] soundtrack_60s.wav -> ${finalPreview}`);
      }
      return;
    }

    // 6 x 10.0s Resumable 30fps Chunks
    const chunksDir = path.join(ROOT_DIR, 'chunks');
    await fs.mkdir(chunksDir, { recursive: true });

    for (let c = 1; c <= 6; c++) {
      if (opts.onlyChunk !== null && opts.onlyChunk !== c) continue;
      const chunkName = `chunk_0${c}.mp4`;
      const chunkPath = path.join(chunksDir, chunkName);

      if (!opts.force && isValidChunk(chunkPath, 300)) {
        console.log(`[SKIP VALID CHUNK] ${chunkName} (300 frames, 1920x1080 h264 verified)`);
        continue;
      }

      await renderFrameRangeToFFmpeg({
        workers,
        startIndex: (c - 1) * 300,
        frameCount: 300,
        fps: 30.0,
        outMp4Path: chunkPath,
        jpegQuality: opts.jpegQuality,
        label: chunkName,
        ffmpegArgs: [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'image2pipe',
          '-vcodec',
          'mjpeg',
          '-framerate',
          '30',
          '-i',
          '-',
          '-c:v',
          'libx264',
          '-profile:v',
          'high',
          '-level:v',
          '4.1',
          '-pix_fmt',
          'yuv420p',
          '-r',
          '30',
          '-fps_mode',
          'cfr',
          '-video_track_timescale',
          '15360',
          '-crf',
          '18',
          '-maxrate',
          '3600k',
          '-bufsize',
          '7200k',
          '-preset',
          opts.preset,
          '-g',
          '30',
          '-bf',
          '2',
        ],
      });

      if (!isValidChunk(chunkPath, 300)) {
        throw new Error(`Post-render ffprobe validation failed for ${chunkName}`);
      }
    }
  } finally {
    await browser.close();
    await srv.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
