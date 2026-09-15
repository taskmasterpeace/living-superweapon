# Mac Asset Lab — work ledger

*Branch `asset-lab` off `03ea017b`. Every row lists its evidence path and honest status.
Status ladder: `source-available → mapped candidate → visually accepted → gameplay-proven`.*

## 2026-09-15 — Lab established

### Blender automation — VERIFIED
- Blender 5.2.2 headless reproduces the committed modular-hero build exactly
  (manifest field-identical). Evidence: rebuild run logged in session; command in
  `docs/MAC_ASSET_LAB.md`. blender-mcp + dream-loop cloned and evaluated
  (`docs/MAC_ASSET_LAB_TOOLING.md`).

### War World motion bank — 79 clips, MAPPED (unreviewed)
- `tools/build-warworld-motion-bank.mjs` → `public/models/modular-hero/warworld-motion-bank.json` (40 MB).
- Sources: FULL UAL1 (120 takes) + FULL UAL2 (134 takes), CC0, both **bind-proved
  compatible** against the actual `modular-hero.glb` rig (53 bones mapped, 0 errors,
  ≤1e-4; only fingertip/toe leaf bones omitted — same as the existing bank).
- Soldier 40: idle scan · jog 6-dir · sprint enter/exit · crouch full family ·
  prone/crawl · pistol aim(3)/idle/fire/reload · hits chest/head/shoulder L/R/stomach ·
  Death01/02 · dodge L/R · turn90 · kick + stance.
- Zombie 20: idle · shamble 8-dir · sprint 8-dir · bite · scratch · spawn (reanimate).
- Superweapon/shared 19: LiftAir family (7) · overhand throw · kipup · collapse ·
  supine getup · uppercut/combo/knee(+rec) · turn180 L/R · MonsterTransformation ·
  Hit_Knockback.
- Every entry: source file+sha256, license, duration, loop, root-motion policy,
  semantic action id, family, omitted tracks, status `source-mapped-unreviewed`.
- Rejected: none. Gaps recorded in the bank (see FIREARM section for the big one).
- Source phase renders (16 takes × 5 phases): `artifacts/asset-lab/animation-review/`.
  Spot-checked: Death01 ends supine ✓, Zombie_Run reads as a true sprinter ✓.

### Death Presentation Set — BUILT (data), curation limited by missing pack
- `tools/build-death-presentation-set.mjs` → `public/models/modular-hero/death-presentation-set.json`.
- 9 clips sampled ON THE ACTUAL RIG: per-clip fall displacement/direction (rest-pose-
  calibrated), end face (up/down/side/upright), hips height, 5-phase profile, key-bone
  end transforms, paired get-up, airborne chain, and ragdoll-handoff recommendations
  (blend ms, angular-velocity clamp, settled damping) — recommendations only, no
  runtime physics changed.
- Computed classifications validated against renders: Death01 = backward+supine,
  Death02 = forward+prone, Hit_Knockback = in-place supine, IdleToLay = backward collapse,
  LiftAir chain = airborne → impact → supine.
- **LIMITATION:** only 2 authored human deaths exist on this machine. The 85-file
  Knockdown & Get-Up pack (plus 5 more packs, 613 FBX total) is on the Windows PC at
  `C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-14`. The 12–20 clip
  directional death set needs that transfer; the pipeline here is ready to ingest it.

### Firearm presentation set — MEASURED (proposals unreviewed)
- `tools/build-firearm-presentation-set.mjs` → `public/models/modular-hero/firearm-presentation-set.json`.
- m16 rifle @4 · service duty pistol @5 · pump shotgun @5 · bolt sniper @4: bounds,
  bore axis, socket world transforms with nearest-surface distances (muzzle at bore end
  ≤0.035 on all four), proposed `stock-contact` (rear-band centroid; N/A for pistol),
  proposed stow mounts (back/hip + parent bone), moving parts (shotgun pump, sniper
  scope) and the honest magazine verdict: **none of the four models has a detachable
  magazine mesh — do not fake one; keep real reload timing.**
- Socket verification renders: `artifacts/asset-lab/weapons/*.png` — proposed
  stock-contact lands on the butt plate of all three long guns ✓.
