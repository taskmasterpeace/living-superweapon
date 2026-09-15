# What to download and what it unlocks

The full library contains 73 entries. All 73 were searched and triaged. A matching
Fab listing or official creator/Epic source was found for 71; the current Ingame
Level Editor listing and Replica service remain unresolved. This is a public
contents audit, not a check of account-specific license tiers, local files or every
showcase video. The six previously staged purchases remain source-checked only.

[All 73 entries, sources and tradeoffs](FAB_LIBRARY_FULL_TRIAGE_2026-09-14.md)
and [machine-readable inventory](FAB_LIBRARY_FULL_TRIAGE_2026-09-14.json).

## Download order

Do not buy any of these again. First try the formats covered by the existing
entitlement. Download priority is not an instruction to implement every pack now.

| Order | Owned content to retrieve | Why it matters | Limit |
| --- | --- | --- | --- |
| 1 | Superhero Flight Animations — Indie-us Games | Five hover modes, fast flight and additive poses directly support different flyer styles. | Export motion; Blueprints and blend-space/controller logic do not execute in our game. |
| 2 | Close Combat Animset; Kickboxing and Muay Thai V2; Kung fu V1 | Broader kicks, stances and distinct fighting styles alongside our staged Boxer pack. Publisher counts: 46 in-place + 33 root-motion for Close Combat, 22 Muay Thai, 39 Kung fu. | Variants are not extra unique actions; choose a coherent small set per style. |
| 3 | Realistic Knockdown Motion Pack | 26 directional impact reactions with strong initial body response. | UE4/UE5 copies are duplicates, blood FX are excluded, and recovery still comes from our get-up pack. |
| 4 | Rifle Starter; Pistol Starter | Dedicated armed movement, aiming and shooting. Rifle: 11 animations/33 files; pistol: 16/29. | Starter is not Pro. No complete attached-cover/peek/blind-fire or akimbo suite confirmed. |
| 5 | POLYGON Prototype; then POLYGON City | Build a readable Threat Lab and one compact urban combat block with matching art. | Confirm editable source entitlement. Geometry does not come with our destruction or collision integration. |
| 6 | Animalia German Shepherd | Richer dog locomotion, looking, resting and transitions than our current starter animals. | Creator sources describe approximately 98–99 motions across versions; inventory the actual download. Fur and high-resolution textures need adaptation. |
| 7 | 56 Animations For Creatures | Different humanoid monster/infected behavior silhouettes. | The listing explicitly includes only the UE mannequin. This is not a quadruped pack or a finished alien model. |
| 8 | Dual Sword Kit | 38 sword animations to review for dedicated dual-sword fighting. | Our current preview still uses a generic sword hold. Ownership is newly confirmed; integration is not. |
| 9 | Paired Suplex Wrestling | 12 sequences and example chained throws; strong Rage candidate. | Optional extension after ordinary grab/throw contact works; not a blocker for the current sequence. |
| 10 | Interaction Pack; then Flips and Tricks | Actual prop-use motions and matching interaction sounds; 20 acrobatic moves for later evasions. | Prop alignment, first-/third-person selection, landing and control-return rules need review. |

Pistol Starter's current listing offers [purchase registration and format switching](https://mocaponline.com/pages/register-your-purchase).
Rifle Starter lists source FBX. Prefer the offered FBX option before assuming
these two require a full engine installation. The six extracted packs already
cover aerial paired interaction, carry, throws, hostage actions, boxing and get-up;
do not re-download them merely to change format.

## Answers about the existing game

**Can we make these things?** Yes, these sources make the proposed features
practical to build. They do not instantly implement AI, damage, control or
contact. An animation supplies motion; our game must decide when it starts,
where it hits, whether it is interrupted, and when control returns.

Vampire fangs can be an optional head/jaw attachment, with eye appearance as a
separate character setting. We do not need to replace every character's teeth.
That is an authoring proposal; feeding contact and readable reaction take priority
over a detailed dental system.

