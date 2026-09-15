# Combat, movement and creator proof — active scope

Deliver a playable, understandable combat-and-movement slice with a reusable Threat Room, reliable ground and aerial exchanges, readable impacts and recovery, distinct character movement, capable AI, and shared animation/appearance authoring. Preserve the existing working flight feel and Impact art direction. The five movement characters are proving cases within this larger active goal, not its entire scope. Requirements below are not claims of completion; see ../../docs/reports/THREAT_ROOM_CHECKPOINT.md for checkpoint evidence.

## Full combat acceptance before calling the goal complete
- Teach approach, combo, heavy, frontal energy-first guard, dodge, grab counterplay, carry, aimed throw and terrain impact through repeatable practice. Include stationary, retreating, guarding, dodging and attacking opponents, plus aerial scenarios and appropriate vehicle/prop targets.
- Reset fighters, practice props and scenarios without consuming operation reserves. Show actual contact/miss, damage, energy and recovery. Include a short playable lesson so a new player can perform an exchange without reading source code.
- Separate controlled flight, ordinary falling, recoverable launch/stun, unconscious loss of control and lethal KO. Show visible flailing/tumbling, smooth recovery when control returns, and a death camera that follows the body. Validate feet, board poses, speed trails and landing protection.
- Make friendly pickup, transport and midair catches useful without friendly damage. Keep hostile grabs escapable according to explicit combat rules; no automatic defeat from a successful grab.
- Retain ranged combat throughout: moving-shot inheritance, traveling beams, readable charge and terrain impacts, controlled grenades and material/damage feedback.
- Verify shared player/AI behavior and keyboard, controller and landscape touch access. Connect the separate-dimensional Threat Room to portal, transport and blood/lab/upgrading operation flow.

## Cinematic camera experiment
Start with optional Threat Room review: normal gameplay, front three-quarter, side and overhead views, scrubbing and slow motion. Add a separate cinematic replay option that chooses cuts at recorded strike/contact/recovery events. Experiment with alternate punch angles while retaining attacker/defender orientation and avoiding terrain obstruction. Compare the cinematic replay with one continuous gameplay view of the same exchange.

Live camera changes are a later opt-in experiment in the Threat Room, not a mandatory cut on every punch. Do not rotate movement input, aim, targeting or collision with an editorial cut; keep the defender's windup and dodge/guard windows readable. Return immediately to the normal camera on exit. Capture native clips and label replay versus live footage accurately.

## Implementation order and completion reporting
1. Threat Room teaching, repeat/reset and multi-angle review.
2. Reliable approach/combo/guard/grab/throw exchanges, on ground and in air.
3. Flight speed presentation, loss of control, recovery and body-follow camera.
4. Distinct traversal profiles with matching AI and shared resource rules.
5. Ranged tuning and readable material/damage impacts.
6. Organized animation library and consistent modular character appearance.
7. Other-dimensional staging, operation integration and full input acceptance.

Keep a playable checkpoint after each milestone. Report what changed, what was actually tested, footage location, unresolved defects and the next step. A milestone does not close or reduce this full goal. Prefer shared move families and data profiles over unique animations for every character.

## Creator decisions and first prototype defaults
- VOLT: replace limited flight with momentum-dependent gliding. Faster baseline movement; energy-priced super sprint and higher-drain extreme speed. Running off a hill carries momentum into a shallow descending glide, with limited steering and no hover, free altitude gain or midair recharge exploit. Suggested control: hold Space while airborne to extend glide; release to fall normally. Tune before treating as final.
- VOLT trails: lightning/afterimages near legs and body; dust originates at actual ground contact and stops when airborne. Trail length/density conveys speed without a separate HUD panel.
- JELANI: strength-speed running, tackles and heavier braking. Shared tackle animation family with actual contact, block/dodge, recovery and vehicle target policy.
- RAGE: Space controls leap, never an ability slot. Tap normal hop; hold while grounded charges a larger leap; release launches along camera-relative movement direction, or facing if stationary. Show landing preview during charge. Limited air steering, no sharp homing turn; tap must remain responsive. Charge values and air-steering limits are prototype tuning.
- WEBLINE: fast visible wrist-origin chain-style tether, valid anchors, held attachment and look-around. Space jumps away from attachment toward aimed direction with bounded impulse and obstruction checks. Short chained leaps use shared approach rules. Start attachment jumps uncharged; do not overload initial controls. Alt free-look remains observation and must not silently retarget an attack/anchor.
- TEMPEST: upright hovering and smooth directional gusts. Existing bounded weather tests pass; visual/native acceptance and AI use remain part of this goal.
- RIME: inspect ice-board ascent/descent, board attachment and body orientation; fix observed pose defects without altering unrelated flight.
- Dodge: remove dedicated Z dodge. Double-tap direction dodges; Shift retains sprint and double-tap/hold speed tier. Test sprint+direction double-tap as boosted evade with explicit energy cost, preventing a speed-tier press alone from dodging. Preserve C crouch and resolve Z prone mapping visibly across KBM/controller/touch.
- Boosted attack charging: prototype Shift held during a charge as an explicit energy-intensive overcharge, faster charge and a higher bounded size/damage ceiling. Attack charge owns this modifier while charging; do not also trigger traversal boost or spend twice. Guard energy and evade remain meaningful. No unlimited multiplication of charge, movement speed and damage. Moving shots inherit velocity; beams remain finite traveling hoses.

