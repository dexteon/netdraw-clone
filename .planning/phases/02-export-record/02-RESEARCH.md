# Phase 2: Export & Record — Research

**Researched:** 2026-08-30
**Domain:** Client-side export pipeline (SVG/PNG/GIF) + MediaRecorder video capture in a zero-dependency single-file app
**Confidence:** HIGH (all findings read directly from `original-behavior-reference.js` lines 1611–1983, `PROJECT.md`, `REQUIREMENTS.md` this session)

## Summary

Phase 2 adds four export paths plus toast feedback, all client-side and dependency-free: (1) **SVG vector export** — clone the three diagram layers, strip editor-only UI (ports, zone handles), wrap in a standalone `<svg>` sized to `contentBounds()` + 70px padding with dark bg; (2) **PNG 2×** — rasterize that same SVG via `Blob → Image → canvas.drawImage` at scale 2; (3) **animated GIF** — 20 frames × 80ms = seamless 1.6s loop, frames rendered by baking CSS animation state (halo opacity, dash offset, footstep position) into the SVG at time t, quantized with a hand-rolled median-cut to 256 colors, LZW-encoded with a hand-rolled GIF-flavored LZW (GIF89a + NETSCAPE2.0 loop-forever extension); (4) **video recording** — an offscreen canvas at viewport size × min(1.5, devicePixelRatio) is pumped at 33ms via `buildLiveFrameSVG` (viewport-true: current pan/zoom, grid, selection, temp edges), captured with `canvas.captureStream(30)`, optionally mixed with mic audio (`getUserMedia`) or a music file (AudioContext → MediaStreamDestination), encoded by MediaRecorder with runtime format detection (VP9/VP8 WebM → H.264/AV1 MP4 fallback chain).

**Primary recommendation:** Implement as one export module section appended to index.html, following the original's decomposition: `download`/`toast` helpers → SVG builders (`cloneLayerMarkup`, `buildDiagramSVG`, `buildExportSVG`, `buildLiveFrameSVG`) → `svgToImage` → `exportSVG`/`exportPNG` → GIF encoder (`medianCut`, `gifLZW`, `gifAssemble`, `exportGIF`) → recording (`REC_FORMATS`, `detectRecFormats`, `populateRecFormats`, `startRecording`, `stopRecording`). The editor's layered SVG architecture from Phase 1 is what makes all of this work — export is "serialize the SVG layers with animation state baked in."

## User Constraints

No CONTEXT.md exists for this phase. Binding constraints from REQUIREMENTS.md + PROJECT.md:

- **M-13** PNG export at 2x scale
- **M-14** SVG vector export
- **M-15** Animated GIF export, seamless ~1.6s loop (own LZW encoder + median-cut quantizer — no deps)
- **M-16** Record mode: canvas + optional mic → WebM via MediaRecorder, format detection (`detectRecFormats`)
- **TS-1** Single-file HTML, zero runtime dependencies — no libraries may be introduced
- **TS-5** No external network calls at runtime
- **CLEAN-ROOM**: no code copying from `original-behavior-reference.js`; study-only reference
- Success criteria: PNG at 2x, valid SVG, valid seamless ~1.6s looping GIF from an animated-edge diagram, record captures canvas + optional mic with format detection and toast feedback

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SVG serialization | `cloneLayerMarkup(layer, t)` | `buildDiagramSVG(t)` / `buildLiveFrameSVG(...)` | Clone → strip editor UI → bake animation state at time t → `outerHTML` |
| Content bounds | Phase 1's `contentBounds()` | — | Export SVG is sized to diagram bounds + 70px pad |
| Rasterization | `svgToImage(svgStr)` | canvas 2d `drawImage` | SVG string → Blob URL → Image → canvas |
| PNG | `exportPNG` | `buildExportSVG` + canvas scale 2 | Draw at 2× via `ctx.scale(2,2)`, then `canvas.toBlob` |
| GIF palette | `medianCut(samples, 256)` | sampled from frames 0 and 10, every 28th pixel | Hand-rolled median-cut; no deps |
| GIF encoding | `gifLZW(8, pixels)` + `gifAssemble(W,H,palette,indexFrames,delayCS)` | `exportGIF` driver | GIF89a header, NETSCAPE2.0 loop-forever, GCE disposal=0x04 (keep previous), 255-byte data sub-blocks |
| Animation baking | `cloneLayerMarkup(layer, t)` | `sneakStep` / dashoffset / halo opacity formulas | CSS animations become SVG attributes at time t so rasterized frames animate |
| Video capture | offscreen canvas + `captureStream(30)` + MediaRecorder | `buildLiveFrameSVG(cssW,cssH,physW,physH,t)` pump at 33ms | Viewport-true recording incl. pan/zoom/grid/selection |
| Audio mixing | `getUserMedia({audio:true})` or AudioContext + MediaStreamDestination | track list concat | Mic or music file; graceful degradation on failure |
| Format detection | `detectRecFormats()` over `REC_FORMATS` | `MediaRecorder.isTypeSupported` | VP9 → VP8 → H.264 → AV1; av (with audio codec) vs v (video-only) mime variants |
| UX feedback | `toast(msg)` | `gifBusy` re-entry guard, button disable | Progress toasts per GIF frame; recording timer on button |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none — vanilla Web APIs) | — | entire phase | TS-1 mandates zero runtime dependencies |

