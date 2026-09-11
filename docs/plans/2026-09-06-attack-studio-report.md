# Attack authoring — Studio integration report

Implemented Tasks 2 and 3 of `2026-09-06-attack-authoring.md` together, extending the existing warm charcoal/amber Character Studio rather than redesigning it. This task did not edit maps, shipped attack definitions, the attack schema, package format, or the production game runtime. Runtime/schema changes described below were delivered independently by the controller and consumed through their public APIs.

## Exact Studio changes

- `src/tool/studio-main.js`
  - adds a fifth, keyboard-accessible **Attacks** tab whose slot picker comes from the selected fighter's actual kit;
  - renders the public attack-tuning metadata for production `beam`, `projectile`, `volley`, and `charge` fields, including source-only boolean traits;
  - automatically includes the public split-child controls for projectile/charge sources and explains that they require the explicit second-press option; zero retains the ordinary burst while 2–8 retires the parent into ordinary homing children;
  - shows attack name, type, full source identity, and default/authored state, with an honest unsupported state for other ability types;
  - uses `step="any"` for numeric entry and preserves accepted precision instead of quantizing to the metadata's suggested increment;
  - validates paired ranges before committing history, retaining the last valid draft, restoring focus/value, and showing an inline field-level error when a pair is rejected;
  - re-renders metadata after a valid commit so derived beam detonation radius/damage stay in sync with edited width/DPS without requiring a tab reopen;
  - rebuilds the real `Fighter` after a committed edit so preview inputs consume the edited definitions;
  - integrates attack edits with Undo, Redo, per-slot reset, hero reset, local save, package export/import, and stale-identity reconciliation;
  - visibly reports dropped stale overrides, including a same-type ORIGIN replacement, without overwriting local storage merely because it was read;
  - states that custom attack tuning is outside ORIGIN point balancing and that a local save never edits source files;
  - adds the **Attack sequence** controls, truthful partial/long-charge timing, and fire/armed/second-press/detonated/resource-denied phase copy while retaining the legacy **Beam sequence**.
- `src/tool/studio-combat.js`
  - drives the preview through production `runSlot`, `Projectiles`, `Game.prototype.spawnBeamFor`, `muzzleFlash`, `chargeGather`, `nearestFoe`, `overlapFoe`, `areaDamage`, and `remoteAttack`;
  - keeps the existing `beam` mode beam-only for legacy callers and adds a separate `attack` mode for all four supported types;
  - issues real projectile press, volley hold/release with real cooldown ticks, charge hold/release once, sustained beam input, and a second pressed edge for authored remote detonation;
  - schedules the second press from the real launch edge even when a charge's authored maximum is shorter than the selected hold;
  - uses the same fixed 60 Hz input timeline for play and seek, exposes attack phases, and does not restart charge after release;
  - creates an explicitly inexhaustible real `Fighter` target, routes contacts through production defenses, restores target health after each contact, and reports measured contact/damage separately from nominal damage;
  - reports remote nominal damage from the actual armed projectile/`BeamHose` payload (including charged-beam scaling) as `hp/burst`, and exposes unaffordable/drained resource phases instead of implying that a shot fired;
  - distinguishes a production split from a burst by detecting the actual newly spawned child objects, retaining them in the fixture, and reporting authored count, live count, measured damage events including splash/defenses, and nominal direct `hp/child` payload;
  - provides a small explicit silent adapter for services absent from the empty authoring stage. It does not invent hit, damage, terrain, audio, or camera-shake measurements;
  - owns and disposes preview projectiles, particles, VFX, target, and fighter state on seek/reset/hero/slot changes.
- `src/tool/studio-preview.js`
  - accepts the new internal `attack` state alongside the backwards-compatible `beam` state;
  - keeps play and scrub on one deterministic fixed-step rebuild path;
  - dynamically expands only the Attack timeline for authored charge holds up to 30 seconds, while preserving the legacy Beam sequence's eight-second API and established absolute release timing;
  - publishes actual contacts, actual damage, nominal damage, attack type, remote-detonation count, and phase to the Studio controller;
  - publishes total/live split children and `split-children`, `split-contact`, or `split-expired` phases without adding a parallel visual simulation;
  - returns cleanly to hover and releases combat resources when the state changes.
- `src/tool/studio.css`
  - extends the established Studio visual language for identity, authored/default state, boolean traits, validation/unsupported notes, phase labels, and the fifth tab;
  - preserves the stage as the dominant surface and keeps the Attacks workflow usable at 390 CSS pixels, including a visible compact Saved/Unsaved badge and a separate wrapping telemetry row below the live-engine badge.
- `tools/attack-authoring-browser.mjs`
  - adds the focused browser proof for the complete authoring, preview, split-child travel/contact, identity, package/runtime, cleanup, accessibility, and responsive workflow.

