# Creator status — 10 September 2026

This is an evidence-backed status and proposed order, not a completion certificate. Air combat is deferred by the creator. The newly supplied HUD text is the layout authority.

## HUD implementation addendum (after the five-minute report)

The newly pasted HUD request was subsequently implemented in PowerWorld: fixed portrait cluster, actual HP/energy/normalized guard values, current form portrait, active timed effects, damage trail, localized energy/critical warnings, explicit guard-break lifetime, and flight-only km/h/boost text. No permanent XP or speed bar. Native Practice startup, walking with a fixed anchor, takeoff and four viewport sizes passed with no reported page/runtime faults. Form/damage/guard/boost states were presentation fixtures, not proof of earning those states through combat. Seven state tests plus 47 existing block/melee tests passed. Desktop evidence: `artifacts/player-status-2026-09-10/desktop.png`. This supersedes the older HUD status paragraph below; nine guns, inventory and complete audio wiring remain unfinished.

## Exact open problems

| Item | Observed result | Remaining work |
|---|---|---|
| Close-body charged beam | In `beam-wave-readthrough`, a short KANO charge produced zero hits and a pending-looking tip at [0,0,0] for about 2.3 seconds. An offset attempt worked. | Trace hand readiness, launch admission and captured target. The successful offset does not resolve the failure. |
| Held beam ends early | In `beam-wave-readthrough-sequence`, 34 contacts and 0.992 receiver brace were recorded before the beam disappeared while input was still held. | Record explicit end reason, energy, input and caster/target life state. Cause is not yet isolated. |
| Beam blocking comparison | Three hostile test routes produced no incoming beam; another produced 90 unblocked hits and killed the defender before a controlled guard comparison. | Repeat with reliable attack acquisition and compare identical guarded/unguarded exposure. Do not interpret absent attacks as a broken guard. |
| Successful beam samples | Thin SOL ray: 146 contacts. Short charged KANO beam: 105 contacts with a visible raised-arm reaction. | These demonstrate working paths, not universal reliability. |
| Scoped rifle | Hidden city pedestrians were intercepting rounds in a no-civilians theatre. Fixed ballistic travel, impact and blast eligibility. | Latest wide and portrait recordings each show three physical target hits around 211 units, 31 damage each, no civilian hits and no reported faults. |
| Soldier presentation | Crouch, prone, scoped fire and phased reload have evidence. | Models remain visibly procedural; nine distinct completed guns and a usable inventory are not delivered. |
| Flight collision | Swept fighter-body and building contact exists; building test stopped a roughly 74 u/s flyer at the boundary. | Extreme diagonal poses still use conservative body bounds; not perfect limb collision. Ordinary self-collision does not automatically inflict slam damage. |
| Flight speed | Low-flight widening dust wake works and is Studio-configurable. | Three selectable flight-speed stages and their HUD feedback are not delivered. |

## Sound harness: actual coverage

Catalog inspection: **79 cues; 66 preview-only, 11 native-replacement, 2 native-loop**. Catalog presence does not mean a chosen recording plays during the corresponding gameplay event.

The library supports synthesized auditions, chosen local recordings, import/export, generation descriptions, gain/loop settings and suppression diagnostics. Connected entries include light/heavy melee, grenade preparation/release, reload preparation/eject/insert/chamber, empty trigger, scout gunfire, vehicle destruction, helicopter and jet loops. Latest rifle evidence logged three gun reports and four accepted reload-phase cues; this does not prove every selected-recording replacement end-to-end.

Speech gates include an eight-second global gap, 45-second default line cooldown, 12-second category cooldown, three-second stale-event expiry, and differing speaker cooldowns (for example VEGA 24 seconds versus DECIBEL 10). Synthesized dialogue markers do not speak the authored lines.

Required coverage ledger for the next implementation:

- Attacks: charge, release, sustain, contact, miss, block, deflect, clash, cancellation and exhaustion, with distinct thin-ray and broad-beam directions.
- Melee: light/heavy contact, anticipation, grab, throw, recovery, living knockdown and body/ground/wall impacts.
- Movement: surface-appropriate steps, crouch/crawl, takeoff, hover, flight stages, braking, landing and a single sonic-threshold boom.
- Nine guns: separate reports and mechanics, dry fire, reload phases, ricochets and material impacts. Grenades need preparation, release, bounce and explosion.
- Web/grapple: launch, attach, tension, reel, detach and failed attachment. Teleport, shields, constructs and nanites need their complete creation/hold/contact/break/end sequences.
- Inventory/equipment, objectives, blood recovery/research, correspondent recording/playback and character/radio dialogue.
- Vehicle audio remains cataloged; new air-combat implementation is deferred.

For each cue track three separate states: authored/auditionable, runtime-connected, and recorded replacement verified. Never report the first as all three.

