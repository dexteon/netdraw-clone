# Phase 6: Parity Audit & Polish — Research

**Researched:** 2026-08-30
**Domain:** Feature-parity audit methodology, round-trip/zero-network verification, and OSS repo publishing for a single-file web app
**Confidence:** HIGH (audit checklist derived from PROJECT.md Feature Inventory + reference artifacts this session; verification tooling per standard Playwright/CDP practice)

## Summary

Phase 6 is the closing audit: (1) **side-by-side feature audit** vs the original NetDraw (AC-1) — every Feature Inventory item demonstrably works; (2) **JSON round-trip test** (AC-2) — save → clear → open → deep-equal model; (3) **zero-network / zero-console-error check** (AC-5) — app runs from file:// with no requests and no errors; (4) **README with GIF** — OSS-style README embedding a demo GIF (produced by Phase 2's GIF export); (5) **GitHub repo push**. Also re-runs Phase 5's fixture tests (AC-4) and the PlantUML round-trip check (AC-3).

**Primary recommendation:** Produce an `AUDIT.md` artifact in the repo (checklist table: Feature / Requirement / How verified / Status) driving verification; implement a small Playwright (or CDP) script `test/audit.mjs` for the automatable checks (zero-network, zero-console-error, JSON round-trip, GIF validity signature); hand-verify the interactive UX items with a scripted manual pass; write README.md; push to GitHub.

## User Constraints

No CONTEXT.md exists for this phase. Binding constraints:

- **AC-1** Side-by-side feature checklist vs original: every Feature Inventory item demonstrably works
- **AC-2** JSON round-trip: save → clear → open → identical model (deep-equal)
- **AC-3** .puml round-trip preserves nodes, edges, zone containment, labels
- **AC-4** Sample Cisco-style running-config produces expected nodes/edges (fixture test)
- **AC-5** App runs from file:// with zero console errors and zero network requests
- **AC-6** GIF export produces a valid looping GIF from an animated-edge diagram
- **TS-5** No external network calls at runtime
- Success criteria: audit checklist complete; deep-equal round-trip; zero-network; README with GIF; repo pushed

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Feature audit checklist | `AUDIT.md` (repo root or docs/) | PROJECT.md Feature Inventory as source | AC-1 evidence artifact |
| Automated checks | `test/audit.mjs` (Playwright/CDP) | headless Chromium | AC-2/AC-5/AC-6 automatable; deterministic |
| JSON round-trip | audit script: load app → build sample → save → clear → open → deep-compare | in-app functions via page.evaluate | AC-2 |
| Zero-network | audit script: collect CDP Network events; assert none after load | also check `performance.getEntriesByType("resource")` | AC-5 |
| Zero-console-error | audit script: collect console messages; assert zero errors | — | AC-5 |
| GIF validity | audit script: export GIF via page interaction; check signature bytes `GIF89a` + NETSCAPE2.0 loop block presence | — | AC-6 |
| Fixture tests | Phase 5's `test/run-tests.js` re-run | — | AC-4 |
| PlantUML round-trip | scripted import/export/import comparison (page.evaluate) | — | AC-3 |
| README | README.md with embedded demo GIF (docs/demo.gif committed) | — | polish/publish |
| Repo push | git remote add + push (gh CLI if available) | — | publish |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Playwright | latest (devDependency only, NOT shipped in index.html) | headless audit automation | CDP-grade network/console capture; script lives in test/, app stays zero-dep |

### Supporting
| Tool | Purpose |
|------|---------|
| node test/run-tests.js | fixture tests (from Phase 5) |
| gh / git | repo publish |
| Phase 2 exportGIF | produces the demo GIF for README |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright audit script | Puppeteer | Either works; Playwright multi-browser; both are dev-only tooling (TS-1 applies to the shipped app, not the test harness) |
| Automated GIF byte check | Human eyeball | Automation catches truncated/corrupt files; human confirms visual loop |

**Installation:** `npm i -D playwright` in a throwaway or repo-root dev config (package.json marked private, devDependencies only — the app itself remains single-file zero-dep; document this in README).

