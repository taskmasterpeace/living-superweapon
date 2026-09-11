# PowerWorld — consolidated gameplay design

September 11, 2026. Review draft, not a shipped-feature list. This is the current gameplay entry point for the recovered decisions and latest creator request. Implementation status and source provenance live in the [recovery audit](reports/2026-09-11-gameplay-recovery-audit.md); delivery gates live in the [execution roadmap](superpowers/plans/2026-09-11-gameplay-consolidation.md).

**Authority:** latest explicit creator direction wins; recovered creator answers follow; earlier plans and the other AI's proposal supply context. The 41 exported answers retain their original **Draft** status. Numerical proposals below are tuning candidates, not invented approvals. No runtime changes are claimed by this document.

**Keep track here:** [decision and delivery tracker](gameplay/TRACKER.md). Latest additions: preserve the liked desert, police escalating to military, rush combinations that end in recovery space, and an aimed spinning throw. [Clip and ESF evidence](reports/2026-09-11-melee-esf-reference-review.md) distinguishes observed motion, creator direction and proposed rules.

**Execution authorized, September 11:** the creator approved the tracker and requested sustained implementation plus dream-loop visual improvement. Person pickup/carry during flight, Tab melee mode and zombies join the active scope. “Proposed” numerical tuning remains implementation judgment, not a request to repeat the whole design interview. Current delivery status stays in the tracker.

## 1. The game and its three loops

A soldier and a living superweapon inhabit the same battlefield, with different strengths and meaningful work to do. Third-person movement, physical combat, equipment, destructible routes and consequences make the fight worth playing. The Newsroom preserves what actually happened.

**Moment to moment:** read the threat → position or pursue → commit an attack → opponent blocks, evades or counters → resolve contact → recover energy and position → choose whether to press or disengage. Speed earns an opportunity; it does not skip contact, cover or defense.

**First complete operation:** choose a recognizable hero or soldier → equip → deploy at a research outpost → fight, bypass or breach → recover the case → survive extraction → results → watch/favorite footage → retry with a different role.

**Longer combined-arms loop:** deploy scarce superweapons and clone teams → contest infrastructure → recover or deny a fallen superweapon's biological sample → deliver and research it → field limited derivative capabilities → attack the enemy's ability to keep fighting.

These are successive delivery sizes. Finishing the short operation is the first gameplay milestone; the full war is the destination. Preserve **City Free Play** alongside it: civilian incident → witnesses/police response → pursuit → escape or escalation. The creator has already played and liked this loop.

## 2. What v1 contains

Use the existing desert and one **research outpost with a lab, vehicle yard and roof access**. Doors, selected walls and selected floor/roof pieces can break; debris is bounded. Infantry must traverse the required route without flight. Supers may breach an authored weak route. Large bodies, roof openings, shots and cameras need actual collision support.

**Creator-approved environment direction:** keep the desert the creator already likes. Capture its exact scene/map/seed and native view before integration. Preserve its open sightlines, terrain silhouette and travel space; add the outpost and usable impact surfaces locally. This is not permission to replace the desert with a new map. The clips are combat references, not proof that their desert assets exist in this project.

Proposed operation length: **5–8 minutes**, distinct from the exported roughly **30-minute** target for future war matches. Begin with a small defending clone squad and one authored reinforcement phase after recovery. Avoid scaling soldiers' health up merely to prolong a superhero fight.

Proposed mission state machine:

`Briefing → Active → Case carried → Extracting → Success`

`Active / Case carried / Extracting → Player KO → Failure`

- Reaching the case must not require killing every enemy: attack, bypass and breach are valid approaches.
- The case has one owner. Dropping it, interruption, KO and restart cannot duplicate it. It occupies mission cargo, not an attack slot.
- Extraction requires a living eligible carrier in the zone and a short uninterrupted channel. Leaving or taking admitted damage interrupts; final timing is tuned in the mission.
- Success and failure each end the operation once, explain the result and offer retry/loadout/menu.
- Defeat keeps owned equipment and loses unextracted mission loot, matching the recovered inventory design. V1 does not add equipment destruction or a repair tax.
- Record delivery honestly. A completion record is not an implemented research unlock.

