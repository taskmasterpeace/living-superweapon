# Dual-trigger combat and field coverage

September 7, 2026. Extends the existing Three.js runtime; no map or gameplay-camera redesign.

## Controls

- Wheel selects the attack fired by LMB, in every control layout (including saved Classic).
- Hold RMB and scroll to select the independent RMB attack. Release after selection, then click to use it.
- RMB has a 150 ms gesture window measured in unscaled input time, so impact slow-motion cannot stretch the control delay. A quick tap fires on release; holding starts the selected attack after that window. A late scroll cancels an already-started preparation/channel without firing the newly selected attack. Energy already spent is not refunded.
- A held primary attack cannot be remapped. Release plus scroll in the same simulation frame delivers the release to the original attack; scroll again to select.
- Keyboard Q/E/H/R and gamepad direct powers remain available. Selecting away does not cancel a channel still owned by another held input.
- Arena V selects punch/heavy on LMB and grab/throw on RMB. Either trigger can subsequently select a power independently. C still blocks. Brackets swap heroes; Classic also retains number keys.
- Fast clicks receive one held tick; deferred releases retain their originating attack, even across a subsequent selection. Release/repress between simulation frames starts a fresh trigger without inheriting a consumed selector hold.
- Pause, menu and focus loss cancel held preparations, beams and melee input rather than losing a release edge while the simulation is paused. Network cancellation events flush before pause instead of waiting for a future simulation tick; this transport behavior has local regression coverage, not a live multi-machine session test.

The HUD shows two trigger identities, names, readiness/cooldown/unlock information and original attack-mechanic silhouettes. Eye rays, chest emitters, cones, projectiles, firearms, charged orbs, grabs and defenses have distinct shapes. Direct keyboard shortcuts remain in the compact kit below. Touch retains its existing attack rail.

## Correspondent and editor

The existing KMK 9 witness system now also covers PowerWorld. Its real operator camera captures reporter stand-ups, impact crash zooms, attacker/ascension holds, action two-shots and a bounded winner/sign-off tail. These are recorded scene frames, not reconstructed outcomes or a second combat simulation. Main gameplay camera and controls remain authoritative.

PowerWorld/Ascendance post-match reports now use the actual venue, participants and declared winner. They omit city-damage boards, invented civilian witnesses and the city-specific language-model rewrite. Ordinary city reports retain their previous coverage, protected by a regression test.

Studio → Camera → War correspondent controls project-wide crash zoom, handheld motion and attacker-shot hold. These settings save separately from a hero's profile. Export/import camera JSON moves that direction between browsers. New game pages load it; the neutral Studio stage does not simulate news crews.

Capture uses 640×360 JPEG frames, at most three pending encodes, nine clips, 360 retained frames and a 24 MiB encoded-frame budget. Sustained events cannot extend one clip beyond 5.5 seconds. Frame arrays transfer ownership through recording, report and opening; discarded arrays are blanked and URLs revoked. Late encodes hydrate the active replay rather than requiring the report to reopen. Unused opening footage is retired when a mode does not run the opening director.

This is silent visual coverage. It does not record the game's audio mix, and the field pass does not run the main bloom compositor.

## Evidence and limits

The initial focused verification passed 122 Node tests; the subsequent combined verification now passes **306**, including anatomical volley and concurrent-emitter regressions. Browser checks cover separate wheel selection and real secondary projectile fire without changing SOL, moving eye-beam fire, cancellation on pause, the RMB gesture during 0.1× slow motion, Studio camera persistence, 800/960/1440-pixel city and arena HUD layouts, moving KANO/SARGE poses, actual directional travel and aim recovery, melee/guard/grab/throw at 30/60/120 Hz, and hit-reaction recovery. These use fresh 127.0.0.1 contexts, not the creator's saved localhost settings.

The first field-camera capture exposed crude reporter anatomy and a sky far-plane error. Later visual checks drove connected crew anatomy, grounded feet, a camera that visibly points where the recorded lens points, and truthful arena-report copy. Capture evidence is recorded separately in [the field-correspondent report](FIELD_CORRESPONDENT_PASS.md). The deterministic capture bypasses background-tab frame-time throttling and is not a real-time performance benchmark.

The moving-body correction is documented in [Directional transition pass](DIRECTIONAL_TRANSITION_PASS.md): small aim jitter across the advance/retreat boundary no longer reverses the source gait and swings the legs approximately 140 degrees. Existing source-backed gait and independent upper-body aiming remain in place. Broader custom-equipment clearance, dedicated eight-direction/occupied-hand motion and full planted-foot solving remain quality work; this pass is not proof of AAA finish.

The subsequent [anatomical volley pass](ANATOMICAL_VOLLEY_PASS.md) replaces fake left/right offsets with real animated palm origins, adds paired/left/right firing and editor controls, corrects shared flight-pose forearm clipping, and preserves close-target convergence and launch-frame portal transfers. It extends the original movement/aim objective rather than replacing it with the broadcast work.

The [concurrent emitter pass](CONCURRENT_EMITTER_PASS.md) adds independent eye/hand poses, real combined-hand beam origins, deliberate casting mobility, continuous running recovery and Studio Co-fire rehearsal. Fresh build passes with the existing large-chunk warning; the overall movement/combat acceptance goal remains active.

## BFP and asset references

Re-inspected the supplied Ultra BFP 2:44 frame and current moving-cast images: low rear character placement, a clear forward aiming region and separated limbs/travel trails matter more than a still-image camera-number match. Existing flight trails and chase framing were retained.

The [BFP community recreation](https://github.com/LegendaryGuard/BFP) explicitly distinguishes its recreated/improved code from the lost original source. Its [third-person view code](https://github.com/LegendaryGuard/BFP/blob/main/source/cgame/cg_view.c) establishes a rear view offset and collision-tested camera; [movement code](https://github.com/LegendaryGuard/BFP/blob/main/source/game/bg_pmove.c) uses pitched view-basis flight intentions and separate legs animation. These are reference observations, not a claim that reconstruction timings are original BFP timings. No GPL source was copied into this implementation.

The [asset research table](DIRECTIONAL_TRANSITION_PASS.md#licensed-assets-and-controller-fit) records primary-source licenses and fit for Quaternius CC0 animation, Mixamo, and plain-Three.js controller examples. The compatible Quaternius walk/jog/sprint and strike takes are already integrated. Additional catalog clips were not silently claimed to be installed; no paid assets or replacement physics dependencies were added.
