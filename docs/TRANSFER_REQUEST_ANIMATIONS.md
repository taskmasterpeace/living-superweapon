# TRANSFER REQUEST — purchased animation library, Windows PC → Mac Mini

*Filed 2026-09-15 by the Mac Asset Lab (Mission A: Death & Reaction Presentation Set).
Status: **BLOCKED — the Windows PC (192.168.1.251) is unreachable from the Mac**
(no ping, no SMB/445, no SSH/22, no RDP/3389, no ARP entry — the machine appears to be
off or off-network). Nothing can be pulled remotely until it is on.*

## What is needed (exact)

**Primary (preferred): the entire staged private source directory, copied as-is**

```
SOURCE (Windows PC): C:\Users\taskm\Documents\PowerWorldAssets\animations\2026-09-14\
DEST   (Mac Mini)  : /Users/taskmasterpeace/PowerWorldAssets/animations/2026-09-14/
```

Copy the WHOLE directory tree, including:

- All six extracted packs (`knockdown-getup/`, `grab-throw/`, `grab-hostage/` or
  `Silent Grab & Hostage`, `interaction_villain/`/`Interaction Villain`,
  `pickup-carry/`, `unleashed-boxer/`) with their subfolders — the pipeline addresses
  files as e.g. `knockdown-getup/In_Place/AS_KG_Front_Getup.fbx`, so **structure and
  filenames must be preserved exactly**.
- **`fbx-audit.json`** and **`source-manifest.json`** at the directory root — the
  conversion tool (`tools/build-paid-motion-bank.mjs`) loads `fbx-audit.json` to
  resolve files and bone lists; without it nothing converts.

**File types expected:** `.fbx` (613 files; 612 clip-bearing), plus the two `.json`
manifests and any pack `README`/license files.

**Approximate size:** the six source archives plus extraction — plan for **2–4 GB**;
the Mac has 660 GB free, so any transport works.

**Fallback if the staged directory is lost:** copy the original archives from
`C:\Users\taskm\Downloads` (`kg.zip`, `gt.zip`, `grab_hostage.zip`,
`interaction_villain.zip`, `fbx.zip`,
`unity_unleashedboxer_animset_2022_3_62f3.unitypackage`) into
`~/PowerWorldAssets/archives/` on the Mac; staging + audit re-run here with the
in-repo tools (see verification below).

## Transport options (any one)

1. Turn the PC on → from the Mac: mount the share or `scp`/robocopy over the LAN.
2. External drive / USB stick.
3. Zip the folder and drop it in any shared location the Mac can reach.

## Verification after transfer (run on the Mac; both tools are in-repo and take paths as arguments)

```bash
cd ~/Documents/git/living-superweapon
node tools/audit-purchased-fbx.mjs ~/PowerWorldAssets/animations/2026-09-14
```

Expected: 613 files, 612 with valid clips (the boxer `Mesh/Dome.fbx` is static — known
and fine). If starting from archives instead:

```bash
python3 tools/stage-purchased-animations.py ~/PowerWorldAssets/archives ~/PowerWorldAssets/animations/2026-09-14
node tools/audit-purchased-fbx.mjs ~/PowerWorldAssets/animations/2026-09-14
```

## What this unblocks

The Mission A curation of 12–20 directional death/knockdown clips from the 85-file
Knockdown & Get-Up pack (plus reaction candidates from Hostage/Villain packs) onto the
53-bone modular hero rig — pipeline, semantic-ID registry, evidence harness and
curation criteria are already in place on branch `asset-lab-death-set`, waiting only on
these files. No substitutes will be used in their place.
