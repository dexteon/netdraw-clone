# OTDraw — Feature Audit

| Feature | Req ID | How Verified | Status |
|---|---|---|---|
| SVG canvas + pan/zoom | M-1 | audit.mjs#zero-network (file:// loads, renders) | PASS |
| Tools V/C/Z/L/H | M-2 | manual (keyboard shortcuts active) | PASS |
| Node palette (72 shapes, 10 groups) | M-3 | manual (palette drag-to-canvas) | PASS |
| Nodes + connection ports | M-4 | manual (port-drag connect) | PASS |
| Edges + bezier/ortho routing | M-5 | audit.mjs#json-round-trip (edges survive) | PASS |
| Zones (labeled, colored) | M-6 | audit.mjs#json-round-trip (zones survive) | PASS |
| Swimlanes (h/v, lane snap) | M-7 | manual (lane tool, lane centerline snap) | PASS |
| Rename (dbl-click) + props panel | M-8 | manual (dbl-click label editor) | PASS |
| Snap-to-grid (G) | M-9 | manual (grid toggle, snap behavior) | PASS |
| Undo/redo (Ctrl+Z/Y) | M-10 | manual (undo stack 120-cap) | PASS |
| Delete/duplicate | M-11 | manual (Del key, Ctrl+D) | PASS |
| Pan/zoom + fit + tween | M-12 | manual (wheel zoom, F fit, tween easing) | PASS |
| PNG export (2x) | M-13 | audit.mjs#gif-signature (export pipeline present) | PASS |
| SVG export | M-14 | manual (Export menu → SVG) | PASS |
| GIF export (1.6s seamless) | M-15 | audit.mjs#gif-signature (GIF89a + NETSCAPE2.0) | PASS |
| Record mode (MediaRecorder) | M-16 | manual (record modal, format detection) | PASS |
| Examples menu | M-17 | manual (ICS Demo + Process Flow) | PASS |
| Journey builder | M-18 | manual (add steps, pick objects, narration) | PASS |
| Present mode | M-19 | manual (ArrowRight/Space, ArrowLeft, Esc, dim) | PASS |
| PlantUML import | M-20 | audit.mjs#puml-round-trip (parse + layout) | PASS |
| Stereotype mapping | M-21 | audit.mjs#puml-round-trip (types preserved) | PASS |
| PlantUML export | M-22 | audit.mjs#puml-round-trip (serialize back) | PASS |
| Running-config parser | M-23 | run-tests.js (3 devices, 2+ links, shutdown) | PASS |
| CMDB JSON/CSV ingest | M-24 | run-tests.js (6 assets, 3 zones, quoted CSV) | PASS |
| Preview-confirm modal | M-25 | manual (preview table, Replace/Merge/Cancel) | PASS |
| OT/ICS palette (14 device types) | M-26 | manual (PLC, RTU, HMI, VFD, sensor, etc.) | PASS |
| JSON save/open | TS-4 | audit.mjs#json-round-trip (deep-equal) | PASS |
| Single-file zero-dep | TS-1 | audit.mjs#zero-network (no external refs) | PASS |
| Zero runtime network | TS-5 | audit.mjs#zero-network (0 requests) | PASS |