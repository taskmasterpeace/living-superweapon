# HIGHWALL — outage recovery checkpoint

Working tree: `D:/lsw/.worktrees/combat-release-review`, branch `codex/playable-integration`.
Updated 2026-09-15. This is an integration milestone, not acceptance of every feature in the expanded brief.

## Run

`npm run dev -- --host 127.0.0.1 --port 5193 --strictPort`

Open `http://127.0.0.1:5193/powerworld.html?highwall&scenario=corridor`.
The normal title also has a HIGHWALL entry. Choose a preset, then Start combat. Systems starts peacefully at the control post.

## Implemented

- Branded first-paint and scenario loading screen uses the supplied image unchanged: `public/images/highwall/loading.png`. Progress reports real stages without a fabricated percentage.
- LSW corpses persist until scenario reset; ordinary soldier corpse cleanup does not erase separately owned loot.
- Authored environment modules generate rendering, native box collision/weapon/sight obstruction and bounded ground A* routes. Thirty-foot walls, armored lanes, low cover, roofed links, lift gate and observation steps. No construction editor.
- Shared current-model soldier family: four appearances and rifleman/breacher/marksman/support loadouts, independent Blue/Red team marks. Native weapons, ammunition, reloads, controllers and damage.
- Reusable scenario definitions: skirmish, infestation, outbreak, horde/stress, accelerated turning, peaceful systems, air intrusion, interception and player-operated fleet handling.
- Native zombie contact causes eligible biological soldier exposure; symptoms progress while living; a dead infected body incubates then converts once. New zombie does not inherit gun inventory. LSW susceptibility is not inferred from strength/power.
- Actual death inventory becomes a persistent loot container, transferred with E through existing capacity/action/ownership validation. Compatible ammunition can be recovered without duplicating it. Nearby empty-ammo soldiers use the same transfer checks.
- Manual local Save/Resume stores units, inventory/ammunition, loot, infection and device configuration. Reset clears the running encounter, retaining the manual save. Media requires a fresh Play gesture after resume. Vehicle session saving is explicitly rejected rather than pretending to preserve vehicle state.
- Live security feeds and MP3/MP4 props with play/pause/stop/volume; focused controls keep the operator in the world and block combat input. Speaker emits a bounded hearing stimulus. Gate changes its real collider and invalidates routes continuously.
- Hold Alt + wheel zoom; double-tap Alt toggles full orbit; tap Alt to return.

## Evidence and verification

- Highwall, soldier family, Alt controls and fleet fixtures: **100 passing tests**. Existing inventory, three-region charge, grab eligibility, recovery and zombie locational-damage regressions: **28 passing tests**. Logs: `artifacts/highwall/resume/tests-final.txt` and `regression-final.txt`.
- `npm run build` passes (existing large bundle warning remains).
- `tools/highwall-browser.mjs`: original native entry, combat, tank movement and interception evidence in `artifacts/highwall/`.
- `tools/highwall-integration-browser.mjs`: refreshed native stairs, E/device, media, Save/Reset/Resume and outbreak checks in `artifacts/highwall/resume/`.
- `tools/highwall-fleet-browser.mjs`: family-specific native boarding/driving/exit evidence in `artifacts/highwall-fleet/`.
- Device approaches in the automated walkthrough are explicitly arranged fixtures; interaction input is native. They do not prove AI stairs or a fully walked route to every prop.
- Browser walkthrough passes: native W reaches observation deck at y=10; live feed has real scene detail; W/LMB cannot move or fire while focused; MP3/MP4 play/pause/resume; gate opens; Save/Reset/Resume retains M16 and gate state; native fire/reload changes ammunition 30→28→30. Zero page errors. Reanimation is validated in native logic fixtures, not visually accepted from this latest walkthrough.
- All four native fleet handling checks pass, including helicopter ascent/descent and safe exit rejection in air. Mech rig moves. Tank screenshot now keeps the vehicle visible around decorative signs. Weapons/crew acceptance remains separate.
- Loading screenshot: `artifacts/highwall/resume/loading-screen.png`. The harness delays the real boot module to inspect first paint, then releases it and verifies entry.

## Population measurements

Foreground Chromium, 1280×720, Intel i9-14900KF, RTX 4090, 128 GB RAM; eight-second samples after warmup. No claim of a deterministic combat benchmark: live casualties vary between runs. `artifacts/highwall/resume/performance.json` records heap, active actors and hardware. Renderer draw counters there describe the final compositor pass, not total scene complexity.

| Preset | Median frame | 95th percentile | Assessment |
|---|---:|---:|---|
| Squad skirmish, 8 initial actors | 8.4 ms | 12.6 ms | Recommended starting preset |
| 16 infected + squad | 20.8 ms | 29.3 ms | Heavier; test on target hardware |
| 32 infected + squad | 41.7 ms | 83.5 ms | Experimental; not accepted for normal play |
| 64 infected + squad | 87.5 ms | 250.3 ms | Performance failure; do not treat as supported capacity |

Spatial indexing reduced the isolated ten-route fixture from about126ms to28ms with exact clearance equivalence. It did **not** solve heavy population frame time; shared actor/animation/combat profiling remains necessary. Audio voice counts and per-system CPU timing are not yet measured.

## Still unsupported / not accepted

- Multi-level AI navigation onto elevated platforms; general cover selection; designated-target squad command. Ground corner navigation exists.
- Full AI vehicle crews, tank turret/mounted ammunition combat, motorcycle rider presentation. Vehicle handling acceptance is separate from these missing systems. Jet belongs in the existing separate flight test, not Highwall corridors.
- Anti-air firing emplacement: existing simulation turret is a tracking fixture, not a damage-capable AA system. No fake damage zones were added.
- Corpse neutralization/containment counterplay, containment/extraction objective, cough/turn animation visual acceptance, general AI weapon replacement, reinforcement scheduling and arbitrary unit setup UI.
- Full audio listening acceptance and performance population limits. Decoding a sound or a passing build is not evidence of these.
- Local saves are not online persistence. Deployed gadget saving is rejected until recalled. No campaign rewards are granted by Highwall casualties.

## Data / code entry points

- `src/data/highwall.js`: placement boxes `{id,kind,x,z,hx,hz,bottom,top}`, spawn pads, signs, bounds and layout revision.
- `src/data/highwall-scenarios.js`: populations/goals independently of geometry.
- `src/data/soldier-family.js`, `src/data/highwall-fleet.js`: reusable character and vehicle authoring.
- `src/engine/highwall.js`: native game integration and lifecycle; remaining `highwall-*` modules isolate navigation, geometry, gate, media, loot, infection, loading and save format.
- Save key `warworld.highwall.session.v1`, schema 1; previous valid save retained under `.previous`.

Tracked follow-ups: navigation/squad commands [#38](https://github.com/taskmasterpeace/living-superweapon/issues/38), containment [#39](https://github.com/taskmasterpeace/living-superweapon/issues/39), fleet combat/persistence [#40](https://github.com/taskmasterpeace/living-superweapon/issues/40).

Highest-value next blocker: profile large-population actor/animation/combat cost, then multi-level AI navigation and containment counterplay. Preserve this checkpoint and all unrelated working-tree assets.
