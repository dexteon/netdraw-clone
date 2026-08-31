// AC-4 fixture test harness — extracts parser section from index.html, evals, asserts.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];

// Minimal stubs so the full script evals without a DOM
const noop = () => {};
const mkEl = () => ({ style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop }, appendChild: noop, setAttribute: noop, remove: noop, querySelector: () => mkEl(), querySelectorAll: () => [], addEventListener: noop, getContext: () => ({ scale: noop, drawImage: noop, fillRect: noop, getImageData: () => ({ data: new Uint8Array(4) }) }), toBlob: noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }), clientWidth: 800, clientHeight: 600, textContent: '', value: '', innerHTML: '', className: '' });
const ctx = {
  window: { addEventListener: noop, devicePixelRatio: 1, AudioContext: function(){} },
  document: { createElement: mkEl, createElementNS: () => mkEl(), body: { classList: { add: noop, remove: noop }, appendChild: noop }, querySelectorAll: () => [], querySelector: () => mkEl(), getElementById: () => null, addEventListener: noop },
  localStorage: { getItem: () => null, setItem: noop },
  navigator: { mediaDevices: {} },
  URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: noop },
  Image: function(){}, Audio: function(){ return { play: noop, pause: noop }; },
  MediaRecorder: undefined, MediaStream: function(){ return { getTracks: () => [] }; },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Blob: function(){}, FileReader: function(){},
  console,
};
const vm = require('vm');
vm.createContext(ctx);
vm.runInContext(script, ctx);

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS ' + name); pass++; }
  catch (e) { console.log('  FAIL ' + name + ': ' + e.message); fail++; }
}

// --- Cisco running-config fixture ---
const cfg = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-cisco.cfg'), 'utf8');
const cfgResult = ctx.parseRunningConfig(cfg);

check('3 devices parsed', () => assert.strictEqual(cfgResult.devices.length, 3));
check('hostnames match', () => {
  const hs = cfgResult.devices.map(d => d.hostname);
  assert.ok(hs.includes('EDGE-R1'));
  assert.ok(hs.includes('CORE-SW1'));
  assert.ok(hs.includes('FW-INSIDE'));
});
check('>=2 links derived', () => assert.ok(cfgResult.links.length >= 2, 'got ' + cfgResult.links.length));
check('EDGE-R1↔CORE-SW1 link exists', () => {
  assert.ok(cfgResult.links.some(l =>
    (l.from === 'EDGE-R1' && l.to === 'CORE-SW1') ||
    (l.from === 'CORE-SW1' && l.to === 'EDGE-R1')
  ));
});
check('>=1 non-matching-description warning', () => {
  const nm = cfgResult.warnings.filter(w => w.reason === 'no peer match');
  assert.ok(nm.length >= 1, 'got ' + nm.length + ' no-peer warnings');
});
check('>=1 shutdown interface', () => {
  let found = false;
  for (const d of cfgResult.devices) for (const i of d.interfaces) if (i.shutdown) found = true;
  assert.ok(found, 'no shutdown interface found');
});

// --- CMDB JSON fixture ---
const jsonText = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-cmdb.json'), 'utf8');
const jsonResult = ctx.parseAssetsJSON(jsonText);

check('JSON: 6 assets', () => assert.strictEqual(jsonResult.assets.length, 6));
check('JSON: unknown type mapped to workstation', () => {
  const waf = jsonResult.assets.find(a => a.type === 'unknown-thing');
  assert.strictEqual(waf.mappedType, 'workstation');
});
check('JSON: buildIngestNodes >=3 zones', () => {
  const frag = ctx.buildIngestNodes({ assets: jsonResult.assets });
  assert.ok(frag.zones.length >= 3, 'got ' + frag.zones.length + ' zones');
});

// --- CMDB CSV fixture ---
const csvText = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-cmdb.csv'), 'utf8');
const csvResult = ctx.parseAssetsCSV(csvText);

check('CSV: 5 rows', () => assert.strictEqual(csvResult.assets.length, 5));
check('CSV: quoted comma field survived', () => {
  const srv = csvResult.assets.find(a => a.name.includes('Server'));
  assert.ok(srv, 'quoted-comma row not found');
  assert.ok(srv.name.includes('Web'), 'quoted content dropped: ' + srv.name);
});
check('CSV: =-prefixed cell sanitized', () => {
  const inj = csvResult.assets.find(a => a.name.includes('CMD'));
  assert.ok(inj, 'injection row not found');
  assert.ok(!inj.name.startsWith('='), 'leading = not stripped: ' + inj.name);
  assert.ok(csvResult.warnings.some(w => w.reason.includes('sanitized')), 'no sanitizer warning');
});

// --- Empty input edge cases ---
check('empty JSON array → empty assets', () => {
  const r = ctx.parseAssetsJSON([]);
  assert.strictEqual(r.assets.length, 0);
});
check('empty CSV string → empty assets', () => {
  const r = ctx.parseAssetsCSV('');
  assert.strictEqual(r.assets.length, 0);
});

// --- Idempotency ---
check('parseRunningConfig twice → identical', () => {
  const r1 = JSON.stringify(ctx.parseRunningConfig(cfg));
  const r2 = JSON.stringify(ctx.parseRunningConfig(cfg));
  assert.strictEqual(r1, r2);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);