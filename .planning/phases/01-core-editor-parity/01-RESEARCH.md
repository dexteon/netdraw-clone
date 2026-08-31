# Phase 1: Core Editor Parity — Research

**Researched:** 2026-08-30
**Domain:** Single-file SVG network diagram editor (zero dependencies, vanilla DOM/SVG)
**Confidence:** HIGH (all findings read directly from `original-behavior-reference.js`, `prototype-replica.html`, `PROJECT.md`, `REQUIREMENTS.md` this session)

## Summary

Phase 1 delivers the working single-file editor: visual identity/tokens, tools (V/C/Z/L/H), categorized palette with drag-to-canvas ghost, nodes with icon+label+color+hover-revealed ports, edges (port-drag + click-click, curved/orthogonal routing, selection, animated dash, label pill), zones (dashed rounded rects with labels, node containment), swimlanes (lane rows with add/remove/rename, lane snap), snap-to-grid, undo/redo (commit/snapshot stack), double-click rename, properties panel, pan/zoom (cursor-anchored wheel, fit, 100%, tweened), examples menu, and JSON save/open round-trip. The validated prototype (`prototype-replica.html`, 521 lines, own clean-room code) is the starting skeleton and styling reference.

**Primary recommendation:** Start from the prototype skeleton and build outward in the same decomposition the original uses: state → DOM refs → view transform → rendering (zones, edges, nodes) → palette → tools → pointer handling → wheel zoom → rename editor → props panel → keyboard → history/persistence → examples → boot. Each module is vanilla JS; no build step, no imports, no external packages.

## User Constraints

No CONTEXT.md exists for this phase. Binding constraints from REQUIREMENTS.md + PROJECT.md:

- **TS-1** Single-file HTML, zero runtime dependencies, runs from file:// and any static host
- **TS-2** NetDraw visual identity: token set (bg #0b1120, panel #0f1626, panel2 #131c30, border #1e2a44, border2 #2a3a5c, text #e2e8f0, muted #8b9bb4, faint #5b6b85, accent #38bdf8, card #161f31), 13px system-ui, tgroup pills (10px radius), 212px palette, pill hintbar, uppercase 10.5px section headers, 12-14px radii
- **TS-3** Keyboard-first: V/C/Z/L/H tools, Del, F fit, Ctrl+Z/Y, Ctrl+S, Space+drag pan
- **TS-4** JSON save/open round-trip preserves every element and property
- **TS-5** No external network calls at runtime
- **CLEAN-ROOM**: no code copying from `original-behavior-reference.js`; it is study-only. Reimplement from understanding. The prototype is own code and IS the starting skeleton.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Diagram state (`state = {nodes, edges, zones}`) | in-memory model | JSON serialization | Single source of truth; renderAll reads from it; commit snapshots serialize it |
| View transform (`view = {x, y, k}`) | SVG transform on worldG | grid pattern transform | Pan/zoom is a single matrix; toWorld/toScreen convert coordinates |
| Rendering | SVG layer rebuild (zones → edges → nodes) | — | Full re-render on every change; scale is hundreds of nodes, fine for SVG |
| Node geometry | `nodeW`/`nodeH` (card vs flow shapes) | — | Flow shapes use label-width sizing; cards are fixed NW=104 × NH=74 + meta lines |
| Edge geometry | `edgeGeom` (cubic bezier) | `anchor` (border clamp) | Bezier with 0.4 control-point offset; orthogonal mode adds right-angle routing |
| Port interaction | hover-revealed `.port` circles at N/E/S/W | port-drag → temp edge | 4 ports per node; hover reveals; drag starts edge; click-click uses node centers |
| Zones | dashed rect (10 7 dasharray, rx 16) | label pill at top-left | `inZone()` containment test; handles for resize |
| Swimlanes | `renderSwimlane` (horizontal or vertical) | `laneSnapPoint` | Lane title band (26px), lane head (22px), alternating row fill, lane centerline snap (LANE_SNAP=22px) |
| Undo/redo | snapshot stack (`serialize()` snapshots) | commit on mutation | Cap 120 undo entries; redoStack cleared on commit |
| Persistence | `serialize()` = `JSON.stringify(state)` | localStorage debounce + file save/open | Round-trip fidelity by serializing the whole state object |
| Examples | `EXAMPLES` array + `sampleState()` | menu toggle | Bundled demo diagrams |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none — vanilla DOM/SVG) | — | entire phase | TS-1 mandates zero runtime dependencies |

