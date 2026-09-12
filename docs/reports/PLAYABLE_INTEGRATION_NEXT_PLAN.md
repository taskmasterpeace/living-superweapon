# Playable integration plan — decisions, next work and audio handoff

2026-09-12. Integration branch: codex/playable-integration, based on the reviewed combat branch, including its existing audio, driving and building merges plus latest standalone library, inventory and squad-screen commits. This is a development baseline, not a merged release to master. The old dirty D:/lsw checkout and local raw evidence/reference files are preserved separately; do not overwrite newer reviewed runtime fixes with older working copies.

## Locked decisions

- C crouch. Double-tap movement direction is the primary dodge gesture. Shift remains sprint/speed tiers. Existing Z shortcut may remain optional; remove it from required onboarding rather than spending a primary button on it. Prone must retain rear-side third person.
- Projectiles inherit shooter movement, then receive attack-specific speed tuning. This is approved design, not implemented by this planning pass. Beams remain traveling hoses; tip propagation needs separate tuning and range/lifetime accounting.
- Military-style Threat Scanner, compact beside action, never a Dragon Ball copy. Enemy detailed knowledge requires successful scan; public character browser can explain authored stats before play.
- Sort/filter class, role, movement and LeFevre threat separately. Threat is hierarchy, not a promise of victory or a substitute for matchups.
- Portable gadgets keep character/target visible. A fixed lab/terminal may open a full workbench. Power/gadget/weapon comparison is progressive: roster -> character -> kit -> exact ability.
- Team dome rule remains allies shoot outward / incoming shots stopped / everyone may enter on foot. Personal shield and team dome are separate items.
- First complete operation LOCKED: fight -> collect blood -> lab -> upgrade -> fight again. Finite replacement lives underpin defeat. See ../gameplay/BLOOD_UPGRADE_OPERATION.md; defeat occurs when no player-controlled fighter is alive and no eligible replacement remains. Escort/ambush follow later.

## What was wrong with distance?

The clearest verified distance correction was finisher knockback. Damage/reach were not raised. Small field finisher impulses fell below the normal launch threshold and horizontal damping shortened them. A bounded0.55s launch window lets them carry; practice targets also received the correct field knockback coefficient. The recorded recovery gap rose from about5.7u to14.1u; a later live combo showed14.7u. Strength resistance and funded guard remain relevant. See FINISHER_SPACING_REVIEW.md.

Beam cover evidence had a different problem: the observer watched damageBlock, while BeamHose directly changed cover HP and called setBlockCracks. Fixing the observer showed real cover HP900 ->301.143. That was not extending beam range. Existing range/charge tests and moving-contact clips do not mean beam speed has already been raised or moving-shot inheritance added. This pass makes no new speed claim.

## What the finished slice should feel like

Choose Soldier or LSW and see named teammates, class/movement/threat filters and a visible party lineup. Inspect a character's strengths and exact attacks before committing. Prepare at the Threat Lab: take a real weapon if class-eligible, select two LSW gadgets, practice scan/block/approach/throw, then depart via portal or clearly marked transport.

In the field, the camera stays outside your body in every stance. Double-tap dodge works predictably; sprint/flight tiers remain intentional. Projectiles launch convincingly from a moving character. Grenades land where their arc predicts rather than floating. Flying enemies approach and disengage at useful altitudes. Scanner shows a concise target readout while you still fight. Use/throw/reel gadgets without opening an inventory wall.

Complete one short objective, return a scientist/specimen/cargo as the selected operation requires, see its state and reward at the correct station, and receive an actual saved debrief with replayable next attempt. Tank/jet/building art follows the transport's efficient faceted style and shared scale. Working controls, collision and damage states are part of delivery, not just a nice model.

## Ordered execution

| Milestone | Work | Completion evidence |
| --- | --- | --- |
| 0 Baseline / handoff | Consolidated branch; separate audio branch; preserve raw local work; publish this plan and earlier audit | Branch IDs, clean scoped commits, local build/tests; audio worker can import a pilot package |
| 1 Remove play blockers | #29 prone camera, current inventory layout regression checks, bindings and dodge conflicts | Native soldier stand/crouch/prone, menu return, directional dodge; screenshots at desktop/landscape |
| 2 Combat mobility | #30 projectile inheritance, attack speed/range accounting, grenade arc/release, AI flight | Stationary/boosted launch matrix, native dodgeable shots, repeatable grenade tosses, mixed flight AI clips |
| 3 Make choices legible | #23/#31 character hub, threat/type sorting, attack comparison, compact scanner and gadget strip | Same native data in table/character/attack/scanner; no stale or hidden-enemy data leakage |
| 4 One complete operation | #6/#33 selected objective, weapon access/wayfinding, specimen/convoy return, failure/retry/debrief | One normal-input start-to-reward video plus failure/retry and save-reload; no injected wins |
| 5 Gadget and asset kits | #32 beacon/grapple/worn jets/team dome/turret; #10/#11/#26 transport handling, then tank and fighter jet; #12/#24/#25 staged buildings | Sources + exports + collisions + ownership cleanup + native use. Tank/jet first, motorcycle/ATV/van follow |
| 6 Audio / presentation / release | #17/#22/#28 AI recordings, ambient emitter integration, state icons, newsroom; #5 physical mobile; #4 release | Isolated listening acceptance, native loop cleanup, local complete checks, scoped merge and Mac/save transfer |

