# Purchased animation intake — 14 September 2026

## Scope and status

Six downloaded packages have been extracted into a private source directory:
`C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-14`.
Original archives remain in `C:/Users/taskm/Downloads`.
The source manifest records archive/file SHA-256 hashes and preserves Unity importer metadata.
These are purchased sources, not additions to the existing CC0 bank.
No new clip has been assigned to gameplay by this intake step.

| Source archive | Pack | FBX files |
| --- | --- | ---: |
| kg.zip | Knockdown & Get-Up | 85 |
| gt.zip | Grab & Throw | 47 |
| grab_hostage.zip | Silent Grab & Hostage | 105 |
| interaction_villain.zip | Superhero Interaction Villain | 79 |
| fbx.zip | Pick Up & Carry | 65 |
| unity_unleashedboxer_animset_2022_3_62f3.unitypackage | Unleashed Boxer | 232 |
| Total | | 613 |

File counts include alternate motion modes, actor/receiver tracks and reference assets;
they are not a count of distinct usable gameplay moves. Suplex and POLYGON Prototype
were not found in the inspected Downloads folder at intake time.

Validation result: 612 files supplied clips that passed the motion-data checks.
The remaining file, boxer `Mesh/Dome.fbx`, parsed as static geometry with no bones
or animation clips. This is expected for a dome, not a missing combat animation.
All five standalone packs passed; boxer supplied 231 clip-bearing files plus the
dome. Texture rendering was deliberately not evaluated. A second staging run
completed successfully with matching existing files.

## Repeatable intake

Run from `D:/lsw/.worktrees/combat-release-review`:

```powershell
python tools/stage-purchased-animations.py C:/Users/taskm/Downloads C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-14
node tools/audit-purchased-fbx.mjs C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-14
```

The staging tool does not run package scripts. It preserves paths, rejects escaping
paths and refuses to replace a file with different content. The Unity archive is
read in one streaming pass; Unity does not need to be launched for these FBX files.

`source-manifest.json` and `fbx-audit.json` live in the private source directory.
The audit checks parsing, track validity, finite values and positive clip duration.
It deliberately skips referenced textures and records their names. It does not
certify materials, retargeting, contact, root motion or visual quality.

## Integration order

1. **Aerial capture and held movement.** Review `AS_SV_Fly_Catch` and its `_React`
   partner, then fly idle/front/back/left/right pairs. Retarget both roles to the
   current modular models. Prove hover and forward movement while held before
   expanding the move list.
2. **Shoulder carry and heavy lift.** Review `AS_P_Human_to_Shoulder` and receiver,
   shoulder hold/movement/release; review `AS_P_Heavy_Item`, `to_Head`, head idle,
   walk and off. Mass versus lift capacity controls effort and failure; object
   dimensions and grip sockets control carry shape. Do not infer failed-lift
   coverage or car compatibility from pack names.
3. **Throw through recovery.** Inspect back-lift, back-throw and slam pairs in
   Grab & Throw. Set windup, contact, release and control-return markers from
   playback. Blend release into the actual physics trajectory, impact reaction
   and matching get-up. A cinematic paired takedown is not automatically a
   free-direction superhero throw.
4. **Boxing style.** Select a small coherent attack/guard/dodge/reaction set.
   Preserve the user's three heavy-charge regions. Ground and air actions must
   declare separate eligibility; do not assign a grounded sweep in flight.
5. **Weapon profiles.** Reuse existing weapon source motions where suitable;
   distinguish one-hand pistol, independent akimbo, two-hand rifle, one-hand
   blade, two-hand heavy weapon and polearm. Hand ownership, grip offsets and
   release events belong to the action. These six packs do not prove complete
   rifle, spear, shield or nunchuck coverage.

Acceptance for the first sequence: approach → catch → held hover → held travel →
aimed throw → impact/damage → get-up. Review both participants through the full
sequence, including interruption and release. The simulation owns travel and
collision; animation must not move the hitbox away from the visible actor.
Keep source-parsed, retargeted, visually reviewed and gameplay-tested as separate
statuses. Preserve the original clips; derive trims, timing changes and variants.

## Retrieving the Unreal-only suplex pack

The launcher and Unreal Engine are separate installs. Install an engine version
supported by the purchased pack, create a Blank Blueprint project named
`PowerWorld_AssetExport`, and open/save it. In the launcher's Unreal Engine library,
find the Fab asset and choose Add to Project for that project.

That staging project is the correct use of Add to Project. It does not migrate
PowerWorld. Export animation sequences as FBX using the Animation Sequence
Editor's Export Asset command, and retain the source skeleton/reference mesh and
both participants' sequences. Copying `.uasset` files into the browser game is
not an import pipeline. Selecting GLB in general export preferences does not
convert an Unreal-only distribution into GLB.

Official references:
- [Fab downloading](https://dev.epicgames.com/documentation/en-us/fab/purchasing-and-downloading-assets-in-fab)
- [Animation Sequence Editor export](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-sequence-editor-in-unreal-engine)

## POLYGON Prototype decision

Use it for Threat Lab ramps, platforms, cover, targets and marked test lanes.
Keep the current modular animated character as the practice opponent. Synty's
listing describes 444 unique assets, six basic character variants and 20 still-pose
pawns, and explicitly says no animations are included. Static posed figures are
useful references; they do not provide motion to retarget. Destruction, accurate
collision and opponent behavior still require game integration.

[Synty product contents](https://syntystore.com/products/polygon-prototype-pack)
lists source FBX, Unity and Unreal formats; availability through the user's Fab
purchase must be checked against that entitlement. Prefer original FBX sources
where available; generate optimized runtime GLB after selection and validation.
