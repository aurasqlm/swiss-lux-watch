#!/usr/bin/env node
/**
 * scripts/fetch_fonts.mjs
 * Deterministically downloads SIL OFL .woff2 luxury font subsets (latin + latin-ext,
 * guaranteeing U+00C8 'È' for GENÈVE) into src/assets/fonts/ and generates
 * src/assets/fonts/fonts.css with local @font-face rules.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FONTS_DIR = path.join(ROOT, 'src', 'assets', 'fonts');

const GOOGLE_CSS_URL =
  'https://fonts.googleapis.com/css2?' +
  [
    'family=Cinzel:wght@400;600;700',
    'family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400',
    'family=Montserrat:wght@300;500',
    'display=block',
  ].join('&');

const CHROME_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  await fs.mkdir(FONTS_DIR, { recursive: true });

  const res = await fetch(GOOGLE_CSS_URL, {
    headers: { 'User-Agent': CHROME_UA },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Google Fonts CSS: HTTP ${res.status}`);
  }
  const cssText = await res.text();

  // Match /* subset */ followed by @font-face { ... }
  const blockRegex = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/gi;
  const keptBlocks = [];
  let match;

  while ((match = blockRegex.exec(cssText)) !== null) {
    const subset = match[1].trim().toLowerCase();
    if (subset !== 'latin' && subset !== 'latin-ext') continue;

    const body = match[2];
    const familyMatch = body.match(/font-family:\s*['"]([^'"]+)['"]/i);
    const styleMatch = body.match(/font-style:\s*([a-z]+)/i);
    const weightMatch = body.match(/font-weight:\s*([0-9]+)/i);
    const urlMatch = body.match(/url\((https:\/\/[^)]+\.woff2)\)/i);
    const rangeMatch = body.match(/unicode-range:\s*([^;]+);/i);

    if (!familyMatch || !urlMatch) continue;

    const family = familyMatch[1];
    const style = styleMatch ? styleMatch[1] : 'normal';
    const weight = weightMatch ? weightMatch[1] : '400';
    const remoteUrl = urlMatch[1];
    const unicodeRange = rangeMatch ? rangeMatch[1].trim() : 'U+0000-00FF';

    const fileName = `${slugify(family)}-${weight}${style === 'italic' ? 'i' : ''}-${subset}.woff2`;
    const localPath = path.join(FONTS_DIR, fileName);

    let exists = false;
    try {
      const st = await fs.stat(localPath);
      exists = st.size > 1000;
    } catch {
      exists = false;
    }

    if (!exists) {
      const fontRes = await fetch(remoteUrl, { headers: { 'User-Agent': CHROME_UA } });
      if (!fontRes.ok) {
        throw new Error(`Failed downloading ${remoteUrl}: HTTP ${fontRes.status}`);
      }
      const buf = Buffer.from(await fontRes.arrayBuffer());
      await fs.writeFile(localPath, buf);
      console.log(`Downloaded ${fileName} (${buf.length} bytes)`);
    } else {
      console.log(`Cached ${fileName}`);
    }

    keptBlocks.push(
      `/* ${family} ${weight} ${style} (${subset}) */\n` +
      `@font-face {\n` +
      `  font-family: '${family}';\n` +
      `  font-style: ${style};\n` +
      `  font-weight: ${weight};\n` +
      `  font-display: block;\n` +
      `  src: url('./${fileName}') format('woff2');\n` +
      `  unicode-range: ${unicodeRange};\n` +
      `}`
    );
  }

  if (keptBlocks.length < 8) {
    throw new Error(`Expected >= 8 @font-face subsets, got ${keptBlocks.length}`);
  }

  const outCssPath = path.join(FONTS_DIR, 'fonts.css');
  await fs.writeFile(
    outCssPath,
    `/* Auto-generated offline luxury @font-face manifest (SIL OFL) */\n\n` +
      keptBlocks.join('\n\n') +
      '\n',
    'utf8'
  );
  console.log(`Wrote ${keptBlocks.length} @font-face rules -> ${path.relative(ROOT, outCssPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
