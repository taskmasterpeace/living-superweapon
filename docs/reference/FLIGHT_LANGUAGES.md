# Flight languages — reference-driven procedural pass

2026-09-06. This is a production rig/Studio implementation pass, not recovered movie animation or a claim that BFP parity is complete. No map changes. The calibrated BFP camera constants are unchanged.

## Visual evidence and interpretation

The user's Ultra BFP 2:44 comparison is the primary framing/trail reference. Its fighter sits below the aim lane, with an active asymmetric airborne stance and conspicuous trails behind the boots. Matching only the hair/boot landmarks failed to reproduce that motion language. See also [camera provenance](BFP_CAMERA_AND_POSE_SOURCES.md).

The following stills were actually inspected, not accepted from search captions. Joint angles below are original procedural authoring for our rig; a still establishes silhouette, not transition timing.

- [Iron Man, 2008 still (GMA)](https://www.goodmorningamerica.com/culture/story/back-iron-man-10-years-start-marvel-cinematic-54876151): prone body, arms swept rear/out, palms as stabilizers, foot thrust. [Marvel's flight-design video page](https://www.marvel.com/watch/trailers-and-extras/marvel-iron-man-vr-learning-to-fly) discusses intuitive repulsor control; its full video was not reviewed.
- [Superman comic still](https://canaltech.com.br/quadrinhos/superman-tem-um-poder-classico-tao-perigoso-e-mortal-que-ele-evita-usar-263277/): both fists lead the body, with slight shoulder/elbow asymmetry. Supports a two-fist option alongside the one-fist family, not one universal Superman pose.
- [Goku canyon flight still, IMDb episode gallery](https://www.imdb.com/title/tt0851648/): the actual image shows Goku looking ahead with arms swept back/out, not the search caption's claimed forward fist. [Image inspected](https://m.media-amazon.com/images/M/MV5BYjgwN2Y0NDUtMWI4OC00NDE2LWFjZDUtYTc5YTMzM2JhNDY2XkEyXkFqcGc%40._V1_.jpg). A separate episode-30 still shows airborne combat with a raised knee; it is not a cruise loop. A search hit depicting Uub was rejected as a Goku reference.
- [Thor, Disney](https://www.disneylatino.com/novedades/como-se-llama-el-martillo-de-thor): raised weapon, asymmetric offarm and split legs. This is an airborne launch/attack still, not proof of continuous cruising posture. Our weapon-led family adapts that silhouette to STORMCALL's existing axe and driven hand socket.
- [Invincible promotional still](https://www.geeknerdnet.com/blog/2021/3/24/amazon-prime-video-rose-bowl-invincible): relaxed prone cruise, open hands near the thighs, head looking ahead. Adapted to VANGUARD; its boost changes to a closed leading fist.

## Runtime and authoring

| Studio language | Runtime ID | Shipped examples | Distinction |
| --- | --- | --- | --- |
| One-fist lead | hero | SOL | Right fist ahead, offarm trailing |
| Two-fist spearhead | twin | MAJESTY | Both fists ahead, streamlined boost |
| BFP arms-back | martial | KANO, VEGA | Raised chest, rear-swept arms, asymmetric legs |
| Repulsor stance | thruster | IRONCLAD, TITAN | Open palms, restrained elbow bend, symmetrical braking |
| Weapon-led flight | hammer | STORMCALL | Weapon-bearing right arm leads, split legs and offarm |
| Relaxed glide | glider | VANGUARD | Open trailing hands; closed left-fist boost |

Every family has hover, forward, boost, brake, backward and two lateral targets. Directional blends retain the existing upright attack-ready strafe/backpedal rules. Velocity controls body engagement; combat retains hand/weapon ownership. Families and all existing joint controls are in Studio's Model/Pose tabs.

Flight tab adds lifetime, width and strength. Strength zero disables allocation. Older v1 profiles receive wake defaults in memory without overwriting saved records. Complete custom-character packages carry the flight style, joint overrides and trail settings alongside their kit and appearance.

Trails use the actual boot transforms and bounded world-space history (128 samples, two ribbons/one mesh). Normal fast flight emits them; boost widens newly emitted history. Existing history fades on braking without vanishing because current speed is zero. Turns preserve the traveled curve, teleports break it, hidden fighters suppress it, and disposal releases its resources. Studio uses the same class with real traveled positions, not a fake stationary streak.

Visual review also replaced the old rectangular wing panels on winged figures with two tapered, beveled torso-mounted vanes. The camera regression caught STORMCALL's raised axe crossing the target line; its authored arm now opens outward instead. Repulsor palm placement is checked spatially outside the shoulders, not merely by naming rotation fields “spread.”

## Evidence / limits

`npm run test:flight-languages` checks distinct silhouettes, attack hand priority, frame-rate variants, normal-flight wake persistence, authored settings, six Studio families, inspection angles, transition phases, repeatable seek and paused orbit. `tools/flight-language-reel.mjs` records real-time Studio playback of the six shipped examples through an eight-second transition cycle. Results and stills live in `artifacts/flight-review/languages/`.

This pass does not add imported film/anime clips, a new flight physics model, per-style sound design, or new palm-thruster emitters. It does not establish subjective feel or exhaustive BFP parity from automated checks alone. Review the moving sequence and play the game, especially aim visibility during airborne combat.

Verification run: production flight/53-rig recovery, full Studio suite, complete-character export/import/play test, BFP camera framing and 159 locked-target cases, 318 free-aim clearance cases, and lighting at heights 8/220/450 all passed. The new checks include ordinary-flight wake history at 30/60/120 Hz, braking persistence, closed combat/weapon grips, paused orbit and repeatable scrubbing. An obsolete camera test assumed maximum boost at 150 u/s; it now uses the unchanged production `PW_AIR.top` rather than altering camera behavior to satisfy that assumption.

## Hero rest silhouette follow-up (2026-09-07)

The hero family's previous hover reused martial forearms, giving SOL two similarly raised fists in front of the waist. The original procedural `HERO_POSES.hover` target now lowers and separates the fists beside the hips, with one tucked leg and one long leg. This is only the hero rest pose: other flight families, forward/boost targets, gameplay camera, physics and combat ownership are unchanged. Existing saved joint overrides are not migrated or overwritten; shipped defaults and an explicit pose-family replacement use the new target. Studio's existing Pose controls author the same values.

The selected source is `src/data/flight-tuning.js`, an eleven-joint procedural target—not a recovered BFP/film take or newly imported clip. Acceptance rows are Flight/jump, Weapon/prop contact and Source gap preview. This pass concerns airborne rest and transitions; existing flight regressions own takeoff/landing. Tests observed the old forward-fist assertion fail at 30/60/120 Hz, then pass with the new target. They also exercise explicit saved overrides, root and fixed limb lengths, and flight→brake→hover→guard→hover continuity.

`artifacts/hero-hover/` holds 54 production samples (0/25/50/75/end and pre-wrap), 36 front/both-profile/rear views, the unchanged Game camera view, and `motion.webm` containing two complete SOL transition cycles plus armed STORMCALL and bulky GALE cycles. These forced hero-family variants are explicit custom-authoring stress fixtures; shipped STORMCALL remains weapon-led and GALE remains martial. The six shipped examples retain their distinct families. Only inspection cameras are custom; no images or source animations are composited onto the rig.

Armed review caught a real bow/thigh intersection, including after raising GALE's body bulk. The final default opens the shoulders and brings the left fist slightly forward without returning to raised forearms. Vertex and triangle-centroid probes against both actual thigh meshes failed before the fix and now pass at bulk .79/1.2/1.65. Independent CPU review also checked representative min/max/wide/tight frames, saved-override retention and full roster inspection bounds. A pre-existing extreme-frame shield/torso overlap remains outside this change; arbitrary authoring values are not guaranteed collision-free.

Focused regression command: `npm run test:hero-hover`. Reproducible review capture: `node tools/hero-hover-review.mjs`. Full refresh ledger: `artifacts/hero-hover/verification/results.json`; check the completed command statuses rather than inferring a quality score. Remaining art weaknesses include generic faces/boots, simple armor/weapon shapes and STORMCALL's obstructive head covering; a stronger hover does not close those gaps or certify AAA/BFP feel.

The review recording advances the production simulation in fixed 1/60-second steps; headless rendering can play slower than real time. It is continuity/attachment evidence, not a frame-rate benchmark or proof of input feel. The script hides unrelated draft sidebars and labels its current fighter, procedural state, simulation time and custom camera explicitly. Real editor interactions are verified separately by the Studio browser gates.

Final refresh: all 14 commands in the hover verification ledger passed. This includes 14 focused hover/language CPU tests, eight inspection CPU cases and real visibility/contact/browser checks, full Studio/progression, blocking/strikes/poses, flight/wakes, gameplay camera, clean-browser packages, 53-kit combat and build. The final 30.013-second eight-fighter soak produced 822 hits / 20 KOs with no invalid states/errors. Camera reference bounds remain 62.13% / 88.14% with 73.74° vertical FOV. Two old assertions encoded previous art values; the reset expectation now matches the intended hero default, and live hover verifies the authored angle plus actual hand FK instead of demanding the old minimum elbow bend. No runtime tuning was changed to make those obsolete assertions pass.
