# NetDraw Clone — Network Diagram Editor

## Overview

A full clean-room clone of NetDraw (https://mr-r3b00t.github.io/net_draw/) — a
single-file, zero-dependency network diagram editor — extended with two major
capabilities the original lacks: PlantUML import/export and machine-config
ingestion (network device configs / CMDB asset exports → auto-built topology).

Target users: Teon (network/OT-ICS engineering workflows, CMDB integration),
potentially open-sourced for the plantuml-url-decode / OT community.

## Goals

1. **Full feature parity** with the original NetDraw (see Feature Inventory below)
2. **PlantUML bridge**: import `.puml` → editable diagram; export diagram → `.puml`
3. **Config ingestion**: feed device configs / asset exports → auto-generated topology
4. **Clean-room implementation**: no code copied from the original; same UX quality bar
5. Integration path for MNOT-ICS CMDB (standalone first; CMDB embeds/links later)

## Feature Inventory (extracted from original's source — parity target)

### Core editor
- SVG canvas, pan/zoom (cursor-anchored wheel zoom, fit-to-content, 100% reset, tweened view animations)
- Tools: select/move (V), connect (C), zone (Z), lane (L), pan (H / Space+drag)
- Node palette: categorized shape library (network/security/compute/OT-ICS/external), drag-to-canvas with ghost
- Nodes: icon + label, color swatches, 4 drag-ports per node, hover port reveal
- Edges: port-to-port or click-click linking, orthogonal/curve routing (bezPoint/bezAngle), edge selection, animated dash-flow
- Zones: dashed rounded rect network segments, labels, nodes-in-zone containment
- Swimlanes: cross-functional lane rows, lane add/remove/rename, lane snapping
- Double-click rename (floating label editor), properties panel, delete/duplicate
- Snap-to-grid + lane snapping, toggleable grid
- Undo/redo (Ctrl+Z / Ctrl+Y) with commit history

### I/O
- Save/open diagram JSON (Ctrl+S), examples menu with bundled demo diagrams
- Export: PNG (2x), SVG vector, animated GIF (seamless ~1.6s loop — original ships its own LZW encoder + median-cut quantizer)
- Record mode: canvas + mic narration → video via MediaRecorder

### Presentation
- Journey mode: narration steps, guided walkthrough builder, footstep navigation
- Present mode: chrome hidden, keyboard-driven step advance (arrows/Space), focus transitions

### Styling (the design system — already replicated and validated in G:\Scratch\netdraw-replica\)
- Tokens: bg #0b1120, panel #0f1626, panel2 #131c30, border #1e2a44, border2 #2a3a5c,
  text #e2e8f0, muted #8b9bb4, faint #5b6b85, accent #38bdf8, card #161f31
- 13px system-ui base, 52px topbar, .tgroup control pills (10px radius), 212px palette,
  uppercase 10.5px section headers, pill hintbar, 12-14px radii on panels/modals

## New Capabilities (beyond parity)

### PlantUML bridge
- **Import**: paste or upload `.puml` → parse deployment/component/network diagrams →
  editable nodes/edges/zones. Map PlantUML elements to NetDraw shapes
  (e.g. `database` → database icon, `node` → server, `cloud` → cloud).
- **Export**: diagram → PlantUML text (component/deployment syntax), preserving
  zones as packages, edges as arrows with labels.

### Config ingestion
- Parse router/switch/firewall running-configs (interface descriptions, neighbor info)
  and CMDB-style asset exports (JSON/CSV) → auto-generate topology.
- Phase 1: interface-description heuristics (`description <peer-hostname>` convention).
- Later: CDP/LLDP neighbor tables if present in config dumps; CMDB field mapping.

## Requirements

### Validated

(None yet — ship to validate. Clean-room replica prototype at
G:\Scratch\netdraw-replica\replica.html validated the styling approach only.)

### Active

- [ ] Full core-editor parity: tools, palette, nodes, edges, zones, swimlanes, snap, undo/redo
- [ ] I/O parity: JSON save/open, PNG/SVG export, examples, GIF export, record mode
- [ ] Presentation parity: journey mode, present mode
- [ ] PlantUML import (paste/upload → editable diagram)
- [ ] PlantUML export (diagram → .puml text)
- [ ] Config ingestion v1 (running-config interface descriptions → topology)
- [ ] Asset export ingestion (JSON/CSV → topology)

### Out of Scope

- Real-time multi-user collaboration — single-user editor
- Server backend — remains a zero-dependency static app (parsing all client-side)
- Auto-discovery / live network scanning — configs are fed, not fetched

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Clean-room reimplementation, no code copying | License hygiene + we own the code | — Pending |
| Single-file zero-dependency architecture (like original) | Deploy anywhere incl. GAS/iframe embed in CMDB | — Pending |
| Own GIF encoder vs dependency | Original proves it's feasible in ~200 lines; keeps zero-dep | — Pending |
| PlantUML subset (component/deployment diagrams) first | Covers network topology use; full grammar is huge | — Pending |
| Standalone repo at D:\DexProjects\netdraw-clone | CLAUDE.md rule: non-client projects own repos | — Pending |

---
*Last updated: 2026-08-30 after initialization*
