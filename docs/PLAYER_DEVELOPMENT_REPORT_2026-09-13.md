# PowerWorld — from arena prototype to superhero battlefield
Player-facing development report • September 13, 2026 • Local development build

This is a development update, not a claim that the game is released or every system is finished. Earlier changelogs contain superseded bindings: the current melee key is V, guard is Q, interaction/grab is E, and Tab selects powers.

## What we are building

PowerWorld began as an isometric superhero arena: choose a fighter, fire powers, fly, clash beams and knock opponents through cover. The Bid for Power direction pushed the project toward the fantasy of being inside that fight—third-person movement, long approaches, aerial exchanges, huge impacts and characters whose power changes how they travel.

The next layer gives those fights a purpose. Choose a side and squad, practice in a separate Threat Room, deploy through a portal, cross the desert, recover biological samples, return to a lab, improve your fighter and re-enter combat. Soldiers use equipment and transport; living superweapons bring different bodies, movement and powers. The intended fun is deciding when to attack, defend, carry someone, use terrain, travel or return with something valuable.

## Features in the current development build

### Fight on the ground and in the air
- Dedicated melee alongside selected ranged powers. You no longer need to put ordinary punching in a power slot.
- Approach attacks: an eligible target in front of you can trigger a step, rush, pounce, bound, tackle or flight entry as part of the attack. Character profiles determine the reach and movement. The strike commits; targeting is not a promise that it hits.
- Light combinations where the character's martial style supports them, charged heavies, knockback and recovery windows. Power-only heavy fighters such as RAGE do not secretly have the same jab string as everyone else.
- Frontal energy-first defense. A funded block prevents health loss from the covered hit, while pressure spends energy and wears down guard. Heavy crush, exhausted energy and depleted guard meter now have distinct explanations in training/replay.
- Grabs, carries and aimed throws. Carry someone into the air, build a throw and send them into a surface. Throw damage and subsequent terrain impact are separate events.
- Friendly carrying and shared hold poses. This is the foundation for rescue and transporting teammates; not a promise that every rescue situation has been tested.
- A throw forecast for the currently modeled living-body trajectory. It stops at predicted contact or control recovery; it does not promise a landing after the victim can steer or after changing obstacles intervene.
- Real material/damage feedback and terrain-contact effects. The direction includes flesh versus metal readability; complete gore and limb dismemberment are not being claimed.

### Movement with character identity
- Third-person flight, three speed gears, independent Alt look, head following and rear three-quarter framing.
- Flight wake and surface-trail work, plus current/peak speed measurement in the Threat Room. Some visibility and camera cases still need polish.
- VOLT has ground-speed/glide work and a time field with quarter-speed treatment inside it; shots resume normal timing outside. We have recorded projectile/beam cases, not a claim of flawless interactions with every power.
- JELANI's tackle-style entry, RAGE's bound approach and WEBLINE's chain-tether/anchor-pull work distinguish traversal. WEBLINE has native AI traversal work as well.
- TEMPEST's bounded storm layers over existing map weather so ending it does not erase the map's weather.
- Knockback, falling, KO ragdolls and body-following review have implementation and fixes. The broader motion/recovery review remains unfinished; it was paused for this report.

### A real practice facility
- A separate white enclosed Threat Room with walls, ceiling, platforms and room-scale flying space, connected to desert deployment by a portal.
- Stationary, walking-retreat, guarding, dodging and aerial melee drills, plus incoming attacks for practicing defense.
- Mechanical targets you can hit without using an ordinary enemy as the prop. Firing-range modes include stationary, moving and airborne targets, with range/damage readouts.
- Equipment stations sourced from the gadget catalog, with class restrictions rather than unrestricted guns for every hero.
- Reset practice, restore training health/energy and replace targets/props through the station. Practice does not mint campaign reserves.
- Curved flight-course work, ground traversal stations and speed measurement.
- Recorded pose review from front, side, overhead and cinematic angles. Cinematic cuts are a review tool, not compulsory live-combat camera changes.
- Overhead security capture/highlights and a wall-mounted TV for reviewing training footage. Recordings use the existing bounded Newsroom system.
- Teammate/enemy selection for practice encounters. Training is a place to learn and experiment, not just a blank damage arena.