The first playable group must demonstrate breadth: **SOL and VEGA**, a soldier (**SARGE** first), **KNIGHTFALL** for gadgets and **TEMPEST** for weather. Add a flight/strength benchmark such as VANGUARD when needed to prove carrying. CHAINFIRE remains a favorite; WEBLINE has an explicit repair gate. The whole roster remains discoverable; this test group is not a roster reduction.

### Police must escalate to military

Latest creator requirement: a sustained confrontation grows beyond police into a military response. Existing code already has **beat cops → patrol backup → SWAT → federal agents → military**, with a capability-gated sanctioned superweapon beyond that. Preserve the existing jurisdiction distinctions; configure the intended desert scenario with a military-capable jurisdiction and prove the military arrives there. Do not silently make every country field an army.

Escalation should change pressure visibly: stronger coordination, equipment, approach and dispatch presentation, not merely a new wanted label or more HP. Existing heat thresholds and officer-down jumps are the starting point. Response announcements distinguish authorization/en route from actual arrival; Newsroom deployment claims must follow a real deployment. Escape, pursuit and standing down remain part of the loop.

First prove the existing armed military infantry response; tanks, helicopters and aircraft are later authored additions, not implied completed features. Reuse the police response authority for desert incidents. Outpost defense and its objective reinforcement are separate event sources: taking the case alone is not automatically a civilian crime, and one event must not double-spawn forces through both systems.

## 3. Separate the meanings of “tier”

| Term | Meaning | It must not silently change |
|---|---|---|
| Threat / strength | Character's fundamental capability and matchup | Soldier versus superweapon asymmetry |
| Flight expertise | Grounded, awkward flyer, levitator, full flyer | A speed command cannot grant flight |
| Movement gear I / II / III | Current movement output, within authored capability | Actual acceleration, braking, turn authority and energy |
| Power state / form | Authored temporary or transformed state | Appearance is not automatically an XP/damage increase |
| Career mastery | Record of play, cosmetics and sidegrades | No permanent direct-stat advantage from the exported direction |

**Latest firm requirement:** ordinary sprint/flight power-up must not consume a power slot. Remove redundant “level up / fly faster / power up” default buttons after their universal replacement exists. Preserve authored alternatives and migrate saved kits. Healing, unique transformations and strategic buffs are not all automatically the same feature.

Do not delete the existing XP/form machinery wholesale based on the phrase “remove levels up as powers.” Its authored unlocks, form visuals, special caps and other modes need an explicit compatibility policy. Recommended v1 policy: no kill-fed stat snowball in Recovery; keep career records and expose authored power states through the universal control. This is a recommendation requiring review, not a recovered ruling.

## 4. Movement and independent looking — first feel priority

### Alt shoulder-limited look

Hold **Alt** and move the mouse to look around while continuing the current travel and aim direction. Store **view direction, aim direction and travel direction separately**. Holding Alt alone must not steer a beam, turn the flight path, change the lock target or rotate the whole fighter.

Recommended first limit: approximately ±75° horizontal relative to the captured shoulder frame, with bounded vertical look. Final angles are feel tuning. Returning the view on release is smooth and does not snap the body or aim. The character can keep moving or flying throughout. Camera collision still applies.

While view and aim diverge, the center of the screen is not a truthful firing reticle. Show the real projected aim marker when visible, and an edge bearing when it leaves the view. AltTab, blur, pause, pointer-lock loss, KO and vehicle transitions must clear the look latch. No sticky heading on resume. Existing camera shoulder/distance settings remain available.

### Universal Shift gesture

Recovered creator sequence: **first press/hold = gear I; second quick press/hold = gear II; third quick press/hold = gear III where supported**. Latest message also requires **double-press and hold the second press to power up, including while stationary**.

Recommended reconciliation for review: use one universal power-up gesture with movement-aware output. While moving, the held sequence requests the next movement gear. While stationary, double-hold charges the authored power state without a sprint displacement. It works in hover as well as on the ground; being stationary is not an admission requirement for the gesture. This does not multiply damage merely because speed gear changed. Whether continued holding should itself advance a form remains an unresolved detail; the earlier third-press speed instruction stays explicit.

- Candidate quick-press window: 0.30 seconds; ignore OS key repeat.
- Release brakes out of powered travel while briefly retaining the tap sequence for the next press. Timeout/KO/blur/reset clears it.
- Ordinary double-tap movement remains evade. Legacy Shift dash/web-zip abilities must remain reachable through selected attacks or explicit remapping; never spend for both a slot and movement on one input.
- An unavailable third gear shows a clear capability limit, not a fake maximum speed.
- Controller and touch need the same semantic actions plus an accessible explicit stage selector; do not require keyboard gestures on touch.

