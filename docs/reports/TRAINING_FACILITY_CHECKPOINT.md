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

## Wall security playback — continuation
- Added TrainingTV using existing `collectFootage` and `FootageTransport`. Only clips whose shots include `training-security` appear. E controls choose next security clip / return to pose review, pause/resume, and 1x/0.5x playback.
- Frames are borrowed from the existing bounded Newsroom archive. Async decode is limited to one pending image, stale callbacks cannot paint a newly selected clip, and disposal does not revoke shared frame URLs.
- Overhead camera remains mounted at (0,270,80), aims between player and active trainer, and adjusts its lens to fit their separation. Screenshot comparison caught overly distant framing; tightened lens verified in final capture.
- Native browser sequence: enter room, E cycles range, V lands real punch (4.00248 HP on the metal baseline), Newsroom records 56 frames, walk-position fixture at TV, E selects clip, seven frames decoded, E pause freezes the playhead. No page errors. Camera framing now clearly shows the target and player.
- Evidence: `artifacts/marketing/training-tv-2026-09-12/security-playback.png`, `range.webm`, `result.json`. Browser script uses controlled positioning near interaction points and real E/V inputs.
- Dedicated test verifies filtering, stale async decode rejection, pause, and borrowed URL preservation on cleanup. Build passed with existing bundle/import warnings; later lens/status edits passed native playback and pause verification.
- Remaining review work: controller/touch navigation among TV controls, dedicated security overlay instead of Newsroom branding, robust pre-roll venue separation, multiple simultaneous participants and obscured camera subjects. Team scenarios, aerial weapon drills, room effect isolation and the complete combat/movement goal remain open.

## Wall ordnance and calibration target — continuation
- Room walls, ceiling and solid fixtures now declare native box projectile shapes. Previously projectile sweeps could use an unsuitable fallback shape despite correct fighter collision.
- Room entry suspends the desert triangle-height query and departure restores its saved flag. Native projectile terrain queries now use the room's flat floor instead of invisible desert terrain.
- Mechanical calibration targets retain metal hit feedback but explicitly have zero ballistic plate and zero armor pool. The inherited metal defaults previously absorbed SARGE's low-damage rifle rounds, misleadingly resembling missed shots. This does not change character armor.
- Native room collision queries intercepted two horizontal paths and a ceiling path; flat-floor crossing returned t=0.5. Evidence: artifacts/marketing/room-ordnance-2026-09-12/collision.json. This checks the shared sweep against actual room geometry; it is not an all-weapons firing test.
- Recorded SARGE firing at the airborne machine: 21 contact events, 168 credited airborne samples, initial hit 5 HP, no page errors. Evidence: artifacts/marketing/air-range-fire-2026-09-12/air-rifle.webm, air-rifle.png, result.json. Controlled placement and scripted native aim/fire intent were used to isolate contact behavior; manual aiming and controller/touch acceptance remain open.
- Three training-facility tests pass, including unarmored calibration admission. Production build passes with existing bundle-size and GLTF import warnings.
- Remaining facility work includes timed scoring and stop/reset, native full flight course, team configuration, effect isolation between dimensions, target KO/grab presentation, actual beam/grenade range drills and controller/touch verification. The overall combat/movement goal is not complete.

## Time/gravity dimension isolation
- Threat Room now mounts separate native TimeFields and GravityZones lists. Desert field timers are suspended with their original objects preserved; training uses the same native behavior and costs.
- Departure clears practice fields through their owning systems, releases their meshes/materials, restores desert lists and original field visibility after scene restoration. Repeated cleanup is safe.
- Adversarial test uses native field systems to verify desert fields cannot slow/lift trainees, training fields still work, desert timers remain unchanged, practice geometry is disposed exactly once, and original lists are restored.
- Native room browser check adds a real practice bubble then leaves: mesh detached, original list restored, practice field absent; no page errors. Production build passed with existing warnings.
- This addresses time/gravity fields specifically. Portals, weather commands, carried actors and other transient effect collections still require complete dimension-boundary review; no claim of full isolation yet.

