# Mac Mini Asset & Animation Integration Lab

*Established 2026-09-15 on the Mac Mini (192.168.1.217). Branch `asset-lab`, based on
`03ea017b` (`origin/codex/playable-integration` — the verified pushed checkpoint).*

This machine owns the **asset-production pipeline**: turning purchased/source assets into
clean, documented, runtime-ready War World assets. It does **not** redesign gameplay,
progression, damage rules, vehicle physics or AI. Codex on the primary machine owns
runtime integration and the integration branch.

## Machine setup (verified on this Mac)

- macOS (Darwin 25.5.0), repo at `~/Documents/git/living-superweapon`.
- **Blender 5.2.2 LTS** via Homebrew cask; CLI at `/opt/homebrew/bin/blender`.
  The repo's Blender scripts were written against 4.5 on Windows; 5.2 compatibility
  is verified per-script below, not assumed.
- **git-lfs 3.8** installed with `git lfs install --skip-smudge`: the only LFS object is
  the 292 MB history bundle `artifacts/integration-checkpoint-20260914-targeted/committed-refs.bundle`,
  which stays a pointer here. Run `git lfs pull --include <path>` only if it is ever needed.
- Node deps: `npm install` (three.js loaders drive the motion-bank tooling).

### Headless Blender command shape (macOS)

```bash
blender --background --factory-startup --python tools/<script>.py -- <args>
```

The Windows equivalent in the older docs
(`& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' ...`) maps 1:1.

## Conventions (inherited — do not re-invent)

- Skeleton: Quaternius UAL deform skeleton, **`ual-deform-v1`**. Preserve bone names,
  rest transforms, hierarchy and scale (see `docs/MODULAR_CHARACTER_PIPELINE.md`).
- Authoring units: meters, nominal height 1.8325 m.
- Weapon sockets: `weapon-primary-grip`, `weapon-support-grip`, `weapon-stock-contact`,
  `weapon-muzzle` — native forward `[0,-1,0]`, up `[0,0,1]`
  (see `tools/service-rifle-fit.py`).
- Motion delivery: `public/models/modular-hero/motion-bank.json`
  (`Three.AnimationClip.toJSON` entries with source sha256, license, root-motion policy,
  omitted tracks, status ledger). Builder: `tools/build-modular-motion-bank.mjs`.
- Clip status ladder: `source-available → mapped candidate → visually accepted →
  gameplay-proven`. Bank statuses record exactly what was proven; never upgrade a status
  without the corresponding evidence.
- Source assets are immutable. Derived work goes to `public/models/**` and
  bank/manifest JSON; manual Blender experiments are archived, never committed over
  generated outputs.

## Asset inventory relevant to this lab (what is actually on this machine)

| Source | Where | Notes |
|---|---|---|
| UAL1 full library (120 takes) | `assets-src/modular-character/source/full-library-2026-09-14/ual1/UAL1.glb` | CC0. Crouch/crawl/pistol/hit/death families. |
| UAL2 full library (134 takes) | `.../ual2/UAL2.glb` | CC0. Zombie ×23, LiftAir family, melee, sword. |
| UAL1 Standard (46 takes) | `assets-src/modular-character/source/AnimationLibrary_Godot_Standard.gltf` | Original modular-hero clip source. Preserve. |
| UAL2 Standard (43 takes) | `assets-src/modular-character/source/UAL2_Standard.glb` | |
| Modular hero rig | `assets-src/modular-character/modular-hero.blend`, runtime `public/models/modular-hero/modular-hero.glb` + `manifest.json` | 39 slot groups incl. helmet/vest/backpack. |
| Soldier field gear | `public/models/frontline/field-{armor,boot,greaves,harness}.glb` | |
| Weapon reference props | `public/authored-assets/prop.reference-weapon-{pistol-0..2,shotgun-0,shotgun-2,rifle-ak,sniper-0,sniper-1}/`, `equipment.kuchler-rifle`, `prop.reference-field-rifle` | |
| Paid motion bank (22 clips) | `public/models/modular-hero/paid-motion-bank.json` | Derived paid content; license file beside it. |

**NOT on this machine** (documented limitation, not a gap to invent around):

- The six purchased FBX packs (613 files) incl. the 85-file **Knockdown & Get-Up** pack —
  the large death/knockdown library — live on the Windows PC at
  `C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-14`
  (see `docs/PURCHASED_ANIMATION_INTAKE_2026-09-14.md`). Until that directory is
  transferred, death-presentation curation here is limited to UAL deaths + the already
  retargeted paid clips. **Transfer request is open in the handoff.**
- `assets-src/frontline-service-rifle/original/AssaultRifle2_1.blend` (the service-rifle
  source blend used by `tools/service-rifle-*.py`) is also PC-only.

## Blender MCP / Dream Loop tooling

- `bpy-dev/blender-mcp` cloned at `~/Documents/git/tools-blender-mcp` — evaluation notes
  in `docs/MAC_ASSET_LAB_TOOLING.md`.
- `achimala/dream-loop` cloned at `~/Documents/git/tools-dream-loop` — used as the
  visual-acceptance loop pattern (target render → actual render → independent critic →
  correct → repeat). Visual judgement only; it never grades gameplay.

## Work ledger

Kept in `docs/MAC_ASSET_LAB_LEDGER.md` — every deliverable with evidence paths and
accepted/rejected status.
