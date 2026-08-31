# Phase 3: Presentation Modes - Research

**Researched:** 2026-08-30
**Domain:** Journey/narration authoring + presentation mode in a single-file SVG diagram editor (zero dependencies)
**Confidence:** HIGH (all findings read directly from `original-behavior-reference.js` and `.planning/*` this session)

## Summary

Phase 3 adds two features to the single-file editor built in Phases 1–2: (1) a **journey builder** — a modal where the author creates ordered steps, each with a narration caption, a set of canvas objects to reveal, and a focus-camera flag; and (2) **present mode** — a fullscreen playback state that hides editor chrome, dims/hides objects per step, tweens the camera onto each step's target, and advances via ArrowRight/Space (back via ArrowLeft, exit via Escape). The original implementation is ~170 lines of behavior-reference logic (journey model, applyStep/enterPresent/exitPresent, buildJourneyModal, startPick/endPick, presentation filter in renderAll) plus footnote rendering (footsteps on "sneakernet" edges, keyboard wiring, and CSS for `body.presenting`). All of it is vanilla DOM/SVG — no libraries needed. [VERIFIED: .planning/research/original-behavior-reference.js lines 541–870, 1067, 1571–1585]

The whole feature hangs off one piece of state: `state.journey = {steps: []}` where each step is `{note: "", show: [ids], highlight: [ids], focus: true}`. Because it lives in `state`, it serializes with the diagram (TS-4), round-trips through JSON save/open, participates in the existing undo/redo `commit()` stack, and needs a migration guard on load (`if(!state.journey || !Array.isArray(state.journey.steps)) state.journey = {steps:[]}`) for pre-journey saves. [VERIFIED: original-behavior-reference.js lines 794–798, 1992–1994, 2154]

**Primary recommendation:** Implement journey/present as one cohesive module section in index.html following the original's decomposition exactly (behavioral parity, clean-room rewrite): journey state + serialization guard → step application (`applyStep`) with reveal-cumulative visibility and highlight dimming wired into `renderAll` via an `elemState` filter → camera focus (`boundsOf` + `tweenView`, already present from M-11) → present enter/exit with `body.presenting` class + presentBar → journey modal with per-step cards, reorder, preview-from-step → canvas object-picking mode. Footsteps ("sneakernet" edge style with animated footprint walk) are an edge-rendering concern that interacts with present mode only via `dimGroup` stripping `.footwrap`.

## User Constraints

No CONTEXT.md exists for this phase (design decisions come from PROJECT.md / REQUIREMENTS.md). Binding constraints:

- **M-18** Journey mode: step builder, narration text per step, footstep nav, preview-from-step [VERIFIED: REQUIREMENTS.md]
- **M-19** Present mode: chrome hidden, arrow/Space step advance, focus/tween to each step's target [VERIFIED: REQUIREMENTS.md]
- **TS-1** Single-file HTML, zero runtime dependencies — no libraries may be introduced [VERIFIED: REQUIREMENTS.md]
- **TS-4** Journey model must persist in diagram JSON round-trip [VERIFIED: REQUIREMENTS.md]
- **CLEAN-ROOM**: no code copying from original-behavior-reference.js; it is study-only. Reimplement behavior from understanding. [VERIFIED: task context / PROJECT.md]
- Success criteria: (1) journey with steps + per-step narration can be built and previewed from any step; (2) present mode hides chrome, advances via arrow/Space, tweened focus per step. [VERIFIED: ROADMAP.md Phase 3]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Journey state (`state.journey.steps`) | diagram model (state) | — | Must serialize/undo with the diagram (TS-4); no separate store |
| Step reveal/dim/highlight filtering | render pipeline (`elemState` hook in `renderAll`) | — | Presentation is a *filter over rendering*, not a copy of the model |
| Camera focus per step | view/tween layer (`boundsOf` + `focusOnBounds` + `tweenView`) | Phase 1 M-11 pan/zoom | tweenView already exists from M-11; reuse, don't rebuild |
| Journey authoring UI | modal overlay (journey modal) | canvas picking mode | Cards in modal; object selection happens on canvas via pick mode |
| Present chrome hiding | CSS (`body.presenting` class) | — | One class toggle hides palette/hintbar/props via CSS rules |
| Keyboard advance | global keydown handler | — | Present/picking get first-priority branches before tool shortcuts |
| Footstep animation | edge renderer (sneakernet style) | 33ms setInterval driver | Independent of journeys except `dimGroup` strips it on dimmed edges |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none — vanilla DOM/SVG) | — | entire phase | TS-1 mandates zero runtime dependencies [VERIFIED: REQUIREMENTS.md TS-1] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| requestAnimationFrame | built-in | tween camera (tweenView) | already present from M-11 |
| performance.now() | built-in | tween timing + footstep gait phase | |
| setInterval 33ms | built-in | footstep walk driver (not rAF — keeps walking when tab unfocused, matters for Phase 2 recording) | sneakernet edges only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS class `body.presenting` | JS style toggles per element | class is one toggle; styles stay in the token CSS block |
| Full re-render per step (`renderAll`) | incremental show/hide | full re-render is simpler and the diagram scale (hundreds of nodes) makes it fine; original does this |
| reveal-cumulative (shown-so-far) visibility | per-step absolute visibility | cumulative matches narration semantics: earlier reveals stay visible [VERIFIED: ref line 743] |

**Installation:** none — no packages. **Package Legitimacy Audit:** N/A (zero external packages this phase).

