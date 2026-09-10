# Impact soldier loadout checkpoint

Production commit: `d7720d2`. Verified against the frozen build at `http://127.0.0.1:5183/powerworld.html` on September 10, 2026, approximately 18:40 Eastern.

## Implemented

- PowerWorld has a native Loadout button and I shortcut, available before and during a match.
- The armory saves catalog choices and explicitly confirms issuance of the selected LMB firearm to the current living soldier. Invalid firearm, stale actor, KO and non-soldier requests are rejected.
- Issuance reuses `game.equipFrom` and its procedural mounted weapon. The actual LMB slot becomes the firearm; the existing `_gear` emitter contract remains a non-enumerable alias to avoid double ticking the slot. Drop restores the original primary.
- Catalog firearms have physical magazine, reserve and reload values; marksman rifles have sights. Shared roster/catalog definitions are not mutated by issuance.
- Replacement resolves already-paid shots before detaching their old muzzle and cancels reload presentation for the replaced slot.
- The menu retires held combat input and pauses simulation, then restores the prior running/paused state on Escape or Close. Saved secondary/gear choices remain explicitly unissued.

## Evidence

- PASS: `node --test tools/powerworld-loadout.test.mjs tools/firearm-emission.test.mjs` — 47 tests, zero failures. Includes rifle/shotgun/marksman native ability firing, magazine consumption, reload, original slot restoration and resolved paid launches before replacement.
- PASS: `LSW_BASE_URL=http://127.0.0.1:5183 node tools/powerworld-loadout-browser.mjs` — fully rendered Chromium. Select Sarge through the native front door, I opens armory, choose/confirm M16, combat shotgun and M24, Escape resumes, real mouse input emits native projectiles and consumes ammo, R reloads. Movement is suppressed while the menu is open. A prior pause remains paused. No page errors.
- PASS: 390×844 armory width check and inspected screenshot: `artifacts/impact-loadout/mobile.png`. The menu scrolls vertically and its controls remain legible.
- GPU reported by WebGL: `ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)`. Five startup RAF intervals were approximately 0.4, 0.6, 11.3, 5.9 and 46.8 ms; this is an environment check, not a sustained performance benchmark.
- The browser test disables opponent AI to isolate equipment/input acceptance, while retaining native input, simulation, animations, weapons, projectiles and rendering.

The first browser run used Playwright's default headless shell and timed out waiting for a 2.2-second reload: 45 wall seconds advanced its native reload clock only 1.3 seconds. Running was true, paused undefined, and both overlay and armory were false. That run did not establish a GPU cause. An explicitly render-suppressed functional run passed, followed by the fully rendered `channel: chromium` run above. Only the latter supplies graphical browser evidence.

## Remaining scope

Nine fully differentiated authored gun packages are not proved by this catalog implementation. Equipment art remains procedural pending its separate review. The saved catalog selection must be explicitly issued in each match; this checkpoint does not auto-issue it on restart. Global restart, mixed-combat soak and continuous footage remain the main integration owner's acceptance gates.

The production commit succeeded, but Git's automatic housekeeping reported a corrupt loose object `a5a5fe6ca37dc54a133ea0c09f2de3e75f358cd0` and failed repacking. No repository objects were removed or repaired by this task.
