# Animation unlock audit — 14 September 2026

## Decision

Finish the current-model aerial catch/carry/throw/recovery sequence first. Use its
contact and interruption rules for new archetypes. The strongest subsequent
extensions are a vampire feeding grab, one quadruped pouncer, and an acid spitter.
Do not buy another broad animation library before reviewing existing sources.

This is a code/source audit, not a claim that the proposed archetypes are playable.
Purchased source validation is documented in PURCHASED_ANIMATION_INTAKE_2026-09-14.md.
No purchased clip has been assigned to gameplay by either audit.

## What exists versus what could be added

| Opportunity | Existing building blocks | New work / missing coverage | Benefit and tradeoff |
| --- | --- | --- | --- |
| Vampire feeding grab | `grabHeal` used by melee; `lifedrain` ability; creator Vampiric Aura; paired hostage control/receiver sources; UAL2 `Zombie_Bite` | Author/review neck contact, feeding loop, victim response, release and interruption. Define valid targets, healing cap and escape/counterplay. Zombie bite is only a motion candidate, not a confirmed vampire feed. | Distinct close-range sustain fighter with substantial system reuse; intimate two-body contact needs careful alignment. |
| Humanoid grappler / brute | New paired lifts, back throws and slams; existing grab and damage systems | Retarget both roles; derive release markers, effort bands and free-direction throws. Scale grip by geometry and strength/capacity. | Directly strengthens the core fantasy; authored takedowns constrain positions and need adaptation. |
| Aerial captor | New Fly_Catch / React and held idle/directional pairs; existing flight controller | Current-model contact in hover and travel, interrupt/release transitions, windup into aimed throw | Highest immediate priority; two actors plus flight orientation make this more demanding than one clip. |
| Alien pouncer | Native Dec-52 hound encounter with bite; quadruped jump and attack sources | Swept leap collision, land/miss/recover, victim pin and escape. Long jumps cannot be achieved by simply speeding up the clip. | Adds pressure against grounded heroes; paired pin and crowd coordination are missing. Start with leap-and-bite, add pin later. |
| Acid-spitting creature | Existing acid projectile/payload and corrosive cone definitions; existing creature bodies | Mouth socket emission, anticipation/spit/recovery motion, alignment with target and attack cadence; distinct acid presentation | Adds ranged creature pressure using existing damage types; mouth animation is unconfirmed and VFX still needs visual review. |
| Dog companion / tracker | Husky/wolf GLBs; companion breed, aptitude, training and persistence data | Native companion control, follow/return/attack commands, scent gameplay and feedback, recovery and bite contact. No production caller of `activeCompanion` found in this audit. | Companion content can reuse assets; companion data is not proof of a working field companion. |
| Thermavari armed hunter | 7.5-foot articulated study with separate knee/hock/foot pivots and hand sockets | Digitigrade locomotion cleanup, native actor adapter, run/jump/death/recovery and weapon-specific motion; weapons need mounting | Distinct alien silhouette; greatest rig-specific work. Humanoid leg tracks are not a direct fit. |
| Infected variants | Full UAL2 zombie bite/spawn/scratch/idle and directional movement sources; existing infection/status systems | Assign/review source motions for shambler versus sprinter; connect crippled-leg, disabled-arm, hit and recovery states | Better horde readability without buying another humanoid zombie library; locational injury coverage still needs a dedicated audit. |
| Boxer / evasive martial artist | Purchased boxing attacks/movement plus existing UAL kick/knee/uppercut and recovery sources | Select coherent style, contact windows, cancels, guard and control-return timing; ground/air eligibility | Many style choices from owned content; clip count is not balanced combat. Keep three heavy-charge regions. |
| Weapon specialists | Owned UAL pistol, bow and extensive sword/shield source families | Separate one-hand, akimbo, supported two-hand, heavy two-hand and polearm profiles. Rifle, spear and nunchuck dedicated coverage remains unconfirmed. | Reusable equipment language; a weapon model or empty-hand clip does not establish correct handling. |

Vampire hunger, sunlight weakness, bat transformation and infection/conversion are
optional design proposals, not requirements inferred from the word vampire. Do not
silently add them or reuse zombie infection rules without an explicit design decision.

