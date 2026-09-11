# PowerWorld v1.0 — Recovery, readable powers, and the newsroom

Status: requested specification for creator review; NOT a completed implementation or release certification.
Date: 2026-09-11. Integration worktree: D:/lsw/.worktrees/sarge-authoring-integration; runtime: http://127.0.0.1:5182/powerworld.html.

## 1. Source of truth and scope

Consolidates the supplied conversation history, latest hands-on feedback, docs/DESIGN_DECISIONS.md, the Impact playable-slice brief, authoring handoff, full-roster inventory and current code audits. Latest creator decisions supersede old city-first/PvP-first deadlines. Older completion claims do not substitute for new native-input verification.

Fantasy: a living superweapon or equipped soldier enters the same battlefield, uses genuinely different strengths, recovers valuable research and creates memorable footage. BFP-centered third-person action remains the default. Preserve the Impact comic/tactical art bible: warm charcoal/bone/gold, truthful comic hit outcomes, cyan energy, compact HUD. No purple UI. KIVULI's explicit character exception stays separate.

Chosen approach: one complete single-player recovery operation against AI, with a reusable training lab. Alternatives considered: broad sandbox first delays a finishable game; multiplayer first multiplies synchronization and persistence work before combat is dependable. Preserve player/AI intent symmetry and stable entity/event IDs for later networking, but do not build an unused networking framework now.

Release scope includes a research-outpost interior, landscape touch and standard-controller play, speed stages, useful default powers, minimal inventory, persistent newsroom and standalone audio workshop. Aircraft expansion, full destruction simulation and infection are follow-on slices, not silently abandoned requirements.

## 2. The match loop

Front door -> choose character/category -> equip -> optional Threat Lab -> deploy -> breach/recover -> extract -> results -> newsroom -> rematch/change loadout.

Proposed first scenario: a compact research outpost within the existing desert battlefield. A small clone squad guards a research case inside the lab; one reinforcement phase creates pressure after recovery. Fight, bypass or breach to reach it. Carry the case to a clearly marked extraction zone and complete a short, interruptible extraction. Recommended initial session target: 5–8 minutes; tune after playtest, not by increasing enemy health indiscriminately.

Current reuse boundary: FrontlineEncounter already has four clones, a sealed case, 1.5-second ground pickup and 2-second ground extraction (12u radius, damage pauses). It currently requires defeating the squad and leaves the proving ground running afterward. Bypass access, case ownership, formal match ending and results are proposed changes, not existing behavior.

- One human, AI opponents. No character changes mid-operation in v1; choose soldier or superhero before deployment.
- Win: recover and extract the case. Loss: player KO. Restart or return to loadout immediately; no unexplained near-death input lock.
- Objective state: briefing -> active -> case recovered -> extracting -> success/failure. Each transition occurs once, has HUD/audio feedback, and resets completely on restart.
- Initial reinforcements and difficulty are authored, not an endless escalating world system. Human soldiers are not secretly scaled into superhero equivalents.
- Research delivery records completion/sample history; permanent attribute unlocks, clone enhancement and countermeasure progression are later, separate balance work. No fake research rewards.
- Ground objective/interior creates a reason to descend without globally disabling flight. A soldier can complete the objective on foot; vehicles are optional, never required to recover from a broken path.

## 3. Roster and power audit — all characters, not only pilots

Coverage baseline: 55 characters / 382 equipped slots in docs/reports/2026-09-11-full-roster-power-inventory.md. Shared implementation families are desirable; duplicate tactical purpose and ineffective actions are not. Never equate inventory presence with accepted behavior.

All identities remain discoverable. Public availability is separate from authoring: ready, testing, unavailable. Unavailable cards show portrait/name/category and an honest hold notice, but hide active power details as requested. They cannot start a match or be selected by random AI. Saved references receive an explicit replacement prompt, never a crash or silent substitution. Studio keeps the data and alternatives.

