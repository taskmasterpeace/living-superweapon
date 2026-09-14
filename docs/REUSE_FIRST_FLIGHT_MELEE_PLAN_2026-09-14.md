# Power World: reuse existing motion before buying more

This audit follows the user's direction to prioritize flight and melee, reuse existing animations, and leave inventory expansion and advanced traversal for later. No gameplay changes are made by this plan. It supersedes the earlier recommendation to start by purchasing/reviewing a paired-animation pack.

## What can be reused

The full local UAL1/UAL2 source inventory contains 253 unique take names. A take existing in the source archive does not mean it has been retargeted, visually accepted or connected to gameplay. The bank builder still selects a small allowlist rather than importing every take.

| Desired action | Existing material | Adaptation and limitation |
| --- | --- | --- |
| Friendly shoulder carry | Native friendly carry, held-hand IK, source PickUp_Kneeling (1.93s), PickUp_Table (.83s), Walk_Carry_Loop | Author the supported shoulder pose and transition. Reuse pickup reach/weight shift where suitable. Neither pickup is an existing fireman's-carry performance. |
| Calm, struggling or limp carried person | Existing held and fall studies; source idle/air reactions | Pin the supported torso/pelvis and holding hand. Layer bounded forearm/shin movement for conscious motion; suppress deliberate struggle while stunned. A friendly passenger need not constantly fight their rescuer. |
| Throw objects or people | Current procedural person throw; OverhandThrow (1.33s); Push_Enter/Loop/Exit | Extract load, release and follow-through for the appropriate grip. A one-hand overhand throw cannot simply become a convincing two-body throw or a broad overhead lift. |
| Punch/kick/knee variants | Punch_Jab (.87s), Punch_Cross (1s), Kick (1.10s), PunchKick_Enter/Exit, Melee_Knee (.87s), Melee_Knee_Rec (.23s) | Trim idle padding, retime anticipation/recovery independently, mirror with anatomical checks, change target height using bounded contact adjustment. Contact frames and control return remain explicit. |
| Airborne hit → fall → recovery | LiftAir, LiftAir_Hit_L/R, LiftAir_Fall, LiftAir_Fall_Air_Loop, LiftAir_Fall_Impact, Hit_Knockback, existing native get-up | Reuse one reaction chain with different launch directions. Simulation controls trajectory; motion must not add another launch. LiftAir is an aerial reaction family, not evidence of a carrying animation. |
| Axe/bat/tree swings | Sword tracks and TreeChopping_Loop | Reuse trunk/weight-shift portions, then rebuild grip spacing and strike/contact paths. Do not assign tree chopping unchanged as a balanced combat attack. |
| Later flips and wall kick-offs | BackFlip (1.93s), DoubleJump, WallRun_Jump_L/R | Sources exist. Wall detection, valid surface normals, jump budgets, landing and control-return rules are still separate controller work. |

This approach already exists locally: `tools/build-modular-motion-bank.mjs` derives Infected_Sprint_Loop from source sprint leg/root tracks while replacing arm tracks and adding head/chest lean. The recent throw transition is procedural joint motion. Neither example makes all its variations visually approved.

## Shoulder-carry implementation contract

Current `person-carry.js` holds the receiver ahead of the carrier, with an upright underarm presentation. It is not a shoulder carry. The next variant should use a supported carry frame with a chest/pelvis support point at the carrier's shoulder, one or two appropriate hand contacts and a defined body-clearance envelope.

1. Entry: reach, load, hoist, settle. A mass-to-capacity ratio controls effort/duration and whether the lift is allowed. Body dimensions choose where contact fits; size and mass are separate inputs.
2. Hold: carry frame follows the carrier's orientation with bounded pitch/roll adaptation. Hover hangs differently from forward flight. Sweep both bodies along their paths; never rotate only the mesh while leaving an upright receiver collider elsewhere.
3. Motion: keep support contacts stable. Free-limb overlays supply calm sway, short resisted movements or limp response. Keep head and limbs out of the carrier's body; do not rotate elbows backward or stretch bones.
4. Exit: safe setdown, intentional throw or interrupted drop. Preserve the existing friendly landing behavior where intended. Neither authoring a hold pose nor attaching a mesh completes this lifecycle.

Rear hostile grabs remain useful for the user's previously requested interception from behind, but a broad hostage/choke system is optional. Implement shoulder carry and ordinary capture/throw before branching into executions or a large wrestling library.

## Momentum and collisions: current code

Velocity vectors and flight speed exist. Collision response is not yet one consistent momentum/mass system:

- `Fighter._wallContact` (`src/engine/entity.js`) can damage destructible cover/vehicles above speed 34 world units/s using speed × .55; vehicles require powered movement. This is the character's speed, not relative closing speed or shared mass-based collision energy.
- Terrain sweep stops horizontal travel at mountains. A level flight collision can stop without meaningful self-crash damage. `weather-body.js` fall damage and `Fighter._slam` launched-body damage are separate paths; slams do not universally apply stun.
- Ordinary fighter/fighter contact resolves separation and inward velocity without awarding an attack. `Game.thrownBodyImpact` is a special owned-throw damage path, currently filtering teammates.
- Piloted aircraft crash on blocked cover/water or hard landing; their occupant exits at zero velocity. Scout driving stops at obstacles without a ramming damage system.
- Deliberate rush attacks already exist in `abilities.js` and `ability-rush-body.js`, making them the better foundation for a committed ram.