### A reason to return to the field
- Soldier/LSW side selection, named companions and finite reserve rules.
- A squad transport with boarding, passenger seats and Z seat switching, including the pilot seat. A staged six-person sample/lab return route has passed. Handling and a universal system for every future vehicle remain work in progress.
- An enterable research-lab pilot, functional doorway and an analysis interaction.
- Biological sample recovery, degradation and an operation-local energy upgrade. A native sample → lab → upgrade → fight-again sequence has been recorded; recent local checkpoint testing isolates collection and analysis without re-driving the transport route.
- Existing desert activities include response escalation, zombie outbreak and recovery scenarios. Native convoy ambush interception remains deferred; a menu label is not proof of that feature being complete.
- Newsroom/highlight and operation-report work gives fights a record beyond the moment of impact.

### Character and content tools
- Character selection with a large model, bottom portraits and drill-down information; class, threat and movement are separate concepts.
- Character Studio for shared body/outfit/color/emblem, power/appearance and movement-profile authoring.
- Animation Library with searchable families, favorites, camera angles, pause, scrubbing, frame stepping, marker drafts and character assignments, plus paired friendly/hostile hold previews.
- Studio now rehearses Approach → punch using native melee/physics. JELANI, RAGE and SOL have recorded contact and repeatable seek checks.
- Animation previews now use saved Studio appearances for both participants. Marker fields refresh for the selected character; source, assignment and shared draft are clearly distinguished.
- Standalone Sound Library and an AI audio intake path for replaceable one-shots/loops. Some gameplay routes are connected; preview/import availability does not mean every sound is wired or approved by ear.
- A shared local AI playtest runner discovers controls, runs focused scenarios and saves action/state/error evidence, screenshots and clips. It helps us find short defects without driving the same mission repeatedly. Browser touch/gamepad emulation has coverage; physical iPhone/controller acceptance is separate.

## The research lab: exactly what E does

The prompt says ANALYZE. Currently it does not open a research-tree window.

1. An eligible organic enemy defeated by your side can drop a red sample. Metal enemies, training dummies and the scientist do not provide this reward.
2. Approach the sample and press E. You carry one sample at a time. Its 90-second simulation-time degradation clock starts at the drop and continues while carried; picking it up does not refresh it.
3. Return to the lab before it expires. The objective/prompt displays the remaining time.
4. Stand in reach of the analysis terminal and press E. The sample is consumed; maximum energy rises by 10 and the RESEARCH UPGRADE banner appears.
5. Up to three deliveries grant +30 maximum energy for that operation. It is capacity, not an instant refill, new power or permanent account unlock. It does not create clones or soldiers.
6. With no usable sample, E gives the bring-a-fresh-sample message. After the third upgrade it reports research complete. Dying while carrying loses the sample.

Recorded checkpoint: SOL's capacity went from 120 to 130, sample disappeared, player identity and reserves stayed unchanged. Interior camera/wall fading is visibly rough in the screenshot. A richer research choice screen is not implemented by this interaction.

## Melee field guide

| Action | Current keyboard/mouse input | How to use it |
|---|---|---|
| Acquire target | T while looking at an opponent | Keep the opponent readable; still aim and respect entry range. |
| Melee approach / strike | Tap V | Attack from inside your character's approach range; the move closes distance when eligible. |
| Combination | Follow-up V during the combo/recovery window | Do not wait until fully idle between every strike; some styles have heavy-only taps. |
| Charged heavy | Hold V, release | Trade startup and commitment for a stronger blow/guard crush. |
| Guard | Hold Q | Face the incoming attack; watch energy and guard meter. |
| Dodge | Double-tap a movement direction | Move sideways out of the committed attack line. |
| Grab/interact | E | Context matters: nearby doors/pickups can take priority over grabbing. |
| Manage held person | Tap E to release/set down; hold E and release to throw | Aim before releasing; takeoff/movement can transition a grab into carrying. |
| Flight | F toggle; Space rise; Ctrl descend | Close vertically before trying an aerial entry on a distant opponent. |
| Powers / equipment | Tab powers; I inventory; X selected gadget | V/Q/E remain independent of selected powers. |