| Character | Required decision/action |
|---|---|
| SOL, VEGA | Creator's positive benchmarks. Preserve feel while fixing shared blockers; record baseline gameplay before changes. |
| WEBLINE | Repair gate, not accepted. Prove anchored traversal, useful snare/control and real melee reach. A passing unit test is not proof of usefulness. |
| TRENCH | Hold/unavailable; water-specialist redesign. Preserve data. GitHub issue: https://github.com/taskmasterpeace/powerworld/issues/3. |
| COLDSNAP, ABEO | Hold/unavailable per creator; retain identity and authoring records. |
| DECIBEL | Distinguish sonic attacks: do not keep two cones whose sole identity is range. Verify damage type, range, selected-slot activation and melee access. Preserve liked Crescendo presentation. |
| CRUCIBLE | Preserve liked orbital identity; terrain-relative higher launch. Physical spinning hammer outbound with explicit recall. Replace generic Forge Vent only after a distinct medium-range role is defined. Tempered's visual surge inspires speed-stage presentation, not a copied damage buff. |
| TALON | Wing-Ding Fan is the liked baseline; remaining kit needs native usefulness tests before curation, not automatic deletion. |
| KNIGHTFALL | Gadget Specialist: grapnel, stealth/escape, limited deployables, proposed shock tether grounding with resistance and repeat-control immunity. |
| TEMPEST | Weather Controller: dark-brown-skinned Black woman; future bounded storm mode must affect real weather, not merely rename ordinary attacks. |

Categories: Speedster, Beam Specialist, Aerial Ace, Powerhouse, Gadget Specialist, Controller, Infantry. Secondary tags distinguish regen, constructs, portals, weapons and traversal. Category and actual mobility are independent: a fast runner is not automatically a flyer.

For EVERY slot record: input/hold/release, actual damage type, resource (ammo/energy/charges), direct versus area damage, near/medium/long reach with exact values in details, travel/charge time, target effect, counterplay, interruption and cleanup. Review testing includes unguarded, guarding, resistant, obstructed, moving and airborne targets; depletion, KO, form change and owner disposal. Report failed input separately from a miss, out-of-range action or resistance. Fix causes, not assertion thresholds.

Final default kits need meaningful jobs, not seven slots filled for symmetry. Keep removed powers as Studio alternatives. The full audit applies to all 55; release-ready status is evidence-based rather than claiming all 55 passed together.

Appearance direction awaiting identity confirmation: KANO as a Black fighter with dreadlocks/red-black-green costume; VEGA as a bald Black fighter of a different complexion. Preserve gameplay identity. More intentional Black representation across roster; do not randomize skin colors as a substitute for character design.

## 4. Controls, speed and combat blockers

### Two selected attacks

LMB always activates displayed left selection; RMB always activates right. Wheel changes left; RMB+wheel changes right. A right-button selector gesture must not also accidentally discharge the prior attack. Original keyboard shortcuts may remain optional; selecting Q's action into LMB must never require Q. Implement and test the same binding semantics in gameplay AND Studio preview, or explicitly label a preview's separate controls. Test pressed/held/released and sustained-loop cleanup across selection changes.

Two small selected icons near/below reticle show LMB/RMB or device equivalents, readiness and charge. Right-side list remains secondary and can collapse. No wrapped vertical weapon names. Central feedback never conceals target contact.

Audit evidence: selected-slot routing exists in combat-selection.js and game.js; the reported mouse failure is NOT reproduced yet. Test native PowerWorld and Studio separately before changing either. Focused selection/web tests passed 35/35 on this audit; that does not approve WEBLINE's gameplay feel. Add visible out-of-range/no-target/obstruction reasons for silent snare/rush failure.

### Speed stages (creator gesture)

First Shift press/hold = stage 1. Release then second press/hold = stage 2. Release then third press/hold = stage 3, where supported. Proposed tap-sequence window 0.3s; resets on timeout, incapacitation, landing/mode change or focus loss. Final release brakes out of powered speed; an active sequence may promote the next press. Ignore keyboard auto-repeat. Isolate Shift locomotion from legacy Shift ability slots so one input cannot spend on both.

Separate flight expertise from speed-stage capability. Grounded heroes remain grounded; gear-equipped soldiers receive an appropriate sprint, not supernatural stage 3. Non-flyers may drive; native flyers cannot. Explicit evade remains on double-tap movement, preserving forward travel and per-character dodge style.

Do not erase WEBLINE's grounded Zip or other traversal by blindly replacing every Shift binding. Contextual flight boost owns Shift while flying; grounded kit traversal remains reachable, with sprint on a separately exposed/remappable control where it conflicts. Device UI must show the active meaning.

