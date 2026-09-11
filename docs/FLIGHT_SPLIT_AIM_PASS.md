# Independent airborne aiming — September 8, 2026

This pass advances the active movement/aim objective. It is not whole-game, full-anatomy, or 10/10 acceptance. No gameplay camera, map, movement physics, control binding, damage, beam steering parameter, or saved character draft changed.

## Reproduced and repaired

The directional shoulder overlay only ran on the ground. In flight the visual root followed the attack, so even a perfectly aligned eye beam left the pelvis and legs facing across their travel. All **24 initial real-Fighter side-flight tests failed**: optic, palm, chest and rifle; both directions; 30/60/120 Hz.

`directional-pose.js` now gives an airborne ranged action its own bounded visual travel heading. The existing advance/retreat hysteresis and shoulder compensation are shared; `_flightHeading` is separate from `_groundHeading`, so airborne firing does not enable a ground stride. Extreme rear aim still uses retreat rather than an impossible 180-degree waist/neck twist. `entity.js` applies the existing threat-side half-turn tie to either movement state. Unarmed flight families and saved joint defaults are unchanged.

The actual torso/optic hose direction remains the relevant body emitter's reference. Head, chest and hand/weapon articulation still use their existing final solves. This is presentation, not a second movement controller or redirected beam trajectory.

Independent review reproduced another failure: repeatedly switching a live chest attack from lateral velocity `(40,0,0)` to near-vertical descent `(.9,-30,0)` dropped the directional carrier at the horizontal-speed threshold. The chest correction then chased the unwinding shoulder base, producing **12.21° / 18.07°** error in the new 60/120 Hz regressions. The same airborne aiming carrier now persists through that attack's braking/vertical handoff and clears on release, exclusive-state takeover, landing or rig replacement. Stationary-only hover attacks retain their previous behavior. All twelve new handoff cases pass.

## Studio

In a Beam or Attack sequence, **Fighter motion** now offers airborne left, right and forward travel-and-return. These are bounded, explicitly labeled rehearsals against an anchored target. Downward target elevation remains allowed in the air; switching to ground clamps it to the floor-safe range. This does not grant gameplay flight to a grounded character. Actual UI checks confirm selection, real beam emission, paused-position stability, ground/hover transitions and unchanged character data.

## Verification

- `tools/flight-split-aim.test.mjs`: **72/72**. Includes 24 independent-heading cases, 24 visible forearm/fist/equipped-gun vertex checks through turns/release at .65/1/1.5 scale, 12 braking/guard/landing cases, and 12 sustained lateral/descent handoffs. These are bounded torso-volume tests, not a full convex gear collision certificate.
- Three new airborne Studio tests first failed, then passed; `attack-pose-authoring.test.mjs` now **12/12**.
- `npm run test:flight-aim`: **152/152 Node checks**, Studio UI checks, actual game keyboard/mouse checks at 30/60/120 Hz, and both final recordings pass with no browser errors.
- Broad runtime/data/rig suite: **840 tests, 836 passing, four failing**, exit 1. The same retained cloth failures: resting contact creates inward Verlet velocity; rest dimensions derive from flutter; settled cloth keeps uploading; 120 Hz landed jitter. None was weakened or skipped.
- `tools/studio-profile.test.mjs`: **18/18**, including every shipped character's untouched production flight joints.
- `npm run build`: passes, 257 modules. Existing large-chunk warning remains: shared Studio-profile bundle **4,936.11 kB / 1,755.46 kB gzip**.
- Read-only independent review: **123 tests**, **36 travel-transition fixtures**, and **72 carrier-latch/ownership checks** pass. Its exact reported chest handoff now peaks at **.00236°** error; guard/strike/grab/landing/release clear support and genuinely stationary attacks never acquire it. No remaining important scoped finding. This is not broad anatomy or AAA acceptance.

Actual F-toggle, D-flight and mouse-fire input moves SOL over **109 units**, retains pelvis/travel dot product at least **.9806**, and eye/ray dot product at least **.9999965**. Release recovers the attack and brakes to zero. These checks step simulation with rendering disabled; they are not a frame-rate benchmark.

## Evidence and visual criticism

`artifacts/flight-split-aim/before/` is the actual pre-change capture. `work-in-progress/` is superseded. Final footage:

- `artifacts/flight-split-aim/final/flight-split-aim.webm`: 240 frames, native SOL optic attack. Matched side-cast pelvis/travel alignment improves from **−.0041** (almost perpendicular) to **.9818**. Maximum eye/ray error over the turns is **.793°**.
- `artifacts/flight-split-aim/final/chest-handoff/flight-split-aim.webm`: 240 frames, explicitly labeled configurable chest power on the SOL rig. Maximum chest/ray error **.00131°** through repeated travel/descent changes.
- `artifacts/flight-split-aim/studio/`: actual rehearsal-control captures with the visible measurement target and production chase camera.

Final side, elevated and rear-transition frames were examined alongside their sequence data. The travel/attack split is readable. The cape still dominates and obscures the rear silhouette, the belt reads as a thick detached ring, shoulder volumes remain blocky, and rapidly redirected hose geometry shows angular bends. Those are remaining quality problems, not proof of polished AAA art. Inspection videos use a fixed-position/velocity articulation fixture and inspection camera; actual Studio motion and real game input are verified separately. No timing, audio, BFP-framing or target-hardware performance certification is implied.

Game Studio's shared-runtime and playtest workflow kept the editor on production poses. The animation-authoring skill required temporal, rendered-surface and source/lifecycle evidence. Existing BFP/source provenance remains in `reference/BFP_CAMERA_AND_POSE_SOURCES.md`; no new BFP code, comic panels or animation assets were copied/imported during this pass.

## Still open

The complete direction/elevation/speed/custom-proportion matrix; incompatible simultaneous live eye/chest directions; occupied offhand and full weapon contact; dedicated directional/pivot animation assets and foot-slide audit; cloth settling and garment shape; shoulder/waist/cape art; dense-combat performance; creator play-feel acceptance. The full objective remains active.
