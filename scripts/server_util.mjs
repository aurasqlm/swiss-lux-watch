/**
 * scripts/server_util.mjs
 * Ephemeral loopback static HTTP server + persistent chrome-headless-shell helper.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HEADLESS_SHELL_CANDIDATES = [
  '/opt/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell',
  '/opt/ms-playwright/chromium-1255/chrome-linux64/chrome',
  '/usr/bin/google-chrome',
];

export function resolveChromiumExecutable() {
  for (const p of HEADLESS_SHELL_CANDIDATES) {
    if (fsSync.existsSync(p)) return p;
  }
  return undefined;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

export async function startStaticServer(rootDir = ROOT_DIR) {
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const safeRel = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
      const filePath = path.join(rootDir, safeRel);
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      const data = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  return {
    baseUrl,
    sceneUrl: `${baseUrl}/src/index.html`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

export async function launchHeadlessBrowser() {
  const executablePath = resolveChromiumExecutable();
  return chromium.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars',
      '--mute-audio',
      '--font-render-hinting=none',
    ],
  });
}

export async function createWorkerContext(browser, sceneUrl) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message || err}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  page.on('requestfailed', (req) => {
    errors.push(`requestfailed: ${req.url()} (${req.failure()?.errorText || 'failed'})`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) {
      errors.push(`HTTP ${res.status()}: ${res.url()}`);
    }
  });

  await page.goto(sceneUrl, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ENGINE_READY__ === true, null, { timeout: 15000 });
  await page.evaluate(() => window.initEngine());

  if (errors.length > 0) {
    throw new Error(`Worker initialization errors:\n${errors.join('\n')}`);
  }

  const cdp = await context.newCDPSession(page);
  return { context, page, cdp, errors };
}