## Architecture Patterns

### System Architecture Diagram

```
repo/
├── index.html            (the app — unchanged by this phase except bug fixes)
├── README.md             (new: overview, features, screenshots/GIF, usage, dev notes)
├── AUDIT.md              (new: AC-1 checklist with evidence links)
├── docs/demo.gif         (exported via app)
└── test/
    ├── run-tests.js      (Phase 5 fixture tests — re-run)
    ├── audit.mjs         (Playwright: AC-2/AC-5/AC-6 automation)
    └── fixtures/…        (from Phase 5)
```

### Pattern 1: AUDIT.md as the AC-1 evidence artifact
**What:** Table with columns: Feature | Requirement ID | How Verified | Status. Rows = every PROJECT.md Feature Inventory item (core editor tools, palette, nodes, edges, zones, swimlanes, undo/redo, I/O, presentation, PlantUML bridge, config ingestion). "How Verified" = automated script name or manual steps. Status = PASS/FAIL. All PASS → AC-1 done.

### Pattern 2: Playwright audit script (test/audit.mjs)
**What:** Launch headless Chromium → open `file:///…/index.html` → attach console + network (CDP) listeners before load → assert zero network requests (excluding the document itself) and zero console errors → page.evaluate round-trip: call the app's save/open functions (build sample state, serialize, clear, apply, deep-compare) → trigger GIF export on an animated-edge diagram → intercept download → verify GIF89a signature + NETSCAPE2.0 bytes → same pattern for .puml round-trip → print PASS/FAIL summary; exit code accordingly.

### Pattern 3: README structure (OSS network-tool repo)
**What:** Title + one-liner + demo GIF → Features (linked to AUDIT.md) → Quick Start (open index.html, or serve statically) → Usage (tools, keyboard map, export/import incl. PlantUML + config ingestion) → Development (test harness: node test/run-tests.js; playwright audit) → License (MIT) → Credits (inspired by NetDraw; clean-room implementation).

### Anti-Patterns to Avoid
- **Self-attested audits** — every checklist row needs evidence (script output or manual steps + screenshot).
- **Shipping test tooling into index.html** — keep audit/test files out of the single-file app.
- **Pushing before the audit passes** — the audit IS the phase; fix-then-re-audit is expected iteration.

## Don't Hand-Roll

| Problem | Don't Download | Use Instead | Why |
|---------|----------------|-------------|-----|
| Headless browser automation | custom CDP websocket client | Playwright API | Battle-tested |
| GIF signature check | full GIF decoder | magic-byte + NETSCAPE2.0 substring check | Sufficient for validity |

## Validation Architecture

No formal VALIDATION.md required.

**This phase IS validation.** Exit criteria: AUDIT.md all-PASS, audit.mjs exit 0, fixture tests exit 0, README renders GIF, `git push` succeeds.

## Key Findings

1. **The audit is automatable except the interactive UX feel.** AC-2/AC-5/AC-6 (and AC-3/AC-4 with scripting) are scriptable via Playwright + page.evaluate against the app's own functions. The remainder (tool feel, tween smoothness) is a scripted manual pass documented in AUDIT.md.

2. **Zero-network check needs CDP-level capture** — `performance.getEntriesByType("resource")` misses early/failed requests; CDP Network events (Playwright's `page.on('request')`) catch everything. Assert zero after initial load (excluding the document navigation itself).

3. **README GIF comes from the app itself** — dogfood Phase 2's exportGIF on a good demo diagram; commit as docs/demo.gif.

4. **Publishing is the last step, after the audit passes** — the repo (D:\DexProjects\netdraw-clone, own repo per CLAUDE.md rule) gets README/AUDIT/test/docs committed, then `gh repo create`/push. Keep package.json (if added for playwright devDep) marked private with a note that the app is zero-dep single-file.

5. **Re-run everything, don't trust earlier phases' claims.** Phase 6 re-executes Phase 5 fixture tests, the PlantUML round-trip, and the new audit script — fresh evidence for every AC.