Use measured world-scale speeds and authored per-character caps. Stage HUD, wind/trails, readable widening terrain-aware sand wake and a Crucible-inspired surge convey transitions. Actual acceleration/braking/turn authority are mandatory; no fake speed by FOV alone. Stage 3 of the fastest eligible flyer may cross a defined sonic threshold: sound barrier effect fires once per upward crossing with hysteresis, not repeatedly or merely because a timer elapsed. Camera shake/flash is bounded and reducible. Aircraft/missile relative-speed design remains recorded follow-on scope, not a requirement to add aircraft this pass.

High-speed movement uses swept collision against fighters and terrain/structures. No flying through a victim on rush contact. Heavy impacts may launch living victims into a short recoverable ragdoll; show recovery and never chain-disable indefinitely. Soldiers/eligible heroes have authored fall/impact susceptibility; preserve strength distinctions.

Near-death blocker: code currently contains an hp=1 Second Wind/downed state with movement suppression. Disable forced rally in default recovery play. Ordinary hitstop remains brief, bounded and distinct from damage stun; stacked beams cannot refresh a permanent input lock. Reproduce all movement locks before concluding this is the only cause.

### Mobile/controller

Landscape-first touch: left movement stick, independent right camera drag, two attack buttons with hold/release, separate power selectors usable without a mouse wheel, context interact, guard/evade, and flight rise/descend. Avoid swipe gestures conflicting with camera. Speed has an explicit staged control instead of requiring difficult triple-taps. Safe areas, multitouch cancellation, pointer loss and orientation changes must be tested. Portrait supports menus and a clear rotate prompt for combat.

Standard gamepad: navigate every screen without mouse; two attack triggers, shoulder/selection modifier, explicit movement-stage control and context actions. Use actual device glyphs where detected. Browser gamepad support is NOT PlayStation certification. Host a tested web build first; installable iPhone web experience is distinct from native App Store distribution. Native wrappers/store work and console certification are separate gates, not same-night promises.

## 5. Threat Lab, inventory and damage clarity

Threat Lab is reachable from selection without entering a hostile match. Choose stationary/guarding/resistant/moving targets, distance and height; reset targets; show contact, actual HP damage, absorption and resource costs. Optional sparring bot and safe free-movement space. Auto helpers/summons require actual spawn, ownership, usefulness and expiry checks.

Inventory v1: two equipped weapon/power selections plus bounded gadget slots and a separate mission-case slot; quantities, ammunition, reload, pickup/drop/equip, compatibility and current weight/carry state. Reuse armory comparisons and existing weapon definitions. Prove the requested nine firearm choices (three shotgun, assault-rifle and sniper variants) are distinct in reach, cadence, recoil and role; do not infer from catalog counts. Powers are not arbitrary loot items. Special item affixes/progression remain later.

Direct head/torso/limb hits get explicit authoritative zones. Headshots reward precision subject to helmet/armor/resistance; explosions do not receive head multipliers. Damage must first be admitted by the existing pipeline. Show ARMOR/BLOCK/DEFLECT/BODY/KO from actual outcomes, not effect guesses. Physical/ballistic/elemental taxonomy must be documented accurately; no silent global renaming during UI work.

One vehicle carry acceptance: suitable strong flyer picks up a compatible vehicle, flies with correct carry pose, throws, hits terrain/target, deals damage and produces a justified explosion. Ownership/collision and saved vehicle state remain consistent; dropping/KO/reset cleans up. Legacy carry methods alone are insufficient.

## 6. Interior: mandatory small outpost, not postponed again

Approved: lab, vehicle yard and roof access. Breakable walls/doors/selected floors, bounded debris. Proposed footprint has a front door, flank breach route, stairs to roof and case room. A soldier can traverse every required route normally. A superhero can breach the marked weak structure; cannot shoot through intact walls.

Centered BFP camera stays default outdoors. Indoors smoothly shorten collision-safe boom and fade only player-obscuring geometry; optional shoulder view stays a user setting. Prevent near-plane clipping, camera wall penetration and large actors trapping the camera. Beams stop at admitted surfaces; emission glow cannot hide the whole room. Suppress rain under roofs; local ambient audio transitions at openings. Debris and breach openings update movement collision, projectile LOS and AI path access together. No arbitrary whole-building invisibility that reveals enemies.

Visual dream pass: build an interior target board using the SAME hero/soldier/style, showing doorway entry, hallway fight, charged beam contact, breached wall and roof transition. Then compare actual runtime screenshots at those cameras; generated images are targets, never proof.

