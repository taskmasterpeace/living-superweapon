# Anatomical volley firing — September 7, 2026

This pass fixes an actual missing delivery method in the independent-movement goal. It does not certify the whole animation system as complete.

## Defects and implementation

The existing alternating volley emitted from the right-hand muzzle plus a lateral offset. A real-Fighter regression measured the first supposed left-hand shot 7.76 units from the rendered left hand while strafing, and about 3.7–3.8 units away in airborne fixtures.

`handPattern` now selects `alternate`, `paired`, `right`, or `left` on a volley. The command records which hand fired, the intended target and its one gameplay spread draw. After the fighter's final pose, a one-time launch solve samples the actual hand socket and aims from that socket toward the captured target. Already-emitted shots never follow later hand or mouse movement. The muzzle flash uses the same resolved origin.

Paired fire emits two independently colliding shots and pays twice the per-shot energy cost atomically. It cannot half-fire when only one shot is affordable. The HUD displays that total cost and a distinct paired-shot icon. Studio → Attacks → Firing hands exposes the choices; the existing validated profile/package seam persists them. Explicit choices remain pinned when companion one-hand flags change. Bow-gear volleys default to their left grip, explicitly one-hand volleys to the right, and ordinary energy volleys alternate.

Both ready palms track the target. Emission timestamps drive separate arm recoil; alternate fire offsets the recoil phases, while paired fire recoils together. The existing source gait continues underneath. This is a procedural combat overlay, not a newly imported animation clip. The retained walk/jog/sprint source and provenance are described in [the locomotion report](AUTHORED_LOCOMOTION_PASS.md).

Full-sequence rendered-volume tests then exposed forearms entering the torso on airborne recovery. The defect was in shared flight targets: left/right roll signs pointed the forearms inward. The default martial-family lanes now flare outward throughout hover, travel, strafe, braking and boost. Family-specific overrides and explicit saved joints remain authoritative. No geometry was shrunk, hidden, or teleported to pass the tests.

Independent review reproduced two launch-order problems and an authoring defect. A first-frame portal could be undone by late hand resolution; launches now finalize before portal processing. Parallel directions copied from the right muzzle made the left palm miss a close target by 2.68 units; per-hand target convergence fixes that. Sparse serialization discarded a valid explicit right-hand selection after the one-hand flag changed; derived hand choices now remain explicit.

## Evidence

- `tools/volley-hands.test.mjs`: 21 checks covering grounded/airborne socket origin, launch ownership, steep elevation, separate recoil, palm aim, source gait, release, atomic pair payment, actual portal transfer, close-target convergence, editor persistence and rendered forearm/hand clearance through six entry/recovery combinations. Original origin, paired-fire, authoring, recovery, portal and convergence regressions were observed failing before their fixes.
- `tools/volley-hands-browser.mjs`: real Studio selector and production command → animation → projectile pipeline, alternating/paired × strafe/flight, 162 launches with zero origin mismatch. Continuous recording includes entry, sustained fire and recovery. Fixed-position inspection is deliberately labeled; it is not gameplay-camera, movement-physics or real-time performance evidence.
- `artifacts/volley-hands/hand-patterns.webm`: the review recording; adjacent PNGs expose palms, firing and flight recovery. `studio-firing-hands.png` shows the actual editor control.
- Existing hero-hover, six flight-language, trails, profile and attack-authoring checks pass. Integrated verification details are in [the controls/correspondent report](DUAL_TRIGGER_AND_CORRESPONDENT.md).

## Remaining goal work

Simultaneously active abilities still arbitrate through one dominant ranged-pose slot; eye-plus-hand combinations need separate head/arm channel ownership. Combined two-hand beams and charged orbs need an origin audit distinct from this two-projectile volley. Dedicated directional/occupied-hand source clips, custom equipment clearance, wall-adjacent emitter clearance, and a complete grounded/jump/hover/high-speed/vertical-flight matrix remain required. These are not waived by this pass's green tests.
