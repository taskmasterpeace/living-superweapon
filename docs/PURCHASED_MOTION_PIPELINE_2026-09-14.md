# Purchased motion intake and assignment

## Sources and rebuild

Raw purchased FBX files stay in `C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-14`. The intake audit there identifies individual clips, packs and hashes. The generated browser bank preserves source filenames, hashes and attribution. It is derived paid content, not a public-domain asset library.

From this repository:

```powershell
node tools/build-paid-motion-bank.mjs
node tools/build-paid-boxer-strikes.mjs
node --import ./tools/helpers/css-test-hook.mjs --test tools/paid-motion-bank.test.mjs tools/paid-motion-runtime.test.mjs tools/paid-boxer-strikes.test.mjs
node tools/paid-motion-browser.mjs
node tools/paid-held-browser.mjs
node --import ./tools/helpers/css-test-hook.mjs tools/export-combat-workbook-data.mjs
```

The browser proof tools default to the reviewed local server on port5193. Set `PW_URL` to a server from this same checkout if it changes. The tools check checkout identity before capture. The workbook builder is `tools/combat-workbook/build.mjs`; its dependency location is documented beside it.

## Source to playable action

1. Identify source rig, rest pose, units, handedness and whether root motion is present. Do not assume action frame zero is a T-pose. Several purchased animation-only FBXs contain no bind skeleton. The Boxer pack does include `00_T-pose.FBX`.
2. Retarget onto the current `modular-hero.glb`, preserving bone lengths, full finger tracks and source provenance. Store root trajectories separately; animation must not move the gameplay collision root.
3. Classify action, weapon family, required hands, ground/air context, holder/receiver role, and anticipation/contact/release/recovery. A two-person source needs both tracks and a common contact clock. Equal-looking names do not guarantee equal durations.
4. Inspect five phases from multiple views. Check joint direction, floor support, fixed lengths, hand contact, silhouette, loop seams and return to neutral.
5. Wire only through the existing action owner. A rendered punch must reach the committed contact point during the real attack window; a throw must wait for release and use real trajectory/damage. Imported motion cannot bypass hitstop, stun, hand occupancy or interruption.
6. Test the actual current-model runtime after retarget review. Record whether evidence is a clip preview, a scripted production fixture or an input-driven gameplay scenario. These are different claims.

## What is assigned in this pass

Two purchased receiver loops supply freely reacting limbs during hostile aerial holds and travel. Native torso/root orientation and final holder hand contact remain authoritative. Incapacitation and throw windup take precedence; hitstop freezes the clip. Studio's **Purchased motion policy** setting can restore the prior procedural behavior. This is not a complete replacement for all paired captures or shoulder carries.

The other converted clips remain review candidates. The aerial catch source has unequal holder/receiver durations; several heavy-lift and get-up sources penetrate the target floor. Boxing source clips are available for review, but compressing their stance changes into the existing fast combat timing exposed abrupt elbow rotation. Candidate conversion does not mean runtime acceptance.

The five existing flight silhouettes remain editable in Character Studio. The newly purchased flight/flips packs must arrive as exportable animation data before they can replace those motions. The three attached flight screenshots do not contain animation tracks. `Downloads/WWA/MyProject2` was found with Unreal template content; this pass did not find the requested exported flight or suplex FBXs there.

## Audio and future additions

Native melee contact already calls the recorded-impact/sound-library path. Retargeting does not add a duplicate sound timer. New clips need event markers only when they introduce a new action phase; existing confirmed damage events remain the source of hit sounds and future dialogue.

Next admissions, in order: synchronized aerial capture/release; single-punch timing and stance compatibility; planted heavy-object lift; imported grounded get-up; incoming flight families; dual-weapon actions. Large wrestling combinations, side dives and cover shooting follow those dependencies. Fix source/rig problems in the converter or a documented per-clip correction, never by randomly rotating shared bones in every animation.
