# Requirements — NetDraw Clone

**Source**: PROJECT.md · **Status**: Draft v1 · **Milestone**: v1 — Parity + Bridges

## Table Stakes

- TS-1 Single-file HTML app, zero runtime dependencies, runs from file:// and any static host
- TS-2 NetDraw visual identity: token set (bg #0b1120 … accent #38bdf8), 13px system-ui, tgroup pills, 212px palette, pill hintbar
- TS-3 Keyboard-first: V/C/Z/L/H tools, Del, F fit, Ctrl+Z/Y, Ctrl+S, Space+drag pan
- TS-4 Diagram persistence: JSON save/open round-trip preserves every element and property
- TS-5 No external network calls at runtime (fonts, CDNs, APIs — none)

## Must Have

### Core editor
- M-1 Node palette (categorized: Network, Security, Compute, OT/ICS, External) with drag-to-canvas ghost
- M-2 Node rendering: icon, label, color (6 swatches), 4 hover-revealed drag-ports
- M-3 Edge linking: port-drag and click-click; edge selection, hover highlight, animated dash option
- M-4 Edge routing: curved + orthogonal modes (bezPoint/bezAngle-class geometry)
- M-5 Zones: dashed rounded rects with labels; node containment (inZone)
- M-6 Swimlanes: lane rows, add/remove/rename, lane snapping (laneSnapPoint)
- M-7 Snap-to-grid + lane snap, toggleable; visible dot/line grid
- M-8 Undo/redo stack (commit/undo/redo/snap patterns)
- M-9 Double-click rename via floating editor; properties panel (label, color, effects chips)
- M-10 Delete + duplicate selection
- M-11 Pan/zoom: cursor-anchored wheel zoom, fit (F), 100% reset, tweened transitions (tweenView)
- M-12 Examples menu with bundled demo diagrams

### I/O
- M-13 PNG export at 2x scale
- M-14 SVG vector export
- M-15 Animated GIF export, seamless ~1.6s loop (own LZW encoder + median-cut quantizer — no deps)
- M-16 Record mode: canvas + optional mic → WebM via MediaRecorder, format detection (detectRecFormats)
- M-17 JSON import/export (full fidelity round-trip)

### Presentation
- M-18 Journey mode: step builder, narration text per step, footstep nav, preview-from-step
- M-19 Present mode: chrome hidden, arrow/Space step advance, focus/tween to each step's target

### PlantUML bridge
- M-20 Import: paste/upload .puml (component/deployment subset) → editable nodes/edges/zones
- M-21 Import maps PlantUML stereotypes (database, node, cloud, actor…) to palette shapes
- M-22 Export: diagram → PlantUML component syntax; zones → packages, edges → labeled arrows

### Config ingestion
- M-23 Running-config parser: hostname, interface blocks, `description <peer>` → nodes + edges
- M-24 CMDB asset JSON/CSV ingest: asset list → nodes; grouping field → zones
- M-25 Ingest preview/diff before committing to canvas (confirm-apply flow)

## Nice to Have (v1.x)
- N-1 Orthogonal-edge effects chips parity (fxhalo pulse etc.)
- N-2 Mermaid import (stretch)
- N-3 CDP/LLDP table parsing when present in config dumps
- N-4 Diagram diff: two JSONs → highlighted changes

## Out of Scope
- Multi-user collaboration, backend services, live network discovery/scanning, mobile-native apps

## User Stories

- As a network engineer, I paste a .puml sketch and get an editable styled diagram so I don't redraw topology by hand.
- As an OT-ICS engineer, I drop firewall/router running-configs and get an auto-built topology to verify segmentation.
- As the CMDB owner, I export CMDB assets to JSON and visualize the estate without manual diagramming.
- As a presenter, I build a journey walkthrough and record it with narration for incident reviews.

## Acceptance Criteria

- AC-1 Side-by-side feature checklist vs original: every Feature Inventory item demonstrably works
- AC-2 JSON round-trip: save → clear → open → identical model (deep-equal)
- AC-3 .puml → diagram → .puml round-trip preserves nodes, edges, zone containment, labels
- AC-4 Sample Cisco-style running-config produces expected nodes/edges (fixture test)
- AC-5 App runs from file:// with zero console errors and zero network requests
- AC-6 GIF export produces a valid looping GIF from an animated-edge diagram