## Dog and creature findings

Read both actual GLB JSON chunks, not just filenames: husky and wolf each contain
12 named clips: Attack, Death, Eating, Gallop, Gallop_Jump, Idle, Idle_2,
Idle_2_HeadLow, Idle_HitReact1, Idle_HitReact2, Jump_ToIdle and Walk.
The local manifest reports 2,080 triangles for husky and 2,042 for wolf; these are
asset counts, not a measured horde performance budget.

`src/engine/creature-character.js` currently exposes these animals through the
Creature Foundation preview. Its action map explicitly leaves run, knockdown,
recovery and pounce victim unavailable. A low-head idle is not proof of sniffing
behavior. Death is not a substitute for a recoverable knockdown.

`src/engine/dec52-encounter.js` is newer than the earlier runtime audit: it creates a
native Fighter, replaces its visible body with a Dec-52 hound, drives motion,
checks bite reach/cover, and damages at a contact window. `melee-trial.js` calls it
for the Threat Room. This establishes a limited hound encounter, not deployment
of every Dec-52 form or of husky/wolf companions.

The hunter recipe in Creature Foundation is a scaled/tinted wolf size study;
it is not the finished tail-bearing alien creature from the user's reference.
Keep biological dog, alien beast, nanite hound and digitigrade Thermavari as distinct
body families. Reuse behavior interfaces while respecting anatomy and contact.

The animal source is [Quaternius Ultimate Animated Animals](https://quaternius.com/packs/ultimateanimatedanimals.html).
The creator confirms an animated animal pack in FBX/glTF/Blend formats with CC0
licensing. This source is separate from the purchased humanoid packs.

## Existing power code evidence

- `src/data/characters.js`: Consume uses `lifedrain`; Formic Sting has an acid
  payload; Corrosive Ink uses acid damage and a corrosion-bearing damage-over-time payload.
- `src/data/creator.js`: Absorb and Vampiric Aura are defined.
- `src/engine/melee.js`: grab healing is applied through holder/fighter `grabHeal`.
- `src/engine/abilities.js`: siphon configuration is accepted by the buff handler.
- `src/engine/entity.js`: siphon ticks nearby enemies and heals the caster.

These are implementation findings, not newly tested balance or visual acceptance.
Acid and draining are therefore not wholly missing powers; creature presentation
and integration are the opportunities. Audit target eligibility before reusing
siphon in a practice drill: its current loop skips `isDummy` actors.

## Build order and acceptance

1. Current-model aerial catch → held hover → forward carry → throw → impact/get-up.
2. Person shoulder carry and heavy-object overhead pickup using owned source clips.
3. One vampire feeding-grab prototype: control entry → contact → bounded drain →
   interrupt/release. Show damage and healing independently in the Threat Room.
4. One quadruped enemy: pursue → telegraphed leap → bite or miss → recover. Reuse
   the hound encounter seam; do not start with a full creature swarm or paired pin.
5. One acid-spitter variation with visible anticipation, mouth emission, readable
   projectile and corrosion feedback. Then measure mixed melee/ranged encounters.

Keep a per-action record of body family, actor role, contact sockets, equipment /
hand ownership, source clip, hit/release/control-return markers and separate
source/retarget/visual/gameplay statuses. Extend the existing library metadata;
do not create another workshop just for this audit. Preserve source motions and
derive variants. Prioritize missing actions over adding cosmetic roster entries.

## Verification performed

Actual wolf/husky embedded animation names were inspected. Current production
call sites were read. Run:

```powershell
node --import ./tools/helpers/character-css-loader.mjs --test tools/dec52-encounter.test.mjs tools/dec52-gameplay-motion.test.mjs
```

Result: 6 passed. Coverage includes bite contact damage, withdrawal miss, cover
blocking, encounter retirement/cancellation, hitstop and interruption. The initial
plain Node invocation could not import CSS; the repository's existing registration
helper must be loaded with `--import`, not `--loader`.

No new creature was visually playtested in this audit. Long pounce, pinning, vampire
feeding and the paid clips on current models remain unverified.
