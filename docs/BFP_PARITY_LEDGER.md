# BFP parity ledger

Updated 2026-09-07. **Not complete. No overall quality score.** Map design is excluded.
Automated checks establish their named contracts, not whether playing feels right.

## Baseline and evidence

The [recovered original guide](https://github.com/LegendaryGuard/BFP-docs/blob/main/docs/guide.md)
is the gameplay baseline. Existing local Ultra BFP footage frames inform camera composition, but
Ultra is not interchangeable with original BFP. The community code repository is a reconstruction,
not recovered original source. No BFP code, character assets or branding are imported here.

| Area | Current engine / observed gap | Character authoring |
|---|---|---|
| Rear camera, hover, flight, boost | Reference framing, six distinct flight families and normal-flight world-space boot trails; human feel still needs approval | Camera, seven poses per family, response and trail tuning available |
| Ground locomotion | Licensed Quaternius walk/jog/sprint retargeted onto production modular rigs; no BFP timing-equivalence claim | Authored/procedural selection plus source-labeled ground previews; arbitrary clip import remains open |
| First-person / visible-body view | BFP view parity not implemented in this pass | Not exposed |
| Five attack slots and power-level unlocks | Existing kit/level rules differ from BFP; optional level 1–10 slot gates now share the real player/AI input path | Progression inspector authors per-slot unlock levels; desktop and touch HUD show required level |
| Charge, steering and remote detonation | Traveling hoses plus explicit release-to-launch/second-press detonation; real mouse, energy, AI, interruption and ownership checks pass. Beam struggles now require actual contact and preserve altitude | Per-slot beam/projectile/volley/charge tuning and actual production contact preview, including 30-second charges |
| Homing, splitting, piercing and projectile interaction | Opt-in splitting emits 2–8 guided children. Priority-enabled shots now meet on a synchronized swept timeline: higher survives, ties cancel, earlier ordinary contact wins. Separately authored beams absorb ballistic bullets only after sufficient actual invested ki | Priority, bullet-absorption toggle and energy threshold in Attacks; real opposing-fire/contact previews |
| Melee, stun, block, evade | Held block and finite bot reactions; licensed jab/cross and bare-hand hook body motion; existing strike/grab/guard design retained. BFP timing parity unverified | Independent light/heavy authored/procedural choices, live contact rehearsals, traits/guard/evade selection; armed heavy and two-person grabs remain procedural |
| Power growth and transformations | Level scaling/aura ceremony follow altitude and gait ownership. Highest-reached authored form swaps appearance on the same fighter, preserving motion/attacks and queuing safely through ragdoll recovery | Level 2–10 forms author costume, proportions, palette and flight language; live level preview, save/undo/import/export/ORIGIN retention |
| Deathmatch, duel, survival tournament and teams | Local modes and networking code exist; BFP rules, winner persistence and network parity not verified | Not a character-package feature |
| Audio, warnings and attack feedback | Height-aware distance and camera-relative stereo for recordings, moving positioned charge/beam loops; per-attack sound/voice authoring incomplete | Voice pitch/yells only; Studio remains silent by default |

## Character packages — implemented slice

BFP separated attack assignments from presentation configuration. See recovered
[attackset documentation](https://github.com/LegendaryGuard/BFP-docs/blob/main/docs/bfp_attacksets_config_file.md)
and [model/skin documentation](https://github.com/LegendaryGuard/BFP-docs/blob/main/docs/customizing_models_%26_bfp_skin_config_file.md).

Studio now opens the existing ORIGIN creator directly through **New character** and **Edit power kit**.
Custom Export JSON includes the ORIGIN recipe plus current model, palette, camera, flight family, seven flight poses,
movement response and trail settings. Import installs a separate editable custom fighter in one storage write.
Legacy presentation profiles still import as drafts; shipped heroes still export presentation only.
When editing a kit inside Studio, appearance controls remain in the Model tab, including cape
on/off and color. The embedded power editor explicitly hides its competing appearance controls.

Packages reference the game's existing power catalog by ID and now carry validated, sparse attack
parameter overrides tied to the genuine source ability identity. A changed kit drops incompatible
tuning. They are not independent weapon plugins or arbitrary model/animation importers. External
model files, sound files and a BFP config interpreter remain absent. Validated transformation tracks and attack gates now travel in the optional progression section.

Verification: `npm run test:character-packages`, `npm run test:studio`, production build.
Browser fixture: create → presentation edit → export → clean-context import → reload → kit edit →
PowerWorld. Failure fixtures cover blocked/full/corrupt storage and unsupported import fields.
Screenshots: `artifacts/character-packages/studio-desktop.png`, `studio-mobile.png`.

## Attack authoring and remote lifecycle — implemented slice

The Studio Attacks inspector edits supported real production fields, preserves undo/redo and portable
custom packages, and previews beam, projectile, volley and charge contact against a real Fighter.
Derived detonation defaults follow authored width/DPS until explicitly pinned. Zero-radius and zero-damage
bursts are honored. Validation stays next to the edited field and preserves focus; mobile save state and
contact telemetry remain visible. Attack transport expands for long charge durations; the legacy Beam
transport retains its original eight-second sequence.

Remote detonation is opt-in, not a silent change to every existing kit. Player and AI use the same
second-press action and actual projectile/tip position. Deflection revokes the previous owner's control;
freeze/stun/stagger/grab stop remote emission. Charge entry is paid once, separately from ongoing drain.
Remote explosion shells use edge-weighted transparency so the opponent remains readable through the burst.

Focused browser evidence: inspector, four real attack previews, identity reconciliation, clean-context
package/runtime reload, 390px layout, authored 30-second charge, zero page and console errors. Real mouse
hold → release → travel → second press at zero ki also passed. Fresh Studio combat (nine cases),
encounter (four moving cases and three layouts), and character package browsers passed. The beam-contact
runtime and actual renderer checks passed, including delayed/unequal-speed counter-beams and walls
interrupting a struggle. Production build passed. This is not an overall game-completion claim.

References: `docs/plans/2026-09-06-remote-runtime-report.md`,
`docs/plans/2026-09-06-attack-studio-report.md`, `artifacts/attack-authoring/`.

## Next implementation order

Flight-language implementation and research provenance: [FLIGHT_LANGUAGES.md](reference/FLIGHT_LANGUAGES.md).
This adds distinct one-fist, two-fist, arms-back, repulsor, weapon-led and relaxed-glide silhouettes without changing the calibrated camera.

1. Split-shot runtime/schema and Studio integration passed focused review and browser verification:
   real child travel/contact, correct damage-event labels, package reload, mobile layout and zero
   page/console errors. Guided children inherit actual ownership and divided charge-grown damage.
   An original COMET example package also passed import/reload/real-key launch and splitting.
2. Attack lifecycle: projectile priority and beam/bullet absorption implemented with remote,
   player/bot, interruption, energy and ownership contracts preserved. Interception review, focused Studio/browser, full camera and flight gates passed.
3. Progression: attack unlock and transformation tracks implemented in the same editor; focused lifecycle, desktop/touch and custom-package browser gates pass. Full camera, flight, combat/world/soak and build refresh passed.
4. Reconcile melee/defense timing and remaining modes against footage and the guide; verify networking
   separately before calling it ready. Continue camera/motion visual review throughout.

Latest broad combat gate: all 53 roster kits passed seven attack checks each, world suite 42/42,
and a 30-second eight-fighter soak produced 1,467 hits and 12 KOs with no invalid states or errors.
Fresh production build: 212 modules. These checks do not establish BFP feel or complete parity.

The final camera, flight, six-language Studio and airborne-lighting suites also passed. Evidence
includes 159 locked roster clearances, 318 free-aim clearances, 45 timing cases, real mouse firing
and lock release, all 53 rigs across KO/recovery, trails at 30/60/120 Hz, twelve flight-style angles,
five transition phases, and shadow coverage at heights 8/220/450. Root inspected fresh close-range,
boost/bank/brake, arms-back/repulsor and split-contact captures. Split impacts now use the shared
transparent energy shell; focused Studio browser and combined attack/package Node100/100 passed.

Next collision design and mandatory RED cases: `docs/plans/2026-09-06-attack-interception-next.md`.

## Interception checkpoint (2026-09-06)

`collisionPriority` is -1/off or integer0..16; both ordinary shots opt in and allies are exempt. Split children explicitly opt out. Neutralization disposes once, never detonates/splits or applies later damage. Beam absorption is separate: `interceptBullets` plus `interceptKi` (default30); entry, preparation and paid sustain are measured as `investedKi`, with equivalent infinite-core credit. Shared-caster beam/orb sustain costs reserve against the existing payment order so two beams cannot spend the same ki for interception.

Studio adds **Contact test → Opposing energy shot / Ballistic crossfire**. These are labeled scripted production-projectile fixtures, not AI or balance proof. Counts come from actual manager contact callbacks. Test settings are not saved with a character; authored attack parameters are. Desktop/mobile captures and numerical results: `artifacts/interception/`.

Independent reviews closed shared-budget, bullet-rendering and misleading-control findings. Current focused beam27/27 and ascension9/9 tests pass; earlier combined attack/package regression182/182 passed before those additional edge fixtures. Full attack-authoring browser also passed, including remote/split previews, new/export/import/reload/PowerWorld and mobile. Build passed213modules. Fresh full roster53×7 + world42/42 + 30-second8-fighter soak (1,281hits/18KOs) passed with no invalid states or errors.

Known implementation bound: beam absorption uses already-emitted frame-boundary stream geometry and investment, re-clipped against current obstacles, not a continuous moving-beam field or future reach. Pair-query cost is O(n²) per event; worker measured empty-world simulation32/128/256opted-in shots at0.046/0.272/0.963ms per60Hz update, not GPU or dense-contact performance. Shipped defaults remain off. This does not certify BFP timing/feel or complete parity.

## Progression and playable examples checkpoint (2026-09-06)

Progression is implemented: `docs/plans/2026-09-06-progression-authoring.md`. Optional slot unlocks and sparse level-keyed appearances use production input and same-Fighter rig swapping; paid remote attacks retain control. Forms queue through KO restore and retain active beam/slot/target identity. Desktop and touch HUD expose required levels. Studio preview down-levels replay the encounter to clear previously paid attacks. STARLING export → fresh-context import → reload → ORIGIN edit preserves three forms. No remote-peer level/form synchronization or arbitrary model/audio-file import is claimed.

Fresh progression gate: combined 238/238 tests (includes a roster-pose browser), focused authoring/package/touch browsers, build 215 modules, roster 53×7, world 42/42, 30-second eight-fighter soak (1,347 hits / 15 KOs), full camera and flight/wake suites passed with no invalid states or errors. Later example/audio work has separate focused evidence.

Studio **Example characters** now creates explicit independent local copies: COMET demonstrates remote/split attacks; HELION demonstrates forms at levels 4/7/10, distinct flight languages, Q/R unlocks and energy-qualified beam absorption. No examples install without a choice. Canceled lazy loading and storage failure do not add roster entries. Factory tests, desktop/mobile browser and independent review pass; `npm run test:examples`, captures and exported HELION at `artifacts/examples/`. Example tuning is not a balance guarantee.

## Spatial combat audio checkpoint (2026-09-06)

Recorded combat now measures actual height from the player's body and pans relative to camera right. Nearby events ease through center; unpositioned/UI events remain centered. Recorded loops follow their live source position, respect mute, stop safely and disconnect owned audio nodes. All five charging power types now provide caster position. A real audio-rendering regression caught and corrected the mono panner's 3 dB center loss, preserving the original center mix without boosting stereo recordings or legacy no-panner fallback.

`npm run test:audio-spatial`: 21/21 Node tests and real OfflineAudioContext channel-energy/loop/lifecycle + production-game listener/charge routing pass. Independent review closed the mix finding. Evidence: `artifacts/audio/spatial-results.json`; build passes 217 modules. Scope excludes sound-file import, per-attack audio authoring, HRTF, occlusion and Doppler. DSP fallbacks remain centered, one-shots do not move after launch, and two-player audio still follows P1.

Final current-source refresh passes: `test:camera`, `test:combat`, `test:flight`, `test:progression`, `test:interception`, `test:examples`. Combat: 53×7, world 42/42, 30-second eight-fighter soak 1,225 hits / 11 KOs, no invalid states/errors. Full camera includes 159 locked and 318 free-aim clearances plus 45 input-timing cases; flight retains all 53 rigs through KO/recovery and trails at 30/60/120 Hz. Editor browser covers desktop/mobile, real form/input changes, save/import retention, canceled lazy imports and quota recovery. Separate focused runtime/package selection passed 169/169. These are named engineering gates, not a 10/10 or complete-parity verdict.

## Still open — not hidden by these checkpoints

- Direct play-feel approval against BFP footage: input/camera metrics and screenshots do not settle subjective responsiveness, animation weight or visual taste.
- Very-close locked melee readability: the heavy-hook review's real five-unit chase fixture still shows a steep view with foreground-body overlap. Effect-relative anatomy retention passes, but does not measure that baseline obstruction. Keep this separate from the already calibrated free-flight framing.
- External model/animation authoring and asset-backed portable packages. Fixed licensed ground, light-strike and bare-hand heavy-hook banks now have a reproducible ingestion path; arbitrary user clip/model import remains absent. Current packages deliberately contain validated data and authored/procedural animation choices only; do not shoehorn binary assets into the 100 KB v1 JSON path.
- Per-attack sound selection, recorded voice/file import, explicit editor audition and asset provenance. The current Studio remains silent and the gameplay recording library remains local.
- BFP-specific melee/defense timing and mode rules, optional first-person/visible-body view, and actual cross-peer progression/forms/ownership verification. Existing networking code is not evidence of complete multiplayer parity.

## Ground animation checkpoint (2026-09-06)

[Authored locomotion report](AUTHORED_LOCOMOTION_PASS.md) records source/license/mirror hashes, four baked takes (three wired), production retargeting, source/target comparison and Studio controls. Runtime keeps fixed limb lengths and authoritative physics; flight, guard, melee, hit reactions and final weapon grips retain priority. Visual review corrected exaggerated torso lean and false foot lift; regression review corrected run-pose contamination during form swaps. Side/back movement remains procedural and arbitrary super-speed foot locking is not claimed.

Fresh `test:locomotion`, `test:poses`, `test:blocking`, `test:combat` and build pass. Combat: 53 kits, world 42/42, 30-second eight-fighter soak with 1,056 hits / 11 KOs and no invalid states/errors. Build: 221 modules. This is a tested movement/authoring slice, not an overall game-completion or AAA-quality verdict.

## Light-strike and defensive authoring checkpoint (2026-09-07)

[Authored strike report](AUTHORED_STRIKE_PASS.md): pinned CC0 `Punch_Jab` / `Punch_Cross` supply fighting stance, independent hips/shoulders and elbow motion, retimed to the existing combat clock with final committed-point fist contact. Grounded punches plant the stance; aerial punches retain superhero legs. Source review corrected a shared bind-axis lean, over-twisted hips and near-extension elbow instability. Armed review corrected SARGE's shield entering his torso. A later [heavy-hook pass](AUTHORED_HEAVY_PASS.md) adds separate licensed hook/recovery takes for bare hands; two-person grab, guard and armed-heavy source clips and arbitrary asset import remain absent.

Studio **Model → Fighting motion** saves authored/procedural light strikes per character. **Melee stage → Grounded / Airborne** is a rehearsal setting, with actual light/heavy/block/crush/clinch/throw/slam contact. Custom export → clean-browser import → reload → power-kit edit → Play Test preserves the choice. Blocking and finite-reaction/aim bots remain covered by the separate [defense report](BLOCKING_AND_BOT_FAIRNESS.md).

Live Game and Studio now resolve melee after both fighters' poses, with swept relative target motion. A legal 210 u/s crossing cannot skip a fist at 30 Hz; tests cover 30/60/120 Hz, both entity orders, pre-frame teleports, form replacement and late interruption. Same-frame simultaneous damage still uses sequential tie policy; this is not network or comprehensive competitive-balance certification.

Final refresh: 71 combined CPU tests, all nine named gates in `artifacts/strikes/verification/results.json`, full 53-kit combat, world 42/42, 30-second eight-fighter soak (527 hits / three KOs), and 224-module build pass. Source/target and armed motion evidence, exact hashes and diagnostic-capture limits are in the report. Model art, full BFP timing/feel/modes and asset-backed character workflows remain open; no 10/10 verdict.

## Body surface and modular costume checkpoint (2026-09-07)

[Hero sculpt report](HERO_SCULPT_PASS.md): original continuous torso planes replace the blank barrel while preserving the rig's envelope, sockets and combat reach. Studio **Model → Body surface → Body definition** is saved, undoable, portable and independently overridable by transformation forms. Martial cloth and armor conform to the surface; the insignia follows its torso through charge twists, recoil, ragdoll and form replacement. Review closed waist intersections, attachment drift, shading seams and excessive intermediate tessellation. Final tactical/plated torso panels are 944 / 2,320 triangles, not a whole-scene GPU performance claim.

All 13 final named gates in `artifacts/hero-sculpt/verification/results.json` pass, including 61 body/rig CPU tests, real editor and clean-browser custom-package workflows, blocking/fair-bot regressions, flight styles, camera, full 53-kit combat, world 42/42, and the production build. The final 30-second eight-fighter soak recorded 1,050 hits / 24 KOs with no invalid states or errors. Seven motion fixtures, five phases each, isolated armed views and continuous production playback are recorded under `artifacts/hero-sculpt/`; diagnostic cameras are explicitly distinguished from BFP framing.

This remains procedural character art, not a finished AAA asset pipeline. Further heavy silhouette and costume/face/boot refinement is needed. Follow-up now adds a [user-facing isolation control](STUDIO_ISOLATION_PASS.md) for axial combat inspection, transformed-body framing and narrow full encounters, plus a [lower-fist, asymmetric hero hover](reference/FLIGHT_LANGUAGES.md#hero-rest-silhouette-follow-up-2026-09-07). Saved custom poses remain authoritative. The overall goal remains active, including source-asset authoring, BFP timing/feel/modes and cross-peer verification.

## Hero hover and inspection checkpoint (2026-09-07)

All 14 final commands in `artifacts/hero-hover/verification/results.json` pass: focused hover/inspection, full Studio/layout/progression, blocking/fair-bot, strike/pose, flight/wake/language, camera, portable-character, combat and build gates. Independent review closed active-form framing, mobile encounter clipping and a bow/thigh intersection on bulkier custom bodies. Nine procedural fixtures supply 54 sampled poses, 36 inspection angles and continuous fixed-step motion evidence; no recovered film/BFP take is claimed. The eight-fighter 30-second soak recorded 822 hits / 20 KOs with no invalid states/errors. This closes those bounded regressions, not overall AAA art, subjective feel or complete BFP parity.

## Source-backed body catalog checkpoint (2026-09-07)

[Asset body report](ASSET_BODY_PASS.md): two optional locally bundled Quaternius CC0 superhero bodies now share the production rig, contact, ragdoll, Studio, progression forms and validated character-package path. Native source bones follow the authoritative driven meshes, including late root/ancestor changes; source fingers, boots, optics, insignia and retained signature gear have focused coverage. Existing profiles remain procedural until explicitly changed. Procedural garment shells are not fitted to the imported body; the inspector explains their inapplicability. This is a known two-body catalog, not arbitrary GLB/FBX/animation upload or binary portable packages.

All 18 commands in `artifacts/hero-skin/verification/results.json` pass, including 40 focused source/runtime/profile tests and real UI save/reload/fresh-import/Play Test. Full combat: 53 kits × seven checks, world 42/42, eight-fighter 30-second soak with 893 hits / 20 KOs, no invalid states/errors; build 228 modules. Separate live camera runs on both source bodies retain actual mouse firing, visible tracked opponents and clean lock release. The body bank adds 4.04 MB raw / 1.41 MB gzip-9 and is currently synchronous; the build's large-chunk warning remains an optimization item.

Visual evidence comprises four source-bind views, sixteen production hover angles, 168 phase samples and 256 further moving combat samples. The latter cover two-loop light/heavy/throw encounters plus armed source/procedural comparison. A suspected axe/trunk penetration was rejected after correcting a test that mistakenly counted legitimate arm/grip contact. Remaining helmet/garment/weapon-motion refinement and subjective BFP feel are not hidden by these passing checks. The overall goal remains active.

Final test-only expansion: `npm run test:hero-skin` now includes 46 CPU tests, actual editor/package/Play Test and both source-body live-camera runs. The expanded command passed; no production changes followed the 18-gate run.

## Source-authored bare-hand heavy checkpoint (2026-09-07)

Subsequent close-camera and arena-controls work is recorded in the checkpoint following this one.

[Heavy-hook report](AUTHORED_HEAVY_PASS.md): the free CC0 Universal Animation Library 2 Standard source supplies actual `Melee_Hook` and `Melee_Hook_Rec` takes. Their pinned, byte-reproducible 65-frame bank drives hips, shoulders and grounded stance; final hand contact and authoritative physics retain ownership. Airborne legs retain the flight language. Studio saves an independent **Heavy punch animation** choice through undo/reload/packages/forms. Armed heavies deliberately retain their procedural weapon path; the object-throw source was not mislabeled as a two-person grapple.

All nine final commands in `artifacts/heavy-strikes/verification/results.json` pass, including blocking/finite-reaction bots, full 53-kit combat, world 42/42 and the 229-module build. The 30-second eight-fighter simulation records 1,246 hits / 16 KOs with no invalid states/errors. A separate capture verifies six grounded/airborne body fixtures, 24 whole encounters, 510 actual phase samples and exactly one heavy contact per fixture. Six production-render contact-effect checks also pass, but their close-lock body overlap is explicitly an open camera issue, not hidden by that FX metric. No overall completion or 10/10 claim.

## Directional teleport, defense and close-camera checkpoint (2026-09-07)

[Arena defense report](ARENA_DEFENSE_PASS.md): three custom-character teleport degrees, safe directional arrivals, actual-altitude effects, finite frontal deflection, optional ARENA mouse melee, buffered clinch throws and focus-loss cleanup. BREACH/RECON are original proposed military additions; MERC's missing firearms are restored. Camera keeps BFP's centered rear boom, full close lift and an adjustable localized cutaway. No map redesign.

All 13 serial gates in `artifacts/arena-defense-verification/results.json` pass, including 59 focused CPU checks, real input/editor workflows, 18 rendered close-combat cases on three bodies, full BFP camera regression, packages, flight and build. Full roster: 55 kits / 385 successful ability checks, world 42/42. Both baseline and mixed military/teleport/deflect eight-bot 30-second soaks finish without invalid states/errors. These are bounded regression results, not a subjective score, equal-matchup guarantee, independent-review approval or completed BFP/ESF parity. The existing body-bank chunk warning and broader art/network/upload gaps remain.
