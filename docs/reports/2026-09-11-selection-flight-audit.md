# Character selection, power comparison and flight audit

Read-only audit against code at `3c719c7`. New references: `comet_FOd3QSLMew.mp4` and the supplied Apex Legends selection screenshot. No runtime/UI edits made in this audit. Preserve PowerWorld's Impact style, original characters and centered BFP gameplay camera.

## What the references contribute

The video is 20.13 seconds and includes playback/scrubbing overlays, so it cannot establish a physical speed or acceleration curve. Around 6–9 seconds the aura and moving landscape sell travel; around 10–12 seconds the figure and terrain rapidly change scale during a burst/transition. Useful target: readable hover → committed forward travel → emphatic burst, with a clear return to hover. Do not infer input bindings or exact speed from this recording.

The selection image prioritizes face recognition, a large selected character and a concise role. Borrow that hierarchy, not its unrelated store/season chrome or characters.

## Code findings

- `pwTitle.js` renders the main roster grid as name + threat only. It already has strength/stat and lifting-capacity readouts, but no visible per-power comparison.
- `hudSelect.js` already has a separate live selected-character preview and power inspection. Its roster strip is inexpensive accent cards, not facial portraits. Improve/reuse these paths instead of creating a third selector.
- `player-status-portrait.js` already renders actual character faces. Cache and lazily reuse portrait output; do not create one continuously running WebGL renderer per card.
- `describeAbility()` in `hudUtil.js` is too generic: the new Web Darts still describes as a blast, the web snare inherits tentacle wording, and all buffs largely read as power-up/heal/invincibility. Description needs to resolve the actual flags and effects, not merely the base type.
- `heroStats()` mixes direct values with heuristic ratings. Strength is the character's actual 1–10 value; Power/Mobility/Defense are derived estimates, not measured DPS, maximum speed or damage reduction. Label them accordingly, or show their concrete source facts instead.
- Flight already has velocity-based hover/travel/brake poses, Shift-held 1.5× cruise, and an optional 0.8-second afterburner that reaches its authored multiplier (2.1× for current burner definitions). There is no requested double-/triple-tap speed-stage controller in the inspected player path.
- Open-sky desired movement speed is capped at 210 u/s. At the shared scale of 0.19 m/u, this is 143.64 km/h, before other restrictions. It is not jet/supersonic powered travel. External impulses are separate from this desired-speed limit. The existing ignition boom is timer-triggered, not an actual Mach-crossing event.
- `grabProp`, `updateCarry`, `throwProp` already cover weight admission, carrying at actor altitude, throwing and impact damage. G is contextual pickup/hoist/throw. This needs a native flight-carry-throw regression and terrain/contact review, not a second implementation. Current carry art is largely an overhead prop attachment; it does not establish polished hand contact.

## Three pilot identities

These are recommended player-facing role summaries, not claims of completed balance acceptance.

| Character | Base strength | Base HP / energy | Distinct play pattern |
|---|---:|---:|---|
| WEBLINE | 6 / 10 | 100 / 110 | Grounded web traversal and target control; pull, slow, close in and escape. |
| APEX | 8 / 10 | 145 / 120 | Charged beam pressure and sustain; trade preparation/energy for a wider attack, siphon health at close range. |
| VANGUARD | 9 / 10 | 150 / 110 | Fast eye pressure, forceful melee displacement and a short defensive power window. |

## Retained powers, in plain language

Values below are authored base values, not guaranteed final damage, healing or effective cost. Strength, talents, buffs, guard and resistance can modify outcomes. Range is in simulation units. Names are not fixed button assignments: mouse-wheel selection can change equipped triggers.

