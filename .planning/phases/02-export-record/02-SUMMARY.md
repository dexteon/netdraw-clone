---
plan: 02-01..02
status: complete
---

# Phase 2: Export & Record — Summary

## What was built

**Plan 02-01 (export pipeline):**
- `cloneLayerMarkup(layer, t)` — clones a render layer, strips `.ports`/`.zhandle` editor chrome, bakes animation state at time t (dash-flow `stroke-dashoffset = -((35t)%28)`, halo pulse `0.22+0.63*(0.5-0.5*cos(2πt/1.6))`)
- `buildDiagramSVG(t)` — standalone SVG: contentBounds + 70px padding, arrow-marker defs, #0b1120 bg, three cloned layers
- `buildExportSVG()` — save-clear-render-build-restore-render: exports never carry selection artifacts
- `svgToImage(svgStr)` — Blob URL → Image promise; URL revoked on load AND error
- `exportSVG()` → network-diagram.svg; `exportPNG()` → 2x raster (ctx.scale(2,2), canvas = viewBox × 2)
- GIF encoder, fully hand-rolled: `medianCut` (256-color, widest-channel split at median), `gifLZW` (9→12-bit codes, CLEAR=256/EOI=257, dict reset at 4096, LSB-first bit packing, partial-byte flush), `gifAssemble` (GIF89a header, LSD 0xF7 packed flags, 256-entry GCT, NETSCAPE2.0 loop-forever ext with correct block terminator, per-frame GCE disposal 0x04 + delay, image descriptors, ≤255-byte sub-blocks, 0x3B trailer)
- `exportGIF()` — gifBusy re-entry guard; 20 frames at t=i*0.08 (GIF_FRAMES=20 × GIF_DELAY_CS=8 = exactly 1.6s seamless loop, coupled to dash/halo/sneak periods); palette sampled from frames 0 and 10 every 28th pixel; nearest-color mapping cached by packed RGB; tick() yields between frames; selection restored in finally
- Export menu (dropdown from the Export button): SVG / PNG / GIF / Record…

**Plan 02-02 (record mode):**
- `REC_FORMATS` — VP9 WebM → VP8 WebM → H.264 MP4 → AV1, each with av[] (with-audio) and v[] (video-only) mime variants
- `detectRecFormats()` — returns [] when MediaRecorder or navigator.mediaDevices undefined; filters by isTypeSupported preserving preference order
- `populateRecFormats()` — radio list + "recording not supported" empty state + Start disabled
- `buildLiveFrameSVG(cssW,cssH,physW,physH,t)` — VIEWPORT-true frame: current pan/zoom transform, grid, selection, temp edges via cloneLayerMarkup(t)
- `startRecording(audioMode, musicFile, fmt)` — offscreen canvas at viewport × min(1.5, dpr); 33ms setInterval pump (NOT rAF) with in-flight building guard + lastImg fallback (no blank frames); captureStream(30); mic via getUserMedia try/catch degrading to video-only with toast; music via AudioContext + createMediaElementSource + MediaStreamDestination (audible via actx.destination); MediaRecorder 6e6 bps, start(250); MediaRecorder-construction fallback chain; elapsed timer on the Stop button
- `stopRecording()` — recorder.stop, clears pump + timer, stops all tracks (mic indicator dies), pauses music, revokes music object URL, closes AudioContext, restores button
- Record UI modal: format radios, audio-mode select (none/mic/music), conditional music file input, Start/Stop with running MM:SS timer

## Verification (automated, node)
- All plan-02 symbols present (download, toast, cloneLayerMarkup, buildDiagramSVG, buildExportSVG, svgToImage, exportSVG, exportPNG, medianCut, gifLZW, gifAssemble, exportGIF, tick, REC_FORMATS, detectRecFormats, populateRecFormats, buildLiveFrameSVG, startRecording, stopRecording)
- ctx.scale(2,2) present; GIF_FRAMES=20/GIF_DELAY_CS=8; NETSCAPE2.0 loop-forever extension bytes + terminator; captureStream(30); 6e6 bitrate; 33ms setInterval pump; start(250); getUserMedia + AudioContext paths; MediaRecorder undefined guard; isTypeSupported filter
- GIF spec correctness fixed during review: added the missing 0x00 block terminator after the NETSCAPE loop sub-block

## Security (threat model execution)
- T-02-02 GIF DoS: mitigated — 1600px export cap baked into the frame loop constants, 28th-pixel sampling bounds palette cost
- T-02-06 mic disclosure: mitigated — getUserMedia only on explicit mic mode; all tracks stopped on stopRecording
- T-02-07 mime tampering: mitigated — mimes only from fixed REC_FORMATS literal filtered by isTypeSupported; construction try/catch with fallback format
- T-02-08 pump DoS: mitigated — dpr capped 1.5, in-flight guard prevents decode buildup
- Object URLs: svgToImage revokes on load+error; download revokes after timeout; music URL revoked in stopRecording

## Deviations
- btnPng became the "Export" dropdown trigger (contains SVG/PNG/GIF/Record) instead of four topbar buttons — same functionality, less topbar crowding
- Browser-only verification (MediaRecorder/GIF blob behavior needs a live browser) is deferred to Phase 6's Playwright audit per the plan's verification section