### Supporting
| API | Purpose | Notes |
|-----|---------|-------|
| `document.createElementNS(SVGNS, tag)` | SVG element creation | `el(tag, attrs)` helper |
| `svg.getBoundingClientRect()` | screen→world coordinate conversion | `toWorld(cx, cy)` |
| `requestAnimationFrame` | tweened view transitions (fit, 100% reset) | `tweenView(tx, ty, tk, ms)` |
| `setInterval` | sneakernet footstep animation (33ms) | Not rAF — keeps walking when tab unfocused (matters for Phase 2 recording) |
| `localStorage` | autosave debounce | `saveSoon()` with debounce; key `netdraw.doc.v1` |
| `FileReader` / `Blob` / `URL.createObjectURL` | JSON file save/open | download(name, blob) helper |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Full SVG re-render per change | Incremental DOM diffing | Simpler; original does full re-render; scale (hundreds of nodes) is fine |
| SVG for the canvas | HTML5 Canvas | SVG gives free hit-testing, CSS styling, vector export (Phase 2); Canvas would need manual hit-testing |
| JSON.stringify for serialization | Structured clone / custom serializer | JSON is human-readable, matches TS-4 round-trip, and state is plain data |

**Installation:** none — no packages. **Package Legitimacy Audit:** N/A (zero external packages this phase).

## Architecture Patterns

### System Architecture Diagram (data flow)

```
state = {nodes:[], edges:[], zones:[]}
  │
  ├── mutations (addNode, addEdge, deleteSelection, duplicateSelection, rename)
  │       └── commit() → undoStack.push(lastSnap); lastSnap = serialize(); redoStack = []
  │
  ├── renderAll() ── rebuilds SVG layers:
  │       zonesLayer  → renderZone(z) / renderSwimlane(z)
  │       edgesLayer  → renderEdge(e) [bezier geom + dash + arrows + label pill + sneakernet footsteps]
  │       nodesLayer  → renderNode(n) [card or flow shape + icon + label + meta lines + ports + badges]
  │       └── updateProps(); updateToolbar(); ensureSneak()
  │
  ├── view = {x, y, k}
  │       applyView() → worldG transform = translate(x,y) scale(k)
  │       toWorld(cx,cy) / toScreen(wx,wy) — coordinate conversion
  │       tweenView(tx,ty,tk,ms) — rAF-eased lerp for fit/100%
  │
  ├── persistence
  │       serialize() = JSON.stringify(state)
  │       saveSoon() → localStorage debounce
  │       exportJSON() / importJSON(file) → Blob download / FileReader
  │
  └── interaction
          palette drag → ghost → drop → addNode(type, x, y)
          tool select/move (V): drag nodes; marquee select
          connect (C): port-drag → temp edge → drop on target; or click-click
          zone (Z): drag rect → addZone
          lane (L): drag rect → addZone(kind:swimlane)
          pan (H / Space+drag): adjust view.x/view.y
          wheel: cursor-anchored zoom (adjust view.k)
          double-click: openEditor (rename node/edge/zone)
          keyboard: V/C/Z/L/H tools, Del, F fit, Ctrl+Z/Y, Ctrl+S
```

### Recommended Project Structure (single index.html)

