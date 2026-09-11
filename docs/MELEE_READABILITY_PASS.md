# Close-contact readability

September 6, 2026. A bounded presentation correction, not game/editor acceptance.

## Cause and change

The camera could geometrically frame an opponent while impact cosmetics hid the
actual reaction. A punch stacked a filled white star, a flash sphere, a thick white
ring, two large particle sprays, a second generic damage flash and a long whole-body
emissive pulse. Blocks added another rejection star; parries added another ring.

Close-camera `VFX.impact` now uses one short contact kernel and a single mesh of thin,
tapered outward streaks. Small directional particles follow the full 3D attack axis.
Strength changes the spread and length rather than filling the center with white.
The existing distant/isometric impact branch, explosions, charge scaling, beam hoses,
damage, knockback, sound, hit-stop and slow-motion rules remain in place.

Swept-fist resolvers mark their damage with cosmetic-only `contactFx` ownership.
The generic damage and block-rejection handlers do not add duplicate flashes for
those contacts. Guard crush intentionally does **not** acquire the gameplay `strike`
flag: that would change guard/Overdrive semantics. Power World contact hitFlash peaks
at 0.3 and decays through the existing clock; sustained-hit and projectile rules stay
separate. Blue block and gold parry/crush feedback remain distinct.

The guard surface itself also hid the defender. Power World uses a translucent
normal-blended blue-to-red surface, with the gold deflect identity preserved. Full
barriers draw their outside faces only so the front and rear walls do not both tint
the wearer. City materials, opacity and double-sided policy restore explicitly.

Contact effects snapshot their world position. The existing transient lifecycle
removes meshes and disposes geometry/materials; no new lights or persistent rig
children are introduced. Material side changes invalidate once, not every frame.

## Verification and its limits

- `npm run test:impact-visibility` runs real SOL contacts against KANO: jab, cross,
  heavy, block, parry and crush at three simulation ages, plus RIME barrier and
  VANGUARD deflect samples. It uses the production chase camera/HDR renderer.
  Paired images hide anatomy while leaving the shield rendered, measuring the
  opponent's contribution through the effects. The initial probe failed six
  cases; a corrected mask subsequently exposed the two-wall barrier problem.
  Final run: 20 samples, no failures/page errors. Post-contact retention was at
  least 71.3%, and white pixels occupied at most 1.2% of the anatomy mask. These
  are image-contribution measurements, not percentages of a character's surface.
- `npm run test:impacts` covers recoil, contact altitude, 36 physical contacts/misses
  at 30/60/120 Hz and the keyboard controller path. `contact-fx-check.mjs` additionally
  covers mutable position inputs, vertical effects, disposal and guard material
  restoration/version stability. Mutable inputs failed before snapshotting.
- Camera framing/input/HUD-safe-area, beam poses, sustained feedback, Studio/ORIGIN,
  all 371 kit checks plus 42 world checks, and the production build were run during
  this increment. The 30-second combat soak recorded 1,377 hits and 18 KOs with no
  invalid states or page errors. These are correctness checks, not balance ratings.
- Independent read-only review checked effect ownership and disposal, then caught
  fixture isolation and shield-mask problems. Both were corrected. No gameplay
  defect was identified in the scoped cosmetic changes.

Visual artifacts live under `artifacts/flight-review/melee-visibility/`. Ages in the
pixel checks are **simulation time**, not wall time with slow motion. The single
inverted impact frame and HUD are excluded from that anatomy test. The original
before probe predates the corrected shield mask, so its guard retention numbers
must not be used as an exact numerical before/after comparison.

`node tools/melee-contact-reel.mjs --readability` records six scripted exchanges from
the production chase camera with the HUD visible, applying the existing slow-motion
clock to the fighter/effect simulation. The silent 12-second recording is
`artifacts/flight-review/melee-readability/melee-readability.mp4`. It is not an AI
match or a foreground-performance benchmark.

## Still open

The procedural bodies and hands still need stronger art direction. Moving combat
across the roster, the very-close underfoot camera occlusion, and Studio's missing
opponent/attack preview remain acceptance gaps. The full-HUD recording also still
shows the left KIT panel overlapping the player heading. Maps were not changed.
An interior-camera view omits the barrier's inner wall by design; that extreme
camera position is not an accepted gameplay view.
Passing the checks does not establish BFP feel or broad readiness.