Pascal candidate reuse is wall/opening/material schema and geometry authoring into a game module contract. Preserve IDs, meters-to-world conversion, openings, collision pieces, health/material and intact/breached state. Its headless GLB tool is a stub; do not block on a fictitious exporter. Prove one imported/authored room before a general building generator.

Current outpost buildings use a whole-building solid AABB and whole-model shatter/sink behavior. Interior art alone cannot make them enterable. Replace that collider for the pilot structure with actual wall/opening/floor pieces while retaining usable terrain grading and yard layout. Orbital attacks must resolve terrain-relative start height and roof obstruction; no spawning inside a roof or below elevated terrain.

## 7. Audio Workshop: standalone page and exact delivery contract

Visible main navigation: Play / Threat Lab / Character Studio / Audio Workshop / Newsroom. Audio Workshop is a dedicated shareable page, not a hidden central modal. Explain Studio: edit selected character locally, create custom character explicitly, save/export, and preview; source defaults remain distinguishable from local overrides.

Each sound card MUST show:
- Playback: ONE-SHOT or SEAMLESS LOOP; ambient is a role, not a third incompatible file type.
- Role/bus: world spatial, character voice, ambient bed, UI or music; mono/stereo expectation.
- Event and phase: charge start / sustain / release / impact / stop, not an ambiguous attack name.
- Requested file duration, filename, format; loop start/end and seam requirements for loops; natural tail for one-shots.
- Start condition, stop/interruption condition, fade duration, distance/occlusion behavior, concurrency/cooldown, fallback and wiring state.
- Generation brief, audition, stop, volume, chosen-file replacement and export/import. Fix native-loop badges/filter/counts.

Proposed asset handoff: WAV master at 48 kHz, no clipping/music/unrelated voices; runtime compression happens in pipeline. Short impacts are complete one-shots. Beam/charge/flight/rain loops are clean steady-state beds (typically 3–8 seconds for design audition); separate start/release/stop one-shots where needed. Weather/interior ambience loops may be longer; each brief states its own duration rather than requiring one length globally. A looping ambience may be stereo; positional impacts usually mono. Do not embed an explosion in every loop seam.

Existing catalog audit: 82 cues, 12 native one-shot replacement routes, 4 native loop routes, 66 preview-only; misleading UI currently undercounts native loops. This is not all gameplay sound coverage. For the release loop, every native event uses a working placeholder and every replacement route has duplicate-playback, cancellation and fallback tests. Speech uses speaker/line/category/global limits, priority and stale-event discard. Dialogue placeholders are nonverbal sketches, not generated spoken dialogue.

Existing delivery constraints: selected files are capped at 1 MiB / 30 seconds, package at 4 MiB; importing replaces the whole library, not merging it. Full audio production needs manifest-plus-blob storage/import with explicit conflict choices and validation, rather than promising 82 masters fit that package. Keep audition repeat separate from the runtime loop contract. Speech suppression is harness-tested but the dispatcher is not fully gameplay-wired. Four existing native loops are rain, vortex, rotor and jet.

Coverage: combat/block/deflect/guard break, ammo/reload/grenade phases, footsteps/landings, speed stages, terrain impact, vehicle carry/throw, destruction, weather exterior/interior transitions, objective/extraction/results, newsroom/UI and summons. Add briefs before new systems ship; don't require final generated assets to build functionality.

## 8. Persistent newsroom and match evidence

Newsroom autoplay is ONE sequential playlist with favorites, hero/event/date filters, rename, delete, export/import and visible storage budget. First launch is empty, first finished match creates history, later matches accumulate. Selection TV filters exact hero participant IDs. Legacy unknown clips remain general footage. Old footage retains old model appearance; new portraits/previews follow new assets.

Persist bounded clip blobs plus versioned metadata atomically using local browser storage appropriate for blobs, not live blob URLs or giant base64 localStorage. Handle quota failure without losing existing favorites; show when recording is unavailable. Proposed default budget 250 MB, user-adjustable. Evict oldest unstarred clips only with clear policy; if favorites fill capacity, stop automatic saves and request export/space. Storage is device/origin scoped, not a cloud guarantee; stable hosted origin and backup matter.

Compact authoritative match events track hits, blocks, objective transitions, KO and notable throws. Stats do not trigger a video for every hit/block. Rank highlights, use pre-roll and cooldown, bound encoding/render cost, avoid duplicate overlapping clips. Replay must not run simulation or apply damage. Match/hero/asset version IDs support comparisons and future progression without recording personal telemetry.

