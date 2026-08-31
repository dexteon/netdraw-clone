# Phase 5: Config Ingestion — Research

**Researched:** 2026-08-30
**Domain:** Client-side Cisco IOS running-config parser + CMDB JSON/CSV asset ingest with preview-confirm, in a zero-dependency single-file app
**Confidence:** HIGH for app-integration patterns (read from reference + PROJECT.md this session); MEDIUM-HIGH for IOS config grammar (standard running-config structure; verify fixture edge cases during implementation)

## Summary

Phase 5 adds two ingestion paths: (1) **running-config parser** — paste/upload a Cisco IOS-style config; extract hostname, interface blocks, and interface `description <peer-hostname>` heuristics to build a node per device + edges for described peer links; (2) **CMDB asset ingest** — JSON or CSV asset export → nodes with a grouping field → zones. Both apply through a **preview-confirm flow** (M-25): parsed result renders as a preview/diff before committing to the canvas. Fixture tests with a sample Cisco config and a CMDB export validate the parsers (AC-4).

**Primary recommendation:** Implement as a `/* ---- config ingestion ---- */` module: line-parser for running-configs (state machine over interface blocks), field-mapper for JSON/CSV assets, a shared preview-confirm modal, and a Node-runnable test harness (`test/` directory with fixture files + a small runner that extracts the parser functions from index.html and asserts expected nodes/edges).

## User Constraints

No CONTEXT.md exists for this phase. Binding constraints:

- **M-23** Running-config parser: hostname, interface blocks, `description <peer>` → nodes + edges
- **M-24** CMDB asset JSON/CSV ingest: asset list → nodes; grouping field → zones
- **M-25** Ingest preview/diff before committing to canvas (confirm-apply flow)
- **AC-4** Sample Cisco-style running-config produces expected nodes/edges (fixture test)
- **TS-1** Zero runtime dependencies, single-file app
- **TS-5** No network calls
- **CLEAN-ROOM** — original has no equivalent feature; this is a new capability
- Success criteria: fixture config → expected nodes/edges; CMDB JSON/CSV → nodes with zone grouping; preview shows before apply

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Running-config parse | `parseRunningConfig(text)` line state machine | — | hostname line; `interface <name>` opens block; `description <text>` within block; `shutdown` flag; `!` block separator |
| Peer heuristic | description-to-hostname matching | — | `description TO_CORE_SW1` → peer = normalized hostname `CORE_SW1` if it matches another parsed device's hostname (case-insensitive, strip `TO_`-style prefixes); else edge to a placeholder node or skip (document choice) |
| CMDB JSON ingest | `parseAssetsJSON(doc)` | field mapping | Accept array of objects; map common fields (name/hostname, type, ip, zone/site/branch) with a mapping UI or heuristics; grouping field → zones |
| CMDB CSV ingest | `parseAssetsCSV(text)` | RFC4180-ish splitter | Header row → field names; quoted-field aware; same downstream mapping |
| Type mapping | asset type → TYPES category | — | router/firewall/switch/server → matching palette types; unknown → generic node |
| Preview-confirm | modal listing parsed nodes/edges/zones counts + table | apply/merge choice | M-25: no canvas mutation until confirmed |
| Apply | replace or merge into state | commit() + renderAll() + zoomFit() | Merge dedupes by hostname/id |
| Fixture tests | `test/fixtures/*.cfg|json|csv` + `test/run-tests.js` (Node) | parser extraction | AC-4: deterministic assertions on parsed output |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none — vanilla JS parsers) | — | entire phase | TS-1 mandates zero dependencies |

### Supporting
| API | Purpose |
|-----|---------|
| `FileReader.readAsText` | .cfg/.json/.csv upload |
| `JSON.parse` | CMDB JSON |
| Node `fs` + `assert` (test harness only, not shipped) | fixture tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled CSV split | PapaParse | TS-1 zero-dep; a 25-line quoted-aware splitter suffices for CMDB exports |
| Node test harness extracting parsers from index.html | Browser-only manual testing | Extraction keeps single-file mandate while enabling `node test/run-tests.js` CI-style checks (pattern: parser written as pure functions in a clearly-delimited script section, harness reads index.html, evals that section) |
| Replace-on-apply | Merge-on-apply | Offer both (replace = new diagram; merge = add to current); merge dedupes by normalized hostname |

**Installation:** none. **Package Legitimacy Audit:** N/A.

## Architecture Patterns

### System Architecture Diagram

```
running-config text / CMDB JSON / CSV  (paste or file)
   ▼
parseRunningConfig / parseAssetsJSON / parseAssetsCSV   (pure functions)
   ▼
normalized ingest model: {devices: [{hostname, type, interfaces: [{name, description, shutdown}]}]}
                       | {assets: [{name, type, ip, group, ...fields}]}
   ▼
buildIngestPreview(model): counts + table + zone grouping preview
   ▼ (user confirms)
applyIngest(model, mode): → state fragment (nodes from devices/assets; edges from description heuristic; zones from group field)
   ▼
commit(); renderAll(); zoomFit(); toast
```

### Recommended Project Structure

