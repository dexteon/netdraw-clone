# Roadmap — NetDraw Clone

**Milestone: v1 — Parity + Bridges** · generated 2026-08-30 · granularity: coarse

---

## Phase 1 — Core editor parity [PLAN:NONE]

Deliver the working single-file editor: tokens/styling, tools (V/C/Z/L/H), palette
drag-to-canvas, nodes with ports, edge linking (port-drag + click-click), zones,
swimlanes with lane snap, snap-to-grid, undo/redo, rename, props panel, pan/zoom +
tween + fit, examples menu, JSON save/open. Uses the validated prototype
(G:\Scratch\netdraw-replica\replica.html) as the styling reference and starting skeleton.

**Requirements**: TS-1..TS-5, M-1..M-12, M-17
**Files**: index.html (single-file app)

## Phase 2 — Export & record [PLAN:NONE]

PNG 2x, SVG vector export, animated GIF (own LZW + median-cut), MediaRecorder video
with mic option + format detection, toast feedback.

**Requirements**: M-13..M-16
**Files**: index.html

## Phase 3 — Presentation modes [PLAN:NONE]

Journey builder (steps, narration, footsteps, preview-from-step), present mode
(chrome hidden, keyboard advance, tweened focus), journey modal.

**Requirements**: M-18, M-19
**Files**: index.html

## Phase 4 — PlantUML bridge [PLAN:NONE]

Subset parser (component/deployment): actors/components/nodes/databases/clouds,
packages→zones, arrows→edges with labels, stereotype→shape mapping. Export back to
component syntax. Import UI: paste box + file upload; export via menu.

**Requirements**: M-20..M-22
**Files**: index.html (puml module section)

## Phase 5 — Config ingestion [PLAN:NONE]

Running-config parser (hostname, interfaces, `description <peer>` heuristic) and
asset JSON/CSV ingest with zone grouping; preview-confirm before apply; fixture
tests with a sample Cisco config and CMDB export.

**Requirements**: M-23..M-25
**Files**: index.html, test/fixtures/*.{cfg,json,csv}

## Phase 6 — Parity audit & polish [PLAN:NONE]

Side-by-side feature audit vs the original (AC-1), JSON round-trip test (AC-2),
zero-network check (AC-5), README with GIF, GitHub repo push.

**Requirements**: AC-1..AC-6, TS-5
**Files**: index.html, README.md

---
*Progress tracking lives in .planning/STATE.md; phase status markers updated by workflow.*