Against a retreating fighter: face/target them, enter the shown approach range and tap V. Against a blocker: do not feed endless jabs into the guard; use a heavy or a grab. Against a grabber: strike before the grab connects or evade the entry. Against a flyer: match height, close to your aerial entry range, strike, then decide whether to follow, block or grab. A miss is a reason to reposition, not proof that you need to mash faster.

Holding guard is useful, but not universal invulnerability. Attacks from behind, grabs, guard crush and insufficient resources are different problems. You cannot simply attack, carry and defend at the same time. Read the training result: actual health loss, guard energy spent and the break cause.

## Gun zoom

A selected primary rifle needs an authored scopeZoom greater than 1. Hold RMB to use that sight and LMB to fire. This RMB gesture takes the place of the secondary attack for that scoped primary. Release RMB to return to the ordinary view.

Current examples: RECON's Scoped Marksman Rifle (4×), M24 Marksman Rifle (4×), M107 (5×), Battle Rifle (2×). RECON starts with a different primary; choose the scoped rifle from the power selection/primary wheel first. Ordinary rifles and superhero powers are not all scoped. Sight is suppressed during flight, vehicle use, reload, throwing, guarding, capture and relevant combat incapacitation. Touch exposes a Sight button for an eligible selected weapon. This report does not certify a physical controller sight binding.

## Tutorials using speech bubbles — recommended next design, not shipped

Use the existing trainer, speech presentation and combat-result events for short lessons. A trainer says one instruction, waits for the actual success condition, and responds to the failure. Do not advance just because the player pressed a button.

Suggested sequence: Look and target → enter reach and strike → follow-up combo → funded frontal block → dodge a committed heavy → grab/throw → take off and acquire an airborne target → aerial strike/block → carry/throw → soldier sight/reload → recover a sample and analyze it.

Examples: “Turn toward me and hold guard.” On a real block: “Good—your energy took that hit.” On a rear hit: “I got behind your guard.” On an approach miss: “You committed before I dodged. Reposition.” On selecting an unscoped weapon: “Choose the marksman rifle first.” Keep one bubble at a time, captions, replay/skip, and actual keyboard/touch prompts. The existing pieces make this practical, but the guided speech-bubble tutorial sequence is not assembled yet.

## What still separates this from a finished release

Full-roster balance, remaining traversal/AI and lost-control acceptance, clearer interior/vehicle presentation, complete audio wiring/listening review, broad gadget/operation/device tests, physical iPhone checks and release/GitHub/Mac handoff. Native ambush interception and the character-selection background channel are deferred. No claim of universal building destruction, complete dismemberment, a finished campaign research tree or multiplayer is made here.

The strongest playable direction is now: learn a character in the Threat Room, deploy with allies, fight with movement and counterplay, recover something worth protecting, return to improve, then go back out. The next priority should be making that loop understandable through guided lessons and clear feedback, while finishing the combat/movement gaps already agreed.

## Evidence for this report
- Research checkpoint: `artifacts/playtest/2026-09-13T06-23-14.992Z-research-checkpoint/` — sample.png, upgrade.png, result.json and recorded clip.
- Native gun sight capture: `artifacts/marketing/player-report-2026-09-13/` — rifle-normal.png, rifle-sight.png and zoom-result.json. RECON was selected through menus, the primary wheel selected the scoped rifle, and held RMB reached greater than 3.5× interpolated zoom. No actor/camera mutation; no page errors recorded. The HUD shows 4× Sight. This verifies activation, not final camera polish.
- Speech tutorials still need integration with training preparation: the current speech policy suppresses preparation-state speech, so existing combat bubbles cannot simply be assumed to work unchanged there.