## Portal and practice-prop departure cleanup
- Ability portals now have dimension-local lists and pending half-pair state. Training cannot complete a portal started in the desert. Departure uses native portal disposal, then restores suspended desert pairs and visibility. Deployment portal remains a separate system.
- PracticeProps disposal now removes owned carried representations and restores carrier speed. Native thrown-prop VFX exposes sourceRef so retirement can remove its callback and native flung record silently, without a delayed explosion in the desert. Unrelated props and friendly person carrying are unchanged.
- Four focused tests pass: field isolation, native incomplete/complete portal lifecycle, prop reset conservation, owned carry/callback retirement.
- Native room browser exit passed portal and field mesh/list cleanup with no page errors. Native prop browser used ordinary SOL selection, controlled placement and E pickup, then native throw and disposal in one evaluation to catch the airborne callback before impact. Effect/record removed, carry cleared, zero area-damage callbacks and no page errors. Clip: artifacts/marketing/practice-prop-exit-2026-09-12/practice-props.webm.
- Production build passed with existing bundle/import warnings. Remaining isolation includes other damage zones, weather commands, gadgets and sustained actor state. Timed drills, team console and complete combat/movement acceptance remain open.

## Timed range drill
- Added physical right-hand E console: start/stop a 30-second drill using the selected machine mode (still by default). Starting creates a fresh calibration target; the existing left console cycles modes.
- Scoring uses actual admitted player damage against that exact target. Displays total health damage, contact events, elapsed/remaining simulation time and end reason. Ends on target destruction, player down, target replacement, manual stop or deadline. Contacts are not accuracy: sustained beams may generate multiple damage events.
- Result is shown on the range board and a mirrored console screen; completion also posts a brief HUD result. No ammo, energy, campaign inventory or class bypass was added.
- Five focused drill/facility tests pass. Native browser E start → V hit → E stop produced 9.4432 HP, one contact, STOPPED, no page errors; recorded artifacts/marketing/timed-range-2026-09-12/timed-range.webm and drill.png. Fixture places player near console and target; it does not claim full walking or aiming acceptance. Initial 12u strike failed to contact; successful 7u setup verifies scoring only, and approach reliability remains outstanding.
- Build passed before the final mirrored-console presentation adjustment; the final browser run verified that adjustment and result rendering. Full native 30-second expiry, moving/airborne timed runs, controller/touch access and repeated-target waves still need acceptance.

## Explain refused melee entries
- Reproduced the prior SOL miss with native V input and explicit facing: 12u start, no approach, no contact. Grounded SOL uses the existing 10u step profile; this was outside admission, not proof that a valid lunge failed.
- Extracted meleeEntryEligibility as the shared source for acquisition and teaching. Reports entry ready, out of range, facing, obstruction, unseen target, blind actor, vertical mismatch and invalid target.
- Range boards now show actual entry family/range and live eligibility. Trial strike records capture entry reason/family/range at commitment, and missed-strike feedback includes that reason.
- Native browser regression: E drill, V at 12u records OUT OF ENTRY RANGE / step / 10u; move fixture to 7u and native V produces 9.4432 damage; E stops. No page errors. Evidence artifacts/marketing/approach-12-2026-09-12/out-of-range.png, timed-range.webm, result.json. Controlled positioning/facing is disclosed; this is not general approach or manual targeting acceptance.
- Three eligibility/commitment tests pass; prior combined entry/facility run also passed. Production build passed with existing warnings. No range or damage tuning changed. Long-entry RAGE/WEBLINE, retreating targets, aerial approaches and full HUD reticle still require acceptance.

