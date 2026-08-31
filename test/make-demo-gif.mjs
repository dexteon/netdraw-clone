// Generate docs/demo.gif by dogfooding the app's own exportGIF in a headless browser.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, '..', 'index.html');
const outPath = path.resolve(__dirname, '..', 'docs', 'demo.gif');
mkdirSync(path.dirname(outPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Intercept the download triggered by exportGIF's download() helper
const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

await page.goto(pathToFileURL(indexPath).href, { waitUntil: 'load' });
await page.waitForTimeout(300);

// Build a representative diagram: DMZ demo + animated edges + a sneakernet edge
await page.evaluate(() => {
  const st = sampleState();
  // animate two edges + sneakernet one for the GIF's motion
  st.edges[0].anim = true;
  st.edges[1].anim = true;
  st.edges[2].dash = 'sneakernet';
  applyLoadedDoc(st);
});

// Trigger the real exportGIF (uses the app's own encoder pipeline)
await page.evaluate(() => exportGIF());
const download = await downloadPromise;
const tmp = await download.path();
const buf = readFileSync(tmp);
writeFileSync(outPath, buf);

// Verify signature
const sig = buf.slice(0, 6).toString('ascii');
console.log('demo.gif written:', outPath, buf.length, 'bytes, signature:', sig);
process.exit(sig === 'GIF89a' ? 0 : 1);

import { readFileSync } from 'fs';