```
index.html
└── <script> … prior sections …
    /* ---- config ingestion ---- */
    ├── parseRunningConfig(text) → {devices, links, warnings}   // pure
    ├── parseAssetsJSON(doc) / parseAssetsCSV(text) → {assets, warnings}  // pure
    ├── mapAssetType(type) → TYPES key
    ├── buildIngestNodes(parsed) → {nodes, edges, zones}        // pure (incl. layout grid)
    ├── preview modal (openIngestModal, renderPreview, confirm/cancel)
    └── apply wiring (replace | merge)
test/
├── fixtures/
│   ├── sample-cisco.cfg        // 3-4 devices, cross-referenced descriptions
│   ├── sample-cmdb.json        // assets with site/zone grouping
│   └── sample-cmdb.csv
└── run-tests.js                // Node: extract parser section from index.html, eval, assert fixtures
```

### Pattern 1: Pure parser functions (testable without DOM)
**What:** `parseRunningConfig`, `parseAssetsJSON`, `parseAssetsCSV`, `buildIngestNodes` are pure (text in → data out, no DOM, no state mutation). The test harness extracts the delimited parser section from index.html and runs fixtures through them. This is how a single-file app gets real tests without a build step.

### Pattern 2: Running-config state machine
**What:** Iterate lines: `hostname <name>` → device (one config = one device); `interface <name>` → current interface block (sub-interfaces `Gi0/1.10` noted); `description <text>` → attach to current interface; `shutdown` → flag; `!` → block end. `router bgp`/`access-list` etc. skipped silently. Output: device + interfaces; links derived from descriptions whose normalized token matches another device hostname.

### Pattern 3: Description peer heuristic (M-23)
**What:** Normalize description tokens: uppercase, split on whitespace/underscores, strip common prefixes (`TO`, `LINK`, `UPLINK`, `P2P`, `TO_`), then match against known hostnames (case-insensitive). Match → edge. No match → collect as warning (option: create placeholder node — decide in plan; recommend placeholder nodes OFF by default, listed as warnings).

### Pattern 4: CMDB field mapping
**JSON:** array of objects; look for keys among `name|hostname|asset_name`, `type|category|class`, `ip|address|mgmt_ip`, `site|zone|branch|location|group`. First-hit mapping with a preview table showing the mapping so the user can confirm. **CSV:** header row → same key matching. Grouping field value → zone label (zones created per distinct value; ZONE_COLORS assigned in order).

### Pattern 5: Preview-confirm modal (M-25)
**What:** Parse first, show modal: source type, device/asset count, link count, zone list, table (first N rows), warnings list, and Replace/Merge/Cancel buttons. Only on confirm does `applyIngest` touch `state` (then commit → undo-able).

### Anti-Patterns to Avoid
- **Mutating state before confirm** — M-25 violation.
- **Greedy hostname matching** — `TO_CORE` matching `CORE` AND `CORE2`; require exact normalized match.
- **Shipping test harness into the app** — keep test/ outside the shipped single file (or behind a `?test` flag that's never loaded by default).
- **Silent parse failures** — collect warnings; surface in preview.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rendering/layout | Custom | Phase 1 renderAll + grid layout | Same model |
| Modal CSS | New | existing modal styles (journey/examples modals) | Consistency |
| Download/upload plumbing | Custom | FileReader + download() | Standard |

## Validation Architecture

No formal VALIDATION.md required.

**Fixture-test validation (AC-4) — the concrete harness:**
- `test/fixtures/sample-cisco.cfg`: 3 devices (e.g. EDGE-R1, CORE-SW1, FW-INSIDE) with `description TO_<peer>` lines on 2-3 interfaces each, one interface with a non-matching description, one `shutdown` interface
- `test/run-tests.js`: extracts the parser section from index.html (regex the `/* ---- config ingestion ---- */` block), evals it in a bare context, then: assert devices.length === 3; assert hostnames; assert links include (EDGE-R1 ↔ CORE-SW1) etc.; assert non-matching description → warning not edge; assert shutdown interface flagged
- CMDB fixtures: assert node count, zone count/grouping, type mapping
- Run: `node test/run-tests.js` → exit 0 = pass; executed during Phase 6 audit too

## Key Findings

1. **Parsers as pure functions + section extraction is the test strategy.** AC-4's "fixture test" for a single-file app: write parsers DOM-free in a delimited script section; a Node harness extracts + evals that section and runs assertions. No build step, no shipped test code.

2. **The running-config surface needed is tiny:** `hostname`, `interface <name>` blocks, `description`, `shutdown`, `!` separators. Everything else (router bgp, vlans, acls) is skipped. The heuristic is description-token → known-hostname exact match after normalization (strip TO/LINK/UPLINK/P2P prefixes, case-insensitive).

3. **CMDB ingest is field-mapping + grouping, not parsing complexity.** Common key families (name/hostname; type/category; ip/address; site/zone/branch/group) with a preview table showing the inferred mapping. Group values → zones with ZONE_COLORS cycling.

4. **Preview-confirm is a hard gate (M-25), not a nicety.** Parse → modal (counts + table + warnings) → Replace/Merge/Cancel. Only confirm mutates state; commit() makes it undo-able.

5. **Placeholder nodes for unmatched peers: recommend OFF by default.** Creating a node for every unmatched description token clutters the canvas; listing them as warnings keeps the diagram truthful. The plan should record this default and note the alternative.