**What did husky/wolf mean?** Real local models exist at
`public/models/quadrupeds/husky.glb` and `wolf.glb`, each with 12 embedded clips.
They currently have a Creature Foundation preview path. The separately authored
Dec-52 hound has a limited native Threat Room bite encounter. Those are three
different things, not a finished German Shepherd companion. Animalia is a new,
richer owned source option; its rig is different from both starter animals and
our nanite hound.

**Can Rage use the grabs?** Yes. Rage already has `art: powergrap`, Strength 10,
heavy attacks, leap and Rampage. Make him the first ground demonstrator for
overhead lifting, back throws and slams. "Humanoid grappler" means a two-legged
character whose fighting style favors throws; it does not mean adding another
roster character. Source contact must accommodate Rage's body size.

**What does catch/react mean?** Two synchronized source animations: one for the
person grabbing, one for the person being grabbed. The intended outcome is a
held character moving convincingly during hover, travel and release.

**Do we have spears or akimbo?** Spear models, grips, weapon-contact surfaces and
a procedural thrust family already exist. The modular spear preview still names
`Sword_Idle` and a missing dedicated source thrust. These are different coverage
levels. Left/right and paired emission code exists for powers; this audit did not
prove a complete two-pistol inventory/fire/reload animation pipeline. The new
Dual Sword Kit is a source for dual swords, not dual pistols. Remove nunchucks
from the immediate scope per the user's latest direction.

"Weapon profiles" means each weapon gets the correct hand ownership and stance.
It does not mean every character may equip every weapon. Soldier and signature
weapon eligibility remains a separate game rule.

**How does melee hit?** In the current `melee.js` path, an attack progresses
through startup, active contact and recovery. During the active phase, the engine
sweeps the fist or weapon between poses against eligible targets and obstacles.
The reviewed ordinary body path checks torso/head/pelvis, plus special nanite
contact; it is not proof of complete per-limb damage. A target being selected or
inside approach range is not sufficient to score a hit. This is source evidence,
not a fresh visual acceptance of all clips or all ability-specific attacks.

**Can we use cover shooting?** Yes; it is a worthwhile soldier feature. Current
physical cover/occlusion can support it, and the Starter packs supply aiming and
crouched movement. A finished wall-attached cover loop was not found in the
reviewed code. Build a small sequence: crouch behind a waist-high barrier → rise
or lean to expose the muzzle → fire → return. Check muzzle obstruction, camera
aim, hand placement and cover destruction. Start with ordinary crouch/pop-up
cover; blind firing, edge traversal and vaulting can follow. Do not label a
crouching clip a complete cover system or assume Starter includes Pro features.

**Comic motion lines?** Already partly implemented: `game.onHit` triggers radial
impact lines for qualifying unblocked heavy hits involving a human player;
`printpass.js` renders/decays them, gated by `fxSpeedLines`. That is different
from a curved trail following a fist. Proposed addition: a short swept arc on
committed punches or sword swings, fading quickly so it does not hide contact.
The animation/contact audit remains higher priority than another shader pack.

## Opportunities beyond the earlier vampire list

These are proposed extensions, not assertions that all underlying powers are absent.

| Playable idea | Useful owned material | What the player gains / cost |
| --- | --- | --- |
| Soldier holding an alley while a flyer attacks above | Rifle/Pistol, City, Prototype | Cover exposes different counterplay to flight. Needs cover states and muzzle checks. |
| Rage turns street furniture into weapons | Carry/Throw, City/Town props, Vehicle Variety | A car becomes cover, then a thrown obstacle. Needs mass, grip, damage stages and cleanup, not only a mesh. |
| Counter-fighter with a visibly distinct stance | Boxer, Kung fu, Muay Thai, Close Combat | Timing, guard and recovery create a fighting style beyond damage multipliers. Requires contact/cancel tuning. |
| Elemental armor changing combat behavior | Status Effect, Body FX, Eight Elements | Stone/metal/crystal states can communicate armor and vulnerability. Shader appearance must be tied to explicit gameplay rules. |
| Interruptible caster or summoner | Evil Magician, Eight Elements, Appearance/Dissolve | A readable windup gives opponents a chance to interrupt an area cast or summon. Creature spawning and budgets still need work. |
| Tracking an enemy through a damaged street | Surface Trails, dog motions, city props | Footprints, disturbed surfaces and sounds can provide readable clues. Trail persistence and dog AI are separate implementations. |
| Usable building interiors and noisy interactions | Interaction Pack, Modular House, Sci Fi Office | Opening a door or activating an alarm becomes observable/audible gameplay. Needs event-driven sound and accessible interactions. |
| Nonlethal surrender and restraint | Superhero Interaction, Hostage | Capture has outcomes besides throwing or killing. Requires surrender/escape rules and AI state transitions. |