### Speed must be physical

Specify per-character acceleration, top speed, braking distance, turn rate, energy drain, carried-mass penalty and available gears. Speedsters, levitators, grounded soldiers and full flyers need separate profiles. Tune a fixed route with measured traversal/braking time before choosing global km/h targets.

The recovered audit found desired movement capped at **210 u/s**, equivalent to **143.64 km/h** using the current **0.19 m/u** scale. This explains why a strong speed fantasy is not solved by a larger aura. That cap is not proof of the maximum under every external impulse. Real supersonic travel would be a major collision/map/camera change; no such speed is promised here.

HUD: readable `GEAR II / III`, actual contextual speed, power-up progress and a distinctive `MAX GEAR` state. III has an unmistakable label/icon and short transition cue, without a permanent giant speed bar. FOV, wind, wake and audio reinforce measured speed. A sonic boom requires crossing a calibrated threshold, once with hysteresis.

## 5. Melee should be an exchange

Keep the **Strike → Grab → Guard → Strike** relationship. Build on existing light combinations, heavy strikes, grabs, body blows and throws. Improve the exchange before adding more named rush powers.

**Latest creator direction:** rush into range → hit, hit, hit → last hit drives the opponent away → both players can recover and choose their next action. Prototype a four-beat chain (three individually resolved light blows and a committed knockback finisher); the exact count is a tuning proposal, not a universal rule for every hero. A heavy archetype may use one slower, heavier strike. Split an authored total damage budget across contacts; a multi-hit animation must not apply the old total on every beat. Reserve major displacement for the finisher so ordinary punches do not continually knock the opponent beyond follow-up reach.

The finisher creates real separation and a reset opportunity. The attacker also has recovery; immediate automatic reacquisition must not erase the defender's space. After bounded tumble/hitstun, the defender can guard, evade, brake or reposition. Energy recovery follows the shared combat recovery rule, not a free refill on every combo. Walls can shorten separation, so corner cases need a recovery/chain limit instead of an endless stun loop. Continuing pursuit is another paid, controllable commitment.

**Yes, defenders should have a chance to block between ordinary blows.** Each hit has anticipation, contact, hitstop and recovery. At declared chain gaps, guard/evade/counter can be admitted; a bounded input buffer helps both attacker and defender. Start with a proposed 0.15–0.22-second actionable gap and tune through player-input tests. This is not a guarantee of escape after every special move; authored exceptions must disclose commitment and counterplay.

Flight entry adds momentum to the opening strike, then resolves into close exchange or a deliberate single-hit launch. Contact uses a sweep and physical reach; no teleporting through walls or automatic damage merely for getting close. Bounded hitstop and brief recoverable knockdown must never recreate the reported near-death freeze.

**Tab melee stance is now confirmed direction** in the September 11 follow-up. Tab toggles melee mode during gameplay: the primary triggers become light/heavy, with guard and grab visible; Tab again restores the previous selected power actions. Keep V quick-melee available. A mode change cancels incompatible held powers and cannot fire the prior action accidentally. Migrate roster/menu access to a nonconflicting action and explicit UI before switching the binding; Escape/pause remains available. Squad-command access must not compete for Tab. Menus retain ordinary keyboard focus traversal.

### Grab, whirl, aim and throw

**Creator direction:** seize an opponent, whirl them around, choose the release direction, and throw them fast into terrain, a mountain face or the ground for impact damage. The reference supports a held/rotating pair and separation; free player-controlled aiming and mountain damage are requested extensions, not facts established by the videos.

Extend the existing grab/throw and credited slam systems through `Reach → Secure → Whirl/aim → Release → Flight → Impact → Recover`. The grab must connect through reach and collision; it cannot pull through cover. Strength, target mass and authored escape traits decide admission and resistance. Preserve front-grab escape and back-grab distinctions.

