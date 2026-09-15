# Mac Asset Lab → Codex handoff (2026-09-15)

**Branch:** `asset-lab` (pushed), based on `03ea017b` (`codex/playable-integration`).
Read `docs/MAC_ASSET_LAB.md` (lab charter), `docs/MAC_ASSET_LAB_LEDGER.md` (evidence),
`docs/MAC_ASSET_LAB_TOOLING.md` (Blender/capture stack).

## What the integration branch can consume now

1. **`public/models/modular-hero/warworld-motion-bank.json`** — 79 curated clips
   (soldier 40 / zombie 20 / superweapon+shared 19) from the FULL UAL libraries,
   mapped to the actual modular-hero rig, same `Three.AnimationClip.toJSON` format as
   the existing banks, each with a stable `semantic` action id (e.g. `zombie.sprint.fwd`,
   `soldier.pistol.reload`, `death.b`). Rebuild: `node tools/build-warworld-motion-bank.mjs`.
   Statuses are `source-mapped-unreviewed`: play them on the runtime rig, accept or
   reject per clip, and upgrade statuses in the bank.

2. **`public/models/modular-hero/death-presentation-set.json`** — the death resolver's
   data: per-clip fall direction, end face, phase profile, end-pose key bones, paired
   get-up, airborne chain, and recommended ragdoll handoff (blend 120 ms, ang-vel clamp,
   settled damping). Implement the resolver runtime-side; nothing here changed physics.
   Rebuild: `node tools/build-death-presentation-set.mjs`.

3. **`public/models/modular-hero/firearm-presentation-set.json`** — measured socket
   verification + proposals for m16@4 / pistol-1@5 / shotgun-0@5 / sniper-1@4:
   proposed `stock-contact` (verified on renders: `artifacts/asset-lab/weapons/`),
   stow mounts, moving parts, magazine truth (none exist — don't fake).
   To adopt: mint new package versions with the added sockets + register hashes in
   `src/data/restored-equipment.js` (hash chain is integration-owned).

4. **Capture runner** `tools/warworld-soldier-review.mjs` — rerun after any firearm
   presentation change: `PW_URL=http://localhost:5180 node tools/warworld-soldier-review.mjs
   --view=rear`. Current-state captures in `artifacts/asset-lab/soldier-rifle-review/`.

## The one fix that pays immediately

SARGE fires one-handed from the hip (see rear/tactical-fire-late.png). The two-hand
support-contact solve ALREADY exists for bat/nodachi. Route firearms through it:
support hand → package `grip-support` socket; shoulder → proposed `stock-contact`;
muzzle/aim alignment → package `muzzle` socket (all three verified in
firearm-presentation-set.json). No new animation source required for the first pass.

## Open requests back to the PC / Robert

- **Transfer `C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-14`**
  (613 FBX, six purchased packs) to the Mac (`~/PowerWorldAssets/animations/2026-09-14`).
  Unblocks: the 12–20 clip directional Death Presentation Set (Knockdown & Get-Up pack)
  and paired grab/hostage/boxer admissions.
- `assets-src/frontline-service-rifle/original/AssaultRifle2_1.blend` is also PC-only
  if the service-rifle probe work is to continue here.
- No rifle/long-gun animation family exists in UAL1/2 (pistol only). If procedural
  two-hand mounting isn't accepted visually, a rifle animset purchase goes on the list.

## Not done / next on the Mac
- Scale Lab lineup renders + metadata (soldier/superweapons/robot/creature/vehicles).
- Zombie leg-impaired locomotion + arm-impaired attack variants (candidates identified:
  Crawl family; needs derivative authoring like `Infected_Sprint_Loop`).
- Visual acceptance passes on the 79 banked clips (runtime rig playback review).
