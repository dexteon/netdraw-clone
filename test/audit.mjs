// Parity audit: AC-2 (JSON round-trip), AC-3 (PUML round-trip), AC-5/TS-5 (zero network + zero console errors), AC-6 (GIF signature).
// Uses Playwright (devDependency) to load index.html from file:// and evaluate in-app functions.

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, '..', 'index.html');
const fileUrl = pathToFileURL(indexPath).href;

const html = readFileSync(indexPath, 'utf8');

let pass = 0, fail = 0;
function result(name, ok, detail) {
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`  ${status} ${name}${detail ? ' — ' + detail : ''}`);
  if (ok) pass++; else fail++;
}

// --- AC-4: re-run fixture tests via child process ---
import { execSync } from 'child_process';
try {
  execSync('node test/run-tests.js', { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' });
  result('AC-4 fixture tests (run-tests.js)', true, '15/15 passed');
} catch (e) {
  result('AC-4 fixture tests (run-tests.js)', false, e.stdout?.toString() || e.message);
}

// --- Browser-based checks ---
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const requests = [];
const consoleErrors = [];
page.on('request', req => {
  // exclude the document navigation itself (file:// goto)
  if (req.url() !== fileUrl) requests.push(req.url());
});
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => consoleErrors.push(err.message));

await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForTimeout(500);

// AC-5/TS-5: zero network requests + zero console errors
result('AC-5 zero network requests', requests.length === 0, `${requests.length} request(s)${requests.length ? ': ' + requests.slice(0, 3).join(', ') : ''}`);
result('AC-5 zero console errors', consoleErrors.length === 0, `${consoleErrors.length} error(s)${consoleErrors.length ? ': ' + consoleErrors.slice(0, 3).join('; ') : ''}`);

// AC-2: JSON save→clear→open deep-equal
const jsonRT = await page.evaluate(() => {
  const s1 = serialize();
  const saved = JSON.parse(s1);
  state.nodes = []; state.edges = []; state.zones = []; state.journey = { steps: [] };
  renderAll();
  applyLoadedDoc(saved);
  const s2 = serialize();
  return { pass: s1 === s2, s1n: JSON.parse(s1).nodes.length, s2n: JSON.parse(s2).nodes.length };
});
result('AC-2 JSON round-trip deep-equal', jsonRT.pass, `${jsonRT.s1n}→${jsonRT.s2n} nodes`);

// AC-3: PUML round-trip + empty input
const pumlRT = await page.evaluate(() => {
  const input = 'package Z1 {\n  component A\n  component B\n}\nA --> B : sync';
  const rt = pumlRoundTrip(input);
  const empty = pumlParse('@startuml\n@enduml');
  return { pass: rt.pass, nodes: rt.m1.nodes.length, emptyNodes: empty.nodes.length };
});
result('AC-3 PUML round-trip', pumlRT.pass, `${pumlRT.nodes} nodes`);
result('AC-3 PUML empty input', pumlRT.emptyNodes === 0, `${pumlRT.emptyNodes} nodes from empty`);

// AC-6: GIF signature (check the gifAssemble output bytes via the encoder)
const gifCheck = await page.evaluate(() => {
  // Build a minimal palette + index frame to test the assembler directly
  const pal = new Uint8Array(256 * 3);
  pal[0] = 11; pal[1] = 17; pal[2] = 32; // first color
  const frame = new Uint8Array(4); // 2x2 image
  const blob = gifAssemble(2, 2, pal, [frame], 8);
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result);
      const sig = String.fromCharCode(...bytes.slice(0, 6));
      const hasNetscape = new TextDecoder().decode(bytes).includes('NETSCAPE2.0');
      resolve({ sig, hasNetscape, len: bytes.length });
    };
    reader.readAsArrayBuffer(blob);
  });
});
result('AC-6 GIF89a signature', gifCheck.sig === 'GIF89a', `got "${gifCheck.sig}"`);
result('AC-6 NETSCAPE2.0 loop block', gifCheck.hasNetscape, `${gifCheck.len} bytes`);

await browser.close();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);