## Ordered milestones
1. Controls and core exchange: approach -> combo -> block/dodge -> grab -> terrain throw. Resolve Z conflict; prove attack windups, contact and escape windows. Keep ranged powers accessible.
2. Shared animation library foundation: inventory all existing authored/procedural clips, stable IDs, categories, filters, scrub/frame-step, compatible rigs, timing markers, assignments, variants/revert and native hit/block/miss previews. No per-character bespoke sets required.
3. Movement: VOLT ground sprint/glide first, JELANI tackle, RAGE charged leap, WEBLINE anchor/jump, then Tempest/RIME presentation. Introduce each family with native human controls and AI before expanding roster use.
4. Beam/high-speed combat: inheritance, readable impacts, per-attack speed and bounded overcharge. Then speed bubble (#36): bounded local slowdown, clear escape/cost, no global camera/input slowdown.
5. Threat Room trials: run/stop/turn track; gap/leap/anchor course; marked range and damage targets; melee/block/grab/throw station; moving/airborne opponents; weather and material tests. Reset reliably, log actual outcomes, no mandatory tutorial. Connect other-dimensional room to remote portal arrival and existing transport/blood/lab loop after combat proof.
6. Creator proof: one canonical appearance recipe shared by selection portraits, full preview and gameplay. Diagnose Vegas black/clothing mismatch rather than guessing; support front/back/side/orbit preview. Body regions, compatible parts, shared tint channels, front/back emblems, bounded proportions, presets and save/reload. Create three distinct low-fidelity looks on one rig; validate punches/carry/flight/ragdoll and attachments. Preserve Vegas/Sol identities.

## AI acceptance
Use native movement intents and resource/admission rules. VOLT accelerates/brakes and chooses safe glide exits; JELANI telegraphs tackles; RAGE predicts reachable landings with limited correction; WEBLINE selects real unobstructed anchors and recovers from destroyed anchors; TEMPEST uses flight/domain positioning. No perfect hidden-target knowledge, unlimited energy or separate bot-only movement simulation. New movement profiles declare AI support and missing support visibly.

## Evidence, scope and progress
Keep a playable checkpoint after each milestone. Report changes, tests, unresolved defects and next step. Record short native gameplay clips at meaningful milestones in one dated artifacts/marketing directory, plus representative stills; clearly label controlled diagnostics/posed previews. Test keyboard, controller and landscape touch gesture ownership. Do not call the creator, AI or weather finished from schema/unit tests alone. Track new discoveries in existing GitHub issues rather than silently expanding the milestone.

## Source study and reuse plan
Inspected OuroDev Game/src/UI/Hybrid/uiBody.c (body scaling), Game/src/UI/uiCostume.c (region/boneset/geometry choices and tintability), Game/src/entity/costume_client.c (body-part geometry and tint application). Adapt these separation concepts to our procedural/shared-rig system and original art; no whole legacy UI/engine port. Existing source: https://git.ourodev.com/CoX/Source . Creator payoff gate: three saved appearances survive menu -> match -> reload and share animation attachments correctly before expanding part catalog.

## Existing issue map
#14 combat; #15/#30 beams; #16 flight/camera; #19 traversal; #20 falling recovery; #21/#35 animation; #23 creator; #29 controls; #32 grappling; #34 carry; #36 speed bubble; #37 death camera; #6 Threat Room. Keep active audio worker independent.