- While holding, normal aim selects a three-dimensional release direction, including down. Show a readable direction/impact cue from the actual collision query. Alt remains view-only and cannot secretly redirect the throw.
- Proposed input: use the existing grab action to enter, hold to build a bounded whirl, release to throw once the minimum is met. Exact binding and cancellation behavior remain candidates until compared with current tap-grab/body-blow controls.
- Charge increases launch impulse up to a cap, costs energy and has a maximum hold duration. It does not grow damage forever. Whirl is visible body motion around the holder; rotating through a wall is not allowed. Sweep the victim's occupied space; tighten or stop an obstructed swing without dealing damage once per animation frame.
- Release sends the victim along the chosen aim vector. Do not force players to time a physical tangent to hit their chosen point; the release pose must visibly lead into that direction. Use swept collision at maximum throw speed, including sloped terrain and downward release at low altitude.
- Holding/whirling alone deals no recurring damage. Any separately authored body blow has one contact. The first qualifying world impact resolves credited slam damage once, with surface/strength/velocity-based tuning, dust, a readable hit and a bounded mark/crater where supported. Mountain collision is solid collision first; full mountain destruction is not required.
- Energy depletion, interruption, owner/victim KO, reset and loss of a valid target clear the link and safely release both actors. Reuse the existing escape/resistance rules and bound the hold; a failed throw cannot leave someone attached or stunned forever.

Accept the throw only when a native player can choose left/right/up/down, visibly hit a wall or slope/ground, see correct damage attribution and regain control. A cinematic animation without steerable release and world collision does not satisfy this request.

### Pick someone up and fly with them

The creator explicitly connects aimed throws to **flying in, grabbing a person, lifting them and traveling while carrying them**. Treat combat clinch and transport carry as related states owned by the same person-grab relationship, distinct from carried props and inventory cargo. Do not delete or respawn the carried fighter as a prop.

An eligible grab can transition into a transport hold. A flight-capable carrier can take off, hover, rise, descend and travel with the person, subject to authored lift capacity, combined collision clearance and mass-dependent speed/energy. Pickup does not grant flight to a grounded carrier. The victim's pose/position follows the actual grip; collision sweeps both bodies, including doorways, roofs and terrain, without pinning the camera inside them.

From carry, the player can set the person down safely or enter the bounded whirl/aim/release sequence. Release downward is distinct from gentle set-down. Hostile victims retain authored resistance/escape opportunities and a bounded restraint duration; allied rescue requires consent or incapacitation. Interruption, depletion, carrier/victim KO and reset release the link safely and retain original identity, health and team. A carry cannot refresh an expiring hostile grab forever through mode switching.

Native acceptance: grab a grounded and an airborne target; take off, turn and use Alt while carrying; pass near cover; land/set down; re-grab and aim a throw; deplete/interupt/KO either actor. No duplicate fighter, orphaned hold, free flight, repeated hold damage or permanent restraint.

## 6. Guard spends energy before health

Latest creator rule: a correctly intercepted block should protect HP while sufficient energy remains. Continuous beam defense is a contest of sustained pressure and available energy. The current chip-damage/independent-meter break path does not meet that rule.

Proposed precise rule: after eligibility, direction and relevant resistance are resolved, let incoming blockable damage be `D`, energy cost per blocked point be `c`, and current energy be `E`. Absorb `min(D, E/c)`, spend exactly the matching energy, and pass only unpaid damage onward to remaining defenses/HP. `c` is authored by guard and attack family; do not silently choose the same conversion for everything.

- Full payment: zero HP chip; feedback shows BLOCK and energy spent.
- Partial payment: drain remaining energy, resolve the uncovered part once, visibly break guard.
- Zero energy: no free sustained block. Incoming pressure cannot refill the resource funding its own defense.
- Suppress energy recovery from guarding/damage while actively absorbing pressure; define recovery delay as tuning.
- Grabs bypass ordinary guard; attacks outside a frontal arc still matter; barriers and deflectors retain distinct authored behavior.
- Preserve a heavy guard-crush purpose through a high, readable energy demand or a declared guard-opening move. Do not let an unexplained second meter end paid beam defense.
- Physical shields, armor and nanite integrity remain distinct. An ordinary soldier does not gain an unlimited superhero energy shield.
- Infinite-energy characters require their authored capacity/counterplay limits to remain meaningful. They must not become invincible through this rewrite; keep directional exposure, grabs, distinct guard capabilities and existing power caps.

The guard HUD must depict the resource/rule actually used. Do not present guard as armor or display a redundant draining bar disconnected from the new rule. Compare equal guarded and unguarded exposures with actual resource/HP outcomes.