Audio content can run independently from milestone0. Audio runtime code integration remains coordinated with the main branch. Do not wait for all vehicle art to make milestone4 playable.

## Character and gadget interface proposal

Top level: portrait, class (Soldier/LSW), combat role (beamer/bruiser/grappler/support), movement (grounded/leap/flight), named threat band. Optional sort by exact resolved metrics. Do not collapse tactical role into threat.

Character detail: actual attacks, damage types, resistances/vulnerabilities, guard/escape traits, mobility, equipment policy and loadout. Attack detail: authored vs effective damage, cost, charge window, launch/travel speed, maximum range, area, cooldown, status and targeting rules. Compare on equal charge and modifiers; distinguish damage per hit from DPS and strength from combo output. Explain unknown/runtime-dependent values instead of inventing rankings.

Gadget quick use: icon, slot, charges, cooldown and deployed/ready state at the edge of screen; short aim/placement preview while held. Scanner side panel uses restrained military frame and data icons with stale snapshot time, not a giant decorative eyepiece. Workbench/full catalog is the place for comparing or re-equipping. Successful use returns to action. Current source-driven catalog is read-only,14 authored definitions; it is not yet the complete editable item database.

Aegis Cell/Shield Cell: currently personal ablative shield HP (shieldpack), not a dome. Existing beacon: plant at feet, activate later to return; throwable version is new work. Existing jetcell grants temporary flight but needs worn visual gear. Existing line/beacon naming needs audit before assigning it a grapple meaning. Grapple should anchor independently of your attack selection; holding one button to anchor and simultaneously using that same button to shoot is a conflict, so use separate gadget hold or explicit latch/release.

## Preserve every new request

- [ ] #29 soldier prone inside-body camera; keep C crouch; double-tap dodge and independent Shift tiers.
- [ ] #30 balloon grenades/short-long toss, projectile overtaking while flying, faster distinct beams, useful AI flight/air melee.
- [ ] #31 military scanner showing real threat/vulnerabilities; compact carried-gadget UI; character visible; stationary full-screen panels allowed.
- [ ] #23/#31 automatic live character/gadget catalog population; class/role/movement/threat organization; furthest beam/strongest punch/resistance comparisons; nested attack drill-down.
- [ ] #32 throwable teleport beacon; fast visible chain grapple/reel/anchor and shooting while attached; visible wearable jump jets; explain existing line beacon; personal shield vs size-bounded team dome; turret.
- [ ] #33 blood/sample/body collection; degradation state/time; return to cloning intake and storage; placement and learnable loop.
- [ ] #10/#11/#26/#33 transport handling, recognizable vehicle location, transport-style tank and fighter jet; shared authoring recipe; later motorcycle/ATV/van.
- [ ] #12/#24/#25/#33 bounded enterable skyscraper/house pilot; intact/damaged/wrecked buildings; beam damage changes collision/cover/nav, not just mesh; large-area map rules.
- [ ] #17/#28 AI one-shots/loops including ambient; audio-only ownership and import handoff; small three-file pilot before mass production.
- [ ] #4 consolidated development branch, audio child branch, explicit what-changed report and local tests. Not an automatic release merge.

Earlier requests and last-night evidence remain in SCREEN_PIPELINE_GAMEPLAY_AUDIT.md and COMBAT_ACCEPTANCE_RECONCILIATION.md (melee, grabs, beams, poses/speeds, UI, transport, sound rejection and limits). The screenshot of the broken portrait grid represents the initial failed grid iteration; a corrected rerun exists. Nevertheless baseline/browser provenance must be shown so players do not keep seeing stale screens and contradictory builds.

## Research notes

Detailed weapon inspection and perk/stat explanations are established patterns; our recommendation is to expose comparable information progressively, not overwhelm the active combat HUD. Example primary source: https://www.bungie.net/7/en/News/Article/destiny_update_9_0_0_1 . This is design inspiration, not evidence of our implementation or a survey of all players.

Operation Flashpoint's source release is real. Official source: https://github.com/BohemiaInteractive/CWR/blob/main/README.md . It describes C++20/Poseidon code under GPL-3.0-or-later with additional terms, and separate game-data licensing. Its flight model is not a plug-in for this Three.js runtime. Study handling/large-area principles, then explicitly choose compatible reuse/adaptation and test our controls; do not claim its model/assets are already imported.

## Audio-worker entry point

Give the other AI docs/AUDIO_AI_WORKER_HANDOFF.md. It owns audio content only and uses tools/build-audio-import.mjs plus the existing SoundLibrary APIs. It must not redesign the UI or modify combat while generating sounds. First pilot: light, heavy and weather-rain. No paid generation calls are made by this handoff or importer.