| Character / power | What it actually does | Why choose it / what differs | Base energy |
|---|---|---|---:|
| WEBLINE — Web Snare | Traveling wrist web seizes and reels one foe, ending in a 13-damage impact; range 38. | Bring the foe to you; unlike Web Darts, this restrains and pulls. | 16 |
| WEBLINE — Spider Flurry | Six-hit relocation combo with a finisher; range 60. | Commit to close combat; guard can reject and punish it. | 16 |
| WEBLINE — Web Darts | Non-homing shot: 4 direct damage and movement reduced to 45% for up to 1.2 seconds. | Interrupt positioning without disabling attacks; stronger targets recover sooner. No explosion. | 7 |
| WEBLINE — Sting Kick | Single flying lunge, 22 base damage, knockback and launch. | One direct displacement hit, not another multi-hit rush. | 9 |
| WEBLINE — Danger Sense | 1 second invulnerability and 1.3× power for 7 seconds. | Short safety window; currently also an offensive buff, not passive danger detection. | 18 |
| WEBLINE — Web Zip | Anchor to real geometry and pull to a wall/ledge; range 150. | Move yourself, not an enemy. A missed anchor is not free flight. | 6 |
| APEX — Wave Cannon | Chargeable traveling hose; 84 base DPS, range 150, tip speed 540, width grows with charge. | Prepared, wider pressure; pays for charging and sustaining separately. | 8 entry + 14/s charge + 22/s sustain |
| APEX — Tail Sweep | Close melee lunge/sweep, 22 base damage, knockback and launch. | Push an enemy out of close range without spending on a beam. | 12 |
| APEX — Consume | Held short-range siphon, 22 base DPS, heals from 60% of admitted damage; range 26. | Recover health only while actually reaching a valid target; cover blocks it. | 14/s |
| APEX — Afterimage | Aimed teleport with brief invulnerability; authored range 52. | Reposition discretely rather than travel through the intervening space. Destination/intercept edge acceptance remains open. | 12 |
| APEX — Regenerate | 46 base healing plus 1.3× power for 8 seconds. | Immediate self-recovery, unlike Consume's target-dependent healing. | 20 |
| APEX — Burst Step | Directional dash impulse 98 with .24 seconds invulnerability. | Short movement burst; not a permanent flight-speed stage. | 5 |
| VANGUARD — Eye Beam | Thin finite-travel hose, 56 base DPS, range 150, tip speed 3600. | Faster arrival and less preparation than Wave Cannon; still not hitscan. | 4 entry + 16/s |
| VANGUARD — Flying Tackle | Single flying lunge, 28 base damage, strong knockback and launch. | Heavy one-contact displacement rather than an extended combo. | 14 |
| VANGUARD — Thunderclap | Held force cone, 16 base DPS, shove/lift, range 30. | Close area pressure; despite the name, the current mechanic is sustained, not a one-shot clap. | 16/s |
| VANGUARD — Sky Combo | Eight-hit relocation combo with a heavy finisher; range 72. | Longer attack commitment than Flying Tackle. | 16 |
| VANGUARD — Blitz | Directional dash impulse 126 with .28 seconds invulnerability. | Faster burst than APEX Burst Step, but the same underlying mechanic. | 4 |
| VANGUARD — Unbreakable | 40 base healing, 1.6× power for 8 seconds, 2 seconds invulnerability. | A brief power/defense window; not permanent immunity. | 30 |

## Proposed selection refinement

1. Cached face grid with name and one role icon; clear keyboard/controller focus, search and role filters.
2. One large selected-character preview, role sentence, actual strength and lift capacity; mobility explained as grounded/web/blink/flight rather than one opaque score.
3. Readable power rows sharing one description source with loadout/Studio: delivery, intended effect, range, activation/ongoing cost, charge/cooldown, and counterplay.
4. Optional two-character comparison; distinguish burst damage, DPS, healing and control instead of one misleading universal power score. Full details open deliberately rather than filling every card.
5. Preserve encounter/weather/camera controls and saved selection; collapse setup behind a Match setup section. Preserve news footage as a secondary selectable surface. On mobile, face grid then selected summary and powers; retain real touch targets and no horizontal text clipping.

## Recommended order

Finish pilot power acceptance → truthful descriptions/comparison and selection refinement → native hover/cruise/afterburner audit and speed-stage design → existing rock carry/flight/throw pilot. Do not raise the speed cap until collision sampling, camera follow, braking distance and map streaming are tested. Do not expand to arbitrary vehicles/buildings as carried objects in this pass.
