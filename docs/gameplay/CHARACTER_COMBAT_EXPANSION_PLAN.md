# Character identity and combat follow-up plan

2026-09-12. Main implementation focus remains Threat Room selection, teaching and reliable native combat. The following is a tracked expansion plan, not a claim of completed features.

## Current audit

55 roster entries use 27 ability types. Explicit magic damage tags occur on MYSTWARD and MARSHAL; mystical themes can exist without that tag, so this is not a total count of magic-themed heroes. Reusable primitives already include portals, teleport, summons, mindcontrol, lifedrain, cones, fields, chains/grapple, constructs, mines and traveling beams. Prefer making these visually and tactically distinct before multiplying new types.

The shipped aura is an animated open energy shader driven by charge/buff/tier states (docs/AURA_READABILITY_PASS.md), not a full aura authoring catalog. Ten authored animation clips are cataloged; recipes and mapping-based retargeting exist. Procedural grab/flight/fall previews and new move-family assignment are still incomplete. Additional ShootEM FBX files exist and need rig/take evaluation. See ANIMATION_CONTENT_WORKER_HANDOFF.md.

## Desired editor experience

Preserve our stylized supported body families and Impact UI. Character identity, costume, aura and gameplay are separate linked recipes. Text-to-hero drafts choose registered body/parts/hair/colors/emblem/movement/powers; unsupported requested features are shown as missing. User can inspect and revise before applying. A costume must never silently grant powers or weapons. Consistency across portrait, selection, Studio, live character and KO is the first quality gate.

VEGAS: black outfit, old-gold trim, front/back V, bald Black identity retained. Add dreadlocks as reusable compatible hair content; choose its character assignment later. Emblems can use transparent atlas textures with separate optional emissive mask; test mip padding, bleed, transparency and per-body placement. Emission should follow meaningful states rather than constant bloom.

Aura families: energy streams, smoke, frost/mist, wind/feathers, electricity and arcane seals. Shared state slots idle/charge/boost/attack/drained/KO; density, direction, color, socket, fade, sound IDs and desktop/mobile budgets. Quiet idle, readable charging and deliberate peak power. VOLT bubble remains a distinct gameplay field. See #39.

Magic duplicate wizard: real damaging bodies, one player-controller identity, deliberate switching, last-body survival, shared resource/cooldown budget, bounded clone count, readable switch and counterplay. This needs actual ownership/control work; summons and mindcontrol are foundations, not a finished implementation. Proposed starting balance: original plus two copies, reduced copy damage. See the new duplicate-caster issue.

## Priority and tickets

1. Finish Threat Room choose/preview/fight/review/reset (#6). Keep playable candidate.
2. Shared fist/grab alignment (#14/#35), energy-first guard and approaches; improve rig constraints/falling (#20).
3. Prone camera (#29), fast-flight invisible collision (#24), vehicle slope support (#26). Z communication is proposed; preserve soldier prone until a complete replacement binding exists.
4. Ranged reach audit then provisional 2x effective reach (#15/#30). Account for maxLen, tip propagation, segment history, lifetime/range, hit collision and AI perception independently. Preserve traveling beams and damage; longer reach is not permission to make every weapon faster. Test VEGAS first and measure more live projectiles.
5. Appearance/aura recipe proof (#23/#39), animation worker import and paired grabs (#35), then more magical identity.
6. Transport-style aircraft (#10/#11); use consistent scale, doors, seats, sockets and geometry budgets. Art success does not prove flight handling.

Beam-ground light: first prototype a terrain-conforming additive footprint or emissive strip with bounded pooled non-shadow light where worthwhile, tuned stronger against night ambience. Avoid a shadow-casting point light per segment. Clip to terrain/cover and test indoor light leakage. Existing projectile/beam code already borrows pooled lights. Exact cost must be measured on representative desktop/mobile scenes. Three.js explains shadow map scene redraw costs: https://threejs.org/manual/en/shadows.html .

User screenshots: ChatGPT_uhxDvyZufF.png hand/wrist/thumb; msedge_Bbpj7qlwX8.png prone camera through body; msedge_3QwEXRQCum.jpg slope/ground-stamp context. They show symptoms; slope dynamics and invisible-flight collisions require reproduction. transport-review.png is visual direction for modular stylized vehicles.

## Twenty lower-code improvements

Relative implementation effort, not a promise every item is trivial; verify existing support before adding.

1. Show approach-ready reticle using actual reach/LOS.
2. Say why melee missed: out of range, dodged, obstructed or interrupted.
3. Display the current combo step briefly near the target.
4. Give funded guard a crisp flash and distinct sound event.
5. Mark guard break and its remaining recovery window.
6. Show contextual grab eligibility/rejection before E is pressed.
7. Show aimed throw landing estimate using native trajectory.
8. Color damage icons by type consistently, with text tooltips.
9. Use flesh/metal-specific existing impact presets.
10. Put useful keyboard/pad hints at each Threat Room station.
11. Add one-action repeat of the last chosen scenario.
12. Add readable distance markers for beam/approach practice.
13. Show explicit class and movement family on roster cards.
14. Show which attacks deal magic/fire/energy before selecting a character.
15. Add favorites to the roster and animation library.
16. Give abilities distinct existing projectile silhouettes before new mechanics.
17. Add charge-release threshold ticks matched to real charge.
18. Expose missing audio/animation assignment badges to authors.
19. Make speed trails start near the visible feet/body and fade on stopping.
20. Fade/pool overlapping ground impact stamps to reduce dark piles.

## Ten additional useful proposals

1. Comparison view for two heroes: speed, approach, durability, range and counters.
2. Save/share deterministic Threat Room scenario codes with seed and content version.
3. Training-only attack corridor visualization to explain a miss.
4. A performance preset that reduces effects while preserving combat information.
5. A recent-death summary naming the last three hits and defense opportunities.
6. Toggle input display for tutorials and recorded development clips.
7. Content dependency report: which heroes/scenarios use a changed move or effect.
8. Repro bug bundle: build ID, character/profile, recent inputs, location and collider IDs.
9. Accessibility presets for reduced flashes, turbulence and camera shake.
10. Preset migration/rollback so old character saves survive schema updates.

These suggestions do not expand the active implementation queue automatically. Select a coherent subset after the current Threat Room milestone; fixes that block play outrank added spectacle.