```
index.html
├── <head>
│   └── <style>  … all CSS (tokens + layout + component styles + grid pattern)
├── <body>
│   ├── #topbar (52px: logo, tool pills, zoom %, examples, save/open, export menu)
│   ├── #palette (212px: categorized shape groups with drag-on items)
│   ├── #hintbar (pill: context-sensitive tool hints)
│   ├── #canvas (SVG: defs, grid pattern, worldG > zones/edges/nodes/temp/ui layers)
│   ├── #props (properties panel: label, color swatches, effects chips)
│   ├── #labelEditor (floating rename input)
│   ├── #dragGhost (palette drag preview)
│   └── #examplesMenu (dropdown)
└── <script>
    ├── constants (NW, NH, GRID, SNAP, LS_KEY, SVGNS, TOKENS via CSS vars)
    ├── ICONS + TYPES + PALETTE_GROUPS + SWATCHES + ZONE_COLORS catalogs
    ├── state + view + tool + selection + undoStack/redoStack
    ├── DOM refs ($, svg, worldG, layers, propsEl, labelEditor, ghost)
    ├── helpers (el, uid, clamp, esc, nodeById, edgeById, zoneById, accentOf, snap, inZone)
    ├── lane snap (laneSnapPoint)
    ├── node sizing (nodeW, nodeH, metaLines)
    ├── view transform (applyView, toWorld, toScreen, tweenView, zoomFit, zoomBy)
    ├── rendering (renderNode, renderEdge, renderZone, renderSwimlane, renderAll, elemState, dimGroup)
    ├── edge geometry (anchor, edgeGeom, dashFor)
    ├── sneakernet footsteps (bezPoint, bezAngle, getLUT, distToU, sneakStep, buildFootsteps, ensureSneak)
    ├── history (serialize, commit, undo, redo, saveSoon)
    ├── mutations (addNode, addEdge, deleteSelection, duplicateSelection)
    ├── palette (buildPalette, startPaletteDrag)
    ├── tools (setTool)
    ├── temp edge / marquee (clearTemp, drawTempEdge, markLinkTarget, nodeUnderPointer)
    ├── canvas pointer handling (pointerdown/move/up, isDoubleClick, drag logic)
    ├── wheel zoom (cursor-anchored)
    ├── rename editor (openEditor, commitEditor, hideEditor)
    ├── properties panel (updateProps, color swatches, effects chips)
    ├── keyboard handler
    ├── export stubs (download, toast — Phase 2 fills in PNG/SVG/GIF/video)
    ├── JSON save/open (exportJSON, importJSON, applyLoadedDoc)
    ├── examples (EXAMPLES, sampleState, buildExamplesMenu)
    ├── toolbar wiring
    └── boot()
```

### Pattern 1: State as single source of truth, renderAll as full rebuild
**What:** `state = {nodes, edges, zones}` is the only model. Every mutation calls `commit()` then `renderAll()`. `renderAll()` clears the three SVG layers and rebuilds them by iterating state arrays. No incremental updates, no virtual DOM, no diffing.
**When to use:** always in this phase — it's the original's pattern and the scale (hundreds of nodes) makes full SVG rebuild fast enough.
**Why:** eliminates entire classes of sync bugs; undo/redo is free (snapshot the serialized state); persistence is free (serialize the state).

### Pattern 2: Port-drag and click-click edge creation
**What:** In connect mode (C), hovering a node reveals 4 port circles (N/E/S/W at the card border). Port-drag: pointerdown on a port → draw a temp bezier to the cursor → pointerup on a target node → `addEdge(source, target)`. Click-click: pointerdown on a node (no port) → `pendingFrom = node` → pointerdown on a second node → `addEdge(pendingFrom, target)`. The temp edge is drawn in `tempLayer` and cleared on completion.
**Key detail:** `anchor(n, toward)` clamps the endpoint to the node's border (intersection of the ray toward the other node with the node's bounding box + 5px padding). `edgeGeom(a, b)` computes a cubic bezier with control points offset 40% along the dominant axis — horizontal edges get horizontal control points, vertical edges get vertical ones.

