# Death & Reaction Presentation Set — integration guide for Codex

*Mission A output, Mac asset lab, branch `asset-lab-death-set`. Nothing here requires
opening Blender; everything is JSON + PNG evidence.*

## The three files you consume

1. **`public/models/modular-hero/death-reaction-registry.json`** — the resolver
   contract. 20 slots keyed by stable slot id (`death.impact-front.a`,
   `knockdown.impact-front.heavy`, `getup.from-supine`, …). Each satisfied slot gives:
   which bank file + `bankId` + `take` holds the clip, entry posture, **impact
   direction**, reaction type, final orientation, duration, root-motion policy,
   use case, ragdoll-handoff parameters, retarget concerns, and evidence frame paths.
   Slots with `status:"awaiting-source"` are intentionally empty until the purchased
   library transfers (`docs/TRANSFER_REQUEST_ANIMATIONS.md`) — resolve them to the
   nearest satisfied slot at runtime until then.

2. **Clip data** — already in the banks the runtime knows how to load:
   `warworld-motion-bank.json` (UAL-derived clips) and `paid-motion-bank.json`
   (purchased KG get-ups). Format is unchanged `Three.AnimationClip.toJSON`; attach the
   same way `attachPaidMotionBank` does today. No new pipeline.

3. **Evidence** — `artifacts/asset-lab/death-reaction-evidence/<take>-<view>-<phase>.png`
   (front + side × phases 0/.25/.5/.75/1 for all 11 satisfied slots, captured on the
   actual modular rig via `animation-library.html`, checkout-stamped).

## Resolver sketch (runtime side — yours)

On lethal damage: pick by (entry posture, impact direction relative to facing):
front→`death.impact-front.a`, rear→`death.impact-rear.a`, left/right→**fall back to
front/rear until the KG pack lands**, airborne→`death.airborne.fall` chain
(hold `fall.loop` while airborne; play `impact` on ground contact). Non-directional
attrition→`collapse.weakened`. Nonlethal heavy→`knockdown.impact-front.heavy` then the
paired get-up (`pairedGetup` semantics in `death-presentation-set.json`; registry
use-case text names the pairs).

## Killing the spinning ragdoll

Per slot `ragdollHandoff`: play the death clip **to completion** (`trigger:
clip-complete`), then hand the final pose to physics with ≤120 ms blend, angular
velocity clamped to **6 rad/s** (grounded settled endings: **2 rad/s**), linear damping
0.92 / angular 0.95. All grounded deaths here end flat at hips ≤0.22, so the ragdoll
receives an already-settled body — it should twitch, not helicopter. If an external
force displaces the body mid-clip, abandon the clip and go full ragdoll from the
current pose.

## What NOT to infer

- No left/right-impact death exists on this Mac yet; do not mirror clips as a fake
  substitute without a visual pass — mirroring is a candidate technique, unproven.
- `collapse.weakened` (IdleToLay) reads as lying down; gunshot deaths must not use it.
- `getup.kipup` is heroic — gate it away from ordinary Highwall soldiers.
- Registry `loop:false` everywhere: repetition (airborne fall loop) is a runtime
  decision by airtime, not a clip property.

## Regenerating anything

```bash
node tools/build-warworld-motion-bank.mjs        # UAL clip bank
node tools/build-death-presentation-set.mjs      # computed fall/pose data
node tools/build-death-reaction-registry.mjs     # the registry (this contract)
PW_URL=http://localhost:5180 node tools/death-reaction-evidence.mjs <takes...>  # rig evidence
```