Do not implement all eight at once. The first playable slice should combine a
flying hero, Rage, one armed opponent, one throw-capable prop and a short cover
lane. That exposes animation, collision, damage and weapon problems quickly.

## Art, destruction and engine limits

Choose **Prototype → City → Town** as the primary environment family. Use one
block with alleys, rooftops, a street and a test interior. Photorealistic forests,
automotive scenes and several unrelated house packs have lower priority because
mixing them increases material, scale, collision and performance work.

The owned [Destruction System](https://www.fab.com/listings/9a717000-5bc9-49bb-970e-e2610e5560cc)
uses predefined damage-state meshes with debris/sound/particle hooks. It is a
useful staged-damage design, not automatic arbitrary fracture, terrain excavation
or a guarantee that collapsing floors handle occupants. Prototype selected props
and wall sections before structural collapse. City/Town assets do not automatically
include our required intact/damaged/destroyed variants.

Unreal Blueprints, Niagara/Cascade effects, material graphs, cloth, editor plugins
and vehicle physics do not run in Three.js. Eligible meshes, textures, sounds and
animation data may be exported, but their behavior needs native integration.
For effects, start with small game variants and reusable textures/meshes; avoid
the 8K cinematic explosion assets as ordinary repeated combat FX.

Runtime Audio Importer is a software plugin, not a new sound library. Interaction
Pack actually includes interaction sounds and is the more relevant download for
that gap. Replica's current service could not be verified; do not rely on a legacy
plugin entry as evidence that dialogue generation is available.

## Why the download buttons differ

- **FBX/GLB/Unity/source offered:** download an available source format covered by
  the entitlement. FBX is the preferred animation interchange here; GLB can be
  generated for runtime later.
- **Unreal Add to Project:** install a supported engine, create/open a Blank
  Blueprint staging project, and add the asset there. Export animations/meshes;
  do not copy `.uasset` files directly into the browser game.
- **Reference Only:** this access tier supplies a referenced UEFN asset, not
  editable source. Choosing the Unreal/source format may reveal an existing
  entitlement; if the account only owns Reference Only, installing an engine
  does not grant source access. Check the selected tier before buying anything again.
- **Legacy Epic content:** not every item follows the current Fab Standard
  license. Subway Sequencer explicitly says UE-only; Epic's original Infinity
  Blade grant is UE-restricted. Those are excluded from the browser export queue.

[Fab Standard summary](https://www.fab.com/eula) distinguishes editable-source
rights from Reference Only. [Epic downloading documentation](https://dev.epicgames.com/documentation/en-us/fab/purchasing-and-downloading-assets-in-fab)
explains the library/download routes. Account-specific ownership was not inspected.

The launcher logs read during this audit did not establish a failing engine
install or why the UI said initializing/verifying. No installer was cancelled,
cache deleted or engine version changed. Do not interpret that status alone as
proof that the purchased asset is unusable.

## Handoff

This pass produced a sourced 73-item inventory and prioritized decisions. It did
not import these additional 67 library entries, migrate engines, implement cover,
retarget new paid motions, or claim new gameplay tests. Next implementation remains
the current-model grab/carry/throw sequence, with the above download queue feeding
it and melee next. Keep the six source-staged packs separate from newly reported
ownership until their actual files are inspected.
