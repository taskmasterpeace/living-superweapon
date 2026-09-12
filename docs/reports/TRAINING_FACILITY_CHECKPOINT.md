# Training facility checkpoint — 2026-09-12

Candidate: http://127.0.0.1:5184/powerworld.html . Local integration worktree; no push or merge performed in this pass.

## Verified additions
- Wall-mounted pose replay TV on far wall, with E review position moved below it.
- Flight-only on-screen current/peak km/h, six sequential gold flight rings, lap counter. Full native course completion still needs playtest.
- Range station at (140, 3, 80): E starts moving machine; E again replaces it with stationary machine. Floor markings every 25u from the firing line to 150u.
- Mechanical target uses native fighter contact, armor, damage and training review. Native V input produced approach contact and 8.8944 HP damage. Moving target traveled ~23u in 1.5 seconds. Machine presentation is a prototype; its KO/grab deformation needs further work before full acceptance.
- Fixed portal queue: ready allies move aside instead of blocking following allies. VEGAS + SOL + KANO all deployed; initial stock consumed exactly once.
- Overhead camera uses existing Newsroom frame encoder, capture budget, event highlights and clip collection. Camera aims between player and active training target. Machine hit generated a 56-frame highlight. Wall TV remains pose replay; selecting security footage on the wall TV is pending.
- Outer room boundary aligned to visible wall interior, plus ceiling containment to prevent fast movement skipping shell thickness. Five adversarial native physics tests pass, including VOLT cover-through sprint. Interior railings/stairs and projectile wall interception still need their own acceptance coverage.

## Evidence
- artifacts/marketing/training-range-2026-09-12/machine.png, range.webm, result.json
- artifacts/marketing/threat-room-squad-2026-09-12/deployed.png, squad-portal.webm, result.json
- artifacts/marketing/white-threat-room-2026-09-12/flight.png, white-threat-room.webm
- 57 existing practice, native encounter and Newsroom tests passed; 5 new shell tests passed. Production build passed with existing large chunk and GLTF import warnings.
- Browser tests use ordinary character entry and E/V input, with controlled player placement near stations. They are not claims of completing traversal from spawn. No page errors in the recorded range/squad runs.

## Next facility work, in order
1. Make all stations visibly recognizable physical consoles; improve gold text contrast on white walls. In-world damage display and reset control on punch machine. Explicit metal baseline and hit envelope that fits target geometry.
2. Soldier firing bay: same native ordnance; stationary, left/right and airborne launched targets. E starts/stops a timed drill. Show distance, hits, misses, accuracy and damage; reset removes owned targets/projectiles. Test rifles, grenades and beams with wall impact, no ammunition bypass outside training.
3. Gadget bay populated from real registry. Show actual class eligibility, two gadget slots and missing content. Training issuance remains separate from campaign inventory. Carryable gadgets keep the player visible; equipment terminal may open a full page.
4. Ground speed track and lap gates, leap landing pads, anchor-pull stations; native energy and movement. Finish native flight-ring course and controller/touch tests.
5. Wall TV playback selector for security highlights, retained using existing archive tools; optional front/side/overhead review. Add visible camera lens/recording indicator. No continuous unbounded recording.
6. Team scenarios at a physical console: configure allied and opposing members, preview, start, stop, reset. Safeguard portal entry and cleanup with active fields, carried actors and owned effects. Existing squad admission works; configurable team drills are not complete.
7. Future combat-content work: sword users and shared weapon animations; optional dismemberment needs authored detachable regions, damage rules, compatible rig variants, censored presentation options and cleanup budget. Do not substitute arbitrary mesh removal for a complete damage pipeline.

## Why the ten additional ideas help
| Idea | Behavior and reason |
|---|---|
| Side-by-side comparison | Compare two characters' class, movement, melee entry, attack reach, energy and resistances from runtime definitions. Makes team choices understandable without a single misleading power score. |
| Scenario codes | Versioned recipe with roster, loadouts, targets, placements and seed. Share a repeatable starting setup, not a promise of identical physics across machines. |
| Training attack paths | Display actual hit volumes, travel and commitment windows in practice only. Explains misses without giving permanent wall vision in missions. |
| Combat-preserving performance preset | Reduce decorative particles, reflections and recording resolution first. Retain telegraphs, projectile silhouettes, guard cues and damage indicators. |
| Last three hits | Show source, damage type, health/energy loss, block result and time for the three final damaging events. Explain a death using the real event log. |
| Input display | Optional overlay shows resolved actions and held/released timing. Teaches controls in clips without exposing arbitrary typed input. |
| Who uses this? | Reverse references for animations, powers, sounds, gadgets and visual recipes. Know which characters a shared edit affects before changing it. |
| Bug bundle | Export build ID, position, class/loadout, nearby collider IDs/bounds and recent gameplay events, optionally a screenshot. Makes invisible-wall reports reproducible. |
| Reduced flash/shake | Separate intensity controls that preserve meaningful timing and direction cues. Improve comfort without concealing attack warnings. |
| Versioned character saves | Validate schema, retain prior revisions, preview diff and restore. Experiment with outfits/powers without losing a working hero. |

## Equipment bay and airborne range — continuation
- Shared `gadgetCatalog()` now supplies the gadget spreadsheet page, inventory issue list and 14 physical training pickup stations. Source variants are retained; identical definitions share owner references.
- Shared `issueTrainingGadget` validates room/pre-deployment state, current living player, registry membership, sequential slots, class slot limits, and existing deployed/cooldown state. Uses native default charges and selected slot; no personal guns granted to LSWs.
- Range E cycles STILL → MOVING → AIRBORNE. The airborne machine starts with a real launch impulse and falls under Fighter physics. Repeat retains that mode. All machines now initialize from a consistent metal training definition, independent of the selected hero preview.
- Range display reports live target distance, HP and last damage event for the current target, clearing stale damage on replacement.
- Equipment racks and range console now have native finite colliders. Labels use contrasting plaques; equipment header moved to the far wall after screenshot review found it obstructed the camera.
- SARGE browser test: airborne target ~40u at sample, later ground y=0; E picked up Field Medkit; native X healed 30→80 HP, leaving 1 charge and cooldown. No page errors in successful runs. Recorded `artifacts/marketing/training-equipment-2026-09-12/equipment-and-range.webm`, screenshots and JSON.
- Native tests cover launch ascent/descent and repeat, selected threat preservation, registry/slot/state admission rejection. Existing nine melee-trial tests and five shell tests passed alongside them (16 total in combined run); final definition initialization also passed the 11 trial/equipment tests. Production build passed with existing warnings.
- Test setup places player near stations; successful E use requires facing the station and standing outside its collider. This does not prove a complete mission or all 14 gadget behaviors. A transient syntax error caused one browser boot timeout and was fixed before the successful final run.
- Remaining: real weapon hits against airborne targets, launched-target scoring/launcher art, distinct physical gadget display models, consumable reset policy, player-readable damage/armor breakdown, team scenarios, ground course, wall security playback, all effect isolation on departure, native controller/touch training acceptance. Broad combat/movement objective remains active.
