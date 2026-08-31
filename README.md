# NetDraw 

A zero-dependency, single-file network diagram editor — draw infrastructure, present attack paths, ingest real configs. 

![NetDraw demo](docs/demo.gif)

## Features

- **Core editor** — SVG canvas with pan/zoom, 58 node shapes across 9 palette groups (network, security, servers, storage, endpoints, orgs, process flow, threats), bezier + orthogonal edge routing, connection ports, labeled zones, swimlanes with lane snap, snap-to-grid, undo/redo, marquee select, double-click rename, properties panel
- **Export** — SVG (vector), PNG (2x), animated GIF (hand-rolled median-cut + LZW encoder, 1.6s seamless loop), PlantUML text
- **Record** — viewport-true video capture via MediaRecorder (VP9/VP8/H.264/AV1 auto-detection), optional mic or music-file audio
- **Presentation** — journey builder (steps, narration, object picking) + present mode with camera tweens, cumulative reveals, dimming
- **PlantUML bridge** — import `.puml` (component/deployment subset, packages→zones, stereotypes→palette shapes) and export back; model-level round-trip preserved
- **Config ingestion** — parse Cisco-style running-configs into a topology (peer-heuristic link derivation), ingest CMDB JSON/CSV exports with zone grouping; preview-confirm before any canvas mutation

Full side-by-side parity checklist: [AUDIT.md](AUDIT.md)

## Quick Start

Open `index.html` directly in a browser — double-click it or:

```
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

Zero console errors, zero network requests. The app is fully offline: no CDN, no web fonts, no telemetry. Autosave to localStorage; `Ctrl+S` exports JSON.

## Usage

| Key | Action |
|---|---|
| `V` | select / move |
| `C` | connect nodes |
| `Z` | draw zone |
| `L` | draw swimlane |
| `H` / `Space` | pan |
| `F` | fit to content |
| `G` | toggle grid snap |
| `Del` / `Backspace` | delete selection |
| `Ctrl+Z` / `Ctrl+Y` | undo / redo |
| `Ctrl+S` | save JSON |
| `Ctrl+D` | duplicate node |
| `J` | journey builder |
| `Esc` | exit present / cancel |

Drag palette shapes onto the canvas. Drag from a node's port to another node to connect. Double-click anything to rename. The **Export** menu (top right) has SVG/PNG/GIF/PlantUML/Record. The **PlantUML** button imports `.puml`; the **Ingest** button takes running-configs or CMDB JSON/CSV.

## Development

```
node test/run-tests.js    # fixture tests: config parsers, CMDB ingest (AC-4)
node test/audit.mjs       # parity audit: zero-network, round-trips, GIF (AC-2/3/5/6)
```

Playwright is a devDependency (audit harness only) — the app itself is a single HTML file with zero dependencies.

## License

MIT

## Credits

Inspired by the original [NetDraw](https://github.com/mr-r3b00t/NetDraw) by mr-r3b00t. This is a clean-room reimplementation from behavior study — no original code was copied.