## 7. Beam and impact readability

Beams remain finite traveling hoses. Ground contact must produce an identifiable tip/contact knot, a restrained light cue, dust/steam/sparks appropriate to the surface, and a dark burn trail **where contact actually traveled**. Misses leave no trail. Disconnected contacts never paint a line through the intervening air or cover.

Use bounded, distance-spaced surface marks; stationary contact darkens one patch rather than allocating a decal every frame. Marks follow terrain normals and clear on match reset. Walls, roofs and ground choose their own surface treatment. No crater mesh rebuild for every sustain tick. Preserve low-altitude flight dust separately.

Finish diagnosing close-charge startup and held-beam ending before calling presentation complete. Every end has a reason: input release, depletion, interruption, defeated owner, slot replacement or range/lifetime rule. Body impact, BLOCK, DEFLECT, armor absorption and KO must come from resolved outcomes. Readable contact and believable hand/weapon motion are separate acceptance gates.

## 8. UI, roster, inventory and Newsroom

**Shared Impact identity:** charcoal/ink, bone text, gold interaction/guard, cyan energy, coral danger; Rajdhani display and Inter readable text. Use shared tokens, not a second Newsroom palette. KIVULI's character exception does not permit a purple interface. The later supplied portrait-HUD request uses green HP; reconcile that scoped override explicitly without changing the rest of the brand. Bottom-center LMB/RMB selected attacks are the latest layout requirement.

Selection: face grid → one large live character → actual role/mobility/strength → meaningful power descriptions and comparison → hero-filtered TV footage. Explain damage versus DPS, range, cost, cooldown and counterplay. Cache portraits and invalidate on model/profile revision. Show all identities, including unavailable ones and custom characters; availability is separate from ownership and authoring.

Roles: Speedster, Beam Specialist, Aerial Ace, Powerhouse, Gadget Specialist, Controller and Infantry. Favorites: SOL/VEGA first, with CHAINFIRE/TEMPEST preserved. TRENCH, COLDSNAP and ABEO are creator-requested holds; retain source data and explicit unavailable messaging. WEBLINE, TALON, CRUCIBLE and DECIBEL need tactical curation, not mass deletion. CRUCIBLE's hammer recall/orbital attack and DECIBEL's downward sonic mobility remain tracked. KANO/VEGA appearance mapping still needs confirmation before art changes.

**Inventory:** owned item instances, stash, carried bag, equipped weapons/gadgets, quantities, ammo and separate mission cargo. Armory catalog selection is not ownership. Preserve ammo/charges on swap/drop/recover; no duplication across saves, menu visits, interrupted reload or death. Powers stay part of the hero kit. Reuse SARGE's finite Jump Jets rather than granting every soldier flight. Prove the requested three shotgun, three assault and three precision roles after the shared ownership path works.

**Newsroom:** first play has no clips; real matches populate a persistent archive over time. Browse/filter by hero, auto-play a bounded playlist, favorite, rename, delete with confirmation, export/import and see storage use. Selection TV reads the same archive. Protect favorites during ordinary eviction and fail visibly when storage cannot accept more. Historical footage preserves its recorded appearance; new portraits use current models. Archived footage remains labeled silent until sound recording is actually implemented.

**Audio Workshop:** direct, visible navigation to its own page. Every cue specifies one-shot, loop or ambience; trigger, stop condition, cooldown, replacement file and verified runtime use. Previewing a sound is not evidence it plays in combat. New movement, guard, contact, objective and weather work each ship with their event/cleanup sounds.

## 9. Distinct gadgets and weather

KNIGHTFALL's shock tether: a visible traveling projectile must hit before grounding. Cover, guard, deflection and resistance work through existing resolution. Flight disruption is short, with a recoverable fall and immunity after recovery to prevent repeated permanent grounding.

Soldier turret: owned gadget, valid placement, setup time, team ownership, limited ammunition, firing arc, health and bounded count. It holds a route and remains vulnerable.

**TEMPEST's storm is a bounded layer over the map's weather.** Owner, center, radius, build/active/dissipating states and energy drain belong to the storm. Ambient weather keeps evolving independently. Removing her layer must reveal the current ambient state, not restore an outdated snapshot or clear the map.