- Packages/hashes untouched; folding proposals into new package versions is Codex's
  integration step (`docs/MAC_ASSET_LAB.md` → consumption).

### Soldier rifle presentation captures — CURRENT STATE DOCUMENTED
- `tools/warworld-soldier-review.mjs` → `artifacts/asset-lab/soldier-rifle-review/{front,rear,left,right}/`
  (ready/aim/fire/recover, early+late frames, results.json with live ammo counts —
  30→20 through the fire phase, real `TYPES.rifle` emission, tracer visible).
- **Finding (the actual playtest complaint, now reproducible):** SARGE fires from a
  one-handed low/hip carry — support hand never reaches the fore-end, no shoulder-stock
  contact, muzzle not aligned with the aim ray. The runtime ALREADY solved two-hand
  support contact for bat/nodachi (`WEAPON_HOLD_ACCEPTANCE.md` §Equipped two-hand
  contact); wiring that same support-socket solve to firearms using the now-verified
  `grip-support` + proposed `stock-contact` data is the integration fix.
- **Gap (source):** UAL1+UAL2 contain NO rifle/two-hand long-gun animation family
  (pistol family only). Options: purchase a rifle set, or procedural two-hand mount.
  Recorded in the bank's `gaps`.
- Rejected evidence: costume-variant captures (dropdown changed, meshes never rebuilt
  with the render loop frozen) — deleted rather than presented.

### Scale Lab lineup — NOT STARTED (next)
### Import-ready package/handoff — see `docs/MAC_ASSET_LAB_HANDOFF.md`

## 2026-09-15 — Mission A: Death & Reaction Presentation Set (branch `asset-lab-death-set`)

### Source library — BLOCKED, precise transfer request filed
- Windows PC (192.168.1.251) unreachable: no ping, no SMB/SSH/RDP, no ARP entry.
- `docs/TRANSFER_REQUEST_ANIMATIONS.md`: exact source dir (incl. required
  `fbx-audit.json` + `source-manifest.json`), file types, 2–4 GB estimate, destination
  `~/PowerWorldAssets/animations/2026-09-14`, archive fallback, verification commands.
- Policy honored: NO substitutes assigned to purchased-library slots.

### Death & Reaction registry — 20 slots (11 satisfied, 9 awaiting-source)
- `tools/build-death-reaction-registry.mjs` → `public/models/modular-hero/death-reaction-registry.json`.
- Satisfied with rig evidence: death.impact-front.a (Death01, standing grounded death —
  Highwall-ready), death.impact-rear.a (Death02, prone ending), knockdown.impact-front.heavy
  (Hit_Knockback, nonlethal), collapse.weakened, airborne death chain (3),
  getup.from-prone + getup.from-supine (**purchased KG pack clips**), getup.kipup,
  getup.from-supine.slow. Every slot: full runtime metadata per Mission A schema.
- Awaiting source (KG pack): left/right-impact deaths, front/rear variety, prone death,
  crouched death, rear knockdown, staggers.
- Convention documented: slot ids = IMPACT direction; older bank fall-direction
  semantics preserved via bankSemantic mapping (no ids rewritten).

### Rig evidence — 100 frames on the ACTUAL modular hero rig
- `tools/death-reaction-evidence.mjs` (generalizes paid-motion-browser) via
  `animation-library.html`, checkout-identity verified (asset-lab-death-set · 109ec08).
- 10 takes × front+side × 5 phases → `artifacts/asset-lab/death-reaction-evidence/`.
- Visual pass performed on frames: KG Front_Getup (prone→kneel→stand, no penetration),
  Death01 final supine flat, Death02 final prone flat, Hit_Knockback front-impact read,
  LiftAir_Fall_Impact settled supine. No limb distortion observed in inspected frames.
- animation-page.js now also loads warworld-motion-bank.json into the library preview
  ("135 source clips + 30 studies loaded").

### Rejections this pass
- None newly rejected on this Mac (nothing unusable among the 11). Prior PC-side
  rejections stand (heavy-lift/get-up sources with floor penetration —
  `docs/PURCHASED_MOTION_PIPELINE_2026-09-14.md`). Rejection criteria are armed in the
  mission doc for KG intake (spin, distortion, unexplained translation, floor
  penetration, unclear direction, bad final pose, un-settleable endings).