### Pattern 3: Lane snapping
**What:** `laneSnapPoint(x, y)` checks if the point is inside a swimlane zone. If so, it computes the nearest lane centerline (horizontal swimlanes snap Y, vertical snap X). If within `LANE_SNAP=22px`, it returns the snapped coordinate plus a lane rect for drag highlighting. Snap is gated by `snapOn`.
**When to use:** during node drag when `snapOn` is true and the node is over a swimlane.

### Pattern 4: Undo/redo via serialize snapshots
**What:** `commit()` pushes `lastSnap` (the previous serialized state) onto `undoStack`, caps the stack at 120, clears `redoStack`, sets `lastSnap = serialize()`, and calls `saveSoon()`. `undo()` pops from `undoStack` to `redoStack` and restores `lastSnap`. `redo()` reverses.
**Why this works:** `serialize() = JSON.stringify(state)` captures the entire model. Restoration is `state = JSON.parse(snap); renderAll()`. No need for command objects or incremental undo — the state is small enough.

### Pattern 5: Cursor-anchored wheel zoom
**What:** Wheel zoom adjusts `view.k` (zoom factor) while keeping the world coordinate under the cursor stationary. Formula: compute the world point under the cursor before zoom (`toWorld(cx, cy)`), adjust `view.k` by the wheel delta, then adjust `view.x`/`view.y` so that the same world point maps to the same screen coordinate after the zoom. `applyView()` applies the transform to `worldG` and the grid pattern.

### Pattern 6: Properties panel
**What:** `updateProps()` renders a panel showing the selected element's properties: label (editable text), color swatches (11 SWATCHES), effects chips (from EFFECTS catalog), and type-specific fields (from TYPES[type].fields). Changes mutate the state and call `commit()` + `renderAll()`. No selection → panel shows diagram-level info or is empty.

### Pattern 7: Examples menu
**What:** `EXAMPLES` is an array of `{name, build()}` functions that return a state object. `sampleState()` builds a demo diagram with assorted nodes, edges, a zone, and a swimlane. `buildExamplesMenu()` renders buttons; clicking one calls `build()` → `state = result; commit(); renderAll()`.

### Anti-Patterns to Avoid
- **Copying reference code verbatim** — clean-room mandate; reimplement from the behavior described here.
- **Separate canvas library** — TS-1 mandates zero dependencies; vanilla SVG is sufficient.
- **Incremental DOM updates** — full re-render is simpler and fast enough at this scale.
- **Command-pattern undo** — snapshot serialization is simpler and sufficient.
- **External icon fonts/CDNs** — TS-5 prohibits network calls; icons are inline SVG path strings in the ICONS catalog.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coordinate conversion | Manual matrix math | `toWorld`/`toScreen` helpers | Simple affine: `(cx - view.x) / view.k` |
| SVG element creation | Verbose createElementNS calls | `el(tag, attrs)` helper | One-liner; already in prototype |
| Bezier control points | Custom curve algorithm | `edgeGeom` 0.4-offset pattern | Standard cubic bezier; original's approach is clean |
| Lane centerline | Per-frame geometry | `laneSnapPoint` function | Called once per drag-move; returns snapped point + lane rect |
| Autosave debounce | setTimeout chain | `saveSoon()` pattern | Debounced localStorage write; already in prototype |

## Validation Architecture

No formal VALIDATION.md required (nyquist_validation_enabled is false in config).

**Informal validation approach for Phase 1:**
- Open index.html from file:// → check zero console errors, zero network requests (DevTools Network tab)
- Create a diagram with nodes, edges, zones, swimlanes → Save JSON → Clear → Open JSON → compare models
- Test each tool (V/C/Z/L/H), undo/redo, snap, pan/zoom, fit, rename, props panel
- Verify localStorage autosave persists across page reloads

## Key Findings

