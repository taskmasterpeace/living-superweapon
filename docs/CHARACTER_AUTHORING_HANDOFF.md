# Power World character authoring handoff

Delivery worktree: `D:/lsw/.worktrees/combat-release-review`.
Branch: `codex/playable-integration`.
This is the recovered character branch, not the separate `D:/lsw` fleet checkout.

## Open the tools

- `http://127.0.0.1:5184/character-foundation.html` - expand **Build parts & animations** at the top of the right panel.
- `http://127.0.0.1:5184/character-families.html` - Dec-52 mech, hound, rat and cloud, named mechanical pivots and formation preview.
- `http://127.0.0.1:5184/character-foundation.html?recipe=alien` - humanoid alien authoring base. This is not the proposed separate digitigrade Thermavari rig.
- `http://127.0.0.1:5184/` - game and character selection using modular default bodies.
- Existing `animation-library.html` remains the source-clip review surface.

If the server is stopped, run `node D:/lsw/node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5184 --strictPort` from this worktree. Keep the same host and port to retain access to browser-saved recipes.

## Manual workflow

1. Select a character and an idle or flight pose. Open Build parts & animations.
2. Choose a bone, add a primitive, adjust size, offset, rotation and color. Headgear is usually on `DEF-head`; shoulder armor uses the shoulder/upper-arm socket. Front, Back, Side and Top buttons inspect fit.
3. Pieces are rigid attachments. A sleeve crossing an elbow must be split into compatible pieces or skinned in Blender. Existing wardrobe controls already handle the supplied sleeve, hoodie, coat, robe and footwear modules.
4. Start a draft from the current pose. Select a bone, adjust its joint angles, choose a time and Capture key. Play/scrub to compare. Changing Base clip selects a source pose; the study selector creates editable blocking examples.
5. Set contact, release and control-return times in seconds. Export asset includes parts and quaternion keys. Export animation clip produces Three.js clip JSON plus separate source/marker metadata.
6. Contact preview can show an object or another character; Partner size exercises 0.6-1.6 relative size. The held partner's torso anchor aligns to the hand even when sizes differ. This is a visual attachment study, not strength eligibility or collision authority.
7. Save to this browser stores the appearance under the selected roster identity. The modular game loader and selection preview read the same validated recipe. Export character recipe for a portable backup; browser storage is not a team database.

No API is needed for these local tools. An AI can produce the same validated JSON. Image generation is optional concept work; it does not produce a finished rig or animation merely by rendering a picture.

## Contract and scripts

- `public/authoring/character-contract.json`: actual exported bone names, local rest transforms, units, limits and review views.
- `public/authoring/example-visor.json`: small importable example.
- `public/authoring/studies/catalog.json`: 13 editable blocking studies with durations and markers.
- `src/engine/character-authoring.js`: validation, quaternion sampling, clip compilation, owned rigid attachments and recipe storage.
- `tools/validate-character-asset.mjs FILE.json`: fails on incompatible rig/bone names, malformed geometry, quaternion data or timing.
- `tools/export-character-contract.mjs`: regenerate contract from the real GLB after a rig rebuild.
- `tools/build-character-studies.mjs`: rebuild procedural examples from the real Idle_Loop pose.
- `.agents/skills/powerworld-character-authoring/SKILL.md`: reusable instructions for another AI.

Humanoids: `ual-deform-v1`, GLTF metres, nominal 1.8325 m. Runtime sanitizes `DEF-spine.003` to `DEF-spine003` and `DEF-hand.R` to `DEF-handR`. Never guess bone names; download the contract. Keys store normalized local quaternions [x,y,z,w]. Root movement, hits and resource spending remain with the game.

Dec-52: rigid named pivots; copied from committed fleet packages, with versions recorded in `public/models/dec52/provenance.json`. Fleet units are **0.19 metres per unit**, converted by the family viewer. Do not treat their mesh coordinates as metres or apply human tracks to quadrupeds. Company emblems, including the remote mech rear-head emblem, remain in the copied models.

## Appearance changes

The neck is now a separate exported skin slot, with skin/uniform choice. The model remains 4,126 triangles across optional pieces, 152 editable source pieces and 46 runtime groups. Full body suit fabric includes torso and waist rather than skipping dark-material geometry. Full suit selection clears optional belt/knee armor; armor remains independently selectable. Seven complexion presets complement arbitrary color input. Existing hairstyle names remain stable IDs.

