# Phase 4: PlantUML Bridge — Research

**Researched:** 2026-08-30
**Domain:** Hand-rolled PlantUML component/deployment-subset parser + serializer in a zero-dependency single-file app
**Confidence:** HIGH for app-integration patterns (read from reference + PROJECT.md this session); MEDIUM-HIGH for grammar specifics (from documented PlantUML component/deployment syntax knowledge — verify edge cases against https://plantuml.com/component-diagram and /deployment-diagram during implementation)

## Summary

Phase 4 adds a bidirectional PlantUML bridge: **import** parses a `.puml` subset (component + deployment diagrams) into the editor model (nodes, edges, zones), and **export** serializes the current diagram back to PlantUML component syntax. The parser is a hand-rolled recursive-descent line-parser (no grammar generator, no external library) because TS-1 mandates zero runtime dependencies. Import UI: modal with a paste textarea + file upload; export via menu. Round-trip fidelity (AC-3): `.puml → diagram → .puml` preserves nodes, edges, zone containment, labels.

**Primary recommendation:** Implement as a `/* ---- PlantUML bridge ---- */` module section: a line-oriented tokenizer/normalizer → statement parser (element declarations, package/zone blocks with brace nesting, arrows) → model builder (maps to state.nodes/edges/zones with an auto-layout for imported diagrams) → export serializer (walk state, emit component syntax) → modal UI wiring. Import replaces current canvas content after a preview/confirm (consistent with Phase 5's preview-confirm pattern).

## User Constraints

No CONTEXT.md exists for this phase. Binding constraints:

- **M-20** Import: paste/upload `.puml` (component/deployment subset) → editable nodes/edges/zones
- **M-21** Import maps PlantUML stereotypes (database, node, cloud, actor…) to palette shapes
- **M-22** Export: diagram → PlantUML component syntax; zones → packages, edges → labeled arrows
- **AC-3** `.puml` → diagram → `.puml` round-trip preserves nodes, edges, zone containment, labels
- **TS-1** Zero runtime dependencies — hand-rolled parser
- **CLEAN-ROOM** — no code copying (the plantuml-url-decode skill decodes URLs; unrelated to parsing)
- Success criteria: paste/upload → editable nodes/edges/zones; stereotypes map to palette shapes; export → component syntax with packages + labeled arrows; round-trip preserves nodes/edges/zone-containment/labels

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tokenize/normalize | line splitter + trim + comment strip (`'` and ` /` comments) | — | PlantUML is line-oriented at statement level; inline `..>` arrows within a line still resolved |
| Element declarations | `actor/component/interface/node/database/queue/artifact/cloud/frame/folder/boundary/control/entity/storage/card/collections` + `<<stereotype>>` | TYPES catalog mapping | Each declaration → a node; stereotype refines shape mapping |
| Aliases & display names | `name "Display Label" <<st>>` / `alias : Label` forms | — | PlantUML allows `component "Auth Service" as auth <<webservice>>` |
| Grouping | `package Zonename { ... }` blocks (brace or `end package`) | zone model `{id,x,y,w,h,label,color}` | Nested packages → nested/contained zones; v1: flatten nested packages into sibling zones OR contain nodes only (document choice) |
| Connectors | `[a] --> [b]`, `a --> b : label`, `..>`, `->`, `-left->`, `-[hidden]->`, long arrows `-->-->` | edge model `{a,b,label,style}` | Direction/length modifiers parsed; `: label` suffix captured; hidden edges noted |
| Interface ports | `() "ifname"` / `interface` declarations | — | v1: render as small nodes or skip (document choice) |
| Layout | deterministic auto-layout for imported diagrams | grid/columns layout, zone packing | No position info in PlantUML text; assign positions: group by package → zone rects → nodes in grid within zone; edges as bezier per Phase 1 edgeGeom |
| Export serializer | walk state.zones→packages, state.nodes→declarations, state.edges→arrows | — | Emit stable, diffable component syntax |
| Import UI | modal: textarea + file input + Import button | preview-confirm | Apply replaces state after confirm; undo-able via commit() |
| Skinparam/directives | ignore gracefully (`skinparam`, `hide`, `remove`, `!include`, `title`, `caption`, `note ... `) | — | Robust subset: skip unknown lines with a collected-warnings list |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none — vanilla JS parser) | — | entire phase | TS-1 mandates zero dependencies |

### Supporting
| API | Purpose |
|-----|---------|
| `FileReader` | `.puml` file upload reading |
| Existing editor model + renderAll + commit | imported diagram becomes normal editable state |
| Existing toast/modal CSS | consistent UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled line parser | plantuml-py / node-plantuml / antlr grammar | All break TS-1 zero-dep single-file; the subset is small enough to hand-roll (the original net_draw proves hand-rolled parsing is the house style) |
| Replace-on-import | Merge-into-current | Replace (after preview) is simpler and matches Phase 5 confirm-apply; merge risks ID collisions |
| Component syntax export | Deployment syntax export | Component covers zones-as-packages + edges-as-labeled-arrows per M-22 |

**Installation:** none. **Package Legitimacy Audit:** N/A.

## Architecture Patterns

### System Architecture Diagram

```
.puml text (paste or file)
   │ normalize: split lines, strip comments (' and "" style), trim
   ▼
statement parser (recursive descent over lines, brace-depth tracker for package nesting)
   │  element decls ─► {alias, display, stereotype, kind} ─► TYPES mapping (stereotype→palette type)
   │  package blocks ─► zone tree (label, children)
   │  arrows ─► {fromAlias, toAlias, label, style: solid/dashed/hidden, direction}
   │  unknown/directives ─► skipped + warnings[]
   ▼
model builder
   │  zones sized/packed from contained node counts; nodes gridded inside zones (110px col step)
   │  edges: bezier per Phase 1 edgeGeom; hidden edges skipped from render (or styled dotted)
   │  state = {nodes, edges, zones}; commit(); renderAll(); zoomFit()
   ▼
editable diagram  ──(export)──► serializer:
     zones  → package Z { ... } blocks (nodes contained listed inside)
     nodes  → component "Label" as id <<stereotype>>
     edges  → id --> id2 : label
   ▼
.puml text (download or copy)
```

### Recommended Project Structure (module section within index.html)

```
<script> … prior sections …
    /* ---- PlantUML bridge ---- */
    ├── PUML: stereotype→TYPES map, keyword table, direction/arrow regexes
    ├── parser: pumlParse(text) → {zones, nodes, edges, warnings}
    │     ├── normalizeLines(text)
    │     ├── parseDeclaration(line, ctx)
    │     ├── parsePackageOpen/Close (brace + 'end package')
    │     └── parseArrow(line, symbols)
    ├── layout: pumlLayout(parsed) → positioned state fragment
    ├── serializer: pumlSerialize(state) → text
    ├── import UI: openPumlModal(), doPumlImport(text) with preview-confirm
    └── export: exportPuml() → download/copy + toast
```

### Pattern 1: Line-oriented recursive descent with brace-depth context
**What:** Track current package nesting via a stack. Each line: strip comment (`'` to EOL), trim; match arrow regex first (contains `-->`, `..>`, `->`, `-[hidden]->` etc. between two identifiers/bracketed names); else match element declaration (`keyword name ["display"] [as alias] [<<st>>]`); else match `package X {` / `}` / `end package`; else record as skipped-with-warning.
**When to use:** import path.

### Pattern 2: Stereotype → palette shape mapping (M-21)
**What:** Map PlantUML element keywords and stereotypes to editor TYPES: `database`→database type, `node`→server, `cloud`→cloud, `actor`→person/user, `queue`→queue-ish (map to a generic), `artifact`→document-ish, `boundary/control/entity`→flow shapes if the prototype catalog has them, else nearest category. Maintain a PUML_STEREOTYPE_MAP table; unknown stereotype → default node with the stereotype recorded in meta.
**Fallback:** unknown → generic `component` node, category External.

### Pattern 3: Deterministic auto-layout from package grouping
**What:** Imported diagrams have no coordinates. Layout: zones sized from node count (ceil(sqrt(n)) grid of NW×NH+spacing inside zone padding); zones laid in a row/wrap; unzoned nodes gridded below/beside. Deterministic (same input → same output) so round-trip testing is stable.

### Pattern 3b: Round-trip contract (AC-3)
**What:** Export must re-emit every node (label preserved), every edge (label preserved), zone containment (nodes inside a zone's package block). Import of that export must reproduce the same model sets. Test: import sample → export → import → compare node/edge/zone counts + labels + containment (deep-equal on normalized model).
**Note:** positions and colors are NOT required to round-trip (PlantUML has no position concept) — document this scope in the plan.

### Pattern 4: Export serializer walk order
**What:** For stable output: iterate zones in id order → emit `package <label> {`; inside, nodes with `inZone` containment; then unzoned nodes; then all edges `aliasA --> aliasB : label`. Alias = sanitized node id (alnum). Escape labels containing quotes/braces.

### Anti-Patterns to Avoid
- **Shipping a real grammar engine** — subset only; unknown lines are warnings, not errors.
- **Silent data loss on export** — every node/edge must appear in output; hidden edges exported as `-[hidden]->`.
- **Non-deterministic layout** — Math.random in layout breaks round-trip tests; use seeded/order-stable math.
- **Importing without confirm** — replaces the canvas; always preview-confirm.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Diagram rendering | Custom renderer | Phase 1 renderAll + TYPES | Import produces the same state model |
| File reading | Custom parser for upload | FileReader | Standard |
| Downloads | Custom | existing download() helper | Phase 2 already provides |

## Validation Architecture

No formal VALIDATION.md required.

**Informal validation for Phase 4:**
- Round-trip test: fixture .puml (packages, stereotypes, labeled arrows, hidden arrow) → import → export → import → deep-compare normalized models (nodes/edges/zones/labels/containment)
- Stereotype mapping spot-checks: database/node/cloud/actor render as the right palette shapes
- Unknown-line handling: feed a .puml with skinparam/title/notes → imports with warnings, no crash
- Import from file:// with zero network calls

## Key Findings

1. **The parser is the whole phase; rendering/layout is reuse.** Import produces `{nodes, edges, zones}` exactly like Phase 1's model — rendering, selection, undo, persistence all work for free. The new work is: statement parser (~150-200 lines), stereotype map (~30 lines), deterministic layout (~60 lines), serializer (~60 lines), modal UI (~50 lines).

2. **PlantUML subset grammar surface (component/deployment):** element keywords (actor, agent, artifact, boundary, card, circle, cloud, collections, component, control, database, entity, file, folder, frame, hexagon, interface, node, object, package, person, queue, rectangle, stack, storage, usecase), optional `"Display Name"`, optional `as alias`, optional `<<stereotype>>`; `package Name { }` grouping (braces or `end package`); connectors `-->`, `->`, `..>`, `.>`, directional `-left->`/`-right->`/`-up->`/`-down->`, `-[hidden]->`, long variants, optional `: label` suffix; comments `'` and `/'...'/`; directives to skip: skinparam, title, caption, note, `!include`, hide/remove, arrows with `[hidden]`. Verify against plantuml.com docs during implementation.

3. **No positions in PlantUML — layout is required and must be deterministic.** Group-by-package → zone packing → grid layout inside zones. Deterministic output makes the AC-3 round-trip test reliable.

4. **Round-trip scope: model-level, not pixel-level.** AC-3 requires nodes/edges/zone-containment/labels preserved. Positions and colors don't round-trip (no PlantUML representation) — the plan should state this explicitly so verification doesn't chase impossible fidelity.

5. **Hidden edges and interface ports are the two fuzzy corners.** Recommend v1: `-[hidden]->` imported as edges with a `hidden` style flag (rendered faint dotted, exported back as hidden); `interface`/`() ifname` declarations imported as small connector-ish nodes (or skipped with warning — decide in plan; connector shape exists in flow shapes).
