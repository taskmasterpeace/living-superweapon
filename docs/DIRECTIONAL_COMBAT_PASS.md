# Directional combat motion — September 7, 2026

This pass changes the production pose pipeline and beam-contact feedback, not maps, camera calibration, damage values or bot difficulty. It does not claim full BFP parity or a finished character-art catalog.

## Implemented

- Grounded visual heading follows travel, with bounded separation from gameplay facing. Shoulder/head/hand aiming is independent. Source walk/jog/sprint continue through ranged casts, including ordinary rifle fire; source hip counterrotation is restored.
- Retreat derives reverse playback from the existing source takes. It is not a newly imported backstep. Guard, punch, grab, flight and incapacitation retain exclusive state ownership.
- Upper-body layers restore both position and rotation before the next sample and before changing form. Ground support is not rotated again by a delayed combat carrier. Guard entry keeps the displayed chest/arc facing the threat.
- Palm/two-hand reach targets keep the forearms outside the moving ribs. Neck aiming is constrained by a torso-relative look cone, preserving compatible gait roll; the torso supports steep shots. Sharp aim reversals use bounded shoulder turning.
- Editable `castStyle`: automatic, optic-focus, palm, two-hand and chest-brace, validated against the actual emitter. Chest BeamHose origin now follows the real chest socket. Charging selects its pose independently of energy consumption, including TITAN's infinite core.
- Accepted beam hits pulse the existing contact fan, positional sound and upper-body recoil at most once per 0.18 seconds per beam/target. Blocked contact is smaller and has a different sound/color. Misses, rejected damage and remote-authority targets do not claim local recoil. No new per-tick hitstop/stun or physics controller was added.
- Existing KO Verlet ragdolls, hit reactions, strength-scaled beam pressure and melee impact systems remain. This pass does **not** add a new nonlethal ragdoll state.

## Studio

Attacks → actual slot → Beam pose / Attack pose. The editor exposes only compatible presets, and profile/package validation preserves the choice. Fighter motion provides bounded ground left/right/forward-and-return rehearsals. The stage uses the same Fighter, power dispatch, traveling projectiles and measurement target as production; it is not a posed mockup or an AI fairness test.

## Reference distinctions

- [Marvel Cyclops character material](https://www.marvel.com/characters/cyclops-scott-summers): the official character image was visually inspected for the focused head/eye line. Optic-focus's hand-at-temple pose is an original archetypal interpretation, not a claim that this exact gesture appears in that image.
- [Marvel Avengers Unlimited preview](https://www.marvel.com/articles/comics/avengers-unlimited-infinity-comic-new-story-arc-kaiju-war-preview): the publisher's preview page 4 was visually inspected. Iron Man's extended open palm, opposite arm drawn back and forward line of action informed the asymmetric palm pose. This is a design inference from a static panel, not animation timing extracted from comics.
- [DC Superman character page](https://www.dc.com/characters/superman): primary character reference for heat vision and flight. Its power taxonomy supports keeping eye emission separate from hand/weapon aiming; the pose implementation is original.
- Ground timing and articulation still come from the retained CC0 Quaternius source file `assets-src/quaternius/AnimationLibrary_Godot_Standard.gltf`, not comic artwork. Source takes, duration, sampling and provenance are recorded in [the locomotion report](AUTHORED_LOCOMOTION_PASS.md). No copyrighted panel, character texture or third-party controller code was added.

## Verification and limits

`npm run test:directional-combat` is the repeatable focused gate. It covers real Fighter gait/aim and geometry, moving elevated actual hoses, energy-infinite chest charge, contact acceptance/rate limits, editor validation/package round-trip, real movement/fire input and actual Studio slot authoring. Broader source/skin/weapon, guard, melee and pose regressions remain separate gates.

`tools/directional-motion-review.mjs` records complete moving casts and captures front/both sides/rear plus the real TITAN Studio path. `tools/ground-motion-review.mjs` compares source/target phases and continuous walk/jog/sprint loops with floor and armed SARGE. Outputs are under `artifacts/directional-motion/` and `artifacts/locomotion/`. These are inspection cameras, not fresh BFP camera-match evidence or foreground performance benchmarks.

The animation-authoring acceptance matrix drove actual-source comparisons, fixed-length/contact checks and interruption testing. Impeccable kept the new controls inside the existing Studio inspector; independent UI review also caught a multi-beam preview/inspector slot mismatch. Remaining limitations: no arbitrary animation import, no dedicated eight-direction or weapon-carry clips, no full foot-lock/stride-warp solver, and no claim that all equipment/body combinations are free of clipping. Representative rendered forearm/fist/trunk tests cover both sides at three scales; existing armed/source-body regressions complement them.

### Completed verification

- 141 focused runtime/data/skin/package checks and 120 source/strike/flight/guard/profile checks pass. The profile suite includes its existing real-browser all-roster pose comparison.
- `npm run test:poses`: all six production-browser gates pass, covering high/vertical emission, hold pressure, overlap, interruption, hand presentation and 30/60/120 Hz tracking.
- Live browser checks pass: `directional-live-check`, `ground-live-check`, `ground-studio-browser`, `strike-studio-browser`, `moving-melee-browser`, `block-live-check`, `hit-reaction-check`. These include actual keyboard/mouse input, light/heavy punches on ground/in air, guard crush, rear hits, KO ragdoll and recovery.
- `attack-pose-browser`: VEGA/TITAN multi-beam sync, actual charging/firing pose, emitter reset, Undo/Redo, Save/reload, UI package export → fresh-context import/reload, 390px layout; no page/console errors. User localhost drafts were not used for tests.
- Moving-cast recording: `artifacts/directional-motion/moving-casts.webm` (four eight-second simulated cast cycles, multi-angle inspection and actual TITAN chest charging). Script results: four casting styles, real damage/recoil, chest-brace charge, no page/console errors.
- Fresh source comparison: `artifacts/locomotion/page@8488c844b2693234b5e475b72428f7f5.webm` and `review-results.json`; walk/jog/sprint 0/quarter/half/three-quarter/end/two-cycle phases, side/three-quarter playback, armed SARGE in four views. Sequences and rendered frames were inspected. This supersedes older ground comparison recordings for this code version.
- Production build passes (235 modules). Existing large-chunk warning remains. Scoped syntax and whitespace checks pass.

No claim of a foreground frame-rate benchmark: headless recordings are inspection material, and an existing browser case inside the profile test suite overlapped part of the moving-cast recording. No source changes or development reloads interrupted the completed recordings.