1. **The prototype is the skeleton.** `prototype-replica.html` (521 lines) already has the TYPES catalog (cloud, plc, workstation, router, firewall, server, database, etc. categorized into Network/Security/Compute/OT ICS/External), the token CSS, the SVG canvas structure, and basic rendering. Phase 1 extends it to full parity — it does not start from zero.

2. **Node rendering has two paths: card and flow shape.** Cards (network devices) are fixed-size NW=104 × NH=74 with icon + label + meta lines + 4 ports. Flow shapes (terminator, process, decision, data, document, etc.) are label-width-sized with centered text and no meta lines. The TYPES catalog's `.shape` field selects which path; `.cat` selects the palette category.

3. **Edge geometry is a single cubic bezier per edge**, not a path of segments. `edgeGeom(a, b)` computes control points at 40% offset along the dominant axis. The orthogonal mode (M-4) adds right-angle routing — this is the main edge-routing work item. Dash styles: solid, dashed (8 6), dotted (2 5), sneakernet (1 9), animated (6 8). Arrow markers via SVG `<marker>`.

4. **Swimlanes are zones with `kind:"swimlane"`.** They share the zone data model (`{id, x, y, w, h, label, color}`) but add `lanes` (array of names) and `orient` ("h" or "v"). `renderSwimlane` draws a title band, lane headers (22px), alternating row fills, and lane dividers. Lane snap pulls the cross-axis coordinate onto the nearest centerline within 22px.

5. **Persistence is trivial because state is plain JSON.** `serialize() = JSON.stringify(state)` captures everything. Round-trip fidelity (TS-4) is automatic as long as every element is a plain object with no function references or DOM nodes. The `applyLoadedDoc(doc)` function validates the shape and calls `renderAll()`. The migration guard pattern (`if(!state.journey) state.journey = {steps:[]}`) from Phase 3 shows how later phases handle backward compatibility.

## Requirements Coverage

| REQ-ID | How Phase 1 Addresses It |
|--------|--------------------------|
| TS-1 | Single index.html, no external scripts/styles/fonts; runs from file:// |
| TS-2 | Token CSS variables in :root; 13px system-ui; tgroup pills; 212px palette; hintbar — all in prototype |
| TS-3 | Keyboard handler: V/C/Z/L/H → setTool; Del → deleteSelection; F → zoomFit; Ctrl+Z/Y → undo/redo; Ctrl+S → exportJSON; Space → pan mode |
| TS-4 | serialize()/JSON.stringify(state) round-trip; exportJSON/importJSON file save/open |
| TS-5 | No fetch/XHR/WebSocket/script src/href to external URLs; all icons inline SVG |
| M-1 | PALETTE_GROUPS + buildPalette + startPaletteDrag with ghost preview |
| M-2 | renderNode: icon (ICONS catalog), label, color (SWATCHES/accentOf), 4 hover-revealed ports |
| M-3 | connect mode: port-drag + click-click; renderEdge selection/highlight; dashFor animated dash |
| M-4 | edgeGeom curved (bezier 0.4 offset) + orthogonal mode (right-angle routing) |
| M-5 | renderZone: dashed rect (10 7), rx 16, label pill; inZone() containment |
| M-6 | renderSwimlane: lane rows, add/remove/rename via props; laneSnapPoint centerline snap |
| M-7 | snap() function gated by snapOn; grid pattern (GRID=26, SNAP=13); toggleable |
| M-8 | commit/undo/redo with serialize snapshots; cap 120 |
| M-9 | openEditor/commitEditor: floating label editor on double-click; updateProps panel |
| M-10 | deleteSelection (Del key); duplicateSelection |
| M-11 | applyView/toWorld/toScreen; wheel zoom (cursor-anchored); zoomFit (F); zoomBy; tweenView |
| M-12 | EXAMPLES array + sampleState + buildExamplesMenu |
| M-17 | exportJSON (Blob download) / importJSON (FileReader) — full fidelity round-trip |