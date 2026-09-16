# Mac Asset Lab — Blender tooling evaluation

*2026-09-15, Mac Mini. Companion to `docs/MAC_ASSET_LAB.md`.*

## Direct headless Blender (the workhorse — verified)

Blender **5.2.2 LTS** (`/opt/homebrew/bin/blender`) runs the repo's existing 4.5-era
scripts unmodified:

- `tools/build-modular-character.py` rebuilt `modular-hero.glb` from the committed
  source; the output **manifest is field-for-field identical** to the committed one
  (same sourceHash, modules, clips, triangles, runtime groups). Byte delta on the GLB
  is exporter-serialization noise only.
- New lab scripts verified on 5.2: `tools/render-weapon-sockets.py`,
  `tools/render-animation-phases.py` (workbench engine, deterministic camera framing).
- Command shape: `blender --background --factory-startup --python tools/<script>.py -- <args>`

One 5.x note: assigning an action to an armature now also wants an action **slot**
(`rig.animation_data.action_slot = action.slots[0]`); guard it with try/except to stay
4.5-compatible.

## bpy-dev/blender-mcp (cloned at `~/Documents/git/tools-blender-mcp`)

Enhanced developer preview of Blender Lab's MCP server. Two halves:

- **Live add-on** (`addon/blender_mcp_addon/`): TCP add-on inside a running Blender UI;
  the MCP server process bridges MCP/stdio ⇔ TCP. Needed only for live-scene work.
- **Saved-file `_for_cli` tools**: operate on `.blend` files in fresh subprocesses with
  timeouts/output caps — no UI session required. Backend selectable via
  `BLENDER_MCP_CLI_BACKEND` (Blender executable or standalone `bpy`).
- **Runtime API lookup**: query exact signatures/enums from the active runtime —
  genuinely useful when writing against 5.x API drift.

**Lab verdict:** for the repeatable asset pipeline, direct `blender --background`
scripts committed under `tools/` remain the primary path — reproducible, reviewable,
CI-able, and already proven. blender-mcp earns its place for **interactive** Blender
sessions (inspecting a problem mesh, exploratory fitting) and for API lookup. Keep
source assets immutable and point it only at working copies — the repo itself calls
this an enhanced developer preview.

## achimala/dream-loop (cloned at `~/Documents/git/tools-dream-loop`)

Skill that closes a visual loop: dream a target render → build → **independent critic**
compares live result vs target → correct → repeat. Install into an agent with
`npx skills add achimala/dream-loop` (or copy `SKILL.md` into the skills directory).

**Lab verdict:** the loop pattern is the standing rule here even without the skill
installed — this session applied it manually (render → inspect → correct → re-render,
e.g. socket markers and capture framing were each fixed after a critic pass on the
actual image). Use dream-loop proper for from-scratch visual targets (new character
looks, environment mood). **Visual judge only** — it never grades damage, navigation,
ammo, AI, or collision; those keep their gameplay tests.

## The capture stack (browser side)

- Playwright + chromium installed (`npx playwright install chromium`).
- Dev server: `npm run dev` (vite, port 5180; note it binds IPv6 `::1` on this Mac, so
  tools must target `http://localhost:5180`, not `127.0.0.1`).
- `tools/warworld-soldier-review.mjs` — reproducible close-view soldier firearm
  captures through the REAL ability code (`PW_URL=http://localhost:5180 node
  tools/warworld-soldier-review.mjs --view=rear`). Gotchas it handles: the studio
  preview world is ~10× scale (frame from measured body bounds, never assumed height);
  the studio render loop must be frozen (`requestAnimationFrame` no-op) or it repaints
  with its own camera between evaluate and screenshot.
- Known invalid path: changing the Costume module dropdown while the loop is frozen
  updates the UI but never rebuilds the meshes — costume-variant captures taken that
  way are NOT evidence (the one such set was deleted).
