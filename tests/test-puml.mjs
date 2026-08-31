// Test harness: extracts the script from index.html, stubs the DOM, tests the PUML bridge.
import { readFileSync } from 'fs';
import vm from 'vm';

const html = readFileSync('index.html', 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];

const noop = () => {};
const mkEl = () => ({
  style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop },
  appendChild: noop, setAttribute: noop, remove: noop,
  querySelector: () => mkEl(), querySelectorAll: () => [],
  addEventListener: noop,
  getContext: () => ({ scale: noop, drawImage: noop, fillRect: noop, getImageData: () => ({ data: new Uint8Array(4) }) }),
  toBlob: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }),
  clientWidth: 800, clientHeight: 600,
  textContent: '', value: '', innerHTML: '', className: 'x',
});

const ctx = {
  window: { addEventListener: noop, devicePixelRatio: 1, AudioContext: function(){} },
  document: {
    createElement: mkEl, createElementNS: (ns, t) => mkEl(), body: { classList: { add: noop, remove: noop }, appendChild: noop },
    querySelectorAll: () => [], querySelector: () => mkEl(), getElementById: () => null,
    addEventListener: noop,
  },
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
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(script, ctx);

const out = {};
out.pumlParse = ctx.pumlParse;
out.pumlRoundTrip = ctx.pumlRoundTrip;

// --- Test 1: the real fixture ---
const puml = readFileSync('fixtures/AEP-SL-2026-01_attack-path.puml', 'utf8');
const m = ctx.pumlParse(puml);
console.log('=== FIXTURE PARSE ===');
console.log('zones:', m.zones.length, 'nodes:', m.nodes.length, 'edges:', m.edges.length, 'warnings:', m.warnings.length);
m.zones.forEach(z => console.log('  zone:', z.label, '· members:', z.nodes.length));
console.log('sample edges:', m.edges.slice(0, 6).map(e => e.fromAlias + '->' + e.toAlias + ': "' + e.label.slice(0, 30) + '"').join('\n                   '));

// --- Test 2: round-trip the fixture ---
const rt = ctx.pumlRoundTrip(puml);
console.log('\n=== FIXTURE ROUND TRIP ===');
console.log('pass:', rt.pass);
console.log('m1:', rt.m1.nodes.length + ' nodes,', rt.m1.edges.length + ' edges,', rt.m1.zones.length + ' zones');
console.log('m2:', rt.m2.nodes.length + ' nodes,', rt.m2.edges.length + ' edges,', rt.m2.zones.length + ' zones');

// --- Test 3: simple case ---
const simple = 'package Z1 {\n  component A\n  component B\n}\nA --> B : sync';
const rt2 = ctx.pumlRoundTrip(simple);
console.log('\n=== SIMPLE RT ===');
console.log('pass:', rt2.pass, '· nodes:', rt2.m1.nodes.length, 'edges:', rt2.m1.edges.length, 'zones:', rt2.m1.zones.length);

// --- Test 4: plan acceptance cases ---
const t4 = ctx.pumlParse('package Foo { component Bar }');
console.log('\n=== PLAN CASES ===');
console.log('Foo contains Bar:', t4.zones.length === 1 && t4.zones[0].label === 'Foo' && t4.nodes.length === 1 && t4.nodes[0].label === 'Bar');
const t5 = ctx.pumlParse('database "DB" as db <<mysql>>\n[web] --> [db] : reads');
console.log('db decl+edge:', t5.nodes.length === 1 && t5.nodes[0].alias === 'db' && t5.nodes[0].label === 'DB' && t5.edges.length === 1 && t5.edges[0].label === 'reads');
// depth cap
const deep = Array.from({length: 100}, (_, i) => 'package N' + i + ' {').join('\n');
const t6 = ctx.pumlParse(deep);
console.log('depth cap ok:', t6.warnings.some(w => w.includes('depth cap')));

// --- Test 5: label order comparison for fixture (find why RT may fail) ---
if (!rt.pass) {
  console.log('\n=== RT DIFF ===');
  const l1 = rt.m1.nodes.map(n => n.label), l2 = rt.m2.nodes.map(n => n.label);
  for (let i = 0; i < Math.max(l1.length, l2.length); i++) {
    if (l1[i] !== l2[i]) { console.log('first diff at', i, ':', JSON.stringify(l1[i]), 'vs', JSON.stringify(l2[i])); break; }
  }
  console.log('zone counts', rt.m1.zones.length, rt.m2.zones.length, 'edge counts', rt.m1.edges.length, rt.m2.edges.length);
}