### Supporting
| API | Purpose | Notes |
|-----|---------|-------|
| `URL.createObjectURL` / `revokeObjectURL` | Blob → object URL for download and SVG→Image | revoke after 4000ms (download) or on load (svgToImage) |
| `canvas.toBlob(callback, "image/png")` | PNG blob creation | async; download via helper |
| `canvas.captureStream(30)` | video track from canvas | 30fps target; actual capture driven by draw calls |
| `MediaRecorder` / `isTypeSupported` | video encoding + format detection | VP9/VP8/H.264/AV1 candidates |
| `navigator.mediaDevices.getUserMedia` | mic audio | wrapped in try/catch — degrade to video-only with toast |
| `AudioContext` + `createMediaElementSource` + `createMediaStreamDestination` | music-file mixing | plays audibly while recording; cleanup stops audio |
| `performance.now()` | frame timing (t for baking) | seconds since record start |
| `setInterval` 33ms | record pump + footstep driver | NOT rAF — keeps capturing when tab unfocused |
| `setTimeout(r, 0)` (`tick`) | yield to event loop between GIF frames | keeps toasts rendering during encode |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled LZW + median-cut | gif.js / gifenc npm | TS-1/TS-5: any dependency breaks single-file zero-dep; original proves ~200 lines is enough |
| SVG-layer cloning for frames | Draw diagram to canvas directly (custom renderer) | Cloning reuses Phase 1's SVG renderer for free; a canvas renderer would be a second renderer to maintain |
| Offscreen canvas + captureStream | getDisplayMedia screen capture | captureStream needs no permission prompt; screen capture requires one and captures browser chrome |
| MediaRecorder on canvas stream | WebCodecs + custom muxer | MediaRecorder is universally supported on Chrome/Edge/Firefox; WebCodecs muxing is a huge hand-roll |

**Installation:** none. **Package Legitimacy Audit:** N/A (zero external packages this phase).

## Architecture Patterns

### System Architecture Diagram (data flow)

```
rendered SVG layers (zones/edges/nodes) — Phase 1
   │
   ├── exportSVG ──► buildExportSVG() ──► buildDiagramSVG(null)
   │                    │  selection temporarily cleared + renderAll, restored after
   │                    ▼
   │               cloneLayerMarkup(layer, null): clone, strip .ports/.zhandle, outerHTML
   │                    ▼
   │               standalone <svg> with defs, dark bg rect, viewBox = bounds+70px pad
   │                    ▼
   │               download("network-diagram.svg", Blob)
   │
   ├── exportPNG ──► buildExportSVG() ──► svgToImage ──► canvas @2× ──► toBlob ──► download
   │
   ├── exportGIF ──► 20 frames: buildDiagramSVG(i*0.08)  [bakes anim state at t]
   │                    ▼  svgToImage → drawImage → getImageData per frame
   │                 medianCut(samples from frames 0,10 @ 1/28 px) → 256-color palette
   │                    ▼  nearest-color mapping (cached by packed RGB key)
   │                 gifLZW(8, indexedFrame) per frame → gifAssemble → Blob → download
   │
   └── startRecording ──► offscreen canvas (viewport × min(1.5,dPR))
        │                  pump loop (setInterval 33ms): buildLiveFrameSVG(...,t) → svgToImage → drawImage
        │                  captureStream(30) → video tracks
        │                  + mic getUserMedia OR music AudioContext mix (optional)
        ▼
        MediaRecorder(mime from detectRecFormats, 6e6 bps, timeslice 250ms)
        │  ondataavailable → chunks; onstop → Blob → download + toast
        └── rec.stop(): clear timers, audio cleanup, track stop, button restore
```