Preserve the live capture caps (9 clips / 360 frames / 24 MiB) separately from the durable archive. Finish pending encodes, save frames and metadata transactionally, then release live URLs after successful ownership transfer. Multi-event clips union participant IDs. Do not falsely label silent archived footage as audio-enabled; recording game audio is a separate explicit task.

## 9. Reusable animation and art pipeline

Use shared versioned character assets across gameplay, Studio and selection. Regenerate cached portraits on asset/profile revision. Validate skeleton mapping, hands/weapons, root motion, contact markers and gameplay timing. Model changes cannot silently break hitboxes or reach. Prioritize locomotion/backstep, ground/air punch, heavy strike, sword/hammer action, guard, hit reaction and recovery. Support-hand gaps remain explicit until fixed.

Video motion experiment is optional authoring work: frame preparation -> pose estimation -> retarget -> manual contact/occlusion cleanup -> validation. FFmpeg alone is not mocap. Cartoon poses are a feasibility test, not a guaranteed one-click pipeline. Coughing/burn-patting are future status-reaction additions; no unverified claim they already exist.

Art acceptance board: hero, soldier, tank, jet and helicopter under identical lighting, comparing silhouette/material scale/outline treatment. Retain liked style and diverse silhouettes. Tank/jet appearance comparison does not authorize aircraft expansion.

## 10. Follow-on slices retained from history

- TEMPEST storm command mode, lightning/gust/hail options with real localized weather; resistance and warning windows.
- KNIGHTFALL shock tether with counterplay; soldier deployable turrets with setup, ammo and vulnerability.
- Outbreak: sprinting human zombies, exposure/treatment window, powered infected retaining selected mobility. Animated near/mid/far LOD, staggered AI and bounded ragdolls; benchmark before choosing crowd size. Infection/player loss of control requires its own rules; not mixed into default recovery yet.
- Research attributes, clone empowerment, inhibitors/countermeasures; scientist escort scenario.
- Larger world/GTA-like escalation, interconnected interiors, full aircraft/missile speed and formations, jet/helicopter controls, expanded tanks, multiplayer and native platform distribution.

## 11. Work order and release gate

1. Reproduce/control fixes: displayed LMB/RMB mapping, near-death lock, helper activation, current SOL/VEGA baseline. Establish full-roster audit ledger and holds.
2. Shared movement/animation: stage gestures, measured speeds, moving attacks, collision, living recovery; preserve camera framing.
3. Selection, compact central attack HUD, soldier inventory and Threat Lab. Native desktop/controller/touch inputs.
4. Outpost interior + one complete recovery/extraction loop; optional carry-throw proof.
5. Standalone Audio Workshop + required placeholder wiring; persistent newsroom and result events. These may run as isolated parallel work once interfaces are agreed.
6. Art/motion polish and end-to-end testing. Publish tested build to powerworld repository/deployment only after explicit target verification; report actual live URL and open issues.

Gate: complete a win and loss as SOL, VEGA and a soldier, restart and change loadout without stale state; WEBLINE repair independently demonstrated; held roster cannot spawn; every release default ability passes native tests. All-roster audit remains visible rather than pretending held/test characters vanished.

Performance target proposals: foreground desktop 60fps; actual midrange phone >=30fps with adaptive quality, ten-minute play/record/restart test. Record device, resolution, quality, frame-time distributions, entity/effect/clip counts and console errors. Do not use background-tab throttling as GPU evidence. No unconditional crowd-count promise.

Required evidence: native-input short clips of selection -> fight -> recovery -> results; indoors beam/melee; speed stages/brake; soldier loadout/grenade; refresh-persistent newsroom; audio start/stop/replacement; mobile multitouch and controller navigation. Tests must fail on inert attacks and stale-loop leaks. Screenshot-only or programmatic forced poses do not approve combat feel.

## 12. Authority and review

This spec records approved direction plus clearly labeled proposed implementation details. Creating the spec does not mean runtime holds, fixes or layouts are shipped. TRENCH issue has been filed; hold implementation follows review. Creator confirmation of KANO/VEGA appearance mapping is outstanding. No other broad questionnaire blocks reading this plan.

Parallel ownership at implementation: main owns combat/input/roster authority; separate assigned workers may own standalone audio UI, archive persistence/UI, or isolated outpost modules. No concurrent edits to shared orchestration without explicit boundaries. Preserve existing dirty files and external authoring work. Final integration review and actual gameplay acceptance remain with the main task.
