# Power World paired hold integration — 14 September 2026

Workspace: `D:/lsw/.worktrees/combat-release-review`, branch `codex/playable-integration`.

## Changes

- Live rear holds and friendly underarm carries retain same-facing orientation. Front clinches remain opposing. The same rule is used while turning, carrying and orbiting a carried target, and in the Animation Library.
- The library has a separate **Rear hostile neck hold** alongside the existing front hostile and friendly holds. Preview uses current modular roster appearances.
- Replaced fixed 3.3-unit root separation with stable rest-body spacing: 18% of the smaller rest height for rear holds, 24% otherwise, with a 30% correction for the receiver's excess height and a 14% lower bound. This is synchronous rig data, not an asynchronously loaded model or animated head position. Legacy bodies without the rig retain their old fallback. Actual simulation carry sweeps still constrain motion against the environment.
- A final modular two-joint arm solve targets the receiver's neck for rear holds and shoulder/underarm for front/friendly holds. It preserves bone lengths and never moves collision roots. A final post-actor contact update avoids entity-order lag. The free rear hand rests unless a punch or ranged channel owns it.
- Conscious rear receivers raise their hands to pry at the grip and move their head slightly. Stunned/sleeping receivers have slack arms instead. Frozen poses are not overridden.
- The **Air stunned** editable candidate now moves hips, spine, neck, arms and legs. This library candidate is not claimed to replace the live lost-control controller or prove its landing transition.
- Medkit activation now uses the confirmed IFAK recording imported from local `codex/audio-all` commit `f659822ae8cbd081fc00a697731527b1b6e6da17`. Exact MP3 hash and original manifest entry are in `public/audio/ai-pass/final/gear-ifak.provenance.json`. The audio branch was not merged wholesale. Its two handoff documents now flag their older unwired claims and current integration status.

## Evidence and limits

The facing regression initially failed four rear/friendly cases and passed the two front cases. After the shared facing fix all six pass; preview tests cover front, rear and friendly orientation without spending resources.

Production-GLB contact tests cover Vegas holding Merc, Vegas or Rage in front, rear and friendly modes at 0%, 25%, 50%, 75% and 100%. They require actual hand-target gap below 0.05 world units, fixed bone lengths and disjoint CPU-skinned torso/waist bounds. The test runs the holder before the receiver, then the final contact update, to exercise ordering. It also checks slack receiver hands under stun. Isolated solver tests cover scales 4/5/6, free-arm preservation and unreachable targets.

An initial 3.3-unit spacing left rear contact more than a unit short. Reducing spacing too far on Rage made the core meshes overlap; that option was rejected. Current passing clearance on the larger pair is narrow. This is evidence for these tested pairs, not all roster combinations, giant transformations, costume accessories or every limb surface. Opponent hand/forearm contact and full neck-wrap artistic acceptance still need visual review across sizes.

Browser inspection covered current Vegas/Merc rear hold from side/front/back, receiver reaction and the revised air-stun candidate. No new complete gameplay proof video was recorded. The hold preview is still not an entry/capture/throw simulator.

## Next acceptance sequence

Use the Threat Room with current modular models: flying rear acquisition -> hold while travelling -> teammate projectile intersects held body -> aimed throw -> collision damage -> conscious/stunned airborne response -> landing/get-up. Include interrupted hold, failed lift and ordinary ground pickup/throw. Preserve the user's preferred source clips and add further melee/weapon clips after these transitions work.

The full goal remains active: broader flight/combat animation integration, weapon families, Thermavari and Dec-52 creature behavior, effects and remaining audio wiring are not completed by this pass.

**117 combined tests passed; production build passed** (existing bundle-size warning remains).

Logs: `artifacts/paired-contact-integration-tests.txt`, `artifacts/paired-contact-integration-build.txt`.