### Recommended Project Structure (appended module within index.html)

```
<script> … Phase 1 sections …
    ├── export helpers: download(name, blob), toast(msg)
    ├── SVG builders: cloneLayerMarkup(layer, t), buildDiagramSVG(t), buildExportSVG(),
    │                 buildLiveFrameSVG(cssW,cssH,physW,physH,t), svgToImage(svgStr)
    ├── exportSVG(), exportPNG()
    ├── GIF encoder: medianCut(samples, nColors), gifLZW(minCodeSize, pixels),
    │                gifAssemble(W,H,palette,indexFrames,delayCS), exportGIF() (async)
    ├── recording: REC_FORMATS, detectRecFormats(), populateRecFormats(),
    │              startRecording(audioMode, musicFile, fmt), stopRecording()
    └── (wire export menu buttons in toolbar wiring)
```

### Pattern 1: Bake animation state into cloned SVG at time t
**What:** CSS/SVG animations (fxhalo opacity pulse, animated dash flow, sneakernet footstep walk) don't survive rasterization. `cloneLayerMarkup(layer, t)` clones each layer, then sets explicit attributes: `.fxhalo` stroke-opacity = `0.22 + 0.63*(0.5-0.5*cos(2πt/1.6))`, `.vis.anim` stroke-dashoffset = `-(35t % 28)`, `.footsteps` positioned via `sneakStep(el, t)`. GIF frames call this with t = i×0.08s; recording calls it with elapsed seconds.
**Why:** one code path (SVG layers) drives both live editing and all export formats; no separate canvas animation renderer.

### Pattern 2: Clear selection for export, restore after
**What:** `buildExportSVG()` saves `selection`, sets it empty, `renderAll()`, builds the SVG, restores selection, `renderAll()`. Ensures exports have no selection halos/boxes.
**Detail:** GIF export does the same around its whole frame loop (`savedSel` pattern).

### Pattern 3: Seamless loop constants
**What:** GIF: FRAMES=20, DELAY=8cs (80ms) → 1.6s loop; the 1.6s aligns with SNEAK_LOOP (footstep loop) and the halo pulse period so every animation completes exactly N cycles per GIF loop. Dash flow: 35px/s with 28px period... (`-(35*t) % 28`) — 1.6s × 35 = 56 = 2×28 ✓ seamless.
**Constraint:** keep these constants coupled (1.6s master loop) or the loop breaks.

### Pattern 4: GIF89a structure
**What:** Header `GIF89a` + logical screen descriptor (W,H, 0xF7 global color table flag, 256 entries) + NETSCAPE2.0 app extension (loop forever) + per-frame: GCE (disposal 0x04... actually 0x04 = keep previous? — use disposal method per reference: byte 0x04 in GCE flags with delay), image descriptor (0x2C, offsets 0,0, W,H, no local table), LZW min code size 8, data in ≤255-byte sub-blocks, then 0 terminator; trailer 0x3B.
**Detail:** palette padded to 256 entries with [0,0,0].

### Pattern 5: GIF LZW specifics
**What:** Standard LZW with GIF quirks: initial code size = minCodeSize+1, CLEAR/EOI codes, dictionary via Map keyed `(prev<<8)|c`, growth to 12 bits max, dictionary reset via CLEAR when full (4096), LSB-first bit packing (acc/nbits accumulator), final partial byte flush. Min code size 8 (256-color).

### Pattern 6: Median-cut quantization
**What:** Box = pixel set + widest channel; repeatedly split the box with the largest range at its median (sorted by widest channel) until 256 boxes; palette = box means. Samples from frames 0 and 10 (start + mid-loop), every 28th pixel — enough coverage without sampling everything.

### Pattern 7: Recording pump with in-flight guard
**What:** `building` flag prevents overlapping `svgToImage` decodes; `lastImg` holds the latest decoded frame; drawTimer draws whatever is decoded. Recomputes the full SVG each tick (33ms ≈ 30fps) — expensive but self-contained; captureStream(30) samples the canvas.

### Pattern 8: Recording format detection
**What:** `REC_FORMATS` lists candidates in preference order with `av` (audio+mimeType variants) and `v` (video-only variants) arrays; `detectRecFormats()` filters by `MediaRecorder.isTypeSupported`; UI radio list; `lastRecFormat` remembers choice within session; `hasAudio` picks `fmt.av` vs `fmt.v` mime.