## Architecture Patterns

### System Architecture Diagram (data flow)

```
state.journey.steps ──(authoring)── journey modal (cards: note/show/focus, reorder, del)
        │                                   │ "pick objects on canvas"
        │                                   ▼
        │                            pick mode (modal hidden, pickBar shown,
        │                             canvas selection captured → step.show/highlight)
        │
        ┼──(playback)── enterPresent(step) → present={step} + body.presenting
        │                     │
        │                     ▼
        │              applyStep(k): shownSoFar/pjHidden/pjOn sets
        │                     │       + caption/counter/prev-next buttons
        │                     ├──► renderAll() consults elemState(id)
        │                     │        → "hidden" (skip) / "dim" (opacity .13,
        │                     │          strip footwrap+anim) / "on"
        │                     └──► focusOnBounds(boundsOf(hl ∪ shownSoFar))
        │                              → tweenView(tx,ty,k, 620ms) or snap
        │
        └──(persist) serialize() → JSON (undo stack + save/open + localStorage)
                        load: migrate missing journey → {steps:[]}
keyboard: present → →/Space next, ← prev, Esc exit | picking → Enter apply, Esc cancel
```

### Recommended Project Structure (within single index.html)

```
index.html
├── <style>   … + .presenting rules, journey modal styles, presentBar/pickBar styles
├── <body>    … + #journey modal, #presentBar (caption/counter/prev/next/exit), #pickBar
└── <script>
    ├── journey state helpers (jSteps, load-migration guard)
    ├── presentation filter (present flag, elemState, dimGroup, renderAll hook)
    ├── step application (boundsOf, focusOnBounds, applyStep, pjNext/pjPrev)
    ├── present lifecycle (enterPresent, exitPresent)
    ├── authoring (toggleJourney, addStep, buildJourneyModal, startPick, endPick)
    ├── footsteps (buildFootsteps, sneakStep, ensureSneak — sneakernet edge style)
    └── keyboard wiring (present + picking branches first)
```

### Pattern 1: Presentation as a render filter, not a mode copy
**What:** while presenting, keep the single `state` untouched; hold three Sets (`hidden`, `on`, `hasHighlight`) and have `renderAll` ask `elemState(id)` for every node/edge/zone: `"hidden"` → skip, `"dim"` → render then set opacity .13 + pointer-events none + strip footstep/anim decoration, `"on"` → normal. An edge is hidden if either endpoint node is hidden.
**When to use:** always in this phase — it guarantees exitPresent is just "clear sets + renderAll".
**Example (shape, clean-room — do not copy):**
```javascript
// behavior reference lines 671–701 (paraphrased)
function elemState(id){
  if(!present) return "on";
  if(hiddenSet.has(id)) return "hidden";
  return onSet.has(id) ? "on" : (anyHighlight ? "dim" : "on");
}
```

### Pattern 2: Reveal-cumulative step semantics
**What:** `everShown` = union of all steps' `show` arrays; `shownSoFar` = union of steps 0..k. Hidden = everShown − shownSoFar. Objects never referenced by any step stay visible the whole time.
**When to use:** applyStep — this is what makes narration "build up" a picture. Highlight of the current step drives `onSet` (+ edges between two highlighted nodes are "on" too).

### Pattern 3: Focus target priority
**What:** if step.focus !== false: bounds = highlight set if non-empty, else shownSoFar, else all non-hidden nodes; then fit to bounds with ~80px padding, zoom clamped ~[0.2, 1.8], animated 620ms ease-in-out-quad; on enterPresent apply without animation.

### Pattern 4: Canvas object picking for authoring
**What:** "pick objects" hides the modal, forces select tool, seeds selection with the step's current show set, shows a pickBar ("click, shift-click or marquee"), blocks Delete/Backspace, Enter applies (selection → `show` AND `highlight`), Esc cancels; then reopens modal and rebuilds it.

### Pattern 5: Footstep walk (sneakernet edge style)
**What:** for edges with `style:"sneakernet"`, render a footstep trail: sample the cubic bezier into a 24-segment arc-length LUT, place K=clamp(len/46, 3, 14) footprint glyphs per direction in two lanes (±5px perpendicular offset, direction +1/−1), each footprint an ellipse-pair silhouette (ball+toes front, heel back) rotated to the local travel bearing, advanced along the arc-length by time (33ms setInterval over all `.footsteps` groups). LUT cache keyed by geometry string, capped ~400 entries.

### Anti-Patterns to Avoid
- **Copying reference code verbatim** — clean-room mandate; reimplement from the behavior described here.
- **Duplicating the diagram for present mode** — filter the one render pipeline instead.
- **Using rAF for footsteps** — tab-unfocused stalls break Phase 2 recording; reference deliberately uses setInterval.
- **Separate journey store outside `state`** — breaks TS-4 round-trip and undo.
- **Editing while presenting** — pointer handlers must early-return when `present` is set (pan/zoom stays allowed).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| camera tween | new animation system | Phase 1's `tweenView` (rAF + eased lerp, cancelable) | already required by M-11; single viewTween slot, cancel on new tween/exit |
| fit-to-bounds math | bespoke | `focusOnBounds` pattern (pad 80, clamp k 0.2–1.8) | derived from Phase 1 fit (F) logic |
| undo integration | special journey history | existing `commit()` snapshot stack | journey edits are just state mutations |
| serialization | custom journey format | `state.journey` rides existing JSON save/open | TS-4 |