## Long-entry melee: WEBLINE retreat fix
- Native V browser reproduced RAGE connecting at ~21.5u, but WEBLINE missing despite valid pounce admission at ~27.2u. His 0.10s jab windup/0.06s active window expired before a 120u/s pounce covered the distance. Retreat lead was also clipped back to the entry-range boundary.
- Admission range remains unchanged. At commitment, bounded observed-velocity lead can extend the destination beyond the admission boundary. Long entries budget startup from travel distance and existing family speed; short strikes keep their minimum authored startup. Destination never retargets after commitment.
- Pose windup and training timing use the actual startup duration. Active/recovery windows and damage are unchanged. No larger hitbox or guaranteed-hit shortcut was introduced.
- 24 native physics/contact tests: RAGE and WEBLINE catch walking retreat; post-commit sideways evade escapes at 20/30/60/120Hz. WEBLINE covers both 20u and 27u fixtures. Another 44 entry, moving-contact, depth, airborne trainer and phase tests passed.
- Final native browser: RAGE 38.475 damage at ~21.5u; WEBLINE 9.550464 damage at ~26.75u with 0.2368s startup. Both actual V inputs, no page errors. Controlled placement, facing and retreat trial setup; files artifacts/marketing/long-entry-2026-09-12/rage.webm and webline.webm, JSON and screenshots.
- Production build passed with existing warnings. Full aerial near-limit entries, obstacle-path cases, all roster variants and controller/touch play still require broader acceptance.

## Aerial entry and hover-transition correction
- New native fixture tests exercise SOL entering from 24u horizontal separation with +/-10u vertical offset, equal height, sideways dodge and intervening finite wall at 30/60/120Hz. Fixture uses native gait transition; browser-only altitude-label drawing is stubbed in Node.
- Initial fixture setup incorrectly treated a repositioned flyer as ground gait; fixed the fixture, not runtime. Initial browser aim used the wrong camera pitch sign; corrected that test setup before diagnosing gameplay.
- Live F flight + V strike then revealed a real hovering-target miss: grounded retreat prediction promoted ~12u/s downward drift to full running speed. The committed point landed too low. Restrict running-speed prediction to ground entries; aerial prediction uses observed bounded velocity only.
- Final native F/V browser: flight entry at ~24.89u connected for 9.4432 HP against the trainer settling into hover, zero page errors. Controlled target/player placement and camera heading, native flight toggle and punch input. Saved artifacts/marketing/air-entry-2026-09-12/air-entry.webm, air-entry.png and result.json with per-frame approach trace.
- 42 combined flight/retreat tests passed. Final 18 flight tests include explicit regression limiting drift prediction to observed velocity; build passed with existing warnings. No hitbox widening, homing after commitment or damage boost. Remaining: moving flight/boost targets, near-limit full roster coverage, input-device acceptance and continued Threat Room teaching/team work.

## Combat HUD melee-entry cue
- Existing chase crosshair now carries a compact cyan family/range label when a visible enemy qualifies for native melee acquisition: STEP / POUNCE / BOUND / FLIGHT. It does not reposition the crosshair, lock the target or guarantee contact.
- Shared meleeEntryTarget and approach definitions drive the cue. Hidden during unavailable combat, attack/recovery/guard/grab/carry, sleep/downed, vehicle occupancy, aircraft/free-look-edge aim modes and outside visible eligible reach. No input-specific keyboard label, so the range text is device-neutral.
- Four cue/acquisition tests pass, covering reach, facing/visibility/obstruction and inactive combat states. Native browser uses controlled setup plus V: no cue at 12u, STEP 10u displayed at 7u, punch connects for 9.4432 damage, no page errors. Screenshot reviewed at 1280x720. Artifacts/marketing/melee-entry-cue-2026-09-12/entry-ready.png and timed-range.webm.
- Production build passed with existing warnings. Native controller/touch and crowded combat readability remain unverified; this does not complete general UI or melee acceptance.