## Nine guns and inventory recommendation

These are proposed gameplay identities, not nine finished weapons or a claim of exact JA2 data reuse.

| Family | Proposed weapon | Distinct role |
|---|---|---|
| Shotgun | M870 | Strong pump shot, deliberate cycling, individual shell loading |
| Shotgun | SPAS-15 | Faster semiautomatic follow-up, magazine reload |
| Shotgun | CAWS | Heavy automatic close-range suppression, strong recoil |
| Assault | AK-74 | Controllable sustained fire |
| Assault | C7 | General-purpose rifle with useful burst mode |
| Assault | AUG | Compact handling and faster ready time |
| Precision | Dragunov | Semiautomatic precision and rapid corrections |
| Precision | M24 | Deliberate bolt-action, powerful single shot |
| Precision | Scoped M14 | Flexible marksman rifle between assault and sniper |

Use one small inventory surface accessible by an inventory key and by interacting with an armory crate. Show primary, secondary, grenade, gadget, magazine/reserve ammunition and a concise weapon comparison. Carry two guns, not all nine. Field inventory swaps carried equipment; an armory changes the loadout. Keep the existing mouse-wheel attack-selection ownership coherent; do not silently replace six power slots with nine gun hotkeys.

## HUD authority

The creator already supplied the image; the existing HUD does **not** implement that composition. Latest pasted specification supersedes a generic corner-panel interpretation:

- Fixed screen cluster above and slightly left of the player, clear of character and reticle.
- Cutout current-character portrait, level badge, tightly stacked HP (green), energy (cyan), guard (gold), actual current/max values.
- Damage trailing segment and restrained local warnings; guard is not armor.
- Compact real form/state label and only active timed status icons; no permanent XP or speed bar.
- Ability controls remain lower-right. Flight-only stage/speed information disappears when irrelevant. No annotation boxes or invented currency/progression.

## Flight behavior recommendation

Three readable states: Combat, Pursuit and elite-only Breakthrough. Shift starts boost immediately; successive quick presses escalate. Each stage increases energy demand and turn radius, with an explicit brake/reset. Use restrained FOV change, wind, motion streaks and the already-working dust wake; one sonic boom on threshold crossing, not repetitive screen shake. Physical speed/Mach labels require consistent world-scale calibration.

At ordinary wall contact, brake or slide. A deliberate boosted strike into an enemy transfers momentum and produces a short recoverable knockdown, respecting strength and guard. A building only permits passage when its destructible section actually breaks. Do not make every incidental touch a damaging ram.

## Report results and limitations

- Civilian-theatre regression: nine tests pass; associated rifle/ammo/prone/projectile checks and production build passed in the preceding implementation pass.
- Relevant beam suite: 239 passing tests, while the live lifecycle failures above remain open.
- Dust wake suite: 65 passing tests; native low flight showed the widening wake and climbing beyond the cutoff removed it.
- Terrain LOD sample: roughly 23,616–24,992 drawn triangles versus 96,256 source triangles, approximately 74% fewer; bounded three-entry cache.
- Performance workload was **not accepted as the final benchmark**: a mixed run had four clones, four aircraft, 119 projectiles and one beam but no explosions, plus KO/respawn. Recorded phases were 92–162 FPS with 20.6 ms attack p95 and a 179.4 ms worst frame. Changing quality/workload and first-use stalls prevent a stable-performance completion claim.

## Recordings

These are existing native-input test captures, not newly fabricated demonstrations. The scoped-rifle video is 1600×900, 28.28 seconds, and contains video only. The other browser captures should also be treated as silent unless their audio stream is explicitly verified.

- [Scoped rifle, reload and stances](../../artifacts/precision-rifle-civilian-fix-native/precision-rifle.webm)
- [Portrait-width rifle route](../../artifacts/precision-rifle-civilian-fix-portrait/precision-rifle.webm)
- [Broad charged beam contact](../../artifacts/beam-wave-short-diagnostic/native-beam-contact.webm)
- [Thin beam receiver reaction](../../artifacts/beam-receiver-readthrough-after/native-beam-contact.webm)
- [Low-flight dust wake and editor](../../artifacts/surface-wake-native-06/native-flight-and-editor.webm)
- [Building flight contact](../../artifacts/fighter-environment-native-runup/native-environment-contact.webm)

## Recommended order

1. Implement the supplied compact HUD and make existing states legible.
2. Fix the two beam lifecycle failures and complete reproducible contact/block tests.
3. Complete one rifle and one shotgun end-to-end, then the inventory and nine differentiated guns.
4. Wire and verify the complete sound ledger alongside each system, including actual audio capture.
5. Add hero flight stages, braking and intentional collision attacks; retain readable dust.
6. Repair remaining web/grapple paths, improve infantry orders and formations, then revisit deferred aircraft work.