Source unit conversion is `src/core/world-units.js`: .19m per world unit, with velocity measured in units/s. HUD km/h must not be fed back into physics as though it were the same unit.

## Recommended collision design

| Situation | Proposed response | Benefit / tradeoff |
| --- | --- | --- |
| Slow bump or shallow scrape | Deflect/slide, restrained contact sound, little or no damage | Keeps ordinary navigation forgiving; less literal physical simulation. |
| Fast accidental head-on crash | Speed/resilience-dependent damage and short recovery; severe impact may stun | Makes high-speed flight matter, but requires fair geometry and readable thresholds first. Avoid repeated damage every contact frame. |
| Deliberate aerial punch/tackle/ram | Visible commitment, bounded steering, swept impact, damage and knockback once, then recovery | Enables charging a jet on purpose; costs an attack commitment so travel is not automatically an attack. |

Use relative velocity projected onto the contact normal: closing speed = max(0, -(vA-vB)·normal), with normal pointing from B toward A. This distinguishes a head-on jet from one moving alongside you and a wall scrape from a direct hit. Combine it with bounded effective mass/resistance factors; tune damage, launch impulse and stun separately. Account for powered strength in deliberate attacks, not merely the flyer's small physical body mass. A durable superweapon can breach a weak vehicle without equal self-damage; an ordinary flyer can lose the collision. Do not guarantee that every jet touch explodes it.

The next flight-melee test should compare a wall scrape, a wall crash and a committed attack against a moving aircraft. Reliable visible collision geometry is a prerequisite before making accidental crashes highly punishing.

## Brief aiming and inventory audit

The rifle handler samples independent yaw and pitch offsets (pitch scaled to .7 of configured spread). Dispersion therefore increases with distance, but it is a rectangular angular distribution, not a uniformly sampled round cone. Weapon settings differ: M24 .004, M16 .016, AK .032, SAW .055; shotgun default .17. No sustained-fire bloom was found in this path. Recoil currently pushes the character; selected sniper stances tighten after settling. Scope zoom alone does not alter accuracy.

`src/data/armory.js` defines 14 firearms, seven melee weapons and 16 gear entries. Firearms cover M24/M107, AK/M16/Kuchler/battle rifle/SAW, MP5/suppressed PDW, combat/auto shotguns, and three sidearms. These definitions are separate from the fleet prototype catalog and do not establish that every weapon model/clip is finished. The equipment policy restricts personal weapons to non-flying Soldiers; hero innate gun abilities are a separate path.

Current gameplay inventory/armory rows are text-based. The character portrait is not a per-weapon icon system, and this audit found no enforced gameplay weapon-thumbnail dimensions. Do not treat fleet thumbnails as already connected inventory icons. Leave this work until after melee, as requested.

The seven authored melee entries are baseball bat, katana, claws, combat knife, breaching tomahawk, riot baton and great blade. Spear/bow/futuristic fleet models and hero abilities must be audited separately before being counted as general equip-ready armory entries.

## Small, repeatable organization

Use existing Animation Library families: locomotion/flight, attacks, carry/grab, throws, reactions/recovery, weapons and infected/creature. For each derivative record the original source take/hash, changed joints, support/contact points, start/contact/release/control-return times, compatible grip/body modes and acceptance status. Keep the source untouched and save the derivative separately. Existing library controls cover preview speed, frame stepping, contact drafts and some assignments; they are not a complete bone-mask/keyframe editor yet.

First build order: (1) shoulder carry and carried-person motion; (2) strengthen the existing punch/kick/pickup/throw transitions; (3) deliberate aerial tackle plus consistent crash feedback. Defer gun bloom/icons, advanced traversal and a large wrestling tree. Make flips an intentional learned/style-capable option, not an automatic spin on every high-Agility jump; Agility can influence recovery and steering while the movement ability still defines range/cost.

## Research and video-to-animation

[Epic's layered-animation guide](https://dev.epicgames.com/documentation/unreal-engine/using-layered-animations-in-unreal-engine) demonstrates applying different animations to selected bones. We can apply that principle to our existing Three.js rig; no engine change is required.

[DeepMotion Animate 3D](https://www.deepmotion.com/animate-3d) offers video-to-motion capture. Its [capture guidance](https://www.deepmotion.com/article/capture-guidelines-quick-guide) favors clear human footage with visible joints and little occlusion, rather than cartoon footage. That makes it a potential source for solo punches, throws and gestures; tangled two-person contact still needs cleanup. Video conversion, human-source retargeting and final gameplay contact are separate steps. No service was purchased or footage uploaded.