## Physical Threat Control consoles
- Replaced scattered scenario floor rings with six numbered, collidable walk-up consoles: choose threat, teaching drill, full-power fight, next lesson, review and reset. E invokes the existing native actions. Consoles face the open sparring lane to preserve camera clearance.
- Added Stop current threat to the opponent library. It uses the existing trial cleanup, removes the preview/current threat and preserves the selected character for another attempt.
- Native browser flow: ordinary SOL selection and squad entry, controlled positioning at the console, E opens library, RAGE preview, teaching drill, then stop. Final result: preview and target removed, selection retained, six console colliders, zero page errors. Recording: artifacts/marketing/threat-console-2026-09-12/threat-console.webm; screenshot: console.png.
- Visual review caught camera compression in the initial layout; consoles were rotated toward the clear lane, then the native flow and screenshot were repeated. Final screenshot keeps the full character visible. Nine melee-trial tests and production build passed before that final placement adjustment.
- This milestone does not add configurable team training or validate every console with controller/touch. Large overhead signage remains basic and needs a later readability pass.

## Optional native practice teammate
- Opponent library now lets the player assign the selected roster character as one practice teammate, clear that assignment, then select an opponent for a full-power fight. Scripted teaching drills remain solo. Assignment is session-local and separate from the operation manifest/reserves.
- Practice teammate uses native spawnEnemy AI, the player's team, normal equipment/powers and no respawn. Recording includes all three actors and teammate phase/contact labels. Reset/repeat/stop retire the owned teammate and its effects through existing practice cleanup; KO skips campaign rewards and equipment drops.
- Fixed the selected-detail portrait: its image was observed against the roster grid despite living outside it, so it could remain blank. Detail now resolves the shared portrait directly; roster images retain lazy loading.
- Eleven native trial tests passed, including team hostility/friendly targeting, record membership, replacement cleanup, untouched stock/manifest and KO reward/drop exclusion. Fixture audio cry is stubbed because the silent fixture lacks that presentation method. Build passed with existing warnings.
- Final browser: ordinary SOL selection, physical E console (controlled positioning), choose KANO teammate and MERC opponent, native AI inflicted repeated damage, stop removed both practice actors, manifest remained one, reserves remained soldier 0 / LSW 3, zero page errors. artifacts/marketing/training-team-2026-09-12/training-team.webm, setup.png, fight.png, result.json. Initial RAGE test knocked out the unattended player before the stop interaction; not counted as stop acceptance.
- Remaining: multi-member teams/enemy groups, group camera framing (review still centers the primary pair), controller/touch setup, training safety of pre-existing operation squad members and complete training-KO recovery flow. This is an incremental team-training capability, not full facility acceptance.

## Knockout recovery and three-actor review
- Native browser exercised the existing practice KO route with a controlled lethal takeDamage call credited to the selected RAGE threat. Automatic review appeared; Reset practice restored the same SOL to 130 HP, replaced the threat, resumed play, cleared overlay and retained reserves. This verifies native KO/review/reset integration, not player defense balance. Clip: artifacts/marketing/training-ko-2026-09-12/training-ko.webm.
- Review now offers All fighters plus individual teammate selection. Three-actor framing fits a padded group bound for the viewport instead of centering only player/opponent; cinematic impact tracking remains a two-person option. Teammate phase/readout labels are distinct.
- Contact records now identify the damaged actor, fixing teammate hits incorrectly changing the opponent's between-frame HP readout. Legacy two-actor records retain their fallback mapping.
- Screenshot review exposed long hit-event rows expanding the CSS grid/canvas beyond the viewport. Added a bounded grid column and shrinkable children so the event strip scrolls inside the viewport.
- E-review browser fixture initially pressed E before the repositioned interaction candidate updated; added the same settling wait used at the other console. This was a fixture timing correction.
- Eighteen trial, phase and camera tests passed, including projected group bounds in wide/narrow views and independent teammate HP. Production build passed before the final CSS layout correction; final browser acceptance is recorded below.
- Final native KANO/MERC fight → E review → teammate focus → all-fighters overhead → return → E stop passed, zero page errors. Final screenshot visibly includes all three actors and the horizontal event scrollbar; canvas width assertion passed. Artifacts/marketing/training-team-review-2026-09-12/training-team.webm, group-review.png and teammate-review.png. Group framing deliberately zooms out when actors are far apart; individual follow provides close inspection. Wall-TV group framing remains separate work.