Storm Command temporarily offers directed lightning, gust and hail actions. Cancel conflicting held actions on entry/exit; restore exact underlying slots and selections without mutating shared definitions. Cloud buildup precedes rain, lightning warns before damage, roofs provide appropriate shelter, wind uses existing physical response, hail uses real projectile contact. Depletion, interruption, KO, form change and reset remove only owned effects. Cap concurrent layers and pooled resources. Test natural rain + TEMPEST, natural storm + TEMPEST, two owners and ambient changes during the power.

## 10. Clone reserves and genome warfare — next operation

Recovered direction already answers most of the external proposal's questionnaire:

- Clones can be human or AI; one small commanded fireteam per player. Superweapons are scarce in the future team mode.
- At zero reserve, no new clone bodies spawn. Surviving units may finish objectives or restore production; a dead player may take an available allied unit/support role.
- Controlled facilities and delivered resources replenish stock slowly, with a cap and interruptible production. Temporary facility capture denies enemy respawns and offers constrained forward deployment.
- Research is **match-local**; curated two-strain hybrids have predictable tradeoffs. No random failed mutations or permanent stat snowball.
- Human-scale grounded heroes may pilot compatible vehicles; native flyers and oversized heroes do not. Strong heroes may lift/throw suitable mass-rated vehicles; allied rescue requires consent or incapacitation.

Recommended first genome extension: eligible enemy superweapon goes down → one uniquely identified sample opportunity → recover or deny → carry/extract → lab research timer → one authored derivative capability issued to a clone. Preserve one sample identity through drop/steal/delivery; prevent farming the same life repeatedly. Extraction alone does not grant a full-strength copy. Corpse ownership, degradation, denial and scarce-superweapon redeployment costs are rules to settle for this extension.

**GODFALL / Clone War** is a proposed later combined-arms mode built on that chain. The external numbers (250 reserve, 1/3/5 clone costs, 15% inheritance, 40–100 clones, 8×8 km map) are examples, not approved specifications or verified capacity.

After this: **Black Site / Protect the Scientist** uses recoverable intel and a living extraction objective; destroying the objective fails rather than shortcutting the search. Civilian memory, reporting and faction conduct make indiscriminate destruction consequential. Keep existing city policing distinct from a future symmetric war escalation model.

**Zombies move into the active playable scope** as an opt-in bounded desert combat encounter, providing opponents for punches, defense, throws and soldier weapons. Start with grounded infected that approach, telegraph a committed strike, react to hits and recover; a tougher stagger-resistant variant may follow. Reuse fighter damage, grab, ragdoll, targeting and AI intent, with population/spawn pacing and cleanup caps. They should pressure positioning without unlimited hitstun, untelegraphed instant attacks or spawns inside the player/camera.

Proposed first loop: start the infected encounter → survive a bounded wave or clear the marked pocket → earn an encounter result/highlight → reset/retry. Preserve the research operation and ordinary Free Play. Zombie encounters must be reachable from the real game UI, not just a developer spawn command. Hero, soldier and zombie ownership/team rules must prevent accidental friendly attacks or farming the same KO forever. Verify melee contact on moving infected, guard, launch/terrain impact, recovery between attackers and retry cleanup before raising counts.

The larger Outbreak mode remains opt-in and later: exposure → symptoms/treatment window → turn state, then one flying infected archetype. Networking for 8/16/32 players, wider aircraft warfare and huge maps follow measured simulation budgets and authoritative state ownership; none is a v1 completion claim.

## 11. What “done” means

The game is ready for the first loop when a player can choose SOL, VEGA or SARGE, understand the two attacks and available speed states, complete a win and loss, enter/breach the lab, return to loadout, replay a saved highlight after reload and start again without stale state. KNIGHTFALL and TEMPEST must demonstrate their distinct promised mechanics before the showcase claims that breadth.

Capture real-input movement/Alt/guard/melee/beam sequences at 30/60/120 Hz where applicable, plus actual controller/touch navigation. Test paid block versus unpaid overflow, defensive gaps, maximum supported speed collision and all cleanup paths. Preserve failed runs and distinguish staged fixtures from native gameplay.

Performance evidence names hardware, resolution, quality and workload, including moving actors, attacks, impacts, weather, recording and restart. Report frame-time distribution and resource growth; a quiet scene's FPS is insufficient. Current gates and priority are in the roadmap.