Hollow infection uses dark eye sockets without the rupture overlay; fever remains a separate early stage. Legacy rupture recipes remain import-compatible. The ninja hood covers the lower head; claws are offset away from the finger volume; resting wings fold in the opposite direction. Vegas uses the supplied emblem and full-suit recipe. The lightning bolt is a chosen recipe emblem, not a compulsory identity.

## Animation and gameplay boundaries

The 13 new studies are **blocking candidates**, not approved mocap or polished production attacks. They demonstrate distinct dart/boomerang timing, ground/flying pickup, paired grab, mechanical idle and status reactions. They need full motion/contact/interrupt review before an action registry adopts them. Authoring markers do not override native combat windows automatically.

Current gameplay owns strike startup/active/recovery in `src/data/martial.js` and the fighter action state. Recovery means the short interval before another action is allowed after your move. Stagger is an externally imposed recovery lock; stun is a separate incapacitation timer that also cancels flight. See `docs/combat-states-and-damage-report.md` for exact current gates and the already-documented stun recovery scaling issue. New modular presentation now yields to native hit/KO/stun/stagger/freeze/sleep/shock states instead of choosing healthy locomotion over them.

For flying pickups, use world-space reach and contact ownership, not a forced bend-to-floor animation. For carried people, the native `person-carry.js` and `person-throw-trajectory.js` remain the authority. The authoring rehearsal tests attachment geometry; it does not decide whether a small character is strong enough to lift a large one. Do not scale a victim down to hide contact problems.

The existing outbreak encounter has three native waves (4/6/8) with recovery intervals. It now requests the modular infected body and the shared zombie idle/walk/sprint bank. Native AI, damage and encounter tests remain in use. This delivery does not introduce a second infection simulation, a new severed-head system, or a new blood economy.

The current personality table contains **20 personalities**, in `src/data/psyche.js`; human/robot/alien describe body/origin and animation family, not those personalities. Robot presentation can use a fixed mechanical stance and sensor motion independently of targeting personality.

## Reusing Martial Arts World

Source project: `D:/git/martialartsworld/.worktrees/animation-factory`; source vault: `D:/git/martialartsworld-source-vault`. Existing transfer report: `D:/git/martialartsworld/docs/ANIMATION-TRANSFER-TO-POWERWORLD.md`.

Reuse source identity/provenance, take review, phase sampling and retargeting practices. The old report targeted an older Power World rig; this branch has the full UAL skeleton. Do not copy procedural arm vectors or a foreign rig's tracks directly. Read the take's joint names and convert to the downloaded target contract, preserve wrists/fingers, then validate the resulting asset and compile it with the shared compiler. Roundhouse technical passage is not visual approval; the rejected staff candidate remains rejected. No new Martial Arts World take is claimed as approved or installed by this delivery.

## Verification and integration

Commands:

```
node --test tools/character-authoring.test.mjs tools/modular-character.test.mjs tools/modular-pipeline.test.mjs tools/modular-image-placements.test.mjs tools/modular-weapon-preview.test.mjs
node --import ./tools/helpers/character-css-loader.mjs --test tools/zombie-encounter.test.mjs
npm run build
```

The tests cover the actual exported neck, suit coverage, exact bones, all 13 compiled studies, wrong-rig rejection, attachment cleanup, small/large contact, recipe persistence, native source tracks and zombie AI/contact/wave lifecycle. Browser checks cover editor controls and the corrected modular selection screen. A passing build or one screenshot does not approve every animation.

Transfer the scoped commit(s) from this branch into the team's target branch after checking its worktree. Do not merge the entire fleet branch just to get Dec-52: the four required packages are already copied here with provenance. Browser saved recipes need JSON export/import when changing ports or machines.

Local delivery commit: `4499c5e` (Add modular character parts and animation authoring tools). This document's later bookkeeping commit only records that reference. To transfer the implementation, cherry-pick `4499c5e` onto the team's reviewed target branch from a clean target worktree; resolve any shared character/selection changes rather than overwriting them. No merge into the separate fleet checkout was performed.

Final verification: 37 tests passed. Production build passed. Browser checks exercised part creation, draft start/play, separate animation-bone selection, modular character selection, Dec-52 hound preview, and game launch without captured runtime errors. No claim is made that the 13 procedural studies are production-approved combat animations.
