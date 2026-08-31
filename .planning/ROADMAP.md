# Roadmap: NetDraw Clone — Network Diagram Editor

## Overview

Clean-room clone of NetDraw extended with a PlantUML bridge and machine-config
ingestion. Milestone v1 delivers full editor parity plus both bridges, ending
with a parity audit and publish.

## Milestone v1.0 — Parity + Bridges 🚧

generated 2026-08-30 · granularity: coarse

## Phases

- [ ] **Phase 1: Core editor parity** - Single-file working editor from the validated prototype
- [ ] **Phase 2: Export & record** - PNG/SVG/GIF export and MediaRecorder video
- [ ] **Phase 3: Presentation modes** - Journey builder and present mode
- [ ] **Phase 4: PlantUML bridge** - Import/export component & deployment subset
- [ ] **Phase 5: Config ingestion** - Running-config and CMDB asset ingest
- [ ] **Phase 6: Parity audit & polish** - Side-by-side audit, README, repo push

## Phase Details

### Phase 1: Core editor parity

**Goal**: Deliver the working single-file editor — tokens/styling, tools (V/C/Z/L/H), palette drag-to-canvas, nodes with ports, edge linking (port-drag + click-click), zones, swimlanes with lane snap, snap-to-grid, undo/redo, rename, props panel, pan/zoom + tween + fit, examples menu, JSON save/open — using the validated prototype (G:\Scratch\netdraw-replica\replica.html) as the styling reference and starting skeleton.
**Depends on**: Nothing (first phase)
**Requirements**: TS-1, TS-2, TS-3, TS-4, TS-5, M-1, M-2, M-3, M-4, M-5, M-6, M-7, M-8, M-9, M-10, M-11, M-12, M-17
**Success Criteria** (what must be TRUE):
  1. App opens from file:// as a single index.html with zero console errors and zero network requests
  2. All tools (V/C/Z/L/H), undo/redo, snap-to-grid, pan/zoom, and rename behave like the original
  3. A diagram with nodes, edges, zones, and swimlanes saves to JSON and reopens with every element and property preserved
**Plans**: TBD

**Files**: index.html (single-file app)

### Phase 2: Export & record

**Goal**: PNG 2x, SVG vector export, animated GIF (own LZW + median-cut), MediaRecorder video with mic option + format detection, toast feedback.
**Depends on**: Phase 1
**Requirements**: M-13, M-14, M-15, M-16
**Success Criteria** (what must be TRUE):
  1. PNG export produces a 2x-scale raster of the diagram
  2. SVG export produces valid vector markup of the diagram
  3. GIF export produces a valid seamless ~1.6s looping GIF from an animated-edge diagram
  4. Record mode captures canvas + optional mic to WebM with format detection and toast feedback
**Plans**: TBD

**Files**: index.html

### Phase 3: Presentation modes

**Goal**: Journey builder (steps, narration, footsteps, preview-from-step), present mode (chrome hidden, keyboard advance, tweened focus), journey modal.
**Depends on**: Phase 2
**Requirements**: M-18, M-19
**Success Criteria** (what must be TRUE):
  1. A journey with steps and per-step narration can be built and previewed from any step
  2. Present mode hides chrome and advances steps via arrow/Space with tweened focus on each step's target
**Plans**: TBD

**Files**: index.html

### Phase 4: PlantUML bridge

**Goal**: Subset parser (component/deployment): actors/components/nodes/databases/clouds, packages→zones, arrows→edges with labels, stereotype→shape mapping. Export back to component syntax. Import UI: paste box + file upload; export via menu.
**Depends on**: Phase 3
**Requirements**: M-20, M-21, M-22
**Success Criteria** (what must be TRUE):
  1. Pasting or uploading a .puml component/deployment diagram yields editable nodes, edges, and zones
  2. Stereotypes (database, node, cloud, actor…) map to the matching palette shapes
  3. Exporting a diagram produces PlantUML component syntax with zones as packages and edges as labeled arrows
  4. .puml → diagram → .puml round-trip preserves nodes, edges, zone containment, and labels
**Plans**: TBD

**Files**: index.html (puml module section)

### Phase 5: Config ingestion

**Goal**: Running-config parser (hostname, interfaces, `description <peer>` heuristic) and asset JSON/CSV ingest with zone grouping; preview-confirm before apply; fixture tests with a sample Cisco config and CMDB export.
**Depends on**: Phase 4
**Requirements**: M-23, M-24, M-25
**Success Criteria** (what must be TRUE):
  1. A sample Cisco-style running-config produces expected nodes and edges (fixture test)
  2. CMDB asset JSON/CSV ingest produces nodes with zone grouping by a chosen field
  3. Ingest shows a preview/diff and only applies to the canvas after confirmation
**Plans**: TBD

**Files**: index.html, test/fixtures/*.{cfg,json,csv}

### Phase 6: Parity audit & polish

**Goal**: Side-by-side feature audit vs the original (AC-1), JSON round-trip test (AC-2), zero-network check (AC-5), README with GIF, GitHub repo push.
**Depends on**: Phase 5
**Requirements**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, TS-5
**Success Criteria** (what must be TRUE):
  1. Side-by-side checklist vs the original shows every Feature Inventory item demonstrably working
  2. JSON save → clear → open produces a deep-equal model
  3. App runs from file:// with zero console errors and zero network requests
  4. README with embedded GIF documents the project; repo pushed to GitHub
**Plans**: TBD

**Files**: index.html, README.md

## Progress

**Execution Order:** Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core editor parity | 0/? | Not started | - |
| 2. Export & record | 0/? | Not started | - |
| 3. Presentation modes | 0/? | Not started | - |
| 4. PlantUML bridge | 0/? | Not started | - |
| 5. Config ingestion | 0/? | Not started | - |
| 6. Parity audit & polish | 0/? | Not started | - |

---
*Progress tracking lives in .planning/STATE.md; phase status markers updated by workflow.*