## RED / GREEN evidence

The browser test was authored before production UI work.

```powershell
node tools/attack-authoring-browser.mjs
```

Initial RED: exit 1 in about 2.7 seconds; the first deliberate assertion reported that the **Attacks** tab count was `0` instead of `1`.

Focused GREEN after the initial inspector/four-type preview implementation:

```text
PASS attack inspector, four real attack previews, identity reconciliation, package reload/runtime, 390px layout, 0 page errors
```

Final expanded GREEN after adding remote-detonation authoring and real second-press preview:

```powershell
node tools/attack-authoring-browser.mjs
```

Result: exit 0 in about 111 seconds with the same PASS line above.

The bounded finish review produced two additional meaningful RED gates in the same test:

- after editing beam DPS, the dependent detonation value remained `48` instead of the newly derived `72.8` (exit 1);
- a schema-valid 30-second charge found the preview hold capped at `3.5` seconds (exit 1).

After fixing those gates plus the paired-field focus/error, short-max remote timing, real burst units/payload, denied-resource state, mobile saved-state visibility, and 390px telemetry collision, the expanded focused test passed again. The final run included 1,890 fixed production steps for the 30-second charge and exited 0 with the same PASS line. Both Studio and the subsequent PowerWorld page were monitored for `pageerror` and `console.error`; neither produced an error.

The follow-on split-projectile Studio extension added another focused RED gate:

```powershell
node tools/attack-authoring-browser.mjs
```

RED result: exit 1 after the real second press because the new children existed in production but Studio had no split telemetry (`undefined !== 4`). After Studio integration, a full-lifetime default `.55 rad / 90 u/s / homing 3` browser fixture exposed a separate runtime convergence defect rather than hiding it with a tuned fixture. The controller reproduced and corrected that child-only guidance path at 30/60/120 Hz while leaving ordinary projectile homing unchanged. Final focused result: exit 0 — `PASS attack inspector, split children + four real attack previews, identity reconciliation, package reload/runtime, 390px layout, 0 page errors`.

A final copy refinement initially exposed a Studio boot regression: the preview callback formatted `damage.toFixed()` before checking whether the state was combat, so hover supplied `undefined` and `window.STUDIO` never initialized. The focused browser captured the exact `console.error`, the callback was restored to an explicit noncombat path, and the full test then passed again. Split-contact copy now labels the callback count as **damage events**, labels the payload as **nominal direct hp/child**, and states that measured damage includes splash and production defenses; no damage behavior was changed.

The browser proof exercises real DOM behavior for:

- beam damage and steering edits, Undo/Redo/per-slot reset, and a measurable authored-vs-default contact difference;
- immediate derived detonation-field refresh and invalid charge endpoint pairs rejected with inline feedback, restored values, and restored focus;
- real production beam, projectile, volley, and charge contact;
- real remote beam/projectile/charge second-press detonation before ordinary target collision, including short-max charge and charge-scaled beam-burst payloads;
- real projectile split at the parent's live position, four ordinary nonrecursive children, authored speed/homing, visible separation/travel, zero parent contact, later real Fighter contact, and `hp/child` rather than false burst telemetry;
- schema-valid 30-second low-cost charge authoring, dynamic Attack duration, real launch/contact, and unchanged eight-second legacy Beam behavior;
- unaffordable authored cost producing a visible resource-denied phase with no false projectile;
- deterministic seek/play input, phase labels, cleanup, and an inexhaustible target under high authored damage;
- unsupported types and legacy beam-only mode compatibility;
- compatible slot tuning, stale same-type replacement rejection with visible status, and preservation of unrelated compatible slots;
- custom package export/import in a fresh browser context, reload, and the resulting `PowerWorld` fighter's actual tuned ability values;
- sparse split options surviving that same fresh-context package/reload and appearing on the actual PowerWorld projectile definition;
- dynamic five-tab keyboard navigation, visible mobile save state, non-overlapping 390px telemetry, and zero captured page or console errors.

## Design checks and screenshots

The Impeccable detector was run once after the UI became functional, as requested:

```powershell
node 'D:/lsw/.agents/skills/impeccable/scripts/detect.mjs' --json src/tool/studio-main.js src/tool/studio.css
```

Result: exit 0, output `[]`. The detector was not rerun after the controller requested one finish pass only.

The independent finish review then rechecked the updated screenshots and implementation against the established Studio contract. It reported no remaining material fixes: persistence copy, mobile saved state, separated telemetry, production burst readability, `hp/burst` truthfulness, inline validation/focus, dominant stage, and restrained warm palette all passed.

Dedicated Attacks-tab evidence:

- `artifacts/attack-authoring/studio-desktop.png` — desktop inspector plus an actual production remote beam burst at the target.
- `artifacts/attack-authoring/studio-mobile.png` — the same authored attack and actual burst at 390 CSS pixels, with compact saved state and separated telemetry visible.
- `artifacts/attack-authoring/studio-split-children.png` — paused immediately after the real second press, showing four live children separated in flight, zero contact, the `split-children` phase, and per-child telemetry.
- `artifacts/attack-authoring/studio-split-contact.png` — the same default split after subsequent real target contact, explicitly separating damage events (direct plus splash/defenses) from nominal direct damage per child, with parent-burst damage still absent.
- `artifacts/attack-authoring/attack-lab-character.json` — exported custom character package with sparse authored attack values.
- `artifacts/attack-authoring/results.json` — fresh-context package IDs and captured browser error array (`[]`).

## Verification

Studio-owned syntax and whitespace checks:

```powershell
node --check src/tool/studio-main.js
node --check src/tool/studio-combat.js
node --check src/tool/studio-preview.js
node --check tools/attack-authoring-browser.mjs
git diff --check -- src/tool/studio-main.js src/tool/studio-combat.js src/tool/studio-preview.js src/tool/studio.css tools/attack-authoring-browser.mjs
```

Result: exit 0.

Fresh aggregate attack verification after the controller's independent runtime/material fixes:

```powershell
npm run test:attacks
```

Result: exit 0; 48/48 Node tests passed, followed serially by:

```text
PASS attack inspector, four real attack previews, identity reconciliation, package reload/runtime, 390px layout, 0 page errors
PASS real mouse charge → release → flight → zero-ki second-press detonation, 0 page errors
```

The authoring browser's `0 page errors` proof includes explicit `pageerror` and `console.error` collection. The aggregate also covers schema/profile/package normalization, charge energy accounting, actual remote projectile/charge/beam ownership and cleanup, charged-beam payload scaling, interruption semantics, AI selection, and the production energy-burst material.

Fresh adjacent Studio regressions, run serially after the final shared beam-contact changes:

```powershell
node tools/studio-combat-check.mjs
```

Result: exit 0 — `PASS 9 real beam/elevation/seek/recovery cases, unsupported kit and editor state; 0 page errors`.

```powershell
node tools/studio-encounter-check.mjs
```

Result: exit 0 — `PASS 4 moving encounters; deterministic seek/playback; validation; 3 layouts; no profile mutations or page errors`.

```powershell
node tools/character-package-browser.mjs
```

Result: exit 0 — `PASS Studio create → package → empty browser import → reload → edit kit → PowerWorld, responsive layout, 0 page errors`.

The encounter regression initially failed during development because the new Attack-mode duration semantics had inadvertently shifted the legacy charged-beam release from its established absolute 1.8-second point to 2.4 seconds. The Studio fixture was corrected, not the regression weakened; the final command above proves the original moving-target contact contract again.

Controller-run final production verification after split guidance/collision/material integration:

- world checks: 42 passed;
- 53 kits × 7 slots exercised;
- 30-second, eight-fighter combat soak: 1,467 hits, 12 KOs, zero invalid values/errors;
- split-child impact material checks: 20/20 passed;
- production build: 212 modules transformed, exit 0.

After the shared split-child impacts were switched to the existing transparent edge-weighted energy shell, the controller reran `node tools/attack-authoring-browser.mjs`: exit 0 with the split/four-preview/package/390px PASS line and zero page or console errors. Visual inspection confirmed the target remains visible through the four overlapping impact shells. The combined production/package Node gate was 100/100. The full camera suite also passed: 159 locked-roster cases, 318 free-clearance cases, 45 aim-timing cases, real input, HUD, and comic checks.

Final presentation regression suites also passed: `test:flight`, `test:flight-languages` (six styles, 12 angles, five phases), and `test:flight-lighting` (8/220/450-unit heights plus Studio state/view transitions). The final build again transformed 212 modules and exited 0. All browser/GPU processes were closed at handoff.

## Scope and caveats

- This completes practical per-character attack tuning, real-contact preview, remote-detonation preview, and package/runtime proof for the current four production attack types. It is not a claim of full Bid For Power feature parity.
- The optional remote split is original data-driven behavior inspired by the documented BFP missile pattern; it does not import original assets/configuration or change the shipped catalog.
- Custom attack values are intentionally outside ORIGIN point balancing. Actual contact is a production-defense measurement in an empty authoring stage, not an overall score or a balance grade.
- The authoring stage intentionally has no terrain/world-impact service, map, live audio mix, or match camera. Those absent services are explicitly silent; the UI does not fabricate their measurements.
- Production-only state interruption, AI choice, projectile ownership, and schema normalization were tested and changed independently by the controller. Studio consumes those public behaviors but does not claim ownership of their implementation.
- Unsupported attack types remain visible and selectable so the author understands the kit, but this slice does not expose misleading controls for fields the public tuning schema does not support.
