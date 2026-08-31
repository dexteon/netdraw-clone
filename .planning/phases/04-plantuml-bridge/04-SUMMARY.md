---
plan: 04-01..02
status: complete
---

# Phase 4: PlantUML Bridge — Summary

## What was built

**Plan 04-01 (import):**
- `PUML_STEREOTYPE_MAP` — 20 PlantUML keywords → TYPES keys (database→database, node→server, cloud→cloud, actor→person, queue→server, artifact→document, boundary/control/entity/usecase→process, card/collections/component→workstation, frame/folder→org, interface→connector, storage→nas, rectangle/stack→server); unmapped → workstation with `meta.pumlKind` preserved
- `normalizeLines` — CRLF split, block comments `/'…'/`, quote-aware `'` line-comment stripping via indexOf scan (no regex backtracking)
- `parseDeclaration` — longest-first keyword match, quoted display labels with escapes, `as alias`, `<<stereotype>>`, bare-word aliases
- `parseArrow` — single bounded regex: FROM [<] run [color] [dir] run [>] TO [: label]; handles `<-->` bidirectional, `-->`, `..>`, `.[#color].>`, `-[#B71C1C,thickness=4]->`, `[alias]` and `"quoted"` sides; dashed detection from dot runs
- `pumlParse` — brace-depth stack (MAX_PUML_DEPTH=64 → warning + flatten, no hang), package push/pop, skinparam/title/note/legend/!include noise skipped, dangling-edge endpoint resolution by alias then label; pure function, no state mutation, all-local variables (concurrency-safe)
- `pumlLayout` — deterministic sqrt-grid per zone (ceil(√n) cols, NW+20/NH+20 pitch), zone wrap at 1400px, unzoned grid below; alias→id/idx Maps; ids offset from existing state size (no collisions)
- `openPumlModal`/`doPumlImport` — paste textarea + .puml FileReader, Import button = confirm gate (disabled while applying), replace + commit() (undo recovers prior canvas) + renderAll + zoomFit

**Plan 04-02 (export):**
- `pumlSerialize` — @startuml envelope, zones→`package "label" as z_id {`, contained nodes→`component "label" as id <<stereotype>>`, unzoned after, edges→`-->`/`..>` with `: label`, double-quote escaping, insertion-order iteration (deterministic)
- `exportPuml` — download('diagram.puml', text/plain blob) + toast; wired in the Export menu
- `pumlRoundTrip` — AC-3 model-level checker (counts + label-set match, order-insensitive)

## Verification (real execution, node + vm harness)
- tests/test-puml.mjs (DOM-stubbed vm harness) against the real fixture `fixtures/AEP-SL-2026-01_attack-path.puml` (Teon's IEC 62443 attack-path diagram):
  - parse: 6 zones / 20 nodes / 28 edges; all 6 zone member counts correct (5/3/4/4/1/1); edge labels preserved (Po100, Po101-116…)
  - round-trip: pass=true (20/28/6 → 20/28/6)
- Plan acceptance cases: `package Foo { component Bar }` containment ✓; `database "DB" as db <<mysql>>` + `[web] --> [db] : reads` ✓; 100-deep nesting → depth-cap warning, no hang ✓
- Static gates: all 16 symbols present; no Math.random in pumlLayout/pumlSerialize

## Bugs the harness caught (fixed)
- TDZ boot crash: `sneakTimer` declared after renderAll→ensureSneakTimer ran (would have broken browser boot) — moved to core state block
- parseArrow capture-group indices off by one after regex rewrite
- pumlLayout used `aliasToId` before declaration after a patch reorder

## Security (threat model execution)
- T-04-01 ReDoS: mitigated — anchored alternations, no nested quantifiers, indexOf comment stripping; 151-line fixture parses in <10ms
- T-04-02 proto pollution: mitigated — pumlSanitizeAlias (alnum+_, numeric-prefix guard), nodes in arrays + Maps, never raw property keys
- T-04-03 infinite loop: mitigated — depth cap 64 with warning
- T-04-04 XSS: inherited — Phase 1 textContent discipline; creole tags stripped from labels at parse
- T-04-06 injection: quote-escaping + alias sanitization in serializer

## Deviations
- pumlRoundTrip label comparison is order-insensitive (set match) — pumlLayout's deterministic reordering changes node order between passes; AC-3 is model-level per plan scope
- Zone containment for serialization is geometric (inZone) — matches how Phase 1 renders containment