### Anti-Patterns to Avoid
- **Copying reference code verbatim** — clean-room mandate.
- **rAF for the record pump or footstep timer** — tab unfocus stalls both (setInterval keeps running).
- **Skipping the tick() yields in GIF export** — toasts freeze and browser may warn about long tasks.
- **Bulky pixel sampling** — sample subset (every 28th pixel of 2 frames), not every pixel of 20 frames.
- **Forgetting audio cleanup** — mic tracks and AudioContext must stop on rec.stop() or the mic indicator stays on.
- **Encoding GIF on the main thread without yields** — use `await tick()` between frames.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File download | Custom protocol handler | `download(name, blob)` helper (a[download] + object URL) | 6 lines; works everywhere incl. file:// |
| SVG → raster | Custom renderer | `svgToImage` (Blob URL → Image → drawImage) | Browser's SVG renderer is the ground truth |
| Color quantization library | npm gifenc/quantize | hand-rolled `medianCut` | TS-1 zero-dep; ~30 lines |
| Video encoding | WebCodecs muxer | MediaRecorder | Native, dependency-free, format-detected |

## Validation Architecture

No formal VALIDATION.md required (nyquist_validation_enabled is false).

**Informal validation for Phase 2:**
- Export SVG → open in browser/Inkscape → renders identically to canvas, no .ports/.zhandle elements
- Export PNG → image is 2× pixel dimensions of SVG w/h, visually identical
- Export GIF from a diagram with an animated (dash) edge + sneakernet edge → file opens in a viewer, loops seamlessly (~1.6s), footstep walk and dash flow loop without a jump
- Record 5s with mic → .webm plays with audio; record without mic → video-only; check format radio list populated per browser support
- All exports from file:// context with DevTools Network tab clean (no requests)

## Key Findings

1. **Export = serialize the SVG layers with animation state baked in.** `cloneLayerMarkup` is the linchpin: one function feeds SVG export, PNG rasterization, GIF frames, and live recording. The 1.6s master-loop constant couples GIF frame count (20×80ms), footstep SNEAK_LOOP, halo pulse, and dash flow — keep them synchronized or the GIF loop shows a seam.

2. **The GIF encoder is genuinely ~200 lines total** (medianCut ~30, gifLZW ~30, gifAssemble ~20, driver ~60), validating PROJECT.md's key decision. GIF89a + NETSCAPE2.0 loop-forever + GCE with 8cs delay; LZW min code size 8; 255-byte sub-blocks; disposal byte 0x04.

3. **Recording renders viewport-true frames, not diagram-bounds frames.** `buildLiveFrameSVG` includes grid, selection, temp edges, and the current view transform — so pan/zoom during recording is captured. Offscreen canvas at `min(1.5, devicePixelRatio)` scale; `captureStream(30)`; MediaRecorder at 6Mbps with 250ms timeslices.

4. **Audio has two paths with graceful degradation.** Mic: `getUserMedia` in try/catch → toast + continue video-only on failure. Music file: AudioContext `createMediaElementSource` → `MediaStreamDestination` + audible `connect(actx.destination)`; cleanup pauses audio, revokes URL, closes context. Mime selection: `hasAudio ? fmt.av : fmt.v`.

5. **PNG 2× is a thin wrapper over SVG export.** Same `buildExportSVG()` → `svgToImage` → `ctx.scale(2,2)` → `drawImage` → `toBlob`. Both honor the "clear selection around export" pattern.

## Requirements Coverage

| REQ-ID | How Phase 2 Addresses It |
|--------|--------------------------|
| M-13 | `exportPNG`: buildExportSVG → svgToImage → canvas @2× → toBlob → download; toast feedback |
| M-14 | `exportSVG`: standalone SVG with defs + dark bg + bounds-sized viewBox; download; toast |
| M-15 | `exportGIF`: 20×80ms frames with baked animation state; medianCut 256-color palette; gifLZW; gifAssemble with NETSCAPE2.0 loop; own encoder, zero deps |
| M-16 | `startRecording`/`stopRecording`: offscreen canvas + captureStream(30) + MediaRecorder; mic/music optional; `detectRecFormats` VP9→VP8→H.264→AV1; rec timer UI; toast feedback |
| TS-1 | No external packages; all vanilla Web APIs |
| TS-5 | No network calls; object URLs are local |
